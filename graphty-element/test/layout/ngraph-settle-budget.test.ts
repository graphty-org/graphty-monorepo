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
import { resolve } from "node:path";

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
