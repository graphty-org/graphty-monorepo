// Tests of tools/ci-budgets.mjs: the hang guards and the one-build-for-every-event rule (lint), the
// rows, budgets and pull request comment of a run (report), and the trend alarms and their issues (trend).
//
//   node tools/ci-budgets.test.mjs
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import { parse as parseYaml } from "yaml";

import {
    applyTrend,
    budgetFor,
    closeVanished,
    COMMENT_MARKER,
    evaluate,
    fileProblems,
    fmt,
    hangMinutes,
    lintWorkflow,
    mediansByKey,
    prComment,
    rowsFromJobs,
    storeRows,
    syncIssues,
    taskRows,
    trend,
    upsertComment,
    VANISHED_RUNS,
} from "./ci-budgets.mjs";

const FILE = {
    version: 1,
    defaults: { hangRatio: 2, minHangMinutes: 10, owner: "pipeline" },
    budgets: {
        "run:ci.yml:pr": { minutes: 20 },
        "job:ci.yml:Build": { minutes: 6 },
        "job:ci.yml:Test (*)": { minutes: 15 },
        "job:ci.yml:Test (graphty-1)": { minutes: 4 },
        "task:graphty:build": { minutes: 2 },
    },
};

const workflow = (jobs) => parseYaml(`on: push\njobs:\n${jobs}`);

describe("the budgets file", () => {
    it("the committed file is well formed", () => {
        assert.deepEqual(
            fileProblems(JSON.parse(readFileSync(new URL("../ci-budgets.json", import.meta.url), "utf8"))),
            [],
        );
    });

    it("rejects an entry with no line", () => {
        assert.equal(fileProblems({ version: 1, budgets: { "job:x.yml:A": { why: "?" } } }).length, 1);
    });

    it("a specific key wins over a wildcard", () => {
        assert.equal(budgetFor(FILE, "job:ci.yml:Test (graphty-1)").minutes, 4);
        assert.equal(budgetFor(FILE, "job:ci.yml:Test (layout)").minutes, 15);
        assert.equal(budgetFor(FILE, "job:ci.yml:Lint"), undefined);
    });

    it("the hang guard is twice the budget, at least 10 minutes", () => {
        assert.equal(hangMinutes(FILE, 6), 12);
        assert.equal(hangMinutes(FILE, 2), 10);
    });
});

