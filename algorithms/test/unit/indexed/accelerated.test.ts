import type { GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { accelerated, type AlgorithmAccelerator, type PageRankResultLike, toSnapshot } from "../../../src/index.js";
import { Graph } from "../../../src/core/graph.js";

// No vi.fn anywhere: algorithms has no mock-injection convention (plan decision PD-13) and a plain
// literal with a closed-over call log proves everything the design asks for.
function cycle(): GraphSnapshot {
    const g = new Graph({ directed: true });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    g.addEdge("c", "a");
    return toSnapshot(g);
}

describe("accelerated(acc)", () => {
    it("delegates to a method the accelerator has", async () => {
        const s = cycle();
        const calls: string[] = [];
        const fixture: PageRankResultLike = {
            scores: Float64Array.of(0.5, 0.25, 0.25),
            iterations: 7,
            converged: true,
            danglingMass: 0,
        };
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: (snapshot) => {
                calls.push("pageRank");
                expect(snapshot).toBe(s);
                return Promise.resolve(fixture);
            },
        };
        const result = await accelerated(fake).pageRank(s);
        expect(calls).toEqual(["pageRank"]);
        expect(result).toBe(fixture);
        expect(result.iterations).toBe(7);
    });

    it("runs the CPU port for a method the accelerator does NOT have", async () => {
        const s = cycle();
        const bare: AlgorithmAccelerator = { kind: "fake" };
        const result = await accelerated(bare).pageRank(s);
        expect(result.scores).toBeInstanceOf(Float64Array);
        expect(result.scores.length).toBe(3);
        let sum = 0;
        for (let i = 0; i < result.scores.length; i++) {
            sum += result.scores[i];
        }
        expect(sum).toBeCloseTo(1, 9);
    });

    it("runs the CPU port for null and for undefined, and reports the accelerator as null", async () => {
        const s = cycle();
        expect(accelerated(null).accelerator).toBeNull();
        expect(accelerated(undefined).accelerator).toBeNull();
        const viaNull = await accelerated(null).connectedComponents(s.toUndirected().snapshot);
        expect(viaNull.count).toBe(1);
    });

    it("lets a throwing accelerator method propagate unchanged -- there is no fallback", async () => {
        const s = cycle();
        const boom = new Error("E_DEVICE_LOST");
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            pageRank: () => Promise.reject(boom),
        };
        await expect(accelerated(fake).pageRank(s)).rejects.toBe(boom);

        const throwsSync: AlgorithmAccelerator = {
            kind: "fake",
            connectedComponents: () => {
                throw boom;
            },
        };
        expect(() => accelerated(throwsSync).connectedComponents(s)).toThrow(boom);
    });

    it("decorates an accelerator's bare SSSP result with pathTo and pathEdges", async () => {
        const g = new Graph({ directed: true });
        g.addEdge("a", "b", 1);
        g.addEdge("b", "c", 1);
        g.addEdge("a", "c", 5);
        const s = toSnapshot(g);
        const a = s.ids.requireIndex("a");
        const c = s.ids.requireIndex("c");
        // The fake returns exactly what a GPU would: an f32 dist and the relaxing arcs, nothing else.
        const cpu = await accelerated(null).sssp(s, a);
        const fake: AlgorithmAccelerator = {
            kind: "fake",
            sssp: () => Promise.resolve({ dist: Float32Array.from(cpu.dist), predArc: cpu.predArc }),
        };
        const decorated = await accelerated(fake).sssp(s, a);
        expect(decorated.dist).toBeInstanceOf(Float32Array);
        expect([...decorated.pathTo(c)]).toEqual([...cpu.pathTo(c)]);
        expect([...decorated.pathEdges(c)]).toEqual([...cpu.pathEdges(c)]);
        expect(decorated.pathEdges(c).length).toBe(2); // a->b->c, not the direct weight-5 edge
    });

    it("runs the CPU port for the other three methods too", async () => {
        const s = cycle();
        const cpu = accelerated(null);
        const bfs = await cpu.breadthFirstSearch(s, 0);
        expect(bfs.visitedCount).toBe(3);
        const wcc = await cpu.weaklyConnectedComponents(s);
        expect(wcc.count).toBe(1);
        const mst = await cpu.minimumSpanningTree(s.toUndirected().snapshot);
        expect(mst.edges.length).toBe(2);
    });

    it("carries exactly the six methods whose ports exist", () => {
        const dispatcher = accelerated(null) as unknown as Record<string, unknown>;
        const methods = Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function");
        expect(methods.sort()).toEqual([
            "breadthFirstSearch",
            "connectedComponents",
            "minimumSpanningTree",
            "pageRank",
            "sssp",
            "weaklyConnectedComponents",
        ]);
    });
});
