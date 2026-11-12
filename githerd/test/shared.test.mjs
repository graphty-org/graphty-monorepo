import { describe, expect, it } from "vitest";

import { move } from "../lib/board.mjs";
import { normalizeConfig } from "../lib/config.mjs";
import { syncJobs } from "../lib/jobs.mjs";
import { markShared, sharedLines } from "../lib/shared.mjs";

const LINKS = "CI / Links / Check links";
const TEST = "CI / Test (layout) / Run tests";
const AT = "2026-10-06T12:00:00Z";
const CONFIG = normalizeConfig({ repo: "o/r", lanes: { ci: { workflow: "ci.yml", gating: "required" } } });

/**
 * An open pull request record failing only under `All Checks Pass`.
 * @param {number} n its number
 * @param {string[]} keys its failure keys
 * @param {any} [over] fields to override
 * @returns {any} the record
 */
const rec = (n, keys, over = {}) => ({
    author: "owner",
    draft: false,
    headRef: `fix/${n}`,
    headSha: `${n}`.padEnd(40, "0"),
    baseRef: "master",
    createdAt: "2026-10-01T00:00:00Z",
    labels: [],
    required: { "All Checks Pass": "FAILURE" },
    conflictSightings: 0,
    stackedOn: null,
    failureKeys: keys,
    inherited: null,
    ...over,
});

/**
 * A state with the owner known, master green on lane `ci`, and the given records.
 * @param {Record<string, any>} prs the records
 * @returns {any} the state
 */
const stateWith = (prs) => ({
    trust: { login: "owner" },
    master: { verdict: "green", lanes: { ci: { verdict: "green", workflowName: "CI" } } },
    incidents: {},
    escalations: {},
    prs,
    issues: { byNumber: {} },
    mergeGate: { heads: Object.fromEntries(Object.keys(prs).map((n) => [n, { files: ["layout/src/a.ts"] }])) },
    merged: { count: 0, pending: [], closed: [] },
    triagePasses: { refreshAt: 0, fullAt: 0, queue: [], seq: 0, typesQueued: true },
    jobs: {},
});

/**
 * Runs one poll's marking over the state's records.
 * @param {any} state the state
 * @param {{nodes?: any[], threshold?: number, at?: string}} [opts] the open nodes, threshold and time
 * @returns {ReturnType<typeof markShared>} what changed
 */
const mark = (state, { nodes = [], threshold = 3, at = AT } = {}) =>
    markShared(state, state.prs, nodes, { threshold, at });

