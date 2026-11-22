/**
 * Appending to a sorted core gives, array for array, what sorting every edge again gives: the
 * freeze after an added edge or node extends the last core instead of re-sorting a million edges.
 */
import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { appendIntoCore, type SortInput, sortIntoCore, type SortResult } from "../../src/builder/counting-sort.js";
import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { assertInvariants } from "../helpers/invariants.js";

const RUNS = Number(process.env.FC_RUNS ?? 300);

/** A graph: node count, edges and optional weights. */
interface Graph {
    readonly nodes: number;
    readonly src: number[];
    readonly dst: number[];
    readonly weights: number[] | null;
}

function input(graph: Graph, directed: boolean, edges = graph.src.length, nodes = graph.nodes): SortInput {
    return {
        directed,
        nodeCount: nodes,
        edgeCount: edges,
        src: Uint32Array.from(graph.src),
        dst: Uint32Array.from(graph.dst),
        weights: graph.weights === null ? null : Float64Array.from(graph.weights),
    };
}

function plain(result: SortResult): unknown {
    const { core } = result;
    return {
        rowPtr: [...core.rowPtr],
        colIdx: [...core.colIdx],
        weights: core.weights === null ? null : [...core.weights],
        arcToEdge: core.arcToEdge === null ? null : [...core.arcToEdge],
        edgeToArc: core.edgeToArc === null ? null : [...core.edgeToArc],
        arcCount: result.arcCount,
        selfLoopCount: result.selfLoopCount,
        flags: result.flags,
        arena: core.arena === null,
    };
}

const arbCase = fc
    .record({
        nodes: fc.integer({ min: 1, max: 30 }),
        grow: fc.integer({ min: 0, max: 4 }),
        edges: fc.integer({ min: 16, max: 120 }),
        extra: fc.integer({ min: 0, max: 6 }),
        weighted: fc.boolean(),
        directed: fc.boolean(),
        arena: fc.boolean(),
        seed: fc.integer(),
    })
    .map((spec) => {
        let state = spec.seed >>> 0;
        const next = (n: number): number => {
            state = (state * 1664525 + 1013904223) >>> 0;
            return state % n;
        };
        const total = spec.nodes + spec.grow;
        const all = spec.edges + spec.extra;
        const src: number[] = [];
        const dst: number[] = [];
        for (let e = 0; e < all; e++) {
            const n = e < spec.edges ? spec.nodes : total;
            src.push(next(n));
            dst.push(next(n));
        }
        const weights = spec.weighted ? Array.from({ length: all }, () => next(5) - 1) : null;
        return { spec, graph: { nodes: total, src, dst, weights } };
    });

describe("appendIntoCore", () => {
    it("builds what a full sort builds after edges and nodes are appended", () => {
        fc.assert(
            fc.property(arbCase, ({ spec, graph }) => {
                const before = sortIntoCore(input(graph, spec.directed, spec.edges, spec.nodes), false);
                if (before.core.arcToEdge === null) {
                    return;
                }
                const after = input(graph, spec.directed);
                const appended = appendIntoCore(before, spec.nodes, spec.edges, after, spec.arena);
                const full = sortIntoCore(after, spec.arena);
                // Above its share of the sorted edges it leaves the sort to a full one.
                if (spec.extra > Math.max(1, spec.edges / 16)) {
                    expect(appended).toBeNull();
                    return;
                }
                expect(appended).not.toBeNull();
                expect(plain(appended as SortResult)).toEqual(plain(full));
            }),
            { numRuns: RUNS },
        );
    });

    it("is what a builder freezes after an added edge, node and loop", () => {
        for (const directed of [true, false]) {
            const builder = new GraphBuilder({ directed, addMissingNodes: true });
            for (let e = 0; e < 400; e++) {
                builder.addEdge(e % 37, (e * 7) % 41, 1 + (e % 3));
            }
            const first = builder.freeze();
            builder.addEdge(3, 3, 2);
            builder.addEdge(40, 99, 1);
            builder.addNode("lonely");
            const extended = builder.freeze();
            assertInvariants(extended);
            const fresh = new GraphBuilder({ directed, addMissingNodes: true });
            for (let e = 0; e < 400; e++) {
                fresh.addEdge(e % 37, (e * 7) % 41, 1 + (e % 3));
            }
            fresh.addEdge(3, 3, 2);
            fresh.addEdge(40, 99, 1);
            fresh.addNode("lonely");
            const sorted = fresh.freeze();
            expect([...extended.rowPtr]).toEqual([...sorted.rowPtr]);
            expect([...extended.colIdx]).toEqual([...sorted.colIdx]);
            expect([...extended.arcToEdge]).toEqual([...sorted.arcToEdge]);
            expect([...extended.edgeToArc]).toEqual([...sorted.edgeToArc]);
            expect(extended.flags).toEqual(sorted.flags);
            expect(extended.colIdx.buffer).not.toBe(first.colIdx.buffer);
        }
    });

    it("throws E_INVALID_WEIGHT for an appended NaN weight, as the full sort does", () => {
        const graph: Graph = {
            nodes: 4,
            src: [...Array(20).keys()].map((i) => i % 4),
            dst: [...Array(20).keys()].map((i) => (i + 1) % 4),
            weights: Array(20).fill(1),
        };
        const before = sortIntoCore(input(graph, false, 19), false);
        const nan = { ...graph, weights: [...(Array(19).fill(1) as number[]), Number.NaN] };
        expect(() => appendIntoCore(before, 4, 19, input(nan, false), true)).toThrow(
            expect.objectContaining({ code: "E_INVALID_WEIGHT" }),
        );
    });
});

describe("columns across freezes", () => {
    it("shares a column nothing wrote since the last freeze, and copies one that was written or is mutable", () => {
        const builder = new GraphBuilder({ directed: true, addMissingNodes: true });
        for (let e = 0; e < 50; e++) {
            builder.addEdge(e % 10, (e * 3) % 10);
        }
        builder.declareNodeColumn({ name: "kept", dtype: "f64" });
        builder.declareNodeColumn({ name: "written", dtype: "f64" });
        builder.declareNodeColumn({ name: "live", dtype: "f64", mutable: true });
        for (let row = 0; row < 10; row++) {
            builder.setNodeValue("kept", row, row);
            builder.setNodeValue("written", row, row);
            builder.setNodeValue("live", row, row);
        }
        const first = builder.freeze();
        builder.setNodeValue("written", 3, 30);
        const second = builder.freeze();
        expect(second.nodes.get("kept")).toBe(first.nodes.get("kept"));
        expect(second.nodes.get("written")).not.toBe(first.nodes.get("written"));
        expect(second.nodes.get("live")).not.toBe(first.nodes.get("live"));
        expect(second.nodes.value("written", 3)).toBe(30);
        expect(first.nodes.value("written", 3)).toBe(3);
        // A new node grows every column: none is shared.
        builder.addNode("new");
        const third = builder.freeze();
        expect(third.nodes.get("kept")).not.toBe(second.nodes.get("kept"));
        assertInvariants(third);
    });
});
