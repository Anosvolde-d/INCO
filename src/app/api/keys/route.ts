import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const { useSearch } = await req.json();
    
    // Server-side generation to prevent client-side vulnerabilities
    const generatedKey = `inco-${uuidv4()}`;

    const apiKey = await prisma.apiKey.create({
      data: { 
        key: generatedKey, 
        useSearch: useSearch || false 
      },
    });

    return NextResponse.json({ success: true, apiKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
