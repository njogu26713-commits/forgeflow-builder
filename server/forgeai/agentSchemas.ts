import { z } from "zod";

export const agentNameSchema = z.enum(["brain", "code2", "monitorcheck", "bug"]);
export type AgentName = z.infer<typeof agentNameSchema>;

export const planSchema = z.object({
  summary: z.string().min(1).max(4000),
  narration: z.string().max(5000).default(""),
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
  confidence: z.enum(["high", "medium", "low"]),
  checks: z.array(z.object({ name: z.string().max(200), status: z.enum(["passed", "failed", "skipped"]), evidence: z.array(z.string().max(1000)).max(10) })).max(50),
  failures: z.array(z.object({ category: z.enum(["build", "test", "runtime", "browser", "network", "configuration"]), message: z.string().max(2000), reproduction: z.string().max(2000).optional(), likelyFiles: z.array(z.string().max(500)).max(20).optional() })).max(20),
  recommendations: z.array(z.string().max(1000)).max(20),
});
export type ValidationResult = z.infer<typeof validationSchema>;

export const diagnosisSchema = z.object({
  summary: z.string().min(1).max(3000),
  narration: z.string().max(5000).default(""),
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
