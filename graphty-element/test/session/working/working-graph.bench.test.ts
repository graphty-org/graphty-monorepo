/**
 * @file What the working graph costs at 50,000 nodes (design/working-graph/design.md section 9),
 * through the real session with no renderer: building the view under a filter that shows 90% of
 * the nodes, the nothing-hidden path, the readers that answer from the masks, and a time-window
 * scrub of 100 uncommitted moves.
 *
 * THE NUMBERS ARE PRINTED, NOT ASSERTED: a stopwatch on a busy machine measures the machine. Only
 * the counted facts are asserted (no build while scrubbing, one after the commit). Run with:
 * npx vitest run --project=bench test/session/working/working-graph.bench.test.ts
 */

import { assert, beforeAll, describe, it } from "vitest";

import { scopedInputCounters } from "../../../src/algorithms/input/ScopedInput";
import { setDefaultFeatures } from "../../../src/features/resolve";
import { type Harness, makeSession } from "../helpers";

// Timings are taken with strict state off, as a published build runs.
(globalThis as { __GRAPHTY_STRICT_STATE__?: boolean }).__GRAPHTY_STRICT_STATE__ = false;

const NODES = 50_000;
const ROUNDS = 7;

beforeAll(() => {
    setDefaultFeatures(["timeline"]);
});

/**
 * A seeded pseudo-random number in [0, 1).
 * @param seed - The seed.
 * @returns The generator.
 */
function random(seed: number): () => number {
    let state = seed;
    return () => {
        state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
        return state / 2_147_483_648;
    };
}

/**
 * A graph of {@link NODES} nodes, each in one of ten buckets and timed, with `edges` random edges.
 * @param edges - How many edges.
 * @returns The harness.
 */
function graphOf(edges: number): Harness {
    const next = random(11);
    const harness = makeSession();
    harness.add(
        Array.from({ length: NODES }, (_, i) => ({ id: `n${String(i)}`, bucket: i % 10, t: i % 1000 })),
        Array.from({ length: edges }, () => ({
            src: `n${String(Math.floor(next() * NODES))}`,
            dst: `n${String(Math.floor(next() * NODES))}`,
        })),
    );

    return harness;
}

/**
 * The median and slowest of some timings, in milliseconds.
 * @param times - The timings.
 * @returns Both, rounded.
 */
function summary(times: number[]): string {
    const sorted = [...times].sort((a, b) => a - b);
    return `median ${sorted[Math.floor(sorted.length / 2)].toFixed(2)} ms, slowest ${sorted.at(-1)?.toFixed(2) ?? "-"} ms`;
}

describe("the working graph at 50,000 nodes", () => {
    for (const edges of [100_000, 250_000]) {
        it(`builds once per filter state, ${String(edges)} edges, 90% shown`, async () => {
            const harness = graphOf(edges);
            const { session } = harness;
            const nothingHidden: number[] = [];
            const builds: number[] = [];
            const maskReads: number[] = [];

            for (let round = 0; round < ROUNDS; round++) {
                await session.visibility.set(null);
                let start = performance.now();
                session.data.working().snapshot();
                nothingHidden.push(performance.now() - start);

                // A different tenth hidden each round, so no round is a cache hit.
                await session.visibility.set({ kind: "expression", where: `data.bucket != \`${String(round % 10)}\`` });
                start = performance.now();
                const view = session.data.working();
                assert.strictEqual(view.nodeCount, NODES * 0.9);
                view.has("n3");
                view.nodeIds();
                maskReads.push(performance.now() - start);

                const before = scopedInputCounters.derivations;
                start = performance.now();
                view.snapshot();
                builds.push(performance.now() - start);
                view.snapshot();
                assert.strictEqual(scopedInputCounters.derivations - before, 1, "built once per state");
            }

            console.log(`[working-graph] ${String(edges)} edges, nothing hidden: ${summary(nothingHidden)}`);
            console.log(`[working-graph] ${String(edges)} edges, mask readers: ${summary(maskReads)}`);
            console.log(`[working-graph] ${String(edges)} edges, 90% view build: ${summary(builds)}`);
            session.dispose();
        });
    }

    it("builds nothing over 100 uncommitted window moves, and once after the commit", async () => {
        const harness = graphOf(250_000);
        const { session } = harness;
        await session.time.setField({ nodes: { start: "t" } });
        await session.time.window({ from: 0, to: 900 });
        session.data.working().snapshot();
        const before = scopedInputCounters.derivations;
        const frames: number[] = [];

        for (let move = 0; move < 100; move++) {
            const start = performance.now();
            await session.time.seek(move, { commit: false });
            const view = session.data.working();
            assert.isAtMost(view.nodeCount, NODES);
            view.has("n3");
            frames.push(performance.now() - start);
        }

        assert.strictEqual(scopedInputCounters.derivations, before);
        await session.time.commit();
        const masksAt = performance.now();
        assert.isAbove(session.visibility.summary.visibleNodes, 0);
        const masks = performance.now() - masksAt;
        const start = performance.now();
        session.data.working().snapshot();
        const settle = performance.now() - start;
        assert.strictEqual(scopedInputCounters.derivations - before, 1);

        console.log(`[working-graph] scrub frame (seek + mask readers): ${summary(frames)}`);
        console.log(`[working-graph] masks brought up to date after commit: ${masks.toFixed(2)} ms`);
        console.log(`[working-graph] first build after commit: ${settle.toFixed(2)} ms`);
        session.dispose();
    });
});
