import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export const TOKEN_NAME = "luja_session";
export const TOKEN_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionUser {
  id: string;
  email: string;
  role: "ADMIN" | "READER";
}

function getSecret() {
  const raw = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!raw) {
    throw new Error("JWT_SECRET (or SESSION_SECRET) must be configured");
  }
  return new TextEncoder().encode(raw);
}

export async function signSessionToken(payload: SessionUser): Promise<string> {
  const secret = getSecret();
  return new SignJWT(payload as unknown as import("jose").JWTPayload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${TOKEN_MAX_AGE_SECONDS}s`)
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<SessionUser> {
  const secret = getSecret();
  const { payload } = await jwtVerify(token, secret);
  return payload as unknown as SessionUser;
}

export async function getCurrentUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth(req: NextRequest): Promise<SessionUser> {
  const user = await getCurrentUser(req);
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  return user;
}

export async function requireAdmin(req: NextRequest): Promise<SessionUser> {
  const user = await requireAuth(req);
  if (user.role !== "ADMIN") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export function setSessionCookie(response: NextResponse, token: string): NextResponse {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookies.set({
    name: TOKEN_NAME,
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax",
    path: "/",
    maxAge: TOKEN_MAX_AGE_SECONDS,
  });
  return response;
}

export async function getServerUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(TOKEN_NAME)?.value;
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export async function requireServerAdmin(): Promise<SessionUser> {
  const user = await getServerUser();
  if (!user) {
    throw new AuthError("Unauthorized", 401);
  }
  if (user.role !== "ADMIN") {
    throw new AuthError("Forbidden", 403);
  }
  return user;
}

export function clearSessionCookie(response: NextResponse): NextResponse {
  response.cookies.set({
    name: TOKEN_NAME,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
  return response;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}
