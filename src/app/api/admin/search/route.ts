import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

// Get search configurations
export async function GET(req: NextRequest) {
  try {
    const configs = await prisma.searchConfig.findMany();

    return NextResponse.json({
      success: true,
      configs
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch search configs" },
      { status: 500 }
    );
  }
}

// Update search configuration
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { provider, apiKeys, agentCorePrompt, isActive } = body;

    const config = await prisma.searchConfig.upsert({
      where: { provider },
      update: {
        apiKeys,
        agentCorePrompt,
        isActive
      },
      create: {
        provider,
        apiKeys,
        agentCorePrompt,
        isActive
      }
    });

    return NextResponse.json({
      success: true,
      config
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to update search config" },
      { status: 500 }
    );
  }
}
