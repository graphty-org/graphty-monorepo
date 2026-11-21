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
    COMMENT_MARKER,
    evaluate,
    fileProblems,
    fmt,
    hangMinutes,
    lintWorkflow,
    mediansByKey,
    prComment,
    rowsFromJobs,
    sharedSlowdown,
    storeRows,
    syncAlarms,
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

    it("gives a job a re-run attempt carried over no queue row, not a negative one", () => {
        // attempt 2's listing: the carried-over Build keeps attempt 1's times under attempt 2's created_at
        const carried = { ...jobs[0], created_at: "2026-10-24T11:05:00Z" };
        const rows = rowsFromJobs({ ...run, created_at: "2026-10-24T11:05:00Z" }, [carried], "full");
        assert.deepEqual(
            rows.filter((r) => r.level === "queue" || r.level === "job").map((r) => [r.key, r.seconds]),
            [["job:ci.yml:Build", 813]],
        );
    });

    it("lists a full run's alarm under the row's key with the run's own time, and strikes it when back under", async () => {
        const issues = [];
        const gh = async (path, init) => {
            const body = init && JSON.parse(init.body);
            if (path.startsWith("/issues?"))
                return path.includes("state=open") ? issues.filter((i) => i.state === "open") : [];
            if (path === "/issues") return issues[issues.push({ number: 81, state: "open", ...body }) - 1];
            if (path === "/issues/81" && init.method === "PATCH") Object.assign(issues[0], body);
            return {};
        };
        // POST /v1/durations's answer: store keys, the queue row as its job's (queue) step
        const stored = (alarm) => ({
            kind: "full",
            lastSeen: {},
            trend: [
                { key: "job:ci.yml:Build", kind: "full", recent: 300, earlier: 290, alarm: false, range: null },
                { key: "step:ci.yml:Build:(queue)", kind: "full", recent: 400, earlier: 10, alarm, range: "aaa..bbb" },
            ],
        });
        const rows = rowsFromJobs(run, jobs, "full");
        const done = await applyTrend(gh, { ...run, id: 5 }, rows, stored(true), FILE);
        assert.deepEqual(
            done.map((a) => [a.action, a.number, a.finding, a.added]),
            [["file", 81, "shared", ["queue:ci.yml:Build"]]],
        );
        assert.equal(issues[0].title, "CI budget: ci.yml (full) shared slowdown");
        assert.match(
            issues[0].body,
            /\| `queue:ci\.yml:Build` \| 10s \| 6m40s \| 50s \| aaa\.\.bbb \| over since run 5 \|/,
        );

        // the next run waited 12 s for Build's runner: back under 1.1 x 10 s and 30 s slower
        const quick = rows.map((r) => (r.key === "queue:ci.yml:Build" ? { ...r, seconds: 12 } : r));
        assert.equal((await applyTrend(gh, { ...run, id: 6 }, quick, stored(false), FILE))[0].action, "close");
        assert.equal(issues[0].state, "closed");
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
});

