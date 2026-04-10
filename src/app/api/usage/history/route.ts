import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.nextUrl.searchParams.get("apiKey");
    if (!apiKey) {
      return NextResponse.json({ success: false, logs: [] });
    }

    const logs = await prisma.requestLog.findMany({
      where: { sessionId: apiKey },
      take: 20,
      orderBy: { timestamp: 'desc' },
      select: {
        id: true,
        timestamp: true,
        modelId: true,
        providerModelId: true,
        searchUsed: true,
        searchProvider: true,
        tokenUsageJson: true,
        executionMs: true,
        ttftMs: true
      }
    });

    return NextResponse.json({
      success: true,
      logs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch usage history" },
      { status: 500 }
    );
  }
}
