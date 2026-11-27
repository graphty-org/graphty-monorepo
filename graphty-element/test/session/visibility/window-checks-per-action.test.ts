/**
 * With a time window in force, the graphty app recounts every style layer after a layout apply,
 * an undo or a timeline step, and each count tests every element's `outsideWindow` state. That
 * test brought the window's in-window masks up to date (`insideUpToDate`: the frame, the rule,
 * `JSON.stringify(window)` and every input compared) before its per-turn cache, so at 10,000
 * nodes each recount compared the window's inputs about 10,000 times per layer (#10291). Within
 * a turn nothing the window depends on moves, so the comparison runs once a turn. What is asserted
 * is counted work: the comparisons per action do not grow with the graph.
 */

import { barabasiAlbertGraph } from "@graphty/graph-samples/generators";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../session";
import type { ElementSession } from "../../../src/session/types";
import { slideCounters } from "../../../src/session/visibility/slide";

/**
 * A seeded Barabasi-Albert graph of `count` nodes on the spiral layout, node i at step i, the
 * timeline on a window over its first half, and a layer on the outsideWindow state for nodes and for edges.
 * @param count - How many nodes.
 * @returns The session and the layers.
 */
async function windowed(count: number): Promise<{ session: ElementSession; layers: string[]; edgeCount: number }> {
    const graph = barabasiAlbertGraph({ n: count, m: 2, seed: 1 });
    const session = createGraphSession({ workingGraph: false }) as ElementSession;
    const nodes = Array.from({ length: count }, (_, i) => ({ id: `n${String(i)}`, step: i }));
    const edges = Array.from(graph.src, (src, e) => ({
        source: `n${String(src)}`,
        target: `n${String(graph.dst[e])}`,
        step: Math.max(src, graph.dst[e]),
    }));
    await session.data.import({ type: "json", config: { data: JSON.stringify({ nodes, edges }) } });
    await session.layout.set("spiral");
    await session.layout.settle();
    await session.time.setField({ nodes: { start: "step" }, edges: { start: "step" } });
    await session.time.window({ from: 0, to: count / 2 - 1 });
    const layers: string[] = [];
    for (const target of ["node", "edge"] as const) {
        const { id } = await session.styles.add({
            name: `outside ${target}`,
            target,
            selector: { match: "state", state: "outsideWindow" },
            set: target === "node" ? { "node.opacity": 0.5 } : { "edge.opacity": 0.5 },
        });
        layers.push(id);
    }

    await session.styles.settled();
    await Promise.resolve();
    return { session, layers, edgeCount: edges.length };
}

/**
 * The window comparisons one action, its repaint and a recount of every layer make.
 * @param session - The session.
 * @param layers - The layers to recount.
 * @param sizes - How many nodes and edges.
 * @param sizes.node - How many nodes.
 * @param sizes.edge - How many edges.
 * @param act - The action.
 * @returns The comparisons.
 */
async function checksOf(
    session: ElementSession,
    layers: string[],
    sizes: { node: number; edge: number },
    act: () => Promise<unknown>,
): Promise<number> {
    const before = slideCounters.windowChecks;
    await act();
    await session.styles.settled();
    for (const id of layers) {
        session.styles.counts(id);
    }

    for (const target of ["node", "edge"] as const) {
        for (let index = 0; index < sizes[target]; index++) {
            session.visibility.outsideWindow(target, index);
        }
    }

    return slideCounters.windowChecks - before;
}

/**
 * The comparisons a layout apply, its undo and a timeline step make.
 * @param count - How many nodes.
 * @returns The comparisons per action.
 */
async function actions(count: number): Promise<{ layout: number; undo: number; step: number }> {
    const { session, layers, edgeCount } = await windowed(count);
    const sizes = { node: count, edge: edgeCount };
    const layout = await checksOf(session, layers, sizes, async () => {
        await session.layout.set("circular");
        await session.layout.settle();
    });
    const undo = await checksOf(session, layers, sizes, async () => {
        assert.strictEqual((await session.undo()).kind, "undone");
        await session.layout.settle();
    });
    const step = await checksOf(session, layers, sizes, () => session.time.stepBy(1));
    session.dispose();
    return { layout, undo, step };
}

describe("the time window's comparisons per action", () => {
    it("do not grow with the graph for a layout apply, an undo or a timeline step at 10,000 nodes", async () => {
        const small = await actions(200);
        const large = await actions(10_000);
        for (const name of ["layout", "undo", "step"] as const) {
            assert.isAtMost(
                large[name],
                small[name] + 20,
                `${name}: 200 nodes ${String(small[name])}, 10,000 nodes ${String(large[name])}`,
            );
            assert.isBelow(large[name], 200, `${name} at 10,000 nodes: ${String(large[name])}`);
        }
    });
});
