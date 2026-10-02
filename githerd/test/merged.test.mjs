import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { accumulateMerged, MERGED_QUERY, parseMerged, rankForRefresh, searchMerged } from "../lib/merged.mjs";

const SEARCH = JSON.parse(
    readFileSync(join(dirname(fileURLToPath(import.meta.url)), "fixtures", "merged-search.json"), "utf8"),
).data;

describe("parseMerged", () => {
    const prs = parseMerged(SEARCH);

    it("reads number, merge commit, closing references and paths", () => {
        expect(prs.map((p) => p.number)).toEqual([718, 717, 365]);
        const p718 = prs[0];
        expect(p718.mergeSha).toBe("3e38b709e9452081eb1ee20d6441da676dfd500b");
        expect(p718.closes).toEqual([543]);
        expect(p718.paths).toContain("graphty-element/src/NodeBehavior.ts");
        expect(p718.truncated).toBe(false);
    });

    it("still yields paths from #365's truncated list (389 files, 100 listed)", () => {
        const p365 = prs[2];
        expect(p365.truncated).toBe(true);
        expect(p365.paths).toHaveLength(100);
        expect(p365.closes).toEqual([135, 136, 141]);
    });

    it("skips empty nodes and tolerates missing fields", () => {
        expect(parseMerged({ search: { nodes: [{}, { number: 1, title: "t", mergedAt: "x" }] } })).toEqual([
            { number: 1, title: "t", mergedAt: "x", mergeSha: null, closes: [], paths: [], truncated: false },
        ]);
        expect(parseMerged(null)).toEqual([]);
    });
});

describe("searchMerged", () => {
    it("searches merged pull requests since the last scan", async () => {
        const calls = [];
        const gitHub = { graphql: async (q, v) => (calls.push([q, v]), SEARCH) };
        const prs = await searchMerged(gitHub, "o/r", "2026-10-02T00:00:00Z");
        expect(calls).toEqual([
            [MERGED_QUERY, { q: "repo:o/r is:pr is:merged merged:>=2026-10-02T00:00:00Z sort:updated-desc" }],
        ]);
        expect(prs).toHaveLength(3);
    });
});

describe("accumulateMerged", () => {
    it("accumulates paths per pull request, collects closed issues, and is idempotent", () => {
        const prs = parseMerged(SEARCH);
        const once = accumulateMerged({}, prs);
        expect(once.lastScanAt).toBe("2026-10-02T16:14:33Z");
        expect(once.closed).toEqual([135, 136, 141, 188, 543]);
        expect(once.pendingPaths["graphty-element/src/NodeBehavior.ts"]).toEqual([718]);
        expect(accumulateMerged(once, prs)).toEqual(once);
        const more = accumulateMerged(once, [
            {
                number: 800,
                title: "",
                mergedAt: "2026-10-01T00:00:00Z",
                mergeSha: null,
                closes: [],
                paths: ["graphty-element/src/NodeBehavior.ts"],
                truncated: false,
            },
        ]);
        expect(more.pendingPaths["graphty-element/src/NodeBehavior.ts"]).toEqual([718, 800]);
        // the scan mark never moves back
        expect(more.lastScanAt).toBe("2026-10-02T16:14:33Z");
    });
});

describe("rankForRefresh", () => {
    const paths = ["graphty-element/src/Edge.ts", "graphty-element/src/managers/DataManager.ts"];

    it("ranks an issue naming a changed file above one naming only its top directory", () => {
        const ranked = rankForRefresh(
            [
                { number: 1, title: "graphty-element: slow", body: "something in graphty-element" },
                { number: 2, title: "Edge arrows", body: "Edge.ts draws the arrow twice" },
                { number: 3, title: "unrelated", body: "layout/src/foo.ts and graphty-elementary" },
                { number: 4, title: "full path", body: "see graphty-element/src/managers/DataManager.ts" },
            ],
            paths,
        );
        expect(ranked.map((r) => r.number)).toEqual([4, 2, 1]);
        expect(ranked.find((r) => r.number === 1)).toEqual({ number: 1, files: 0, dirs: 1 });
    });

    it("excludes issues a merged pull request closes", () => {
        const issues = [
            { number: 543, title: "Edge.ts", body: null },
            { number: 9, title: "Edge.ts" },
        ];
        expect(rankForRefresh(issues, paths, [543]).map((r) => r.number)).toEqual([9]);
    });

    it("breaks ties by issue number", () => {
        const issues = [
            { number: 7, body: "Edge.ts" },
            { number: 5, body: "Edge.ts" },
        ];
        expect(rankForRefresh(issues, paths).map((r) => r.number)).toEqual([5, 7]);
    });
});
