import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as login } from "../app/api/auth/login/route";
import { POST as grant } from "../app/api/admin/permissions/grant/route";
import { POST as claim } from "../app/api/auth/claim/route";
import { GET as getReaderBooks } from "../app/api/reader/books/route";
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

async function loginAs(email: string, password: string): Promise<string> {
  const res = await login(jsonRequest("POST", "http://localhost/api/auth/login", { email, password }));
  const token = res.cookies.get(TOKEN_NAME)?.value;
  if (!token) throw new Error("Login failed in test helper");
  return token;
}

describe("Reader library API", () => {
  beforeEach(() => {
    resetRateLimit();
  });

  it("returns 401 for unauthenticated requests", async () => {
    const res = await getReaderBooks(jsonRequest("GET", "http://localhost/api/reader/books"));
    expect(res.status).toBe(401);
  });

  it("only returns books the reader has permission for", async () => {
    const readerA = await createUser("readerA-lib@test.local", "ReaderPass123!", "READER");
    const readerB = await createUser("readerB-lib@test.local", "ReaderPass123!", "READER");
    const { book: bookA } = await createBookAndFile();
    const { book: bookB } = await createBookAndFile();

    await prisma.permission.create({
      data: { userId: readerA.id, bookId: bookA.id, grantedBy: readerA.id },
    });
    await prisma.permission.create({
      data: { userId: readerB.id, bookId: bookB.id, grantedBy: readerB.id },
    });

    const token = await loginAs(readerA.email, "ReaderPass123!");
    const res = await getReaderBooks(
      jsonRequest("GET", "http://localhost/api/reader/books", undefined, `${TOKEN_NAME}=${token}`),
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.books).toHaveLength(1);
    expect(data.books[0].id).toBe(bookA.id);
    expect(data.books[0]).not.toHaveProperty("fileStorageKey");
  });

  it("gives immediate access after claiming an invitation", async () => {
    const { book } = await createBookAndFile();
    const adminToken = await loginAs("admin@test.local", "AdminPass123!");

    const grantRes = await grant(
      jsonRequest(
        "POST",
        "http://localhost/api/admin/permissions/grant",
        { bookId: book.id, email: "invited-reader-5@test.local" },
        `${TOKEN_NAME}=${adminToken}`,
      ),
    );
    expect(grantRes.status).toBe(200);
    const { inviteToken } = await grantRes.json();

    const claimRes = await claim(
      jsonRequest("POST", "http://localhost/api/auth/claim", {
        token: inviteToken,
        email: "invited-reader-5@test.local",
        password: "NewReaderPass123!",
      }),
    );
    expect(claimRes.status).toBe(200);
    const token = claimRes.cookies.get(TOKEN_NAME)?.value;

    const res = await getReaderBooks(
      jsonRequest("GET", "http://localhost/api/reader/books", undefined, `${TOKEN_NAME}=${token}`),
    );
    const data = await res.json();
    expect(data.books).toHaveLength(1);
    expect(data.books[0].id).toBe(book.id);

    const fileRes = await getBookFile(
      jsonRequest("GET", `http://localhost/api/books/${book.id}/file`, undefined, `${TOKEN_NAME}=${token}`),
      { params: Promise.resolve({ id: book.id }) },
    );
    expect(fileRes.status).toBe(200);
  });
});
