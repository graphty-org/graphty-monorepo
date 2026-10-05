import { rmSync } from "node:fs";
import { join } from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { git, isolateGit } from "../../visual-review/test/helpers.mjs";
import { move, newJob } from "../lib/board.mjs";
import { doneIo, githerdDone, pollVerifying, verifyClaim } from "../lib/done.mjs";
import { commitAll, makeRepo, put } from "./helpers/git-repo.mjs";

const NOW = new Date("2026-10-04T12:00:00Z");
const HEAD = "a".repeat(40);
const OTHER = "b".repeat(40);
const FIX = "c".repeat(40);
const GREEN = "d".repeat(40);
const LABELS = {
    types: ["bug", "feature"],
    priorities: ["priority:high", "priority:low"],
    efforts: ["effort:low", "effort:high"],
};

/**
 * A pull request record as the poll leaves it: merge-ready on HEAD.
 * @param {object} [over] fields to change
 * @returns {any} the record
 */
function pr(over = {}) {
    return {
        headSha: HEAD,
        headRef: "fix/x",
        baseRef: "master",
        draft: false,
        references: [5],
        required: { "All Checks Pass": "SUCCESS" },
        ownerGate: false,
        ownerRejected: false,
        mergeStatus: { state: "success", description: "githerd: safe to merge", line: null },
        ...over,
    };
}

/**
 * A fake reader. Issues 5 and 9 exist (9 by the owner); commit FIX exists on GitHub.
 * @param {object} [over] methods to change
 * @returns {any} the reader
 */
function fakeIo(over = {}) {
    const issues = /** @type {Record<number, any>} */ ({
        5: {
            number: 5,
            state: "open",
            user: { login: "owner" },
            labels: [{ name: "bug" }, "priority:high", "effort:low"],
        },
        9: { number: 9, state: "open", user: { login: "owner" }, labels: [] },
        10: { number: 10, state: "open", user: { login: "bot" }, labels: [] },
        11: { number: 11, state: "open", user: { login: "owner" }, pull_request: {} },
    });
    return {
        remoteHead: async () => HEAD,
        extendedByMerges: async () => false,
        contains: async (/** @type {string} */ a, /** @type {string} */ b) => a === FIX && b === GREEN,
        issue: async (/** @type {number} */ n) => issues[n] ?? null,
        commitExists: async (/** @type {string} */ sha) => sha === FIX,
        checkRun: async () => "SUCCESS",
        pull: async () => ({ merged: true, state: "closed", base: { ref: "master" } }),
        npmLatest: async () => "3.0.0",
        releaseOpen: () => [],
        localGate: () => ({ sha: GREEN, passed: true }),
        ...over,
    };
}

/**
 * A working job held by session w1.
 * @param {string} kind the kind
 * @param {string} target the target
 * @param {object} [facts] the job's facts
 * @returns {any} the job
 */
function working(kind, target, facts = {}) {
    const job = newJob({ kind, target, facts }, NOW);
    move(job, "starting", NOW, { holder: { session: "w1", nonce: "n1" } });
    move(job, "working", NOW);
    return job;
}

/**
 * A state with the given pull requests and lanes.
 * @param {object} [over] fields to change
 * @returns {any} the state
 */
function state(over = {}) {
    return {
        jobs: {},
        prs: { 7: pr() },
        master: { branch: "master", greenSha: GREEN, lanes: { CI: { verdict: "green", sha: GREEN, inFlight: {} } } },
        trust: { login: "owner" },
        ...over,
    };
}

const view = (/** @type {any} */ s, /** @type {any} */ io = fakeIo()) => ({ state: s, config: { labels: LABELS }, io });
const report = (/** @type {object} */ over = {}) => ({
    outcome: "done",
    findings: "f",
    defects: [],
    pushedHead: HEAD,
    ...over,
});

/**
 * False claims, one per row: each must be refused with a gap naming the problem.
 * [what, kind, target, facts, report, state changes, reader changes, a word the gap carries]
 * @type {[string, string, string, object, object, object, object, string][]}
 */
