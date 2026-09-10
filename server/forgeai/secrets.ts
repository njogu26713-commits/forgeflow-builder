import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { forgeConfig, requireSecretEncryptionConfig } from "./config";

function encryptionKey() {
  requireSecretEncryptionConfig();
  return createHash("sha256").update(forgeConfig.secretEncryptionKey).digest();
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), ciphertext.toString("base64url")].join(".");
}

export function decryptSecret(value: string) {
  const [ivValue, tagValue, ciphertextValue] = value.split(".");
  if (!ivValue || !tagValue || !ciphertextValue) throw new Error("Invalid encrypted secret");
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertextValue, "base64url")), decipher.final()]).toString("utf8");
}

export function maskSecret(value: string) {
  return value.length > 4 ? `${"•".repeat(Math.min(8, Math.max(4, value.length - 4)))}${value.slice(-4)}` : "••••";
}
