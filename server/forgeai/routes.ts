import bcrypt from "bcryptjs";
import type { Express, Request, Response } from "express";
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { classifyForgeIntent, getForgeAgent, forgeAgentSystemPrompt } from "./agent";
import { clearForgeSession, publicUser, requireForgeAuth, setForgeSession, signForgeSession, type ForgeRequest, optionalForgeAuth } from "./auth";
import { forgeConfig, hasForgeAuth, hasForgeDatabase } from "./config";
import { getForgeDb, toObjectId } from "./db";
import { encryptSecret, maskSecret } from "./secrets";
import type { ChatDoc, ProjectDoc, SecretDoc, UserDoc } from "./types";
import { agentRunSchema } from "./agentSchemas";
import { cancelDevelopmentRun, createDevelopmentRun, getDevelopmentEvents, getDevelopmentRun, getProjectPreviewFile } from "./orchestrator";

const registerSchema = z.object({ name: z.string().trim().min(1).max(80), email: z.string().trim().email().max(320), password: z.string().min(8).max(200) });
const projectSchema = z.object({ name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).default(""), files: z.array(z.unknown()).max(500).default([]), repository: z.record(z.string(), z.unknown()).nullable().optional(), deployment: z.record(z.string(), z.unknown()).nullable().optional() });
const chatSchema = z.object({ title: z.string().trim().min(1).max(160).default("New conversation"), projectId: z.string().optional().nullable() });
const agentSchema = z.object({ chatId: z.string().optional(), projectId: z.string().optional().nullable(), message: z.string().trim().min(1).max(12000), provider: z.string().default("groq") });
const secretSchema = z.object({ name: z.string().trim().regex(/^[A-Z][A-Z0-9_]{1,63}$/), value: z.string().min(1).max(20000), projectId: z.string().min(1) });

function badRequest(res: Response, message: string) {
  return res.status(400).json({ error: message });
}

function databaseUnavailable(res: Response) {
  return res.status(503).json({ error: "ForgeAI persistence is not configured" });
}

function idOrBad(value: string | undefined, res: Response) {
  const id = value ? toObjectId(value) : null;
  if (!id) {
    res.status(400).json({ error: "Invalid resource id" });
    return null;
  }
  return id;
}

function projectResponse(project: ProjectDoc) {
  return { ...project, id: project._id?.toHexString(), _id: undefined, userId: undefined };
}

function chatResponse(chat: ChatDoc) {
  return { ...chat, id: chat._id?.toHexString(), _id: undefined, userId: undefined, projectId: chat.projectId?.toHexString() ?? null };
}

function secretResponse(secret: SecretDoc) {
  return { id: secret._id?.toHexString(), name: secret.name, projectId: secret.projectId?.toHexString() ?? null, value: "••••••••", createdAt: secret.createdAt, updatedAt: secret.updatedAt };
}

