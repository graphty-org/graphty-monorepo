/**
 * @file What building the working graph's view costs at 50,000 nodes and 250,000 edges, through the
 * real session with no renderer (design/working-graph/design.md section 8): a rebuild after a filter
 * change, and a rebuild after each step of a time-window slider drag.
 *
 * The design's rule: a slider drag rebuilds the view on every step, unless a 50,000-node rebuild
 * takes longer than 16 ms (one frame), in which case the view rebuilds when the slider pauses. This
 * file prints the measurement that decides it; it asserts only counted work (one build per state),
 * because a stopwatch on a busy machine measures the machine. Each measurement is the median of
 * seven rounds after one untimed pass. Run with:
 * npx vitest run --project=bench test/session/working-graph-view.bench.test.ts
 */

import { mulberry32 } from "@graphty/algorithms";
import { assert, beforeAll, describe, it } from "vitest";

import { setDefaultFeatures } from "../../src/features/resolve";
import { workingGraphOfSession } from "../../src/session/GraphSession";
import type { RuleTree } from "../../src/session/visibility";
import { workingViewCounters } from "../../src/session/working/view";
import { type Harness, makeSession } from "./helpers";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = 50_000;
const EDGES = 250_000;
const ROUNDS = 7;
/** One frame: the design's limit for rebuilding on every slider step. */
const FRAME_MS = 16;
/**
 * The timeline runs over 1,000 moments; the window is 800 wide, so the view keeps most of what the
 * filter shows, and a drag moves it by 5.
 */
const SPAN = 1000;
const WIDTH = 800;
const STEP = 5;

/** Half the nodes, by category. */
const HALF: RuleTree = { kind: "categories", attribute: "data.kind", values: ["k0", "k1", "k2", "k3", "k4"] };
/** Another half, so a change between the two moves every mask. */
const OTHER: RuleTree = { kind: "categories", attribute: "data.kind", values: ["k3", "k4", "k5", "k6", "k7"] };

/**
 * A seeded random graph whose nodes carry a category and an instant.
 * @returns The harness, working graph on.
 */
function graphOf(): Harness {
    const next = mulberry32(7);
    const harness = makeSession();
    harness.add(
        Array.from({ length: NODES }, (_, at) => ({
            id: `n${String(at)}`,
            kind: `k${String(at % 10)}`,
            t: Math.floor(next() * SPAN),
        })),
        Array.from({ length: EDGES }, () => ({
            src: `n${String(Math.floor(next() * NODES))}`,
            dst: `n${String(Math.floor(next() * NODES))}`,
        })),
    );
    harness.session.workingGraph = true;

    return harness;
}

/**
 * The median and slowest of the rounds, after one untimed pass through them.
 * @param round - One round: does its untimed preparation, then returns the milliseconds it timed.
 * @returns The median and the slowest round.
 */
async function timed(round: (at: number) => Promise<number>): Promise<{ median: number; slowest: number }> {
    for (let at = 0; at < ROUNDS; at++) {
        await round(at);
    }

    const rounds: number[] = [];
    for (let at = 0; at < ROUNDS; at++) {
        rounds.push(await round(at));
    }

    rounds.sort((a, b) => a - b);
    return { median: rounds[ROUNDS >> 1], slowest: rounds[ROUNDS - 1] };
}

/**
 * Print one measurement against one frame.
 * @param measure - What was measured.
 * @param timing - The result.
 * @param timing.median - The median round.
 * @param timing.slowest - The slowest round.
 */
function report(measure: string, timing: { median: number; slowest: number }, shown: number): void {
    const verdict = timing.median <= FRAME_MS ? "within one frame" : "over one frame";
    console.log(
        `[working-graph] ${measure} at ${String(NODES)} nodes / ${String(EDGES)} edges, ${String(shown)} nodes shown: median ${timing.median.toFixed(2)} ms, slowest ${timing.slowest.toFixed(2)} ms, ${verdict} (${String(FRAME_MS)} ms)`,
    );
}

describe("the working graph's view at 50,000 nodes", () => {
    beforeAll(() => {
        // The timeline is an experiment: this file's sessions switch it on.
        setDefaultFeatures(["timeline"]);
    });

    it("rebuilds once per filter change", async () => {
        const harness = graphOf();
        const working = workingGraphOfSession(harness.session);

        const timing = await timed(async (at) => {
            await harness.session.visibility.set(at % 2 === 0 ? HALF : OTHER);
            const before = workingViewCounters.builds;
            const start = performance.now();
            working.view();
            const took = performance.now() - start;
            assert.strictEqual(workingViewCounters.builds, before + 1, "one build per filter state");
            working.view();
            assert.strictEqual(workingViewCounters.builds, before + 1, "a second read shares it");
            return took;
        });

        report("rebuild after a filter change", timing, working.view().nodeCount);
        harness.session.dispose();
    });

    it("rebuilds once per step of a slider drag", async () => {
        const harness = graphOf();
        const working = workingGraphOfSession(harness.session);
        const { time } = harness.session;
        await harness.session.visibility.set(HALF);
        await time.setField({ nodes: { start: "t", unit: "ordinal" } });
        await time.window({ from: 0, to: WIDTH, step: STEP });
        working.view();

        let from = 0;
        const timing = await timed(async () => {
            from = (from + STEP) % (SPAN - WIDTH);
            // A drag moves the window without recording it, as a play frame does.
            await time.seek(from, { commit: false });
            const before = workingViewCounters.builds;
            const start = performance.now();
            working.view();
            const took = performance.now() - start;
            assert.strictEqual(workingViewCounters.builds, before + 1, "one build per step");
            return took;
        });

        report("rebuild per slider step", timing, working.view().nodeCount);
        await time.commit();
        harness.session.dispose();
    });
});
