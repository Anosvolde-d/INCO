import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const apiKey = req.nextUrl.searchParams.get("apiKey");
    
    if (!apiKey) {
      return NextResponse.json({ success: false, message: "API key required" }, { status: 400 });
    }

    const profile = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      select: {
        name: true,
        avatarUrl: true,
        isBlocked: true,
        lastNameChange: true
      }
    });

    if (!profile) {
      return NextResponse.json({ success: false, message: "Profile not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { apiKey, name, avatarUrl } = await req.json();

    if (!apiKey) {
      return NextResponse.json({ success: false, message: "API key required" }, { status: 400 });
    }

    const updateData: any = {};
    
    // If updating name, check if allowed
    if (name !== undefined) {
      const existing = await prisma.apiKey.findUnique({
        where: { key: apiKey },
        select: { lastNameChange: true }
      });

      if (existing?.lastNameChange) {
        const lastChange = new Date(existing.lastNameChange);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);

        if (lastChange > weekAgo) {
          const nextChange = new Date(lastChange);
          nextChange.setDate(nextChange.getDate() + 7);
          return NextResponse.json(
            { success: false, message: `You can change your name again on ${nextChange.toLocaleDateString()}` },
            { status: 400 }
          );
        }
      }

      updateData.name = name;
      updateData.lastNameChange = new Date();
    }
    
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;

    const profile = await prisma.apiKey.update({
      where: { key: apiKey },
      data: updateData,
      select: {
        name: true,
        avatarUrl: true,
        lastNameChange: true
      }
    });

    return NextResponse.json({
      success: true,
      profile
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to update profile" },
      { status: 500 }
    );
  }
}
