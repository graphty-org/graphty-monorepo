/**
 * @file The shell, layers and bipartite layouts group nodes by a `groupBy` attribute -- a node
 * attribute or a run's partition such as Louvain's `group` -- on a real `Graph`.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import { isGraphtyError } from "../../src/errors";
import { Graph, operationQueueOf } from "../../src/Graph";
import { laneOf } from "../../src/session/GraphSession";
import type { GraphSession } from "../../src/session/types";
import lesMiserablesGexf from "../helpers/corpus/gexf/lesmiserables.gexf?raw";

/** Per-test budget: each builds a real Babylon scene. */
const TEST_TIMEOUT_MS = 30_000;

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
    await graph.setLayout("circular");
    cleanups.push(() => {
        graph.dispose();
        container.remove();
    });
    return graph;
}

/**
 * Every node's coordinates, by id.
 * @param session - The session.
 * @returns The coordinates.
 */
function coordinates(session: GraphSession): Map<string | number, [number, number]> {
    const snapshot = session.snapshot();
    const coords = laneOf(session).view(snapshot.nodeCount);
    const out = new Map<string | number, [number, number]>();
    for (let row = 0; row < snapshot.nodeCount; row++) {
        out.set(snapshot.ids.idOf(row), [coords[3 * row], coords[3 * row + 1]]);
    }

    return out;
}

/**
 * The distinct values a measure takes over each group, rounded so float noise does not split one.
 * @param groups - The node ids of each group.
 * @param measure - The measure of a node.
 * @returns One set of rounded values per group.
 */
function valuesPerGroup(
    groups: Map<unknown, (string | number)[]>,
    measure: (id: string | number) => number,
): Set<number>[] {
    return [...groups.values()].map((ids) => new Set(ids.map((id) => Math.round(measure(id) * 100) / 100)));
}

/**
 * Assert each group sits on one value of a measure, and no two groups share one.
 * @param groups - The node ids of each group.
 * @param measure - The measure of a node.
 * @param what - What the measure is, for the message.
 */
function assertOneValueEach(
    groups: Map<unknown, (string | number)[]>,
    measure: (id: string | number) => number,
    what: string,
): void {
    const values = valuesPerGroup(groups, measure);
    for (const set of values) {
        assert.strictEqual(set.size, 1, `each group shares one ${what}`);
    }

    assert.strictEqual(new Set(values.map((set) => [...set][0])).size, groups.size, `each group has its own ${what}`);
}

describe("grouping nodes by an attribute", () => {
    it(
        "puts each Louvain community of Les Miserables on its own ring and in its own column",
        async () => {
            const graph = await makeGraph();
            const session = graph.getSession();
            await graph.addDataFromSource("gexf", { data: lesMiserablesGexf });
            await operationQueueOf(graph).waitForCompletion();

            const result = await session.runs.start("louvain", {}, { as: "louvain", style: false });
            const groups = new Map<unknown, (string | number)[]>();
            for (const id of session.snapshot().ids) {
                const group = result.node(id)?.group;
                groups.set(group, [...(groups.get(group) ?? []), id]);
            }
            assert.isAbove(groups.size, 2, "Louvain finds several communities");

            await session.layout.set("shell", { options: { groupBy: "results.louvain.group" } });
            await graph.waitForSettled();
            let at = coordinates(session);
            assertOneValueEach(groups, (id) => Math.hypot(...(at.get(id) ?? [Number.NaN, Number.NaN])), "radius");

            await session.layout.set("layers", { options: { groupBy: "results.louvain.group" } });
            await graph.waitForSettled();
            at = coordinates(session);
            assertOneValueEach(groups, (id) => at.get(id)?.[0] ?? Number.NaN, "column");
        },
        TEST_TIMEOUT_MS,
    );

    it(
        "splits a two-valued attribute into two columns, and refuses three without changing anything",
        async () => {
            const graph = await makeGraph();
            const session = graph.getSession();
            const sides = ["a", "b", "a", "b", "a", "b"];
            await graph.addNodes(sides.map((side, i) => ({ id: `n${String(i)}`, side, tri: i % 3 })));
            await graph.addEdges(sides.slice(1).map((_, i) => ({ src: `n${String(i)}`, dst: `n${String(i + 1)}` })));
            await operationQueueOf(graph).waitForCompletion();

            await session.layout.set("bipartite", { options: { groupBy: "data.side" } });
            await graph.waitForSettled();
            const at = coordinates(session);
            const groups = new Map<unknown, (string | number)[]>([
                ["a", ["n0", "n2", "n4"]],
                ["b", ["n1", "n3", "n5"]],
            ]);
            assertOneValueEach(groups, (id) => at.get(id)?.[0] ?? Number.NaN, "column");

            let refusal: unknown;
            try {
                await session.layout.set("bipartite", { options: { groupBy: "tri" } });
            } catch (error) {
                refusal = error;
            }

            assert.isTrue(isGraphtyError(refusal), "three groups are refused");
            assert.strictEqual((refusal as { code?: string }).code, "E_OPTION_RANGE");
            assert.deepStrictEqual(session.layout.options, { groupBy: "data.side" }, "the layout is unchanged");
            assert.deepStrictEqual([...coordinates(session)], [...at], "no node moved");
        },
        TEST_TIMEOUT_MS,
    );

    it("publishes groupBy as a partition of nodes on all three layouts", () => {
        const graph = new Graph(document.createElement("div"));
        cleanups.push(() => {
            graph.dispose();
        });
        for (const id of ["shell", "layers", "bipartite"]) {
            const option = graph
                .getSession()
                .catalog.layouts()
                .find((layout) => layout.id === id)
                ?.options.find((candidate) => candidate.name === "groupBy");
            assert.strictEqual(option?.type, "partition", id);
            assert.strictEqual(option?.on, "node", id);
        }
    });
});
