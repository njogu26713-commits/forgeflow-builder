import { describe, expect, it } from "vitest";
import { canTransition, diagnosisSchema, implementationSchema, planSchema } from "./agentSchemas";

describe("ForgeAI specialized agent contracts", () => {
  it("allows only valid orchestrator transitions", () => {
    expect(canTransition("queued", "inspecting")).toBe(true);
    expect(canTransition("validating", "diagnosing")).toBe(true);
    expect(canTransition("completed", "implementing")).toBe(false);
  });

  it("validates a Brain plan", () => {
    const plan = planSchema.parse({
      summary: "Add a health endpoint",
      assumptions: [],
      acceptanceCriteria: ["GET /health returns 200"],
      steps: [{ id: "health", description: "Implement endpoint", files: ["server/index.ts"], risk: "low" }],
      commands: [],
      validationPlan: ["Run tests"],
      needsUserInput: false,
    });
    expect(plan.steps[0].id).toBe("health");
  });

  it("rejects unsafe or incomplete structured output", () => {
    expect(() => implementationSchema.parse({ summary: "missing actions" })).toThrow();
    expect(() => diagnosisSchema.parse({ summary: "missing root cause" })).toThrow();
  });
});