describe("lint", () => {
    const ok = `    packages:\n        name: Build\n        timeout-minutes: 12\n        steps:\n            - run: pnpm exec nx run-many -t build\n`;

    it("passes a job whose timeout is twice its budget", () => {
        assert.deepEqual(lintWorkflow(FILE, "ci.yml", workflow(ok)).errors, []);
    });

    it("fails a job whose timeout disagrees with its budget, or has none", () => {
        const wrong = lintWorkflow(FILE, "ci.yml", workflow(ok.replace("12", "30"))).errors;
        assert.match(wrong.join("\n"), /job Build has timeout-minutes 30, want 12/);
        const none = lintWorkflow(FILE, "ci.yml", workflow(ok.replace("        timeout-minutes: 12\n", ""))).errors;
        assert.match(none.join("\n"), /timeout-minutes unset, want 12/);
    });

    it("reads a matrix job name as its wildcard key", () => {
        const matrix = `    test:\n        name: Test (\${{ matrix.shard }})\n        timeout-minutes: 30\n        steps: []\n`;
        assert.deepEqual(lintWorkflow(FILE, "ci.yml", workflow(matrix)).errors, []);
    });

    it("warns on a job with no budget, fails one with no timeout either", () => {
        const guarded = lintWorkflow(
            FILE,
            "ci.yml",
            workflow(`    lint:\n        name: Lint\n        timeout-minutes: 20\n        steps: []\n`),
        );
        assert.deepEqual(guarded.errors, []);
        assert.match(guarded.warnings[0], /Lint has no budget/);
        const bare = lintWorkflow(FILE, "ci.yml", workflow(`    lint:\n        name: Lint\n        steps: []\n`));
        assert.match(bare.errors[0], /no timeout-minutes/);
    });

    it("skips the guards of a workflow with no budget and of a called workflow", () => {
        assert.deepEqual(lintWorkflow(FILE, "other.yml", workflow(`    a:\n        steps: []\n`)).errors, []);
        assert.deepEqual(
            lintWorkflow(FILE, "ci.yml", workflow(`    ci:\n        uses: ./.github/workflows/x.yml\n`)).errors,
            [],
        );
    });

    it("fails a seeded secret in Build's env", () => {
        const seeded = ok.replace(
            "            - run: pnpm exec nx run-many -t build\n",
            "            - name: Build all\n              run: pnpm exec nx run-many -t build --parallel=3\n              env:\n                  SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}\n",
        );
        const { errors } = lintWorkflow(FILE, "ci.yml", workflow(seeded));
        assert.equal(errors.length, 1);
        assert.match(errors[0], /step "Build all": env SENTRY_AUTH_TOKEN reads a secret/);
    });

    it("fails a secret in a building job's env, in any workflow", () => {
        const jobEnv = `    b:\n        env:\n            TOKEN: \${{ secrets.X }}\n        steps:\n            - run: npx nx affected --target=build\n`;
        assert.match(lintWorkflow(FILE, "other.yml", workflow(jobEnv)).errors.join(), /env TOKEN reads a secret/);
    });

    it("fails a secret in the workflow's env, read with brackets, under pnpm run build", () => {
        const wfEnv = parseYaml(
            `on: push\nenv:\n    TOKEN: \${{ secrets['X'] }}\njobs:\n    b:\n        steps:\n            - run: pnpm run build\n`,
        );
        assert.match(lintWorkflow(FILE, "other.yml", wfEnv).errors.join(), /env TOKEN reads a secret/);
    });

    it("fails a build step that runs only on some events or refs", () => {
        const gated = ok.replace(
            "            - run:",
            "            - if: github.event_name == 'push'\n              run:",
        );
        assert.match(lintWorkflow(FILE, "ci.yml", workflow(gated)).errors.join(), /depends on the event or ref/);
    });

    it("lets an upload step after the build read secrets", () => {
        const upload = `${ok}            - run: npx sentry-cli sourcemaps upload\n              env:\n                  SENTRY_AUTH_TOKEN: \${{ secrets.SENTRY_AUTH_TOKEN }}\n`;
        assert.deepEqual(lintWorkflow(FILE, "ci.yml", workflow(upload)).errors, []);
    });
});

