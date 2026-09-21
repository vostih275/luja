import { NextResponse } from "next/server";
import { clearSessionCookie } from "@/lib/auth";
import { apiHandler } from "@/lib/api";

export const POST = apiHandler(async () => {
  const response = NextResponse.json({ ok: true });
  return clearSessionCookie(response);
});
