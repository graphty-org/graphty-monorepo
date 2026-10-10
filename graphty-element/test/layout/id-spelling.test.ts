/**
 * @file A layout option that names a node takes an integer id in either spelling: `1` names node
 * `"1"`, as every other node lookup in the element does.
 */
import "../../src/layout";

import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { LayoutEngine, layoutEngineInternals } from "../../src/layout/LayoutEngine";
import type { Node } from "../../src/Node";

/**
 * Run bipartite on the path "1"-"2"-"3"-"4", node ids held as text, and read every coordinate.
 * @param top - the nodes the option names as one side
 * @returns x, y, z of every node in order
 */
function bipartite(top: readonly (string | number)[]): number[] {
    const engine = LayoutEngine.get("bipartite", { nodes: top });
    assert.isNotNull(engine);
    if (engine === null) {
        return [];
    }

    const nodes = ["1", "2", "3", "4"].map((id) => ({ id }) as unknown as Node);
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

describe("either spelling of an integer id in a layout option", () => {
    it("bipartite's nodes find the node by the number it spells", () => {
        assert.deepEqual(bipartite([1, 3]), bipartite(["1", "3"]));
        assert.notDeepEqual(bipartite(["1", "3"]), bipartite([]), "naming the side changes the arrangement");
    });
});
