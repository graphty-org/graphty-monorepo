import { describe, expect, it } from "vitest";

import { normalizeConfig } from "../lib/config.mjs";
import { agentReady, dispatch } from "../lib/dispatch.mjs";

const NOW = new Date("2026-10-02T12:00:00Z");
const STARTED = new Date("2026-10-02T09:00:00Z");
const ago = (ms) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const CONFIG = normalizeConfig({
    repo: "o/r",
    mode: "acting",
    lanes: { ci: { workflow: "ci.yml", gating: "required" } },
    trustedAuthors: ["owner"],
    labels: {
        types: ["bug", "enhancement"],
        priorities: ["priority:high", "priority:low"],
        efforts: ["effort:high", "effort:low"],
    },
    backlog: { wipCap: 1, efforts: ["effort:low"] },
    runs: {
        maxConcurrent: 2,
        dailyBudgetUsd: 15,
        caps: {
            "master-red": { turns: 80, budgetUsd: 6, timeoutMinutes: 60 },
            "pr-fix": { turns: 60, budgetUsd: 4, timeoutMinutes: 45 },
            "pr-conflict": { turns: 60, budgetUsd: 4, timeoutMinutes: 45 },
            backlog: { turns: 80, budgetUsd: 5, timeoutMinutes: 60 },
            default: { turns: 30, budgetUsd: 1.5, timeoutMinutes: 15 },
        },
    },
});

/**
 * A green, quiet daemon state.
 * @returns {any} the state
 */
function baseState() {
    return {
        master: { verdict: "green" },
        incidents: {},
        prs: {},
        issues: { byNumber: {} },
        merged: { pendingPaths: {}, closed: [] },
        sessions: {},
        claims: {},
        escalations: {},
        proposals: {},
        runs: {},
        pushedByGitherd: {},
        spend: {},
        schedule: { lastRefreshAt: ago(HOUR) },
    };
}

/**
 * A trusted PR with a failing required check, its head two hours old.
 * @param {object} [over] fields to override
 * @returns {any} the record
 */
function pr(over = {}) {
    return {
        headSha: "h1",
        headRef: "fix/x",
        baseRef: "master",
        draft: false,
        author: "owner",
        title: "fix: x",
        labels: [],
        headChangedAt: ago(2 * HOUR),
        required: { "All Checks Pass": "FAILURE" },
        conflictSightings: 0,
        ownerGate: false,
        ownerRejected: false,
        lastActivityAt: ago(HOUR),
        ...over,
    };
}

/**
 * An incident confirmed an hour ago with Build failing.
 * @param {object} [over] fields to override
 * @returns {any} the record
 */
function incident(over = {}) {
    return {
        id: "inc-1",
        status: "open",
        openedAt: ago(HOUR),
        confirmedAt: ago(HOUR),
        lanes: { ci: { failingJobs: ["Build"] } },
        runs: [],
        ...over,
    };
}

/**
 * A fully labeled, trusted, low-effort issue.
 * @param {object} [over] fields to override
 * @returns {any} the record
 */
function issue(over = {}) {
    return {
        state: "open",
        author: "owner",
        updatedAt: ago(DAY),
        labels: ["bug", "priority:low", "effort:low"],
        lastTriagedAt: null,
        lastRefreshedAt: null,
        ...over,
    };
}

/**
 * A dispatcher harness whose launch records a `running` run, as the runner does.
 * @param {any} state the state
 * @param {object} [extra] more context
 * @returns {{pass: (more?: object) => Promise<any>, launched: any[], end: (id: string, status?: string) => void}}
 *   the harness
 */
function harness(state, extra = {}) {
    /** @type {any[]} */
    const launched = [];
    let n = 0;
    const launch = async (item) => {
        const id = `run-20261002-${String(++n).padStart(4, "0")}-aa`;
        state.runs[id] = {
            id,
            kind: item.kind,
            target: item.target,
            batch: item.batch ?? [],
            status: "running",
            budgetUsd: 1,
        };
        launched.push({ id, ...item });
        return { ok: true, id };
    };
    return {
        launched,
        pass: (more = {}) =>
            dispatch({
                state,
                config: CONFIG,
                mode: "acting",
                now: NOW,
                startedAt: STARTED,
                launch,
                ...extra,
                ...more,
            }),
        end: (id, status = "ended") => {
            state.runs[id].status = status;
        },
    };
}

