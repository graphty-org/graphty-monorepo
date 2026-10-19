/**
 * Every single-pass layout engine that declares `scalingFactor` in its options uses it: halving it
 * halves every coordinate. Each engine used to multiply by a constant of its own and ignore the
 * option it offered (issue #1323).
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

const ids = ["a", "b", "c", "d"];

/** The options each engine needs besides `scalingFactor`. */
const engines: [string, object][] = [
    ["bfs", { start: "a" }],
    ["bipartite", { nodes: ["a", "c"] }],
    ["circular", {}],
    ["grid", {}],
    ["kamada-kawai", {}],
    ["multipartite", { subsetKey: { first: ["a", "c"], second: ["b", "d"] } }],
    ["planar", {}],
    ["radial", {}],
    ["random", {}],
    ["shell", {}],
    ["spectral", {}],
    ["spiral", {}],
];

/**
 * Run an engine on the path a-b-c-d and read back every coordinate.
 * @param type - the registered engine name
 * @param opts - the engine options
 * @returns x, y, z of every node in order
 */
function run(type: string, opts: object): number[] {
    const engine = LayoutEngine.get(type, opts);
    assert.isNotNull(engine, `"${type}" is a registered engine`);
    if (engine === null) {
        return [];
    }

    const nodes = ids.map((id) => ({ id }) as unknown as Node);
    const edges = nodes
        .slice(1)
        .map((dst, i) => ({ srcId: nodes[i].id, dstId: dst.id, srcNode: nodes[i], dstNode: dst }) as unknown as Edge);
    layoutEngineInternals.addNodes(engine, nodes);
    layoutEngineInternals.addEdges(engine, edges);
    engine.step();
    return nodes.flatMap((n) => {
        const p = engine.getNodePosition(n);
        return [p.x, p.y, p.z ?? 0];
    });
}

describe("scalingFactor", () => {
    it.each(engines)("%s: halving it halves every coordinate", (type, opts) => {
        const full = run(type, { ...opts, scalingFactor: 100 });
        const half = run(type, { ...opts, scalingFactor: 50 });

        assert.isTrue(
            full.some((v) => Math.abs(v) > 1e-3),
            "the arrangement is not all at the origin",
        );
        // An eigenvector's sign is arbitrary, and spectral's comes out either way from run to run.
        const read = type === "spectral" ? Math.abs : (v: number): number => v;
        full.forEach((v, i) => {
            assert.approximately(read(half[i]), read(v) / 2, 1e-3, `coordinate ${String(i)}`);
        });
    });
});
