import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "../app/api/auth/login/route";
import { POST as logout } from "../app/api/auth/logout/route";
import { GET as me } from "../app/api/auth/me/route";
import { GET as getBookFile } from "../app/api/books/[id]/file/route";
import { createUser, createBookAndFile } from "./helpers";
import { prisma } from "../lib/db";
import { resetRateLimit } from "../lib/rate-limit";
import { TOKEN_NAME } from "../lib/auth";

function jsonRequest(method: string, url: string, body?: unknown, cookie?: string) {
  const headers: Record<string, string> = {};
  if (body) headers["content-type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;
  return new NextRequest(url, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers,
  });
}

describe("Authentication", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns 401 for invalid credentials", async () => {
    const req = jsonRequest("POST", "http://localhost/api/auth/login", {
      email: "admin@test.local",
      password: "wrong-password",
    });
    const res = await login(req);
    expect(res.status).toBe(401);
  });

  it("logs in an admin and returns a secure session cookie", async () => {
    const req = jsonRequest("POST", "http://localhost/api/auth/login", {
      email: "admin@test.local",
      password: "AdminPass123!",
    });
    const res = await login(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.role).toBe("ADMIN");
    expect(res.cookies.get(TOKEN_NAME)?.value).toBeTruthy();
  });

  it("exposes /api/auth/me for a valid session", async () => {
    const loginRes = await login(
      jsonRequest("POST", "http://localhost/api/auth/login", {
        email: "admin@test.local",
        password: "AdminPass123!",
      }),
    );
    const token = loginRes.cookies.get(TOKEN_NAME)?.value;
    const res = await me(jsonRequest("GET", "http://localhost/api/auth/me", undefined, `${TOKEN_NAME}=${token}`));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.email).toBe("admin@test.local");
  });

  it("clears the session cookie on logout", async () => {
    const res = await logout();
    expect(res.status).toBe(200);
    expect(res.cookies.get(TOKEN_NAME)?.value).toBe("");
  });
});

describe("Secure file access", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns 401 when accessing a book file without a session", async () => {
    const { book } = await createBookAndFile();
    const req = jsonRequest("GET", `http://localhost/api/books/${book.id}/file`);
    const res = await getBookFile(req, { params: Promise.resolve({ id: book.id }) });
    expect(res.status).toBe(401);
  });

  it("returns 403 when a reader accesses a book without permission", async () => {
    const reader = await createUser("reader-no-access@test.local", "ReaderPass123!", "READER");
    const { book } = await createBookAndFile();
    const loginRes = await login(
      jsonRequest("POST", "http://localhost/api/auth/login", {
        email: reader.email,
        password: "ReaderPass123!",
      }),
    );
    const token = loginRes.cookies.get(TOKEN_NAME)?.value;
    const req = jsonRequest("GET", `http://localhost/api/books/${book.id}/file`, undefined, `${TOKEN_NAME}=${token}`);
    const res = await getBookFile(req, { params: Promise.resolve({ id: book.id }) });
    expect(res.status).toBe(403);
  });

  it("returns 200 with security headers when a reader has permission", async () => {
    const reader = await createUser("reader-allowed@test.local", "ReaderPass123!", "READER");
    const { book } = await createBookAndFile();
    await prisma.permission.create({
      data: { userId: reader.id, bookId: book.id, grantedBy: reader.id },
    });
    const loginRes = await login(
      jsonRequest("POST", "http://localhost/api/auth/login", {
        email: reader.email,
        password: "ReaderPass123!",
      }),
    );
    const token = loginRes.cookies.get(TOKEN_NAME)?.value;
    const req = jsonRequest("GET", `http://localhost/api/books/${book.id}/file`, undefined, `${TOKEN_NAME}=${token}`);
    const res = await getBookFile(req, { params: Promise.resolve({ id: book.id }) });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
    expect(res.headers.get("cache-control")).toContain("no-store");
    expect(res.headers.get("content-disposition")).toContain("inline");
  });
});
