// Tests of the results store's client, failure reporter and group runner (tools/results/): what they send,
// that they batch past the 20th failure, and that a store that never answers costs only its timeout and
// leaves the run's verdict alone, the record spooled.
//
//   node --test tools/results/results.test.mjs
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it, mock } from "node:test";

import { isolateGit } from "../isolated-git-env.mjs";
import {
    call,
    config,
    EVENT_MS,
    flushHealth,
    postFailures,
    postBenchmarks,
    postFlaky,
    postInvocation,
    readPlan,
    RECORD_MS,
} from "./client.mjs";
import { envString, inputsKey } from "./inputs.mjs";
import ResultsReporter, { BATCH_MS, IMMEDIATE, invocationOf } from "./reporter.mjs";
import { failureHashes } from "../test-ledger.mjs";
import { baseCheck, fromLedger, importLedger, ledgerFiles } from "./cli.mjs";
import { benchmarkRows } from "./post-benchmarks.mjs";
import { dispatchChecks, readChecks } from "./dispatch-base-checks.mjs";
import { decide } from "../test-quarantine.mjs";
import { durationsOf, planRead, variantsOf } from "./plan-read.mjs";
import {
    baseId,
    fileIssues,
    groupKeys,
    groupFamily,
    junitOf,
    newFlakyJudge,
    postRecords,
    prJudge,
    recordsOf,
    refreshPlan,
    runGroup,
    runShape,
    storeList,
} from "./run-group.mjs";

isolateGit();
const TMP = mkdtempSync(join(tmpdir(), "results-"));
const servers = [];
after(() => {
    for (const s of servers) (s.closeAllConnections?.(), s.close());
    rmSync(TMP, { recursive: true, force: true });
});

/**
 * A local server that records every request.
 * @param [answer] false makes it read requests and never answer them; a function answers GET /v1/plan
 * @returns `{ url, seen }`
 */
function serve(answer = true) {
    const seen = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", () => {
            seen.push({ method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null });
            if (!answer) return;
            if (req.url.startsWith("/token")) {
                const payload = Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 600 })).toString("base64url");
                res.end(JSON.stringify({ value: `h.${payload}.s` }));
            } else if (req.url.startsWith("/v1/plan")) {
                // a function that returns undefined leaves this request unanswered
                const plan = typeof answer === "function" ? answer(req) : { order: ["a"] };
                if (plan !== undefined) res.end(JSON.stringify(plan));
            } else res.end("{}");
        });
    });
    servers.push(server);
    return new Promise((resolve) =>
        server.listen(0, "127.0.0.1", () => resolve({ url: `http://127.0.0.1:${server.address().port}`, seen })),
    );
}

describe("config", () => {
    it("is off without RESULTS_URL, with GRAPHTY_RESULTS=0, and without a credential", () => {
        assert.equal(config({ GRAPHTY_RESULTS_TOKEN: "t" }, TMP), null);
        assert.equal(config({ RESULTS_URL: "http://x", GRAPHTY_RESULTS_TOKEN: "t", GRAPHTY_RESULTS: "0" }, TMP), null);
        assert.equal(config({ RESULTS_URL: "http://x" }, TMP), null);
    });
    it("reads the local token from .env when the environment has none", () => {
        const root = join(TMP, "envroot");
        mkdirSync(root);
        writeFileSync(join(root, ".env"), "OTHER=1\nGRAPHTY_RESULTS_TOKEN=abc\n");
        assert.deepEqual(config({ RESULTS_URL: "http://x/" }, root), { url: "http://x", token: "abc", oidc: null });
    });
});

describe("client", () => {
    it("uses 5 s for records and 2 s for failure events", () => {
        assert.equal(RECORD_MS, 5000);
        assert.equal(EVENT_MS, 2000);
    });
    it("sends the token and the schema version", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "tok" });
        assert.deepEqual(await call(cfg, "POST", "/v1/invocations", { id: "x" }), { ok: true, data: {} });
        assert.equal(s.seen[0].headers.authorization, "Bearer tok");
        assert.equal(s.seen[0].headers["x-results-schema"], "1");
        assert.deepEqual(s.seen[0].body, { id: "x" });
    });
    it("asks GitHub for an OIDC token with the graphty-results audience, once", async () => {
        const s = await serve();
        const env = {
            RESULTS_URL: s.url,
            ACTIONS_ID_TOKEN_REQUEST_URL: `${s.url}/token?x=1`,
            ACTIONS_ID_TOKEN_REQUEST_TOKEN: "req",
        };
        const cfg = config(env);
        await call(cfg, "GET", "/v1/status");
        await call(cfg, "GET", "/v1/status");
        const tokens = s.seen.filter((r) => r.url.startsWith("/token"));
        assert.equal(tokens.length, 1);
        assert.equal(tokens[0].url, "/token?x=1&audience=graphty-results");
        assert.match(s.seen.at(-1).headers.authorization, /^Bearer h\./);
    });
    it("sends one failure flat and several as a batch", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const f = { file: "a", name: "n", status: "fail", message: "m" };
        await postFailures(cfg, "inv", [f]);
        await postFailures(cfg, "inv", [f, f]);
        assert.deepEqual(s.seen[0].body, { invocation: "inv", ...f });
        assert.deepEqual(s.seen[1].body, { invocation: "inv", failures: [f, f] });
    });
    it("reads the plan with the query joined", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        assert.deepEqual(await readPlan(cfg, { sha: "abc", files: ["x", "y"] }), { order: ["a"] });
        assert.equal(s.seen[0].url, "/v1/plan?sha=abc&files=x%2Cy");
    });
    it("fails open against a store that never answers, and spools the record", async () => {
        const s = await serve(false);
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const r = await postInvocation({ ...cfg, retryMs: [10, 10] }, { id: "r1.1" }, join(TMP, "spool"), 300);
        assert.equal(r.ok, false);
        assert.equal(r.why, "no answer in 0.3 s");
        assert.equal(s.seen.length, 3, "sent once and retried twice");
        assert.deepEqual(JSON.parse(readFileSync(r.spooled, "utf8")), { id: "r1.1" });
    });
    it("sends a request again when no answer came, and never one that got an answer", async () => {
        let calls = 0;
        const slowOnce = await serve(() => (++calls === 1 ? undefined : { order: ["b"] }));
        const cfg = { ...config({ RESULTS_URL: slowOnce.url, GRAPHTY_RESULTS_TOKEN: "t" }), retryMs: [10, 10] };
        assert.deepEqual(await call(cfg, "GET", "/v1/plan", undefined, 300), { ok: true, data: { order: ["b"] } });
        assert.equal(calls, 2);
        mock.method(globalThis, "fetch", () => Promise.resolve(new Response("", { status: 503 })));
        try {
            assert.deepEqual(await call(cfg, "GET", "/v1/plan"), { ok: false, why: "HTTP 503" });
            assert.equal(globalThis.fetch.mock.callCount(), 1);
        } finally {
            mock.restoreAll();
        }
    });
    it("gives the OIDC token request and the call one deadline between them", async () => {
        const signals = [];
        mock.method(globalThis, "fetch", (_url, init) => {
            signals.push(init.signal);
            const payload = Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 600 })).toString("base64url");
            return Promise.resolve(
                new Response(signals.length === 1 ? JSON.stringify({ value: `h.${payload}.s` }) : "{}"),
            );
        });
        try {
            const env = { RESULTS_URL: "http://store", ACTIONS_ID_TOKEN_REQUEST_URL: "http://gh/one-deadline?x=1" };
            const cfg = config({ ...env, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "req" });
            assert.equal((await call(cfg, "GET", "/v1/status")).ok, true);
            assert.equal(signals.length, 2);
            assert.equal(signals[0], signals[1]);
        } finally {
            mock.restoreAll();
        }
    });
    it("fails open with no store configured", async () => {
        assert.deepEqual(await call(null, "GET", "/v1/plan"), { ok: false, why: "results store not configured" });
        assert.equal(await readPlan(null, {}), null);
    });
});

