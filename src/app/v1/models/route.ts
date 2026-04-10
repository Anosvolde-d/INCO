import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

// Force dynamic — never cache this route
export const dynamic = "force-dynamic";

// Public endpoint to get available models
export async function GET(req: NextRequest) {
  try {
    const models = await prisma.model.findMany({
      where: { isPublic: true },
      select: {
        displayName: true,
        supportsVision: true,
        supportsSearch: true,
        tokenLimit: true,
      },
    });

    // Format for OpenAI compatibility if needed, or just return custom list
    return NextResponse.json({
      object: "list",
      data: models.map(m => ({
        id: m.displayName,
        object: "model",
        created: Math.floor(Date.now() / 1000),
        owned_by: "INCO",
        permission: [],
        root: m.displayName,
        parent: null,
        // INCO specific metadata
        _inco: {
            displayName: m.displayName,
            supportsVision: m.supportsVision,
            supportsSearch: m.supportsSearch,
            tokenLimit: m.tokenLimit
        }
      })),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: "Failed to fetch models" },
      { status: 500 }
    );
  }
}

export async function OPTIONS(req: NextRequest) {
    const origin = req.headers.get("origin") || "*";
    const requestedHeaders = req.headers.get("Access-Control-Request-Headers") || "*";
    return new NextResponse(null, {
        status: 200,
        headers: {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": requestedHeaders,
            "Access-Control-Max-Age": "86400",
        },
    });
}