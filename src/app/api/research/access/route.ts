import { authorizeResearcher, createResearchAccess, hasResearchAccess, RESEARCH_ACCESS_SECONDS, RESEARCH_COOKIE, requireSameOrigin } from "@/features/research/access";
import { cookies } from "next/headers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "no-store" };
export async function GET(request: Request) {
  return Response.json({ unlocked: hasResearchAccess(request), configured: Boolean(process.env.RESEARCHER_KEY) }, { headers });
}
export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await request.json();
    authorizeResearcher(typeof body.password === "string" ? body.password : null);
    const jar = await cookies();
    jar.set(RESEARCH_COOKIE, createResearchAccess(), { httpOnly: true, sameSite: "strict", path: "/", secure: new URL(request.url).protocol === "https:", maxAge: RESEARCH_ACCESS_SECONDS });
    return Response.json({ unlocked: true, configured: true }, { headers });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "Akses ditolak." }, { status: 401, headers }); }
}
export async function DELETE(request: Request) {
  try {
    requireSameOrigin(request);
    (await cookies()).delete(RESEARCH_COOKIE);
    return Response.json({ unlocked: false }, { headers });
  } catch { return Response.json({ error: "Akses ditolak." }, { status: 401, headers }); }
}
