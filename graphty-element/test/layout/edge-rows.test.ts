/**
 * Under renderPath "batched", an edge stored with no `Edge` still pulls its two nodes: d3 and
 * ngraph take it as an edge row (its id and its two node ids), as they take a node row with no
 * `Node` (`addRows`). The engines are driven directly; the nodes are the bare shape an engine reads.
 */
import { assert, describe, it } from "vitest";

import type { Edge } from "../../src/Edge";
import { D3GraphEngine } from "../../src/layout/D3GraphLayoutEngine";
import { layoutEngineInternals } from "../../src/layout/LayoutEngine";
import { NGraphEngine } from "../../src/layout/NGraphLayoutEngine";
import type { Node } from "../../src/Node";

function node(id: string, index: number): Node {
    return { id, index } as unknown as Node;
}

function edge(src: Node, dst: Node): Edge {
    return { id: `${src.id}-${dst.id}`, srcId: src.id, dstId: dst.id, srcNode: src, dstNode: dst } as unknown as Edge;
}

/**
 * How far apart two nodes are after a d3 simulation of them steps, with or without an edge row.
 * @param linked - Whether an edge row joins them.
 * @returns The distance.
 */
function d3Distance(linked: boolean): number {
    const a = node("a", 0);
    const b = node("b", 1);
    const simulation = new D3GraphEngine({ dim: 2 });
    layoutEngineInternals.addNodes(simulation, [a, b]);
    if (linked) {
        simulation.addEdgeRows([{ key: "e0", source: "a", target: "b" }]);
    }

    for (let i = 0; i < 50; i++) {
        simulation.step();
    }

    const p = simulation.getNodePosition(a);
    const q = simulation.getNodePosition(b);
    return Math.hypot(p.x - q.x, p.y - q.y);
}

describe("a force engine takes an edge with no Edge as an edge row", () => {
    it("pulls d3's two nodes together", () => {
        assert.isBelow(d3Distance(true), d3Distance(false), "the row's link holds the nodes closer than none");
    });

    it("lets d3 remove a node and the edge rows that named it, and keep stepping", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const c = node("c", 2);
        const simulation = new D3GraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b, c]);
        simulation.addEdgeRows([
            { key: "ab", source: "a", target: "b" },
            { key: "bc", source: "b", target: "c" },
        ]);
        simulation.step();

        simulation.removeNode(c);
        // d3 resolves every link's ends on the re-push and throws for one it cannot find.
        simulation.step();
        assert.deepStrictEqual(layoutEngineInternals.edgeProblems(simulation, new Map()), []);

        simulation.removeEdgeRows(["ab"]);
        simulation.step();
        assert.deepStrictEqual(layoutEngineInternals.edgeProblems(simulation, new Map()), []);
    });

    it("gives ngraph one link per pair, shared with the pair's Edges, until the last goes", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new NGraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        const ab = edge(a, b);
        layoutEngineInternals.addEdges(simulation, [ab]);
        simulation.addEdgeRows([
            { key: "r1", source: "b", target: "a" },
            { key: "r2", source: "a", target: "b" },
        ]);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 1, "one spring for the pair");

        simulation.removeEdge(ab);
        simulation.removeEdgeRows(["r1"]);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 1, "a row still on the pair keeps its spring");
        simulation.removeEdgeRows(["r2"]);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 0, "the last row takes it");
    });

    it("drops ngraph's edge rows with a node", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new NGraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        simulation.addEdgeRows([{ key: "r1", source: "a", target: "b" }]);

        simulation.removeNode(b);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 0);
        assert.deepStrictEqual(layoutEngineInternals.edgeProblems(simulation, new Map()), []);
        // A row link the node took with it is not there to remove again.
        simulation.removeEdgeRows(["r1"]);
        simulation.addEdgeRows([{ key: "r1", source: "a", target: "a2" }]);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 1);
    });
    // An `Edge` built late (the paint loop needs one) takes the row's link over: the layout keeps its
    // springs and stays settled, where dropping the row and adding the Edge unsettled it.
    it("hands an Edge built late its row's ngraph link, leaving the layout settled", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new NGraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        simulation.addEdgeRows([{ key: "r1", source: "a", target: "b" }]);
        while (!simulation.isSettled) {
            simulation.step();
        }

        const ab = edge(a, b);
        assert.isTrue(simulation.adoptEdgeRow("r1", ab));
        assert.isTrue(simulation.isSettled);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 1);
        assert.deepStrictEqual([...simulation.edges], [ab]);
        assert.isFalse(simulation.adoptEdgeRow("r1", ab), "the row has no link left to hand over");
        simulation.removeEdge(ab);
        assert.strictEqual(simulation.ngraph.getLinksCount(), 0);
    });

    it("hands an Edge built late its row's d3 link, without reheating", () => {
        const a = node("a", 0);
        const b = node("b", 1);
        const simulation = new D3GraphEngine({});
        layoutEngineInternals.addNodes(simulation, [a, b]);
        simulation.addEdgeRows([{ key: "r1", source: "a", target: "b" }]);
        simulation.step();

        const ab = edge(a, b);
        assert.isTrue(simulation.adoptEdgeRow("r1", ab));
        assert.isFalse(simulation.graphNeedsRefresh);
        assert.deepStrictEqual([...simulation.edges], [ab]);
        assert.deepStrictEqual(layoutEngineInternals.edgeProblems(simulation, new Map([["a-b", ab]])), []);
    });
});
