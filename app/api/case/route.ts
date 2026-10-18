import { generateCase } from "@/lib/case/generate";
import { clientIp, rateLimited } from "@/lib/limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(request: Request) {
  if (rateLimited(clientIp(request))) {
    return Response.json({ error: "too many trials from this address, wait a few minutes" }, { status: 429 });
  }
  let seed: string | undefined;
  try {
    const body = (await request.json()) as { seed?: unknown };
    if (typeof body.seed === "string" && body.seed.trim()) seed = body.seed.trim();
  } catch {
    seed = undefined;
  }
  try {
    return Response.json(generateCase(seed));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("case failed:", message);
    return Response.json({ error: `the court could not be convened: ${message}` }, { status: 502 });
  }
}
