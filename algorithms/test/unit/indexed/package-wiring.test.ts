import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import type {
    DeltaPageRankComputeOptions,
    DeltaPageRankEngineOptions,
    IndexedApspOptions,
    IndexedApspResult,
    IndexedLabelPropagationOptions,
    IndexedLabelPropagationResult,
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

describe("indexed delta PageRank exports", () => {
    it("reaches the two delta engines and their flat types through the package barrel", async () => {
        const pkg = await import("../../../src/index.js");
        const format = await import("@graphty/graph-format");
        const b = new format.GraphBuilder({ directed: true });
        b.addEdge(0, 1);
        b.addEdge(1, 0);
        const s = b.freeze();
        // The legacy pageRank facade's exact power iteration is internal, not a second public PageRank.
        expect("deltaPageRank" in pkg.indexed).toBe(false);
        const engineOptions: DeltaPageRankEngineOptions = {};
        const computeOptions: DeltaPageRankComputeOptions = { dampingFactor: 0.85 };
        // The engines drop deltas below their threshold, so the symmetric pair lands near, not on, 0.5.
        const delta = new pkg.indexed.DeltaPageRank(s, engineOptions).compute(computeOptions);
        const priority = new pkg.indexed.PriorityDeltaPageRank(s, engineOptions).computeWithPriority(computeOptions);
        for (const scores of [delta, priority]) {
            expect(scores.length).toBe(2);
            expect(scores[0]).toBeCloseTo(0.5, 6);
            expect(scores[1]).toBeCloseTo(0.5, 6);
        }
    });
});