describe("dispatch: one row of the event table each", () => {
    // [row, setup, the kind that starts or null, more context]
    const rows = [
        [
            "1 master red confirmed",
            (s) => ((s.master.verdict = "red"), (s.incidents["inc-1"] = incident())),
            "master-red",
        ],
        [
            "2 master still red after 2 hours, its run spent",
            (s) => {
                s.master.verdict = "red";
                s.incidents["inc-1"] = incident({
                    confirmedAt: ago(3 * HOUR),
                    runs: [{ run: "r0", failingJobs: ["Build"] }],
                });
                s.runs.r0 = { status: "ended" };
            },
            null,
        ],
        ["3 a revert proposed", (s) => (s.proposals.p = { kind: "revert", status: "pending" }), null],
        ["4 master recovered", (s) => (s.incidents["inc-1"] = incident({ status: "resolved" })), null],
        ["5 master head moved", (s) => (s.merged.pendingPaths = { "a/b.ts": [1] }), null],
        [
            "6 release failed",
            (s) => (s.escalations["release-failed:9"] = { key: "release-failed:9", kind: "release-failed" }),
            "release",
        ],
        ["7 PR head changed", (s) => (s.prs[5] = pr({ required: { x: "SUCCESS" }, headChangedAt: ago(MIN) })), null],
        ["8 PR check failed", (s) => (s.prs[5] = pr()), "pr-fix"],
        ["9 PR check failed while master red", (s) => ((s.prs[5] = pr()), (s.master.verdict = "red")), null],
        ["10 PR conflicting", (s) => (s.prs[5] = pr({ required: {}, conflictSightings: 2 })), "pr-conflict"],
        ["11 PR in the owner gate", (s) => (s.prs[5] = pr({ ownerGate: true })), null],
        ["12 owner rejected images", (s) => (s.prs[5] = pr({ ownerGate: true, ownerRejected: true })), "pr-fix"],
        ["13 PR without auto-merge", (s) => (s.prs[5] = pr({ required: {}, autoMerge: false })), null],
        ["14 breaking PR", (s) => (s.prs[5] = pr({ required: {}, breaking: true, title: "feat!: x" })), null],
        ["15 stale PR", (s) => (s.prs[5] = pr({ required: {}, lastActivityAt: ago(20 * DAY) })), null],
        ["16 unlabeled issue", (s) => (s.issues.byNumber[7] = issue({ labels: [] })), "triage"],
        [
            "17 merged PRs changed paths",
            (s) => {
                s.merged.pendingPaths = { "src/Edge.ts": [3] };
                s.schedule.lastRefreshAt = ago(2 * DAY);
                s.issues.byNumber[7] = issue({ labels: ["bug", "priority:low", "effort:high"] });
            },
            "refresh",
            { issueTexts: async (ns) => ns.map((n) => ({ number: n, title: "Edge.ts draws wrong" })) },
        ],
        [
            "18 proposal grace ended",
            (s) => (s.proposals.p = { kind: "close-issue", status: "pending", graceUntil: ago(HOUR) }),
            null,
        ],
        ["19 veto seen", (s) => (s.proposals.p = { kind: "close-issue", status: "vetoed" }), null],
        ["20 escalation raised", (s) => (s.escalations.d = { key: "d", kind: "decision" }), null],
        ["21 run failed", (s) => (s.escalations["run-failed:r"] = { key: "run-failed:r", kind: "run-failed" }), null],
        ["22 claim expired", (s) => (s.claims["pr:9"] = { target: "pr:9", holder: "gone", expiresAt: ago(MIN) }), null],
        ["23 capacity free", (s) => (s.issues.byNumber[8] = issue()), "backlog"],
        ["24 re-triage due, without the re-triage module", (s) => (s.schedule.lastRetriageAt = ago(8 * DAY)), null],
        [
            "24 re-triage due, with its item",
            () => {},
            "retriage-candidates",
            { extra: [{ kind: "retriage-candidates", event: "retriage-due", target: "task:retriage-1" }] },
        ],
        ["25 digest due", (s) => (s.schedule.lastDigestAt = ago(8 * DAY)), null],
        ["26 GitHub unreachable", (s) => (s.github = { downSince: ago(HOUR) }), null],
        ["27 daily", (s) => (s.schedule.lastAliveAt = ago(2 * DAY)), null],
    ];

    for (const [name, setup, kind, extra] of rows) {
        it(`row ${name}: ${kind ?? "no run"}`, async () => {
            const state = baseState();
            setup(state);
            const h = harness(state, extra);
            await h.pass();
            expect(h.launched.map((l) => l.kind)).toEqual(kind ? [kind] : []);
            if (name.startsWith("12")) expect(h.launched[0].rejected).toBe(true);
        });
    }
});

