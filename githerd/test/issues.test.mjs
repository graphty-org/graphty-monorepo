import { describe, expect, it } from "vitest";

import { applyIssues, issuesPath, MAX_PAGES, nextPage, overlapped, pollIssues } from "../lib/issues.mjs";

const REPO = "graphty-org/graphty-monorepo";
const empty = () => ({ since: null, byNumber: {} });
const issue = (number, updatedAt, extra = {}) => ({
    number,
    updated_at: updatedAt,
    state: "open",
    labels: [{ name: "bug" }],
    user: { login: "apowers313" },
    ...extra,
});
const NEXT = (cursor) =>
    `<https://api.github.com/repositories/1122477634/issues?state=all&per_page=100&after=${cursor}&page=2>; rel="next"`;

describe("applyIssues", () => {
    it("records issues and drops pull requests", () => {
        const r = applyIssues(empty(), [
            issue(643, "2026-10-01T04:09:29Z", { title: "Crash in layout", body: "x".repeat(3000) }),
            issue(627, "2026-10-01T05:00:00Z", { pull_request: {} }),
        ]);
        expect(Object.keys(r.byNumber)).toEqual(["643"]);
        expect(r.changed).toEqual([643]);
        expect(r.byNumber[643]).toEqual({
            updatedAt: "2026-10-01T04:09:29Z",
            createdAt: null,
            state: "open",
            labels: ["bug"],
            author: "apowers313",
            lastTriagedAt: null,
            lastRefreshedAt: null,
            proposal: null,
            closeVetoed: false,
            // the title and the body's first 2000 characters, for ranking a refresh pass
            text: `Crash in layout\n${"x".repeat(2000)}`,
        });
        // a pull request still advances the mark
        expect(r.since).toBe("2026-10-01T05:00:00Z");
    });

    it("never moves the high-water mark back", () => {
        const saved = { since: "2026-10-02T00:00:00Z", byNumber: {} };
        const r = applyIssues(saved, [issue(1, "2026-09-30T00:00:00Z")]);
        expect(r.since).toBe("2026-10-02T00:00:00Z");
        expect(applyIssues(saved, []).since).toBe("2026-10-02T00:00:00Z");
    });

    it("keeps githerd's fields and skips an unchanged issue", () => {
        const saved = {
            since: "2026-10-01T00:00:00Z",
            byNumber: {
                643: {
                    updatedAt: "2026-10-01T00:00:00Z",
                    state: "open",
                    labels: [],
                    author: "a",
                    lastTriagedAt: "t",
                    lastRefreshedAt: null,
                    proposal: "p",
                    closeVetoed: true,
                },
            },
        };
        expect(applyIssues(saved, [issue(643, "2026-10-01T00:00:00Z")]).changed).toEqual([]);
        const r = applyIssues(saved, [
            issue(643, "2026-10-01T01:00:00Z", { state: "closed", labels: ["x"], user: null }),
        ]);
        expect(r.byNumber[643]).toMatchObject({
            state: "closed",
            labels: ["x"],
            author: null,
            lastTriagedAt: "t",
            proposal: "p",
            closeVetoed: true,
        });
    });
});

describe("paging", () => {
    it("builds the first path and follows rel=next", () => {
        expect(issuesPath(REPO, "2026-10-01T00:00:00Z")).toBe(
            `repos/${REPO}/issues?state=all&since=2026-10-01T00%3A00%3A00Z&sort=updated&direction=asc&per_page=100`,
        );
        expect(nextPage(NEXT("abc"))).toBe("repositories/1122477634/issues?state=all&per_page=100&after=abc&page=2");
        expect(nextPage(undefined)).toBeNull();
        expect(nextPage('<https://api.github.com/x>; rel="prev"')).toBeNull();
    });

    it("reads every page and merges them", async () => {
        const paths = [];
        const pages = [
            {
                headers: { link: NEXT("c1") },
                body: [issue(1, "2026-10-01T01:00:00Z"), issue(2, "2026-10-01T02:00:00Z", { pull_request: {} })],
            },
            { headers: {}, body: [issue(3, "2026-10-01T03:00:00Z"), issue(1, "2026-10-01T04:00:00Z")] },
        ];
        const gitHub = { get: async (p) => (paths.push(p), pages[paths.length - 1]) };
        const r = await pollIssues(gitHub, REPO, empty(), "2026-10-01T00:00:00Z");
        expect(paths).toHaveLength(2);
        expect(paths[0]).toContain("since=2026-10-01T00%3A00%3A00Z");
        expect(paths[1]).toContain("after=c1");
        expect(r.complete).toBe(true);
        expect(r.since).toBe("2026-10-01T04:00:00Z");
        expect(r.changed).toEqual([1, 3]);
        expect(r.byNumber[1].updatedAt).toBe("2026-10-01T04:00:00Z");
    });

    it("starts 10 minutes before the saved mark and stops after MAX_PAGES", async () => {
        const paths = [];
        let t = 0;
        const gitHub = {
            get: async (p) => {
                paths.push(p);
                t++;
                return {
                    headers: { link: NEXT(`c${t}`) },
                    body: [issue(t, `2026-10-01T${String(t).padStart(2, "0")}:00:00Z`)],
                };
            },
        };
        const saved = { since: "2026-09-30T00:00:00Z", byNumber: {} };
        const r = await pollIssues(gitHub, REPO, saved, "ignored");
        expect(paths).toHaveLength(MAX_PAGES);
        expect(paths[0]).toContain("since=2026-09-29T23%3A50%3A00.000Z");
        expect(r.complete).toBe(false);
        expect(r.since).toBe("2026-10-01T10:00:00Z");
    });

    it("re-reads the overlap without reporting an unchanged issue again", async () => {
        expect(overlapped("2026-10-01T00:05:00Z")).toBe("2026-09-30T23:55:00.000Z");
        const answers = [
            [issue(1, "2026-10-01T00:00:00Z")],
            [issue(1, "2026-10-01T00:00:00Z"), issue(2, "2026-10-01T00:01:00Z")],
        ];
        const gitHub = { get: async () => ({ headers: {}, body: answers.shift() }) };
        const first = await pollIssues(gitHub, REPO, empty(), "2026-09-30T00:00:00Z");
        const second = await pollIssues(gitHub, REPO, first, "ignored");
        expect(first.changed).toEqual([1]);
        expect(second.changed).toEqual([2]);
        expect(second.since).toBe("2026-10-01T00:01:00Z");
    });
});
