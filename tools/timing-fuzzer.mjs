/**
 * @file The timing fuzzer: makes a test that depends on timing fail on an idle machine.
 *
 * A test that counts animation frames, reads the wall clock or races two timers passes when the
 * machine is idle and fails when it is busy. The fuzzer gives every test the conditions of a busy
 * machine without making the machine busy: it changes what the clock says and the order things
 * happen in, never how much work there is.
 *
 * - `performance.now` stays monotonic and never reads behind real time, but it jitters and now
 *   and then jumps ahead by up to a quarter second, as it does to code that lost the CPU for that
 *   long. Each test draws a load: idle (rare jumps), busy (the clock runs 1.5 to 4 times fast, as
 *   code on a busy machine sees its own work take longer, and jumps within 250 ms of it), or
 *   overloaded (jumps that accumulate, as on a runner many times slower). `Date.now` gets the
 *   jitter and up to 250 ms of the jumps but keeps real speed.
 * - Each `requestAnimationFrame` callback, on its own, is now and then held back a frame (a
 *   frame skipped) or delivered early, before the next frame (two in one frame). Skips and early
 *   deliveries are equally likely, so the page draws as many frames as it did. Two loops that
 *   each count frames no longer agree, as on a runner whose renderer skips ticks.
 * - Now and then a `setTimeout` fires up to 2 ms late, which reorders timers that come due
 *   together. Timers never fire early.
 *
 * Nothing busy-waits and nothing adds work. The decisions come from a seeded generator, reseeded
 * per test from the run's seed and the test's name, so a seed names the same perturbations.
 *
 * Turned on by GRAPHTY_TIMING_FUZZ: a seed (an integer) or "random". Unset, "0" or "off" turns
 * it off. Installed by tools/timing-fuzzer.setup.mjs in a vitest project (see `timingFuzzConfig`),
 * and in a Playwright page by `page.addInitScript(timingFuzzerInitScript(seed))`.
 *
 * This module also loads in a browser test page (through the setup file), so it imports nothing
 * from Node.
 */

/** The environment variable that turns the fuzzer on and names its seed. */
export const TIMING_FUZZ_ENV = "GRAPHTY_TIMING_FUZZ";

/** The key under which a vitest config provides the seed to the setup file. */
export const TIMING_FUZZ_PROVIDE_KEY = "graphtyTimingFuzz";

/**
 * Read the fuzzer's setting.
 * @param value - GRAPHTY_TIMING_FUZZ.
 * @returns The seed, or undefined when the fuzzer is off.
 */
export function parseTimingFuzzSeed(value) {
    if (value === undefined || value === "" || value === "0" || value === "off") {
        return undefined;
    }
    if (value === "random") {
        return Math.floor(Math.random() * 0xffffffff) >>> 0 || 1; // NOSONAR(S2245): a test seed, printed for replay, not a secret
    }
    const seed = Number(value);
    if (!Number.isInteger(seed) || seed <= 0) {
        throw new Error(`${TIMING_FUZZ_ENV}="${value}": use a positive integer seed, "random", or "off"`);
    }
    return seed >>> 0;
}

/**
 * Install the fuzzer on a global object. Self-contained (it closes over nothing in this module),
 * because `timingFuzzerInitScript` sends its source text into a page.
 * @param g - The global object: `globalThis` in Node or in a page.
 * @param seed - The run's seed.
 * @returns The installed fuzzer (its seed, `reseed(label)` and counts of what it did); a second
 *   install on the same global returns the first.
 */
