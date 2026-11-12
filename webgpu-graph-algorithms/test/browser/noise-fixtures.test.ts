/**
 * The browser noise-fixture writers of the Fruchterman-Reingold model, the spring-electrical model and spmv-pull
 * (issue #467; findings G5-F6 and G7-F3): the same members the Node writers record -- the FR stages of
 * test/layouts/fr-inspect.test.ts (random1k, karate, random1k under k 0.3), the spring stages of
 * test/layouts/se-inspect.test.ts (random1k, karate) and the spmv-pull over the weighted random1k of
 * test/primitives/spmv.test.ts -- written for this browser adapter (SwiftShader on the default lane's flag set, the
 * NVIDIA card under GRAPHTY_BROWSER_GPU=nvidia) through the commands bridge, so test/noise-floor.test.ts and the spmv
 * suite compare them with every committed adapter. The f64 references are adapter-independent and come from the
 * Node writers. Each stage is held to its spec cap, as every parity test is in a recording run.
 *
 * Runs only under GRAPHTY_NOISE_FLOOR_WRITE=1: the default browser run compiles only what the node lanes cannot cover
 * (issue #1741), and these kernels' behaviour is covered there and by test/browser/spring-layouts.test.ts.
 */

import { type GraphSnapshot } from "@graphty/graph-format";

import { type GpuContext } from "../../src/context.js";
import { type FruchtermanReingoldOptions } from "../../src/types/options.js";
import { type ParityGraph, paritySnapshot, startPositions } from "../helpers/fa2-parity.js";
import {
    captureFrStages,
    FR_BASE_OPTIONS,
    FR_K03,
    FR_K03_FIXTURES,
    FR_KARATE_FIXTURES,
    FR_NOISE_FIXTURES,
    FR_STAGE_KEYS,
    FR_STAGE_TOLERANCE,
    type FrNoiseFixtureName,
    type FrStageKey,
    P5_TOLERANCE_CAPS,
} from "../helpers/fr-parity.js";
import { expectBitwiseEqual, maxRelError } from "../helpers/matchers.js";
import {
    adapterClassBrowser,
    recordNoiseRowBrowser,
    writeNoiseFixtureBrowser,
} from "../helpers/noise-floor-browser.js";
import {
    captureSeStages,
    SE_BASE_OPTIONS,
    SE_KARATE_FIXTURES,
    SE_NOISE_FIXTURES,
    SE_STAGE_KEYS,
    SE_STAGE_TOLERANCE,
    SE_TOLERANCE_CAPS,
    type SeNoiseFixtureName,
    type SeStageKey,
} from "../helpers/se-parity.js";
import { maxAbsError, SR_ABS_FLOOR, weightedRandom } from "../helpers/segmented-reduce.js";
import { runSpmvPull, seededVector, spmvTolerance } from "../helpers/spmv.js";
import { spmvPullOracle } from "../oracle/spmv.js";
import { acquireBrowser, requireBrowserGpu } from "../setup/browser.js";

const WRITING = import.meta.env.GRAPHTY_NOISE_FLOOR_WRITE === "1";

/** The FR members of fr-inspect.test.ts's writer. */
const FR_MEMBERS: readonly {
    readonly graph: ParityGraph;
    readonly options: FruchtermanReingoldOptions;
    readonly fixtures: Readonly<Record<FrStageKey, FrNoiseFixtureName>>;
}[] = [
    { graph: "random1k", options: FR_BASE_OPTIONS, fixtures: FR_NOISE_FIXTURES },
    { graph: "karate", options: FR_BASE_OPTIONS, fixtures: FR_KARATE_FIXTURES },
    { graph: "random1k", options: { ...FR_BASE_OPTIONS, k: FR_K03 }, fixtures: FR_K03_FIXTURES },
];

/** The spring members of se-inspect.test.ts's writer. */
const SE_MEMBERS: readonly {
    readonly graph: ParityGraph;
    readonly fixtures: Readonly<Record<SeStageKey, SeNoiseFixtureName>>;
}[] = [
    { graph: "random1k", fixtures: SE_NOISE_FIXTURES },
    { graph: "karate", fixtures: SE_KARATE_FIXTURES },
];

/** One captured stage: this adapter's values, its error against the f64 reference, the cap it is held to. */
interface StageOut {
    readonly values: ArrayLike<number>;
    readonly error: number;
    readonly cap: number;
}

