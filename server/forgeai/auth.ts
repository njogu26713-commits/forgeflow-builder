import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { forgeConfig, forgeaiSessionCookie, sessionMaxAgeMs } from "./config";
import { getForgeDb, toObjectId } from "./db";
import type { PublicUser, UserDoc } from "./types";
import { toPublicUser } from "./types";
import { parse } from "cookie";

export type ForgeRequest = Request & {
  forgeUser?: UserDoc | null;
  forgeUserId?: string;
};

function tokenFromRequest(req: Request) {
  const authorization = req.header("authorization");
  if (authorization?.startsWith("Bearer ")) return authorization.slice(7);
  return parse(req.headers.cookie ?? "")[forgeaiSessionCookie];
}

export function signForgeSession(user: UserDoc) {
  if (!forgeConfig.jwtSecret) throw new Error("Authentication is not configured");
  return jwt.sign({ sub: user._id?.toHexString(), email: user.email }, forgeConfig.jwtSecret, { expiresIn: "7d" });
}

export function setForgeSession(res: Response, token: string) {
  const secure = forgeConfig.isProduction ? "; Secure" : "";
  res.setHeader("Set-Cookie", `${forgeaiSessionCookie}=${encodeURIComponent(token)}; Max-Age=${Math.floor(sessionMaxAgeMs / 1000)}; Path=/; HttpOnly; SameSite=Lax${secure}`);
}

export function clearForgeSession(res: Response) {
  res.clearCookie(forgeaiSessionCookie, {
    httpOnly: true,
    secure: forgeConfig.isProduction,
    sameSite: "lax",
    path: "/",
  });
}

export async function resolveForgeUser(req: Request): Promise<UserDoc | null> {
  if (!forgeConfig.jwtSecret) return null;
  const token = tokenFromRequest(req);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, forgeConfig.jwtSecret) as jwt.JwtPayload;
    const id = typeof payload.sub === "string" ? toObjectId(payload.sub) : null;
    if (!id) return null;
    const db = await getForgeDb();
    if (!db) return null;
    return (await db.collection<UserDoc>("users").findOne({ _id: id })) ?? null;
  } catch {
    return null;
  }
}

export async function optionalForgeAuth(req: ForgeRequest, _res: Response, next: NextFunction) {
  req.forgeUser = await resolveForgeUser(req);
  req.forgeUserId = req.forgeUser?._id?.toHexString();
  next();
}

export async function requireForgeAuth(req: ForgeRequest, res: Response, next: NextFunction) {
  await optionalForgeAuth(req, res, () => undefined);
  if (!req.forgeUser || !req.forgeUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  next();
}

export function publicUser(user: UserDoc): PublicUser {
  return toPublicUser(user);
}
