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

tester.run("no-test-timing", rule, {
    valid: [
        // Wall-clock values that are not asserted on, and assertions on counted work.
        "const t0 = performance.now(); run(); console.log(performance.now() - t0);",
        "const deadline = Date.now() + 1000; while (Date.now() < deadline) { step(); }",
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
        "expect(locator).toBeVisible({ timeout: 5000 });",
        "regex.test(input, 5);",
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
        { code: "it('x', async () => {}, 60_000);", errors: [timeout] },
        { code: "it('x', { timeout: 1000 }, async () => {});", errors: [timeout] },
        { code: "it('x', async () => {}, { timeout: 1000 });", errors: [timeout] },
        { code: "it.skipIf(ci)('x', async () => {}, TIMEOUT);", errors: [timeout] },
        { code: "test.each([1])('x %i', (n) => {}, 5000);", errors: [timeout] },
        { code: "describe('x', () => {}, 30000);", errors: [timeout] },
        { code: "beforeAll(async () => {}, 30000);", errors: [timeout] },
        { code: "test.beforeEach(async () => {}, 30000);", errors: [timeout] },
        { code: "it('x', runCase, 5000);", errors: [timeout] },
        { code: "vi.setConfig({ testTimeout: 60000 });", errors: [timeout] },
        { code: "function f() { this.timeout(5000); }", errors: [timeout] },
        { code: "test.setTimeout(120000);", errors: [timeout] },
    ],
});
