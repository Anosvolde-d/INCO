import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";

export const dynamic = "force-dynamic";

let activeTunnel: any = null;
let tunnelProcess: any = null;

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { action } = await req.json();

    if (action === "start") {
      if (activeTunnel) {
        return NextResponse.json({ success: true, url: activeTunnel.url });
      }

      const hostHeader = req.headers.get("host") || "localhost:3000";
      const port = parseInt(hostHeader.split(":")[1] || "3000", 10);

      // Start Cloudflare tunnel
      return new Promise<NextResponse>((resolve) => {
        const cloudflaredPath = "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe";
        tunnelProcess = spawn(cloudflaredPath, ["tunnel", "--url", `http://localhost:${port}`]);

        let tunnelUrl = "";

        // Cloudflare outputs to both stdout and stderr
        const handleOutput = (data: Buffer) => {
          const output = data.toString();
          console.log("Cloudflare Tunnel:", output);

          // Extract URL from output
          const urlMatch = output.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
          if (urlMatch && !tunnelUrl) {
            tunnelUrl = urlMatch[0];
            activeTunnel = { url: tunnelUrl, process: tunnelProcess };
            resolve(NextResponse.json({ success: true, url: tunnelUrl }));
          }
        };

        tunnelProcess.stdout.on("data", handleOutput);
        tunnelProcess.stderr.on("data", handleOutput);

        tunnelProcess.on("close", () => {
          activeTunnel = null;
          tunnelProcess = null;
        });

        // Timeout after 20 seconds
        setTimeout(() => {
          if (!tunnelUrl) {
            resolve(NextResponse.json({ success: false, message: "Tunnel creation timeout" }, { status: 500 }));
          }
        }, 20000);
      });
    } else if (action === "stop") {
      if (tunnelProcess) {
        tunnelProcess.kill();
        tunnelProcess = null;
        activeTunnel = null;
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, url: activeTunnel ? activeTunnel.url : null });
  } catch (error: any) {
    return NextResponse.json(
      { error: "INC-500", message: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    url: activeTunnel ? activeTunnel.url : null
  });
}