describe("dispatch: attempt limits", () => {
    it("stops at 3 pr-fix runs when every run leaves a new githerd head, then escalates once", async () => {
        const state = baseState();
        state.prs[5] = pr();
        const h = harness(state);
        for (let i = 1; i <= 5; i++) {
            await h.pass();
            const last = h.launched.at(-1);
            if (last && state.runs[last.id].status === "running") {
                h.end(last.id, "failed");
                state.prs[5].headSha = `g${i}`;
                state.prs[5].headChangedAt = NOW.toISOString();
                state.pushedByGitherd[`g${i}`] = "pr:5";
            }
        }
        expect(h.launched.map((l) => l.kind)).toEqual(["pr-fix", "pr-fix", "pr-fix"]);
        expect(state.escalations["run-limit:pr:5"].kind).toBe("blocked");
    });

    it("stops at 2 pr-conflict runs even when master moves", async () => {
        const state = baseState();
        state.prs[5] = pr({ required: {}, conflictSightings: 2 });
        state.master.headSha = "m1";
        const h = harness(state);
        for (let i = 0; i < 4; i++) {
            await h.pass();
            for (const l of h.launched) h.end(l.id, "failed");
            state.master.headSha = `m${i + 2}`;
            state.master.greenSha = `m${i + 2}`;
        }
        expect(h.launched.map((l) => l.kind)).toEqual(["pr-conflict", "pr-conflict"]);
    });

    it("allows 4 runs per PR in 24 hours across kinds", async () => {
        const state = baseState();
        state.prs[5] = pr();
        const h = harness(state);
        for (let i = 0; i < 3; i++) {
            await h.pass();
            h.end(h.launched.at(-1).id, "failed");
        }
        state.prs[5].required = {};
        state.prs[5].conflictSightings = 2;
        const r = await h.pass();
        h.end(h.launched.at(-1).id, "failed");
        const again = await h.pass();
        expect(h.launched.map((l) => l.kind)).toEqual(["pr-fix", "pr-fix", "pr-fix", "pr-conflict"]);
        expect(r.started).toHaveLength(1);
        expect(again.waiting.map((w) => w.reason)).toContain("4 runs in 24 hours");
    });

    it("an outside push resets the PR limits; a githerd push does not", async () => {
        const state = baseState();
        state.prs[5] = pr();
        const h = harness(state);
        for (let i = 0; i < 3; i++) {
            await h.pass();
            h.end(h.launched.at(-1).id, "failed");
        }
        state.prs[5].headSha = "g1";
        state.pushedByGitherd.g1 = "pr:5";
        await h.pass();
        expect(h.launched).toHaveLength(3);
        expect(state.escalations["run-limit:pr:5"].resolvedAt).toBeNull();

        state.prs[5].headSha = "outside";
        state.prs[5].headChangedAt = ago(HOUR);
        // The runs of the old head are a day old, so only the reset is in play.
        for (const l of h.launched) state.prs[5].attempts.runs.forEach((r) => r.id === l.id && (r.at = ago(2 * DAY)));
        await h.pass();
        expect(h.launched).toHaveLength(4);
        expect(state.prs[5].attempts.resetBy).toBe("outside");
        expect(state.escalations["run-limit:pr:5"].resolvedAt).not.toBeNull();
    });

    it("an interrupted run consumes no attempt", async () => {
        const state = baseState();
        state.prs[5] = pr();
        const h = harness(state);
        for (let i = 0; i < 4; i++) {
            await h.pass();
            h.end(h.launched.at(-1).id, i === 0 ? "interrupted" : "failed");
        }
        expect(h.launched).toHaveLength(4);
    });

    it("starts a second master-red run only when the failing jobs change", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        const h = harness(state);
        await h.pass();
        h.end(h.launched[0].id, "ended");
        const same = await h.pass();
        expect(h.launched).toHaveLength(1);
        expect(same.masterRedUnhandled).toEqual(["inc-1"]);
        expect(state.escalations["master-red:inc-1"].kind).toBe("master-red");

        state.incidents["inc-1"].lanes.ci.failingJobs = ["Build", "Lint"];
        await h.pass();
        expect(h.launched).toHaveLength(2);
        expect(h.launched[1].failingJobs).toEqual(["Build", "Lint"]);
        h.end(h.launched[1].id, "ended");
        state.incidents["inc-1"].lanes.ci.failingJobs = ["Test"];
        await h.pass();
        expect(h.launched).toHaveLength(2);
    });

    it("carries the last run's summary into the master-red escalation as run text", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident({ runs: [{ run: "r0", failingJobs: ["Build"] }] });
        state.runs.r0 = { status: "ended", structured: { summary: "flaky GPU lane" } };
        await harness(state).pass();
        expect(state.escalations["master-red:inc-1"].detail).toBe("[run text] flaky GPU lane");
    });
});

