import { describe, expect, it } from "vitest";

import { move, newJob } from "../lib/board.mjs";
import { groupModes, modeText, renderBoard, SECTIONS, span, whyText } from "../lib/board-text.mjs";

const NOW = new Date("2026-10-03T12:00:00.000Z");
const LIVE = { alive: null, progress: null, fatal: null };

/**
 * A view with only state.
 * @param {any} state the state
 * @param {object} [more] other view fields
 * @returns {any} the view
 */
const view = (state, more = {}) => ({ state, liveness: LIVE, down: null, ...more });

describe("span", () => {
    it("reads at a glance at every scale", () => {
        expect([45_000, 12 * 60_000, 3 * 3_600_000 + 5 * 60_000, 2 * 86_400_000 + 4 * 3_600_000, -5].map(span)).toEqual(
            ["45 s", "12 min", "3 h 5 min", "2 d 4 h", "0 s"],
        );
    });
});

describe("renderBoard", () => {
    it("puts FATAL, the down line, banners and faults first, whatever the section", () => {
        const text = renderBoard(
            view(
                {},
                {
                    liveness: { ...LIVE, fatal: "gh is not authenticated" },
                    down: "no daemon.json",
                    banners: ["config refused; running the last good one"],
                    faults: [{ record: "job issue-737", problem: "waiting on nothing declared" }],
                },
            ),
            NOW,
            "jobs",
        );
        expect(text.split("\n")).toEqual([
            "githerd board at 10-03 12:00 UTC",
            "githerd is DOWN: gh is not authenticated",
            "DAEMON DOWN: no daemon.json; read from state.json, GitHub facts unknown",
            "BANNER: config refused; running the last good one",
            "FAULT job issue-737: waiting on nothing declared (githerd why issue-737)",
            "JOBS: none",
        ]);
    });

    it("shows the last invitation of idle sessions under the jobs", () => {
        const text = renderBoard(
            view({ invited: { at: "2026-10-03T11:42:00.000Z", count: 2, acting: true } }),
            NOW,
            "jobs",
        );
        expect(text.split("\n").slice(1)).toEqual(["JOBS: none", "  invited 2 idle sessions at 11:42"]);
    });

    it("refuses an unknown section, and says nothing is waiting when nothing is", () => {
        expect(() => renderBoard(view({}), NOW, "weather")).toThrow(/unknown section weather/);
        const text = renderBoard(view({}), NOW);
        for (const line of [
            "MASTER: unknown",
            "RELEASE: unknown",
            "INCIDENTS: none",
            "OWNER: nothing is waiting on you",
            "PULL REQUESTS: unknown",
            "PUSH QUEUE: unknown",
            "SESSIONS: none",
            "ORDERS AND POLICIES: none",
            "LIMITS: unknown",
            "  alive written never",
            "  progress: none",
        ])
            expect(text).toContain(line);
        expect(SECTIONS.every((s) => typeof renderBoard(view({}), NOW, s) === "string")).toBe(true);
    });

    it("shows a green master, release half-states, empty pull requests, a held push lock", () => {
        const lanes = {
            lanes: { CI: { verdict: "green", newest: null, redSince: null, keys: {} } },
            shas: {},
            greenSha: null,
            ciGreenSha: null,
        };
        const text = renderBoard(
            view(
                {},
                {
                    lanes,
                    release: {
                        incidents: [{ reason: "tagged but not on npm: a@1.0.0" }],
                        propagating: [{ name: "b", version: "2.0.0" }],
                    },
                    prs: [],
                    pushQueue: { holder: "pid 12 (githerd-issue-7)", waiters: 2 },
                    health: {},
                },
            ),
            NOW,
        );
        expect(text).toContain("MASTER: green\n  CI: green\n  green commit none; CI-green commit none");
        expect(text).toContain(
            "RELEASE:\n  half-state: tagged but not on npm: a@1.0.0\n  waiting for npm to serve b@2.0.0",
        );
        expect(text).toContain("PULL REQUESTS: none open");
        expect(text).toContain("PUSH QUEUE: running pid 12 (githerd-issue-7), 2 waiting");
        expect(text).toContain("worker hours today 0; phone alerts unknown");
    });

    it("shows a pending decision, a paused clock, orders, live policies and ended owner items left out", () => {
        const job = newJob({ kind: "issue", target: "#9", id: "issue-9" }, NOW);
        move(job, "starting", NOW, { holder: { session: "s-2" } });
        job.pausedBy = ["usage stop"];
        const state = {
            jobs: { [job.id]: job, done: { ...newJob({ kind: "pr", target: "#3", id: "pr-3" }, NOW), state: "done" } },
            ownerItems: { old: { id: "old", kind: "x", question: "gone", endedAt: NOW.toISOString() } },
            sessions: { "s-2": {} },
            orders: [{ id: "o1", issues: [4, 5] }],
            policies: [
                { id: "p1", text: "freeze-merges" },
                { id: "p2", text: "old", endedAt: "x" },
            ],
        };
        const text = renderBoard(
            view(state, { prs: [{ number: 8, decision: { state: "pending", description: "", line: null } }] }),
            NOW,
        );
        expect(text).toContain("  issue-9 starting 0 s, clock paused by usage stop, held by s-2 -- no reason recorded");
        expect(text).not.toContain("pr-3");
        expect(text).toContain("OWNER: nothing is waiting on you");
        expect(text).toContain("  #8 -- githerd is evaluating");
        state.prOwners = { 8: { session: "s-2", name: "graphty-7c", at: NOW.toISOString(), by: "cli" } };
        const owned = renderBoard(
            view(state, { prs: [{ number: 8, decision: { state: "pending", description: "", line: null } }] }),
            NOW,
        );
        expect(owned).toContain("  #8 -- githerd is evaluating -- owned by session graphty-7c (cli)");
        delete state.prOwners;
        state.prInferred = { 8: { session: "s-3", name: "graphty-9", evidence: "working in .worktrees/x" } };
        const inferred = renderBoard(
            view(state, { prs: [{ number: 8, decision: { state: "pending", description: "", line: null } }] }),
            NOW,
        );
        expect(inferred).toContain(
            "  #8 -- githerd is evaluating -- owned by session graphty-9 (working in .worktrees/x)",
        );
        expect(text).toContain("SESSIONS (1):\n  s-2\n");
        expect(text).toContain("  order o1: #4 #5\n  policy p1: freeze-merges\n");
        expect(text).not.toContain("policy p2");
    });
});

