import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { currentPassword, newPassword } = body;

    // Validate current password against env
    if (currentPassword !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json(
        { error: "INC-401", message: "Current password is incorrect" },
        { status: 401 }
      );
    }

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json(
        { error: "INC-400", message: "New password must be at least 6 characters" },
        { status: 400 }
      );
    }

    // Note: In a real deployment, you'd write this to a database or a secure config store.
    // Environment variables cannot be changed at runtime.
    // For now, we store it in-memory for the current process.
    process.env.ADMIN_PASSWORD = newPassword;

    return NextResponse.json({ success: true, message: "Password updated for current session" });
  } catch (e: any) {
    return NextResponse.json({ error: "INC-500", message: e.message }, { status: 500 });
  }
}