describe("dispatch: ownership and holds", () => {
    it("gives no run to a PR whose head branch a live session reports", async () => {
        const state = baseState();
        state.prs[5] = pr();
        state.sessions.s1 = { branch: "fix/x", lastSeen: ago(MIN) };
        const h = harness(state);
        const r = await h.pass();
        expect(h.launched).toEqual([]);
        expect(r.waiting[0].reason).toBe("a session works on fix/x");

        state.sessions.s1.lastSeen = ago(HOUR);
        await harness(state)
            .pass()
            .then((x) => expect(x.started).toHaveLength(1));
    });

    it("gives no run to a PR a session claims", async () => {
        const state = baseState();
        state.prs[5] = pr();
        state.sessions.s1 = { lastSeen: ago(MIN) };
        state.claims["pr:5"] = { target: "pr:5", holder: "s1", expiresAt: ago(-HOUR) };
        expect((await harness(state).pass()).started).toEqual([]);
    });

    it("skips a PR whose head changed in the last 30 minutes unless githerd pushed it", async () => {
        const state = baseState();
        state.prs[5] = pr({ headChangedAt: ago(10 * MIN) });
        expect((await harness(state).pass()).waiting[0].reason).toBe("head changed in the last 30 minutes");
        state.pushedByGitherd.h1 = "pr:5";
        expect((await harness(state).pass()).started).toHaveLength(1);
    });

    it("holds a master-red run for 15 minutes and skips it when a session claims master in that time", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident({ openedAt: ago(5 * MIN), confirmedAt: ago(5 * MIN) });
        const h = harness(state);
        expect((await h.pass()).waiting[0].reason).toBe("15 minute hold");
        expect(state.incidents["inc-1"].holdUntil).toBe(ago(-10 * MIN));

        state.sessions.s1 = { lastSeen: ago(MIN) };
        state.claims.master = { target: "master", holder: "s1", expiresAt: ago(-HOUR) };
        state.incidents["inc-1"].holdUntil = ago(MIN);
        const r = await h.pass();
        expect(h.launched).toEqual([]);
        expect(r.waiting[0].reason).toBe("a session claims master");
        expect(r.masterRedUnhandled).toEqual([]);
    });

    it("skips a master-red run when a trusted author opened a PR after the red", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        state.prs[6] = pr({ required: {}, createdAt: ago(30 * MIN) });
        const r = await harness(state).pass();
        expect(r.started).toEqual([]);
        expect(r.waiting[0].reason).toBe("a trusted PR was opened after the red");
    });

    it("waits while a run on the target is in flight, then queues one follow-up", async () => {
        const state = baseState();
        state.prs[5] = pr();
        const h = harness(state);
        await h.pass();
        const r = await h.pass();
        expect(h.launched).toHaveLength(1);
        expect(r.waiting[0].reason).toBe("a run on this target is in flight");
        h.end(h.launched[0].id, "failed");
        await h.pass();
        expect(h.launched).toHaveLength(2);
    });

    it("starts no run before the restart hold ends, and does not report master red as unhandled", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        const r = await harness(state).pass({ holdUntil: new Date(NOW.getTime() + MIN) });
        expect(r.started).toEqual([]);
        expect(r.masterRedUnhandled).toEqual([]);
    });
});