describe("alarm issues", () => {
    const run = (id) => ({ id, html_url: `https://github.test/runs/${id}` });
    // a step verdict: usual 200 s, 300 s on the last 5 runs and in this one
    const v = (key, o = {}) => ({
        key,
        kind: "full",
        earlier: 200,
        recent: 300,
        last: 300,
        alarm: true,
        range: "a1..b1",
        ...o,
    });
    const step = (shard, o) => v(`step:release.yml:CI / Test (${shard}):Run tests`, o);

    // a fake GitHub: its issues (mutated by POST and PATCH), every call recorded
    const fakeGh = (issues = []) => {
        const calls = [];
        let next = 100;
        const gh = async (path, init) => {
            const method = init?.method ?? "GET";
            const body = init && JSON.parse(init.body);
            calls.push([method, path, body]);
            if (path.startsWith("/issues?state=")) return issues.filter((i) => path.includes(`state=${i.state}&`));
            if (method === "POST" && path === "/issues") {
                const made = { number: next++, state: "open", ...body };
                issues.push(made);
                return made;
            }
            const n = /^\/issues\/(\d+)$/.exec(path)?.[1];
            if (n && method === "PATCH")
                Object.assign(
                    issues.find((i) => i.number === Number(n)),
                    body,
                );
            return {};
        };
        const comments = (n) =>
            calls.filter(([m, p]) => m === "POST" && p === `/issues/${n}/comments`).map((c) => c[2].body);
        const filed = () => calls.filter(([m, p]) => m === "POST" && p === "/issues").map((c) => c[2]);
        return { gh, calls, issues, comments, filed };
    };
    const sync = (gh, verdicts, id, opts = {}) =>
        syncAlarms(gh, verdicts, { run: run(id), workflow: "release.yml", kind: "full", file: FILE, ...opts });
    const CODE = "CI budget: release.yml (full) keys over the line";
    const SHARED = "CI budget: release.yml (full) shared slowdown";

    it("files one issue listing every slowed key of a run, and a later run adds to it instead of filing", async () => {
        const f = fakeGh();
        await sync(f.gh, [step("graphty-1"), step("graphty-2"), step("graphty-3", { alarm: false })], 1);
        assert.equal(f.filed().length, 1);
        assert.equal(f.filed()[0].title, CODE);
        assert.deepEqual(f.filed()[0].labels, ["bug", "ci-budget", "priority:high", "effort:medium"]);
        const body = f.issues[0].body;
        assert.match(
            body,
            /`step:release\.yml:CI \/ Test \(graphty-1\):Run tests` \| 3m20s \| 5m00s \| 5m00s \| a1\.\.b1 \| over since run 1 \|/,
        );
        assert.match(body, /\(graphty-2\)/);
        assert.doesNotMatch(body, /\(graphty-3\)/);

        const done = await sync(f.gh, [step("graphty-1", { recent: 330, last: 340 }), step("graphty-4")], 2);
        assert.equal(f.filed().length, 1, "no second issue");
        assert.deepEqual(done, [
            {
                action: "update",
                number: 100,
                finding: "code",
                added: ["step:release.yml:CI / Test (graphty-4):Run tests"],
                struck: [],
            },
        ]);
        assert.match(
            f.issues[0].body,
            /\(graphty-1\):Run tests` \| 3m20s \| 5m30s \| 5m40s \| a1\.\.b1 \| over since run 1 \|/,
        );
        assert.match(f.issues[0].body, /\(graphty-4\):Run tests` .* over since run 2 \|/);
        assert.deepEqual(f.comments(100), [
            "[run 2](https://github.test/runs/2):\n- over the line: `step:release.yml:CI / Test (graphty-4):Run tests`",
        ]);
    });

    it("strikes a key back under its closing line in a run, with the run, and closes the issue when none is left", async () => {
        const f = fakeGh();
        await sync(f.gh, [step("graphty-1"), step("graphty-2")], 1);
        // graphty-1 at 210 s: under 1.1 x its usual 200 s; graphty-2 at 250 s is between the lines and stays
        await sync(
            f.gh,
            [step("graphty-1", { alarm: false, last: 210 }), step("graphty-2", { alarm: false, last: 250 })],
            2,
        );
        assert.equal(f.issues[0].state, "open");
        assert.match(
            f.issues[0].body,
            /~~`step:release\.yml:CI \/ Test \(graphty-1\):Run tests`~~ .* back under in run 2: 3m30s \|/,
        );
        assert.match(
            f.issues[0].body,
            /\| `step:release\.yml:CI \/ Test \(graphty-2\):Run tests` .* over since run 1 \|/,
        );
        assert.equal(
            f.comments(100)[0],
            "[run 2](https://github.test/runs/2):\n- `step:release.yml:CI / Test (graphty-1):Run tests`: back under in run 2: 3m30s",
        );

        const done = await sync(f.gh, [step("graphty-2", { alarm: false, last: 200 })], 3);
        assert.equal(done[0].action, "close");
        assert.equal(f.issues[0].state, "closed");
        assert.match(f.comments(100)[1], /\(graphty-2\).*\n\nNo key is left over its line: closing\.$/s);
    });

    it("lists a step once, not its job and the run alarming with it", async () => {
        const f = fakeGh();
        await sync(
            f.gh,
            [v("run:release.yml:full"), v("job:release.yml:Lint"), v("step:release.yml:Lint:Lint all")],
            1,
        );
        const body = f.issues[0].body;
        assert.match(body, /`step:release\.yml:Lint:Lint all`/);
        assert.doesNotMatch(body, /`(run|job):release\.yml/);
    });

    // 30 long keys that took 1.15 times their usual time in this run, none over its line
    const slowRun = Array.from({ length: 30 }, (_, i) =>
        step(`graphty-element-browser-${i + 10}`, { alarm: false, earlier: 300, recent: 320, last: 345 }),
    );

    it("reports keys a slowdown the whole run shares as one infrastructure finding, the rest as code", async () => {
        const f = fakeGh();
        const shared = step("graphty-element-browser-4", { earlier: 400, recent: 560, last: 560 });
        const own = step("layout", { earlier: 200, recent: 600, last: 600 });
        const queue = v("queue:release.yml:CI / Test (graphty-1)", { earlier: 60, recent: 300, last: 300 });
        await sync(f.gh, [...slowRun, shared, own, queue], 7);
        const [code, infra] = [CODE, SHARED].map((t) => f.issues.find((i) => i.title === t));
        assert.deepEqual(infra.labels, ["infrastructure", "ci-budget", "priority:medium", "effort:medium"]);
        const keys = (i) => [...i.body.matchAll(/^\| `([^`]+)`/gm)].map((m) => m[1]);
        assert.deepEqual(keys(infra), [shared.key, queue.key]);
        assert.deepEqual(keys(code), [own.key], "3 times its usual time is past 1.5 times the run's 1.15");
        assert.match(infra.body, /In run 7 the keys of 2 minutes or more took a median 1\.15 times their usual time/);

        // the next run did not slow as a whole: a shared key still alarming moves to the keys over the line
        const calm = slowRun.map((x) => ({ ...x, last: 300 }));
        await sync(f.gh, [...calm, shared, own, queue], 8);
        assert.deepEqual(keys(infra), [queue.key]);
        assert.match(
            infra.body,
            /~~`step:.*\(graphty-element-browser-4\):Run tests`~~ .* still over its line in run 8, which did not slow as a whole/,
        );
        assert.deepEqual(keys(code), [own.key, shared.key]);
    });

    it("reports every key as code when the run did not slow as a whole", async () => {
        const f = fakeGh();
        const calm = slowRun.map((x) => ({ ...x, last: 300 }));
        await sync(f.gh, [...calm, step("graphty-element-browser-4", { earlier: 400, recent: 560, last: 560 })], 1);
        assert.deepEqual(
            f.filed().map((i) => i.title),
            [CODE],
        );
    });

    it("strikes a listed key that no longer runs", async () => {
        const f = fakeGh();
        await sync(f.gh, [step("graphty-9")], 1);
        const lastSeen = {
            "step:release.yml:CI / Test (graphty-9):Run tests": { runId: 1, sha: "a", at: 0, runsSince: VANISHED_RUNS },
        };
        await sync(f.gh, [], 2, { lastSeen });
        assert.equal(f.issues[0].state, "closed");
        assert.match(f.issues[0].body, /~~`step:.*\(graphty-9\):Run tests`~~ .* no longer runs \(run 2\) \|/);

        // a key sampled in the last VANISHED_RUNS runs stays listed while it does not run
        const g = fakeGh();
        await sync(g.gh, [step("graphty-9")], 1);
        lastSeen["step:release.yml:CI / Test (graphty-9):Run tests"].runsSince = VANISHED_RUNS - 1;
        await sync(g.gh, [], 2, { lastSeen });
        assert.equal(g.issues[0].state, "open");
    });

    it("folds the per-key issues filed before into the issue that lists their workflow's keys", async () => {
        const perKey = (number, title, labels = []) => ({
            number,
            state: "open",
            title,
            labels: labels.map((name) => ({ name })),
        });
        const f = fakeGh([
            perKey(7, "CI budget: step:release.yml:CI / Test (graphty-1):Run tests (full) 3m20s -> 5m00s"),
            perKey(8, "CI budget: queue:release.yml:CI / Test (graphty-2) (full) 1m00s -> 3m00s"),
            perKey(9, "CI budget: step:release.yml:LLM regression:Check this month's LLM spend (full) 5m02s -> 7m07s", [
                "in-progress",
            ]),
            perKey(10, "CI budget: job:ci.yml:Build (full) 4m00s -> 9m00s"),
            perKey(11, "CI budget: job:release.yml:Lint (master) 1m00s -> 3m00s"),
        ]);
        const done = await sync(f.gh, [step("graphty-1")], 1, { note: "pipeline-round: " });
        assert.deepEqual(
            done.filter((a) => a.action === "fold").map((a) => [a.number, a.into]),
            [
                [7, 100],
                [8, 100],
            ],
        );
        assert.match(
            f.comments(7)[0],
            /^pipeline-round: Folded into #100, which lists every key of release\.yml's full runs/,
        );
        assert.deepEqual(
            f.issues.filter((i) => i.state === "closed").map((i) => [i.number, i.state_reason]),
            [
                [7, "duplicate"],
                [8, "duplicate"],
            ],
        );

        // nothing over the line: closed as completed, pointing nowhere
        const g = fakeGh([
            perKey(7, "CI budget: step:release.yml:CI / Test (graphty-1):Run tests (full) 3m20s -> 5m00s"),
        ]);
        await sync(g.gh, [step("graphty-1", { alarm: false, last: 200 })], 3);
        assert.equal(g.issues[0].state_reason, "completed");
        assert.match(g.comments(7)[0], /^Closing: no key of release\.yml's full runs is over its line in run 3/);
    });

    it("reopens its issue closed in the last 7 days instead of filing, but not one closed as not planned", async () => {
        const closedAt = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
        const old = { number: 55, state: "closed", title: CODE, closed_at: closedAt(2), body: "old" };
        const f = fakeGh([old]);
        assert.equal((await sync(f.gh, [step("graphty-1")], 4))[0].action, "reopen");
        assert.equal(old.state, "open");
        assert.match(old.body, /over since run 4/);
        assert.equal(f.filed().length, 0);

        for (const reason of ["not_planned", "duplicate"]) {
            const settled = fakeGh([{ ...old, state: "closed", state_reason: reason }]);
            assert.equal((await sync(settled.gh, [step("graphty-1")], 4))[0].action, "file", reason);
        }
        const stale = fakeGh([{ ...old, state: "closed", closed_at: closedAt(8) }]);
        assert.equal((await sync(stale.gh, [step("graphty-1")], 4))[0].action, "file");
    });

    it("measures how much slower the run ran as a whole", () => {
        assert.equal(sharedSlowdown(slowRun.slice(0, 19)), null, "too few long keys to judge");
        assert.equal(sharedSlowdown(slowRun), 1.15);
        assert.equal(sharedSlowdown([...slowRun, v("queue:release.yml:Build", { earlier: 300, last: 3000 })]), 1.15);
    });
});
