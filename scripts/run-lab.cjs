/* eslint-disable @typescript-eslint/no-require-imports -- Local process launcher without dependencies. */
const { spawn, spawnSync } = require("node:child_process");
const { existsSync, readFileSync, createReadStream } = require("node:fs");
const { createHash } = require("node:crypto");
const { join, resolve } = require("node:path");
const { createServer } = require("node:net");
const { setTimeout: delay } = require("node:timers/promises");
const root = resolve(__dirname, "..");
const development = process.argv.includes("--dev");
const python = join(root, "services", "fer", ".venv", "Scripts", "python.exe");
const model = join(root, "services", "fer", "models", "enet_b0_8_best_vgaf.onnx");
const children = [];
let stopping = false;
function stop() {
  if (stopping) return; stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === "win32") spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore", windowsHide: true });
    else child.kill("SIGTERM");
  }
}
process.on("SIGINT", () => { stop(); process.exitCode = 130; });
process.on("SIGTERM", () => { stop(); process.exitCode = 143; });
process.on("exit", stop);
function assertPort(port) {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", () => reject(new Error("Port " + port + " sedang digunakan. Hentikan layanan lama atau gunakan startup manual.")));
    server.listen(port, "127.0.0.1", () => server.close(resolvePort));
  });
}
function hashFile(file) {
  return new Promise((resolveHash, reject) => { const hash = createHash("sha256"); const stream = createReadStream(file); stream.on("data", (chunk) => hash.update(chunk)); stream.on("error", reject); stream.on("end", () => resolveHash(hash.digest("hex"))); });
}
function launch(program, args, env) {
  const child = spawn(program, args, { cwd: root, env: { ...process.env, ...env }, stdio: "inherit", windowsHide: true });
  children.push(child);
  child.on("error", (error) => { if (!stopping) { process.stderr.write(error.message + "\n"); process.exitCode = 1; stop(); } });
  child.on("exit", (code) => { if (!stopping) { process.stderr.write("Salah satu layanan berhenti (kode " + code + ").\n"); process.exitCode = code || 1; stop(); } });
  return child;
}
async function main() {
  if (!existsSync(python) || !existsSync(model)) throw new Error("Environment/model prototipe belum siap. Jalankan setup-lab.ps1 pada PC ini terlebih dahulu.");
  if (!development && !existsSync(join(root, ".next", "BUILD_ID"))) throw new Error("Build LMS belum tersedia. Jalankan pnpm.cmd build atau gunakan pnpm.cmd lab:dev.");
  const profileRoot = process.env.USERPROFILE;
  if (!profileRoot) throw new Error("Akun Windows tidak menyediakan USERPROFILE.");
  const cacheModel = join(profileRoot, ".emotiefflib", "enet_b0_8_best_vgaf.onnx");
  if (!existsSync(cacheModel) || (await hashFile(model)) !== (await hashFile(cacheModel))) throw new Error("Model paket dan cache akun Windows belum sama. Jalankan setup-lab.ps1 pada akun ini.");
  const manifest = JSON.parse(readFileSync(join(root, "config", "research-allocation.json"), "utf8").replace(/^\uFEFF/, ""));
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.participants)) throw new Error("Konfigurasi alokasi tidak valid.");
  await Promise.all([assertPort(8000), assertPort(3000)]);
  if (stopping) return;
  launch(python, ["-m", "uvicorn", "app:app", "--app-dir", "services/fer", "--host", "127.0.0.1", "--port", "8000"], { FER_ALLOWED_ORIGINS: "http://localhost:3000,http://127.0.0.1:3000" });
  let ready = false;
  for (let attempt = 0; attempt < 90 && !stopping; attempt++) {
    try { const response = await fetch("http://127.0.0.1:8000/health", { signal: AbortSignal.timeout(1500) }); const data = await response.json(); ready = response.ok && data.status === "ready" && data.model === "enet_b0_8_best_vgaf"; } catch { /* Wait for local model startup. */ }
    if (ready) break;
    await delay(1000);
  }
  if (stopping) return;
  if (!ready) throw new Error("FER belum siap setelah menunggu startup. Periksa keluaran layanan di terminal.");
  launch(process.execPath, [join(root, "node_modules", "next", "dist", "bin", "next"), development ? "dev" : "start", "--hostname", "127.0.0.1", "--port", "3000"], {});
  process.stdout.write("Buka http://localhost:3000 — Ctrl+C menghentikan kedua layanan.\n");
}
main().catch((error) => { if (!stopping) { process.stderr.write(error.message + "\n"); process.exitCode = 1; stop(); } });
