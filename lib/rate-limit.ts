import type { NextRequest } from "next/server";

type Window = {
  count: number;
  resetAt: number;
};

const store = new Map<string, Window>();

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "127.0.0.1";
  }
  return "127.0.0.1";
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const window = store.get(key);
  if (!window || now >= window.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfter: 0 };
  }
  if (window.count >= limit) {
    const retryAfter = Math.ceil((window.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  window.count += 1;
  store.set(key, window);
  return { allowed: true, retryAfter: 0 };
}

export function resetRateLimit(): void {
  store.clear();
}
