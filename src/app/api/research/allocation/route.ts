import { authorizeResearchRequest, requireSameOrigin, ResearchAccessError } from "@/features/research/access";
import { readAllocation, saveAllocation } from "@/features/research/allocation-store";
import { serialize } from "@/features/research/store";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) { return Response.json({ error: error instanceof Error ? error.message : "Konfigurasi tidak dapat diproses." }, { status: error instanceof ResearchAccessError ? 401 : 400, headers }); }
export async function GET(request: Request) {
  try { authorizeResearchRequest(request); return Response.json(await readAllocation(), { headers }); }
  catch (error) { return failure(error); }
}
export async function PUT(request: Request) {
  try {
    requireSameOrigin(request); authorizeResearchRequest(request);
    const text = await request.text(); if (text.length > 1000000) throw new Error("Konfigurasi terlalu besar.");
    const body = JSON.parse(text);
    return Response.json(await serialize(() => saveAllocation(body.manifest, body.expectedDigest)), { headers });
  } catch (error) { return failure(error); }
}