export function registerForgeAiRoutes(app: Express) {
  const api = Router();
  api.use(optionalForgeAuth);

  api.get("/health", (_req, res) => res.json({ ok: true, databaseConfigured: hasForgeDatabase(), authConfigured: hasForgeAuth(), agentProvider: forgeConfig.groqApiKey ? "groq" : null }));

  api.post("/auth/register", async (req, res) => {
    if (!hasForgeDatabase() || !forgeConfig.jwtSecret) return databaseUnavailable(res);
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(res, "Name, email, and a password of at least 8 characters are required");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const email = parsed.data.email.toLowerCase();
    const existing = await db.collection<UserDoc>("users").findOne({ email });
    if (existing) return res.status(409).json({ error: "An account with this email already exists" });
    const now = new Date();
    const user: UserDoc = { name: parsed.data.name, email, passwordHash: await bcrypt.hash(parsed.data.password, 12), createdAt: now, updatedAt: now };
    const result = await db.collection<UserDoc>("users").insertOne(user);
    user._id = result.insertedId;
    setForgeSession(res, signForgeSession(user));
    return res.status(201).json({ user: publicUser(user) });
  });

  api.post("/auth/login", async (req, res) => {
    if (!hasForgeDatabase() || !forgeConfig.jwtSecret) return databaseUnavailable(res);
    const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return badRequest(res, "Email and password are required");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const user = await db.collection<UserDoc>("users").findOne({ email: parsed.data.email.toLowerCase() });
    if (!user || !(await bcrypt.compare(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: "Invalid email or password" });
    await db.collection<UserDoc>("users").updateOne({ _id: user._id }, { $set: { updatedAt: new Date() } });
    setForgeSession(res, signForgeSession(user));
    return res.json({ user: publicUser(user) });
  });

  api.post("/auth/logout", (req, res) => { clearForgeSession(res); return res.json({ success: true }); });
  api.get("/auth/me", (req: ForgeRequest, res) => res.json({ user: req.forgeUser ? publicUser(req.forgeUser) : null, configured: hasForgeAuth() }));

  const privateApi = Router();
  privateApi.use(requireForgeAuth);
  privateApi.use(async (_req, res, next) => { if (!(await getForgeDb())) return databaseUnavailable(res); next(); });
  const agentRateLimit = rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: "draft-8", legacyHeaders: false, message: { error: "Too many agent requests. Please wait a moment." } });

  privateApi.get("/projects", async (req: ForgeRequest, res) => {
    const db = await getForgeDb();
    if (!db || !req.forgeUser?._id) return databaseUnavailable(res);
    const projects = await db.collection<ProjectDoc>("projects").find({ userId: req.forgeUser._id }).sort({ updatedAt: -1 }).toArray();
    return res.json({ projects: projects.map(projectResponse) });
  });

  privateApi.post("/projects", async (req: ForgeRequest, res) => {
    const parsed = projectSchema.safeParse(req.body);
    if (!parsed.success || !req.forgeUser?._id) return badRequest(res, "A valid project name is required");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const now = new Date();
    const project: ProjectDoc = { ...parsed.data, userId: req.forgeUser._id, description: parsed.data.description ?? "", files: parsed.data.files ?? [], repository: parsed.data.repository ?? null, deployment: parsed.data.deployment ?? null, createdAt: now, updatedAt: now };
    const result = await db.collection<ProjectDoc>("projects").insertOne(project);
    project._id = result.insertedId;
    return res.status(201).json({ project: projectResponse(project) });
  });

  privateApi.get("/projects/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    if (!id || !req.forgeUser?._id) return;
    const db = await getForgeDb();
    const project = db ? await db.collection<ProjectDoc>("projects").findOne({ _id: id, userId: req.forgeUser._id }) : null;
    if (!project) return res.status(404).json({ error: "Project not found" });
    return res.json({ project: projectResponse(project) });
  });

  privateApi.get("/projects/:id/preview", async (req: ForgeRequest, res) => {
    if (!req.forgeUser?._id) return res.status(401).json({ error: "Authentication required" });
    const previewFile = await getProjectPreviewFile(req.forgeUser._id, req.params.id);
    return previewFile ? res.sendFile(previewFile) : res.status(404).send("No preview has been built for this project yet.");
  });

  privateApi.patch("/projects/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    const parsed = projectSchema.partial().safeParse(req.body);
    if (!id || !parsed.success || !req.forgeUser?._id) return badRequest(res, "Invalid project update");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const result = await db.collection<ProjectDoc>("projects").findOneAndUpdate({ _id: id, userId: req.forgeUser._id }, { $set: { ...parsed.data, updatedAt: new Date() } }, { returnDocument: "after" });
    if (!result) return res.status(404).json({ error: "Project not found" });
    return res.json({ project: projectResponse(result) });
  });

  privateApi.delete("/projects/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    if (!id || !req.forgeUser?._id) return;
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const result = await db.collection<ProjectDoc>("projects").deleteOne({ _id: id, userId: req.forgeUser._id });
    return result.deletedCount ? res.status(204).send() : res.status(404).json({ error: "Project not found" });
  });

  privateApi.post("/projects/:projectId/runs", agentRateLimit, async (req: ForgeRequest, res) => {
    const projectId = idOrBad(req.params.projectId, res);
    const parsed = agentRunSchema.safeParse(req.body);
    if (!projectId || !parsed.success || !req.forgeUser?._id) return badRequest(res, "A valid development request is required");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId, userId: req.forgeUser._id });
    if (!project) return res.status(404).json({ error: "Project not found" });
    try {
      const run = await createDevelopmentRun(req.forgeUser._id, project, parsed.data.message, parsed.data.maxAttempts);
      return res.status(202).json({ run });
    } catch (error) {
      console.error("[ForgeAI] Development run creation failed");
      return res.status(503).json({ error: error instanceof Error ? error.message : "Unable to create development run" });
    }
  });

  privateApi.get("/runs/:runId", async (req: ForgeRequest, res) => {
    if (!req.forgeUser?._id) return res.status(401).json({ error: "Authentication required" });
    const run = await getDevelopmentRun(req.forgeUser._id, req.params.runId);
    return run ? res.json({ run }) : res.status(404).json({ error: "Development run not found" });
  });

  privateApi.get("/runs/:runId/events", async (req: ForgeRequest, res) => {
    if (!req.forgeUser?._id) return res.status(401).json({ error: "Authentication required" });
    const after = Number.isFinite(Number(req.query.after)) ? Number(req.query.after) : -1;
    return res.json({ events: await getDevelopmentEvents(req.forgeUser._id, req.params.runId, after) });
  });

  privateApi.post("/runs/:runId/cancel", async (req: ForgeRequest, res) => {
    if (!req.forgeUser?._id) return res.status(401).json({ error: "Authentication required" });
    const cancelled = await cancelDevelopmentRun(req.forgeUser._id, req.params.runId);
    return cancelled ? res.json({ success: true }) : res.status(409).json({ error: "Run cannot be cancelled" });
  });

  privateApi.get("/chats", async (req: ForgeRequest, res) => {
    const db = await getForgeDb();
    if (!db || !req.forgeUser?._id) return databaseUnavailable(res);
    const chats = await db.collection<ChatDoc>("chats").find({ userId: req.forgeUser._id }).sort({ updatedAt: -1 }).toArray();
    return res.json({ chats: chats.map(chatResponse) });
  });

  privateApi.post("/chats", async (req: ForgeRequest, res) => {
    const parsed = chatSchema.safeParse(req.body);
    if (!parsed.success || !req.forgeUser?._id) return badRequest(res, "Invalid chat");
    const projectId = parsed.data.projectId ? toObjectId(parsed.data.projectId) : null;
    if (parsed.data.projectId && !projectId) return badRequest(res, "Invalid project id");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const now = new Date();
    const chat: ChatDoc = { userId: req.forgeUser._id, projectId, title: parsed.data.title, messages: [], createdAt: now, updatedAt: now };
    const result = await db.collection<ChatDoc>("chats").insertOne(chat);
    chat._id = result.insertedId;
    return res.status(201).json({ chat: chatResponse(chat) });
  });

  privateApi.get("/chats/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    if (!id || !req.forgeUser?._id) return;
    const db = await getForgeDb();
    const chat = db ? await db.collection<ChatDoc>("chats").findOne({ _id: id, userId: req.forgeUser._id }) : null;
    if (!chat) return res.status(404).json({ error: "Chat not found" });
    return res.json({ chat: chatResponse(chat) });
  });

  privateApi.get("/secrets", async (req: ForgeRequest, res) => {
    const db = await getForgeDb();
    if (!db || !req.forgeUser?._id) return databaseUnavailable(res);
    const projectId = typeof req.query.projectId === "string" ? toObjectId(req.query.projectId) : null;
    if (!projectId) return badRequest(res, "A valid project id is required");
    const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId, userId: req.forgeUser._id }, { projection: { _id: 1 } });
    if (!project) return res.status(404).json({ error: "Project not found" });
    const secrets = await db.collection<SecretDoc>("secrets").find({ userId: req.forgeUser._id, projectId }).sort({ name: 1 }).toArray();
    return res.json({ secrets: secrets.map(secretResponse) });
  });

  privateApi.post("/secrets", async (req: ForgeRequest, res) => {
    const parsed = secretSchema.safeParse(req.body);
    if (!parsed.success || !req.forgeUser?._id) return badRequest(res, "Secret names must use uppercase letters, numbers, and underscores");
    const projectId = toObjectId(parsed.data.projectId);
    if (!projectId) return badRequest(res, "A valid project id is required");
    try {
      const db = await getForgeDb();
      if (!db) return databaseUnavailable(res);
      const project = await db.collection<ProjectDoc>("projects").findOne({ _id: projectId, userId: req.forgeUser._id }, { projection: { _id: 1 } });
      if (!project) return res.status(404).json({ error: "Project not found" });
      const now = new Date();
      const secret: SecretDoc = { userId: req.forgeUser._id, projectId, name: parsed.data.name, encryptedValue: encryptSecret(parsed.data.value), createdAt: now, updatedAt: now };
      const result = await db.collection<SecretDoc>("secrets").insertOne(secret);
      secret._id = result.insertedId;
      return res.status(201).json({ secret: secretResponse(secret) });
    } catch (error) {
      console.error("[ForgeAI] Secret storage failed");
      return res.status(503).json({ error: "Secret encryption is not configured" });
    }
  });

  privateApi.patch("/secrets/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    const parsed = z.object({ value: z.string().min(1).max(20000) }).safeParse(req.body);
    if (!id || !parsed.success || !req.forgeUser?._id) return badRequest(res, "Invalid secret update");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const result = await db.collection<SecretDoc>("secrets").findOneAndUpdate({ _id: id, userId: req.forgeUser._id }, { $set: { encryptedValue: encryptSecret(parsed.data.value), updatedAt: new Date() } }, { returnDocument: "after" });
    if (!result) return res.status(404).json({ error: "Secret not found" });
    return res.json({ secret: secretResponse(result) });
  });

  privateApi.delete("/secrets/:id", async (req: ForgeRequest, res) => {
    const id = idOrBad(req.params.id, res);
    if (!id || !req.forgeUser?._id) return;
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const result = await db.collection<SecretDoc>("secrets").deleteOne({ _id: id, userId: req.forgeUser._id });
    return result.deletedCount ? res.status(204).send() : res.status(404).json({ error: "Secret not found" });
  });

  privateApi.post("/agent/chat", agentRateLimit, async (req: ForgeRequest, res) => {
    const parsed = agentSchema.safeParse(req.body);
    if (!parsed.success || !req.forgeUser?._id) return badRequest(res, "A message is required");
    const db = await getForgeDb();
    if (!db) return databaseUnavailable(res);
    const chatId = parsed.data.chatId ? toObjectId(parsed.data.chatId) : null;
    let chat: ChatDoc | null = chatId ? await db.collection<ChatDoc>("chats").findOne({ _id: chatId, userId: req.forgeUser._id }) : null;
    const now = new Date();
    if (!chat) {
      chat = { userId: req.forgeUser._id, projectId: parsed.data.projectId ? toObjectId(parsed.data.projectId) : null, title: parsed.data.message.slice(0, 80), messages: [], createdAt: now, updatedAt: now };
      const result = await db.collection<ChatDoc>("chats").insertOne(chat);
      chat._id = result.insertedId;
    }
    if (!chat._id) return res.status(500).json({ error: "Unable to create chat" });
    chat.messages.push({ role: "user", content: parsed.data.message, createdAt: now });
    try {
      const response = await getForgeAgent(parsed.data.provider).complete([{ role: "system", content: forgeAgentSystemPrompt }, ...chat.messages.map(message => ({ role: message.role, content: message.content }))]);
      chat.messages.push({ role: "assistant", content: response, createdAt: new Date() });
      chat.updatedAt = new Date();
      const { _id, ...replacement } = chat;
      await db.collection<ChatDoc>("chats").replaceOne({ _id, userId: req.forgeUser._id }, replacement);
      return res.json({ chat: chatResponse(chat), response });
    } catch (error) {
      console.error("[ForgeAI] Agent request failed");
      return res.status(502).json({ error: "The ForgeAI agent is temporarily unavailable" });
    }
  });

  privateApi.post("/agent/intent", agentRateLimit, async (req: ForgeRequest, res) => {
    const parsed = z.object({ message: z.string().trim().min(1).max(12000) }).safeParse(req.body);
    if (!parsed.success) return badRequest(res, "A message is required");
    return res.json({ intent: await classifyForgeIntent(parsed.data.message) });
  });

  api.use(privateApi);
  app.use("/api", api);
}