describe.skipIf(!WRITING)(
    "browser noise fixtures: FR, spring-electrical and spmv-pull (GRAPHTY_NOISE_FLOOR_WRITE=1 only)",
    () => {
        let ctx: GpuContext | null = null;

        async function context(t: Parameters<typeof requireBrowserGpu>[0]): Promise<GpuContext> {
            await requireBrowserGpu(t);
            ctx ??= await acquireBrowser({ label: "noise-fixtures" });
            return ctx;
        }

        /**
         * Writes each stage's values as this adapter's fixture, then checks each against its cap (the Node writers' order:
         * a floor above the cap surfaces through the noise-floor validation, not through a missing fixture).
         */
        async function writeStages(
            label: string,
            cls: string,
            stages: readonly {
                readonly name: { readonly kernel: string; readonly fixture: string };
                readonly out: StageOut;
            }[],
        ): Promise<void> {
            for (const { name, out } of stages) {
                await writeNoiseFixtureBrowser(name.kernel, name.fixture, cls, out.values, "f32");
            }
            for (const { name, out } of stages) {
                console.warn(
                    `[${label}] ${cls} noise/${name.fixture}: error ${out.error.toExponential(3)} (cap ${out.cap})`,
                );
                expect(out.error, `${name.fixture} vs the f64 reference`).toBeLessThanOrEqual(out.cap);
            }
        }

        async function withSnapshot(graph: ParityGraph, body: (s: GraphSnapshot) => Promise<void>): Promise<void> {
            const s = paritySnapshot(graph, 1, false);
            try {
                await body(s);
            } finally {
                ctx?.release(s);
            }
        }

        for (const m of FR_MEMBERS) {
            it(`FR stages of ${m.fixtures.force.fixture.replace(/-K3$/, "")}: this adapter's fixtures`, async (t) => {
                const a = await context(t);
                await withSnapshot(m.graph, async (s) => {
                    const capture = await captureFrStages(a, s, startPositions(s, m.options, false), m.options, null);
                    await writeStages(
                        "fr-inspect",
                        adapterClassBrowser(a.caps),
                        FR_STAGE_KEYS.map((key) => ({
                            name: m.fixtures[key],
                            out: { ...capture[key], cap: P5_TOLERANCE_CAPS[FR_STAGE_TOLERANCE[key]].cap },
                        })),
                    );
                });
            });
        }

        for (const m of SE_MEMBERS) {
            it(`spring stages of ${m.fixtures.force.fixture.replace(/-K3$/, "")}: this adapter's fixtures`, async (t) => {
                const a = await context(t);
                await withSnapshot(m.graph, async (s) => {
                    const start = startPositions(s, SE_BASE_OPTIONS, false);
                    const capture = await captureSeStages(a, s, start, SE_BASE_OPTIONS, null);
                    await writeStages(
                        "se-inspect",
                        adapterClassBrowser(a.caps),
                        SE_STAGE_KEYS.map((key) => ({
                            name: m.fixtures[key],
                            out: { ...capture[key], cap: SE_TOLERANCE_CAPS[SE_STAGE_TOLERANCE[key]].cap },
                        })),
                    );
                });
            });
        }

        it("spmv-pull over random1k: the oracle within the analytic bound, twice bitwise, this adapter's fixture and oracle row", async (t) => {
            const a = await context(t);
            const s = weightedRandom(1000, 5000, 7);
            try {
                const x = seededVector(s.nodeCount, 42);
                const c = { alpha: 0.85, beta: 0.15, uniformP: 1 / s.nodeCount };
                const { result } = await runSpmvPull(a, s, x, c);
                const again = await runSpmvPull(a, s, x, c);
                expectBitwiseEqual(result, again.result, "twice");
                const expected = spmvPullOracle(s, Float64Array.from(x), { ...c, dangling: 0 });
                const oracleErr = maxRelError(result, expected, SR_ABS_FLOOR);
                const mine = adapterClassBrowser(a.caps);
                console.warn(`[spmv-pull] ${mine}: oracle-f64 maxRelError ${oracleErr.toExponential(3)}`);
                await writeNoiseFixtureBrowser("spmv-pull", "random1k", mine, result, "f32");
                await recordNoiseRowBrowser({
                    id: `spmv-pull.oracle-f64.${mine}`,
                    kernel: "spmv-pull",
                    fixture: "random1k",
                    comparison: "oracle-f64",
                    a: mine,
                    b: "oracle-f64",
                    maxRelError: oracleErr,
                    maxAbsError: maxAbsError(result, expected),
                    samples: s.nodeCount,
                });
                expect(oracleErr).toBeLessThanOrEqual(spmvTolerance(s));
            } finally {
                a.release(s);
            }
        });
    },
);
