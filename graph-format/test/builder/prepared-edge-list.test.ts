/**
 * A freeze asked to prepare the edge list copies it from the staging it sorted, instead of walking every
 * arc of the new core: the same arrays, value for value, as computing it from the snapshot, after
 * adds, removed edges and removed nodes, weighted or not, directed or not, with self-loops.
 */
import fc from "fast-check";
import { describe, expect, it, vi } from "vitest";

import { GraphBuilder } from "../../src/builder/graph-builder.js";
import { peekView } from "../../src/snapshot/graph-snapshot.js";
import * as views from "../../src/snapshot/views.js";

const RUNS = Number(process.env.FC_RUNS ?? 300);

const arbCase = fc.record({
    nodes: fc.integer({ min: 1, max: 40 }),
    edges: fc.integer({ min: 0, max: 200 }),
    dropNodes: fc.integer({ min: 0, max: 3 }),
    dropEdges: fc.integer({ min: 0, max: 6 }),
    weighted: fc.boolean(),
    directed: fc.boolean(),
    seed: fc.integer(),
});

describe("freeze with prepare: ['edgeList']", () => {
    it("prepares what computing the edge list gives, through adds and removals", () => {
        fc.assert(
            fc.property(arbCase, (spec) => {
                let state = spec.seed >>> 0;
                const next = (n: number): number => {
                    state = (state * 1664525 + 1013904223) >>> 0;
                    return state % n;
                };
                const builder = new GraphBuilder({ directed: spec.directed });
                builder.addAnonymousNodes(spec.nodes);
                for (let e = 0; e < spec.edges; e++) {
                    builder.addEdgeByIndex(next(spec.nodes), next(spec.nodes), spec.weighted ? next(7) : undefined);
                }
                // Two freezes: the second one sorts by filtering the first's core, as an edit does.
                for (const round of [0, 1]) {
                    if (round === 1) {
                        for (let k = 0; k < spec.dropEdges && builder.edgeBound > 0; k++) {
                            builder.removeEdge(next(builder.edgeBound));
                        }
                        const gone = new Set(Array.from({ length: spec.dropNodes }, () => next(spec.nodes)));
                        for (const node of gone) {
                            builder.removeNodeByIndex(node);
                        }
                    }
                    const { snapshot } = builder.freezeWithReport({ prepare: ["edgeList"] });
                    const prepared = peekView(snapshot, "edgeList");
                    const computed = views.computeEdgeList(snapshot);
                    expect(prepared).not.toBeNull();
                    expect([...(prepared?.src ?? [])]).toEqual([...computed.src]);
                    expect([...(prepared?.dst ?? [])]).toEqual([...computed.dst]);
                    expect(prepared?.weights === null ? null : [...(prepared?.weights ?? [])]).toEqual(
                        computed.weights === null ? null : [...computed.weights],
                    );
                }
            }),
            { numRuns: RUNS },
        );
    });

    it("does not walk the core to prepare it", () => {
        const builder = new GraphBuilder({ directed: false });
        builder.addAnonymousNodes(50);
        for (let e = 0; e < 300; e++) {
            builder.addEdgeByIndex((e * 7) % 50, (e * 13 + 1) % 50);
        }
        builder.freeze();
        builder.removeEdge(3);
        const compute = vi.spyOn(views, "computeEdgeList");
        try {
            const { snapshot } = builder.freezeWithReport({ prepare: ["edgeList"] });
            expect(snapshot.edgeList().src.length).toBe(299);
            expect(compute).not.toHaveBeenCalled();
        } finally {
            compute.mockRestore();
        }
    });
});
