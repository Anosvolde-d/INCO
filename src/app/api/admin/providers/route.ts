import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providers = await prisma.provider.findMany({
      include: { models: { include: { promptProfile: true }, orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json({ success: true, providers });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const provider = await prisma.provider.create({
      data: {
        name: body.name,
        baseUrl: body.baseUrl,
        apiKeyEncrypted: body.apiKeyEncrypted || null,
        customHeaders: body.customHeaders || {}
      }
    });
    return NextResponse.json({ success: true, provider });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "INC-101", message: "Missing id" }, { status: 400 });
    await prisma.provider.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "INC-101", message: "Missing id" }, { status: 400 });
    const provider = await prisma.provider.update({ where: { id }, data });
    return NextResponse.json({ success: true, provider });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
