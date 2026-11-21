/**
 * A held filter condition's ghosts are read once per element by a repaint (`inState("ghosted")`).
 * Comparing the ghosts' inputs on every one of those reads cost about 150 ms of a time-slider drag
 * at 50,000 nodes (#7966), so the inputs are compared once a turn. What is asserted is counted
 * work: the comparisons per read of every element, and per repaint, do not grow with the graph.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { ElementSession } from "../../../src/session/types";
import { slideCounters } from "../../../src/session/visibility/slide";

/**
 * A graph of `count` nodes with a held condition that ghosts half of them.
 * @param count - How many nodes.
 * @returns The session.
 */
async function heldHalf(count: number): Promise<ElementSession> {
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${String(i)}`, step: i }));
    const edges = Array.from({ length: count - 1 }, (_, i) => ({
        source: `n${String(i)}`,
        target: `n${String(i + 1)}`,
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    const { id } = await session.visibility.addCondition({
        effect: "keep",
        rule: { kind: "range", attribute: "step", max: count / 2 },
    });
    session.visibility.hold(id);
    return session;
}

/**
 * The comparisons one read of every node's ghost state makes, in one turn.
 * @param count - How many nodes.
 * @returns The comparisons, and how many nodes were ghosts.
 */
async function readEvery(count: number): Promise<{ checks: number; ghosts: number }> {
    const session = await heldHalf(count);
    await Promise.resolve();
    const before = slideCounters.ghostChecks;
    let ghosts = 0;
    for (let index = 0; index < count; index++) {
        ghosts += session.visibility.ghosted("node", index) ? 1 : 0;
    }

    const checks = slideCounters.ghostChecks - before;
    session.dispose();
    return { checks, ghosts };
}

/**
 * The comparisons a repaint by a layer on the ghosted state makes.
 * @param count - How many nodes.
 * @returns The comparisons.
 */
async function repaint(count: number): Promise<number> {
    const session = await heldHalf(count);
    await session.styles.settled();
    const before = slideCounters.ghostChecks;
    await session.styles.add({
        name: "Ghosts",
        target: "node",
        selector: { match: "state", state: "ghosted" },
        set: { "node.opacity": 0.2 },
    });
    await session.styles.settled();
    const checks = slideCounters.ghostChecks - before;
    session.dispose();
    return checks;
}

describe("a held condition's ghosts", () => {
    it("are compared once per turn, however many elements are read", async () => {
        for (const count of [200, 4000]) {
            const { checks, ghosts } = await readEvery(count);
            assert.isAbove(ghosts, count / 3, `${String(count)} nodes: half are ghosts`);
            assert.strictEqual(checks, 1, `${String(count)} nodes`);
        }
    });

    it("cost a repaint the same comparisons on a small and a large graph", async () => {
        const small = await repaint(200);
        const large = await repaint(4000);
        assert.isAtMost(large, small + 2, `200 nodes: ${String(small)}, 4,000 nodes: ${String(large)}`);
        assert.isBelow(large, 50);
    });

    it("follow a hold moved in the same turn", async () => {
        const session = await heldHalf(10);
        const ghost = session.data.snapshot().ids.requireIndex("n9");
        assert.isTrue(session.visibility.ghosted("node", ghost));
        session.visibility.hold(null);
        assert.isFalse(session.visibility.ghosted("node", ghost));
        session.dispose();
    });
});
