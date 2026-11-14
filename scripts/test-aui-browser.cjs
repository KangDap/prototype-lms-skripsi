/* eslint-disable @typescript-eslint/no-require-imports -- Native Node/CDP smoke test; no browser testing dependency. */
// Start Next.js and a dedicated Chromium with remote debugging before running.
// AUI_CDP_URL=http://127.0.0.1:9335 AUI_TEST_URL=http://localhost:3001
const assert = require("node:assert/strict");
const { writeFileSync, mkdirSync } = require("node:fs");
const { join } = require("node:path");
const { setTimeout: delay } = require("node:timers/promises");

async function main() {
  const cdpUrl = process.env.AUI_CDP_URL || "http://127.0.0.1:9335";
  const appUrl = process.env.AUI_TEST_URL || "http://localhost:3001";
  const target = await (await fetch(`${cdpUrl}/json/new?about:blank`, { method: "PUT" })).json();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  const pending = new Map();
  const errors = [];
  let nextId = 0;
  let budgetExpired = null;
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const task = pending.get(message.id);
      if (!task) return;
      pending.delete(message.id);
      clearTimeout(task.timeout);
      if (message.error) task.reject(new Error(JSON.stringify(message.error))); else task.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") errors.push(message.params.exceptionDetails.text);
    if (message.method === "Emulation.virtualTimeBudgetExpired") budgetExpired?.();
  };
  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const id = ++nextId;
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 20000);
    pending.set(id, { resolve, reject: (error) => reject(new Error(`${method}: ${error.message}`)), timeout });
    socket.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
  };
  const settle = () => delay(250);
  const click = async (text) => {
    await evaluate(`(() => { const button = [...document.querySelectorAll('button')].find(item => item.textContent.trim() === ${JSON.stringify(text)}); if (!button || button.disabled) throw Error('Button unavailable: ' + ${JSON.stringify(text)}); button.click(); })()`);
    await settle();
  };
  const select = async (label, value) => {
    await evaluate(`(() => { const element = document.querySelector('select[aria-label="${label}"]'); element.value = ${JSON.stringify(value)}; element.dispatchEvent(new Event('change', { bubbles: true })); })()`);
    await settle();
  };
  const advance = async (milliseconds) => {
    const finished = new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Virtual time budget expired without event")), 20000);
      budgetExpired = () => { clearTimeout(timeout); resolve(); };
    });
    await send("Emulation.setVirtualTimePolicy", { policy: "advance", budget: milliseconds, maxVirtualTimeTaskStarvationCount: 100 });
    await finished;
    budgetExpired = null;
    await settle();
  };
  const state = () => evaluate(`(() => ({
    mode: document.querySelector('[data-aui-mode]')?.dataset.auiMode,
    phase: document.querySelector('[data-aui-phase]')?.dataset.auiPhase,
    sidebar: document.querySelector('[data-slot="sidebar"]')?.dataset.state,
    help: !!document.querySelector('aside[aria-label="Bantuan kontekstual"]') && !document.querySelector('aside[aria-label="Bantuan kontekstual"]').hidden,
    offer: !!document.querySelector('section[aria-label="Tawaran bantuan"]'),
    articleSame: window.__originalArticle === document.querySelector('article'),
    articleText: document.querySelector('article')?.textContent,
    debug: document.body.textContent.includes('Debug AUI'),
    scrollY: window.scrollY,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
  }))()`);
  const output = join(process.cwd(), ".next", "aui-browser-check");
  mkdirSync(output, { recursive: true });
  const results = [];
  try {
    await send("Page.enable");
    await send("Page.bringToFront");
    await send("Runtime.enable");
    await send("Emulation.setDeviceMetricsOverride", { width: 1365, height: 900, deviceScaleFactor: 1, mobile: false });
    await send("Page.navigate", { url: `${appUrl}/courses/literasi-data/materials/correlation-causation` });
    let ready = false;
    for (let i = 0; i < 100; i++) {
      ready = await evaluate(`!!document.querySelector('button') && !!document.querySelector('[data-aui-mode]') && ![...document.querySelectorAll('button')].find(item => item.textContent.trim() === 'Aktifkan FER')?.disabled`);
      if (ready) break;
      await delay(200);
    }
    assert.equal(ready, true, "Material page hydrated");
    await evaluate("void (window.__originalArticle = document.querySelector('article'))");
    const initial = await state();
    assert.equal(initial.mode, "DEFAULT");
    assert.equal(initial.sidebar, "expanded");
    assert.equal(initial.horizontalOverflow, false);
    const production = process.argv.includes("--production");
    const nonAdaptive = process.argv.includes("--non-adaptive");
    if (production || nonAdaptive) {
      assert.equal(initial.debug, false);
      if (nonAdaptive) assert.equal(await evaluate("document.body.textContent.includes('Nonaktifkan adaptasi')"), false);
      results.push("Research/production condition: DEFAULT, no debug, identical learning content");
    } else {
      assert.equal(initial.debug, true);
      await evaluate("[...document.querySelectorAll('details')].find(item => item.textContent.includes('Debug AUI')).open = true");
      await select("Sumber prediksi", "SIMULATION");
      await click("Mulai simulasi");
      await send("Emulation.setVirtualTimePolicy", { policy: "pause" });
      await evaluate("window.scrollTo(0, 200)");
      await advance(21000);
      const focused = await state();
      assert.equal(focused.mode, "FOCUS");
      assert.equal(focused.sidebar, "collapsed");
      assert.equal(focused.help, false);
      assert.equal(focused.articleSame, true);
      assert.equal(focused.articleText, initial.articleText);
      assert.equal(focused.offer, false);
      assert.ok(focused.scrollY > 0, "Focus must not reset reading scroll to the top");
      const screenshot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      writeFileSync(join(output, "focus.png"), Buffer.from(screenshot.data, "base64"));
      results.push("Two negative windows activate actual Focus layout without remounting/changing content or resetting scroll");
      await advance(40000);
      assert.equal((await state()).offer, true);
      await click("Tidak sekarang");
      await advance(20000);
      assert.equal((await state()).offer, false);
      await advance(20000);
      assert.equal((await state()).offer, true);
      await click("Tampilkan bantuan");
      const assisted = await state();
      assert.equal(assisted.mode, "ASSISTED");
      assert.equal(assisted.help, true);
      assert.equal(assisted.articleSame, true);
      assert.equal(assisted.articleText, initial.articleText);
      assert.equal(await evaluate("!!document.querySelector('aside[aria-label=\"Bantuan kontekstual\"] a[href$=\"/materials/sampling-bias\"]')"), true);
      results.push("Assistance is offered, dismissal is suppressed by cooldown, acceptance displays existing navigation");
      await select("Prediksi simulasi", "Neutral");
      await advance(41000);
      assert.equal((await state()).mode, "DEFAULT");
      assert.equal((await state()).sidebar, "expanded");
      assert.equal((await state()).articleSame, true);
      assert.ok((await state()).scrollY > 0, "Recovery must not reset reading scroll to the top");
      results.push("Persistent stable affect restores Default after recovery and preserves article");
      await select("Prediksi simulasi", "Anger");
      await advance(40000);
      assert.equal((await state()).mode, "FOCUS");
      await click("Kembali ke tampilan normal");
      await advance(20000);
      assert.equal((await state()).mode, "DEFAULT");
      await click("Nonaktifkan adaptasi");
      await advance(60000);
      assert.equal((await state()).mode, "DEFAULT");
      results.push("Manual override suppresses immediate retrigger; disabling adaptation holds Default");
      await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
      await settle();
      assert.equal((await state()).horizontalOverflow, false);
      assert.equal(await evaluate("!!document.querySelector('button[aria-label=\"Buka navigasi\"]')"), true);
      results.push("Mobile layout retains navigation and has no horizontal overflow");
    }
    // Observe the real export payload while preventing a file chooser/download side effect.
    await evaluate(`window.__exportedLogs = null; window.__createObjectURL = URL.createObjectURL; URL.createObjectURL = blob => { blob.text().then(text => { window.__exportedLogs = JSON.parse(text); }); return window.__createObjectURL(blob); }; HTMLAnchorElement.prototype.click = function() {};`);
    await evaluate("[...document.querySelectorAll('details')].find(item => item.textContent.includes('Catatan sesi dan ekspor')).open = true");
    await click("Akhiri sesi dan ekspor log");
    const exported = await evaluate("window.__exportedLogs");
    assert.ok(exported);
    assert.equal(exported.validation.every((item) => item.issues.length === 0), true);
    assert.equal(exported.sessions.every((session) => session.complete), true);
    assert.equal(exported.sessions.every((session) => session.events.every((event) => event.source === session.source && event.sessionId === session.sessionId)), true);
    results.push("Final JSON export validates, closes all sessions, and separates REAL from SIMULATION");
    assert.deepEqual(errors, [], "No uncaught browser exception");
    const reportName = production || nonAdaptive ? "research-result.json" : "adaptive-result.json";
    writeFileSync(join(output, reportName), JSON.stringify({ results, sessionCount: exported.sessions.length, errors }, null, 2));
    console.log(JSON.stringify({ passed: results.length, results, errors }, null, 2));
  } catch (error) {
    console.error(await evaluate("document.body.innerText"));
    throw error;
  } finally {
    await send("Page.close").catch(() => {});
    socket.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
