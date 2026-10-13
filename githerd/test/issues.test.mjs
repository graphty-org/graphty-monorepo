import { describe, expect, it } from "vitest";

import { syncJobs } from "../lib/jobs.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import {
    applyIssues,
    issuesPath,
    MAX_PAGES,
    nextPage,
    overlapped,
    pollIssues,
    pruneClosedIssues,
} from "../lib/issues.mjs";

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
    it("keeps githerd's own heartbeat issue out: it is no work, however often its body changes", () => {
        const heartbeat = (at) => issue(1150, at, { labels: [{ name: "githerd-heartbeat" }], body: `alive: ${at}` });
        const r = applyIssues({ since: null, byNumber: { 1150: { state: "open" } } }, [
            heartbeat("2026-10-05T12:00:00Z"),
            issue(643, "2026-10-05T12:01:00Z"),
        ]);
        expect(Object.keys(r.byNumber)).toEqual(["643"]);
        expect(r.changed).toEqual([643]);
        expect(applyIssues(r, [heartbeat("2026-10-05T12:15:00Z")]).changed).toEqual([]);
    });

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
        expect(issuesPath(REPO, null)).toBe(`repos/${REPO}/issues?state=all&sort=updated&direction=asc&per_page=100`);
        expect(nextPage(NEXT("abc"))).toBe("repositories/1122477634/issues?state=all&per_page=100&after=abc&page=2");
        expect(nextPage(undefined)).toBeNull();
        expect(nextPage('<https://api.github.com/x>; rel="prev"')).toBeNull();
        expect(nextPage('<https://api.github.com/p>; rel="prev", <https://api.github.com/n>;rel="next"')).toBe("n");
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
        const r = await pollIssues(gitHub, REPO, empty());
        expect(paths).toHaveLength(2);
        expect(paths[0]).not.toContain("since=");
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
        const r = await pollIssues(gitHub, REPO, saved);
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
        const first = await pollIssues(gitHub, REPO, empty());
        const second = await pollIssues(gitHub, REPO, first);
        expect(first.changed).toEqual([1]);
        expect(second.changed).toEqual([2]);
        expect(second.since).toBe("2026-10-01T00:01:00Z");
    });
});

describe("pruneClosedIssues", () => {
    const closed = (n) => issue(n, "2026-10-13T10:00:00Z", { state: "closed", title: `t${n}`, body: "old" });
    const stateWith = (items, extra = {}) => ({ issues: applyIssues(empty(), items), jobs: {}, ...extra });

    it("drops a closed issue nothing refers to and keeps open ones", () => {
        const state = stateWith([closed(1), issue(2, "2026-10-13T10:00:00Z")]);
        expect(pruneClosedIssues(state)).toBe(1);
        expect(Object.keys(state.issues.byNumber)).toEqual(["2"]);
    });

    it("keeps a closed issue while a job, deferral, proposal, owner item or other record refers to it", () => {
        const state = stateWith([1, 2, 3, 4, 5, 6, 7, 8, 9].map(closed), {
            jobs: {
                "issue-1": { kind: "issue", target: "#1", state: "working" },
                "triage-1": { kind: "triage", target: "triage", state: "queued", facts: { batch: [2] } },
            },
            deferred: { 3: { revision: "x" } },
            unbundled: { 4: "x" },
            proposals: { "issue:5": { target: "issue:5", status: "proposed" } },
            ownerItems: { a: { target: "issue:6", endedAt: null } },
            flakes: { tests: { t: { issue: 7 } } },
            releaseQueue: { 900: { issue: 8 } },
            escalations: { "release-failed": { holdIssue: 9, resolvedAt: null } },
        });
        expect(pruneClosedIssues(state)).toBe(0);
        // Each reference ends: the issue goes on the next pass.
        state.jobs["issue-1"].state = "cancelled";
        state.jobs["triage-1"].state = "done";
        delete state.deferred[3];
        delete state.unbundled[4];
        state.proposals["issue:5"].status = "ended";
        state.ownerItems.a.endedAt = "2026-10-13T11:00:00Z";
        delete state.flakes.tests.t;
        delete state.releaseQueue[900];
        state.escalations["release-failed"].resolvedAt = "2026-10-13T11:00:00Z";
        expect(pruneClosedIssues(state)).toBe(9);
        expect(state.issues.byNumber).toEqual({});
    });

    it("records a dropped issue again, with its new text, when it reopens", async () => {
        const state = stateWith([closed(1)]);
        pruneClosedIssues(state);
        const reopened = issue(1, "2026-10-13T12:00:00Z", { title: "t1", body: "new text" });
        const paths = [];
        const gitHub = { get: async (path) => (paths.push(path), { headers: {}, body: [reopened] }) };
        const polled = await pollIssues(gitHub, REPO, state.issues);
        expect(paths[0]).toContain("since=");
        expect(polled.changed).toEqual([1]);
        expect(polled.byNumber[1]).toMatchObject({ state: "open", text: "t1\nnew text" });
    });

    it("lets the job that cancels on close see the issue first, then drops it", () => {
        const config = normalizeConfig({ repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } });
        const state = {
            trust: { login: "apowers313" },
            master: { verdict: "green", lanes: {} },
            incidents: {},
            escalations: {},
            prs: {},
            mergeGate: { heads: {} },
            merged: { count: 0, pending: [], closed: [] },
            triagePasses: { refreshAt: 0, fullAt: 0, queue: [], seq: 0, typesQueued: true },
            issues: applyIssues(empty(), [closed(1)]),
            jobs: { "issue-1": { id: "issue-1", kind: "issue", target: "#1", state: "queued", news: [] } },
        };
        // The poll's prune runs before the jobs are synced: the live job keeps the closed issue.
        expect(pruneClosedIssues(state)).toBe(0);
        const r = syncJobs(state, { config, now: new Date("2026-10-13T12:00:00Z") });
        expect(r.cancelled).toEqual([{ job: "issue-1", reason: "the issue closed" }]);
        expect(pruneClosedIssues(state)).toBe(1);
    });
});
