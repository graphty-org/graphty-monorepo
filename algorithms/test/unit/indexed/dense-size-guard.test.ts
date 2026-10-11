import { GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { afterEach, describe, expect, it, vi } from "vitest";

import { allPairsShortestPath } from "../../../src/indexed/all-pairs.js";
import { hierarchicalClustering } from "../../../src/indexed/hierarchical.js";
import { teraHAC } from "../../../src/indexed/terahac.js";

/** A path of n nodes. */
function path(n: number): GraphSnapshot {
    const b = new GraphBuilder({ directed: false });
    for (let i = 1; i < n; i++) {
        b.addEdge(i - 1, i);
    }
    return b.freeze();
}

/** Make every Float64Array and Uint32Array of `limit` or more elements fail as an engine out of memory does. */
function failAllocationsFrom(limit: number): void {
    for (const [name, Base] of [
        ["Float64Array", Float64Array],
        ["Uint32Array", Uint32Array],
    ] as const) {
        const Limited = class extends (Base as Float64ArrayConstructor) {
            constructor(...args: unknown[]) {
                if (typeof args[0] === "number" && args[0] >= limit) {
                    throw new RangeError("Array buffer allocation failed");
                }
                super(...(args as []));
            }
        };
        vi.stubGlobal(name, Limited);
    }
}

const cases = [
    { name: "teraHAC", run: (s: GraphSnapshot, maxNodes?: number) => teraHAC(s, { maxNodes }), bytesPerPair: 8 },
    {
        name: "hierarchicalClustering",
        run: (s: GraphSnapshot, maxNodes?: number) => hierarchicalClustering(s, { maxNodes }),
        bytesPerPair: 28,
    },
];

describe("n x n size guard", () => {
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    for (const { name, run, bytesPerPair } of cases) {
        it(`${name}: a caller-set maxNodes refuses before allocating, with E_TOO_LARGE and its params`, () => {
            const s = path(10);
            failAllocationsFrom(0); // any allocation at all would throw the engine's error instead
            const err = (() => {
                try {
                    run(s, 9);
                } catch (e) {
                    return e as RangeError & { code: string; params: unknown };
                }
                throw new Error("did not throw");
            })();
            vi.unstubAllGlobals();
            expect(err).toBeInstanceOf(RangeError);
            expect(err.code).toBe("E_TOO_LARGE");
            expect(err.params).toEqual({ nodeCount: 10, maxNodes: 9, bytes: bytesPerPair * 100 });
            expect(err.message).toMatch(/10 nodes exceeds maxNodes 9/);
        });

        it(`${name}: an allocation the engine refuses surfaces as E_TOO_LARGE, not a bare RangeError`, () => {
            const s = path(10);
            failAllocationsFrom(100);
            expect(() => run(s)).toThrow(
                expect.objectContaining({
                    code: "E_TOO_LARGE",
                    params: { nodeCount: 10, maxNodes: null, bytes: bytesPerPair * 100 },
                }),
            );
        });

        it(`${name}: no maxNodes, or one at the node count, runs as before`, () => {
            const s = path(10);
            const merges = (r: { left: Uint32Array; right: Uint32Array; distance: Float64Array }): number[][] => [
                Array.from(r.left),
                Array.from(r.right),
                Array.from(r.distance),
            ];
            expect(merges(run(s, 10))).toEqual(merges(run(s)));
        });
    }

    it("allPairsShortestPath's refusal carries the same params", () => {
        expect(() => allPairsShortestPath(path(3), { maxNodes: 2 })).toThrow(
            expect.objectContaining({ code: "E_TOO_LARGE", params: { nodeCount: 3, maxNodes: 2, bytes: 72 } }),
        );
    });
});
