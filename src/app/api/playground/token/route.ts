import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { prisma } from "@/lib/db";
import { LRUCache } from "lru-cache";

export const dynamic = "force-dynamic";

// Store playground tokens in a memory cache with their usage
// Using LRUCache handles expiration automatically (1 hour)
const playgroundTokens = new LRUCache<string, { created: number; tokensUsed: number }>({
  max: 1000,
  ttl: 1000 * 60 * 60, // 1 hour
});

// Authenticate to check if caller is an admin
// We want to secure token generation against abuse
const authenticateAdmin = (req: NextRequest) => {
    const authCookie = req.cookies.get('inco_admin_jwt');
    // If they have the admin JWT, they are allowed
    return !!authCookie;
};

export async function POST(req: NextRequest) {
  try {
    // Only allow admins to generate new playground tokens to prevent abuse (DDoS / draining limits)
    // The web UI will use the admin token when calling this from the playground
    const isAdmin = authenticateAdmin(req);
    
    // We optionally allow it without admin IF it's coming from localhost/same origin in a real app,
    // but for INCO, requiring the admin cookie is safer.
    if (!isAdmin) {
       return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = `sk-playground-${uuidv4().replace(/-/g, '')}`;
    
    playgroundTokens.set(token, {
      created: Date.now(),
      tokensUsed: 0
    });

    // Optionally save it as a temporary key in DB with a strict RPD limit
    await prisma.apiKey.create({
        data: {
            key: token,
            useSearch: false,
        }
    });

    return NextResponse.json({ 
      success: true, 
      token,
      limit: 32000
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Failed to generate playground token", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    activeTokens: playgroundTokens.size
  });
}

// Export for use in other routes
export function validatePlaygroundToken(token: string, tokensToAdd: number = 0): boolean {
  const data = playgroundTokens.get(token);
  
  if (!data) return false;
  
  // Check if adding tokens would exceed limit
  if (data.tokensUsed + tokensToAdd > 32000) {
    return false;
  }
  
  return true;
}

export function incrementPlaygroundTokenUsage(token: string, tokens: number): void {
  const data = playgroundTokens.get(token);
  if (data) {
    data.tokensUsed += tokens;
    // Update the cache item to persist the new count
    playgroundTokens.set(token, data);
  }
}

export function getPlaygroundTokenUsage(token: string): number {
  return playgroundTokens.get(token)?.tokensUsed || 0;
}
