/**
 * The time window slid without a history step, as a smooth play and a dragged window move it:
 * every slide must leave exactly the masks a recorded window leaves, and a slide's work must
 * follow the rows that crossed an edge of the window, not the size of the graph.
 */
import { assert, describe, it } from "vitest";

import { assertScalesLinearly, visitsDuring } from "../../helpers/cost";
import { type Harness, makeSession } from "../helpers";

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
 * A graph of `n` nodes and `2n` edges whose edges (and, with `nodeTime`, nodes) carry a time `w`
 * spread over `span`; one edge in ten carries none.
 * @param n - How many nodes.
 * @param seed - The seed.
 * @param span - The spread of the instants.
 * @param nodeTime - Whether nodes carry the time too.
 * @returns The harness.
 */
function timed(n: number, seed: number, span: number, nodeTime = false): Harness {
    const next = random(seed);
    const harness = makeSession();
    const nodes = Array.from({ length: n }, (_, at) => ({
        id: `n${String(at)}`,
        ...(nodeTime ? { w: Math.floor(next() * span) } : {}),
        kind: at % 3 === 0 ? "hub" : "leaf",
    }));
    const edges = Array.from({ length: 2 * n }, (_, at) => ({
        src: `n${String(Math.floor(next() * n))}`,
        dst: `n${String(Math.floor(next() * n))}`,
        ...(at % 10 === 9 ? {} : { w: Math.floor(next() * span) }),
        heavy: next() > 0.5,
    }));
    harness.add(nodes, edges);
    return harness;
}

/**
 * The visibility masks, as plain arrays.
 * @param harness - The session.
 * @returns Both masks.
 */
function masks(harness: Harness): { nodes: number[]; edges: number[] } {
    return {
        nodes: [...harness.session.visibility.nodeMask()],
        edges: [...harness.session.visibility.edgeMask()],
    };
}

describe("a slid time window", () => {
    for (const nodeTime of [false, true]) {
        it(`leaves the masks a recorded window leaves (${nodeTime ? "nodes and edges" : "edges"} timed, under a filter)`, async () => {
            const slid = timed(60, 7, 1000, nodeTime);
            const recorded = timed(60, 7, 1000, nodeTime);
            for (const harness of [slid, recorded]) {
                await harness.session.time.setField(
                    nodeTime ? { nodes: { start: "w" }, edges: { start: "w" } } : { edges: { start: "w" } },
                );
                await harness.session.visibility.setSteps([
                    { id: "s1", on: true, rule: { kind: "categories", attribute: "data.kind", values: ["leaf"] } },
                ]);
                await harness.session.time.window({ from: 0, to: 120, step: 120 });
            }

            const next = random(99);
            for (let move = 0; move < 40; move++) {
                // Small slides, as frames make, and now and then a jump.
                const from = move % 9 === 8 ? Math.floor(next() * 900) : (move * 13.7) % 900;
                const event = await slid.session.time.seek(from, { commit: false });
                await recorded.session.time.seek(from);
                assert.strictEqual(event.from, from);
                assert.deepEqual(masks(slid), masks(recorded), `after sliding to ${String(from)}`);
            }

            // Nothing was recorded until the cursor is committed.
            assert.strictEqual(slid.session.visibility.window?.from, 0);
            const at = slid.session.time.current?.from;
            await slid.session.time.commit();
            assert.strictEqual(slid.session.visibility.window?.from, at);
            assert.deepEqual(masks(slid), masks(recorded));
        });
    }

    it("records a committed slide as its own step, even right after a window step (#4400)", async () => {
        const harness = timed(40, 3, 500);
        await harness.session.time.setField({ edges: { start: "w" } });
        // A window step, then a drag let go at once: well inside the history's coalescing window.
        await harness.session.time.window({ from: 0, to: 50, step: 50 });
        const before = harness.session.history.position;
        await harness.session.time.seek(100, { commit: false });
        await harness.session.time.commit();

        assert.strictEqual(harness.session.history.position, before + 1, "the drag is a step of its own");
        await harness.session.undo();
        assert.strictEqual(harness.session.visibility.window?.from, 0, "undo returns to where the drag began");
    });

    it("puts back the recorded window's masks when a slide is dropped", async () => {
        const harness = timed(40, 3, 500);
        await harness.session.time.setField({ edges: { start: "w" } });
        await harness.session.time.window({ from: 0, to: 50, step: 50 });
        const recorded = masks(harness);
        await harness.session.time.seek(200, { commit: false });
        assert.notDeepEqual(masks(harness), recorded);

        // A recorded move from elsewhere supersedes the cursor.
        await harness.session.time.window({ from: 0, to: 50, step: 50 });
        assert.deepEqual(masks(harness), recorded);
        assert.strictEqual(harness.session.time.current?.from, 0);
    });

    it("does work by the rows a slide moves past, whatever the size of the graph", async () => {
        await assertScalesLinearly(
            async (size) => {
                // One instant per edge row, so a slide of a fixed width crosses the same number of
                // edges at either size.
                const harness = makeSession();
                harness.add(
                    Array.from({ length: size }, (_, at) => ({ id: `n${String(at)}` })),
                    Array.from({ length: size }, (_, at) => ({
                        src: `n${String(at)}`,
                        dst: `n${String((at + 1) % size)}`,
                        w: at,
                    })),
                );
                await harness.session.time.setField({ edges: { start: "w" } });
                await harness.session.time.window({ from: 0, to: 40, step: 40 });
                // The first slide reads the filter and the index once.
                await harness.session.time.seek(10, { commit: false });
                return visitsDuring(() => harness.session.time.seek(17.5, { commit: false }));
            },
            { sizes: [2_000, 8_000], growth: "constant", counter: "elements visited by one slide" },
        );
    });
});