describe("dispatch: priority and admission", () => {
    it("starts in priority order and stops at the first refusal", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        state.issues.byNumber[7] = issue({ labels: [] });
        state.escalations["release-stalled:x"] = { key: "release-stalled:x", kind: "release-stalled" };
        const h = harness(state);
        const r = await h.pass();
        expect(h.launched.map((l) => l.kind)).toEqual(["master-red", "release"]);
        expect(r.waiting.find((w) => w.item.kind === "triage").reason).toMatch(/runs running/);
    });

    it("reports master red unhandled when the day's budget cannot fit its run", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        state.spend["2026-10-02"] = 10;
        const r = await harness(state).pass();
        expect(r.started).toEqual([]);
        expect(r.masterRedUnhandled).toEqual(["inc-1"]);
    });

    it("leaves an item waiting when launch refuses it, and goes on", async () => {
        const state = baseState();
        state.prs[5] = pr();
        state.issues.byNumber[7] = issue({ labels: [] });
        let n = 0;
        const r = await dispatch({
            state,
            config: CONFIG,
            mode: "acting",
            now: NOW,
            startedAt: STARTED,
            launch: async (item) => {
                if (item.kind === "pr-fix") return { ok: false, reason: "the PR changed .claude/" };
                state.runs[`r${++n}`] = { kind: item.kind, target: item.target, status: "running", budgetUsd: 1 };
                return { ok: true, id: `r${n}` };
            },
        });
        expect(r.waiting[0].reason).toBe("the PR changed .claude/");
        expect(r.started.map((s) => s.item.kind)).toEqual(["triage"]);
        expect(state.prs[5].attempts.runs).toEqual([]);
    });

    it("pages master red when its run cannot launch", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        const r = await dispatch({
            state,
            config: CONFIG,
            mode: "acting",
            now: NOW,
            startedAt: STARTED,
            launch: async () => ({ ok: false, reason: "code-editing runs are off" }),
        });
        expect(r.started).toEqual([]);
        expect(r.masterRedUnhandled).toEqual(["inc-1"]);
    });

    it("in dry-run, starts runs on the dry-run budget, where a $6 master-red run cannot fit", async () => {
        const state = baseState();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident();
        const r = await harness(state).pass({ mode: "dry-run" });
        expect(r.started).toEqual([]);
        expect(r.masterRedUnhandled).toEqual(["inc-1"]);
        state.master.verdict = "green";
        state.incidents = {};
        state.prs[5] = pr();
        expect((await harness(state).pass({ mode: "dry-run" })).started.map((s) => s.item.kind)).toEqual(["pr-fix"]);
    });

    it("starts nothing while paused", async () => {
        const state = baseState();
        state.prs[5] = pr();
        expect((await harness(state).pass({ mode: "paused" })).started).toEqual([]);
    });
});

