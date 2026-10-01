/**
 * @file What a fixed set's edge member that no longer binds contributes (design/sets/sets-design.md
 * section 4.2): read listed, nothing -- its ends join only with the edge; read induced, its ends,
 * and an end the graph lacks is counted as a missing node.
 */

import { GraphBuilder, maskToIndices } from "@graphty/graph-format";
import { assert, describe, it } from "vitest";

import type { NodeId, SetDefinition } from "../../../src/catalog/types";
import { resolveFixed } from "../../../src/session/sets/resolve";

type Fixed = Extract<SetDefinition, { kind: "fixed" }>;

/**
 * Resolve a fixed definition over nodes a, b and c with one edge b-c, and name the nodes it holds.
 * @param definition - The definition.
 * @returns The member nodes, the missing counts.
 */
function resolve(definition: Fixed): { nodes: NodeId[]; missingNodes: number; missingEdges: number } {
    const builder = new GraphBuilder({ directed: false });
    for (const id of ["a", "b", "c"]) {
        builder.addNode(id);
    }

    builder.addEdgesByIds(["b"], ["c"]);
    const snapshot = builder.freeze();
    const resolution = resolveFixed(definition, { snapshot });

    return {
        nodes: Array.from(maskToIndices(resolution.nodes, snapshot.nodeCount), (i) => snapshot.ids.idOf(i)),
        missingNodes: resolution.missingNodes,
        missingEdges: resolution.missingEdges,
    };
}

describe("an edge member that does not bind", () => {
    it("read listed, leaves no end behind", () => {
        const result = resolve({
            kind: "fixed",
            nodes: ["a"],
            edges: [{ source: "a", target: "b", ordinal: 0, among: 1 }],
            reading: "listed",
        });
        assert.deepStrictEqual(result, { nodes: ["a"], missingNodes: 0, missingEdges: 1 });
    });

    it("read induced, is inert: it names no end and counts nothing missing", () => {
        const result = resolve({
            kind: "fixed",
            nodes: [],
            edges: [{ source: "a", target: "zz", ordinal: 0, among: 1 }],
            reading: "induced",
        });
        assert.deepStrictEqual(result, { nodes: [], missingNodes: 0, missingEdges: 0 });
    });

    it("read listed, a bound edge brings both its ends", () => {
        const result = resolve({
            kind: "fixed",
            nodes: [],
            edges: [{ source: "b", target: "c", ordinal: 0, among: 1 }],
            reading: "listed",
        });
        assert.deepStrictEqual(result, { nodes: ["b", "c"], missingNodes: 0, missingEdges: 0 });
    });
});
