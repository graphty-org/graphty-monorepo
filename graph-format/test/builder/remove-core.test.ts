/**
 * Removing from a sorted core gives, array for array, what sorting every remaining edge again gives:
 * the freeze after a removed edge or node filters the last core instead of re-sorting a million edges.
 */
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import * as sorting from "../../src/builder/counting-sort.js";
import { removeFromCore, type SortInput, sortIntoCore, type SortResult } from "../../src/builder/counting-sort.js";
import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { INVALID_INDEX } from "../../src/constants.js";
import { assertInvariants } from "../helpers/invariants.js";

const RUNS = Number(process.env.FC_RUNS ?? 300);

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
    };
}

/** A remap that keeps the indices `keep` says, in order. */
function remapOf(bound: number, keep: (i: number) => boolean): Uint32Array<ArrayBuffer> {
    const remap = new Uint32Array(bound);
    let next = 0;
    for (let i = 0; i < bound; i++) {
        remap[i] = keep(i) ? next++ : INVALID_INDEX;
    }
    return remap;
}

const arbCase = fc.record({
    nodes: fc.integer({ min: 1, max: 60 }),
    edges: fc.integer({ min: 1, max: 400 }),
    dropNodes: fc.integer({ min: 0, max: 2 }),
    dropEdges: fc.integer({ min: 0, max: 6 }),
    weighted: fc.boolean(),
    directed: fc.boolean(),
    arena: fc.boolean(),
    seed: fc.integer(),
});

