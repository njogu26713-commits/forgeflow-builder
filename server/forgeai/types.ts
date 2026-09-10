import type { ObjectId } from "mongodb";

export type UserDoc = {
  _id?: ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
};

export type ProjectDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  name: string;
  description: string;
  files: unknown[];
  repository?: Record<string, unknown> | null;
  deployment?: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
};

export type ChatMessageDoc = {
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
};

export type ChatDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId | null;
  title: string;
  messages: ChatMessageDoc[];
  createdAt: Date;
  updatedAt: Date;
};

export type SecretDoc = {
  _id?: ObjectId;
  userId: ObjectId;
  projectId?: ObjectId | null;
  name: string;
  encryptedValue: string;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicUser = {
  id: string;
  name: string;
  email: string;
  createdAt: string;
};

export function toPublicUser(user: UserDoc): PublicUser {
  return {
    id: user._id?.toHexString() ?? "",
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}