describe("inputs", () => {
    it("depends on every part and not on the order of the files", () => {
        const base = { shardKey: "k", files: ["b", "a"], env: "e", flags: "off" };
        const key = inputsKey(base);
        assert.match(key, /^[\da-f]{16}$/);
        assert.equal(inputsKey({ ...base, files: ["a", "b"] }), key);
        for (const change of [{ shardKey: "k2" }, { files: ["a"] }, { env: "e2" }, { flags: "on" }, { extra: "x" }]) {
            assert.notEqual(inputsKey({ ...base, ...change }), key);
        }
    });
    it("names the runner image, class, CPUs, workers, Node and GPU", () => {
        const e = envString({ ImageOS: "ubuntu24", ImageVersion: "1.2", RUNNER_ENVIRONMENT: "github-hosted" });
        assert.match(e, /^ubuntu24\/1\.2\|github-hosted\|cpu\d+\|workers-\|node[\d.]+\|gpu-$/);
    });
});

const testCase = (i, state = "failed") => ({
    module: { moduleId: join(process.cwd(), "pkg/test/a.test.ts") },
    fullName: `case ${i}`,
    result: () => ({ state, errors: [{ message: `boom ${i}`, stack: "at x" }] }),
});

describe("reporter", () => {
    it("names try 2 for the retry and is off without an invocation", () => {
        assert.equal(invocationOf({}), "");
        assert.equal(invocationOf({ GRAPHTY_RESULTS_INVOCATION: "b", TEST_LEDGER_RUN: "r" }), "b.1");
        assert.equal(invocationOf({ GRAPHTY_RESULTS_INVOCATION: "b", TEST_LEDGER_RUN: "r.retry" }), "b.2");
        assert.equal(new ResultsReporter({ env: {} }).on, false);
    });
    it("sends the first 20 failures at once, then one batch every 5 s, and the rest at the end", async () => {
        mock.timers.enable({ apis: ["setTimeout"] });
        try {
            const events = [];
            const r = new ResultsReporter({
                env: { GRAPHTY_RESULTS_INVOCATION: "b" },
                cfg: {},
                root: process.cwd(),
                send: (_cfg, inv, failures) => events.push({ inv, failures }),
            });
            r.onTestCaseResult(testCase(0, "passed"));
            for (let i = 0; i < 25; i++) r.onTestCaseResult(testCase(i));
            assert.equal(IMMEDIATE, 20);
            assert.equal(events.length, 20);
            assert.deepEqual(events[0], {
                inv: "b.1",
                failures: [{ file: "pkg/test/a.test.ts", name: "case 0", status: "fail", message: "boom 0\nat x" }],
            });
            mock.timers.tick(BATCH_MS);
            assert.equal(events.length, 21);
            assert.equal(events[20].failures.length, 5);
            r.onTestCaseResult(testCase(25));
            await r.onTestRunEnd();
            assert.equal(events.length, 22);
            assert.deepEqual(
                events[21].failures.map((f) => f.name),
                ["case 25"],
            );
        } finally {
            mock.timers.reset();
        }
    });
    it("sends a story whose two renders disagreed as unstable", () => {
        const events = [];
        const r = new ResultsReporter({
            env: { GRAPHTY_RESULTS_INVOCATION: "b" },
            cfg: {},
            root: process.cwd(),
            send: (_cfg, inv, failures) => events.push({ inv, failures }),
        });
        const message = "visual-review: app--default is unstable (two renders drew different pictures): dark";
        r.onTestCaseResult({
            module: { moduleId: join(process.cwd(), "graphty/src/App.stories.tsx") },
            fullName: "Default",
            result: () => ({ state: "failed", errors: [{ message, stack: "at x" }] }),
        });
        assert.deepEqual(events[0].failures[0], {
            file: "graphty/src/App.stories.tsx",
            name: "Default",
            status: "unstable",
            message: `${message}\nat x`,
        });
    });
    it("ends the run when the store never answers", async () => {
        const s = await serve(false);
        const cfg = { ...config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" }), retryMs: [10, 10] };
        const r = new ResultsReporter({ env: { GRAPHTY_RESULTS_INVOCATION: "b" }, cfg });
        r.onTestCaseResult(testCase(1));
        await r.onTestRunEnd();
        assert.equal(s.seen.length, 3, "the first request and its two retries, and nothing after");
    });
});

const junit = (cases) =>
    `<testsuites>${cases
        .map(
            ([name, fail]) =>
                `<testcase classname="test/a.test.ts" name="${name}" time="0.5">${fail ? `<failure message="m">${fail}</failure>` : ""}</testcase>`,
        )
        .join("")}</testsuites>`;

describe("records", () => {
    it("makes one record per try with file counts and failures", () => {
        const dir = join(TMP, "results-1");
        mkdirSync(dir);
        writeFileSync(join(dir, "junit-pkg-run1-11.xml"), junit([["ok"], ["bad", "AssertionError: x"]]));
        writeFileSync(join(dir, "junit-pkg-run1.retry-12.xml"), junit([["bad"]]));
        assert.equal(junitOf(dir, "nope"), null);
        const recs = recordsOf({
            id: "9.1.job.pkg",
            head: { commit: "c", tree: "t", base: "b", dirty: false },
            variant: "pkg|flags=off|whole",
            inputs: "i",
            env: "e",
            code: 0,
            result: { firstCode: 1, firstOutcome: "failed", retried: true, retryCode: 0, retryAt: 7000 },
            startedAt: 1000,
            endedAt: 9000,
            dir,
            runId: "run1",
        });
        assert.deepEqual(
            recs.map((r) => [r.id, r.try, r.outcome, r.secs]),
            [
                ["9.1.job.pkg.1", 1, "failed", 6],
                ["9.1.job.pkg.2", 2, "passed", 2],
            ],
        );
        assert.deepEqual(recs[0].files, [["pkg/test/a.test.ts", 1, 1, 0, 1000]]);
        assert.deepEqual(recs[0].failures, [
            { file: "pkg/test/a.test.ts", name: "bad", status: "fail", message: "AssertionError: x" },
        ]);
        assert.deepEqual(recs[1].files, [["pkg/test/a.test.ts", 1, 0, 0, 500]]);
        assert.equal(recs[0].baseSha, "b");
        // a retry that ran none of the failed files (an empty report under the wrong command) is no pass
        const empty = recordsOf({
            id: "9.1.job.pkg",
            head: { commit: "c", tree: "t", base: "b", dirty: false },
            variant: "pkg|flags=off|whole",
            inputs: "i",
            env: "e",
            code: 1,
            result: {
                firstCode: 1,
                firstOutcome: "failed",
                retried: true,
                retryCode: 0,
                retryRan: false,
                retryAt: 7000,
            },
            startedAt: 1000,
            endedAt: 9000,
            dir,
            runId: "run1",
        });
        assert.equal(empty[1].outcome, "error");
        // a first try that exited 0 and still failed the shard (its output over the budget) is no pass
        const flood = recordsOf({
            id: "9.1.job.pkg",
            head: { commit: "c", tree: "t", base: "b", dirty: false },
            variant: "pkg|flags=off|whole",
            inputs: "i",
            env: "e",
            code: 1,
            result: { firstCode: 0, retried: false },
            startedAt: 1000,
            endedAt: 9000,
            dir,
            runId: "run1",
        });
        assert.deepEqual(
            flood.map((r) => r.outcome),
            ["error"],
        );
    });
});

describe("runShape", () => {
    it("files a story-tests run that takes screenshots apart from the plain test job of the same shard", () => {
        // ci.yml's graphty leg runs graphty-storybook's own command with VISUAL_REVIEW_STORY_OUT set
        assert.equal(runShape({ VISUAL_REVIEW_STORY_OUT: "/tmp/stories" }, false), "shots");
        assert.equal(runShape({ VISUAL_REVIEW_STORY_OUT: "/tmp/stories" }, true), "shots");
        assert.equal(runShape({}, false), "whole");
        assert.equal(runShape({}, true), "selected");
    });
});

describe("postRecords", () => {
    it("asks a store that never answers once and spools every record", async () => {
        const s = await serve(false);
        const cfg = { ...config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" }), retryMs: [10, 10] };
        const spool = join(TMP, "spool-2");
        const rs = await postRecords(cfg, [{ id: "g.1" }, { id: "g.2" }], spool, 300);
        assert.equal(s.seen.length, 3, "the first request and its two retries, and nothing after");
        assert.deepEqual(
            rs.map((r) => r.ok),
            [false, false],
        );
        assert.deepEqual(readdirSync(spool).sort(), ["g.1.json", "g.2.json"]);
    });
});

describe("runGroup", () => {
    it("keeps the verdict and spools the record when the store never answers", async () => {
        const s = await serve(false);
        const root = join(TMP, "checkout");
        mkdirSync(join(root, "tools"), { recursive: true });
        // A command that dies with no vitest summary: outcome infra, not retried.
        const cmd = "exit 3";
        writeFileSync(
            join(root, "tools/ci-test-matrix.mjs"),
            `export const SHARDS = [{ shard: "fake", package: "pkg", "test-command": ${JSON.stringify(cmd)} }];\n`,
        );
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "x"], {
            cwd: root,
        });
        const env = { PATH: process.env.PATH, RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t", GITHUB_RUN_ID: "5" };
        const code = await runGroup("fake", undefined, { root, env });
        assert.equal(code, 3);
        const spooled = readdirSync(join(root, "test-results/results-spool"));
        assert.deepEqual(spooled, ["5.1.job.fake.1.json"]);
        const rec = JSON.parse(readFileSync(join(root, "test-results/results-spool", spooled[0]), "utf8"));
        assert.equal(rec.variant, "fake|flags=off|whole");
        assert.equal(rec.outcome, "infra");
        assert.equal(rec.sha.length, 40);
    });

    it("files an On shard's record and inputs key under flags=on, a plain shard's under flags=off", async () => {
        const s = await serve(false);
        const root = join(TMP, "checkout-on");
        mkdirSync(join(root, "tools"), { recursive: true });
        writeFileSync(
            join(root, "tools/ci-test-matrix.mjs"),
            "export const SHARDS = [" +
                '{ shard: "plain", package: "pkg", "test-command": "exit 3" },' +
                '{ shard: "pkg-features-on-1", package: "pkg", "test-command": "exit 3", flags: "on" }];\n',
        );
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "x"], { cwd: root });
        const env = { PATH: process.env.PATH, RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t", GITHUB_RUN_ID: "7" };
        const spool = join(root, "test-results/results-spool");
        await runGroup("plain", undefined, { root, env });
        await runGroup("pkg-features-on-1", undefined, { root, env });
        const read = (f) => JSON.parse(readFileSync(join(spool, f), "utf8"));
        assert.equal(read("7.1.job.plain.1.json").variant, "plain|flags=off|whole");
        assert.equal(read("7.1.job.pkg-features-on-1.1.json").variant, "pkg-features-on|flags=on|whole");

        const e = { PATH: "x" };
        const on = { flags: "on", "test-command": "c" };
        const keys = (shard, env = e) => groupKeys({ shardName: "f-1", shard, cmd: "c", env, shardKey: "k" });
        const key = (flags) => inputsKey({ shardKey: "k", env: envString(e), flags });
        assert.deepEqual(keys(on), { variant: "f|flags=on|whole", inputs: key("on") });
        assert.deepEqual(keys({ "test-command": "c" }), { variant: "f|flags=off|whole", inputs: key("off") });
        assert.equal(keys({ "test-command": "c" }, { ...e, GRAPHTY_FLAGS: "on" }).inputs, key("on"));
        assert.notEqual(key("on"), key("off"));
    });

    it("keeps a passing verdict when the record cannot even be spooled", async () => {
        const s = await serve(false);
        const root = join(TMP, "checkout-nospool");
        mkdirSync(join(root, "tools"), { recursive: true });
        writeFileSync(
            join(root, "tools/ci-test-matrix.mjs"),
            `export const SHARDS = [{ shard: "fake", package: "pkg", "test-command": "exit 0" }];\n`,
        );
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "x"], { cwd: root });
        // The spool directory is a file, so writing the unsent record throws.
        mkdirSync(join(root, "test-results"), { recursive: true });
        writeFileSync(join(root, "test-results/results-spool"), "");
        const env = { PATH: process.env.PATH, RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t", GITHUB_RUN_ID: "6" };
        assert.equal(await runGroup("fake", undefined, { root, env }), 0);
    });
});

