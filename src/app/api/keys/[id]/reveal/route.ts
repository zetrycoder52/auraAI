import { NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  return Response.json(
    {
      error: {
        code: "reveal_not_available",
        message: "API key plaintext is shown only once on creation/reset and is not stored in plaintext."
      }
    },
    { status: 410 }
  );
}

