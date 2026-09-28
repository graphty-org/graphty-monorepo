import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
    IndexedApspOptions,
    IndexedApspResult,
    IndexedBipartiteFlowNetwork,
    IndexedKargerOptions,
    IndexedLabelPropagationOptions,
    IndexedLabelPropagationResult,
    IndexedMaxFlowOptions,
    IndexedMaxFlowResult,
    IndexedMinCutResult,
    IndexedStoerWagnerOptions,
} from "../../../src/index.js";

// process.cwd(), not import.meta.url: the default project runs under happy-dom, which rewrites
// import.meta.url to an http: URL (test/helpers/performance-regression.ts:46 locates its file the same way).
const packageJson = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
    dependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
};

describe("graph-format wiring", () => {
    it("declares @graphty/graph-format as a workspace dependency and a caret peer", () => {
        // workspace:^ and not workspace:*: pnpm publishes workspace:* as an EXACT pin, which would
        // lock every consumer of @graphty/algorithms to one graph-format patch (design 17.7 D-PEER-1X).
        expect(packageJson.dependencies?.["@graphty/graph-format"]).toBe("workspace:^");
        expect(packageJson.peerDependencies?.["@graphty/graph-format"]).toBe("^1.0.0");
    });

    it("resolves the format at runtime", async () => {
        const format = await import("@graphty/graph-format");
        expect(format.FORMAT_VERSION).toBe(1);
        expect(typeof format.GraphBuilder).toBe("function");
    });
});

describe("indexed label propagation exports", () => {
    it("reaches indexed.labelPropagation and its flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        expect(typeof pkg.indexed.labelPropagation).toBe("function");
        const options: IndexedLabelPropagationOptions = { maxIterations: 5, randomSeed: 1, weighted: false };
        const format = await import("@graphty/graph-format");
        const s = new format.GraphBuilder({ directed: false }).freeze();
        const r: IndexedLabelPropagationResult = pkg.indexed.labelPropagation(s, options);
        expect(r.count).toBe(0);
    });
});

describe("indexed all-pairs shortest path exports", () => {
    it("reaches indexed.allPairsShortestPath and its flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        expect(typeof pkg.indexed.allPairsShortestPath).toBe("function");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: true });
        b.addEdge(0, 1, 2);
        const options: IndexedApspOptions = { method: "floyd-warshall" };
        const r: IndexedApspResult = pkg.indexed.allPairsShortestPath(b.freeze(), options);
        expect(r.n).toBe(2);
        expect(Array.from(r.dist)).toEqual([0, 2, Infinity, 0]);
    });
});

describe("indexed flow and cut exports", () => {
    it("reaches the flow and cut family and its flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const network: IndexedBipartiteFlowNetwork = pkg.indexed.bipartiteFlowNetwork(["a"], ["x"], [["a", "x"]]);
        const options: IndexedMaxFlowOptions = { algorithm: "ford-fulkerson" };
        const flow: IndexedMaxFlowResult = pkg.indexed.maxFlow(network.snapshot, network.source, network.sink, options);
        expect(flow.maxFlow).toBe(1);
        const cut: IndexedMinCutResult = pkg.indexed.minSTCut(network.snapshot, network.source, network.sink);
        expect(cut.cutValue).toBe(1);
        const sw: IndexedStoerWagnerOptions = {};
        expect(pkg.indexed.stoerWagner(network.snapshot, sw).cutValue).toBe(1);
        const karger: IndexedKargerOptions = { iterations: 3, randomSeed: 1 };
        expect(pkg.indexed.kargerMinCut(network.snapshot, karger).cutValue).toBe(1);
    });
});
