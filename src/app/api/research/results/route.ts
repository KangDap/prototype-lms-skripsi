import { authorizeResearchRequest, ResearchAccessError } from "@/features/research/access";
import { getResultsDetail, getResultsOverview, serialize } from "@/features/research/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store, private" };
export async function GET(request: Request) {
  try {
    authorizeResearchRequest(request);
    const id = new URL(request.url).searchParams.get("id");
    if (id) return Response.json(await serialize(() => getResultsDetail(id)), { headers });
    return Response.json(await serialize(getResultsOverview), { headers });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    return Response.json({ error: error instanceof ResearchAccessError ? error.message : "Hasil tersimpan belum dapat dibaca. Periksa folder data dan coba kembali." },
      { status: error instanceof ResearchAccessError ? 401 : code === "ENOENT" ? 404 : 500, headers });
  }
}
