import { readFileSync } from "fs";
import path from "path";
import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const origin = new URL(request.url).origin;
  const templatePath = path.join(process.cwd(), "scripts", "icw-template.ps1");
  const template = readFileSync(templatePath, "utf8");
  const script = template.replace(/__ORIGIN__/g, origin);

  return new Response(script, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}
