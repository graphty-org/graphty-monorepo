/**
 * A count, a legend or a repaint tests every element against a layer's selector. A `state` selector read the
 * time window's masks, the selection and the snapshot afresh on every one of those tests, so one
 * count of a timeline-hidden layer compared the window's inputs once per element, and the graphty
 * app recounts every layer on each timeline step. Inside one read nothing an element's state reads
 * can move, so each state is brought up to date once per read. What is asserted is counted work:
 * the window comparisons per count do not grow with the graph, and the counts are unchanged.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { ElementSession } from "../../../src/session/types";
import { slideCounters } from "../../../src/session/visibility/slide";

/**
 * A chain of `count` nodes, node i at step i, with the timeline on a window over its first half and
 * a layer on each element state a count reads.
 * @param count - How many nodes.
 * @returns The session and the layers.
 */
async function windowed(count: number): Promise<{ session: ElementSession; layers: string[] }> {
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${String(i)}`, step: i }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
        step: i + 1,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ directed: true, nodes, edges }) } });
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
    await session.time.window({ from: 0, to: count / 2 - 1 });
    await session.selection.apply({ nodes: ["n0", "n1"] });
    const layers: string[] = [];
    for (const [state, target] of [
        ["outsideWindow", "node"],
        ["outsideWindow", "edge"],
        ["selected", "node"],
        ["hovered", "node"],
    ] as const) {
        const { id } = await session.styles.add({
            name: `${state} ${target}`,
            target,
            selector: { match: "state", state },
            set: target === "node" ? { "node.opacity": 0.5 } : { "edge.opacity": 0.5 },
        });
        layers.push(id);
    }

    await session.styles.settled();
    await Promise.resolve();
    return { session, layers };
}

/**
 * Count every layer once, and read the legend, as the graphty app does on a timeline step.
 * @param count - How many nodes.
 * @returns The window comparisons made, and what each layer matched.
 */
async function countEvery(count: number): Promise<{ checks: number; matched: number[] }> {
    const { session, layers } = await windowed(count);
    const before = slideCounters.windowChecks;
    const matched = layers.map((id) => session.styles.counts(id).matched);
    session.styles.legend();
    const checks = slideCounters.windowChecks - before;
    session.dispose();
    return { checks, matched };
}

/**
 * Step the window once and let the styles settle: the repaint tests every element against each
 * state layer.
 * @param count - How many nodes.
 * @returns The window comparisons made.
 */
async function stepOnce(count: number): Promise<number> {
    const { session } = await windowed(count);
    const before = slideCounters.windowChecks;
    await session.time.stepBy(1);
    await session.styles.settled();
    const checks = slideCounters.windowChecks - before;
    session.dispose();
    return checks;
}

describe("a count of a state layer", () => {
    it("compares the time window's inputs once per read, however many elements it tests", async () => {
        const small = await countEvery(200);
        const large = await countEvery(4000);
        assert.deepStrictEqual(small.matched, [101, 101, 2, 0]);
        assert.deepStrictEqual(large.matched, [2001, 2001, 2, 0]);
        assert.isAtMost(
            large.checks,
            small.checks,
            `200 nodes: ${String(small.checks)}, 4,000: ${String(large.checks)}`,
        );
        assert.isBelow(large.checks, 50);
    });

    it("costs a timeline step's repaint the same comparisons on a small and a large graph", async () => {
        const small = await stepOnce(200);
        const large = await stepOnce(4000);
        assert.isAtMost(large, small + 20, `200 nodes: ${String(small)}, 4,000: ${String(large)}`);
        assert.isBelow(large, 200);
    });
});
