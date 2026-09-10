import { z } from "zod";

export const agentNameSchema = z.enum(["brain", "code2", "monitorcheck", "bug"]);
export type AgentName = z.infer<typeof agentNameSchema>;

const nativeBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("artifact"), title: z.string().max(200), description: z.string().max(500).optional(), url: z.string().url().optional(), content: z.string().max(20000).optional(), action: z.object({ label: z.string().max(80), action: z.string().max(100) }).optional() }),
  z.object({ type: z.literal("form"), title: z.string().max(200), fields: z.array(z.object({ name: z.string().max(80), label: z.string().max(120), type: z.enum(["text", "email", "number", "textarea"]).optional(), placeholder: z.string().max(200).optional(), required: z.boolean().optional() })).max(20), submitLabel: z.string().max(80).optional(), action: z.string().max(100).optional() }),
  z.object({ type: z.literal("table"), title: z.string().max(200).optional(), columns: z.array(z.string().max(100)).max(20), rows: z.array(z.array(z.union([z.string().max(500), z.number()]))).max(100) }),
  z.object({ type: z.literal("chart"), title: z.string().max(200).optional(), kind: z.enum(["line", "bar"]).optional(), xKey: z.string().max(80), data: z.array(z.record(z.string(), z.union([z.string().max(200), z.number()]))).max(100), series: z.array(z.string().max(80)).max(10) }),
  z.object({ type: z.literal("file-tree"), title: z.string().max(200).optional(), files: z.array(z.object({ path: z.string().max(500), type: z.enum(["file", "folder"]) })).max(200) }),
  z.object({ type: z.literal("terminal"), title: z.string().max(200).optional(), command: z.string().max(1000).optional(), output: z.string().max(20000).optional(), status: z.enum(["running", "success", "error"]).optional() }),
]);
export const nativeBlocksSchema = z.array(nativeBlockSchema).max(8);

export const planSchema = z.object({
  summary: z.string().min(1).max(4000),
  narration: z.string().max(5000).default(""),
  blocks: nativeBlocksSchema.optional(),
  assumptions: z.array(z.string().max(500)).max(20),
  acceptanceCriteria: z.array(z.string().max(500)).min(1).max(30),
  steps: z.array(z.object({
    id: z.string().min(1).max(80),
    description: z.string().min(1).max(1000),
    files: z.array(z.string().max(500)).max(50),
    risk: z.enum(["low", "medium", "high"]),
  })).min(1).max(30),
  commands: z.array(z.object({
    purpose: z.enum(["install", "build", "test", "start", "inspect"]),
    executable: z.string().min(1).max(100),
    args: z.array(z.string().max(500)).max(30),
  })).max(30),
  validationPlan: z.array(z.string().max(500)).max(30),
  needsUserInput: z.boolean(),
  blockedReason: z.string().max(1000).optional(),
});
export type AgentPlan = z.infer<typeof planSchema>;

export const implementationSchema = z.object({
  summary: z.string().min(1).max(4000),
  narration: z.string().max(5000).default(""),
  blocks: nativeBlocksSchema.optional(),
  actions: z.array(z.object({
    type: z.enum(["inspect", "write", "patch", "delete", "rename", "command"]),
    path: z.string().max(500).optional(),
    content: z.string().max(100000).optional(),
    command: z.string().max(1000).optional(),
  })).max(50),
  filesChanged: z.array(z.string().max(500)).max(50),
  handoff: z.literal("monitorcheck"),
});
export type ImplementationResult = z.infer<typeof implementationSchema>;

export const validationSchema = z.object({
  status: z.enum(["passed", "failed", "blocked"]),
  narration: z.string().max(5000).default(""),
  blocks: nativeBlocksSchema.optional(),
  confidence: z.enum(["high", "medium", "low"]),
  checks: z.array(z.object({ name: z.string().max(200), status: z.enum(["passed", "failed", "skipped"]), evidence: z.array(z.string().max(1000)).max(10) })).max(50),
  failures: z.array(z.object({ category: z.enum(["build", "test", "runtime", "browser", "network", "configuration"]), message: z.string().max(2000), reproduction: z.string().max(2000).optional(), likelyFiles: z.array(z.string().max(500)).max(20).optional() })).max(20),
  recommendations: z.array(z.string().max(1000)).max(20),
});
export type ValidationResult = z.infer<typeof validationSchema>;

export const diagnosisSchema = z.object({
  summary: z.string().min(1).max(3000),
  narration: z.string().max(5000).default(""),
  blocks: nativeBlocksSchema.optional(),
  category: z.enum(["build", "test", "runtime", "browser", "network", "configuration", "unknown"]),
  confidence: z.enum(["high", "medium", "low"]),
  rootCause: z.string().min(1).max(3000),
  files: z.array(z.string().max(500)).max(30),
  repairSteps: z.array(z.string().max(1000)).max(20),
  repairable: z.boolean(),
});
export type BugDiagnosis = z.infer<typeof diagnosisSchema>;

export const runStatusSchema = z.enum(["queued", "inspecting", "planned", "implementing", "validating", "diagnosing", "repairing", "completed", "failed", "blocked", "cancelled"]);
export type RunStatus = z.infer<typeof runStatusSchema>;

export const agentRunSchema = z.object({
  message: z.string().trim().min(1).max(12000),
  maxAttempts: z.number().int().min(1).max(5).default(3),
});

export const intentSchema = z.object({
  intent: z.enum(["conversation", "development"]),
  reason: z.string().max(500),
});
export type RequestIntent = z.infer<typeof intentSchema>;

export const transitions: Record<RunStatus, RunStatus[]> = {
  queued: ["inspecting", "cancelled"],
  inspecting: ["planned", "blocked", "failed", "cancelled"],
  planned: ["implementing", "blocked", "cancelled"],
  implementing: ["validating", "failed", "cancelled"],
  validating: ["completed", "diagnosing", "blocked", "failed", "cancelled"],
  diagnosing: ["repairing", "blocked", "failed", "cancelled"],
  repairing: ["validating", "failed", "cancelled"],
  completed: [], failed: [], blocked: [], cancelled: [],
};

export function canTransition(from: RunStatus, to: RunStatus) {
  return transitions[from].includes(to);
}