const FALSE_CLAIMS = [
    [
        "defect naming no issue",
        "pr",
        "7",
        {},
        { defects: [{ summary: "x", issue: 404 }] },
        {},
        {},
        "#404 does not exist",
    ],
    ["defect naming no commit", "pr", "7", {}, { defects: [{ summary: "x", commit: OTHER }] }, {}, {}, "not on GitHub"],
    ["pr not polled", "pr", "8", {}, {}, {}, {}, "not an open pull request"],
    ["pr based on a branch", "pr", "7", {}, {}, { prs: { 7: pr({ baseRef: "feat/base" }) } }, {}, "based on feat/base"],
    ["pr draft", "pr", "7", {}, {}, { prs: { 7: pr({ draft: true }) } }, {}, "draft"],
    ["no pushed head", "pr", "7", {}, { pushedHead: undefined }, {}, {}, "pushedHead"],
    ["head moved by another", "pr", "7", {}, { pushedHead: OTHER }, {}, {}, "not the pushed"],
    ["branch deleted", "pr", "7", {}, {}, {}, { remoteHead: async () => "" }, "gone"],
    [
        "check failing",
        "pr",
        "7",
        {},
        {},
        { prs: { 7: pr({ required: { "All Checks Pass": "FAILURE" } }) } },
        {},
        "failing",
    ],
    ["owner rejected", "pr", "7", {}, {}, { prs: { 7: pr({ ownerRejected: true, ownerGate: true }) } }, {}, "rejected"],
    [
        "githerd/merge fails a worker line",
        "pr",
        "7",
        {},
        {},
        {
            prs: {
                7: pr({
                    mergeStatus: {
                        state: "failure",
                        description: "held: a commit is breaking but the title has no !",
                        line: 3,
                    },
                }),
            },
        },
        {},
        "githerd/merge",
    ],
    ["issue without pr", "issue", "5", {}, {}, {}, {}, "pr:"],
    ["issue pr not referencing", "issue", "6", {}, { pr: 7 }, {}, {}, "does not reference #6"],
    ["split of a pr job", "pr", "7", {}, { outcome: "split", children: [9] }, {}, {}, "cannot be split"],
    ["split without children", "issue", "5", {}, { outcome: "split" }, {}, {}, "children"],
    [
        "split child by another account",
        "issue",
        "5",
        {},
        { outcome: "split", children: [10] },
        {},
        {},
        "not filed by the owner",
    ],
    ["split child is a pr", "issue", "5", {}, { outcome: "split", children: [11] }, {}, {}, "not an issue"],
    ["split child is the parent", "issue", "5", {}, { outcome: "split", children: [5] }, {}, {}, "the parent itself"],
    [
        "not-needed pr still open without a proposal",
        "pr",
        "7",
        {},
        { outcome: "not-needed" },
        {},
        { pull: async () => ({ state: "open" }) },
        "no open proposal",
    ],
    ["not-needed issue without proposal", "issue", "9", {}, { outcome: "not-needed" }, {}, {}, "no open proposal"],
    ["not-needed review", "review", "7", {}, { outcome: "not-needed" }, {}, {}, "is for issue and pr jobs"],
    [
        "incident without fix",
        "incident",
        "CI / Build / x",
        { scope: "master", lane: "CI" },
        { pushedHead: undefined },
        {},
        {},
        "fix commit",
    ],
    [
        "incident lane still red",
        "incident",
        "CI / Build / x",
        { scope: "master", lane: "CI" },
        { pushedHead: FIX },
        { master: { branch: "master", lanes: { CI: { verdict: "red", sha: OTHER, inFlight: {} } } } },
        {},
        "not green",
    ],
    [
        "incident unknown lane",
        "incident",
        "Nope / x / y",
        { scope: "master" },
        { pushedHead: FIX },
        {},
        {},
        "no lane Nope",
    ],
    [
        "shared incident no canary",
        "incident",
        "CI / Test / y",
        { scope: "shared", lane: "CI", prs: [7] },
        { pushedHead: FIX },
        {},
        {},
        "no canary",
    ],
    [
        "release still half",
        "incident",
        "release:abc",
        { scope: "release" },
        {},
        {},
        { releaseOpen: () => ["release:abc"] },
        "half-state",
    ],
    [
        "local gate failing",
        "incident",
        "local:x",
        { scope: "local" },
        {},
        {},
        { localGate: () => ({ sha: GREEN, passed: false }) },
        "still fails",
    ],
    ["triage missing an issue", "triage", "new", { batch: [5, 9] }, { result: [] }, {}, {}, "#5 has no verdict"],
    [
        "triage labels not on GitHub",
        "triage",
        "new",
        { batch: [9] },
        {
            result: [
                { issue: 9, verdict: "keep", labels: { type: "bug", priority: "priority:low", effort: "effort:low" } },
            ],
        },
        {},
        {},
        "type labels",
    ],
    [
        "triage label of another value, without its prefix",
        "triage",
        "new",
        { batch: [5] },
        { result: [{ issue: 5, verdict: "keep", labels: { type: "bug", priority: "medium", effort: "low" } }] },
        {},
        {},
        "#5 has priority labels [priority:high] on GitHub, not exactly medium",
    ],
    [
        "triage unknown verdict and issue",
        "triage",
        "new",
        {},
        { result: [{ issue: 404, verdict: "maybe", labels: {} }] },
        {},
        {},
        "unknown verdict",
    ],
    [
        "refresh verdict on an issue it did not list",
        "triage",
        "refresh",
        { scope: "refresh", batch: [], open: [{ number: 5, title: "t" }] },
        { result: [{ issue: 9, verdict: "keep", labels: {} }] },
        {},
        {},
        "#9 is not one of the open issues this refresh listed",
    ],
    [
        "refresh missing a mentioned issue",
        "triage",
        "refresh",
        { scope: "refresh", batch: [5], open: [{ number: 5, title: "t" }] },
        { result: [] },
        {},
        {},
        "#5 has no verdict",
    ],
    [
        "review without verdict",
        "review",
        "7",
        { patchId: "p1" },
        { result: { verdict: "nice" } },
        {},
        {},
        "review verdict",
    ],
    [
        "review of a job that names no patch",
        "review",
        "7",
        {},
        { result: { verdict: "pass", patchId: "p1" } },
        {},
        {},
        "names no patch id",
    ],
    [
        "review of another patch",
        "review",
        "7",
        { patchId: "p1" },
        { result: { verdict: "pass", patchId: "p0" } },
        {},
        {},
        "not the job's p1",
    ],
    ["title still failing", "title", "7", {}, {}, {}, { checkRun: async () => "FAILURE" }, "Lint PR Title fails"],
    ["title on unknown pr", "title", "8", {}, {}, {}, {}, "not an open pull request"],
    ["major without pr", "major", "graphty-element", { package: "x", major: 4 }, {}, {}, {}, "pr:"],
    [
        "major pr not merged",
        "major",
        "graphty-element",
        { package: "x", major: 4 },
        { pr: 7 },
        {},
        { pull: async () => ({ merged: false }) },
        "not merged",
    ],
    ["major not on npm", "major", "graphty-element", { package: "x", major: 4 }, { pr: 7 }, {}, {}, "not major 4"],
];

