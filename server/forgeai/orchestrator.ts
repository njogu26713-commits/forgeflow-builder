import fs from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { ObjectId } from "mongodb";
import { getForgeAgent } from "./agent";
import { canTransition, diagnosisSchema, implementationSchema, planSchema, runStatusSchema, validationSchema, type AgentName, type AgentPlan, type RunStatus } from "./agentSchemas";
import { getForgeDb } from "./db";
import { decryptSecret } from "./secrets";
import type { ProjectDoc } from "./types";
import type { DevelopmentEventDoc, DevelopmentRunDoc, ToolCallDoc } from "./runTypes";

const workspaceRoot = path.resolve(process.env.FORGEAI_WORKSPACE_ROOT ?? "/tmp/forgeflow-workspaces");
const safeJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

async function projectEnvironment(db: NonNullable<Awaited<ReturnType<typeof getForgeDb>>>, run: DevelopmentRunDoc) {
  const secrets = await db.collection<{ name: string; encryptedValue: string; projectId?: ObjectId | null }>("secrets").find({ userId: run.userId, $or: [{ projectId: run.projectId }, { projectId: null }] }).toArray();
  const environment: Record<string, string> = {};
  for (const secret of secrets) {
    try { environment[secret.name] = decryptSecret(secret.encryptedValue); } catch { /* invalid secrets never reach the process */ }
  }
  return environment;
}

function publicRun(run: DevelopmentRunDoc) {
  return { ...run, id: run._id?.toHexString(), _id: undefined, userId: undefined, projectId: run.projectId.toHexString() };
}

async function workspaceFor(projectId: ObjectId) {
  const root = path.join(workspaceRoot, projectId.toHexString());
  await fs.mkdir(root, { recursive: true });
  return root;
}

export async function getProjectPreviewFile(userId: ObjectId, projectId: string) {
  if (!ObjectId.isValid(projectId)) return null;
  const db = await getForgeDb();
  if (!db) return null;
  const project = await db.collection<ProjectDoc>("projects").findOne({ _id: new ObjectId(projectId), userId }, { projection: { _id: 1 } });
  if (!project) return null;
  const root = await workspaceFor(new ObjectId(projectId));
  for (const filename of ["index.html", "dist/index.html", "build/index.html"]) {
    const candidate = safePath(root, filename);
    try { await fs.access(candidate); return candidate; } catch { /* try next */ }
  }
  return null;
}

function safePath(root: string, requested: string) {
  const resolved = path.resolve(root, requested);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) throw new Error("Workspace path escapes project root");
  return resolved;
}

async function inspectWorkspace(root: string) {
  const entries = await fs.readdir(root, { withFileTypes: true });
  const files = entries.filter(entry => entry.isFile()).map(entry => entry.name).slice(0, 100);
  const packagePath = path.join(root, "package.json");
  let packageJson: Record<string, unknown> | null = null;
  try { packageJson = JSON.parse(await fs.readFile(packagePath, "utf8")) as Record<string, unknown>; } catch { /* optional */ }
  return { root, files, packageJson, inspectedAt: new Date().toISOString() };
}

async function hydrateProjectFiles(root: string, files: unknown[]) {
  for (const entry of files) {
    const file = entry as { path?: unknown; type?: unknown; content?: unknown; children?: unknown[] };
    if (file.type === "file" && typeof file.path === "string" && typeof file.content === "string") {
      const target = safePath(root, file.path);
      await fs.mkdir(path.dirname(target), { recursive: true });
      try { await fs.access(target); } catch { await fs.writeFile(target, file.content, "utf8"); }
    }
    if (Array.isArray(file.children)) await hydrateProjectFiles(root, file.children);
  }
}

async function workspaceFiles(root: string, current = root): Promise<unknown[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const result: unknown[] = [];
  for (const entry of entries) {
    if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    const relative = path.relative(root, absolute).replaceAll(path.sep, "/");
    if (entry.isDirectory()) result.push({ id: relative, path: relative, name: entry.name, type: "folder", children: await workspaceFiles(root, absolute) });
    else {
      const stat = await fs.stat(absolute);
      if (stat.size <= 200_000) result.push({ id: relative, path: relative, name: entry.name, type: "file", content: await fs.readFile(absolute, "utf8"), language: path.extname(entry.name).slice(1) });
    }
  }
  return result;
}

