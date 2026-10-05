import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { startDaemon } from "../../lib/daemon.mjs";
import { readLedger } from "../../lib/store.mjs";
import { createFakeGh, httpOutput } from "../helpers/fake-gh.mjs";

const DATA = new URL("data/", import.meta.url);
const RENTED = "machine/gpu=t4/cpu=4/ram=16/tenancy=on_demand";
const GPU_JOB = "Test (NVIDIA T4)";
/**
 * The failed step of each balance-rejected GPU run of 10-02 (platform facts 9.5 and 9.6): the
 * rejection is only a step name, with no annotation and no log. The job ids are not recorded.
 */
const BALANCE = {
    36962785245: "Machine: Insufficient balance to run job. Current balance: $-2.0800. Minimum required: $0.05.",
    37078532134: "Machine: Insufficient balance to run job. Current balance: $-2.7950. Minimum required: $0.05.",
};

/**
 * Reads one `.jsonl` data file.
 * @param {string} name the file
 * @returns {any[]} its rows
 */
const rows = (name) =>
    readFileSync(new URL(name, DATA), "utf8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));

/** The record's attempts, and master's GPU runs: read once, not on every fake GitHub answer. */
const ATTEMPTS = rows("attempts.jsonl");
const GPU_RUNS = rows("runs-master.jsonl").filter((r) => r.name === "GPU");

/**
 * Master's GPU runs as GitHub answered for them at `t`, newest first: each run's latest attempt
 * started by then, in progress until its recorded end.
 * @param {number} t the time
 * @returns {any[]} the runs
 */
function gpuRuns(t) {
    const attempts = ATTEMPTS;
    return GPU_RUNS.filter((r) => Date.parse(r.created_at) <= t)
        .map((r) => {
            const mine = attempts.filter((a) => a.id === r.id && Date.parse(a.run_started_at) <= t);
            const a = mine.at(-1) ?? { run_attempt: r.run_attempt, updated_at: r.updated_at, conclusion: r.conclusion };
            const done = Date.parse(a.updated_at) <= t;
            return {
                ...r,
                run_attempt: a.run_attempt,
                status: done ? "completed" : "in_progress",
                conclusion: done ? a.conclusion : null,
                updated_at: done ? a.updated_at : (a.run_started_at ?? r.created_at),
            };
        })
        .sort((a, b) => b.id - a.id)
        .slice(0, 10);
}

describe("replay: the 10-02 GPU balance stretches through the whole daemon", () => {
    it("park the lane: no re-run, no parent re-test, no incident and no merge hold, and the item ends itself", async () => {
        const dir = mkdtempSync(join(tmpdir(), "githerd-gpu-"));
        const config = join(dir, "githerd.config.json");
        writeFileSync(
            config,
            JSON.stringify({
                repo: "o/r",
                lanes: {
                    ci: { workflow: "ci.yml", gating: "required" },
                    gpu: { workflow: "gpu.yml", gating: "required" },
                },
                notify: { command: ["true"] },
            }),
        );
        let t = 0;
        /** An open pull request whose change the GPU lane can affect. */
        const pr = {
            id: "PR_9",
            number: 9,
            title: "fix(webgpu-graph-algorithms): a kernel",
            isDraft: false,
            headRefName: "fix/kernel",
            headRefOid: "f".repeat(40),
            baseRefName: "master",
            author: { login: "apowers313" },
            labels: { nodes: [] },
            commits: { nodes: [] },
        };
        const ok = (/** @type {unknown} */ body) => httpOutput({ status: 200, body });
        const gh = createFakeGh(({ args, input }) => {
            const path = args.at(-1);
            const head = gpuRuns(t)[0]?.head_sha ?? "a".repeat(40);
            if (input?.includes("pullRequests(")) {
                return ok({
                    data: {
                        repository: {
                            defaultBranchRef: { name: "master", target: { oid: head } },
                            pullRequests: { nodes: [pr] },
                        },
                    },
                });
            }
            if (input?.includes("search(")) return ok({ data: { search: { issueCount: 0, nodes: [] } } });
            if (input?.includes("issues(states: OPEN")) {
                return ok({ data: { repository: { issues: { pageInfo: { hasNextPage: false }, nodes: [] } } } });
            }
            if (path === "user") return ok({ login: "apowers313" });
            if (path.includes("/workflows/gpu.yml/runs?")) return ok({ workflow_runs: gpuRuns(t) });
            if (path.includes("/workflows/ci.yml/runs?")) {
                return ok({
                    workflow_runs: [
                        {
                            id: 1,
                            name: "CI",
                            run_attempt: 1,
                            head_sha: head,
                            status: "completed",
                            conclusion: "success",
                            updated_at: new Date(t).toISOString(),
                        },
                    ],
                });
            }
            const jobs = /\/actions\/runs\/(\d+)\/jobs\?/.exec(path);
            if (jobs) {
                const run = gpuRuns(t).find((r) => String(r.id) === jobs[1]);
                const step = /** @type {Record<string, string>} */ (BALANCE)[jobs[1]];
                if (run?.conclusion === "failure" && step) {
                    const failed = { name: step, conclusion: "failure" };
                    return ok({
                        jobs: [
                            {
                                id: 7,
                                run_attempt: 1,
                                name: GPU_JOB,
                                conclusion: "failure",
                                labels: [RENTED],
                                steps: [failed],
                            },
                        ],
                    });
                }
                const status = run?.status ?? "completed";
                return ok({
                    jobs: [
                        {
                            id: 8,
                            name: GPU_JOB,
                            status,
                            conclusion: run?.conclusion,
                            runner_name: "t4-1",
                            labels: [RENTED],
                        },
                    ],
                });
            }
            if (/\/check-runs\/\d+\/annotations\?/.test(path)) return ok([]);
            if (path.includes("/commits?sha=master")) {
                return ok([
                    { sha: head, parents: [], commit: { message: "m", committer: { date: "2026-10-02T00:00:00Z" } } },
                ]);
            }
            if (/\/pulls\/9\/commits\?/.test(path)) return ok([{ commit: { message: pr.title } }]);
            if (/\/pulls\/9\/files\?/.test(path)) return ok([{ filename: "webgpu-graph-algorithms/src/kernel.ts" }]);
            return ok([]);
        });
        const daemon = await startDaemon({
            root: dir,
            port: 0,
            fetch: gh.fetch,
            token: gh.token,
            git: async () => ({ code: 0, stdout: "", stderr: "" }),
            now: () => new Date(t),
            env: { GITHERD_CONFIG: config, PATH: process.env.PATH },
            stateDir: join(dir, ".githerd"),
            autoPoll: false,
            runs: false,
            log: () => {},
            npm: async () => true,
        });
        try {
            /** @type {string[]} the pull request's githerd/merge description after each poll */
            const statuses = [];
            /** @type {Set<string>} */
            const parked = new Set();
            for (const [from, to] of [
                ["2026-10-02T03:50:00Z", "2026-10-02T06:00:00Z"],
                ["2026-10-02T23:30:00Z", "2026-10-03T01:30:00Z"],
            ]) {
                for (t = Date.parse(from); t < Date.parse(to); t += 3 * 60_000) {
                    await daemon.poll();
                    const posted = daemon.state.mergeGate?.posted?.["9"];
                    if (posted) statuses.push(posted.description);
                    const item = daemon.state.ownerItems?.["paid-capacity:gpu"];
                    if (item && !item.endedAt) parked.add(item.raisedAt);
                }
            }
            await daemon.shutdown();
            const ledger = await readLedger(join(dir, ".githerd"));
            const classified = ledger.filter((e) => e.event === "lane-classified");
            expect(classified.map((e) => [e.lane, e.runId, e.class])).toEqual([
                ["gpu", 36962785245, "paid-capacity"],
                ["gpu", 37078532134, "paid-capacity"],
            ]);
            // Both stretches parked the lane with an owner item, which ended once the lane ran.
            expect(parked.size).toBe(2);
            expect(daemon.state.ownerItems["paid-capacity:gpu"]).toMatchObject({ endedBy: "cleared" });
            // No incident, so no red-head re-run and no parent re-test; and no backoff re-run, because
            // a run of the lane was in flight (the owner's own re-run, then newer pushes) until the
            // lane went green each time.
            expect(Object.keys(daemon.state.incidents)).toEqual([]);
            const would = ledger.filter((e) => e.kind === "would-do" && e.group === "incidents");
            expect(would).toEqual([]);
            expect(gh.writes()).toEqual([]);
            // The GPU pull request was never held for the lane (it waits only for the release
            // dry-run, which this replay does not run).
            expect(statuses.length).toBeGreaterThan(80);
            expect(statuses.filter((d) => /lane red/.test(d))).toEqual([]);
        } finally {
            if (!daemon.fenced) await daemon.shutdown();
            rmSync(dir, { recursive: true, force: true });
        }
    });
});