describe("shared failures across pull requests", () => {
    it("calls a key shared once it fails on the threshold of pull requests, and not before", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]) });
        expect(mark(state).declared).toEqual([]);
        expect(state.prs[8].shared).toBeNull();
        state.prs[10] = rec(10, [LINKS]);
        expect(mark(state).declared).toEqual([LINKS]);
        for (const n of [8, 9, 10]) expect(state.prs[n].shared).toEqual(["Links failing on 3 PRs: shared cause"]);
        expect(sharedLines(state)).toEqual([
            "  Links failing on 3 PRs: shared cause (CI / Links / Check links) -- one job finds and fixes it",
        ]);
    });

    it("leaves test jobs to the flaky-test tracker and keeps a pull request's other failure its own", () => {
        const state = stateWith({
            8: rec(8, [TEST]),
            9: rec(9, [TEST]),
            10: rec(10, [TEST, LINKS]),
            11: rec(11, [LINKS]),
            12: rec(12, [LINKS]),
        });
        expect(mark(state).declared).toEqual([LINKS]);
        expect(state.prs[8].shared).toBeNull();
        // It fails the shared key and one of its own: still its own job.
        expect(state.prs[10].shared).toBeNull();
        expect(state.prs[11].shared).toEqual(["Links failing on 3 PRs: shared cause"]);
    });

    it("does not count a failure inherited from a red master", () => {
        const state = stateWith({
            8: rec(8, [LINKS], { inherited: [LINKS] }),
            9: rec(9, [LINKS]),
            10: rec(10, [LINKS]),
        });
        expect(mark(state).declared).toEqual([]);
    });

    it("keeps a declared key shared while any pull request still fails it, and forgets it when none does", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]), 10: rec(10, [LINKS]) });
        mark(state);
        delete state.prs[9];
        delete state.prs[10];
        mark(state);
        expect(state.prs[8].shared).toEqual(["Links failing on 1 PR: shared cause"]);
        state.prs[8] = rec(8, null, { required: { "All Checks Pass": "SUCCESS" } });
        expect(mark(state).ended).toEqual([{ key: LINKS, why: "no open pull request fails it" }]);
        expect(state.sharedFailures).toEqual({});
    });

    it("offers one incident job, none while an open pull request is its fix, and cancels it when the failure ends", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]), 10: rec(10, [LINKS]) });
        mark(state);
        syncJobs(state, { config: CONFIG, now: new Date(AT) });
        const id = "incident-shared-ci-links-check-links";
        expect(Object.keys(state.jobs)).toEqual([id]);
        expect(state.jobs[id]).toMatchObject({
            kind: "incident",
            target: LINKS,
            reason: "Links failing on 3 PRs: shared cause",
            facts: { scope: "shared", key: LINKS, prs: [8, 9, 10], lane: "ci" },
        });
        // Someone opened a pull request whose title names the failing step.
        const fix = { number: 20, title: "fix(ci): retry check links on a 502", author: { login: "owner" } };
        mark(state, { nodes: [fix] });
        syncJobs(state, { config: CONFIG, now: new Date(AT) });
        expect(state.jobs[id].state).toBe("cancelled");
        expect(sharedLines(state)).toEqual([
            `  Links failing on 3 PRs: shared cause (${LINKS}) -- fix in #20 (its title names ${LINKS})`,
        ]);
        // A stranger's pull request is no fix.
        mark(state, { nodes: [{ ...fix, author: { login: "x" } }] });
        expect(state.sharedFailures[LINKS].fix).toBeNull();
    });

    it("returns the pull requests to their own classification once the shared job is done, until new heads fail", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]), 10: rec(10, [LINKS]) });
        mark(state);
        syncJobs(state, { config: CONFIG, now: new Date(AT) });
        const job = state.jobs["incident-shared-ci-links-check-links"];
        move(job, "starting", new Date(AT), { holder: { session: "s" } });
        move(job, "working", new Date(AT));
        move(job, "verifying", new Date(AT));
        move(job, "done", new Date("2026-10-06T13:00:00Z"));
        const later = "2026-10-06T13:03:00Z";
        expect(mark(state, { at: later }).ended).toEqual([{ key: LINKS, why: "its shared job is done" }]);
        for (const n of [8, 9, 10]) expect(state.prs[n].shared).toBeNull();
        syncJobs(state, { config: CONFIG, now: new Date(later) });
        expect(Object.keys(state.jobs).filter((j) => j.startsWith("pr-"))).toEqual(["pr-8", "pr-9", "pr-10"]);
        // The same heads fail on: no new shared failure. Three new heads failing again are one.
        expect(mark(state, { at: later }).declared).toEqual([]);
        for (const n of [8, 9, 10]) state.prs[n] = rec(n, [LINKS], { headSha: `${n}`.padEnd(40, "1") });
        expect(mark(state, { at: "2026-10-06T14:00:00Z" }).declared).toEqual([LINKS]);
    });

    it("links as the fix an open pull request whose newest run passes the key after it became shared", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]), 10: rec(10, [LINKS]) });
        const run = (/** @type {string} */ conclusion, /** @type {string} */ startedAt, id = 1) => ({
            __typename: "CheckRun",
            name: "Links",
            status: "COMPLETED",
            conclusion,
            startedAt,
            databaseId: id,
            checkSuite: { workflowRun: { workflow: { name: "CI" } } },
        });
        const pr = (/** @type {any[]} */ runs) => ({
            number: 20,
            title: "ci: accept GitHub 5xx",
            author: { login: "owner" },
            commits: { nodes: [{ commit: { statusCheckRollup: { contexts: { nodes: runs } } } }] },
        });
        // A pass from before the key was shared says nothing.
        mark(state, { nodes: [pr([run("SUCCESS", "2026-10-06T11:00:00Z")])] });
        expect(state.sharedFailures[LINKS].fix).toBeNull();
        // Its newest run failing is no fix either.
        const failed = [run("SUCCESS", "2026-10-06T12:01:00Z", 1), run("FAILURE", "2026-10-06T12:02:00Z", 2)];
        mark(state, { nodes: [pr(failed)], at: "2026-10-06T12:03:00Z" });
        expect(state.sharedFailures[LINKS].fix).toBeNull();
        mark(state, { nodes: [pr([run("SUCCESS", "2026-10-06T12:05:00Z")])], at: "2026-10-06T12:06:00Z" });
        expect(state.sharedFailures[LINKS].fix).toEqual({ pr: 20, why: "passes Links while 3 PRs fail it" });
        syncJobs(state, { config: CONFIG, now: new Date(AT) });
        expect(state.jobs).toEqual({});
        expect(sharedLines(state)[0]).toContain("fix in #20 (passes Links while 3 PRs fail it)");
    });

    it("ends when its linked fix merged", () => {
        const state = stateWith({ 8: rec(8, [LINKS]), 9: rec(9, [LINKS]), 10: rec(10, [LINKS]) });
        const fix = { number: 20, title: "fix: check links", author: { login: "owner" } };
        mark(state, { nodes: [fix] });
        state.merged.pending.push({ number: 20 });
        expect(mark(state).ended).toEqual([{ key: LINKS, why: "its fix #20 merged" }]);
        expect(state.prs[8].shared).toBeNull();
    });

    it("reads its threshold from the config", () => {
        expect(CONFIG.sharedFailurePrs).toBe(3);
        const lanes = { ci: { workflow: "ci.yml", gating: "required" } };
        expect(normalizeConfig({ repo: "o/r", lanes, sharedFailurePrs: 4 }).sharedFailurePrs).toBe(4);
        expect(() => normalizeConfig({ repo: "o/r", lanes, sharedFailurePrs: 1 })).toThrow(/sharedFailurePrs/);
    });
});
