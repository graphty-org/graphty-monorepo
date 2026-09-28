import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
    IndexedApspOptions,
    IndexedApspResult,
    IndexedGrsbmOptions,
    IndexedGrsbmResult,
    IndexedLabelPropagationOptions,
    IndexedLabelPropagationResult,
    IndexedSyncClusteringOptions,
    IndexedSyncClusteringResult,
    IndexedTeraHacOptions,
    IndexedTeraHacResult,
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

describe("indexed research clustering exports", () => {
    it("reaches indexed.teraHAC, indexed.syncClustering and indexed.grsbm and their flat Indexed* types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: false });
        b.addEdge("a", "b");
        b.addEdge("b", "c");
        const s = b.freeze();
        const hac: IndexedTeraHacOptions = { linkage: "single" };
        const hacResult: IndexedTeraHacResult = pkg.indexed.teraHAC(s, hac);
        expect(hacResult.merges).toBe(2);
        const sync: IndexedSyncClusteringOptions = { numClusters: 1 };
        const syncResult: IndexedSyncClusteringResult = pkg.indexed.syncClustering(s, sync);
        expect(syncResult.labels.length).toBe(3);
        const bisect: IndexedGrsbmOptions = { weighted: false };
        const bisectResult: IndexedGrsbmResult = pkg.indexed.grsbm(s, bisect);
        expect(bisectResult.count).toBe(1);
    });
});
