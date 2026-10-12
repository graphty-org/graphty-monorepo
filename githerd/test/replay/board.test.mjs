import { describe, expect, it } from "vitest";

import { move, newJob } from "../../lib/board.mjs";
import { renderBoard } from "../../lib/board-text.mjs";
import { emptyFacts, foldJobs, foldRuns } from "../../lib/lanes.mjs";
import { createReplay } from "./replay.mjs";

const MASTER = "repos/graphty-org/graphty-monorepo/actions/runs?branch=master&per_page=100";
const CONFIG = { gating: /** @type {const} */ ({ CI: "required", GPU: "required", Hosts: "if-run" }), ci: "CI" };

/**
 * The lane facts at each of `moments`, from a minute-by-minute replay of master's runs.
 * @param {string} from the first minute
 * @param {string[]} moments the minutes to keep, in order
 * @returns {Map<string, import("../../lib/lanes.mjs").LaneFacts>} the facts by moment
 */
function factsAt(from, moments) {
    const replay = createReplay();
    let facts = emptyFacts();
    const kept = new Map();
    const end = Date.parse(moments.at(-1) ?? from);
    for (let now = Date.parse(from); now <= end; now += 60_000) {
        const runs = replay.answer(MASTER, now).body.workflow_runs;
        const out = foldRuns(facts, runs, CONFIG, now);
        facts = out.facts;
        for (const s of out.sighted.filter((r) => r.conclusion === "failure")) {
            const name = runs.find((/** @type {any} */ r) => r.id === s.runId).name;
            const jobs = replay.answer(`repos/graphty-org/graphty-monorepo/actions/runs/${s.runId}/jobs`, now).body
                .jobs;
            facts = foldJobs(facts, name, s.runId, jobs, now, ["All Checks Pass"]);
        }
        const at = new Date(now).toISOString();
        if (moments.includes(at)) kept.set(at, facts);
    }
    return kept;
}

/**
 * The jobs githerd would hold during the red CI stretch: one incident per key, the first one
 * worked by a session, and one issue job queued behind them.
 * @param {import("../../lib/lanes.mjs").LaneFacts} facts the facts
 * @param {Date} now the moment
 * @returns {any} the state
 */
function stateFor(facts, now) {
    const jobs = {};
    const keys = Object.entries(facts.lanes).flatMap(([, lane]) => Object.keys(lane.keys));
    keys.forEach((key, i) => {
        const job = newJob(
            {
                kind: "incident",
                target: key,
                id: `incident-${i + 1}`,
                facts: { class: "code", step: "red-head re-run" },
            },
            new Date(now.getTime() - (keys.length - i) * 600_000),
        );
        if (i === 0) {
            move(job, "starting", now, { holder: { session: "s-1", window: "githerd:w1" } });
            move(job, "working", now, { reason: "fixing the failing test" });
        }
        jobs[job.id] = job;
    });
    const issue = newJob({ kind: "issue", target: "#737", id: "issue-737", reason: "next by priority" }, now);
    jobs[issue.id] = issue;
    return {
        schema: 1,
        jobs,
        ownerItems: {
            "item-1": {
                id: "item-1",
                kind: "paid capacity",
                question: "top up the GPU runner balance",
                raisedAt: new Date(now.getTime() - 3_600_000).toISOString(),
            },
        },
        sessions: { "s-1": { name: "worker 1", job: "incident-1", window: "githerd:w1" } },
    };
}

describe("the board from replay states", () => {
    const moments = ["2026-10-01T20:00:00.000Z", "2026-10-02T05:30:00.000Z"];
    const facts = factsAt("2026-10-01T12:00:00.000Z", moments);

    it("10-01 20:00: CI red since the merge of #662, four keys, one worked and three queued", async () => {
        const now = new Date(moments[0]);
        const lanes = /** @type {any} */ (facts.get(moments[0]));
        const view = {
            state: stateFor(lanes, now),
            liveness: {
                alive: { at: "2026-10-01T19:59:55.000Z", pid: 4242, version: "0.1.0" },
                progress: { step: "poll", since: "2026-10-01T19:59:58.000Z" },
                fatal: null,
            },
            down: null,
            lanes,
            release: { incidents: [], propagating: [] },
            prs: [
                {
                    number: 704,
                    title: "fix(layout): stop the drift",
                    decision: {
                        state: "failure",
                        description: "held: CI is red on master and can affect this change",
                        line: 2,
                    },
                },
                { number: 705, decision: { state: "success", description: "githerd: safe to merge", line: null } },
            ],
            pushQueue: { holder: null, waiters: 0 },
            limits: { workers: { used: 1, max: 3, measured: "load 2.1 of 24 cores" } },
            health: {
                rate: "4210 of 5000 left",
                workerHoursToday: 1.5,
                phone: "working",
                hidden: 0,
                stopGatesFailedOpen: 0,
            },
            modes: {
                statuses: "dry-run",
                upkeep: "dry-run",
                incidents: "dry-run",
                "owner-items": "dry-run",
                proposals: "dry-run",
                workers: "dry-run",
            },
            faults: [],
        };
        await expect(renderBoard(view, now)).toMatchFileSnapshot("board-10-01-2000.txt");
    });

    it("10-02 05:30: CI, GPU and Hosts red at once; the same state read with the daemon down", async () => {
        const now = new Date(moments[1]);
        const lanes = /** @type {any} */ (facts.get(moments[1]));
        const state = stateFor(lanes, now);
        await expect(
            renderBoard(
                { state, liveness: { alive: null, progress: null, fatal: null }, down: null, lanes },
                now,
                "master",
            ),
        ).toMatchFileSnapshot("board-10-02-0530-master.txt");
        const down = {
            state,
            liveness: {
                alive: { at: "2026-10-02T05:12:00.000Z", pid: 4242, version: "0.1.0" },
                progress: { step: "reconcile", since: "2026-10-02T05:11:40.000Z" },
                fatal: null,
            },
            down: "no daemon.json; state.json written 1080 s ago",
        };
        await expect(renderBoard(down, now)).toMatchFileSnapshot("board-10-02-0530-down.txt");
    });
});
