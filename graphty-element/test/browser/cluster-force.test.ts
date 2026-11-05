/**
 * @file `clusterBy` pulls the nodes that share a value together, on every force layout: by a node attribute, and by a run's
 * result named before the run exists.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { Graph, operationQueueOf } from "../../src/Graph";
import { laneOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";
import lesMiserablesGexf from "../helpers/corpus/gexf/lesmiserables.gexf?raw";

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A real `Graph` over a fresh canvas.
 * @returns The graph.
 */
async function makeGraph(): Promise<Graph> {
    const container = document.createElement("div");
    container.style.width = "400px";
    container.style.height = "300px";
    document.body.appendChild(container);
    const graph = new Graph(container);
    await graph.init();
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/** A ring whose four quarters are the four values of `side`: the force layouts draw it round, with no lumps. */
const NODES = Array.from({ length: 40 }, (_, i) => ({ id: `n${String(i)}`, side: Math.floor(i / 10) }));
const EDGES = NODES.map((node, i) => ({ src: node.id, dst: `n${String((i + 1) % 40)}` }));

/**
 * Steps the layout until it comes to rest.
 * @param graph - The graph.
 */
async function settle(graph: Graph): Promise<void> {
    await operationQueueOf(graph).waitForCompletion();
    const layout = graph.getLayoutManager();
    for (let frame = 0; frame < 4000 && !layout.isSettled; frame++) {
        layout.step();
    }
}

/**
 * The mean distance of a node to its group's centroid, over the arrangement's mean radius.
 * @param session - The session.
 * @param groupOf - A node's group.
 * @returns The ratio: smaller is tighter.
 */
function looseness(session: GraphSession, groupOf: (id: string | number) => unknown): number {
    const snapshot = session.snapshot();
    const at = laneOf(session).view(snapshot.nodeCount);
    const rows = Array.from({ length: snapshot.nodeCount }, (_, row) => row);
    const mean = (of: readonly number[]): number[] =>
        [0, 1, 2].map((axis) => of.reduce((sum, row) => sum + at[3 * row + axis], 0) / of.length);
    const away = (row: number, centre: readonly number[]): number =>
        Math.hypot(...centre.map((v, axis) => v - at[3 * row + axis]));
    const groups = new Map<unknown, number[]>();
    for (const row of rows) {
        const group = groupOf(snapshot.ids.idOf(row));
        groups.set(group, [...(groups.get(group) ?? []), row]);
    }

    const centre = mean(rows);
    const radius = rows.reduce((sum, row) => sum + away(row, centre), 0);
    let within = 0;
    for (const members of groups.values()) {
        const own = mean(members);
        within += members.reduce((sum, row) => sum + away(row, own), 0);
    }

    return within / radius;
}

const sideOf = (id: string | number): unknown => Math.floor(Number(String(id).slice(1)) / 10);

describe("clusterBy", () => {
    for (const [layout, options] of [
        ["ngraph", { dim: 2, seed: 5 }],
        ["d3", { dim: 2 }],
        ["forceatlas2", { dim: 2, seed: 5, maxIter: 300 }],
        ["spring", { dim: 2, seed: 5, iterations: 300 }],
    ] as const) {
        it(`${layout}: pulls the nodes sharing an attribute together, and leaves the layout alone unset`, async () => {
            const run = async (extra: object): Promise<number> => {
                const graph = await makeGraph();
                const session = graph.getSession();
                await graph.addNodes(NODES);
                await graph.addEdges(EDGES);
                await operationQueueOf(graph).waitForCompletion();
                await session.layout.set(layout, { options: { ...options, ...extra } });
                await settle(graph);
                return looseness(session, sideOf);
            };

            const free = await run({});
            const pulled = await run({ clusterBy: "data.side", clusterStrength: 8 });
            assert.isBelow(pulled, free * 0.8);
        });
    }

    it("reads a bare attribute name from each node's data", async () => {
        const graph = await makeGraph();
        const session = graph.getSession();
        await graph.addNodes(NODES);
        await graph.addEdges(EDGES);
        await operationQueueOf(graph).waitForCompletion();
        await session.layout.set("forceatlas2", {
            options: { dim: 2, seed: 5, maxIter: 300, clusterBy: "side", clusterStrength: 8 },
        });
        await settle(graph);
        assert.isBelow(looseness(session, sideOf), 0.6);
    });

    for (const layout of ["ngraph", "forceatlas2", "spring"] as const) {
        it(`${layout}: named before the run exists, the layout moves when Louvain lands and needs no other call`, async () => {
            const graph = await makeGraph();
            const session = graph.getSession();
            await graph.addDataFromSource("gexf", { data: lesMiserablesGexf });
            await operationQueueOf(graph).waitForCompletion();
            await session.layout.set(layout, {
                options: { dim: 2, seed: 5, clusterBy: "results.louvain.group", clusterStrength: 4 },
            });
            await settle(graph);

            const result = await session.runs.start("louvain", {}, { as: "louvain", style: false });
            const groupOf = (id: string | number): unknown => result.node(id)?.group;
            const before = looseness(session, groupOf);
            await settle(graph);
            assert.isBelow(looseness(session, groupOf), before * 0.9);
        });
    }

    it("publishes clusterBy as a partition of nodes on the default force layout", async () => {
        const graph = await makeGraph();
        const layout = graph
            .getSession()
            .catalog.layouts()
            .find((candidate) => candidate.engine === "ngraph");
        const option = layout?.options.find((candidate) => candidate.name === "clusterBy");
        assert.strictEqual(option?.type, "partition");
        assert.strictEqual(option?.on, "node");
    });
});
