import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getEphemeralLogs } from "@/lib/ephemeralLogs";

export const dynamic = "force-dynamic";

// Get request logs
export async function GET(req: NextRequest) {
  try {
    const logs = await prisma.requestLog.findMany({
      take: 50,
      orderBy: { timestamp: 'desc' },
      include: {
        model: {
          select: {
            displayName: true
          }
        }
      }
    });

    // Fetch user info for each unique sessionId
    const sessionIds = [...new Set(logs.map(log => log.sessionId).filter(Boolean))];
    const users = await prisma.apiKey.findMany({
      where: {
        key: { in: sessionIds as string[] }
      },
      select: {
        key: true,
        name: true,
        avatarUrl: true,
        isBlocked: true
      }
    });

    const userMap = new Map(users.map(u => [u.key, u]));

    // Enrich logs with user data
    const enrichedLogs = logs.map(log => ({
      ...log,
      userName: log.sessionId ? userMap.get(log.sessionId)?.name : undefined,
      userAvatar: log.sessionId ? userMap.get(log.sessionId)?.avatarUrl : undefined,
      isBlocked: log.sessionId ? userMap.get(log.sessionId)?.isBlocked : undefined
    }));

    return NextResponse.json({
      success: true,
      logs: enrichedLogs,
      ephemeralLogs: getEphemeralLogs()
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch logs" },
      { status: 500 }
    );
  }
}
