/**
 * The default force layout (ngraph) settles a seeded graph in no more steps than it used to.
 *
 * Issue #3315 asked whether force layouts had become slower to settle. The step counts below were
 * measured with this file's graphs and seed at a commit from 2026-10-09 (8f0d5a6f77): Les
 * Miserables 118 steps in 3D and 147 in 2D, the 1,000-node graph 299 in 3D and 493 in 2D. Each
 * budget is that count plus 10%, so a change to the engine's forces, cooling, start placement or
 * rest test that makes it take noticeably more steps fails here. What is counted is steps, the
 * layout's own work: how many frames those steps take is pinned by test/browser/layout-pace.test.ts.
 */
import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { fetchDataset } from "@graphty/graph-samples";
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";

interface TestGraph {
    nodes: Node[];
    edges: Edge[];
}

function graphOf(ids: string[], pairs: [string, string][]): TestGraph {
    const byId = new Map(ids.map((id, index) => [id, { id, index } as unknown as Node]));
    const edges = pairs.map(
        ([s, d]) => ({ srcId: s, dstId: d, srcNode: byId.get(s), dstNode: byId.get(d) }) as unknown as Edge,
    );
    return { nodes: [...byId.values()], edges };
}

function miserables(): TestGraph {
    const file = resolve(import.meta.dirname, "../../examples/data/miserables.json");
    const raw = JSON.parse(readFileSync(file, "utf8")) as {
        nodes: { id: string }[];
        links: { source: string; target: string }[];
    };
    return graphOf(
        raw.nodes.map((n) => n.id),
        raw.links.map((l) => [l.source, l.target]),
    );
}

/**
 * A connected random graph: a random tree, then random chords, from a fixed generator.
 * @param n - nodes
 * @param m - edges
 * @returns the graph
 */
function larger(n: number, m: number): TestGraph {
    let state = 12345;
    const next = (): number => (state = (state * 16807) % 2147483647) / 2147483647;
    const ids = Array.from({ length: n }, (_, i) => `n${i}`);
    const pairs: [string, string][] = [];
    for (let i = 1; i < n; i++) {
        pairs.push([ids[i], ids[Math.floor(next() * i)]]);
    }
    while (pairs.length < m) {
        const a = Math.floor(next() * n);
        const b = Math.floor(next() * n);
        if (a !== b) {
            pairs.push([ids[a], ids[b]]);
        }
    }
    return graphOf(ids, pairs);
}

/**
 * A graph-samples dataset, read from graph-samples' build output instead of downloaded.
 * @param name - the dataset
 * @returns the graph
 */
async function dataset(name: string): Promise<TestGraph> {
    const file = resolve(import.meta.dirname, `../../../graph-samples/dist/data/v1/${name}.gsnp.gz`);
    const snapshot = await fetchDataset(name, { fetch: async () => new Response(await readFile(file)) });
    const ids = Array.from({ length: snapshot.nodeCount }, (_, i) => String(snapshot.ids.idOf(i)));
    const pairs: [string, string][] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        pairs.push([ids[snapshot.edgeSource(e)], ids[snapshot.edgeTarget(e)]]);
    }
    return graphOf(ids, pairs);
}

/**
 * Step a seeded ngraph layout until it says it is at rest.
 * @param graph - what to lay out
 * @param dim - 2 or 3 dimensions
 * @returns the steps it took
 */
function stepsToSettle(graph: TestGraph, dim: 2 | 3): number {
    const simulation = new NGraphEngine({ seed: 1, dim });
    layoutEngineInternals.addNodes(simulation, graph.nodes);
    layoutEngineInternals.addEdges(simulation, graph.edges);
    let steps = 0;
    while (!simulation.isSettled || steps === 0) {
        simulation.step();
        steps++;
    }
    return steps;
}

describe("the ngraph layout's steps to settle", () => {
    const cases: { name: string; graph: () => TestGraph; dim: 2 | 3; before: number }[] = [
        { name: "Les Miserables in 3D", graph: miserables, dim: 3, before: 118 },
        { name: "Les Miserables in 2D", graph: miserables, dim: 2, before: 147 },
        { name: "a 1,000-node graph in 3D", graph: () => larger(1000, 2000), dim: 3, before: 299 },
        { name: "a 1,000-node graph in 2D", graph: () => larger(1000, 2000), dim: 2, before: 493 },
    ];

    for (const { name, graph, dim, before } of cases) {
        it(`settles ${name} within 10% of the ${before} steps it took on 2026-10-09`, () => {
            const steps = stepsToSettle(graph(), dim);
            assert.isAtMost(steps, Math.ceil(before * 1.1), `settled in ${steps} steps`);
        });
    }
});

/**
 * Issue #7811: on Knuth's miles, a complete graph of 128 cities, the default force layout swung in
 * place at full speed and only stopped at the engine's 1,000-step cap. ngraph weighs a node by its
 * degree and multiplies the push between two nodes by both weights, so every node of a complete
 * graph is so stiff that the configured time step overshoots. A simulation that stalls swinging in
 * place now shortens its time step; one still coming to rest never does, so the other samples
 * settle at the very step they did before the fix (measured 2026-11-14, seed 1).
 *
 * Issue #7919: political-blogs in 3D also ran to the cap, though its stall was not read as one. Its
 * largest component kept its shape from about step 400 while the whole of it slid on, so its nodes
 * looked as if they were travelling. A stall now leaves out what every node moved together.
 */
describe("the ngraph layout on graph-samples datasets", () => {
    const cases: { name: string; dim: 2 | 3; steps: number; exact: boolean }[] = [
        // Before the fix both hit the 1,000-step cap; 313 and 202 with it, given 10% here.
        { name: "knuth-miles", dim: 3, steps: 313, exact: false },
        { name: "knuth-miles", dim: 2, steps: 202, exact: false },
        // Before #7919's fix it hit the 1,000-step cap; 612 with it, given 10% here.
        { name: "political-blogs", dim: 3, steps: 612, exact: false },
        { name: "political-blogs", dim: 2, steps: 701, exact: true },
        { name: "football", dim: 3, steps: 146, exact: true },
        { name: "football", dim: 2, steps: 168, exact: true },
        { name: "political-books", dim: 2, steps: 202, exact: true },
        { name: "dolphins", dim: 2, steps: 188, exact: true },
        { name: "yeast-perturbation", dim: 2, steps: 300, exact: true },
    ];

    for (const { name, dim, steps: expected, exact } of cases) {
        it(`settles ${name} in ${dim}D ${exact ? "at" : "within 10% of"} ${expected} steps`, async () => {
            const steps = stepsToSettle(await dataset(name), dim);
            if (exact) {
                assert.strictEqual(steps, expected, "a graph that came to rest is stepped exactly as before");
            } else {
                assert.isAtMost(steps, Math.ceil(expected * 1.1), `settled in ${steps} steps`);
            }
        });
    }
});