async function syncWorkspaceToProject(db: NonNullable<Awaited<ReturnType<typeof getForgeDb>>>, run: DevelopmentRunDoc, root: string) {
  const files = await workspaceFiles(root);
  await db.collection<ProjectDoc>("projects").updateOne({ _id: run.projectId, userId: run.userId }, { $set: { files, updatedAt: new Date() } });
  return files;
}

const nodeBuiltins = new Set(["assert", "buffer", "child_process", "crypto", "events", "fs", "http", "https", "module", "net", "os", "path", "process", "stream", "string_decoder", "timers", "tls", "url", "util", "zlib"]);
const sourceExtensions = new Set([".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs", ".vue", ".svelte"]);

async function sourceFiles(root: string, current = root): Promise<string[]> {
  const entries = await fs.readdir(current, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
    const absolute = path.join(current, entry.name);
    if (entry.isDirectory()) files.push(...await sourceFiles(root, absolute));
    else if (sourceExtensions.has(path.extname(entry.name))) files.push(absolute);
  }
  return files;
}

async function detectMissingDependencies(root: string) {
  let packageJson: { dependencies?: Record<string, unknown>; devDependencies?: Record<string, unknown> } = {};
  try { packageJson = JSON.parse(await fs.readFile(path.join(root, "package.json"), "utf8")) as typeof packageJson; } catch { return []; }
  const installed = new Set([...Object.keys(packageJson.dependencies ?? {}), ...Object.keys(packageJson.devDependencies ?? {})]);
  const imports = new Set<string>();
  for (const file of await sourceFiles(root)) {
    const text = await fs.readFile(file, "utf8");
    const importPattern = /(?:from\s*["']|import\s*["']|require\(\s*["'])([^"']+)["']/g;
    let match: RegExpExecArray | null;
    while ((match = importPattern.exec(text)) !== null) {
      const name = match[1];
      if (!name || name.startsWith(".") || name.startsWith("/") || name.startsWith("node:") || nodeBuiltins.has(name)) continue;
      imports.add(name.startsWith("@") ? name.split("/").slice(0, 2).join("/") : name.split("/")[0]);
    }
  }
  return Array.from(imports).filter(name => !installed.has(name) && /^(@[a-z0-9._-]+\/)?[a-z0-9._-]+$/i.test(name)).sort();
}

async function installMissingDependencies(root: string, packages: string[], environment: Record<string, string>, onOutput?: (type: "stdout" | "stderr", content: string) => Promise<void>) {
  if (!packages.length) return null;
  let manager = "npm";
  try { await fs.access(path.join(root, "pnpm-lock.yaml")); manager = "pnpm"; } catch { try { await fs.access(path.join(root, "yarn.lock")); manager = "yarn"; } catch { try { await fs.access(path.join(root, "bun.lockb")); manager = "bun"; } catch { /* npm default */ } } }
  return runControlledCommand(root, `${manager} install ${packages.join(" ")}`, environment, onOutput);
}

const allowedExecutables = new Set(["pnpm", "npm", "yarn", "bun", "node", "npx", "python3", "git"]);
function tokenizeCommand(command: string) {
  const parts: string[] = [];
  const pattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'|(\S+)/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(command)) !== null) parts.push(match[1] ?? match[2] ?? match[3]);
  return parts;
}

async function runControlledCommand(root: string, command: string, environment: Record<string, string> = {}, onOutput?: (type: "stdout" | "stderr", content: string) => Promise<void>) {
  const parts = tokenizeCommand(command);
  const executable = parts.shift() ?? "";
  if (!allowedExecutables.has(executable)) throw new Error(`Command is not allowed: ${executable}`);
  if (/[|;&><`$]/.test(command) || parts.some(part => ["rm", "sudo", "chmod", "chown", "curl", "wget"].includes(part))) throw new Error("Command contains a restricted shell operation");
  return new Promise<{ command: string; stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    const child = spawn(executable, parts, { cwd: root, env: { ...process.env, ...environment, NODE_ENV: "development" }, shell: false });
    let stdout = ""; let stderr = ""; let settled = false;
    const append = (target: "stdout" | "stderr", chunk: Buffer) => {
      const text = chunk.toString();
      if (target === "stdout") stdout = `${stdout}${text}`.slice(-20000); else stderr = `${stderr}${text}`.slice(-20000);
      void onOutput?.(target, text.slice(-4000));
    };
    child.stdout.on("data", (chunk: Buffer) => append("stdout", chunk));
    child.stderr.on("data", (chunk: Buffer) => append("stderr", chunk));
    const timeout = setTimeout(() => { child.kill("SIGTERM"); if (!settled) { settled = true; resolve({ command, stdout, stderr: `${stderr}\nCommand timed out after 120 seconds`, exitCode: 124 }); } }, 120_000);
    child.on("error", error => { clearTimeout(timeout); if (!settled) { settled = true; reject(error); } });
    child.on("close", code => { clearTimeout(timeout); if (!settled) { settled = true; resolve({ command, stdout, stderr, exitCode: code ?? 1 }); } });
  });
}

async function applyCode2Action(root: string, action: { type: string; path?: string; content?: string; command?: string }, environment: Record<string, string>, onOutput?: (type: "stdout" | "stderr", content: string) => Promise<void>) {
  if (action.type === "write" && action.path && action.content !== undefined) {
    const target = safePath(root, action.path); await fs.mkdir(path.dirname(target), { recursive: true }); await fs.writeFile(target, action.content, "utf8");
    return { tool: "file.write", output: { path: action.path, bytes: Buffer.byteLength(action.content) } };
  }
  if (action.type === "patch" && action.path && action.content !== undefined) {
    const target = safePath(root, action.path); const current = await fs.readFile(target, "utf8"); await fs.writeFile(target, current.includes(action.content) ? current : `${current}\n${action.content}`, "utf8");
    return { tool: "file.patch", output: { path: action.path, bytes: Buffer.byteLength(action.content) } };
  }
  if (action.type === "delete" && action.path) { await fs.rm(safePath(root, action.path), { recursive: true, force: false }); return { tool: "file.delete", output: { path: action.path } };
  }
  if (action.type === "rename" && action.path && action.command) { await fs.rename(safePath(root, action.path), safePath(root, action.command)); return { tool: "file.rename", output: { from: action.path, to: action.command } };
  }
  if (action.type === "command" && action.command) return { tool: "command.run", output: await runControlledCommand(root, action.command, environment, onOutput) };
  if (action.type === "inspect" && action.path) { const content = await fs.readFile(safePath(root, action.path), "utf8"); return { tool: "file.read", output: { path: action.path, content: content.slice(0, 20000) } };
  }
  throw new Error("Code2 returned an incomplete or unsupported action");
}

async function event(db: NonNullable<Awaited<ReturnType<typeof getForgeDb>>>, run: DevelopmentRunDoc, kind: DevelopmentEventDoc["kind"], message: string, agent: AgentName | null = null, payload?: Record<string, unknown>) {
  const sequence = await db.collection<DevelopmentEventDoc>("developmentEvents").countDocuments({ runId: run._id });
  await db.collection<DevelopmentEventDoc>("developmentEvents").insertOne({ runId: run._id!, userId: run.userId, projectId: run.projectId, sequence, kind, agent, message, payload, createdAt: new Date() });
}

async function transition(db: NonNullable<Awaited<ReturnType<typeof getForgeDb>>>, run: DevelopmentRunDoc, next: RunStatus, agent: AgentName | null, message: string) {
  if (!run._id || !canTransition(run.status, next)) throw new Error(`Invalid run transition: ${run.status} -> ${next}`);
  run.status = next;
  run.currentAgent = agent;
  run.updatedAt = new Date();
  await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: next, currentAgent: agent, updatedAt: run.updatedAt } });
  await event(db, run, "status_changed", message, agent, { from: run.status, to: next });
}

async function recordTool(db: NonNullable<Awaited<ReturnType<typeof getForgeDb>>>, run: DevelopmentRunDoc, agent: AgentName, tool: string, input: Record<string, unknown>, output: Record<string, unknown>) {
  await db.collection<ToolCallDoc>("toolCalls").insertOne({ runId: run._id!, userId: run.userId, projectId: run.projectId, agent, tool, input, output, status: "succeeded", createdAt: new Date() });
  await event(db, run, "tool_completed", `${agent} completed ${tool}`, agent, { tool, output });
}

const narrationRule = "Include a narration field containing one or two natural, well-written paragraphs for the user. Do not use numbered plans, repeated bullets, raw JSON, terminal output, HTML, fragments, or artificial status phrases. Explain what you understood, what you found, what you are doing, and what happens next. Keep technical details in the structured fields, not the narration. Use the optional blocks field for useful native UI such as an artifact preview, form, table, chart, file tree, or terminal; omit blocks when they do not add value.";
const brainPrompt = `You are Brain, the planning agent in ForgeAI. Inspect the supplied project facts and user request. Return one JSON object with exactly these keys: summary:string, narration:string, assumptions:string[], acceptanceCriteria:string[], steps:[{id:string,description:string,files:string[],risk:"low"|"medium"|"high"}], commands:[{purpose:"install"|"build"|"test"|"start"|"inspect",executable:string,args:string[]}], validationPlan:string[], needsUserInput:boolean, blockedReason?:string. ${narrationRule} Do not ask the user follow-up questions when reasonable defaults can be chosen: for a new web app, choose a simple modern stack and create a runnable minimal implementation. Do not claim to have edited files. Prefer small, verifiable changes. Never request or reproduce secrets.`;
const code2Prompt = `You are Code2, the implementation agent in ForgeAI. Return one JSON object with exactly these keys: summary:string, narration:string, actions:[{type:"inspect"|"write"|"patch"|"delete"|"rename"|"command",path?:string,content?:string,command?:string}], filesChanged:string[], handoff:"monitorcheck". ${narrationRule} Propose concrete file actions based on the plan. Use relative paths only. Do not invent successful execution; the backend will execute and record approved actions.`;
const monitorPrompt = `You are MonitorCheck, the validation agent in ForgeAI. Return one JSON object with exactly these keys: status:"passed"|"failed"|"blocked", narration:string, confidence:"high"|"medium"|"low", checks:[{name:string,status:"passed"|"failed"|"skipped",evidence:string[]}], failures:[{category:"build"|"test"|"runtime"|"browser"|"network"|"configuration",message:string,reproduction?:string,likelyFiles?:string[]}], recommendations:string[]. ${narrationRule} Base conclusions only on supplied workspace and command evidence. Mark unavailable checks as skipped or blocked; never invent errors.`;
const bugPrompt = `You are Bug, the diagnosis agent in ForgeAI. Return one JSON object with exactly these keys: summary:string, narration:string, category:"build"|"test"|"runtime"|"browser"|"network"|"configuration"|"unknown", confidence:"high"|"medium"|"low", rootCause:string, files:string[], repairSteps:string[], repairable:boolean. ${narrationRule} Use only the supplied validation failure and workspace evidence. Give a minimal repair plan and be explicit when the issue is not safely repairable.`;

export async function createDevelopmentRun(userId: ObjectId, project: ProjectDoc, request: string, maxAttempts: number) {
  const db = await getForgeDb();
  if (!db || !project._id) throw new Error("ForgeAI persistence is not configured");
  const now = new Date();
  const run: DevelopmentRunDoc = { userId, projectId: project._id, request, status: "queued", currentAgent: null, nextAgent: "brain", attempt: 0, maxAttempts, createdAt: now, updatedAt: now };
  const result = await db.collection<DevelopmentRunDoc>("developmentRuns").insertOne(run);
  run._id = result.insertedId;
  await event(db, run, "run_created", "Development run queued", null, { request });
  void executeDevelopmentRun(run).catch(async error => {
    const currentDb = await getForgeDb();
    if (currentDb && run._id) {
      run.status = "failed"; run.lastError = error instanceof Error ? error.message : "Development run failed"; run.updatedAt = new Date();
      await currentDb.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: run.status, lastError: run.lastError, updatedAt: run.updatedAt } });
      await event(currentDb, run, "run_failed", run.lastError, null);
    }
  });
  return publicRun(run);
}

export async function getDevelopmentRun(userId: ObjectId, runId: string) {
  const db = await getForgeDb();
  if (!db) return null;
  const id = ObjectId.isValid(runId) ? new ObjectId(runId) : null;
  if (!id) return null;
  const run = await db.collection<DevelopmentRunDoc>("developmentRuns").findOne({ _id: id, userId });
  return run ? publicRun(run) : null;
}

export async function getDevelopmentEvents(userId: ObjectId, runId: string, after = -1) {
  const db = await getForgeDb();
  if (!db || !ObjectId.isValid(runId)) return [];
  const id = new ObjectId(runId);
  const owned = await db.collection<DevelopmentRunDoc>("developmentRuns").findOne({ _id: id, userId }, { projection: { _id: 1 } });
  if (!owned) return [];
  return db.collection<DevelopmentEventDoc>("developmentEvents").find({ runId: id, userId, sequence: { $gt: after } }).sort({ sequence: 1 }).limit(200).toArray();
}

export async function cancelDevelopmentRun(userId: ObjectId, runId: string) {
  const db = await getForgeDb();
  if (!db || !ObjectId.isValid(runId)) return false;
  const id = new ObjectId(runId);
  const run = await db.collection<DevelopmentRunDoc>("developmentRuns").findOne({ _id: id, userId });
  if (!run || ["completed", "failed", "blocked", "cancelled"].includes(run.status)) return false;
  if (!canTransition(run.status, "cancelled")) return false;
  run.status = "cancelled"; run.updatedAt = new Date();
  await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: id }, { $set: { status: "cancelled", updatedAt: run.updatedAt } });
  await event(db, run, "status_changed", "Development run cancelled by user", run.currentAgent);
  return true;
}

async function executeDevelopmentRun(run: DevelopmentRunDoc) {
  const db = await getForgeDb();
  if (!db || !run._id) throw new Error("ForgeAI persistence is not configured");
  const project = await db.collection<ProjectDoc>("projects").findOne({ _id: run.projectId, userId: run.userId });
  if (!project) throw new Error("Project not found");
  const root = await workspaceFor(run.projectId);
  await hydrateProjectFiles(root, project.files);
  const environment = await projectEnvironment(db, run);
  await transition(db, run, "inspecting", "brain", "Brain inspected the project workspace");
  const inspected = await inspectWorkspace(root);
  await recordTool(db, run, "brain", "workspace.inspect", {}, inspected);
  const brain = await getForgeAgent().completeStructured([{ role: "system", content: brainPrompt }, { role: "user", content: JSON.stringify({ request: run.request, project: { name: project.name, description: project.description, files: project.files }, workspace: inspected, outputSchema: "summary, assumptions, acceptanceCriteria, steps, commands, validationPlan, needsUserInput, blockedReason" }) }], value => planSchema.parse(value));
  run.plan = brain;
  await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { plan: brain, updatedAt: new Date() } });
  await event(db, run, "plan_created", brain.narration || brain.summary, "brain", { acceptanceCriteria: brain.acceptanceCriteria, steps: brain.steps, blocks: brain.blocks });
  await transition(db, run, "planned", "brain", "Brain created an implementation plan");
  if (brain.needsUserInput) { run.status = "blocked"; await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: "blocked", lastError: brain.blockedReason ?? "Additional user input is required", updatedAt: new Date() } }); return; }

  const commandResults: unknown[] = [];
  while (run.attempt < run.maxAttempts) {
    run.attempt += 1;
    await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { attempt: run.attempt, updatedAt: new Date() } });
    await transition(db, run, run.attempt === 1 ? "implementing" : "repairing", run.attempt === 1 ? "code2" : "bug", `${run.attempt === 1 ? "Code2 is implementing" : "Code2 is applying a repair"} attempt ${run.attempt}`);
    const implementation = await getForgeAgent().completeStructured([{ role: "system", content: code2Prompt }, { role: "user", content: JSON.stringify({ request: run.request, plan: brain, previousDiagnosis: run.diagnosis ?? null, commandResults, workspace: await inspectWorkspace(root), outputSchema: "summary, actions, filesChanged, handoff" }) }], value => implementationSchema.parse(value));
    for (const action of implementation.actions) {
      if (action.type === "command" && action.command) await event(db, run, "tool_started", `Code2 is running ${action.command}`, "code2", { command: action.command });
      const result = await applyCode2Action(root, action, environment, async (type, content) => {
        await event(db, run, "tool_output", content, "code2", { type, command: action.command });
      });
      if (result.tool === "command.run") commandResults.push(result.output);
      await recordTool(db, run, "code2", result.tool, { type: action.type, path: action.path, command: action.command }, result.output);
    }
    const missingDependencies = await detectMissingDependencies(root);
    if (missingDependencies.length) {
      const installCommand = `npm install ${missingDependencies.join(" ")}`;
      await event(db, run, "tool_started", `Code2 detected missing dependencies: ${missingDependencies.join(", ")}`, "code2", { command: installCommand, packages: missingDependencies });
      const installResult = await installMissingDependencies(root, missingDependencies, environment, async (type, content) => {
        await event(db, run, "tool_output", content, "code2", { type, command: installCommand, automatic: true });
      });
      if (installResult) {
        commandResults.push(installResult);
        await recordTool(db, run, "code2", "dependencies.install", { packages: missingDependencies }, installResult);
      }
    }
    const persistedFiles = await syncWorkspaceToProject(db, run, root);
    await event(db, run, "agent_message", implementation.narration || implementation.summary, "code2", { filesChanged: implementation.filesChanged, blocks: implementation.blocks, persistedFiles });
    await transition(db, run, "validating", "monitorcheck", "Code2 handed the workspace to MonitorCheck");
    const after = await inspectWorkspace(root);
    const validation = await getForgeAgent().completeStructured([{ role: "system", content: monitorPrompt }, { role: "user", content: JSON.stringify({ request: run.request, plan: brain, implementation, commandResults, workspace: after, evidence: { workspaceInspection: after, commandResults }, outputSchema: "status, confidence, checks, failures, recommendations" }) }], value => validationSchema.parse(value));
    run.validation = validation;
    await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { validation, updatedAt: new Date() } });
    await event(db, run, "validation_result", validation.narration || `MonitorCheck ${validation.status}`, "monitorcheck", safeJson(validation));
    if (validation.status === "passed") {
      run.status = "completed"; run.currentAgent = "monitorcheck"; run.completedAt = new Date(); run.updatedAt = run.completedAt;
      await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: run.status, currentAgent: run.currentAgent, completedAt: run.completedAt, updatedAt: run.updatedAt } });
      await event(db, run, "run_completed", "Development run completed successfully", "monitorcheck");
      return;
    }
    if (run.attempt >= run.maxAttempts) break;
    await transition(db, run, "diagnosing", "bug", "MonitorCheck found an actionable failure");
    const diagnosis = await getForgeAgent().completeStructured([{ role: "system", content: bugPrompt }, { role: "user", content: JSON.stringify({ request: run.request, validation, workspace: after, outputSchema: "summary, category, confidence, rootCause, files, repairSteps, repairable" }) }], value => diagnosisSchema.parse(value));
    run.diagnosis = diagnosis;
    await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { diagnosis, updatedAt: new Date() } });
    await event(db, run, "diagnosis", diagnosis.narration || diagnosis.summary, "bug", safeJson(diagnosis));
    if (!diagnosis.repairable) break;
  }
  run.status = "failed"; run.lastError = "The development run reached its repair limit"; run.updatedAt = new Date();
  await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: run.status, lastError: run.lastError, updatedAt: run.updatedAt } });
  await event(db, run, "run_failed", run.lastError, "bug");
}