export function installTimingFuzzer(g, seed) {
    const KEY = Symbol.for("graphty.timingFuzzer");
    if (g[KEY]) {
        return g[KEY];
    }

    // mulberry32: a few nanoseconds a draw.
    let state = seed >>> 0;
    const rand = () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const counts = { jumps: 0, skipped: 0, early: 0, lateTimers: 0 };

    // The clock. Each test runs under a load of its own, a third each:
    // - idle: real speed, and a jump on 0.5% of readings;
    // - busy: 1.5 to 4 times real speed, which is how a busy machine looks to code that times its
    //   own work, and a jump on 5% of readings. `floor` is where a jump left the clock: it reads
    //   at least that until the scaled clock passes it, so it is never more than 250 ms ahead;
    // - overloaded: a jump on 10% of readings that never comes back, so the clock runs ahead as far
    //   as the code reads it, as on a runner many times slower than this machine. A short loop
    //   that stops when the clock says its time is up stops early here, and only here.
    const perf = g.performance;
    const realNow = perf.now.bind(perf);
    const realDateNow = g.Date.now.bind(g.Date);
    let load = "idle";
    let rate = 1;
    let anchorReal = realNow();
    let anchorRead = anchorReal;
    let last = 0;
    let floor = 0;
    const scaled = (real) => anchorRead + rate * (real - anchorReal);
    const pickLoad = () => {
        anchorRead = Math.max(last, scaled(realNow()));
        anchorReal = realNow();
        const roll = rand();
        load = ["idle", "busy", "overloaded"][Math.floor(roll * 3)];
        rate = load === "busy" ? 1.5 + 2.5 * rand() : 1;
    };
    const now = () => {
        if (rand() < { idle: 0.005, busy: 0.05, overloaded: 0.1 }[load]) {
            const jump = 250 * rand() ** 2;
            if (load === "overloaded") {
                anchorRead += jump;
            } else {
                floor = Math.max(floor, scaled(realNow()) + jump);
            }
            counts.jumps++;
        }
        const reading = Math.max(scaled(realNow()) + rand(), floor, last);
        last = reading;
        return reading;
    };
    perf.now = now;
    // Date.now jitters and jumps with the clock but keeps real speed: dates are compared with
    // other machines' (a server's, a file's), and a fast clock would drift from them.
    let lastDate = 0;
    g.Date.now = () => {
        const real = realNow();
        lastDate = Math.max(lastDate, Math.floor(realDateNow() + Math.min(250, now() - scaled(real))));
        return lastDate;
    };
    pickLoad();

    // Animation frames: each callback on its own is skipped a frame, delivered early or left alone.
    if (typeof g.requestAnimationFrame === "function") {
        const realRaf = g.requestAnimationFrame.bind(g);
        const realCancel = g.cancelAnimationFrame.bind(g);
        const realTimeout = g.setTimeout.bind(g);
        const realClear = g.clearTimeout.bind(g);
        const pending = new Map();
        let nextId = 1;
        g.requestAnimationFrame = (callback) => {
            const id = nextId++;
            const run = (stamp) => {
                if (pending.delete(id)) {
                    callback(stamp);
                }
            };
            const roll = rand();
            if (roll < 0.05) {
                counts.skipped++;
                pending.set(id, {
                    frame: realRaf(() => {
                        if (pending.has(id)) {
                            pending.set(id, { frame: realRaf((t) => run(t + (now() - realNow()))) });
                        }
                    }),
                });
            } else if (roll < 0.1) {
                counts.early++;
                pending.set(id, { timer: realTimeout(() => run(now()), 0) });
            } else {
                pending.set(id, { frame: realRaf((t) => run(t + (now() - realNow()))) });
            }
            return id;
        };
        g.cancelAnimationFrame = (id) => {
            const entry = pending.get(id);
            if (entry === undefined) {
                return;
            }
            pending.delete(id);
            if (entry.frame !== undefined) {
                realCancel(entry.frame);
            } else {
                realClear(entry.timer);
            }
        };
    }

    // Timers: now and then up to 2 ms late, so timers due together come in another order.
    const realSetTimeout = g.setTimeout;
    const lateTimeout = (handler, delay, ...args) => {
        if (rand() < 0.3) {
            counts.lateTimers++;
            return realSetTimeout.call(g, handler, (Number(delay) || 0) + 2 * rand(), ...args);
        }
        return realSetTimeout.call(g, handler, delay, ...args);
    };
    // Node's util.promisify(setTimeout) and timers/promises read this; keep it.
    Object.assign(lateTimeout, realSetTimeout);
    g.setTimeout = lateTimeout;

    const fuzzer = {
        seed,
        counts,
        /**
         * The load this test runs under.
         * @returns "idle", "busy" or "overloaded", and how fast the clock runs against real time.
         */
        get load() {
            return { load, rate };
        },
        /**
         * Restart the decisions from the run's seed and a label.
         * @param label - The test's name.
         */
        reseed(label) {
            let h = seed >>> 0;
            for (let i = 0; i < label.length; i++) {
                h = Math.imul(h ^ label.codePointAt(i), 0x01000193) >>> 0;
            }
            state = h;
            pickLoad();
        },
    };
    g[KEY] = fuzzer;
    return fuzzer;
}

/**
 * The script for `page.addInitScript` that installs the fuzzer in a page before its own code runs.
 * @param seed - The run's seed.
 * @returns The script.
 */
export function timingFuzzerInitScript(seed) {
    return `(${installTimingFuzzer.toString()})(globalThis, ${String(seed >>> 0)});`;
}

/** The environment, in Node; absent in a browser page. */
const ENV = typeof process === "undefined" ? {} : process.env;

/** This run's seed, read once so every project of a config gets the same one. */
const RUN_SEED = parseTimingFuzzSeed(ENV[TIMING_FUZZ_ENV]);
if (RUN_SEED !== undefined && ENV.VITEST_POOL_ID === undefined) {
    console.log(`[timing fuzzer] on, seed ${String(RUN_SEED)} (replay: ${TIMING_FUZZ_ENV}=${String(RUN_SEED)})`);
}

/** The setup file a vitest project lists to install the fuzzer. */
export const TIMING_FUZZ_SETUP = decodeURIComponent(new URL("timing-fuzzer.setup.mjs", import.meta.url).pathname);

/**
 * What a vitest project needs to run under the fuzzer: its seed, provided to the setup file.
 * List `TIMING_FUZZ_SETUP` in the project's setupFiles as well. With the fuzzer off the setup
 * file installs nothing.
 * @returns Options to spread into the project's `test` options.
 */
export function timingFuzzConfig() {
    return { provide: { [TIMING_FUZZ_PROVIDE_KEY]: RUN_SEED === undefined ? "" : String(RUN_SEED) } };
}

/**
 * Install the fuzzer in a Playwright page as well, when this test process runs under it, so the
 * page's own code (its timers, frames and clock) is perturbed too. Call it before the page loads.
 * @param page - The page (anything with Playwright's `addInitScript`).
 * @returns Resolves once the script is registered; does nothing with the fuzzer off.
 */
export async function fuzzPage(page) {
    const fuzzer = globalThis[Symbol.for("graphty.timingFuzzer")];
    if (fuzzer !== undefined) {
        await page.addInitScript(timingFuzzerInitScript(fuzzer.seed));
    }
}