describe("report", () => {
    const run = { path: ".github/workflows/ci.yml", created_at: "2026-10-24T10:00:00Z" };
    const jobs = [
        {
            name: "Build",
            created_at: "2026-10-24T10:00:10Z",
            started_at: "2026-10-24T10:01:00Z",
            completed_at: "2026-10-24T10:14:33Z",
            conclusion: "success",
            labels: ["ubuntu-latest"],
            steps: [
                {
                    name: "Build all",
                    started_at: "2026-10-24T10:02:00Z",
                    completed_at: "2026-10-24T10:14:00Z",
                    conclusion: "success",
                },
            ],
        },
        {
            name: "Docs",
            created_at: "2026-10-24T10:00:10Z",
            started_at: null,
            completed_at: null,
            conclusion: "skipped",
        },
    ];

    it("makes run, job, queue and step rows, nothing for a skipped job", () => {
        const rows = rowsFromJobs(run, jobs, "pr");
        assert.deepEqual(
            rows.map((r) => [r.key, r.seconds]),
            [
                ["run:ci.yml:pr", 873],
                ["job:ci.yml:Build", 813],
                ["queue:ci.yml:Build", 50],
                ["step:ci.yml:Build:Build all", 720],
            ],
        );
    });

    it("files a full run's over-budget trend as one issue under the row's key, and closes it when back under", async () => {
        const rows = rowsFromJobs(run, jobs, "full");
        const open = [];
        const calls = [];
        const gh = async (path, init) => {
            calls.push([init?.method ?? "GET", path, init && JSON.parse(init.body)]);
            if (path.startsWith("/issues?")) return open;
            return path === "/issues" ? { number: 81 } : {};
        };
        // POST /v1/durations's trend answer: store keys, the queue row as its job's (queue) step
        const answer = (alarm) => [
            { key: "job:ci.yml:Build", kind: "full", recent: 300, earlier: 290, alarm: false, range: null },
            { key: "step:ci.yml:Build:(queue)", kind: "full", recent: 400, earlier: 40, alarm, range: "aaa..bbb" },
        ];
        assert.deepEqual(await applyTrend(gh, run, rows, answer(true), FILE), [
            { action: "file", key: "queue:ci.yml:Build", kind: "full", number: 81 },
        ]);
        assert.equal(calls.filter(([m, p]) => m === "POST" && p === "/issues").length, 1);
        assert.equal(calls[1][2].title, "CI budget: queue:ci.yml:Build (full) 40s -> 6m40s");

        open.push({ number: 81, title: calls[1][2].title });
        assert.deepEqual(await applyTrend(gh, run, rows, answer(false), FILE), [
            { action: "close", key: "queue:ci.yml:Build", kind: "full", number: 81 },
        ]);
        assert.deepEqual(calls.at(-1).slice(0, 2), ["PATCH", "/issues/81"]);
    });

    it("closes an open alarm whose job or step stopped getting samples, and leaves live ones open", async () => {
        const release = { path: ".github/workflows/release.yml" };
        const open = [
            { number: 3966, title: "CI budget: job:release.yml:CI / visual (graphty) (full) 12m58s -> 18m37s" },
            {
                number: 3967,
                title: "CI budget: step:release.yml:CI / visual (graphty):Capture (full) 12m00s -> 17m17s",
            },
            { number: 3990, title: "CI budget: queue:release.yml:CI / visual (graphty) (full) 10s -> 2m00s" },
            { number: 4001, title: "CI budget: job:release.yml:CI / Story tests (graphty-1) (full) 9m00s -> 14m00s" },
            { number: 4002, title: "CI budget: job:ci.yml:Build (full) 4m00s -> 9m00s" },
            { number: 4003, title: "CI budget: job:release.yml:CI / visual (graphty) (master) 1m00s -> 3m00s" },
            { number: 4004, title: "CI budget: run:release.yml:full (full) 50m00s -> 80m00s" },
        ];
        const calls = [];
        const gh = async (path, init) => {
            calls.push([init?.method ?? "GET", path, init && JSON.parse(init.body)]);
            return path.startsWith("/issues?") ? open : {};
        };
        const lastSeen = {
            "job:release.yml:CI / visual (graphty)": {
                runId: 4090,
                sha: "7f3c2a9d1e00",
                at: 0,
                runsSince: VANISHED_RUNS,
            },
            // the Capture step has no sample in the 30-day window at all; the queue row is the job's (queue) step
            "step:release.yml:CI / visual (graphty):(queue)": {
                runId: 4090,
                sha: "7f3c2a9d1e00",
                at: 0,
                runsSince: 14,
            },
            "job:release.yml:CI / Story tests (graphty-1)": {
                runId: 4200,
                sha: "aaa",
                at: 0,
                runsSince: VANISHED_RUNS - 1,
            },
        };
        assert.deepEqual(await closeVanished(gh, release, "full", lastSeen), [
            { action: "vanished", key: "job:release.yml:CI / visual (graphty)", kind: "full", number: 3966 },
            { action: "vanished", key: "step:release.yml:CI / visual (graphty):Capture", kind: "full", number: 3967 },
            { action: "vanished", key: "queue:release.yml:CI / visual (graphty)", kind: "full", number: 3990 },
        ]);
        const comment = calls.find(([m, p]) => m === "POST" && p === "/issues/3966/comments")[2].body;
        assert.match(comment, /no longer runs/);
        assert.match(comment, /run 4090 on 7f3c2a9d1e at 1970-01-01T00:00:00.000Z, and 10 full runs/);
        assert.match(calls.find(([, p]) => p === "/issues/3967/comments")[2].body, /no sample in the results store/);
        assert.deepEqual(
            calls.filter(([m]) => m === "PATCH").map(([, p, b]) => [p, b.state]),
            [
                ["/issues/3966", "closed"],
                ["/issues/3967", "closed"],
                ["/issues/3990", "closed"],
            ],
        );
    });

    it("maps the store's medians, keyed by stored identity, back to each row's key", () => {
        const rows = [
            ...rowsFromJobs(run, jobs, "pr"),
            ...taskRows({ traceEvents: [{ ph: "X", name: "graphty:build", dur: 83_000_000 }] }),
        ];
        const medians = mediansByKey(run, rows, {
            "job:ci.yml:(run)": 900,
            "job:ci.yml:Build": 800,
            "step:ci.yml:Build:(queue)": 40,
            "step:ci.yml:Build:Build all": 700,
            "task:graphty:build": 80,
            "job:ci.yml:Lint": 60,
        });
        assert.deepEqual(medians, {
            "run:ci.yml:pr": 900,
            "job:ci.yml:Build": 800,
            "queue:ci.yml:Build": 40,
            "step:ci.yml:Build:Build all": 700,
            "task:graphty:build": 80,
        });
        assert.deepEqual(mediansByKey(run, rows, {}), {});
    });

    it("reads nx task durations from a profile", () => {
        const rows = taskRows({
            traceEvents: [
                { ph: "X", name: "graphty:build", dur: 83_000_000 },
                { ph: "B", name: "x:y" },
            ],
        });
        assert.deepEqual(
            rows.map((r) => [r.key, r.seconds]),
            [["task:graphty:build", 83]],
        );
    });

    it("writes the rows in the results store's shape, run and queue rows as pseudo job and step", () => {
        const stored = storeRows({ ...run, id: 77, run_attempt: 2, head_sha: "abc" }, [
            ...rowsFromJobs(run, jobs, "pr"),
            ...taskRows({ traceEvents: [{ ph: "X", name: "graphty:build", dur: 83_000_000 }] }),
        ]);
        const common = { runId: 77, attempt: 2, workflow: "ci.yml", sha: "abc" };
        assert.deepEqual(stored, [
            {
                ...common,
                job: "(run)",
                step: "",
                task: "",
                startedAt: Date.parse(run.created_at),
                ms: 873_000,
                conclusion: "success",
            },
            {
                ...common,
                job: "Build",
                step: "",
                task: "",
                startedAt: Date.parse("2026-10-24T10:01:00Z"),
                ms: 813_000,
                conclusion: "success",
            },
            {
                ...common,
                job: "Build",
                step: "(queue)",
                task: "",
                startedAt: Date.parse("2026-10-24T10:00:10Z"),
                ms: 50_000,
                conclusion: "success",
            },
            {
                ...common,
                job: "Build",
                step: "Build all",
                task: "",
                startedAt: Date.parse("2026-10-24T10:02:00Z"),
                ms: 720_000,
                conclusion: "success",
            },
            {
                ...common,
                job: "(nx)",
                step: "",
                task: "graphty:build",
                startedAt: null,
                ms: 83_000,
                conclusion: "success",
            },
        ]);
    });

    it("marks keys over budget and slow against master", () => {
        const evals = evaluate(rowsFromJobs(run, jobs, "pr"), FILE, { "job:ci.yml:Build": 250 });
        const build = evals.find((e) => e.key === "job:ci.yml:Build");
        assert.equal(build.over, true);
        assert.equal(build.slow, true);
        assert.equal(evals.find((e) => e.key === "run:ci.yml:pr").over, false);
    });

    it("formats durations, rounding before splitting minutes", () => {
        assert.deepEqual([fmt(null), fmt(45.2), fmt(119.7), fmt(813)], ["-", "45s", "2m00s", "13m33s"]);
    });

    it("is not slow when the difference is under 60 s", () => {
        const [e] = evaluate([{ key: "job:ci.yml:Lint", seconds: 100 }], FILE, { "job:ci.yml:Lint": 50 });
        assert.equal(e.slow, false);
    });

    it("writes one comment and updates it on the next run", async () => {
        const calls = [];
        const existing = [];
        const gh = async (path, init) => {
            calls.push([init?.method ?? "GET", path]);
            return init ? { id: 9 } : existing;
        };
        const body = prComment(
            evaluate([{ key: "job:ci.yml:Build", seconds: 600 }], FILE, { "job:ci.yml:Build": 250 }),
        );
        assert.ok(body.startsWith(COMMENT_MARKER));
        await upsertComment(gh, 12, body);
        existing.push({ id: 9, body });
        await upsertComment(gh, 12, body);
        assert.deepEqual(calls, [
            ["GET", "/issues/12/comments?per_page=100"],
            ["POST", "/issues/12/comments"],
            ["GET", "/issues/12/comments?per_page=100"],
            ["PATCH", "/issues/comments/9"],
        ]);
        assert.equal(
            prComment(evaluate([{ key: "job:ci.yml:Build", seconds: 260 }], FILE, { "job:ci.yml:Build": 250 })),
            null,
        );
    });
});

