/**
 * The browser twin of test/kernel/wgsl-compile.test.ts (spec 5.1, 11.3, 11.6 item 6; contract 5.5 P2): the cases of
 * browserCompileCases (test/helpers/override-matrix.ts; issue #1741) compile on Chromium (SwiftShader on the default
 * lane, NVIDIA on the GPU lane) -- one case per kernel and module text, every case of a kernel whose overrides reach a
 * limit-checked expression -- twin cases also on a second context created without the subgroups feature (the
 * workgroup twin's browser leg, spec 11.6 item 5), which catches uniform-layout bugs Dawn-node's
 * uniform_buffer_standard_layout masks. The full OVERRIDE_MATRIX compiles on Dawn in the node project. PLAN DECISION (P2-T2): the
 * file also runs the thread-per-row segmented-reduce on the weighted random1k graph so the browser adapters' noise
 * fixtures and oracle rows exist (G2: "noise-floor rows recorded from the three adapters"); the cross-adapter
 * comparison itself runs in the node primitive test against every committed fixture.
 */

import { type TestContext } from "vitest";

import { type GpuContext } from "../../src/context.js";
import { type KernelId, KERNELS, kernelSpec } from "../../src/kernels.js";
import { expectAllClose, expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import {
    adapterClassBrowser,
    recordNoiseRowBrowser,
    writeNoiseFixtureBrowser,
} from "../helpers/noise-floor-browser.js";
import {
    browserCompileCases,
    entryOf,
    type OverrideCase,
    SEGMENTED_REDUCE_SNIPPETS,
} from "../helpers/override-matrix.js";
import {
    maxAbsError,
    oracleValueOf,
    relTolerance,
    runSegmentedReduce,
    SR_ABS_FLOOR,
    weightedRandom,
} from "../helpers/segmented-reduce.js";
import { segmentedReduceOracle } from "../oracle/segmented-reduce.js";
import { acquireBrowser, browserAdapterOffersSubgroups, requireBrowserGpu } from "../setup/browser.js";

describe("compile matrix on Chromium", () => {
    let ctx: GpuContext | null = null;
    let twin: GpuContext | null = null;

    async function contexts(t: TestContext): Promise<{ ctx: GpuContext; twin: GpuContext }> {
        await requireBrowserGpu(t);
        const a = ctx ?? (await acquireBrowser({ label: "compile-matrix" }));
        ctx = a;
        const b = twin ?? (await acquireBrowser({ optionalFeatures: [], label: "compile-matrix-twin" }));
        twin = b;
        return { ctx: a, twin: b };
    }

    /**
     * Compiles the cases one after another, and stops at the first case after `signal` aborts. Vitest aborts a test's
     * signal when the test times out but cannot stop its body, so without the check a timed-out kernel kept queuing
     * SwiftShader compiles (each a CPU JIT in the GPU process) under every test after it (issue #1706).
     */
    async function compileAll(context: GpuContext, cases: readonly OverrideCase[], signal: AbortSignal): Promise<void> {
        for (const c of cases) {
            signal.throwIfAborted();
            const kernel = await context.pipelines.kernel(kernelSpec(c.id, c.overrides, c.snippets));
            expect(kernel.entryPoint).toBe(entryOf(c.id).entryPoint);
        }
    }

    it("the feature context has subgroups iff the adapter offers them (Chromium's CI adapters do, WebKit does not) and the twin never does", async (t) => {
        const { ctx: a, twin: b } = await contexts(t);
        expect(a.caps.features.has("subgroups")).toBe(browserAdapterOffersSubgroups());
        expect(b.caps.features.has("subgroups")).toBe(false);
    });

    for (const id of Object.keys(KERNELS) as KernelId[]) {
        it(`compiles the browser cases of ${id} on Chromium (twin cases on both feature settings)`, async (t) => {
            const { ctx: a, twin: b } = await contexts(t);
            const cases = browserCompileCases(a.caps).filter((c) => c.id === id);
            expect(cases.length).toBeGreaterThan(0);
            await compileAll(a, cases, t.signal);
            const twins = browserCompileCases(b.caps).filter((c) => c.id === id && c.twin);
            if (cases.some((c) => c.twin)) {
                expect(twins.length).toBeGreaterThan(0);
            }
            await compileAll(b, twins, t.signal);
        });
    }

    it("compiled the browser selection once (bounded: pipelines.size equals the selected case count)", async (t) => {
        const { ctx: a } = await contexts(t);
        expect(a.pipelines.size).toBe(browserCompileCases(a.caps).length);
    });

    it("segmented-reduce thread-per-row on random1k (weighted sum): oracle within the analytic bound, twice bitwise, this adapter's noise fixture and oracle row written", async (t) => {
        const { ctx: a } = await contexts(t);
        const s = weightedRandom(1000, 5000, 7);
        const snippet = SEGMENTED_REDUCE_SNIPPETS.weight;
        const first = await runSegmentedReduce(a, s, "sum", snippet);
        const second = await runSegmentedReduce(a, s, "sum", snippet);
        expectBitwiseEqual(first, second, "twice");
        const expected = segmentedReduceOracle(s, oracleValueOf(snippet), "sum");
        expectAllClose(first, expected, { rel: relTolerance(s, "sum"), abs: 0 }, "random1k weighted sum");
        const mine = adapterClassBrowser(a.caps);
        const oracleErr = maxRelError(first, expected, SR_ABS_FLOOR);
        console.warn(`[segmented-reduce] ${mine}: oracle-f64 maxRelError ${oracleErr.toExponential(3)}`);
        const written = await writeNoiseFixtureBrowser("segmented-reduce", "random1k", mine, Array.from(first), "f32");
        expect(typeof written).toBe("string");
        await recordNoiseRowBrowser({
            id: `segmented-reduce.sum.oracle-f64.${mine}`,
            kernel: "segmented-reduce",
            fixture: "random1k",
            comparison: "oracle-f64",
            a: mine,
            b: "oracle-f64",
            maxRelError: oracleErr,
            maxAbsError: maxAbsError(first, expected),
            samples: s.nodeCount,
        });
        a.release(s);
    });
});
