// Tests of the no-test-timing lint rule: a valid and an invalid case per pattern.
//
//   node tools/eslint-rules/no-test-timing.test.mjs
import { describe, it } from "node:test";

import { RuleTester } from "eslint";

import rule from "./no-test-timing.mjs";

RuleTester.describe = describe;
RuleTester.it = it;
RuleTester.itOnly = it.only;

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2024, sourceType: "module" } });
const clock = { messageId: "clock" };
const sleep = { messageId: "sleep" };
const timeout = { messageId: "timeout" };
const frames = { messageId: "frames" };
const pageTimer = { messageId: "pageTimer" };
const waitBudget = { messageId: "waitBudget" };
const deadline = { messageId: "deadline" };
const FRAMES_HELPER = "async function frames(count) { for (let i = 0; i < count; i++) { await nextFrame(); } }";

tester.run("no-test-timing", rule, {
    valid: [
        // Wall-clock values that are not asserted on, and assertions on counted work.
        "const t0 = performance.now(); run(); console.log(performance.now() - t0);",
        "expect(visits).toBeLessThan(500);",
        "assert(count < 10);",
        "expect(record.createdAt).toBe(Date.now());",
        "const before = Date.now(); const e = emit(); assert.ok(e.timestamp >= before);",
        "const before = Date.now(); const r = retry(); expect(r.until).toBeGreaterThanOrEqual(before + 300);",
        "const dir = `run-${Date.now()}`; const w = new Writer(dir); expect(w.size).toBeGreaterThan(0);",
        "function f() { const t = Date.now(); } function g(t) { expect(t).toBeLessThan(5); }",
        // Waiting on a condition, and zero-delay yields.
        "await expect.poll(() => ready()).toBe(true);",
        "await vi.waitFor(() => assert(done));",
        "await new Promise((r) => setTimeout(r, 0));",
        "await new Promise((r) => setTimeout(r));",
        "await new Promise((r) => requestAnimationFrame(r));",
        "await new Promise((r) => emitter.once('done', r));",
        "await sleep(ms => ms);",
        "await wait('selector');",
        "setTimeout(() => fire(), 100);",
        "vi.advanceTimersByTime(1000);",
        "queue.run(async (ctx) => { ctx.progress(50); await new Promise((r) => setTimeout(r, 10)); });",
        "const op = vi.fn(async () => { await sleep(20); });",
        "await sleepUntil(1000);",
        // Tests and hooks without a timeout, and other options.
        "it('x', () => {});",
        "it('x', async () => {}, { retry: 2 });",
        "test.each([[1, 2]])('x %i', (a, b) => {});",
        "describe('x', () => {});",
        "beforeEach(() => {});",
        "it('x', runCase);",
        "vi.setConfig({ restoreMocks: true });",
        "window.setTimeout(() => {}, 10);",
        "expect(locator).toBeVisible();",
        // Options that are no deadline, and timeouts of things that are not waits.
        "await screen.findByRole('button', { name: 'Go' });",
        "await locator.click({ force: true });",
        "configure({ asyncUtilTimeout: WAIT_GUARD_MS });",
        // A timeout option of the code under test is what the test checks.
        "const { notifier } = make({ timeoutMs: 300 });",
        "const reply = await runGraphviz(job, { timeoutMs: 1 });",
        "spawnSync(cmd, args, { timeout: TEST_GUARD_MS });",
        "const config = { test: { testTimeout: TEST_GUARD_MS, expect: { poll: { timeout: WAIT_GUARD_MS } } } };",
        "await vi.waitFor(() => done(), { timeout: guard.WAIT_GUARD_MS });",
        "const before = Date.now(); const e = emit(); if (e.at < before) { fail(); }",
        // An animation's progress, and work that simulates the code under test, are not deadlines.
        "const start = performance.now(); function step() { const p = Math.min((performance.now() - start) / 300, 1); if (p < 1) { requestAnimationFrame(step); } } step();",
        "defineAlgorithm({ nodes: () => { const end = performance.now() + 300; while (performance.now() < end) {} return []; } });",
        "expect(tx).toEqual({ timeout: 5000 });",
        "expect(spy).toHaveBeenCalledWith({ timeout: 5000 });",
        "await expect.poll(() => x(), { message: 'x' }).toBe(1);",
        "regex.test(input, 5);",
        // One animation frame is a yield; frames counted by the work they carry are counted work.
        "await nextFrame(); expect(count).toBe(1);",
        "await nextFrame(); click(); await nextFrame();",
        "while (updates() < target) { await nextFrame(); }",
        "for (let i = 0; i < 5; i++) { scene.render(); await nextFrame(); }",
        "for (let i = 0; i < steps.length; i++) { await nextFrame(); }",
        "for (let i = 0; i < 1; i++) { await nextFrame(); }",
        "await new Promise((r) => requestAnimationFrame(() => r()));",
        `${FRAMES_HELPER} await frames(1);`,
        `${FRAMES_HELPER} await frames(n);`,
        "async function frames(element) { await element.waitForStableFrame(); } await frames(el);",
        "async function frames(el, count = 3) { await new Promise((r) => { let d = 0; el.on('render', () => ++d >= count && r()); }); } await frames(el);",
        "const op = vi.fn(async () => { for (let i = 0; i < 5; i++) await nextFrame(); });",
        "const nextFrame = () => fetchFrame(); await nextFrame(); await nextFrame();",
        // Timers in the page that only yield, and timers in the test itself.
        "await page.evaluate(() => new Promise((r) => globalThis.setTimeout(r, 0)));",
        "await page.evaluate(() => { setTimeout(() => go()); });",
        "await page.addInitScript(() => { globalThis.ready = true; });",
        "await page.waitForFunction((n) => globalThis.pops >= n, 3);",
        "setTimeout(() => page.evaluate(() => go()), 100);",
        { code: "await nextFrame(); await nextFrame();", options: [{ frameWaits: false }] },
    ],
    invalid: [
        // 1. Asserting on wall-clock time.
        {
            code: "const t0 = performance.now(); run(); const elapsed = performance.now() - t0; expect(elapsed).toBeLessThan(500);",
            errors: [clock],
        },
        { code: "const t0 = Date.now(); run(); assert(Date.now() - t0 < 500);", errors: [clock] },
        { code: "const t = new Date().getTime(); run(); assert.ok(new Date().getTime() - t <= 10);", errors: [clock] },
        {
            code: "const s = process.hrtime.bigint(); expect(process.hrtime.bigint() - s).toBeGreaterThan(0n);",
            errors: [clock],
        },
        {
            code: "const a = time(() => Date.now()); let b; b = performance.now(); expect(b / 2 < 3).toBe(true);",
            errors: [clock],
        },
        {
            code: "const fast = performance.now(); const slow = performance.now(); assert.isBelow(fast / slow, 2);",
            errors: [clock],
        },
        // 2. Fixed sleeps.
        { code: "await page.waitForTimeout(500);", errors: [sleep] },
        { code: "it('x', async () => { await sleep(100); });", errors: [sleep] },
        { code: "beforeEach(async () => { await page.waitForTimeout(100); });", errors: [sleep] },
        { code: "async function settle() { await delay(500); }", errors: [sleep] },
        { code: "await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));", errors: [sleep] },
        { code: "await new Promise((resolve) => setTimeout(resolve, 100));", errors: [sleep] },
        { code: "await new Promise((resolve) => { setTimeout(resolve, SETTLE_MS); });", errors: [sleep] },
        { code: "await new Promise((r) => window.setTimeout(r, 50));", errors: [sleep] },
        { code: "await setTimeout(100);", errors: [sleep] },
        { code: "await sleep(1_000);", errors: [sleep] },
        { code: "await helpers.delay(2 * 100);", errors: [sleep] },
        { code: "await nap(10);", options: [{ sleepNames: ["nap"] }], errors: [sleep] },
        // 3. Per-test timeouts.
        { code: "it('x', async () => {}, 60_000);", output: "it('x', async () => {});", errors: [timeout] },
        { code: "it('x', { timeout: 1000 }, async () => {});", output: "it('x', async () => {});", errors: [timeout] },
        { code: "it('x', async () => {}, { timeout: 1000 });", output: "it('x', async () => {});", errors: [timeout] },
        {
            code: "it.skipIf(ci)('x', async () => {}, TIMEOUT);",
            output: "it.skipIf(ci)('x', async () => {});",
            errors: [timeout],
        },
        {
            code: "test.each([1])('x %i', (n) => {}, 5000);",
            output: "test.each([1])('x %i', (n) => {});",
            errors: [timeout],
        },
        { code: "describe('x', () => {}, 30000);", output: "describe('x', () => {});", errors: [timeout] },
        { code: "beforeAll(async () => {}, 30000);", output: "beforeAll(async () => {});", errors: [timeout] },
        {
            code: "test.beforeEach(async () => {}, 30000);",
            output: "test.beforeEach(async () => {});",
            errors: [timeout],
        },
        { code: "it('x', runCase, 5000);", output: "it('x', runCase);", errors: [timeout] },
        { code: "vi.setConfig({ testTimeout: 60000 });", errors: [timeout] },
        { code: "function f() { this.timeout(5000); }", errors: [timeout] },
        { code: "test.setTimeout(120000);", errors: [timeout] },
        // 4. Waits counted in animation frames (#2398, #2446, #2466).
        { code: "for (let i = 0; i < 3; i++) { await nextFrame(); }", errors: [frames] },
        { code: "for (let i = 0; i < 30; i++) await new Promise((r) => requestAnimationFrame(r));", errors: [frames] },
        { code: "const N = 10; for (let i = 1; i <= N; i++) { await nextFrame(); }", errors: [frames] },
        { code: `${FRAMES_HELPER} await frames(30); expect(updates).toBe(30);`, errors: [frames] },
        {
            code: "async function frames(frames = 3) { for (let i = 0; i < frames; i++) { await nextFrame(); } } await frames();",
            errors: [frames],
        },
        {
            code: "const skip = async (n) => { for (let f = 0; f < n; f++) { await new Promise((r) => window.requestAnimationFrame(r)); } }; it('x', async () => { await skip(6); });",
            errors: [frames],
        },
        { code: "await nextFrame(); await nextFrame();", errors: [frames] },
        {
            code: "function tick() { return new Promise((r) => requestAnimationFrame(() => r())); } await tick(); await tick();",
            errors: [frames],
        },
        { code: "await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));", errors: [frames] },
        {
            code: "async function twoFrames() { await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))); } await twoFrames();",
            errors: [frames],
        },
        // 6. Time budgets on waits.
        {
            code: "await waitFor(() => expect(x).toBe(1), { timeout: 2000 });",
            output: "await waitFor(() => expect(x).toBe(1));",
            errors: [waitBudget],
        },
        {
            code: "await canvas.findByRole('button', {}, { timeout: 5000 });",
            output: "await canvas.findByRole('button', {});",
            errors: [waitBudget],
        },
        {
            code: "await canvas.findByRole('button', { name: 'Go' }, storyWaitOptions(5000));",
            output: "await canvas.findByRole('button', { name: 'Go' });",
            errors: [waitBudget],
        },
        {
            code: "await vi.waitFor(() => done(), { timeout: 5000, interval: 50 });",
            output: "await vi.waitFor(() => done());",
            errors: [waitBudget],
        },
        {
            code: "await vi.waitUntil(() => done(), 5000);",
            output: "await vi.waitUntil(() => done());",
            errors: [waitBudget],
        },
        {
            code: "await expect.poll(() => x(), { timeout: 3000, message: 'x' }).toBe(1);",
            output: "await expect.poll(() => x(), { message: 'x' }).toBe(1);",
            errors: [waitBudget],
        },
        {
            code: "await expect.poll(() => x(), { message: 'x', timeout: 3000 }).toBe(1);",
            output: "await expect.poll(() => x(), { message: 'x' }).toBe(1);",
            errors: [waitBudget],
        },
        {
            code: "await expect.element(el, { timeout: 3000 }).toBeVisible();",
            output: "await expect.element(el).toBeVisible();",
            errors: [waitBudget],
        },
        {
            code: "await expect(locator).toBeVisible({ timeout: 5000 });",
            output: "await expect(locator).toBeVisible();",
            errors: [waitBudget],
        },
        { code: "await locator.click({ timeout: 500 });", output: "await locator.click();", errors: [waitBudget] },
        {
            code: "await page.waitForSelector('x', { timeout: 10000 });",
            output: "await page.waitForSelector('x');",
            errors: [waitBudget],
        },
        {
            code: "await page.waitForFunction(() => ready, null, { timeout: 10000 });",
            output: "await page.waitForFunction(() => ready, null);",
            errors: [waitBudget],
        },
        {
            code: "await expect(async () => check()).toPass({ timeout: 9000 });",
            output: "await expect(async () => check()).toPass();",
            errors: [waitBudget],
        },
        {
            code: "const WAIT = { timeout: 2000 }; await vi.waitFor(() => done(), WAIT);",
            output: null,
            errors: [waitBudget],
        },
        // 7. Any other local deadline: an option, a helper's default, a config value, a deadline loop.
        {
            code: "execFile(cmd, args, { timeout: 60_000 }, done);",
            output: "execFile(cmd, args, done);",
            errors: [deadline],
        },
        {
            code: "await el.waitForStableFrame({ timeoutMs: 1 });",
            output: "await el.waitForStableFrame();",
            errors: [deadline],
        },
        { code: "await settle(page, { pollIntervalMs: 50 });", output: "await settle(page);", errors: [deadline] },
        { code: "configure({ asyncUtilTimeout: 5000 });", errors: [deadline] },
        { code: "async function until(fn, timeoutMs = 5000) { await fn(); }", errors: [deadline] },
        { code: "const until = async (fn, { timeout = 5000 } = {}) => fn();", errors: [deadline] },
        { code: "export default { test: { testTimeout: 0 } };", errors: [deadline] },
        { code: "defineConfig({ test: { projects: [{ test: { hookTimeout: 60_000 } }] } });", errors: [deadline] },
        { code: "const deadline = Date.now() + 1000; while (Date.now() < deadline) { step(); }", errors: [deadline] },
        {
            code: "const start = performance.now(); while (!ready()) { if (performance.now() - start > 5000) throw new Error('x'); await tick(); }",
            errors: [deadline],
        },
        // 5. Timers in code handed to the page (#2422, #2447).
        {
            code: "await page.evaluate(() => new Promise((resolve) => { history.back(); setTimeout(() => history.back(), 50); setTimeout(() => { history.forward(); resolve(); }, 150); }));",
            errors: [pageTimer, pageTimer],
        },
        { code: "await page.addInitScript(() => { globalThis.setTimeout(fail, 1500); });", errors: [pageTimer] },
        {
            code: "function install() { setTimeout(() => answer(), RETRY_MS); } await page.addInitScript(install);",
            errors: [pageTimer],
        },
        { code: "await page.$eval('#x', (el) => setTimeout(() => el.click(), 10));", errors: [pageTimer] },
    ],
});
