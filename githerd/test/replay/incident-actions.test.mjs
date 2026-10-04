import { describe, expect, it } from "vitest";

import { classify } from "../../lib/classify.mjs";
import { createGitHub } from "../../lib/github.mjs";
import { createIncidentActions } from "../../lib/incident-actions.mjs";
import { emptyFacts, foldRuns } from "../../lib/lanes.mjs";
import { createFakeGh, httpOutput } from "../helpers/fake-gh.mjs";
import { createReplay } from "./replay.mjs";

const REPO = "graphty-org/graphty-monorepo";
const MASTER = `repos/${REPO}/actions/runs?branch=master&per_page=100`;
const LANES = { gating: { CI: "required", GPU: "required", Hosts: "if-run" }, ci: "CI" };
const GPU_JOB = "Test (NVIDIA T4)";
const RENTED = "machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand";
/**
 * The failed step of each red GPU run of 10-02. The record keeps the jobs of a run's latest attempt
 * only, and all three passed on their second, so the steps come from platform facts 9.5 and 9.6
 * (the balance texts) and incidents.md part 2, 19 (the benchmark row; its step name is not
 * recorded, and the class does not depend on it). The job ids are not recorded either.
 */
const STEPS = {
    36962785245: "Machine: Insufficient balance to run job. Current balance: $-2.0800. Minimum required: $0.05.",
    36973764479: "Benchmark compare",
    37078532134: "Machine: Insufficient balance to run job. Current balance: $-2.7950. Minimum required: $0.05.",
};
const UNRECORDED_JOB_ID = 0;

describe("replay: the daemon's incident actions on 2026-10-02", () => {
    it("the flaky benchmark is re-run once and filed as intermittent; the balance stretches spend no paid re-run; nothing is written", async () => {
        const replay = createReplay();
        // The replay serves each run attempt's jobs from its recorded result: the one GPU job.
        const fake = createFakeGh((call) => {
            const m = /actions\/runs\/(\d+)\/attempts\/(\d+)\/jobs/.exec(call.args.at(-1) ?? "");
            if (!m) return httpOutput(replay.response(call));
            const a = replay.record.master
                .find((t) => String(t.run.id) === m[1])
                ?.attempts.find((x) => x.n === Number(m[2]));
            if (!a || replay.now() < a.start) return httpOutput({ status: 404, body: { message: "Not Found" } });
            const finished = replay.now() >= a.end;
            const job = {
                name: GPU_JOB,
                status: finished ? "completed" : "in_progress",
                conclusion: finished ? a.conclusion : null,
            };
            return httpOutput({ status: 200, body: { jobs: [job] } });
        });
        /** @type {any[]} */
        const ledger = [];
        const github = createGitHub({
            repo: REPO,
            fetch: fake.fetch,
            token: fake.token,
            mode: (group) => (group === "incidents" ? "dry-run" : "paused"),
            ledger: (e) => ledger.push({ at: new Date(replay.now()).toISOString().slice(5, 16), ...e }),
            env: {},
            now: replay.now,
        });
        const actions = createIncidentActions({ github, repo: REPO, spent: {}, now: replay.now });

        let facts = emptyFacts();
        /** @type {any} */
        let paid = null;
        /** @type {any} */
        let code = null;
        const opened = [];
        const outcomes = [];
        const from = Date.parse("2026-10-02T00:00:00Z");
        for (let at = from; at < Date.parse("2026-10-03T02:00:00Z"); at += 60_000) {
            replay.setTime(at);
            const runs = (await github.get(MASTER, { purpose: "essential" })).body.workflow_runs;
            const folded = foldRuns(facts, runs, LANES, at);
            facts = folded.facts;
            const when = new Date(at).toISOString().slice(5, 16);
            for (const ref of folded.sighted) {
                if (!(ref.runId in STEPS) || ref.conclusion !== "failure") continue;
                const failure = { workflow: "GPU", job: GPU_JOB, steps: [STEPS[ref.runId]], labels: [RENTED] };
                const verdict = classify(failure, { where: "master" });
                opened.push(`${when} ${verdict.class} ${ref.runId}`);
                const run = { id: ref.runId, attempt: ref.attempt };
                if (verdict.class === "paid-capacity") paid ??= { lane: "gpu", openedAt: at, run };
                if (verdict.class === "code") {
                    code = {
                        key: verdict.key,
                        redSha: ref.sha,
                        redJob: { id: UNRECORDED_JOB_ID, runId: ref.runId, attempt: ref.attempt, name: GPU_JOB },
                        parentSha: null,
                        parentJob: null,
                        suspects: [],
                        firstAt: at,
                        excerpt: "Fruchterman-Reingold 10k-node row 2.9x slower than its pinned best",
                    };
                }
            }
            if (code) {
                const out = await actions.codeRed({ ...code, confirmed: at > code.firstAt });
                if (out.outcome !== "waiting") {
                    outcomes.push(`${when} ${out.outcome}`);
                    code = null;
                }
            }
            if (paid) {
                const running = runs.some((/** @type {any} */ r) => r.name === "GPU" && r.status !== "completed");
                await actions.backoff({ ...paid, running, notProgressing: false });
                if (facts.lanes.GPU.verdict === "green") paid = null;
            }
        }

        expect(fake.writes()).toEqual([]);
        expect(opened).toEqual([
            "10-02T04:05 paid-capacity 36962785245",
            "10-02T07:30 code 36973764479",
            "10-02T23:41 paid-capacity 37078532134",
        ]);
        // The red head is re-run on the reconcile after the first sighting (the owner's own re-run
        // started at 07:31:52), its pass at 08:20 files the issue, and nothing is reverted. Every
        // backoff slot of the two balance stretches (04:35, 00:11) fell while a GPU run was in
        // progress, so the paid lane is never re-run by the daemon.
        expect(outcomes).toEqual(["10-02T08:21 intermittent"]);
        expect(ledger.filter((e) => e.kind === "would-do").map((e) => `${e.at} ${e.op} ${e.situation}`)).toEqual([
            "10-02T07:31 POST actions/jobs/0/rerun red-head-rerun",
            "10-02T08:21 POST issues intermittent",
        ]);
    });
});
