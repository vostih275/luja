import { prisma } from "./db";

export async function logAction({
  action,
  actorId,
  targetUserId,
  targetBookId,
  details,
  ipAddress,
}: {
  action: string;
  actorId?: string;
  targetUserId?: string;
  targetBookId?: string;
  details?: unknown;
  ipAddress?: string;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        actorId,
        targetUserId,
        targetBookId,
        details: details ? JSON.stringify(details) : undefined,
        ipAddress,
      },
    });
  } catch {
    // Audit failures should not crash user-facing operations.
  }
}
