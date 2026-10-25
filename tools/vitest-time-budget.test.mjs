// Tests of tools/vitest-time-budget.mjs, the reporter that reports slow passing tests -- over 10 s, or
// over 3 times their recorded median -- and never fails a run: which tests it reports, what it prints,
// how it keeps the history, and -- in a real vitest run -- that it reads and writes the history file
// and leaves the exit code alone, even for a test that used most of its time limit.
//
//   node --test tools/vitest-time-budget.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import TimeBudgetReporter, {
    annotations,
    enabled,
    format,
    judge,
    KEEP,
    median,
    MEDIAN_RATIO,
    MIN_MS,
    remember,
    SLOW_MS,
} from "./vitest-time-budget.mjs";

// The temporary directories this file makes go inside this one, removed when the file finishes.
const TMP = mkdtempSync(join(tmpdir(), "time-budget-"));
after(() => rmSync(TMP, { recursive: true, force: true }));

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const REPORTER = join(ROOT, "tools/vitest-time-budget.mjs");
const VITEST = join(ROOT, "node_modules/vitest/vitest.mjs");

const test = (over) => ({
    file: "pkg/test/a.test.ts",
    name: "suite > case",
    project: "default",
    state: "passed",
    duration: 100,
    ...over,
});
const KEY = "default\0pkg/test/a.test.ts\0suite > case";

describe("enabled", () => {
    it("is on only with VITEST_BUDGET_CHECK=1", () => {
        assert.equal(enabled({ VITEST_BUDGET_CHECK: "1" }), true);
        assert.equal(enabled({ VITEST_BUDGET_CHECK: "0" }), false);
        assert.equal(enabled({ CI: "true", GITHUB_ACTIONS: "true" }), false);
    });
});

describe("median", () => {
    it("is the middle value, or the mean of the two middle ones, and null for none", () => {
        assert.equal(median([5, 1, 3]), 3);
        assert.equal(median([4, 1, 3, 2]), 2.5);
        assert.equal(median([]), null);
        assert.equal(median(undefined), null);
    });
});

describe("judge", () => {
    it("reports a test over SLOW_MS with no history, and nothing under it", () => {
        assert.deepEqual(
            judge([test({ duration: SLOW_MS + 1 }), test({ name: "fast", duration: SLOW_MS })]).map((t) => t.name),
            ["suite > case"],
        );
    });

    it("reports a test over MEDIAN_RATIO times its median, and not one at it", () => {
        const history = { [KEY]: [400, 500, 600] };
        assert.equal(judge([test({ duration: MEDIAN_RATIO * 500 + 1 })], history)[0].median, 500);
        assert.equal(judge([test({ duration: MEDIAN_RATIO * 500 })], history).length, 0);
    });

    it("does not report a fast test that grew, under MIN_MS", () => {
        assert.equal(judge([test({ duration: MIN_MS })], { [KEY]: [2, 2, 2] }).length, 0);
    });

    it("skips tests that did not pass and timing projects", () => {
        const slow = { duration: SLOW_MS * 2 };
        const tests = [
            test({ ...slow, state: "failed" }),
            test({ ...slow, state: "skipped" }),
            test({ ...slow, project: "bench" }),
            test({ ...slow, project: "browser-bench" }),
            test({ ...slow, project: "llm-regression" }),
            test({ ...slow, file: "pkg/test/x.bench.test.ts" }),
        ];
        assert.deepEqual(judge(tests), []);
    });
});

describe("remember", () => {
    it("adds each judged test's duration and keeps its last KEEP", () => {
        const full = Array.from({ length: KEEP }, (_, i) => i);
        const out = remember({ [KEY]: full, other: [1] }, [
            test({ duration: 99.6 }),
            test({ state: "failed", name: "x" }),
        ]);
        assert.deepEqual(out[KEY], [...full.slice(1), 100]);
        assert.deepEqual(out.other, [1]);
        assert.equal(Object.keys(out).length, 2);
    });
});

describe("format and annotations", () => {
    it("say nothing about a run with no slow test", () => {
        assert.equal(format([]), "");
        assert.deepEqual(annotations([]), []);
    });

    it("name each slow test, its duration and its median, and say the run is not failed", () => {
        const slow = judge([test({ duration: 12_000 }), test({ name: "b", duration: 3000 })], {
            "default\0pkg/test/a.test.ts\0b": [500],
        });
        const text = format(slow);
        assert.match(text, /\[time-budget\] 2 slow test\(s\)/);
        assert.match(text, /This does not fail the run/);
        assert.match(
            text,
            /pkg\/test\/a\.test\.ts > suite > case \[default\]\n {4}took 12\.00 s \(no recorded median\)/,
        );
        assert.match(text, /> b \[default\]\n {4}took 3\.00 s \(median 0\.50 s\)/);
        assert.deepEqual(annotations([test({ name: "50%\nnext", duration: 11_000, median: null })]), [
            "::warning file=pkg/test/a.test.ts,title=slow test::50%25%0Anext took 11.00 s (no recorded median)",
        ]);
    });
});

