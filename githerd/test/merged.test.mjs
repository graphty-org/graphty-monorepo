import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
    accumulateMerged,
    backfillRefs,
    commitRefs,
    explicitRefs,
    landStacked,
    MERGED_QUERY,
    parseMerged,
    REFS_QUERY,
    searchMerged,
} from "../lib/merged.mjs";

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

    it("reads the issues a pull request references explicitly without closing them (design 5.1)", () => {
        const [pr] = parseMerged({
            search: {
                nodes: [
                    {
                        number: 5,
                        title: "fix(layout): Refs #12",
                        body: "Closes #14. Part of #13, ref: #12; see #11, not a&#15; or x/#16.",
                        mergedAt: "x",
                        closingIssuesReferences: { nodes: [{ number: 14 }] },
                    },
                ],
            },
        });
        expect(pr.closes).toEqual([14]);
        expect(pr.mentions).toEqual([12, 13]);
    });

    it("skips empty nodes and tolerates missing fields", () => {
        expect(parseMerged({ search: { nodes: [{}, { number: 1, title: "t", mergedAt: "x" }] } })).toEqual([
            {
                number: 1,
                title: "t",
                headRef: null,
                base: null,
                mergedAt: "x",
                mergeSha: null,
                closes: [],
                mentions: [],
                paths: [],
                truncated: false,
            },
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
    it("keeps each merge for the next refresh job, collects closed issues, and is idempotent", () => {
        const prs = parseMerged(SEARCH);
        const once = accumulateMerged({}, prs);
        expect(once.lastScanAt).toBe("2026-10-02T16:14:33Z");
        expect(once.closed).toEqual([135, 136, 141, 188, 543]);
        expect(once.pending.map((p) => p.number)).toEqual([718, 717, 365]);
        expect(once.pending[0].paths).toContain("graphty-element/src/NodeBehavior.ts");
        expect(accumulateMerged(once, prs)).toEqual(once);
        const more = accumulateMerged(once, [
            {
                number: 800,
                title: "",
                mergedAt: "2026-10-01T00:00:00Z",
                mergeSha: null,
                closes: [],
                mentions: [9],
                paths: ["graphty-element/src/NodeBehavior.ts"],
                truncated: false,
            },
        ]);
        expect(more.pending.at(-1)).toEqual({
            number: 800,
            title: "",
            mergeSha: null,
            paths: ["graphty-element/src/NodeBehavior.ts"],
            truncated: false,
            mentions: [9],
        });
        // the scan mark never moves back
        expect(more.lastScanAt).toBe("2026-10-02T16:14:33Z");
    });
});

describe("references on master", () => {
    it("names an issue a commit message references explicitly, word-bounded: #906 is not #9060", () => {
        const log = [
            "958d8e9c6\tfix(graphty-element): a legend swatch spells its value\n\nRefs #906\n",
            "111111111\tfix: something else\n\nRefs #9060",
            "222222222\tdocs: the swatch\n\nFixes: graphty-org/graphty-monorepo#915, resolves #906",
            "333333333\tfix: a closed one\n\nCloses #5",
            "444444444\tfix: unrelated (#906)\n\nSee #915; #906 is not changed here.",
        ].join("\x1e\n");
        expect(commitRefs(log, [906, 915])).toEqual({ 906: ["958d8e9c6", "222222222"], 915: ["222222222"] });
    });

    it("reads only a closing keyword or Refs / Ref / Part of as a reference, not a bare #n in prose", () => {
        expect(
            explicitRefs(
                "close #1 Closes #2 closed: #3 FIX #4 fixes #5 Fixed #6 resolve #7 Resolves: #8 resolved #9 " +
                    "refs #10 Ref: #11 part of #12 Part Of: owner/repo#13 prefixes #14 suffix #15 see #16 (#17)",
            ),
        ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]);
    });

    it("names no issue a merged pull request only mentions (#1384 and #1368)", () => {
        const pr = (/** @type {number} */ number, /** @type {string} */ body) =>
            parseMerged({ search: { nodes: [{ number, title: "fix: x", body, mergedAt: "x" }] } })[0];
        expect(
            pr(1384, "The repository's own test suite is slow. This is filed as #1373 and is not changed here.")
                .mentions,
        ).toEqual([]);
        expect(pr(1368, "#1358 tracks measuring it on a GPU. The seed's cost is not changed here.").mentions).toEqual(
            [],
        );
    });

    it("keeps every issue a merged pull request closes or mentions, for good, without duplicates", () => {
        const pr = { number: 550, mergedAt: "2026-09-30T00:00:00Z", closes: [7], mentions: [422] };
        const once = accumulateMerged({ pending: [] }, /** @type {any} */ ([pr]));
        expect(once.refs).toEqual({ 7: ["#550"], 422: ["#550"] });
        expect(accumulateMerged({ ...once, pending: [] }, /** @type {any} */ ([pr])).refs).toEqual(once.refs);
    });

    it("counts a pull request merged into another pull request's branch only once it lands (#696 into #617's branch)", async () => {
        const pr = {
            number: 696,
            base: "feat/edge-styles",
            mergedAt: "2026-10-03T00:00:00Z",
            mergeSha: "fb5463ac4",
            closes: [620],
            mentions: [619],
            paths: [],
            truncated: false,
        };
        const once = accumulateMerged({ pending: [] }, /** @type {any} */ ([pr]), "master");
        expect(once.refs).toEqual({});
        expect(once.closed).toEqual([]);
        expect(once.pending).toEqual([]);
        expect(once.stacked.map((p) => p.number)).toEqual([696]);
        expect(await landStacked(once, async () => false)).toBe(once);
        const landed = await landStacked(once, async (sha) => sha === "fb5463ac4");
        expect(landed.stacked).toEqual([]);
        expect(landed.refs).toEqual({ 619: ["#696"], 620: ["#696"] });
        // GitHub closed nothing: the issue it would close stays open, to be judged
        expect(landed.closed).toEqual([]);
        expect(landed.pending.map((p) => [p.number, p.mentions])).toEqual([[696, [619, 620]]]);
    });

    it("backfills only merges based on the default branch or since taken into it", async () => {
        const node = (number, baseRefName, oid) => ({
            number,
            title: "",
            body: "Refs #619",
            baseRefName,
            mergedAt: "x",
            mergeCommit: { oid },
        });
        const gitHub = {
            graphql: async () => ({
                search: { nodes: [node(696, "feat/a", "a"), node(700, "feat/b", "b"), node(701, "master", "c")] },
            }),
        };
        const refs = await backfillRefs(gitHub, "o/r", "2026-01-01T00:00:00Z", "master", async (sha) => sha === "b");
        expect(refs).toEqual({ 619: ["#700", "#701"] });
    });

    it("backfills the references of earlier merges once, page by page", async () => {
        const calls = [];
        const pages = [
            {
                search: {
                    pageInfo: { hasNextPage: true, endCursor: "c1" },
                    nodes: [{ number: 550, title: "feat: gpu", body: "Part of #422.", mergedAt: "x" }],
                },
            },
            {
                search: {
                    pageInfo: { hasNextPage: false, endCursor: null },
                    nodes: [
                        {
                            number: 551,
                            title: "fix",
                            body: "",
                            mergedAt: "x",
                            closingIssuesReferences: { nodes: [{ number: 422 }] },
                        },
                    ],
                },
            },
        ];
        const gitHub = { graphql: async (q, v) => (calls.push([q, v]), pages[calls.length - 1]) };
        expect(await backfillRefs(gitHub, "o/r", "2026-01-01T00:00:00Z")).toEqual({ 422: ["#550", "#551"] });
        expect(calls).toEqual([
            [REFS_QUERY, { q: "repo:o/r is:pr is:merged merged:>=2026-01-01T00:00:00Z", after: null }],
            [REFS_QUERY, { q: "repo:o/r is:pr is:merged merged:>=2026-01-01T00:00:00Z", after: "c1" }],
        ]);
    });
});