describe("groupFamily", () => {
    it("keeps every story-tests leg that takes screenshots apart from the shard it is named after", () => {
        const shots = { VISUAL_REVIEW_STORY_OUT: "/tmp/stories" };
        // ci.yml's story-tests legs: the graphty and graphty-element storybook shards, and the algorithms and
        // layout legs that borrow the algorithms-browser and layout unit-test shards' names
        for (const [shard, plain] of [
            ["graphty-storybook", "graphty-storybook"],
            ["graphty-element-storybook-1", "graphty-element-storybook"],
            ["algorithms-browser", "algorithms-browser"],
            ["layout", "layout"],
        ]) {
            assert.equal(groupFamily(shard, {}), plain);
            assert.equal(groupFamily(shard, shots), `${plain}-shots`);
        }
    });

    it("judges a screenshot run by its shard's quarantine and its own and hands that very list to the combine step", async () => {
        const root = join(TMP, "checkout-shots");
        mkdirSync(join(root, "tools"), { recursive: true });
        writeFileSync(
            join(root, "tools/ci-test-matrix.mjs"),
            `export const SHARDS = [{ shard: "graphty-storybook", package: "graphty", "test-command": "exit 0" }];\n`,
        );
        const day = new Date().toISOString().slice(0, 10);
        const entry = (family, name) => ({
            file: "g/A.stories.tsx",
            name,
            family,
            issue: 7,
            reason: "r",
            since: day,
            expires: day,
        });
        writeFileSync(
            join(root, "tools/test-quarantine.json"),
            JSON.stringify({
                quarantine: [entry("graphty-storybook", "Plain"), entry("graphty-storybook-shots", "Shots")],
            }),
        );
        const out = join(root, "not-made-yet/quarantine.json");
        const env = {
            PATH: process.env.PATH,
            GRAPHTY_RESULTS: "0",
            VISUAL_REVIEW_STORY_OUT: root,
            RESULTS_QUARANTINE_OUT: out,
        };
        assert.equal(await runGroup("graphty-storybook", undefined, { root, env }), 0);
        const { quarantine } = JSON.parse(readFileSync(out, "utf8"));
        assert.deepEqual(
            quarantine.map((q) => [q.name, q.family]),
            [
                ["Plain", "graphty-storybook-shots"],
                ["Shots", "graphty-storybook-shots"],
            ],
        );
    });
});

describe("planRead", () => {
    const shards = [
        { shard: "graphty-element-browser-1", package: "graphty-element" },
        { shard: "graphty-element-browser-2", package: "graphty-element" },
        { shard: "layout", package: "layout" },
    ];
    it("asks for each affected family, both run shapes", () => {
        assert.deepEqual(variantsOf(shards, ["graphty-element"]), [
            "graphty-element-browser|flags=off|whole",
            "graphty-element-browser|flags=off|selected",
        ]);
    });
    it("never asks about a full-run-only family, such as the On shards", () => {
        const on = {
            shard: "graphty-element-browser-features-on-1",
            package: "graphty-element",
            "full-run-only": true,
        };
        assert.deepEqual(variantsOf([...shards, on], ["graphty-element"]), variantsOf(shards, ["graphty-element"]));
    });
    it("also asks for a story shard's screenshot family", () => {
        const stories = [{ shard: "graphty-storybook", package: "graphty" }];
        assert.deepEqual(variantsOf(stories, ["graphty"]), [
            "graphty-storybook|flags=off|whole",
            "graphty-storybook|flags=off|selected",
            "graphty-storybook-shots|flags=off|shots",
        ]);
    });
    it("takes a selected run's file time over a whole run's", () => {
        const plan = {
            variants: {
                "layout|flags=off|selected": { fileMs: { "a.test.ts": 5 } },
                "layout|flags=off|whole": { fileMs: { "a.test.ts": 9, "b.test.ts": 7 } },
            },
        };
        assert.deepEqual(durationsOf(plan), { layout: { "a.test.ts": 5, "b.test.ts": 7 } });
        assert.deepEqual(durationsOf(null), {});
    });
    it("fails open: no store writes an unavailable plan and empty durations", async () => {
        const out = join(TMP, "plan-off");
        const r = await planRead({ root: process.cwd(), affected: ["layout"], out, env: {} });
        assert.equal(r.plan, null);
        assert.deepEqual(JSON.parse(readFileSync(join(out, "results-plan.json"), "utf8")), {
            unavailable: "results store not configured",
        });
        assert.deepEqual(JSON.parse(readFileSync(join(out, "durations.json"), "utf8")), {});
    });
    it("reads the plan once and writes its durations", async () => {
        const { url, seen } = await serve();
        const out = join(TMP, "plan-on");
        await planRead({
            root: process.cwd(),
            affected: ["layout"],
            out,
            sha: "abc",
            files: ["layout/src/x.ts"],
            env: { RESULTS_URL: url, GRAPHTY_RESULTS_TOKEN: "t" },
        });
        assert.equal(seen.length, 1);
        const q = new URL(seen[0].url, url).searchParams;
        assert.equal(q.get("variants"), "layout|flags=off|whole,layout|flags=off|selected");
        assert.equal(q.get("inputs"), "-,-");
        assert.equal(q.get("files"), "layout/src/x.ts");
    });
});

