/**
 * @file Force applied again with a longer spring length, on a real `Graph`: the drawing moves and
 * settles into groups. Twice the published default is what a reader asks for when they want the
 * drawing spread out; when the published default was three times the one ngraph ran, "twice" was
 * six times, and the graph settled as a cloud.
 */

import "../../src/graphty-element";

import { lesMiserables } from "@graphty/graph-samples/datasets/les-miserables";
import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import type { GraphSession } from "../../src/session/types";

const TEST_TIMEOUT_MS = 60_000;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Les Miserables under force from seed 1, as the graphty app opens it.
 * @returns The graph.
 */
async function loaded(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "600px";
    container.style.height = "400px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    await graph.init();
    await graph.setLayout("force", { seed: 1 });
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    await graph.addNodes(ids.map((id) => ({ id })));
    await graph.addEdges([...sample.src].map((src, e) => ({ src: ids[src], dst: ids[sample.dst[e]] })));
    await operationQueueOf(graph).waitForCompletion();
    return graph;
}

/**
 * Step the layout until it reports settled (at most 1000 frames, the engine's own cap).
 * @param graph - The graph.
 */
function settle(graph: Graph): void {
    const manager = graph.getLayoutManager();
    for (let frame = 0; frame < 1100 && manager.running && !manager.layoutEngine?.isSettled; frame++) {
        graph.getUpdateManager().stepFrames(1);
    }
}

/**
 * Every node's published position, by row.
 * @param session - The session.
 * @returns One [x, y, z] per row.
 */
function positions(session: GraphSession): [number, number, number][] {
    const at = { x: 0, y: 0, z: 0 };
    const out: [number, number, number][] = [];
    for (let row = 0; row < session.snapshot().nodeCount; row++) {
        session.positions.read(row, at);
        out.push([at.x, at.y, at.z]);
    }

    return out;
}

/**
 * Mean edge length over mean distance between two nodes: a drawing in groups is well under 1,
 * a random cloud is near 1.
 * @param session - The session.
 * @returns The ratio.
 */
function edgeToPairRatio(session: GraphSession): number {
    const p = positions(session);
    const snapshot = session.snapshot();
    const d = (a: number, b: number): number => Math.hypot(p[a][0] - p[b][0], p[a][1] - p[b][1], p[a][2] - p[b][2]);
    const sample = lesMiserables();
    const ids = sample.ids ?? [];
    const rowOf = (i: number): number => snapshot.ids.requireIndex(ids[i]);
    let edgeSum = 0;
    for (let e = 0; e < sample.src.length; e++) {
        edgeSum += d(rowOf(sample.src[e]), rowOf(sample.dst[e]));
    }

    let pairs = 0;
    let pairSum = 0;
    for (let a = 0; a < p.length; a++) {
        for (let b = a + 1; b < p.length; b++) {
            pairSum += d(a, b);
            pairs++;
        }
    }

    return edgeSum / sample.src.length / (pairSum / pairs);
}

describe("force applied again with a longer spring length", () => {
    it(
        "moves the drawing and settles into groups",
        async () => {
            const graph = await loaded();
            const session = graph.getSession();
            settle(graph);
            const before = positions(session);

            const force = session.catalog.layouts().find((layout) => layout.id === "force");
            const declared = force?.options.find((option) => option.name === "springLength")?.default;
            assert.isNumber(declared);
            await session.layout.set("force", { options: { seed: 1, springLength: 2 * Number(declared) } });
            await operationQueueOf(graph).waitForCompletion();
            settle(graph);
            const after = positions(session);

            const moved = before.filter((p, row) => Math.hypot(p[0] - after[row][0], p[1] - after[row][1]) > 1);
            assert.isAbove(moved.length, before.length / 2, "most nodes moved");
            assert.isAtMost(edgeToPairRatio(session), 0.5, "the settled drawing is in groups, not a cloud");
        },
        TEST_TIMEOUT_MS,
    );
});
