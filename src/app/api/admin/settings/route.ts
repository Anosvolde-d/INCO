import { NextRequest, NextResponse } from "next/server";

// In-memory settings store (in production, use a database table)
// For now, this persists across requests within the same server process
let systemSettings: Record<string, any> = {};

export async function GET() {
  return NextResponse.json({ success: true, settings: systemSettings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    systemSettings = { ...systemSettings, ...body };
    return NextResponse.json({ success: true, settings: systemSettings });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
