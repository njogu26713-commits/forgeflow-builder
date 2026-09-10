import type { ObjectId } from "mongodb";
import type { AgentName, RunStatus } from "./agentSchemas";

export type DevelopmentRunDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  request: string;
  status: RunStatus;
  currentAgent: AgentName | null;
  nextAgent: AgentName | null;
  attempt: number;
  maxAttempts: number;
  plan?: unknown;
  validation?: unknown;
  diagnosis?: unknown;
  lastError?: string | null;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
};

export type DevelopmentEventDoc = {
  _id?: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  sequence: number;
  kind: "run_created" | "agent_started" | "agent_message" | "plan_created" | "tool_completed" | "validation_result" | "diagnosis" | "handoff" | "status_changed" | "run_completed" | "run_failed";
  agent?: AgentName | null;
  message?: string;
  payload?: Record<string, unknown>;
  createdAt: Date;
};

export type ToolCallDoc = {
  _id?: ObjectId;
  runId: ObjectId;
  userId: ObjectId;
  projectId: ObjectId;
  agent: AgentName;
  tool: string;
  input: Record<string, unknown>;
  output?: Record<string, unknown>;
  status: "succeeded" | "failed";
  createdAt: Date;
};
