import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "../app/api/auth/login/route";
import { GET as getBooks, POST as createBook } from "../app/api/admin/books/route";
import { POST as grant } from "../app/api/admin/permissions/grant/route";
import { POST as revoke } from "../app/api/admin/permissions/revoke/route";
import { POST as claim } from "../app/api/auth/claim/route";
import { GET as getBookFile } from "../app/api/books/[id]/file/route";
import { createUser, createBookAndFile } from "./helpers";
import { resetRateLimit } from "../lib/rate-limit";
import { TOKEN_NAME } from "../lib/auth";

function jsonRequest(method: string, url: string, body?: unknown, cookie?: string) {
  const headers: Record<string, string> = {};
  if (body && !(body instanceof FormData)) headers["content-type"] = "application/json";
  if (cookie) headers["Cookie"] = cookie;
  return new NextRequest(url, {
    method,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    headers,
  });
}

async function loginAs(email: string, password: string): Promise<string> {
  const res = await login(
    jsonRequest("POST", "http://localhost/api/auth/login", { email, password }),
  );
  const token = res.cookies.get(TOKEN_NAME)?.value;
  if (!token) throw new Error("Login failed in test helper");
  return token;
}

describe("Admin API security", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("rejects a READER from accessing admin book routes", async () => {
    const reader = await createUser("reader-admin@test.local", "ReaderPass123!", "READER");
    const token = await loginAs(reader.email, "ReaderPass123!");
    const res = await getBooks(
      jsonRequest("GET", "http://localhost/api/admin/books", undefined, `${TOKEN_NAME}=${token}`),
    );
    expect(res.status).toBe(403);
  });

  it("allows an ADMIN to upload a book via multipart form", async () => {
    const token = await loginAs("admin@test.local", "AdminPass123!");
    const form = new FormData();
    const file = new File(["test pdf content"], "book.pdf", { type: "application/pdf" });
    form.append("file", file);
    form.append("title", "Admin Test Book");
    form.append("author", "Admin Author");
    form.append("description", "A book uploaded in tests");
    const res = await createBook(
      jsonRequest("POST", "http://localhost/api/admin/books", form, `${TOKEN_NAME}=${token}`),
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.book.title).toBe("Admin Test Book");
  });
});

describe("Invitation workflow", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("creates an invitation for unknown email and rejects token reuse", async () => {
    const { book } = await createBookAndFile();
    const adminToken = await loginAs("admin@test.local", "AdminPass123!");
    const grantRes = await grant(
      jsonRequest(
        "POST",
        "http://localhost/api/admin/permissions/grant",
        { bookId: book.id, email: "invited-reader@test.local" },
        `${TOKEN_NAME}=${adminToken}`,
      ),
    );
    expect(grantRes.status).toBe(200);
    const { inviteToken } = await grantRes.json();
    expect(inviteToken).toBeTruthy();

    const claimRes = await claim(
      jsonRequest("POST", "http://localhost/api/auth/claim", {
        token: inviteToken,
        email: "invited-reader@test.local",
        password: "NewReaderPass123!",
      }),
    );
    expect(claimRes.status).toBe(200);
    const data = await claimRes.json();
    expect(data.user.role).toBe("READER");
    expect(claimRes.cookies.get(TOKEN_NAME)?.value).toBeTruthy();

    const reuseRes = await claim(
      jsonRequest("POST", "http://localhost/api/auth/claim", {
        token: inviteToken,
        email: "invited-reader@test.local",
        password: "NewReaderPass123!",
      }),
    );
    expect(reuseRes.status).toBe(400);
  });

  it("revokes access instantly", async () => {
    const reader = await createUser("revoked-reader@test.local", "ReaderPass123!", "READER");
    const { book } = await createBookAndFile();
    const adminToken = await loginAs("admin@test.local", "AdminPass123!");

    const grantRes = await grant(
      jsonRequest(
        "POST",
        "http://localhost/api/admin/permissions/grant",
        { bookId: book.id, email: reader.email },
        `${TOKEN_NAME}=${adminToken}`,
      ),
    );
    expect(grantRes.status).toBe(200);

    const revokeRes = await revoke(
      jsonRequest(
        "POST",
        "http://localhost/api/admin/permissions/revoke",
        { bookId: book.id, userId: reader.id },
        `${TOKEN_NAME}=${adminToken}`,
      ),
    );
    expect(revokeRes.status).toBe(200);

    const readerToken = await loginAs(reader.email, "ReaderPass123!");
    const fileRes = await getBookFile(
      jsonRequest(
        "GET",
        `http://localhost/api/books/${book.id}/file`,
        undefined,
        `${TOKEN_NAME}=${readerToken}`,
      ),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(fileRes.status).toBe(403);
  });
});