describe("verifyClaim", () => {
    it.each(FALSE_CLAIMS)("refuses: %s", async (_what, kind, target, facts, rep, over, io, word) => {
        const job = working(kind, target, facts);
        const answer = await verifyClaim(job, report(rep), view(state(over), fakeIo(io)));
        expect(answer).toHaveProperty("missing");
        expect(/** @type {any} */ (answer).missing.join(" | ")).toContain(word);
    });

    it("accepts a true claim of each kind", async () => {
        const s = state({ proposals: { "issue:9": { status: "unconfirmed" } } });
        const io = fakeIo();
        const cases = [
            [working("pr", "7"), report()],
            [
                working("issue", "5"),
                report({
                    pr: 7,
                    defects: [
                        { summary: "d", issue: 5 },
                        { summary: "e", commit: FIX },
                    ],
                }),
            ],
            [working("issue", "5"), report({ outcome: "split", children: [9] })],
            [working("issue", "9"), report({ outcome: "not-needed" })],
            [working("pr", "7"), report({ outcome: "not-needed" })],
            [working("pr", "7"), report({ outcome: "failed" })],
            [working("incident", "CI / Build / x", { scope: "master", lane: "CI" }), report({ pushedHead: FIX })],
            [working("incident", "release:abc", { scope: "release" }), report()],
            [working("incident", "local:x", { scope: "local" }), report()],
            [
                working("triage", "new", { batch: [5] }),
                report({
                    result: [
                        {
                            issue: 5,
                            verdict: "keep",
                            labels: { type: "bug", priority: "priority:high", effort: "effort:low" },
                        },
                    ],
                }),
            ],
            // The same labels named without their kind's prefix, as a worker writes them.
            [
                working("triage", "new", { batch: [5] }),
                report({
                    result: [{ issue: 5, verdict: "keep", labels: { type: "bug", priority: "high", effort: "low" } }],
                }),
            ],
            // A refresh whose session judged that the merges affect no listed issue.
            [
                working("triage", "refresh", { scope: "refresh", batch: [], open: [{ number: 5, title: "t" }] }),
                report({ result: [] }),
            ],
            [
                working("review", "7", { patchId: "p1" }),
                report({ result: { verdict: "pass", patchId: "p1", notes: "" } }),
            ],
            [working("title", "7"), report()],
            [working("major", "graphty-element", { package: "@graphty/graphty-element", major: 3 }), report({ pr: 7 })],
        ];
        for (const [job, rep] of cases) expect(await verifyClaim(job, rep, view(s, io))).toEqual({ holds: true });
    });

    it("accepts a head the daemon or Mergify extended by merges from master (the ancestor rule)", async () => {
        const io = fakeIo({
            remoteHead: async () => OTHER,
            extendedByMerges: async (/** @type {string} */ p) => p === HEAD,
        });
        expect(
            await verifyClaim(working("pr", "7"), report(), view(state({ prs: { 7: pr({ headSha: OTHER }) } }), io)),
        ).toEqual({
            holds: true,
        });
    });

    it("leaves a claim undecided while the poll is behind GitHub's head", async () => {
        const io = fakeIo({ remoteHead: async () => OTHER });
        expect(await verifyClaim(working("pr", "7"), report(), view(state(), io))).toBeNull();
    });

    it("accepts a pull request that waits only on the owner's visual review", async () => {
        const s = state({ prs: { 7: pr({ ownerGate: true, required: { "All Checks Pass": "FAILURE" } }) } });
        expect(await verifyClaim(working("pr", "7"), report(), view(s))).toEqual({ holds: true });
    });

    it("accepts a pull request held only for a reason the worker cannot fix", async () => {
        const held = { state: "failure", description: "held: waiting on the owner", line: 5 };
        expect(
            await verifyClaim(working("pr", "7"), report(), view(state({ prs: { 7: pr({ mergeStatus: held }) } }))),
        ).toEqual({
            holds: true,
        });
    });

    it("answers CI pending while required checks run", async () => {
        const s = state({ prs: { 7: pr({ required: { "All Checks Pass": "PENDING" } }) } });
        expect(await verifyClaim(working("pr", "7"), report(), view(s))).toEqual({ ciPending: HEAD });
        expect(
            await verifyClaim(
                working("title", "7"),
                report(),
                view(state(), fakeIo({ checkRun: async () => "PENDING" })),
            ),
        ).toEqual({
            ciPending: HEAD,
        });
    });

    it("waits for an incident's fix to merge, then for a master run containing it", async () => {
        const job = working("incident", "CI / Build / x", { scope: "master", lane: "CI" });
        expect(await verifyClaim(job, report({ pushedHead: HEAD, pr: 7 }), view(state()))).toEqual({ ciPending: HEAD });
        const failing = state({ prs: { 7: pr({ required: { "All Checks Pass": "FAILURE" } }) } });
        expect(await verifyClaim(job, report({ pushedHead: HEAD, pr: 7 }), view(failing))).toHaveProperty("missing");
        const running = state({
            master: {
                branch: "master",
                lanes: { CI: { verdict: "red", sha: OTHER, inFlight: { 1: { sha: GREEN } } } },
            },
        });
        expect(await verifyClaim(job, report({ pushedHead: FIX }), view(running))).toEqual({ ciPending: GREEN });
    });

    it("needs a green canary for a shared key, and waits on one still running", async () => {
        const job = working("incident", "CI / Test / y", { scope: "shared", lane: "CI", prs: [7, 8] });
        const io = fakeIo({
            contains: async (/** @type {string} */ a, /** @type {string} */ b) =>
                a === FIX && [GREEN, OTHER].includes(b),
        });
        const prs = { 7: pr({ headSha: OTHER, required: { "All Checks Pass": "PENDING" } }) };
        expect(await verifyClaim(job, report({ pushedHead: FIX }), view(state({ prs }), io))).toEqual({
            ciPending: OTHER,
        });
        const green = { 7: pr({ headSha: OTHER }) };
        expect(await verifyClaim(job, report({ pushedHead: FIX }), view(state({ prs: green }), io))).toEqual({
            holds: true,
        });
    });

    it("accepts a verdict job once its key has a verdict, or once its lane is no longer red", async () => {
        const KEY = "CI / Build / x";
        const job = working("incident", KEY, { scope: "verdict", lane: "CI" });
        const io = fakeIo();
        const red = (/** @type {any} */ verdicts) => state({ master: { lanes: { CI: { verdict: "red", verdicts } } } });
        expect(await verifyClaim(job, report(), view(red({}), io))).toEqual({
            missing: [`no verdict for ${KEY}: call githerd_verdict with code or environment`],
        });
        const judged = red({ [KEY]: { verdict: "environment" } });
        expect(await verifyClaim(job, report(), view(judged, io))).toEqual({ holds: true });
        const green = state({ master: { lanes: { CI: { verdict: "green" } } } });
        expect(await verifyClaim(job, report(), view(green, io))).toEqual({ holds: true });
    });

    it("leaves release, local gate and npm checks undecided without their facts", async () => {
        const io = fakeIo({ releaseOpen: () => null, localGate: () => null, npmLatest: async () => null });
        expect(
            await verifyClaim(working("incident", "release:x", { scope: "release" }), report(), view(state(), io)),
        ).toBeNull();
        expect(
            await verifyClaim(working("incident", "local:x", { scope: "local" }), report(), view(state(), io)),
        ).toBeNull();
        const major = working("major", "p", { major: 3 });
        expect(await verifyClaim(major, report({ pr: 7 }), view(state(), io))).toBeNull();
    });
});

