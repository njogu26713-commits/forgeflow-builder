import fs from "node:fs/promises";
import path from "node:path";
import { ObjectId } from "mongodb";
import { getForgeAgent } from "./agent";
import { canTransition, diagnosisSchema, implementationSchema, planSchema, runStatusSchema, validationSchema, type AgentName, type AgentPlan, type RunStatus } from "./agentSchemas";
import { getForgeDb } from "./db";
import type { ProjectDoc } from "./types";
import type { DevelopmentEventDoc, DevelopmentRunDoc, ToolCallDoc } from "./runTypes";

const workspaceRoot = path.resolve(process.env.FORGEAI_WORKSPACE_ROOT ?? "/tmp/forgeflow-workspaces");
const safeJson = (value: unknown) => JSON.parse(JSON.stringify(value)) as Record<string, unknown>;

function publicRun(run: DevelopmentRunDoc) {
  return { ...run, id: run._id?.toHexString(), _id: undefined, userId: undefined, projectId: run.projectId.toHexString() };
}

async function workspaceFor(projectId: ObjectId) {
  const root = path.join(workspaceRoot, projectId.toHexString());
  await fs.mkdir(root, { recursive: true });
  return root;
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

const narrationRule = "Include a narration field containing one or two natural, well-written paragraphs for the user. Do not use numbered plans, repeated bullets, tables, raw JSON, terminal output, HTML, fragments, or artificial status phrases. Explain what you understood, what you found, what you are doing, and what happens next. Keep technical details in the structured fields, not the narration.";
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
  await transition(db, run, "inspecting", "brain", "Brain inspected the project workspace");
  const inspected = await inspectWorkspace(root);
  await recordTool(db, run, "brain", "workspace.inspect", {}, inspected);
  const brain = await getForgeAgent().completeStructured([{ role: "system", content: brainPrompt }, { role: "user", content: JSON.stringify({ request: run.request, project: { name: project.name, description: project.description, files: project.files }, workspace: inspected, outputSchema: "summary, assumptions, acceptanceCriteria, steps, commands, validationPlan, needsUserInput, blockedReason" }) }], value => planSchema.parse(value));
  run.plan = brain;
  await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { plan: brain, updatedAt: new Date() } });
  await event(db, run, "plan_created", brain.narration || brain.summary, "brain", { acceptanceCriteria: brain.acceptanceCriteria, steps: brain.steps });
  await transition(db, run, "planned", "brain", "Brain created an implementation plan");
  if (brain.needsUserInput) { run.status = "blocked"; await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { status: "blocked", lastError: brain.blockedReason ?? "Additional user input is required", updatedAt: new Date() } }); return; }

  while (run.attempt < run.maxAttempts) {
    run.attempt += 1;
    await db.collection<DevelopmentRunDoc>("developmentRuns").updateOne({ _id: run._id }, { $set: { attempt: run.attempt, updatedAt: new Date() } });
    await transition(db, run, run.attempt === 1 ? "implementing" : "repairing", run.attempt === 1 ? "code2" : "bug", `${run.attempt === 1 ? "Code2 is implementing" : "Code2 is applying a repair"} attempt ${run.attempt}`);
    const implementation = await getForgeAgent().completeStructured([{ role: "system", content: code2Prompt }, { role: "user", content: JSON.stringify({ request: run.request, plan: brain, previousDiagnosis: run.diagnosis ?? null, workspace: await inspectWorkspace(root), outputSchema: "summary, actions, filesChanged, handoff" }) }], value => implementationSchema.parse(value));
    for (const action of implementation.actions) {
      if (action.type === "write" && action.path && action.content !== undefined) {
        const target = safePath(root, action.path);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.writeFile(target, action.content, "utf8");
        await recordTool(db, run, "code2", "file.write", { path: action.path }, { path: action.path, bytes: Buffer.byteLength(action.content) });
      }
    }
    await event(db, run, "agent_message", implementation.narration || implementation.summary, "code2", { filesChanged: implementation.filesChanged });
    await transition(db, run, "validating", "monitorcheck", "Code2 handed the workspace to MonitorCheck");
    const after = await inspectWorkspace(root);
    const validation = await getForgeAgent().completeStructured([{ role: "system", content: monitorPrompt }, { role: "user", content: JSON.stringify({ request: run.request, plan: brain, implementation, workspace: after, evidence: { workspaceInspection: after }, outputSchema: "status, confidence, checks, failures, recommendations" }) }], value => validationSchema.parse(value));
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
