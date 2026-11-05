// Compile only the FER TypeScript modules in memory; no test dependency or emitted files.
/* eslint-disable @typescript-eslint/no-require-imports -- CommonJS loader exercises TypeScript without another runtime dependency. */
const { readFileSync } = require("node:fs");
const Module = require("node:module");
const ts = require("typescript");
const { test, afterEach } = require("node:test");
const assert = require("node:assert/strict");

Module._extensions[".ts"] = (module, filename) => {
  module._compile(ts.transpileModule(readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, filename);
};
process.env.NEXT_PUBLIC_FER_INTERVAL_MS = "500";
process.env.NEXT_PUBLIC_FER_TIMEOUT_MS = "1000";
const { EMOTIONS } = require("../src/features/fer/types.ts");
const { parsePrediction } = require("../src/features/fer/client.ts");
const { FERSession } = require("../src/features/fer/session.ts");

const metadata = { schema_version: 1, model: "enet_b0_8_best_vgaf", detector: "haar", timestamp: new Date().toISOString(), latency_ms: 10, face_count: 1 };
const scores = Object.fromEntries(EMOTIONS.map((label) => [label, label === "Neutral" ? 1 : 0]));
const ok = { ...metadata, status: "ok", face_detected: true, emotion: "Neutral", confidence: 1, probabilities: scores };
const noFace = { ...metadata, status: "no_face", face_count: 0, face_detected: false, emotion: null, confidence: null, probabilities: null };
const health = { status: "ready", schema_version: 1, model: metadata.model, labels: EMOTIONS };
const tick = () => new Promise((resolve) => setImmediate(resolve));
const deferred = () => { let resolve; const promise = new Promise((done) => { resolve = done; }); return { promise, resolve }; };
const sessions = [];
const originalFetch = global.fetch;
const originalNavigator = Object.getOwnPropertyDescriptor(global, "navigator");
const originalDocument = global.document;

function setup(getUserMedia, fetchPrediction = async () => Response.json(ok)) {
  Object.defineProperty(global, "navigator", { configurable: true, value: { mediaDevices: { getUserMedia } } });
  global.document = { createElement: () => ({ getContext: () => ({ drawImage() {}, clearRect() {} }), toBlob: (callback) => callback(new Blob(["jpeg"], { type: "image/jpeg" })) }) };
  global.fetch = async (url, options) => url.endsWith("/health") ? Response.json(health) : fetchPrediction(options);
  const session = new FERSession({ courseId: "course", materialId: "material" });
  sessions.push(session);
  return session;
}

function camera() {
  let stopped = 0;
  const track = { onended: null, stop() { stopped++; } };
  return { track, stopped: () => stopped, stream: { getTracks: () => [track], getVideoTracks: () => [track] },
    video: { srcObject: null, play: async () => {}, pause() {}, readyState: 4, videoWidth: 640 } };
}

afterEach(() => {
  sessions.splice(0).forEach((session) => session.stop());
  global.fetch = originalFetch;
  global.document = originalDocument;
  if (originalNavigator) Object.defineProperty(global, "navigator", originalNavigator);
  else delete global.navigator;
});

test("response contract accepts probabilities and keeps no_face separate from Neutral", () => {
  assert.deepEqual(parsePrediction(ok), ok);
  assert.deepEqual(parsePrediction(noFace), noFace);
  for (const value of [null, { ...ok, schema_version: 2 }, { ...ok, confidence: NaN }, { ...ok, emotion: "Sadness" },
    { ...ok, probabilities: { Neutral: 1 } }, { ...noFace, emotion: "Neutral" }, { ...ok, latency_ms: -1 },
    { ...noFace, face_count: 1 }, { ...ok, probabilities: { ...scores, Anger: 1 } }]) {
    assert.throws(() => parsePrediction(value));
  }
});

test("late camera permission after stop releases tracks without starting inference", async () => {
  const permission = deferred();
  const cam = camera();
  let requests = 0;
  const session = setup(() => permission.promise, async () => { requests++; return Response.json(ok); });
  const started = session.start(cam.video);
  await tick();
  session.stop();
  permission.resolve(cam.stream);
  await started;
  assert.equal(cam.stopped(), 1);
  assert.equal(requests, 0);
  assert.equal(session.getSnapshot().status, "inactive");
});

test("stop aborts inference, clears prediction, and ignores a late response", async () => {
  const cam = camera();
  const response = deferred();
  let requestSignal;
  const session = setup(async () => cam.stream, async (options) => { requestSignal = options.signal; return response.promise; });
  await session.start(cam.video);
  await tick();
  session.stop();
  assert.equal(requestSignal.aborted, true);
  response.resolve(Response.json(ok));
  await tick();
  assert.equal(session.getSnapshot().status, "inactive");
  assert.equal(session.getSnapshot().sample, null);
  assert.equal(cam.stopped(), 1);
  assert.equal(cam.video.srcObject, null);
});

test("inference is serial and no-face response replaces the previous emotion", async () => {
  const cam = camera();
  const second = deferred();
  let requests = 0;
  const session = setup(async () => cam.stream, async () => { requests++; return requests === 1 ? Response.json(ok) : second.promise; });
  await session.start(cam.video);
  await tick();
  assert.equal(session.getSnapshot().sample.prediction.emotion, "Neutral");
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(requests, 2); // Second request pending longer than the sampling interval.
  second.resolve(Response.json(noFace));
  await tick();
  const sample = session.getSnapshot().sample;
  assert.equal(sample.prediction.emotion, null);
  assert.equal(sample.sequence, 2);
  assert.equal(sample.materialId, "material");
});

test("denied camera permission produces a recoverable error", async () => {
  const cam = camera();
  const session = setup(async () => { throw new DOMException("Denied", "NotAllowedError"); });
  await session.start(cam.video);
  assert.equal(session.getSnapshot().status, "error");
  assert.match(session.getSnapshot().error, /Izin kamera ditolak/);
});

test("service failure stops camera and clears stale samples", async () => {
  const cam = camera();
  const session = setup(async () => cam.stream, async () => { throw new TypeError("Network failed"); });
  await session.start(cam.video);
  await tick();
  assert.equal(session.getSnapshot().status, "error");
  assert.match(session.getSnapshot().error, /tidak terhubung/);
  assert.equal(cam.stopped(), 1);
  assert.equal(session.getSnapshot().sample, null);
});

test("timeout stops the camera", async () => {
  const cam = camera();
  const session = setup(async () => cam.stream, (options) => new Promise((resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
  }));
  await session.start(cam.video);
  await new Promise((resolve) => setTimeout(resolve, 1100));
  assert.equal(session.getSnapshot().status, "error");
  assert.match(session.getSnapshot().error, /batas waktu/);
  assert.equal(cam.stopped(), 1);
});

test("camera track ending stops the session", async () => {
  const cam = camera();
  const session = setup(async () => cam.stream);
  await session.start(cam.video);
  cam.track.onended();
  assert.equal(session.getSnapshot().status, "error");
  assert.equal(cam.stopped(), 1);
});
