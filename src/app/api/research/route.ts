import { createStudy, endStudy, exportStudy, getParticipantStudy, listStudies, mutateStudy, readiness, recoverStudy, serialize } from "@/features/research/store";
import { authorizeResearchRequest, ResearchAccessError } from "@/features/research/access";
import { exportCSV } from "@/features/research/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
function failure(error: unknown) {
  const code = (error as NodeJS.ErrnoException).code;
  const storageFailure = code && ["EACCES", "EPERM", "ENOSPC", "EIO", "EROFS"].includes(code);
  return Response.json({ error: storageFailure ? "Penyimpanan disk gagal. Data belum diakui tersimpan; periksa ruang dan izin folder." : error instanceof Error ? error.message : "Operasi gagal." }, { status: storageFailure ? 503 : error instanceof ResearchAccessError ? 401 : 400, headers });
}
function token(request: Request) { return request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? ""; }
function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new Error("Origin permintaan ditolak.");
}
export async function GET(request: Request) {
  try {
    const url = new URL(request.url); const id = url.searchParams.get("id"); const format = url.searchParams.get("format");
    if (id && !format) return Response.json(await getParticipantStudy(id, token(request)), { headers });
    authorizeResearchRequest(request);
    if (!id) return Response.json({ readiness: await readiness(), sessions: await serialize(listStudies) }, { headers });
    const data = await serialize(() => exportStudy(id));
    const body = format === "json" ? JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2) : exportCSV(data.study, format ?? "blocks", data.batches.flatMap((batch) => batch.events));
    return new Response(body, { headers: { ...headers, "Content-Type": format === "json" ? "application/json; charset=utf-8" : "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="study-${id}-${format}.${format === "json" ? "json" : "csv"}"` } });
  } catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const text = await request.text(); if (text.length > 2000000) throw new Error("Permintaan terlalu besar.");
    const body = JSON.parse(text) as Record<string, unknown>;
    const action = String(body.action);
    if (["CREATE", "RECOVER", "END"].includes(action)) {
      authorizeResearchRequest(request);
      if (action === "CREATE") return Response.json(await serialize(() => createStudy(body)), { headers });
      if (action === "RECOVER") return Response.json(await serialize(() => recoverStudy(String(body.id))), { headers });
      return Response.json(await serialize(() => endStudy(String(body.id))), { headers });
    }
    const result = await serialize(() => mutateStudy(String(body.id), token(request), String(body.operationId), action, body));
    return Response.json(result, { headers });
  } catch (error) { return failure(error); }
}
