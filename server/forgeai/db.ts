import { Db, MongoClient, ObjectId } from "mongodb";
import { forgeConfig } from "./config";
import type { ChatDoc, ProjectDoc, SecretDoc, UserDoc } from "./types";
import type { DevelopmentEventDoc, DevelopmentRunDoc, ToolCallDoc } from "./runTypes";

let client: MongoClient | null = null;
let database: Db | null = null;
let indexesReady: Promise<void> | null = null;

export async function getForgeDb(): Promise<Db | null> {
  if (!forgeConfig.mongoUri) return null;
  if (database) return database;

  client = new MongoClient(forgeConfig.mongoUri, { serverSelectionTimeoutMS: 5000 });
  await client.connect();
  database = client.db(forgeConfig.mongoDbName);
  indexesReady = ensureIndexes(database);
  await indexesReady;
  return database;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection<UserDoc>("users").createIndex({ email: 1 }, { unique: true }),
    db.collection<ProjectDoc>("projects").createIndex({ userId: 1, updatedAt: -1 }),
    db.collection<ChatDoc>("chats").createIndex({ userId: 1, updatedAt: -1 }),
    db.collection<SecretDoc>("secrets").createIndex({ userId: 1, projectId: 1 }),
    db.collection<DevelopmentRunDoc>("developmentRuns").createIndex({ userId: 1, updatedAt: -1 }),
    db.collection<DevelopmentEventDoc>("developmentEvents").createIndex({ runId: 1, sequence: 1 }, { unique: true }),
    db.collection<ToolCallDoc>("toolCalls").createIndex({ runId: 1, createdAt: 1 }),
  ]);
}

export async function closeForgeDb() {
  if (client) await client.close();
  client = null;
  database = null;
  indexesReady = null;
}

export function toObjectId(value: string) {
  return ObjectId.isValid(value) ? new ObjectId(value) : null;
}
