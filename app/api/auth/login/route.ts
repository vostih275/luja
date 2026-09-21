import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { signSessionToken, setSessionCookie } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { logAction } from "@/lib/audit";
import { apiHandler } from "@/lib/api";

export const POST = apiHandler(async (req: NextRequest) => {
  const ip = getClientIp(req);
  const { allowed, retryAfter } = rateLimit(`${ip}:login`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many login attempts" },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", issues: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signSessionToken({ id: user.id, email: user.email, role: user.role });
  await logAction({
    action: "AUTH_LOGIN",
    actorId: user.id,
    details: { email: user.email },
    ipAddress: ip,
  });

  const response = NextResponse.json({
    user: { id: user.id, email: user.email, role: user.role },
  });
  return setSessionCookie(response, token);
});
