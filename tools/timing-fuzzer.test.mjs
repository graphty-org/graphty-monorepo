// Tests of tools/timing-fuzzer.mjs: the clock never runs backwards or behind real time, and stays
// within one jump of it; frame callbacks are each run once, unless cancelled; skips and early
// deliveries are equally common; timers are only ever late; one seed gives the same decisions.
//
//   node --test tools/timing-fuzzer.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { installTimingFuzzer, parseTimingFuzzSeed, timingFuzzerInitScript } from "./timing-fuzzer.mjs";

/**
 * A global with a hand-driven clock, frame queue and timer list.
 * @returns The global.
 */
function fakeGlobal() {
    const g = { real: 0, frames: [], timers: [] };
    g.performance = { now: () => g.real };
    g.Date = { now: () => 1e12 + g.real };
    g.requestAnimationFrame = (cb) => g.frames.push({ cb }) - 1;
    g.cancelAnimationFrame = (id) => {
        g.frames[id].cancelled = true;
    };
    g.setTimeout = (fn, delay) => g.timers.push({ fn, delay }) - 1;
    g.clearTimeout = (id) => {
        g.timers[id].cancelled = true;
    };
    // Run one frame: every callback queued before it, at the current time.
    g.frame = () => {
        const due = g.frames.splice(0);
        g.frames.length = 0;
        for (const f of due) {
            if (!f.cancelled) f.cb(g.real);
        }
        g.real += 16;
    };
    g.runTimers = () => {
        for (const t of g.timers.splice(0)) {
            if (!t.cancelled) t.fn();
        }
    };
    return g;
}

describe("the clock", () => {
    it("is monotonic, never behind real time, and unless overloaded never more than a jump ahead of its rate", () => {
        const g = fakeGlobal();
        const fuzzer = installTimingFuzzer(g, 7);
        const rates = new Set();
        for (let test = 0; test < 20; test++) {
            fuzzer.reseed(`test ${test}`);
            const { load, rate } = fuzzer.load;
            rates.add(load);
            const r0 = g.real;
            const t0 = g.performance.now();
            let last = t0;
            for (let i = 0; i < 5000; i++) {
                g.real += 0.05;
                const t = g.performance.now();
                assert.ok(t >= last, "monotonic");
                assert.ok(t >= g.real, "not behind real time");
                if (load !== "overloaded") {
                    assert.ok(t <= t0 + rate * (g.real - r0) + 252, "within one jump of its rate");
                }
                last = t;
            }
        }
        assert.ok(fuzzer.counts.jumps > 100, "it jumps");
        assert.deepEqual([...rates].sort(), ["busy", "idle", "overloaded"], "every load is drawn");
    });

    it("keeps Date.now monotonic and at real speed", () => {
        const g = fakeGlobal();
        const fuzzer = installTimingFuzzer(g, 3);
        let last = 0;
        for (let test = 0; test < 10; test++) {
            fuzzer.reseed(`t${test}`);
            for (let i = 0; i < 1000; i++) {
                g.real += 1;
                const d = g.Date.now();
                assert.ok(d >= last && d >= 1e12 + g.real - 1 && d <= 1e12 + g.real + 251);
                last = d;
            }
        }
    });
});

describe("animation frames", () => {
    it("runs each callback exactly once, skipping some a frame and running as many early", () => {
        const g = fakeGlobal();
        const fuzzer = installTimingFuzzer(g, 11);
        let ran = 0;
        for (let i = 0; i < 10000; i++) {
            g.requestAnimationFrame(() => ran++);
            g.runTimers();
            g.frame();
        }
        g.frame();
        g.frame();
        assert.equal(ran, 10000);
        const { skipped, early } = fuzzer.counts;
        assert.ok(skipped > 300 && early > 300, `both happen: ${skipped} skipped, ${early} early`);
        assert.ok(Math.abs(skipped - early) < 0.2 * (skipped + early), "about as many of each");
    });

    it("never runs a cancelled callback, whichever way it was scheduled", () => {
        const g = fakeGlobal();
        installTimingFuzzer(g, 5);
        let ran = 0;
        for (let i = 0; i < 2000; i++) {
            const id = g.requestAnimationFrame(() => ran++);
            if (i % 3 === 1) g.frame(); // a skipped one is cancelled between its two frames
            const before = ran;
            g.cancelAnimationFrame(id);
            g.runTimers();
            g.frame();
            g.frame();
            assert.equal(ran, before);
        }
    });
});

describe("timers", () => {
    it("are only ever late, by at most 2 ms", () => {
        const g = fakeGlobal();
        installTimingFuzzer(g, 9);
        let late = 0;
        for (let i = 0; i < 1000; i++) {
            g.setTimeout(() => {}, 50);
            const { delay } = g.timers.at(-1);
            assert.ok(delay >= 50 && delay <= 52);
            if (delay > 50) late++;
        }
        assert.ok(late > 200 && late < 400);
    });
});

describe("seeds", () => {
    it("one seed and test name give the same decisions", () => {
        const decisions = () => {
            const g = fakeGlobal();
            const fuzzer = installTimingFuzzer(g, 42);
            fuzzer.reseed("a test");
            return Array.from({ length: 200 }, () => {
                g.setTimeout(() => {}, 0);
                return g.timers.at(-1).delay;
            });
        };
        assert.deepEqual(decisions(), decisions());
    });

    it("reads the setting", () => {
        assert.equal(parseTimingFuzzSeed(undefined), undefined);
        assert.equal(parseTimingFuzzSeed("off"), undefined);
        assert.equal(parseTimingFuzzSeed("0"), undefined);
        assert.equal(parseTimingFuzzSeed("123"), 123);
        assert.ok(parseTimingFuzzSeed("random") > 0);
        assert.throws(() => parseTimingFuzzSeed("abc"), /GRAPHTY_TIMING_FUZZ/);
    });

    it("installs once per global, and as a page init script", () => {
        const g = fakeGlobal();
        assert.equal(installTimingFuzzer(g, 1), installTimingFuzzer(g, 2));
        const page = fakeGlobal();
        new Function("globalThis", timingFuzzerInitScript(77))(page);
        assert.equal(page[Symbol.for("graphty.timingFuzzer")].seed, 77);
    });
});
