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
import { call, config, EVENT_MS, flushHealth, postFailures, postInvocation, readPlan, RECORD_MS } from "./client.mjs";
import { envString, inputsKey } from "./inputs.mjs";
import ResultsReporter, { BATCH_MS, IMMEDIATE, invocationOf } from "./reporter.mjs";
import { failureHashes } from "../test-ledger.mjs";
import { baseCheck, fromLedger, importLedger, ledgerFiles } from "./cli.mjs";
import { decide } from "../test-quarantine.mjs";
import { durationsOf, planRead, variantsOf } from "./plan-read.mjs";
import {
    baseId,
    fileIssues,
    junitOf,
    postRecords,
    prJudge,
    recordsOf,
    refreshPlan,
    runGroup,
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
            } else if (req.url.startsWith("/v1/plan"))
                res.end(JSON.stringify(typeof answer === "function" ? answer(req) : { order: ["a"] }));
            else res.end("{}");
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

    it("excuses a failure only when master failed it the same way on the base, and says [KNOWN?] otherwise", () => {
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
        assert.deepEqual(tags(d), ["warn [KNOWN]", "fail [KNOWN?]"]);
        assert.match(d.lines[0].text, /fails the same way on master b1, issue #31/);
        assert.match(d.lines[1].text, /-f repeat=1/);
        assert.equal(judge(plan, report(fail("known")), report(fail("known"))).pass, true);
        // nor does one with other flags
        const flagsOn = { ...plan, failingOnBase: [{ ...row, variant: `${FAMILY}|flags=on|whole` }] };
        assert.equal(judge(flagsOn, report(fail("known")), report(fail("known"))).pass, false);
        // another family's base failure excuses nothing
        const elsewhere = { ...plan, failingOnBase: [{ ...row, variant: "layout|flags=off|whole" }] };
        assert.equal(judge(elsewhere, report(fail("known")), report(fail("known"))).pass, false);
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