describe("the [NEW-FLAKY] rule without the store's answer (#4146)", () => {
    const FILE = "graphty/src/a.test.ts";
    const T = { file: FILE, name: "flips" };
    const OTHER = { file: "graphty/src/b.test.ts", name: "other" };
    const flaky = { pass: true, flaky: [T, OTHER], excused: [], failing: [] };

    it("fails a flaky test the pull request touched and leaves an untouched or quarantined one flaky", () => {
        const d = newFlakyJudge({ base: "b1", affected: [FILE] }, "graphty", [])(flaky);
        assert.equal(d.pass, false);
        assert.deepEqual(d.caused, [T]);
        assert.deepEqual(d.failing, [T]);
        assert.deepEqual(d.flaky, [OTHER]);
        const q = [{ family: "graphty", file: FILE, name: "flips", issue: 9 }];
        assert.equal(newFlakyJudge({ base: "b1", affected: [FILE] }, "graphty", q)(flaky).pass, true);
        assert.equal(newFlakyJudge({ base: "b1", affected: ["x.ts"] }, "graphty", [])(flaky).pass, true);
        // no file-level answer for the family: every test counts as touched
        const unknown = { base: "b1", affected: [], unknownFamilies: ["graphty"] };
        assert.equal(newFlakyJudge(unknown, "graphty", [])(flaky).caused.length, 2);
    });

    // A checkout whose one shard fails FILE's test, then passes it when the retry runs the file alone
    // (bin/pnpm stands in for vitest).
    function flakyCheckout(name) {
        const root = join(TMP, name);
        mkdirSync(join(root, "tools"), { recursive: true });
        mkdirSync(join(root, "graphty"));
        mkdirSync(join(root, "bin"));
        mkdirSync(join(root, "test-results"));
        writeFileSync(
            join(root, "tools/ci-test-matrix.mjs"),
            `export const SHARDS = [{ shard: "graphty-1", package: "graphty", "test-command": "cd graphty && pnpm exec vitest run --project=x" }];\n`,
        );
        const junit = (failed) =>
            `<testsuites><testsuite><testcase classname="src/a.test.ts" name="flips">${failed ? '<failure message="boom">AssertionError: boom</failure>' : ""}</testcase></testsuite></testsuites>`;
        writeFileSync(join(root, "first.xml"), junit(true));
        writeFileSync(join(root, "retry.xml"), junit(false));
        writeFileSync(
            join(root, "bin/pnpm"),
            "#!/bin/sh\ncp ../retry.xml ../test-results/junit-graphty-2.xml; echo ' Test Files  1 passed (1)'\n",
            { mode: 0o755 },
        );
        execFileSync("git", ["init", "-q"], { cwd: root });
        execFileSync("git", ["commit", "-q", "--allow-empty", "-m", "x"], { cwd: root });
        const first =
            "cp first.xml test-results/junit-graphty-1.xml; echo ' Test Files  1 failed (1)'; echo '      Tests  1 failed (1)'; exit 1";
        return { root, first };
    }

    it("fails a pull request's shard on a test it made flaky when the store gave no answer", async () => {
        const verdict = async (name, plan, event = "pull_request") => {
            const c = flakyCheckout(name);
            writeFileSync(join(c.root, "plan.json"), JSON.stringify(plan));
            const env = {
                PATH: `${join(c.root, "bin")}:${process.env.PATH}`,
                GRAPHTY_RESULTS: "0",
                GITHUB_EVENT_NAME: event,
                RESULTS_PLAN: join(c.root, "plan.json"),
            };
            return runGroup("graphty-1", c.first, { root: c.root, env });
        };
        const outage = { unavailable: "no answer", base: "b1", affected: [FILE], unknownFamilies: [] };
        assert.equal(await verdict("nf-touched", outage), 1, "touched: [NEW-FLAKY] fails the shard");
        assert.equal(await verdict("nf-untouched", { ...outage, affected: ["graphty/src/z.ts"] }), 0);
        assert.equal(await verdict("nf-no-diff", { unavailable: "the test selector failed" }), 0, "no answer at all");
        assert.equal(await verdict("nf-push", outage, "push"), 0, "only a pull request");
    });
});