/**
 * A request context over a state.
 * @param {any} s the state
 * @param {any} [io] the reader
 * @returns {{ctx: any, commits: any[]}} the context and its ledger
 */
function setup(s, io = fakeIo()) {
    /** @type {any[]} */
    const commits = [];
    return {
        ctx: {
            state: s,
            config: { labels: LABELS },
            now: NOW,
            io,
            commit: async (/** @type {any} */ e) => commits.push(e),
        },
        commits,
    };
}

describe("githerdDone", () => {
    it("accepts a true claim and ends the job done", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx, commits } = setup(s);
        expect(await githerdDone(ctx, job, report(), "w1")).toEqual({ text: '{"verified":true}' });
        expect(job.state).toBe("done");
        expect(commits).toEqual([expect.objectContaining({ kind: "done-report", outcome: "done", next: "done" })]);
    });

    it("refuses a false claim with what is missing, and ends the attempt on the third", async () => {
        const s = state({ prs: { 7: pr({ draft: true }) } });
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx } = setup(s);
        for (const n of [1, 2]) {
            const r = await githerdDone(ctx, job, report(), "w1");
            expect(r.isError).toBe(true);
            expect(JSON.parse(r.text)).toEqual({ verified: false, missing: ["#7 is a draft"] });
            expect([job.state, job.verifyFailures]).toEqual(["working", n]);
        }
        const third = JSON.parse((await githerdDone(ctx, job, report(), "w1")).text);
        expect(third.ended).toBe(true);
        expect(job.state).toBe("queued");
        expect(job.attempts).toHaveLength(1);
    });

    it("refuses a job that is not working", async () => {
        const job = working("pr", "7");
        move(job, "waiting", NOW, { waitingFor: { checks: HEAD } });
        await expect(githerdDone(setup(state()).ctx, job, report(), "w1")).rejects.toThrow("waiting");
    });

    it("moves a claim whose checks still run to waiting, and the poll finishes it", async () => {
        const s = state({ prs: { 7: pr({ required: { "All Checks Pass": "PENDING" } }) } });
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx } = setup(s);
        expect(JSON.parse((await githerdDone(ctx, job, report(), "w1")).text).missing[0]).toContain(
            "checks still running",
        );
        expect(job.state).toBe("waiting");
        expect(job.waitingFor).toMatchObject({ checks: HEAD, verify: true });
        expect(await pollVerifying(s, ctx)).toEqual([]);
        s.prs[7].required["All Checks Pass"] = "SUCCESS";
        expect(await pollVerifying(s, ctx)).toEqual([{ job: job.id, action: "done" }]);
        expect(job.state).toBe("done");
    });

    it("sends a waiting claim back to work with news when the checks fail", async () => {
        const s = state({ prs: { 7: pr({ required: { "All Checks Pass": "PENDING" } }) } });
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx } = setup(s);
        await githerdDone(ctx, job, report(), "w1");
        s.prs[7].required["All Checks Pass"] = "FAILURE";
        expect(await pollVerifying(s, ctx)).toEqual([{ job: job.id, action: "working" }]);
        expect(job.news.at(-1).text).toContain("required checks failing");
    });

    it("keeps an undecided claim verifying, then returns it to work after two polls", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx } = setup(
            s,
            fakeIo({
                remoteHead: async () => {
                    throw new Error("network down");
                },
            }),
        );
        const r = JSON.parse((await githerdDone(ctx, job, report(), "w1")).text);
        expect(r.missing[0]).toContain("network down");
        expect(job.state).toBe("verifying");
        expect(await pollVerifying(s, ctx)).toEqual([{ job: job.id, action: "working" }]);
    });

    it("decides a verifying claim on the next poll", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        let up = false;
        const { ctx } = setup(s, fakeIo({ remoteHead: async () => (up ? HEAD : OTHER) }));
        await githerdDone(ctx, job, report(), "w1");
        expect(job.state).toBe("verifying");
        up = true;
        expect(await pollVerifying(s, ctx)).toEqual([{ job: job.id, action: "done" }]);
    });

    it("ends the attempt on failed, but only once every defect it names is on GitHub", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx, commits } = setup(s);
        const refused = await githerdDone(
            ctx,
            job,
            report({ outcome: "failed", defects: [{ summary: "x", issue: 404 }] }),
            "w1",
        );
        expect(refused.isError).toBe(true);
        expect(job.state).toBe("working");
        const ok = await githerdDone(ctx, job, report({ outcome: "failed", theory: "t" }), "w1");
        expect(ok.text).toBe('{"verified":true}');
        expect(job.attempts[0]).toMatchObject({ outcome: "failed", findings: "f", theory: "t" });
        expect(commits.at(-1)).toMatchObject({ outcome: "failed", next: "requeue" });
    });

    it("takes a defect with no issue or commit to the owner instead of refusing the report", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx, commits } = setup(s);
        const defects = [
            { summary: "githerd_done compares priority medium with priority:medium" },
            { summary: "filed", issue: 9 },
        ];
        const ok = await githerdDone(ctx, job, report({ outcome: "failed", defects }), "w1");
        expect(ok.text).toBe('{"verified":true}');
        expect(s.ownerItems["defects:pr-7"]).toMatchObject({
            kind: "defects",
            question:
                "worker reported defects (pr-7), with no issue yet: githerd_done compares priority medium with priority:medium",
        });
        expect(commits).toContainEqual({
            kind: "defects-reported",
            job: "pr-7",
            defects: ["githerd_done compares priority medium with priority:medium"],
        });
    });

    it("records not-needed as an issue proposal, refusing one without evidence", async () => {
        const s = state();
        const job = (s.jobs["issue-9"] = working("issue", "9"));
        const { ctx } = setup(s);
        const refused = JSON.parse((await githerdDone(ctx, job, report({ outcome: "not-needed" }), "w1")).text);
        expect(refused.missing[0]).toContain("needs evidence");
        const ok = await githerdDone(ctx, job, report({ outcome: "not-needed", evidence: "done in #12" }), "w1");
        expect(ok.text).toBe('{"verified":true}');
        expect(s.proposals["issue:9"]).toMatchObject({ kind: "not-needed", status: "unconfirmed", proposedBy: "w1" });
    });

    it("records a pull request's not-needed as a proposal, which holds it while the pull request is open", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx } = setup(s, fakeIo({ pull: async () => ({ state: "open" }) }));
        const ok = await githerdDone(ctx, job, report({ outcome: "not-needed", evidence: "landed in #12" }), "w1");
        expect(ok.text).toBe('{"verified":true}');
        expect(job.state).toBe("done");
        expect(s.proposals["pr:7"]).toMatchObject({ kind: "not-needed-pr", status: "unconfirmed", proposedBy: "w1" });
    });

    it("records a verified triage batch's verdicts and a split's children", async () => {
        const s = state();
        const triage = (s.jobs["triage-new"] = working("triage", "new", { batch: [5] }));
        const { ctx } = setup(s);
        const result = [
            {
                issue: 5,
                verdict: "obsolete",
                evidence: "gone",
                labels: { type: "bug", priority: "priority:high", effort: "effort:low" },
            },
        ];
        expect((await githerdDone(ctx, triage, report({ result }), "w1")).text).toBe('{"verified":true}');
        expect(s.proposals["issue:5"]).toMatchObject({ kind: "obsolete" });
        const parent = (s.jobs["issue-5"] = working("issue", "5"));
        await githerdDone(ctx, parent, report({ outcome: "split", children: [9] }), "w1");
        expect([parent.state, parent.children]).toEqual(["done", [9]]);
    });
});

