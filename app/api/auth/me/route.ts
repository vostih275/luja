import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { NextResponse } from "next/server";

export const GET = apiHandler(async (req: NextRequest) => {
  const user = await getCurrentUser(req);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ user });
});
