import { enterAllocatedStudy, serialize } from "@/features/research/store";
import { requireSameOrigin } from "@/features/research/access";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const text = await request.text(); if (text.length > 3000) throw new Error("Permintaan masuk terlalu besar.");
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("Permintaan masuk tidak valid.");
    const token = request.headers.get("Authorization")?.replace(/^Bearer /, "") ?? "";
    return Response.json(await serialize(() => enterAllocatedStudy(body, token)), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    const diskFailure = Boolean(code && ["ENOSPC", "EACCES", "EPERM", "EIO", "EROFS"].includes(code));
    return Response.json({ error: diskFailure ? "Sesi belum dapat disimpan. Hubungi peneliti dan coba kembali." : error instanceof Error ? error.message : "Tidak dapat masuk." }, { status: diskFailure ? 503 : 400, headers: { "Cache-Control": "no-store" } });
  }
}
