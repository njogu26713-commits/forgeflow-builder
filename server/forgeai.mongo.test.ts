import { describe, expect, it } from "vitest";
import { closeForgeDb, getForgeDb } from "./forgeai/db";

describe("ForgeAI MongoDB configuration", () => {
  it("connects and responds to a ping when MONGODB_URI is configured", async () => {
    expect(process.env.MONGODB_URI).toBeTruthy();
    const db = await getForgeDb();
    expect(db).not.toBeNull();
    await expect(db!.command({ ping: 1 })).resolves.toMatchObject({ ok: 1 });
    await closeForgeDb();
  }, 15_000);
});
