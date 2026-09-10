import { describe, expect, it } from "vitest";
import { maskSecret } from "./forgeai/secrets";
import { toPublicUser, type UserDoc } from "./forgeai/types";

describe("ForgeAI security boundaries", () => {
  it("masks secret values without returning the plaintext", () => {
    const value = "sk-live-very-sensitive-value";
    const masked = maskSecret(value);
    expect(masked).not.toContain(value);
    expect(masked.endsWith("alue")).toBe(true);
  });

  it("serializes users without password hashes", () => {
    const user: UserDoc = {
      name: "Ada Lovelace",
      email: "ada@example.com",
      passwordHash: "$2b$12$not-a-plaintext-password",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
      updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    };
    const publicUser = toPublicUser(user);
    expect(publicUser).toEqual({ id: "", name: "Ada Lovelace", email: "ada@example.com", createdAt: "2026-01-01T00:00:00.000Z" });
    expect(publicUser).not.toHaveProperty("passwordHash");
  });
});