describe("removeFromCore", () => {
    it("builds what a full sort builds after nodes and edges are removed", () => {
        let compared = 0;
        fc.assert(
            fc.property(arbCase, (spec) => {
                let state = spec.seed >>> 0;
                const next = (n: number): number => {
                    state = (state * 1664525 + 1013904223) >>> 0;
                    return state % n;
                };
                const src = Array.from({ length: spec.edges }, () => next(spec.nodes));
                const dst = Array.from({ length: spec.edges }, () => next(spec.nodes));
                const weights = spec.weighted ? Array.from({ length: spec.edges }, () => next(5) - 1) : null;
                const goneNodes = new Set(Array.from({ length: spec.dropNodes }, () => next(spec.nodes)));
                const goneEdges = new Set(Array.from({ length: spec.dropEdges }, () => next(spec.edges)));
                // A removed node takes its edges with it, as the builder's removal does.
                const keepEdge = (e: number): boolean =>
                    !goneEdges.has(e) && !goneNodes.has(src[e]) && !goneNodes.has(dst[e]);
                const nodeRemap = remapOf(spec.nodes, (u) => !goneNodes.has(u));
                const edgeRemap = remapOf(spec.edges, keepEdge);
                const before = sortIntoCore(
                    {
                        directed: spec.directed,
                        nodeCount: spec.nodes,
                        edgeCount: spec.edges,
                        src: Uint32Array.from(src),
                        dst: Uint32Array.from(dst),
                        weights: weights === null ? null : Float64Array.from(weights),
                    },
                    false,
                );
                const keptEdges = [...Array(spec.edges).keys()].filter(keepEdge);
                const after: SortInput = {
                    directed: spec.directed,
                    nodeCount: spec.nodes - goneNodes.size,
                    edgeCount: keptEdges.length,
                    src: Uint32Array.from(keptEdges, (e) => nodeRemap[src[e]]),
                    dst: Uint32Array.from(keptEdges, (e) => nodeRemap[dst[e]]),
                    weights: weights === null ? null : Float64Array.from(keptEdges, (e) => weights[e]),
                };
                const removed = removeFromCore(before, nodeRemap, edgeRemap, after, spec.arena);
                const gone = spec.nodes - after.nodeCount + (spec.edges - after.edgeCount);
                // An identity core keeps no permutation to filter, and past its share a full sort is as fast.
                if (before.core.arcToEdge === null || gone > Math.max(1, spec.edges / 16)) {
                    expect(removed).toBeNull();
                    return;
                }
                const full = sortIntoCore(after, spec.arena);
                // A directed list left in CSR order sorts to the identity core, which the full sort lays out.
                if (full.flags.arcToEdgeIsIdentity) {
                    expect(removed).toBeNull();
                    compared++;
                    return;
                }
                expect(plain(removed as SortResult)).toEqual(plain(full));
                compared++;
            }),
            { numRuns: RUNS },
        );
        expect(compared, "most cases are compared with a full sort").toBeGreaterThan(RUNS / 4);
    });

    it("is what a builder freezes after a removed edge and node, without sorting again", () => {
        for (const directed of [true, false]) {
            const build = (): GraphBuilder => {
                const builder = new GraphBuilder({ directed, addMissingNodes: true });
                for (let e = 0; e < 400; e++) {
                    builder.addEdge(e % 37, (e * 7) % 41, 1 + (e % 3));
                }
                builder.addEdge(5, 5, 2);
                return builder;
            };
            const builder = build();
            builder.freeze();
            const sort = vi.spyOn(sorting, "sortIntoCore");
            builder.removeEdge(17);
            const lessAnEdge = builder.freeze();
            builder.removeNode(5);
            const lessANode = builder.freeze();
            const sorts = sort.mock.calls.length;
            sort.mockRestore();
            assertInvariants(lessAnEdge);
            assertInvariants(lessANode);
            expect(sorts, "neither removal sorts every edge again").toBe(0);

            const fresh = build();
            fresh.removeEdge(17);
            fresh.removeNode(5);
            const sorted = fresh.freeze();
            expect([...lessANode.rowPtr]).toEqual([...sorted.rowPtr]);
            expect([...lessANode.colIdx]).toEqual([...sorted.colIdx]);
            expect([...lessANode.arcToEdge]).toEqual([...sorted.arcToEdge]);
            expect([...lessANode.edgeToArc]).toEqual([...sorted.edgeToArc]);
            expect(lessANode.weights === null ? null : [...lessANode.weights]).toEqual(
                sorted.weights === null ? null : [...sorted.weights],
            );
            expect(lessANode.flags).toEqual(sorted.flags);
        }
    });

    it("freezes, removal after removal, the graph of what is left, its lists included", () => {
        fc.assert(
            fc.property(
                fc.record({
                    directed: fc.boolean(),
                    nodes: fc.integer({ min: 2, max: 40 }),
                    edges: fc.integer({ min: 1, max: 300 }),
                    steps: fc.array(fc.record({ node: fc.boolean(), pick: fc.nat() }), { minLength: 1, maxLength: 6 }),
                    seed: fc.integer(),
                }),
                (spec) => {
                    let state = spec.seed >>> 0;
                    const next = (n: number): number => {
                        state = (state * 1664525 + 1013904223) >>> 0;
                        return state % n;
                    };
                    let nodes = Array.from({ length: spec.nodes }, (_, n) => n);
                    let edges = Array.from({ length: spec.edges }, () => [next(spec.nodes), next(spec.nodes)]);
                    const build = (): GraphBuilder => {
                        const builder = new GraphBuilder({ directed: spec.directed, addMissingNodes: true });
                        for (const n of nodes) {
                            builder.addNode(n);
                        }
                        for (const [u, v] of edges) {
                            builder.addEdge(u, v);
                        }
                        return builder;
                    };
                    const same = (
                        a: ReturnType<GraphBuilder["freeze"]>,
                        b: ReturnType<GraphBuilder["freeze"]>,
                    ): void => {
                        expect([...a.rowPtr]).toEqual([...b.rowPtr]);
                        expect([...a.colIdx]).toEqual([...b.colIdx]);
                        expect([...a.arcToEdge]).toEqual([...b.arcToEdge]);
                        expect([...a.edgeToArc]).toEqual([...b.edgeToArc]);
                    };
                    // Each step removes a node (by id: its edges are found through the staging's lists) or an
                    // edge, and freezes: the lists a removal leaves are the ones the next removal walks.
                    const stepwise = build();
                    stepwise.freeze();
                    for (const step of spec.steps) {
                        if (step.node && nodes.length > 1) {
                            const id = nodes[step.pick % nodes.length];
                            stepwise.removeNode(id);
                            nodes = nodes.filter((n) => n !== id);
                            edges = edges.filter(([u, v]) => u !== id && v !== id);
                        } else if (!step.node && edges.length > 0) {
                            const at = step.pick % edges.length;
                            stepwise.removeEdge(at);
                            edges = edges.filter((_, e) => e !== at);
                        }
                        const frozen = stepwise.freeze();
                        assertInvariants(frozen);
                        same(frozen, build().freeze());
                    }
                },
            ),
            { numRuns: RUNS },
        );
    });
});