describe("githerdDone and pollVerifying while a job moves", () => {
    it("answers a second claim for the same job while the first is checked, without counting it", async () => {
        const s = state({ prs: { 7: pr({ draft: true }) } });
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { promise: gate, resolve: release } = Promise.withResolvers();
        const { ctx } = setup(s, fakeIo({ remoteHead: () => gate }));
        const first = githerdDone(ctx, job, report(), "w1");
        const second = JSON.parse((await githerdDone(ctx, job, report(), "w1")).text);
        expect(second).toEqual({
            verified: false,
            missing: ["a done check for this job is already running; wait for its answer"],
        });
        release(HEAD);
        expect(JSON.parse((await first).text).missing).toEqual(["#7 is a draft"]);
        expect(job.verifyFailures).toBe(1);
        // The check is over: the next claim is checked again.
        expect(JSON.parse((await githerdDone(ctx, job, report(), "w1")).text).missing).toEqual(["#7 is a draft"]);
    });

    it("applies nothing when the job moved while GitHub was read", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        const { ctx, commits } = setup(
            s,
            fakeIo({
                remoteHead: async () => {
                    move(job, "queued", NOW, { reason: "recycled" });
                    return HEAD;
                },
            }),
        );
        const r = await githerdDone(ctx, job, report(), "w1");
        expect(r.isError).toBe(true);
        expect(JSON.parse(r.text).missing[0]).toContain("became queued while this claim was checked");
        expect([job.state, job.report, commits]).toEqual(["queued", undefined, []]);
    });

    it("skips a verifying job that moved during its check, and goes on to the next", async () => {
        const s = state({ prs: { 7: pr(), 8: pr() } });
        const a = (s.jobs["pr-7"] = working("pr", "7"));
        const b = (s.jobs["pr-8"] = working("pr", "8"));
        let behind = true;
        const { ctx } = setup(
            s,
            fakeIo({
                remoteHead: async () => {
                    if (behind) return OTHER;
                    if (a.state === "verifying") move(a, "working", NOW);
                    return HEAD;
                },
            }),
        );
        await githerdDone(ctx, a, report(), "w1");
        await githerdDone(ctx, b, report(), "w1");
        expect([a.state, b.state]).toEqual(["verifying", "verifying"]);
        behind = false;
        expect(await pollVerifying(s, ctx)).toEqual([{ job: "pr-8", action: "done" }]);
        expect(a.state).toBe("working");
    });

    it("puts the session of a job that ended done, or back in the queue, on the retiring list", async () => {
        const s = state();
        const job = (s.jobs["pr-7"] = working("pr", "7"));
        job.holder.pane = "%3";
        const { ctx } = setup(s);
        await githerdDone(ctx, job, report(), "w1");
        expect(job.holder).toBeNull();
        expect(s.retiring).toEqual([
            {
                job: "pr-7",
                holder: expect.objectContaining({ session: "w1", pane: "%3" }),
                reason: "job done",
                at: NOW.toISOString(),
            },
        ]);
        // An owner's session (no pane githerd started) is not githerd's to end.
        const owned = (s.jobs["pr-8"] = working("pr", "8"));
        s.prs[8] = pr();
        await githerdDone(ctx, owned, report(), "w1");
        expect(s.retiring).toHaveLength(1);
    });

    it("raises one owner item when an urgent incident spends its last attempt", async () => {
        const s = state();
        const job = (s.jobs.inc = working("incident", "CI / Build / x", { scope: "master", lane: "CI" }));
        const { ctx } = setup(s);
        for (const n of [1, 2, 3]) {
            if (n > 1) {
                move(job, "starting", NOW, { holder: { session: `w${n}` } });
                move(job, "working", NOW);
            }
            const r = await githerdDone(ctx, job, report({ outcome: "failed", findings: `finding ${n}` }), `w${n}`);
            expect(r.text).toBe('{"verified":true}');
        }
        expect(job.state).toBe("failed");
        const items = Object.values(s.ownerItems ?? {});
        expect(items).toHaveLength(1);
        expect(items[0]).toMatchObject({ id: `failed-urgent:${job.id}`, kind: "failed-urgent", target: null });
        expect(items[0].question).toContain("1. failed: finding 1 2. failed: finding 2 3. failed: finding 3");
        // A low-priority incident's or another kind's failure raises none.
        const low = (s.jobs.low = working("incident", "CI / Lint / y", { scope: "low", lane: "CI" }));
        low.budget.attempts = 1;
        await githerdDone(ctx, low, report({ outcome: "failed" }), "w1");
        expect(Object.keys(s.ownerItems)).toHaveLength(1);
    });
});

