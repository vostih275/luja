import { NextRequest, NextResponse } from "next/server";

type Context = { params: Promise<Record<string, string>> };

export function apiHandler(
  handler: (req: NextRequest) => Promise<NextResponse | Response>,
) {
  return async function (req: NextRequest) {
    try {
      return await handler(req);
    } catch (err) {
      console.error("API error:", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}

export function apiHandlerWithParams(
  handler: (req: NextRequest, ctx: Context) => Promise<NextResponse | Response>,
) {
  return async function (req: NextRequest, ctx: Context) {
    try {
      return await handler(req, ctx);
    } catch (err) {
      console.error("API error:", err);
      const message = err instanceof Error ? err.message : "Internal server error";
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
