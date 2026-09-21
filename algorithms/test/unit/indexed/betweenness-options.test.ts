import { describe, expect, it } from "vitest";

import {
    type BetweennessCentralityOptions,
    betweennessCentrality,
    edgeBetweennessCentrality,
    nodeBetweennessCentrality,
} from "../../../src/algorithms/centrality/betweenness.js";
import { Graph } from "../../../src/core/graph.js";

function path(): Graph {
    const g = new Graph({ directed: false });
    g.addEdge("a", "b");
    g.addEdge("b", "c");
    return g;
}

describe("BetweennessCentralityOptions sources / k", () => {
    it("accepts the index-space members at the type level", () => {
        const options: BetweennessCentralityOptions = { normalized: true, sources: [0, 1], k: 2 };
        expect(options.sources).toEqual([0, 1]);
        expect(options.k).toBe(2);
    });

    it("throws from every legacy entry point that is given them", () => {
        const g = path();
        expect(() => betweennessCentrality(g, { sources: [0] })).toThrow(/node INDICES/);
        expect(() => betweennessCentrality(g, { k: 1 })).toThrow(/node INDICES/);
        expect(() => nodeBetweennessCentrality(g, "b", { k: 1 })).toThrow(/node INDICES/);
        expect(() => edgeBetweennessCentrality(g, { sources: [0] })).toThrow(/node INDICES/);
    });

    it("leaves the existing three members working exactly as before", () => {
        const g = path();
        expect(betweennessCentrality(g, { normalized: false })["b"]).toBe(1);
        expect(betweennessCentrality(g)["a"]).toBe(0);
        expect(nodeBetweennessCentrality(g, "b")).toBe(1);
        expect(edgeBetweennessCentrality(g, { normalized: true }).get("a-b")).toBe(1);
    });
});