describe("dispatch: triage, refresh and release", () => {
    it("batches up to 10 issues, at most one triage run per 30 minutes, once per update", async () => {
        const state = baseState();
        for (let n = 1; n <= 12; n++) state.issues.byNumber[n] = issue({ labels: ["bug"] });
        const h = harness(state);
        await h.pass();
        expect(h.launched[0].target).toBe("issue:1");
        expect(h.launched[0].batch).toHaveLength(9);
        h.end(h.launched[0].id);
        expect((await h.pass()).waiting[0].reason).toBe("one triage run per 30 minutes");
        state.schedule.lastTriageAt = ago(HOUR);
        await h.pass();
        expect(h.launched[1].target).toBe("issue:11");
        expect(h.launched[1].batch).toEqual(["issue:12"]);
    });

    it("refreshes the top issues by named paths and spends the paths", async () => {
        const state = baseState();
        state.schedule.lastRefreshAt = ago(2 * DAY);
        state.merged.pendingPaths = { "src/Edge.ts": [3] };
        state.merged.closed = [9];
        for (const n of [7, 8, 9]) state.issues.byNumber[n] = issue({ labels: ["bug", "priority:low", "effort:high"] });
        state.issues.byNumber[8].lastRefreshedAt = ago(DAY);
        const texts = async (ns) => ns.map((n) => ({ number: n, title: "src/Edge.ts" }));
        const h = harness(state, { issueTexts: texts });
        await h.pass();
        expect(h.launched[0]).toMatchObject({ kind: "refresh", target: "issue:7", batch: [] });
        expect(state.merged.pendingPaths).toEqual({});
        expect(state.issues.byNumber[7].lastRefreshedAt).toBe(NOW.toISOString());
    });

    it("spends the paths without a run when no issue names them", async () => {
        const state = baseState();
        state.schedule.lastRefreshAt = ago(2 * DAY);
        state.merged.pendingPaths = { "src/Edge.ts": [3] };
        state.issues.byNumber[7] = issue({ labels: ["bug", "priority:low", "effort:high"] });
        const h = harness(state, { issueTexts: async (ns) => ns.map((n) => ({ number: n, title: "unrelated" })) });
        await h.pass();
        expect(h.launched).toEqual([]);
        expect(state.merged.pendingPaths).toEqual({});
    });

    it("starts one release run per escalation", async () => {
        const state = baseState();
        state.escalations["lane-stuck:gpu:1"] = { key: "lane-stuck:gpu:1", kind: "blocked" };
        const h = harness(state);
        await h.pass();
        h.end(h.launched[0].id);
        await h.pass();
        expect(h.launched).toHaveLength(1);
        expect(state.escalations["lane-stuck:gpu:1"].run).toBe(h.launched[0].id);
    });
});

describe("dispatch: backlog", () => {
    const ctx = (state) => ({ state, config: CONFIG, now: NOW });

    it("an untrusted-author issue that a run labeled is never agent-ready", () => {
        const state = baseState();
        expect(agentReady(4, issue({ author: "stranger" }), ctx(state))).toBe(false);
        expect(agentReady(4, issue(), ctx(state))).toBe(true);
    });

    it("excludes blocked and needs-* labels, the wrong effort, a missing label, and a referencing PR", () => {
        const state = baseState();
        const base = ["bug", "priority:low", "effort:low"];
        for (const extra of ["blocked", "needs-decision", "needs-info", "needs-anything", "research", "in-progress"]) {
            expect(agentReady(4, issue({ labels: [...base, extra] }), ctx(state))).toBe(false);
        }
        expect(agentReady(4, issue({ labels: ["bug", "priority:low", "effort:high"] }), ctx(state))).toBe(false);
        expect(agentReady(4, issue({ labels: ["bug", "effort:low"] }), ctx(state))).toBe(false);
        state.prs[9] = pr({ title: "fix: closes #4" });
        expect(agentReady(4, issue(), ctx(state))).toBe(false);
        expect(agentReady(40, issue(), ctx(state))).toBe(true);
    });

    it("takes the highest priority, then the oldest, once per 7 days, and only under the WIP cap", async () => {
        const state = baseState();
        state.issues.byNumber[3] = issue();
        state.issues.byNumber[5] = issue({ labels: ["bug", "priority:high", "effort:low"] });
        state.issues.byNumber[4] = issue({ labels: ["bug", "priority:high", "effort:low"] });
        const h = harness(state);
        await h.pass();
        expect(h.launched[0]).toMatchObject({ target: "issue:4", branch: "githerd/issue-4" });
        h.end(h.launched[0].id);
        state.prs[20] = pr({ headRef: "githerd/issue-4", required: {}, title: "feat: y" });
        await h.pass();
        expect(h.launched).toHaveLength(1);
        delete state.prs[20];
        await h.pass();
        expect(h.launched[1].target).toBe("issue:5");
    });

    it("waits while master is red or other work is queued", async () => {
        const state = baseState();
        state.issues.byNumber[3] = issue();
        state.master.verdict = "red";
        state.incidents["inc-1"] = incident({ confirmedAt: ago(MIN), openedAt: ago(MIN) });
        expect((await harness(state).pass()).started).toEqual([]);
        state.master.verdict = "green";
        state.incidents = {};
        state.prs[5] = pr();
        const h = harness(state);
        await h.pass();
        expect(h.launched.map((l) => l.kind)).toEqual(["pr-fix"]);
    });
});