describe("doneIo", () => {
    /** @type {{tmp: string, root: string, remote: string}} */
    let repo;
    /** @type {Record<string, string>} */
    const sha = {};

    beforeAll(() => {
        isolateGit();
        repo = makeRepo();
        const { root } = repo;
        sha.base = git(root, "rev-parse", "HEAD");
        git(root, "checkout", "-q", "-b", "fix/x");
        put(join(root, "a.txt"), "fix\n");
        sha.pushed = commitAll(root, "fix: a", { sign: false });
        git(root, "push", "-q", "origin", "fix/x");
        git(root, "checkout", "-q", "master");
        put(join(root, "m.txt"), "master\n");
        sha.master = commitAll(root, "chore: m", { sign: false });
        git(root, "push", "-q", "origin", "master");
        git(root, "checkout", "-q", "fix/x");
        git(root, "merge", "-q", "--no-edit", "master");
        sha.merged = git(root, "rev-parse", "HEAD");
        put(join(root, "b.txt"), "more\n");
        sha.extra = commitAll(root, "fix: b", { sign: false });
        git(root, "checkout", "-q", "master");
    });

    afterAll(() => rmSync(repo.tmp, { recursive: true, force: true }));

    it("applies the ancestor rule with git", async () => {
        const io = doneIo({ root: repo.root, repo: "o/r", github: {} });
        expect(await io.remoteHead("fix/x")).toBe(sha.pushed);
        expect(await io.remoteHead("nope")).toBe("");
        expect(await io.extendedByMerges(sha.pushed, sha.merged, "fix/x")).toBe(true);
        expect(await io.extendedByMerges(sha.pushed, sha.extra, "fix/x")).toBe(false);
        expect(await io.extendedByMerges(sha.merged, sha.pushed, "fix/x")).toBe(false);
        expect(await io.extendedByMerges("e".repeat(40), sha.merged, "fix/x")).toBe(false);
        expect(await io.contains(sha.base, sha.master)).toBe(true);
        expect(await io.contains(sha.pushed, sha.master)).toBe(false);
        expect(await io.contains("e".repeat(40), sha.master)).toBe(false);
        expect(io.releaseOpen()).toBeNull();
        expect(io.localGate()).toBeNull();
    });

    it("reads GitHub, with a 404 as absent and any other failure thrown", async () => {
        const answers = /** @type {Record<string, any>} */ ({
            "repos/o/r/issues/5": { number: 5 },
            [`repos/o/r/commits/${FIX}`]: { sha: FIX },
            "repos/o/r/pulls/7": { merged: true },
            [`repos/o/r/commits/${HEAD}/check-runs`]: {
                check_runs: [
                    { id: 1, status: "completed", conclusion: "failure" },
                    { id: 2, status: "completed", conclusion: "success" },
                ],
            },
            [`repos/o/r/commits/${OTHER}/check-runs`]: { check_runs: [{ id: 3, status: "in_progress" }] },
            [`repos/o/r/commits/${GREEN}/check-runs`]: {
                check_runs: [{ id: 4, status: "completed", conclusion: "failure" }],
            },
            [`repos/o/r/commits/${FIX}/check-runs`]: { check_runs: [] },
        });
        const github = {
            get: async (/** @type {string} */ path) => {
                if (path === "repos/o/r/issues/500") throw Object.assign(new Error("boom"), { status: 500 });
                const key = Object.keys(answers).find((k) => path === k || path.startsWith(`${k}?`));
                if (!key) throw Object.assign(new Error("not found"), { status: 404 });
                return { body: answers[key] };
            },
        };
        /**
         * A fake fetch of npm's registry: "missing" is not found, anything else is at 3.1.0.
         * @param {string} url the address
         * @returns {Promise<any>} the response
         */
        const fetchFn = async (url) =>
            url.includes("missing")
                ? { ok: false }
                : { ok: true, json: async () => ({ "dist-tags": { latest: "3.1.0" } }) };
        /** A fetch that fails. @type {any} */
        const broken = async () => {
            throw new Error("x");
        };
        const io = doneIo({ root: repo.root, repo: "o/r", github, fetchFn, releaseOpen: () => ["k"] });
        expect(await io.issue(5)).toEqual({ number: 5 });
        expect(await io.issue(6)).toBeNull();
        await expect(io.issue(500)).rejects.toThrow("boom");
        expect(await io.commitExists(FIX)).toBe(true);
        expect(await io.commitExists(OTHER)).toBe(false);
        expect(await io.pull(7)).toEqual({ merged: true });
        expect(await io.checkRun(HEAD, "Lint PR Title")).toBe("SUCCESS");
        expect(await io.checkRun(OTHER, "Lint PR Title")).toBe("PENDING");
        expect(await io.checkRun(GREEN, "Lint PR Title")).toBe("FAILURE");
        expect(await io.checkRun(FIX, "Lint PR Title")).toBe("MISSING");
        expect(await io.npmLatest("@graphty/x")).toBe("3.1.0");
        expect(await io.npmLatest("missing")).toBeNull();
        const throwing = doneIo({ root: repo.root, repo: "o/r", github, fetchFn: broken });
        expect(await throwing.npmLatest("x")).toBeNull();
        expect(io.releaseOpen()).toEqual(["k"]);
    });
});
