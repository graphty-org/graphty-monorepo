/**
 * The grid and radial layouts: both names are in the public layout list, so each must be a
 * registered engine that `setLayout` can run, and each must place nodes the way its name says --
 * a lattice with equal spacing, and rings whose index is the hop distance from the root.
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import { layoutDescriptor } from "../../src/catalog/layouts";
import type { Edge } from "../../src/Edge";
import { LayoutEngine } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

/**
 * A node as a layout engine sees one.
 * @param id - the node id
 * @returns the stand-in
 */
function node(id: string): Node {
    return { id } as unknown as Node;
}

/**
 * An edge as a layout engine sees one.
 * @param src - the source node
 * @param dst - the destination node
 * @returns the stand-in
 */
function edge(src: Node, dst: Node): Edge {
    return { srcId: src.id, dstId: dst.id, srcNode: src, dstNode: dst } as unknown as Edge;
}

/**
 * Run a registered engine by the name `setLayout` takes, and read back each node's position.
 * @param type - the registered engine name
 * @param nodes - the nodes
 * @param edges - the edges
 * @param opts - the engine options
 * @returns the x, y of every node, keyed by id
 */
function run(type: string, nodes: Node[], edges: Edge[], opts: object = {}): Record<string, [number, number]> {
    const engine = LayoutEngine.get(type, opts);
    assert.isNotNull(engine, `"${type}" is a registered engine`);
    if (engine === null) {
        return {};
    }

    engine.addNodes(nodes);
    engine.addEdges(edges);
    engine.step();
    return Object.fromEntries(
        nodes.map((n) => {
            const p = engine.getNodePosition(n);
            return [String(n.id), [p.x, p.y]];
        }),
    );
}

describe("grid and radial layouts", () => {
    it("publishes both as served arrangements whose default engine has the same name", () => {
        assert.strictEqual(layoutDescriptor("grid")?.engine, "grid");
        assert.strictEqual(layoutDescriptor("radial")?.engine, "radial");
    });

    it("grid places nodes on a lattice with equal spacing", () => {
        const nodes = ["a", "b", "c", "d", "e", "f", "g", "h", "i"].map(node);
        const pos = run("grid", nodes, []);

        const xs = [...new Set(Object.values(pos).map(([x]) => x))].sort((l, r) => l - r);
        const ys = [...new Set(Object.values(pos).map(([, y]) => y))].sort((l, r) => l - r);
        assert.strictEqual(xs.length, 3);
        assert.strictEqual(ys.length, 3);
        assert.approximately(xs[1] - xs[0], xs[2] - xs[1], 1e-6);
        assert.approximately(ys[1] - ys[0], xs[1] - xs[0], 1e-6);
        assert.isAbove(xs[1] - xs[0], 0);
    });

    it("radial puts each node on the ring whose index is its hop distance from the root", () => {
        const [a, b, c, d] = ["a", "b", "c", "d"].map(node);
        const pos = run("radial", [a, b, c, d], [edge(a, b), edge(b, c), edge(c, d)], { root: "a" });

        const r = (id: string): number => Math.hypot(pos[id][0], pos[id][1]);
        assert.approximately(r("a"), 0, 1e-6);
        assert.approximately(r("c"), 2 * r("b"), 1e-4);
        assert.approximately(r("d"), 3 * r("b"), 1e-4);
        assert.isAbove(r("b"), 0);
    });
});
