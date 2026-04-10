import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { apiKey, isBlocked } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, message: "API key required" }, { status: 400 });
    }

    await prisma.apiKey.update({
      where: { key: apiKey },
      data: { isBlocked }
    });

    return NextResponse.json({
      success: true,
      message: isBlocked ? "User blocked" : "User unblocked"
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to update user status" },
      { status: 500 }
    );
  }
}
