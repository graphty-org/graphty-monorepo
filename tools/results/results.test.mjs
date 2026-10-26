// Tests of the results store's client, failure reporter and group runner (tools/results/): what they send,
// that they batch past the 20th failure, and that a store that never answers costs only its timeout and
// leaves the run's verdict alone, the record spooled.
//
//   node --test tools/results/results.test.mjs
import assert from "node:assert/strict";
import { execFile, execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it, mock } from "node:test";

import { isolateGit } from "../isolated-git-env.mjs";
import { call, config, EVENT_MS, flushHealth, postFailures, postInvocation, readPlan, RECORD_MS } from "./client.mjs";
import { envString, inputsKey } from "./inputs.mjs";
import ResultsReporter, { BATCH_MS, IMMEDIATE, invocationOf } from "./reporter.mjs";
import { durationsOf, planRead, variantsOf } from "./plan-read.mjs";
import { junitOf, postRecords, recordsOf, runGroup } from "./run-group.mjs";

isolateGit();
const TMP = mkdtempSync(join(tmpdir(), "results-"));
const servers = [];
after(() => {
    for (const s of servers) (s.closeAllConnections?.(), s.close());
    rmSync(TMP, { recursive: true, force: true });
});

/**
 * A local server that records every request.
 * @param [answer] false makes it read requests and never answer them
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
            } else res.end(req.url.startsWith("/v1/plan") ? JSON.stringify({ order: ["a"] }) : "{}");
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
        const r = await postInvocation(cfg, { id: "r1.1" }, join(TMP, "spool"), 300);
        assert.equal(r.ok, false);
        assert.equal(r.why, "no answer in 0.3 s");
        assert.deepEqual(JSON.parse(readFileSync(r.spooled, "utf8")), { id: "r1.1" });
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
    it("ends the run when the store never answers", async () => {
        const s = await serve(false);
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const r = new ResultsReporter({ env: { GRAPHTY_RESULTS_INVOCATION: "b" }, cfg });
        r.onTestCaseResult(testCase(1));
        await r.onTestRunEnd();
        assert.equal(s.seen.length, 1);
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

describe("postRecords", () => {
    it("asks a store that never answers once and spools every record", async () => {
        const s = await serve(false);
        const cfg = config({ RESULTS_URL: s.url, GRAPHTY_RESULTS_TOKEN: "t" });
        const spool = join(TMP, "spool-2");
        const rs = await postRecords(cfg, [{ id: "g.1" }, { id: "g.2" }], spool, 300);
        assert.equal(s.seen.length, 1);
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
