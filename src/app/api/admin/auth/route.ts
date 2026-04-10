import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { password } = body;

    if (password === process.env.ADMIN_PASSWORD) {
      // Create JWT token for edge compatibility
      const secret = new TextEncoder().encode(process.env.ADMIN_PASSWORD || "fallback_secret");
      const token = await new SignJWT({ role: "admin" })
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("24h")
        .sign(secret);

      const response = NextResponse.json({ success: true, token });
      
      // Also set an httpOnly cookie for the proxy middleware
      response.cookies.set({
        name: "inco_admin_jwt",
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/",
        maxAge: 60 * 60 * 24, // 24 hours
      });

      return response;
    } else {
      return NextResponse.json({ success: false, message: "Invalid authorization token" }, { status: 401 });
    }
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
