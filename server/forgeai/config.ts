export const forgeConfig = {
  mongoUri: process.env.MONGODB_URI ?? "",
  mongoDbName: process.env.MONGODB_DB_NAME ?? "forgeai",
  groqApiKey: process.env.GROQ_API_KEY ?? "",
  groqModel: process.env.GROQ_MODEL ?? "llama-3.2-90b-vision-preview",
  jwtSecret: process.env.JWT_SECRET ?? "",
  secretEncryptionKey: process.env.SECRET_ENCRYPTION_KEY ?? "",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "",
  isProduction: process.env.NODE_ENV === "production",
};

export const forgeaiSessionCookie = "forgeai_session";
export const sessionMaxAgeMs = 7 * 24 * 60 * 60 * 1000;

export function hasForgeDatabase() {
  return Boolean(forgeConfig.mongoUri);
}

export function hasForgeAuth() {
  return Boolean(forgeConfig.jwtSecret && forgeConfig.mongoUri);
}

export function hasGroq() {
  return Boolean(forgeConfig.groqApiKey);
}

export function requireForgeAuthConfig() {
  if (!forgeConfig.jwtSecret) throw new Error("Authentication is not configured");
}

export function requireSecretEncryptionConfig() {
  if (!forgeConfig.secretEncryptionKey) throw new Error("Secret encryption is not configured");
}
