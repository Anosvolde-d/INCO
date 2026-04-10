import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const model = await prisma.model.create({
      data: {
        providerId: body.providerId,
        displayName: body.displayName,
        providerModelId: body.providerModelId,
        isPublic: body.isPublic ?? true,
        supportsVision: body.supportsVision ?? false,
        supportsSearch: body.supportsSearch ?? false,
        tokenLimit: body.tokenLimit ?? 128000
      }
    });
    return NextResponse.json({ success: true, model });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "INC-101", message: "Missing id" }, { status: 400 });
    const model = await prisma.model.update({ where: { displayName: id } as any, data });
    return NextResponse.json({ success: true, model });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "INC-101", message: "Missing id" }, { status: 400 });
    await prisma.model.delete({ where: { displayName: id } as any });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
