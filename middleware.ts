import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { TOKEN_NAME } from "./lib/auth";

type UserPayload = { id: string; email: string; role: "ADMIN" | "READER" };

function getSecret() {
  const raw = process.env.JWT_SECRET ?? process.env.SESSION_SECRET;
  if (!raw) {
    throw new Error("JWT_SECRET (or SESSION_SECRET) must be configured");
  }
  return new TextEncoder().encode(raw);
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(TOKEN_NAME)?.value;
  const { pathname } = req.nextUrl;
  const isAdminRoute = pathname.startsWith("/admin");
  const isReaderRoute = pathname.startsWith("/library") || pathname === "/invite";
  const isAuthPage = pathname === "/login";

  let payload: UserPayload | null = null;
  if (token) {
    try {
      const verified = await jwtVerify(token, getSecret());
      payload = verified.payload as unknown as UserPayload;
    } catch {
      payload = null;
    }
  }

  if (isAdminRoute && payload?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isReaderRoute && !payload) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAuthPage && payload) {
    const destination = payload.role === "ADMIN" ? "/admin" : "/library";
    return NextResponse.redirect(new URL(destination, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};