describe("in a vitest run", () => {
    // "slower" sleeps 1.2 s, so it always takes over MIN_MS and over 3 times a 300 ms median; a busy
    // machine only makes it slower, which the assertions allow. The fixture sets no time limit.
    function run(dir, env) {
        const result = spawnSync(process.execPath, [VITEST, "run"], {
            cwd: dir,
            encoding: "utf8",
            env: { ...process.env, VITEST_BUDGET_CHECK: "1", GITHUB_ACTIONS: "", GRAPHTY_TEST_SLOTS: "0", ...env },
        });
        return { status: result.status, output: result.stdout + result.stderr };
    }

    it("reports a test over 3 times its recorded median, keeps the history, and never fails the run", () => {
        const dir = mkdtempSync(join(TMP, "run-"));
        const history = join(dir, "durations", "shard.json");
        writeFileSync(
            join(dir, "a.test.js"),
            'test("slower", async () => { await new Promise((r) => setTimeout(r, 1200)); });\n' +
                'test("quick", () => {});\n',
        );
        writeFileSync(
            join(dir, "vitest.config.mjs"),
            `export default { test: { globals: true, include: ["*.test.js"], ` +
                `reporters: ["default", [${JSON.stringify(REPORTER)}, { root: ${JSON.stringify(dir)} }]] } };\n`,
        );
        const first = run(dir, { VITEST_DURATION_HISTORY: history });
        assert.equal(first.status, 0, first.output);
        assert.doesNotMatch(first.output, /slow test/);
        const recorded = JSON.parse(readFileSync(history, "utf8"));
        const key = Object.keys(recorded).find((k) => k.endsWith("\0a.test.js\0slower"));
        assert.ok(key, JSON.stringify(recorded));
        assert.equal(recorded[key].length, 1);

        writeFileSync(history, JSON.stringify({ ...recorded, [key]: [300, 300, 300] }));
        const second = run(dir, { VITEST_DURATION_HISTORY: history, GITHUB_ACTIONS: "true" });
        assert.equal(second.status, 0, second.output);
        assert.match(second.output, /\[time-budget\] 1 slow test\(s\)/);
        assert.match(second.output, /a\.test\.js > slower/);
        assert.match(second.output, /median 0\.30 s/);
        assert.match(second.output, /::warning file=a\.test\.js,title=slow test::slower took/);
        assert.equal(JSON.parse(readFileSync(history, "utf8"))[key].length, 4);
    });

    it("does nothing when the report is off", () => {
        const dir = mkdtempSync(join(TMP, "off-"));
        writeFileSync(join(dir, "a.test.js"), 'test("quick", () => {});\n');
        writeFileSync(
            join(dir, "vitest.config.mjs"),
            `export default { test: { globals: true, include: ["*.test.js"], reporters: ["default", ${JSON.stringify(REPORTER)}] } };\n`,
        );
        const { status, output } = run(dir, { VITEST_BUDGET_CHECK: "" });
        assert.equal(status, 0, output);
        assert.doesNotMatch(output, /\[time-budget\]/);
    });
});

describe("with the results store", () => {
    const servers = [];
    after(() => servers.forEach((s) => (s.closeAllConnections(), s.close())));
    // A store that holds one history, or (answer false) reads requests and never answers.
    const serve = (stored, answer = true) => {
        const seen = [];
        const server = createServer((req, res) => {
            let body = "";
            req.on("data", (d) => (body += d));
            req.on("end", () => {
                seen.push({ method: req.method, url: req.url, body });
                if (answer) res.end(req.method === "GET" ? JSON.stringify(stored) : "{}");
            });
        });
        servers.push(server);
        return new Promise((resolve) =>
            server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${server.address().port}`, seen })),
        );
    };
    const withEnv = async (vars, fn) => {
        const saved = Object.fromEntries(Object.keys(vars).map((k) => [k, process.env[k]]));
        Object.assign(process.env, vars);
        try {
            return await fn();
        } finally {
            for (const [k, v] of Object.entries(saved))
                if (v === undefined) delete process.env[k];
                else process.env[k] = v;
        }
    };
    const finish = (history) => {
        const r = new TimeBudgetReporter({ root: "/r", history });
        r.onTestCaseResult({
            module: { moduleId: "/r/pkg/test/a.test.ts" },
            fullName: "suite > case",
            project: { name: "default" },
            result: () => ({ state: "passed" }),
            diagnostic: () => ({ duration: 100 }),
        });
        return r.onTestRunEnd();
    };

    it("reads the history from the store, writes it back there and to the file", async () => {
        const s = await serve({ [KEY]: [7] });
        const history = join(mkdtempSync(join(TMP, "store-")), "shard-x.json");
        // A pull request's run never writes to the store, so this test must not inherit CI's pull_request event.
        await withEnv(
            { VITEST_BUDGET_CHECK: "1", RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t", GITHUB_EVENT_NAME: "push" },
            () => finish(history),
        );
        assert.deepEqual(
            s.seen.map((r) => [r.method, r.url]),
            [
                ["GET", "/v1/durations/tests/shard-x"],
                ["PUT", "/v1/durations/tests/shard-x"],
            ],
        );
        assert.deepEqual(JSON.parse(s.seen[1].body)[KEY], [7, 100]);
        assert.deepEqual(JSON.parse(readFileSync(history, "utf8"))[KEY], [7, 100]);
    });

    it("falls back to the file when the store never answers", async () => {
        const s = await serve({}, false);
        const history = join(mkdtempSync(join(TMP, "store-")), "shard-y.json");
        writeFileSync(history, JSON.stringify({ [KEY]: [5] }));
        await withEnv({ VITEST_BUDGET_CHECK: "1", RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" }, () =>
            finish(history),
        );
        assert.deepEqual(JSON.parse(readFileSync(history, "utf8"))[KEY], [5, 100]);
        // One timeout at most: no write after a read that got no answer.
        assert.deepEqual(
            s.seen.map((r) => r.method),
            ["GET"],
        );
    });
});
