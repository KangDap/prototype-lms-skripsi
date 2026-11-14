import "server-only";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export const RESEARCH_COOKIE = "lms-research-access";
export const RESEARCH_ACCESS_SECONDS = 8 * 60 * 60;
export class ResearchAccessError extends Error {}
function secret() {
  const value = process.env.RESEARCHER_KEY;
  if (!value) throw new ResearchAccessError("Password pengaturan belum ditetapkan. Isi RESEARCHER_KEY di .env.local, lalu restart LMS.");
  return value;
}
function equal(a: string, b: string) {
  const first = createHmac("sha256", "research-access-compare").update(a).digest();
  const second = createHmac("sha256", "research-access-compare").update(b).digest();
  return timingSafeEqual(first, second);
}
export function authorizeResearcher(password: string | null) {
  if (!password || !equal(password, secret())) throw new ResearchAccessError("Password pengaturan salah.");
}
function signature(value: string) { return createHmac("sha256", secret()).update(value).digest("hex"); }
export function createResearchAccess() {
  const payload = `${Date.now() + RESEARCH_ACCESS_SECONDS * 1000}.${randomBytes(24).toString("hex")}`;
  return `${payload}.${signature(payload)}`;
}
export function hasResearchAccess(request: Request) {
  if (!process.env.RESEARCHER_KEY) return false;
  const value = request.headers.get("cookie")?.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${RESEARCH_COOKIE}=`))?.slice(RESEARCH_COOKIE.length + 1);
  if (!value) return false;
  const [expires, nonce, supplied] = value.split(".");
  if (!/^\d+$/.test(expires ?? "") || !/^[a-f0-9]{48}$/.test(nonce ?? "") || !/^[a-f0-9]{64}$/.test(supplied ?? "") || Number(expires) <= Date.now()) return false;
  return equal(supplied, signature(`${expires}.${nonce}`));
}
export function authorizeResearchRequest(request: Request) {
  if (hasResearchAccess(request)) return;
  authorizeResearcher(request.headers.get("x-researcher-key"));
}
export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) throw new ResearchAccessError("Origin permintaan ditolak.");
}