describe("groupModes and modeText", () => {
    it("never shows a group acting when its switch is off or it has none, and lowers by the override", () => {
        const config = { mode: "acting", actions: { statuses: true, prUpkeep: false } };
        expect(groupModes(config, null)).toEqual({
            statuses: "acting",
            upkeep: "dry-run",
            incidents: "dry-run",
            "owner-items": "dry-run",
            proposals: "dry-run",
            workers: "dry-run",
            "worker-writes": "dry-run",
        });
        expect(Object.values(groupModes(config, "paused"))).toEqual(Array(7).fill("paused"));
        // Workers can act while their pushes, re-runs and gh writes stay dry-run.
        expect(groupModes({ mode: "acting", actions: { workers: true } }, null)).toMatchObject({
            workers: "acting",
            "worker-writes": "dry-run",
        });
    });

    it("counts each group's would-do and action lines and the situations they name", () => {
        const ledger = [
            { ts: "2026-10-02T10:00:00.000Z", kind: "would-do", group: "statuses", situation: "new head" },
            { ts: "2026-10-02T11:00:00.000Z", kind: "would-do", group: "statuses", situation: "red lane" },
            { ts: "2026-10-02T12:00:00.000Z", kind: "action", group: "statuses", situation: "red lane" },
            { ts: "2026-10-02T13:00:00.000Z", kind: "decision", group: "statuses" },
        ];
        expect(modeText({ statuses: "dry-run", upkeep: "dry-run" }, ledger).split("\n")).toEqual([
            "statuses       dry-run  3 lines, 2 situations, last 10-02 12:00",
            "upkeep         dry-run  no ledger lines yet",
        ]);
    });
});

describe("whyText", () => {
    const job = newJob({ kind: "pr", target: "#412", id: "pr-412", reason: "red checks", facts: { since: "x" } }, NOW);
    job.attempts.push({ endedAt: "2026-10-03T10:00:00.000Z", outcome: "no GitHub change within the working budget" });
    move(job, "starting", NOW, { holder: { session: "s" } });
    move(job, "working", NOW);
    move(job, "waiting", NOW, { waitingFor: { checks: "abc" } });
    const state = {
        jobs: { [job.id]: job },
        ownerItems: {
            a: { id: "a", kind: "visual", question: "approve the baselines", target: "pr:412" },
            b: { id: "b", kind: "money", question: "top up", endedAt: "2026-10-03T11:00:00.000Z" },
        },
    };

    it("explains a pull request by any of its names, with its job, owner item and ledger lines", () => {
        const ledger = [
            { ts: "2026-10-03T09:00:00.000Z", kind: "record", collection: "jobs", id: "pr-412" },
            { ts: "2026-10-03T09:05:00.000Z", kind: "would-do", targets: ["pr:412"], op: "status" },
            { ts: "2026-10-03T09:06:00.000Z", kind: "would-do", target: "pr:413" },
        ];
        const text = /** @type {string} */ (whyText("412", state, ledger, NOW));
        expect(text.split("\n")).toEqual([
            "job pr-412 (pr, #412): waiting 0 s, doorbell in 10 min, held by s",
            "  reason: red checks",
            '  waiting for: {"checks":"abc"}',
            "  attempt ended 10-03 10:00: no GitHub change within the working budget",
            '  facts: {"since":"x"}',
            "owner item a [visual], open: approve the baselines",
            "ledger:",
            '  10-03 09:00 record {"collection":"jobs","id":"pr-412"}',
            '  10-03 09:05 would-do {"targets":["pr:412"],"op":"status"}',
        ]);
        expect(whyText("#412", state, [], NOW)).toBe(whyText("pr:412", state, [], NOW));
    });

    it("shows an ended owner item, keeps the last 30 ledger lines, and answers null for an unknown item", () => {
        expect(whyText("b", state, [], NOW)).toBe("owner item b [money], ended 10-03 11:00: top up");
        const ledger = Array.from({ length: 35 }, (_, i) => ({ kind: "note", key: "k", n: i }));
        const lines = /** @type {string} */ (whyText("k", {}, ledger, NOW)).split("\n");
        expect(lines[0]).toBe("ledger: 5 earlier lines not shown (githerd ledger --target k)");
        expect(lines).toHaveLength(31);
        expect(lines[1]).toBe('  ? note {"key":"k","n":5}');
        expect(whyText("nothing", state, ledger, NOW)).toBeNull();
    });
});