describe("trend", () => {
    const rows = (seconds, key = "task:graphty:build", kind = "master") =>
        seconds.map((s, i) => ({
            key,
            run_kind: kind,
            seconds: s,
            sha: `sha${String(i).padStart(8, "0")}`,
            recorded_at: `2026-10-${String(10 + i).padStart(2, "0")}`,
            outcome: "success",
        }));

    it("alarms when the last 5 runs are over the budget, naming the range", () => {
        const [v] = trend(rows([60, 60, 60, 60, 60, 60, 60, 60, 60, 60, 200, 200, 200, 200, 200]), FILE);
        assert.equal(v.alarm, true);
        assert.equal(v.recent, 200);
        assert.equal(v.earlier, 60);
        assert.equal(v.range, "sha0000000..sha0000001");
    });

    it("alarms on 1.3 times the 10 before and 60 s slower, under the budget", () => {
        const [v] = trend(rows([300, 300, 300, 300, 300, 400, 400, 400, 400, 400], "job:ci.yml:Lint"), FILE);
        assert.equal(v.alarm, true);
        const [small] = trend(rows([100, 100, 100, 100, 100, 140, 140, 140, 140, 140], "job:ci.yml:Lint"), FILE);
        assert.equal(small.alarm, false, "40 s slower is under the 60 s line");
    });

    it("compares within a run kind and ignores cancelled runs", () => {
        const history = [...rows([60, 60, 60, 60, 60]), ...rows([200, 200, 200, 200, 200], "task:graphty:build", "pr")];
        history.push({ ...history[0], seconds: 9999, outcome: "cancelled", recorded_at: "2026-10-30" });
        const by = Object.fromEntries(trend(history, FILE).map((v) => [v.kind, v.alarm]));
        assert.deepEqual(by, { master: false, pr: true });
    });

    it("gives no verdict for a key no run of its workflow and kind sampled in the last VANISHED_RUNS runs", () => {
        const old = rows(
            [60, 60, 60, 60, 60, 200, 200, 200, 200, 200],
            "job:release.yml:CI / visual (graphty)",
            "full",
        );
        const later = (n) =>
            Array.from({ length: n }, (_, i) => ({
                key: "job:release.yml:CI / Story tests (graphty-1)",
                run_kind: "full",
                seconds: 60,
                sha: `later${i}`,
                recorded_at: `2026-10-${String(20 + i).padStart(2, "0")}`,
                outcome: "success",
            }));
        const verdict = (history) =>
            trend(history, FILE).find((v) => v.key === "job:release.yml:CI / visual (graphty)");
        assert.equal(verdict([...old, ...later(VANISHED_RUNS - 1)]).alarm, true);
        assert.equal(verdict([...old, ...later(VANISHED_RUNS)]), undefined);
    });

    it("files one issue per key, comments on it later, closes it when back under", async () => {
        const open = [];
        const calls = [];
        const gh = async (path, init) => {
            calls.push([init?.method ?? "GET", path, init && JSON.parse(init.body)]);
            if (path.startsWith("/issues?")) return open;
            return path === "/issues" ? { number: 77 } : {};
        };
        const alarm = trend(rows([60, 60, 60, 60, 60, 200, 200, 200, 200, 200]), FILE);
        assert.deepEqual(await syncIssues(gh, alarm), [
            { action: "file", key: "task:graphty:build", kind: "master", number: 77 },
        ]);
        const filed = calls[1][2];
        assert.equal(filed.title, "CI budget: task:graphty:build (master) 1m00s -> 3m20s");
        assert.deepEqual(filed.labels, ["bug", "ci-budget", "priority:high", "effort:medium"]);

        open.push({ number: 77, title: filed.title });
        assert.equal((await syncIssues(gh, alarm))[0].action, "comment");

        const back = trend(rows([60, 60, 60, 60, 60, 60, 60, 60, 60, 60]), FILE);
        assert.deepEqual(await syncIssues(gh, back), [
            { action: "close", key: "task:graphty:build", kind: "master", number: 77 },
        ]);
        assert.deepEqual(calls.at(-1).slice(0, 2), ["PATCH", "/issues/77"]);
    });
});
