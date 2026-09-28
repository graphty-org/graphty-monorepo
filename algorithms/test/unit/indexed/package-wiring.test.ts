import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
    HierarchicalResult,
    IndexedApspOptions,
    IndexedApspResult,
    IndexedLabelPropagationOptions,
    IndexedLabelPropagationResult,
    MarkovResult,
    SpectralOptions,
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

describe("indexed clustering exports", () => {
    it("reaches the hierarchical, Markov, spectral and modularity ports through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        const s = b.freeze();
        const tree: HierarchicalResult = pkg.indexed.hierarchicalClustering(s, { linkage: "average" });
        expect(tree.left.length).toBe(2);
        const flow: MarkovResult = pkg.indexed.markovClustering(s);
        expect(flow.labels.length).toBe(3);
        const options: SpectralOptions = { k: 2, laplacianType: "normalized" };
        expect(pkg.indexed.spectralClustering(s, options).count).toBe(2);
        expect(pkg.indexed.modularity(s, new Uint32Array(3))).toBeCloseTo(0, 15);
    });
});
