import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const modelId = req.nextUrl.searchParams.get("modelId");
    if (!modelId) return NextResponse.json({ error: "INC-101", message: "Missing modelId" }, { status: 400 });

    const profile = await prisma.promptProfile.findUnique({ where: { modelId } });
    return NextResponse.json({ success: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { modelId, ...data } = body;
    if (!modelId) return NextResponse.json({ error: "INC-101", message: "Missing modelId" }, { status: 400 });

    const profile = await prisma.promptProfile.upsert({
      where: { modelId },
      update: {
        mainPrompt: data.mainPrompt ?? "",
        auxiliaryPrompt: data.auxiliaryPrompt ?? "",
        postHistory: data.postHistory ?? "",
        enhanceDefinitions: data.enhanceDefinitions ?? "",
        contextTemplate: data.contextTemplate ?? "",
        storyString: data.storyString ?? "",
        instructWrapper: data.instructWrapper ?? "",
        injectionPosition: data.injectionPosition ?? "before_history",
        injectionDepth: data.injectionDepth ?? 0,
        positivePrompt: data.positivePrompt ?? "",
        negativePrompt: data.negativePrompt ?? "",
        guidanceJson: data.guidanceJson ?? {},
        prefill: data.prefill ?? ""
      },
      create: {
        modelId,
        mainPrompt: data.mainPrompt ?? "",
        auxiliaryPrompt: data.auxiliaryPrompt ?? "",
        postHistory: data.postHistory ?? "",
        enhanceDefinitions: data.enhanceDefinitions ?? "",
        contextTemplate: data.contextTemplate ?? "",
        storyString: data.storyString ?? "",
        instructWrapper: data.instructWrapper ?? "",
        injectionPosition: data.injectionPosition ?? "before_history",
        injectionDepth: data.injectionDepth ?? 0,
        positivePrompt: data.positivePrompt ?? "",
        negativePrompt: data.negativePrompt ?? "",
        guidanceJson: data.guidanceJson ?? {},
        prefill: data.prefill ?? ""
      }
    });

    return NextResponse.json({ success: true, profile });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