describe("the pull request rules", () => {
    const FAMILY = "graphty-element-browser";
    const o = {
        shard: "graphty-element-browser-3",
        family: FAMILY,
        variant: `${FAMILY}|flags=off|selected`,
        base: "b1",
    };
    const fail = (name, file = "a.test.ts", text = `AssertionError: ${name}`) => ({ file, name, text });
    const report = (...failures) => ({ files: new Map(), failures });
    // decide() of a run and its retry, then the judge
    const judge = (plan, first, second) => {
        const d = decide({ family: FAMILY, first, firstOutcome: "failed", second, list: storeList(plan) });
        return prJudge(plan, o)(d, { firstOutcome: "failed" });
    };
    const tags = (d) => d.lines.map((l) => `${l.warn ? "warn" : "fail"} ${l.text.split(" ")[0]}`);

    it("passes an unrelated flaky test loudly and names its base check; fails one the pull request touched", () => {
        const plan = { quarantine: [], failingOnBase: [], affected: ["touched.test.ts"] };
        const d = judge(plan, report(fail("flips"), fail("mine", "touched.test.ts")), report());
        assert.deepEqual(tags(d), ["warn [FLAKY-UNRELATED]", "fail [NEW-FLAKY]"]);
        assert.equal(d.pass, false);
        assert.match(
            d.lines[0].text,
            /gh workflow run base-check\.yml --ref master -f base=b1 -f file='a\.test\.ts' -f variant='graphty-element-browser\|flags=off\|selected' -f repeat=5/,
        );
        assert.equal(judge(plan, report(fail("flips")), report()).pass, true);
        // a family with no file-level answer counts every one of its files as touched
        const unknown = { ...plan, unknownFamilies: [FAMILY] };
        assert.deepEqual(tags(judge(unknown, report(fail("flips")), report())), ["fail [NEW-FLAKY]"]);
        // a plan with no `affected` (the everything plan) counts every test as touched
        const everything = { quarantine: [], failingOnBase: [] };
        assert.deepEqual(tags(judge(everything, report(fail("flips")), report())), ["fail [NEW-FLAKY]"]);
    });

    it("writes the base checks it names for ci.yml's base-checks job, which dispatches only valid ones", async () => {
        const dir = mkdtempSync(join(tmpdir(), "base-checks-"));
        const out = join(dir, "checks");
        const plan = { quarantine: [], failingOnBase: [], affected: [] };
        const d = decide({
            family: FAMILY,
            first: report(fail("flips"), fail("broken", "b.test.ts")),
            firstOutcome: "failed",
            second: report(fail("broken", "b.test.ts")),
            list: storeList(plan),
        });
        prJudge(plan, { ...o, base: "abc1234", out })(d, { firstOutcome: "failed" });
        const variant = o.variant;
        // a line from the pull request's code that would inject an argument, and a duplicate, are dropped
        writeFileSync(
            join(dir, "checks", "evil.jsonl"),
            `${JSON.stringify({ base: "abc1234", file: "a.test.ts' -f x='1", variant, repeat: 5 })}\nnot json\n` +
                `${JSON.stringify({ base: "abc1234", file: "a.test.ts", variant, repeat: 1 })}\n`,
        );
        const checks = readChecks(join(dir, "checks"));
        assert.deepEqual(checks, [
            { base: "abc1234", file: "a.test.ts", variant, repeat: 5 },
            { base: "abc1234", file: "b.test.ts", variant, repeat: 1 },
        ]);
        const calls = [];
        assert.equal(await dispatchChecks(checks, (args) => calls.push(args.join(" "))), 2);
        assert.equal(
            calls[0],
            `workflow run base-check.yml --ref master -f base=abc1234 -f file=a.test.ts -f variant=${variant} -f repeat=5`,
        );
        assert.deepEqual(readChecks(join(dir, "none")), []);
        rmSync(dir, { recursive: true, force: true });
    });

    it("says [KNOWN] when master failed it the same way on the base, and passes it as [UNRELATED] otherwise", () => {
        const { key } = failureHashes("AssertionError: known", "a.test.ts");
        const row = {
            variant: `${FAMILY}|flags=off|whole`,
            sha: "b1",
            file: "a.test.ts",
            name: "known",
            key,
            issue: 31,
        };
        const plan = { quarantine: [], failingOnBase: [row, { ...row, name: "other key", key: "nope" }], affected: [] };
        const both = report(fail("known"), fail("other key"));
        const d = judge(plan, both, both);
        assert.deepEqual(tags(d), ["warn [KNOWN]", "warn [UNRELATED]"]);
        assert.equal(d.pass, true);
        assert.match(d.lines[0].text, /fails the same way on master b1, issue #31/);
        assert.match(d.lines[1].text, /-f repeat=1/);
        assert.equal(judge(plan, report(fail("known")), report(fail("known"))).pass, true);
        // master evidence with other flags or from another family is not [KNOWN]; untouched, it is [UNRELATED]
        const flagsOn = { ...plan, failingOnBase: [{ ...row, variant: `${FAMILY}|flags=on|whole` }] };
        assert.deepEqual(tags(judge(flagsOn, report(fail("known")), report(fail("known")))), ["warn [UNRELATED]"]);
        const elsewhere = { ...plan, failingOnBase: [{ ...row, variant: "layout|flags=off|whole" }] };
        assert.deepEqual(tags(judge(elsewhere, report(fail("known")), report(fail("known")))), ["warn [UNRELATED]"]);
    });

    it("#3925: passes an untouched failure as [UNRELATED] with a summary line; never a touched, GPU or crashed one", () => {
        const dir = mkdtempSync(join(tmpdir(), "unrelated-"));
        const env = { GITHUB_STEP_SUMMARY: join(dir, "summary.md") };
        const plan = { quarantine: [], failingOnBase: [], affected: ["touched.test.ts"] };
        const run = (p, opts, first) => {
            const d = decide({ family: opts.family, first, firstOutcome: "failed", second: first, list: [] });
            return prJudge(p, { ...opts, env })(d, { firstOutcome: "failed" });
        };
        const both = report(fail("theirs"), fail("mine", "touched.test.ts"));
        const d = run(plan, o, both);
        assert.deepEqual(tags(d), ["warn [UNRELATED]", "fail [FAIL]"]);
        assert.equal(d.pass, false);
        assert.deepEqual(
            d.failing.map((f) => f.name),
            ["mine"],
        );
        assert.equal(run(plan, o, report(fail("theirs"))).pass, true);
        assert.match(readFileSync(env.GITHUB_STEP_SUMMARY, "utf8"), /^- \[UNRELATED\] .*a\.test\.ts > theirs/m);
        // a GPU family is never excused, touched or not
        const gpu = { ...o, family: "webgpu-graph-algorithms-node", shard: "webgpu-graph-algorithms-node" };
        assert.deepEqual(tags(run(plan, gpu, report(fail("theirs")))), ["fail [FAIL]"]);
        // a crash, an unhandled error or coverage is not a test failure: the judge leaves it failing
        const crashed = { pass: false, flaky: [], excused: [], failing: [fail("theirs")] };
        assert.equal(prJudge(plan, { ...o, env })(crashed, { firstOutcome: "error" }).pass, false);
        rmSync(dir, { recursive: true, force: true });
    });

    it("#3925: dispatches a base check once per base, file and variant the store has not seen", async () => {
        const check = { base: "abc1234", file: "a.test.ts", variant: o.variant, repeat: 1 };
        const seen = new Set();
        const claim = async (c) => {
            const k = `${c.base} ${c.file} ${c.variant}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        };
        const calls = [];
        const gh = (args) => calls.push(args.join(" "));
        assert.equal(await dispatchChecks([check], gh, { claim, pr: 42 }), 1);
        assert.equal(await dispatchChecks([check], gh, { claim, pr: 43 }), 0);
        assert.match(calls[0], / -f repeat=1 -f pr=42$/);
        // a store that cannot answer does not stop the check
        assert.equal(await dispatchChecks([{ ...check, base: "def5678" }], gh, { claim: async () => undefined }), 1);
    });

    it("lets the store's quarantine through", () => {
        const plan = { quarantine: [{ family: FAMILY, file: "a.test.ts", name: "q", issue: 9 }], failingOnBase: [] };
        const d = judge(plan, report(fail("q")), report(fail("q")));
        assert.deepEqual(
            [d.pass, d.lines[0].text],
            [true, "[QUARANTINED] graphty-element-browser-3: a.test.ts > q failed again; issue #9"],
        );
    });

    it("reads the quarantine and master evidence again on a re-run attempt, and keeps the plan when the store fails", async () => {
        const plan = { base: "b1", affected: ["x.test.ts"], quarantine: [], failingOnBase: [] };
        const s = await serve(() => ({
            quarantine: [{ family: FAMILY, file: "a.test.ts", name: "q" }],
            failingOnBase: [{ name: "k" }],
        }));
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const fresh = await refreshPlan(plan, { cfg, sha: "h1", family: FAMILY, variant: o.variant });
        assert.deepEqual(fresh.affected, ["x.test.ts"]);
        assert.equal(fresh.quarantine[0].name, "q");
        assert.equal(fresh.failingOnBase[0].name, "k");
        const q = new URL(s.seen.find((r) => r.url.startsWith("/v1/plan")).url, s.url).searchParams;
        assert.equal(q.get("base"), "b1");
        assert.equal(q.get("variants"), `${FAMILY}|flags=off|whole,${FAMILY}|flags=off|selected`);
        const down = config({ RESULTS_URL: "http://127.0.0.1:9", GRAPHTY_RESULTS_TOKEN: "t" });
        assert.equal(await refreshPlan(plan, { cfg: down, sha: "h1", family: FAMILY, variant: o.variant }), plan);
    });

    it("leaves a run that did not end in test failures alone", () => {
        const d = { pass: false, flaky: [], excused: [], failing: [fail("x")] };
        assert.equal(prJudge(null, o)(d, { firstOutcome: "error" }), d);
    });

    it("keeps repeated runs of one job apart", () => {
        assert.equal(baseId("s", { GITHUB_RUN_ID: "5", GITHUB_JOB: "check", RESULTS_REPEAT: "3" }), "5.1.check.s.r3");
        assert.equal(
            baseId("s", { GITHUB_RUN_ID: "5", GITHUB_JOB: "story-tests", RESULTS_PART: "2" }),
            "5.1.story-tests.s.p2",
        );
    });
});

describe("fileIssues", () => {
    const flaky = {
        family: "fam",
        file: "a.test.ts",
        name: "flips",
        signature: "sig1",
        proof: "r1 failed it, r2 passed it",
        had: null,
    };
    const rec = (outcome, failures) => ({ id: "5.1.j.s.1", sha: "b1", outcome, failures });
    const ghFake = (list = "") => {
        const calls = [];
        const gh = (args) => {
            calls.push(args);
            if (args[1] === "list") return list;
            return args[1] === "create" ? "https://github.com/o/r/issues/88\n" : "";
        };
        return { gh, calls };
    };

    it("files one priority:critical issue for a test the store quarantined and posts its number back", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const { gh, calls } = ghFake();
        const recs = [
            rec("failed", [{ file: "a.test.ts", name: "flips", message: "AssertionError: x" }]),
            rec("passed", []),
        ];
        const answers = [
            { ok: true, data: { kind: "full", flaky: [] } },
            { ok: true, data: { kind: "full", flaky: [flaky] } },
        ];
        const out = await fileIssues(cfg, recs, answers, [], gh, Date.UTC(2026, 9, 25));
        assert.deepEqual(
            out.map((i) => [i.number, i.kind]),
            [[88, "flaky"]],
        );
        const creates = calls.filter((c) => c[1] === "create");
        assert.equal(creates.length, 1);
        assert.ok(creates[0].includes("priority:critical"));
        const body = creates[0].at(-1);
        assert.match(body, /<!-- results kind=flaky signature=sig1 -->/);
        assert.match(body, /AssertionError: x/);
        assert.match(body, /on 2026-11-08/);
        const back = s.seen.find((r) => r.url === "/v1/issues");
        assert.deepEqual(back.body, {
            signature: "sig1",
            number: 88,
            kind: "flaky",
            family: "fam",
            file: "a.test.ts",
            name: "flips",
        });
    });

    it("ends the store's entries whose issue closed, never one it just reopened", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const calls = [];
        const gh = (args) => {
            calls.push(args);
            if (args[0] === "api")
                return JSON.stringify({ data: { repository: { i41: { state: "CLOSED" }, i42: { state: "OPEN" } } } });
            return "";
        };
        const answers = [{ ok: true, data: { kind: "full", flaky: [], tracked: [41, 42] } }];
        await fileIssues(cfg, [rec("passed", [])], answers, [], gh);
        assert.equal(calls.filter((c) => c[0] === "api").length, 1);
        assert.deepEqual(
            s.seen.filter((r) => r.url === "/v1/issues").map((r) => r.body),
            [{ number: 41, state: "closed" }],
        );
    });

    it("files one issue for a test both tries' answers name", async () => {
        const { gh, calls } = ghFake();
        const answers = [
            { ok: true, data: { kind: "full", flaky: [flaky] } },
            { ok: true, data: { kind: "full", flaky: [flaky] } },
        ];
        const out = await fileIssues(null, [rec("failed", []), rec("failed", [])], answers, [], gh);
        assert.equal(out.length, 1);
        assert.equal(calls.filter((c) => c[1] === "create").length, 1);
    });

    it("comments on the signature's earlier issue, found by the store or by its marker", async () => {
        const { gh, calls } = ghFake("41\tOPEN\tFlaky test quarantined: a.test.ts > flips\n");
        const answers = [
            { ok: true, data: { flaky: [flaky, { ...flaky, name: "other", signature: "sig2", had: 12 }] } },
        ];
        const out = await fileIssues(null, [rec("passed", [])], answers, [], gh);
        assert.deepEqual(
            out.map((i) => i.number),
            [41, 12],
        );
        assert.equal(calls.filter((c) => c[1] === "create").length, 0);
        assert.deepEqual(
            calls.filter((c) => c[1] === "comment").map((c) => c[2]),
            ["41", "12"],
        );
        // a closed earlier issue is reopened, so the new quarantine is tracked on an open one
        assert.deepEqual(
            calls.filter((c) => c[1] === "reopen").map((c) => c[2]),
            ["41", "12"],
        );
    });

    it("looks for an earlier issue by its own kind's marker", async () => {
        const { gh, calls } = ghFake();
        await fileIssues(null, [rec("passed", [])], [{ ok: true, data: { kind: "full", flaky: [flaky] } }], [], gh);
        const list = calls.find((c) => c[1] === "list");
        assert.match(list.at(-1), /results kind=flaky signature=sig1/);
    });

    it("never reopens an earlier issue from a base run, whose commit may predate the fix", async () => {
        const { gh: base, calls } = ghFake();
        const gh = (args) =>
            args[0] === "api" ? JSON.stringify({ data: { repository: { i12: { state: "OPEN" } } } }) : base(args);
        const answers = [{ ok: true, data: { kind: "base", flaky: [{ ...flaky, had: 12 }] } }];
        await fileIssues(null, [rec("passed", [])], answers, [], gh);
        assert.equal(calls.filter((c) => c[1] === "reopen").length, 0);
        assert.deepEqual(
            calls.filter((c) => c[1] === "comment").map((c) => c[2]),
            ["12"],
        );
    });

    it("files a new issue from a base run rather than track its quarantine on a closed earlier one", async () => {
        const s = await serve();
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const { gh: base, calls } = ghFake();
        const gh = (args) =>
            args[0] === "api" ? JSON.stringify({ data: { repository: { i12: { state: "CLOSED" } } } }) : base(args);
        const answers = [{ ok: true, data: { kind: "base", flaky: [{ ...flaky, had: 12 }] } }];
        const out = await fileIssues(cfg, [rec("passed", [])], answers, [], gh);
        assert.deepEqual(
            out.map((i) => i.number),
            [88],
        );
        assert.equal(calls.filter((c) => c[1] === "reopen" || c[1] === "comment").length, 0);
        assert.equal(calls.find((c) => c[1] === "list")[3], "open");
        assert.deepEqual(
            s.seen.filter((r) => r.url === "/v1/issues").map((r) => r.body.number),
            [88],
        );
    });

    it("does not reuse an earlier issue from a base run when GitHub cannot say whether it is open", async () => {
        const { gh: base, calls } = ghFake();
        const gh = (args) => {
            if (args[0] === "api") throw new Error("HTTP 502");
            return base(args);
        };
        const answers = [{ ok: true, data: { kind: "base", flaky: [{ ...flaky, had: 12 }] } }];
        const out = await fileIssues(null, [rec("passed", [])], answers, [], gh);
        assert.deepEqual(
            out.map((i) => i.number),
            [88],
        );
        assert.equal(calls.filter((c) => c[1] === "reopen" || c[1] === "comment").length, 0);
        assert.equal(calls.find((c) => c[1] === "list")[3], "open");
    });

    it("files Failing on master only for the file a base check was asked about", async () => {
        const { gh, calls } = ghFake();
        const failures = [
            { file: "a.test.ts", name: "one", message: "Error: broken 1" },
            { file: "b.test.ts", name: "other", message: "Error: unrelated" },
        ];
        const failing = failures.map(({ file, name }) => ({ file, name }));
        const answers = [{ ok: true, data: { kind: "base", flaky: [] } }];
        const out = await fileIssues(null, [rec("failed", failures)], answers, failing, gh, 0, { file: "a.test.ts" });
        assert.equal(out.length, 1);
        const titles = calls.filter((c) => c[1] === "create").map((c) => c[c.indexOf("--title") + 1]);
        assert.equal(titles.length, 1);
        assert.match(titles[0], /broken 1/);
    });

    it("knows a base run whose last answer was spooled, from its environment or any earlier answer", async () => {
        const failures = [{ file: "a.test.ts", name: "one", message: "Error: broken 1" }];
        const failing = [{ file: "a.test.ts", name: "one" }];
        const recs = [rec("failed", failures), rec("failed", failures)];
        for (const [answers, o] of [
            [[{ ok: true, data: { kind: "base", flaky: [{ ...flaky, had: 12 }] } }, { ok: false }], {}],
            [[{ ok: false }, { ok: false }], { base: true }],
        ]) {
            const { gh, calls } = ghFake();
            const all = [{ ok: true, data: { flaky: [{ ...flaky, had: 12 }] } }, ...answers];
            const out = await fileIssues(null, recs, o.base ? all : answers, failing, gh, 0, o);
            assert.equal(calls.filter((c) => c[1] === "reopen").length, 0);
            assert.ok(out.some((i) => i.kind === "failing-on-master"));
        }
    });

    it("files one Failing on master issue per signature a base run failed every time", async () => {
        const { gh, calls } = ghFake();
        const failures = [
            { file: "a.test.ts", name: "one", message: "Error: broken 1" },
            { file: "a.test.ts", name: "two", message: "Error: broken 2" },
            { file: "a.test.ts", name: "flaky", message: "Error: other" },
        ];
        const failing = [
            { file: "a.test.ts", name: "one" },
            { file: "a.test.ts", name: "two" },
        ];
        const answers = [{ ok: true, data: { kind: "base", flaky: [] } }];
        const out = await fileIssues(null, [rec("failed", failures)], answers, failing, gh);
        assert.deepEqual(
            out.map((i) => i.kind),
            ["failing-on-master"],
        );
        const create = calls.find((c) => c[1] === "create");
        assert.ok(create.includes("priority:high"));
        assert.match(create[create.indexOf("--title") + 1], /^Failing on master: Error: broken/);
        assert.equal(
            (await fileIssues(null, [rec("failed", failures)], [{ ok: true, data: { kind: "full" } }], failing, gh))
                .length,
            0,
        );
        // one repeat of several proves nothing alone
        assert.equal(
            (await fileIssues(null, [rec("failed", failures)], answers, failing, gh, 0, { onMaster: false })).length,
            0,
        );
    });
});

describe("cli", () => {
    const ledger = {
        v: 1,
        id: "1792586082000-impa5bd7c48-graphty-element-browser-2",
        kind: "import-land-check",
        branch: "fix/1-x",
        commit: "c".repeat(40),
        tree: "t".repeat(40),
        base: null,
        dirty: false,
        shard: "graphty-element-browser-2",
        family: "graphty-element-browser",
        selected: null,
        outcome: "failed",
        started_at: "2026-10-21T12:34:42.000Z",
        secs: 12.5,
        files: [["graphty-element/test/browser/a.test.ts", 19, 1, 0, 40, 0]],
        failures: [
            {
                file: "graphty-element/test/browser/a.test.ts",
                name: "n",
                line: "Error: x",
                status: "fail",
                message: "Error: x",
            },
        ],
    };

    it("turns a ledger record into a local record, its kind in the note", () => {
        const r = fromLedger(ledger);
        assert.equal(r.id, `local.ledger.${ledger.id}`);
        assert.equal(r.variant, "graphty-element-browser|flags=off|whole");
        assert.deepEqual(r.files, [["graphty-element/test/browser/a.test.ts", 19, 1, 0, 40]]);
        assert.equal(r.note, "ledger import-land-check on fix/1-x");
        assert.equal(r.startedAt, Date.parse("2026-10-21T12:34:42.000Z"));
        assert.equal(fromLedger({ ...ledger, outcome: "weird", selected: ["a"] }).outcome, "infra");
        assert.equal(fromLedger({ ...ledger, selected: ["a"] }).variant, "graphty-element-browser|flags=off|selected");
    });

    it("imports every record file, gzipped or not, and counts what the store had", async () => {
        const dir = join(TMP, "ledger");
        mkdirSync(join(dir, "2026-10-21"), { recursive: true });
        for (let i = 0; i < 20; i++) {
            const rec = JSON.stringify({ ...ledger, id: `r${i}` });
            const name = join(dir, "2026-10-21", `r${i}.json${i % 2 ? ".gz" : ""}`);
            writeFileSync(name, i % 2 ? gzipSync(rec) : rec);
        }
        writeFileSync(join(dir, "2026-10-21", "broken.json"), "{");
        const files = ledgerFiles(dir);
        assert.equal(files.length, 21);
        const posted = [];
        const post = async (cfg, rec) => {
            posted.push(rec.id);
            if (rec.id.endsWith("r3")) return { ok: false, why: "HTTP 500" };
            return { ok: true, data: { stored: !rec.id.endsWith("r4") } };
        };
        const r = await importLedger({}, files, post);
        assert.equal(posted.length, 20);
        assert.deepEqual([r.stored, r.had, r.failed.length], [18, 1, 2]);
    });

    it("runs the base check's file once per repeat, each its own record of the asked variant", async () => {
        const root = join(import.meta.dirname, "../..");
        const file = readdirSync(join(root, "layout/test")).find((n) => n.endsWith(".test.ts"));
        const runs = [];
        const run = async (shard, cmd, o) => {
            runs.push([shard, cmd, o.env.RESULTS_REPEAT, o.env.RESULTS_VARIANT, o.env.GRAPHTY_FLAGS]);
            return runs.length === 2 ? 1 : 0;
        };
        const variant = "layout|flags=off|selected";
        const code = await baseCheck({ root, variant, file: `layout/test/${file}`, repeat: 3, env: {}, run });
        assert.equal(code, 1);
        assert.deepEqual(
            runs.map((r) => r[2]),
            ["1", "2", "3"],
        );
        assert.ok(runs.every((r) => r[0] === "layout" && r[1].includes(file) && r[3] === variant && r[4] === "off"));
        assert.equal(await baseCheck({ root, variant: "nope|flags=off|whole", file: "x", env: {}, run }), 2);
    });

    it("builds the shard's package by the name nx lists it under", async () => {
        const root = join(import.meta.dirname, "../..");
        const built = [];
        const exec = (cmd, args) => built.push(args.at(-1));
        const run = async () => 0;
        for (const [variant, file] of [
            ["remote-logger|flags=off|whole", "remote-logger/test/x.test.ts"],
            ["layout|flags=off|whole", "layout/test/x.test.ts"],
        ])
            await baseCheck({ root, variant, file, env: {}, build: true, run, exec });
        assert.deepEqual(built, ["@graphty/remote-logger:build", "layout:build"]);
    });

    it("lets only the last repeat file Failing on master, and only when every repeat failed", async () => {
        const root = join(import.meta.dirname, "../..");
        const file = readdirSync(join(root, "layout/test")).find((n) => n.endsWith(".test.ts"));
        const marks = (codes) => {
            const seen = [];
            const run = async (shard, cmd, o) => {
                assert.equal(o.env.RESULTS_BASE_FILE, `layout/test/${file}`);
                seen.push(o.env.RESULTS_FILE_FAILING);
                return codes[seen.length - 1];
            };
            return { seen, run };
        };
        const check = (run, repeat) =>
            baseCheck({
                root,
                variant: "layout|flags=off|selected",
                file: `layout/test/${file}`,
                repeat,
                env: {},
                run,
            });
        const all = marks([1, 1, 1]);
        await check(all.run, 3);
        assert.deepEqual(all.seen, ["0", "0", "1"]);
        const mixed = marks([1, 0, 1]);
        await check(mixed.run, 3);
        assert.deepEqual(mixed.seen, ["0", "0", "0"]);
        const once = marks([1]);
        await check(once.run, 1);
        assert.deepEqual(once.seen, ["1"]);
    });
});

/**
 * A health API on a local server: answers tokens on /token, and `status` (or nothing, for null) on every POST.
 * @param [status] the POST's HTTP status; null never answers
 * @returns `{ url, seen, posted }`, `posted` resolving with the first POST
 */
function serveHealth(status = 200) {
    const seen = [];
    let arrived;
    const posted = new Promise((resolve) => (arrived = resolve));
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", () => {
            const r = { method: req.method, url: req.url, headers: req.headers, body: body ? JSON.parse(body) : null };
            seen.push(r);
            if (req.url.startsWith("/token")) {
                const payload = Buffer.from(JSON.stringify({ exp: Date.now() / 1000 + 600 })).toString("base64url");
                return res.end(JSON.stringify({ value: `health.${payload}.s` }));
            }
            arrived(r);
            if (status !== null) ((res.statusCode = status), res.end("{}"));
        });
    });
    servers.push(server);
    return new Promise((resolve) =>
        server.listen(0, "127.0.0.1", () =>
            resolve({ url: `http://127.0.0.1:${server.address().port}`, seen, posted }),
        ),
    );
}

const healthEnv = (store, health) => ({
    RESULTS_URL: store,
    GRAPHTY_RESULTS_TOKEN: "t",
    HEALTH_API_URL: `${health}/`,
    ACTIONS_ID_TOKEN_REQUEST_URL: `${health}/token?x=1`,
    ACTIONS_ID_TOKEN_REQUEST_TOKEN: "req",
});

describe("health API fan-out", () => {
    it("sends every POST to HEALTH_API_URL too, with its own graphty-health token", async () => {
        const s = await serve();
        const h = await serveHealth();
        const cfg = config(healthEnv(s.url, h.url));
        assert.equal(cfg.health, h.url);
        assert.deepEqual(await call(cfg, "POST", "/v1/failures", { invocation: "1.1.x" }), { ok: true, data: {} });
        const post = await h.posted;
        assert.match(h.seen[0].url, /^\/token\?x=1&audience=graphty-health$/);
        assert.equal(h.seen[0].headers.authorization, "Bearer req");
        assert.equal(post.url, "/v1/failures");
        assert.match(post.headers.authorization, /^Bearer health\./);
        assert.equal(post.headers["x-results-schema"], "1");
        assert.deepEqual(post.body, { invocation: "1.1.x" });
        assert.equal(s.seen[0].headers.authorization, "Bearer t");
    });
    it("sends a shard's flaky tests to the health API alone, as try 1's failures marked flaky", async () => {
        const h = await serveHealth();
        const env = { ...healthEnv("http://store", h.url), GITHUB_RUN_ID: "9", GITHUB_JOB: "test", GITHUB_SHA: "abc" };
        postFlaky(env, "x-2", "x", []);
        postFlaky({ ...env, HEALTH_API_URL: "" }, "x-2", "x", [{ file: "a.ts", name: "t" }]);
        postFlaky({ ...env, GRAPHTY_RESULTS: "0" }, "x-2", "x", [{ file: "a.ts", name: "t" }]);
        postFlaky(env, "x-2", "x", [
            { file: "a.ts", name: "t", text: "boom" },
            { file: "b.ts", name: "u" },
        ]);
        await flushHealth();
        const post = await h.posted;
        assert.equal(post.url, "/v1/failures");
        assert.deepEqual(post.body, {
            invocation: "9.1.test.x-2.1",
            flaky: true,
            family: "x",
            sha: "abc",
            failures: [
                { file: "a.ts", name: "t", message: "boom" },
                { file: "b.ts", name: "u", message: "" },
            ],
        });
        assert.equal(h.seen.filter((r) => r.url === "/v1/failures").length, 1);
    });
    it("sends a benchmark job's results to the health API as one post", async () => {
        const h = await serveHealth();
        const env = { ...healthEnv("http://store", h.url), GITHUB_SHA: "abc" };
        assert.equal(postBenchmarks(env, "algorithms", []), false);
        assert.equal(postBenchmarks({ ...env, HEALTH_API_URL: "" }, "algorithms", [{ name: "x", value: 1 }]), false);
        assert.equal(postBenchmarks(env, "algorithms", [{ name: "PageRank n=1000", value: 4.5 }]), true);
        await flushHealth();
        const post = await h.posted;
        assert.equal(post.url, "/v1/benchmarks");
        assert.deepEqual(post.body, {
            source: "algorithms",
            unit: "ms",
            sha: "abc",
            rows: [{ name: "PageRank n=1000", value: 4.5 }],
        });
    });
    it("reads the newest session of the algorithms and the harness result files", () => {
        // algorithms/benchmark-results/benchmark-sessions-linux-comprehensive.json
        const algorithms = [
            { timestamp: "old", results: [{ algorithm: "GRSBM", graphSize: 50, executionTime: 9 }] },
            {
                timestamp: "new",
                results: [
                    { algorithm: "GRSBM", graphSize: 50, edges: 98, executionTime: 4.18, memoryUsage: 0 },
                    { algorithm: "GRSBM", graphSize: 100, edges: 198, executionTime: 15.75, memoryUsage: 0 },
                ],
            },
        ];
        assert.deepEqual(benchmarkRows(algorithms), [
            { name: "GRSBM n=50", value: 4.18 },
            { name: "GRSBM n=100", value: 15.75 },
        ]);
        // webgpu-graph-algorithms/benchmarks/out/gpu-linux-t4.json (benchmarks/harness.ts)
        const harness = [
            {
                runnerClass: "gpu-linux-t4",
                results: [
                    { group: "upload", name: "residency.core 100k/1M", medianMs: 14.46, minMs: 14.17, runs: 5 },
                    { group: "upload", name: "no median", minMs: 1 },
                ],
            },
        ];
        assert.deepEqual(benchmarkRows(harness), [{ name: "upload / residency.core 100k/1M", value: 14.46 }]);
        assert.deepEqual(benchmarkRows([]), []);
    });
    it("is off without HEALTH_API_URL, and without an OIDC token to sign in with", async () => {
        const h = await serveHealth();
        const env = { RESULTS_URL: "http://store", ACTIONS_ID_TOKEN_REQUEST_URL: `${h.url}/token?x=1` };
        assert.equal("health" in config({ ...env, ACTIONS_ID_TOKEN_REQUEST_TOKEN: "r" }), false);
        assert.equal(
            "health" in config({ RESULTS_URL: "http://s", GRAPHTY_RESULTS_TOKEN: "t", HEALTH_API_URL: "http://h" }),
            false,
        );
    });
    it("leaves the result alone when the health API fails, never answers or is unreachable", async () => {
        const s = await serve();
        for (const h of [await serveHealth(500), await serveHealth(null)]) {
            const cfg = config(healthEnv(s.url, h.url));
            assert.deepEqual(await call(cfg, "POST", "/v1/verdicts", { sha: "a" }), { ok: true, data: {} });
            await h.posted;
        }
        const gone = config(healthEnv(s.url, "http://127.0.0.1:1"));
        assert.deepEqual(await call(gone, "POST", "/v1/sites", {}), { ok: true, data: {} });
        const spool = join(TMP, "health-spool");
        const silent = await serveHealth(null);
        const down = await serve(false);
        const r = await postInvocation(config(healthEnv(down.url, silent.url)), { id: "9.1.a" }, spool, 50);
        assert.deepEqual(readdirSync(spool), ["9.1.a.json"]);
        assert.equal(r.ok, false);
    });
    it("delivers before process.exit() with flushHealth(), and gives up after its own 2 s", async () => {
        const s = await serve();
        const client = new URL("./client.mjs", import.meta.url).href;
        // Counts the aborts of every timeout signal: the store's call answers, so only the health deadlines can fire.
        const child = (env, tail) =>
            new Promise((resolve, reject) => {
                const code = `let aborted = 0; const t = AbortSignal.timeout;
                    AbortSignal.timeout = (ms) => { const s = t(ms); s.addEventListener("abort", () => aborted++); return s; };
                    const { call, config, flushHealth } = await import(${JSON.stringify(client)});
                    const r = await call(config(), "POST", "/v1/failures", { n: 1 });
                    process.on("exit", () => console.log(JSON.stringify({ ok: r.ok, aborted })));
                    ${tail}`;
                execFile(
                    process.execPath,
                    ["--input-type=module", "-e", code],
                    { env: { PATH: process.env.PATH, ...env } },
                    (e, stdout) => (e ? reject(e) : resolve(JSON.parse(stdout))),
                );
            });
        const h = await serveHealth();
        assert.deepEqual(await child(healthEnv(s.url, h.url), "await flushHealth(); process.exit(0);"), {
            ok: true,
            aborted: 0,
        });
        assert.deepEqual(
            h.seen.filter((r) => r.method === "POST").map((r) => [r.url, r.body]),
            [["/v1/failures", { n: 1 }]],
        );
        const silent = await serveHealth(null);
        // the copy's own deadline and the shared token request's both fired: the process ended on them
        assert.deepEqual(await child(healthEnv(s.url, silent.url), ""), { ok: true, aborted: 2 });
        assert.equal((await silent.posted).url, "/v1/failures");
    });
    it("still sends a group's records to the health API when the store stops answering", async () => {
        const down = await serve(false);
        const h = await serveHealth();
        const spool = join(TMP, "health-group-spool");
        const recs = [{ id: "7.1.a" }, { id: "7.1.b" }];
        const out = await postRecords(config(healthEnv(down.url, h.url)), recs, spool, 50);
        assert.deepEqual(
            out.map((r) => r.ok),
            [false, false],
        );
        await flushHealth();
        assert.deepEqual(
            h.seen
                .filter((r) => r.method === "POST")
                .map((r) => r.body.id)
                .sort(),
            ["7.1.a", "7.1.b"],
        );
        assert.equal(h.seen.filter((r) => r.url.startsWith("/token")).length, 1, "the health token is reused");
    });
});
