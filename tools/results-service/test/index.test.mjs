// Tests of the results Worker: the real migration on node:sqlite (d1-shim.mjs), OIDC tokens signed with a
// generated key, and a stubbed fetch for GitHub's key set.
//
//   node tools/results-service/test/index.test.mjs
//
// Not `node --test` in a package.json script, for the reason tools/release-scheduler/test/index.test.mjs gives.
import assert from "node:assert/strict";
import { createHash, createSign, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { failureHashes as ledgerHashes } from "../../test-ledger.mjs";
import { failureHashes } from "../src/signature.js";
import { AUDIENCE, handle } from "../src/service.js";
import { d1 } from "./d1-shim.mjs";

const NOW = Date.UTC(2026, 9, 24, 12);
const REPO = "graphty-org/graphty-monorepo";
const LOCAL_TOKEN = "local-test-token-0123456789";
const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwks = { keys: [{ ...publicKey.export({ format: "jwk" }), kid: "test-kid", alg: "RS256", use: "sig" }] };
let keyFetches = 0;
const fetch = async (url) => {
    assert.equal(url, "https://token.actions.githubusercontent.com/.well-known/jwks");
    keyFetches++;
    return Response.json(jwks);
};

const b64 = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
function oidc(claims = {}, { key = privateKey, kid = "test-kid" } = {}) {
    const payload = {
        iss: "https://token.actions.githubusercontent.com",
        aud: AUDIENCE,
        exp: NOW / 1000 + 300,
        nbf: NOW / 1000 - 10,
        repository: REPO,
        repository_id: "1122477634",
        run_id: "4010",
        run_attempt: "1",
        ...claims,
    };
    const input = `${b64({ alg: "RS256", typ: "JWT", kid })}.${b64(payload)}`;
    return `${input}.${createSign("RSA-SHA256").update(input).sign(key).toString("base64url")}`;
}
// A token from master's own copy of `file`, or from a pull request's merge commit.
const master = (file) =>
    oidc({
        event_name: "workflow_dispatch",
        ref: "refs/heads/master",
        job_workflow_ref: `${REPO}/.github/workflows/${file}@refs/heads/master`,
    });
const pr = () =>
    oidc({
        event_name: "pull_request",
        ref: "refs/pull/7/merge",
        sha: "merge7",
        job_workflow_ref: `${REPO}/.github/workflows/ci.yml@refs/pull/7/merge`,
    });

function service() {
    const DB = d1();
    const env = {
        DB,
        REPOSITORY_ID: "1122477634",
        DEPLOY_REPOSITORY_IDS: "1429353022",
        LOCAL_TOKEN_HASHES: `0000,${createHash("sha256").update(LOCAL_TOKEN).digest("hex")}`,
    };
    const call = async (method, path, { token, body } = {}) => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const request = new Request(`https://graphty-results.test${path}`, {
            method,
            headers,
            body: body && JSON.stringify(body),
        });
        const res = await handle(request, env, { fetch, now: NOW });
        return { status: res.status, body: await res.json() };
    };
    const rows = (sql) =>
        DB.sqlite
            .prepare(sql)
            .all()
            .map((r) => ({ ...r }));
    return { call, rows, env };
}
const record = (overrides = {}) => ({
    id: "4010.1.graphty-element-browser-3.0.1",
    sha: "merge7",
    tree: "tree7",
    variant: "graphty-element-browser|flags=off|whole",
    inputs: "9f2c",
    env: "ubuntu24/20261019.1|node22.23.2",
    try: 1,
    outcome: "failed",
    startedAt: NOW - 600_000,
    secs: 612.4,
    files: [["graphty-element/test/browser/x.test.ts", 41, 1, 0, 3120]],
    failures: [
        {
            file: "graphty-element/test/browser/x.test.ts",
            name: "camera > zooms",
            message: "AssertionError: expected 2 to be 3",
        },
    ],
    ...overrides,
});

describe("GET /v1/health", () => {
    it("answers with no credential", async () => {
        const { call } = service();
        assert.deepEqual(await call("GET", "/v1/health"), { status: 200, body: { ok: true, schema: 1 } });
    });
    it("answers 500 when the database does not", async () => {
        const { env } = service();
        env.DB = { prepare: () => ({ first: async () => Promise.reject(new Error("D1 down")) }) };
        const res = await handle(new Request("https://graphty-results.test/v1/health"), env, { fetch, now: NOW });
        assert.equal(res.status, 500);
    });
});

describe("POST /v1/invocations", () => {
    it("stores a pull request's record as kind pr, with its files and hashed failures, once", async () => {
        const { call, rows } = service();
        assert.deepEqual(await call("POST", "/v1/invocations", { token: pr(), body: record() }), {
            status: 200,
            body: { stored: true, kind: "pr" },
        });
        const [inv] = rows("SELECT * FROM invocation");
        assert.equal(inv.kind, "pr");
        assert.equal(inv.ref, "refs/pull/7/merge");
        assert.deepEqual(rows("SELECT file, passed, failed, skipped, ms FROM file_run"), [
            { file: "graphty-element/test/browser/x.test.ts", passed: 41, failed: 1, skipped: 0, ms: 3120 },
        ]);
        const [failure] = rows("SELECT * FROM failure");
        const expected = failureHashes("AssertionError: expected 2 to be 3", "graphty-element/test/browser/x.test.ts");
        assert.deepEqual(
            [failure.key, failure.signature, failure.status, failure.first_line],
            [expected.key, expected.signature, "fail", expected.line],
        );
        const again = await call("POST", "/v1/invocations", { token: pr(), body: record() });
        assert.deepEqual(again.body, { stored: false, kind: "pr" });
        assert.equal(rows("SELECT * FROM invocation").length, 1);
    });

    it("takes every kind from the workflow on master, never from the body", async () => {
        const { call, rows } = service();
        for (const [file, kind, n] of [
            ["release.yml", "full", 1],
            ["ci.yml", "full", 2],
            ["bisect.yml", "bisect", 3],
            ["base-check.yml", "base", 4],
            ["restricted-cpu-stress.yml", "stress", 5],
            ["gpu.yml", "full", 6],
            ["hosts.yml", "full", 7],
            ["work-protection-macos.yml", "full", 8],
        ]) {
            const res = await call("POST", "/v1/invocations", {
                token: master(file),
                body: record({ id: `4010.1.job.g.${n}`, kind: "local" }),
            });
            assert.deepEqual(res.body, { stored: true, kind }, file);
        }
        assert.equal(rows("SELECT * FROM invocation").length, 8);
    });

    it("refuses a full record from a branch ref, and from a branch's copy of a master workflow", async () => {
        const { call, rows } = service();
        const branch = oidc({
            event_name: "workflow_dispatch",
            ref: "refs/heads/feature",
            job_workflow_ref: `${REPO}/.github/workflows/ci.yml@refs/heads/feature`,
        });
        const copy = oidc({
            event_name: "workflow_dispatch",
            ref: "refs/heads/master",
            job_workflow_ref: `${REPO}/.github/workflows/ci.yml@refs/heads/feature`,
        });
        const other = oidc({
            event_name: "workflow_dispatch",
            ref: "refs/heads/master",
            job_workflow_ref: `${REPO}/.github/workflows/links-weekly.yml@refs/heads/master`,
        });
        for (const token of [branch, copy, other]) {
            const res = await call("POST", "/v1/invocations", { token, body: record() });
            assert.equal(res.status, 403);
            assert.match(res.body.error, /only pull requests and master's own/);
        }
        assert.equal(rows("SELECT * FROM invocation").length, 0);
    });

    it("refuses a pull request's record of another commit, another run's id and another repository", async () => {
        const { call } = service();
        assert.equal(
            (await call("POST", "/v1/invocations", { token: pr(), body: record({ sha: "master-tip" }) })).status,
            403,
        );
        assert.equal(
            (await call("POST", "/v1/invocations", { token: pr(), body: record({ id: "999.1.job.g.1" }) })).status,
            403,
        );
        const stranger = oidc({
            repository: "someone/fork",
            repository_id: "42",
            event_name: "pull_request",
            sha: "merge7",
        });
        assert.match(
            (await call("POST", "/v1/invocations", { token: stranger, body: record() })).body.error,
            /someone\/fork may not write/,
        );
    });

    it("refuses a bad signature, another audience, an expired token and no credential", async () => {
        const { call } = service();
        const { privateKey: wrongKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
        for (const token of [
            oidc({}, { key: wrongKey }),
            oidc({ aud: "sts.amazonaws.com" }),
            oidc({ exp: NOW / 1000 - 1 }),
            oidc({}, { kid: "nope" }),
            undefined,
            "wrong-local",
            "not.a.jwt",
            `${b64({ alg: "RS256", kid: "test-kid" })}.${b64(null)}.c2ln`,
            `${b64({ alg: "RS256", kid: "test-kid" })}.${b64({})}.!!`,
        ]) {
            assert.equal((await call("POST", "/v1/invocations", { token, body: record() })).status, 401);
        }
    });

    it("stores a local token's record as kind local, only under a local id", async () => {
        const { call } = service();
        assert.deepEqual(
            (
                await call("POST", "/v1/invocations", {
                    token: LOCAL_TOKEN,
                    body: record({ id: "local.1.host.2.layout" }),
                })
            ).body,
            { stored: true, kind: "local" },
        );
        assert.equal((await call("POST", "/v1/invocations", { token: LOCAL_TOKEN, body: record() })).status, 403);
    });

    it("writes a 3,000-file record within D1's 100 parameters a statement", async () => {
        const { call, rows } = service();
        const files = Array.from({ length: 3000 }, (_, i) => [`p/f${i}.test.ts`, 1, 0, 0, i]);
        assert.equal(
            (await call("POST", "/v1/invocations", { token: master("ci.yml"), body: record({ files }) })).status,
            200,
        );
        assert.equal(rows("SELECT count(*) AS n FROM file_run")[0].n, 3000);
    });

    it("refuses a malformed record with 400", async () => {
        const { call } = service();
        assert.equal(
            (await call("POST", "/v1/invocations", { token: pr(), body: record({ outcome: "green" }) })).status,
            400,
        );
        assert.equal(
            (await call("POST", "/v1/invocations", { token: pr(), body: record({ secs: "long" }) })).status,
            400,
        );
        assert.equal(
            (await call("POST", "/v1/invocations", { token: pr(), body: record({ files: [["a"]] }) })).status,
            400,
        );
    });
});

describe("POST /v1/failures", () => {
    it("stores one failure event or a batch, under the token's own run", async () => {
        const { call, rows } = service();
        const one = {
            invocation: "4010.1.job.g.1",
            file: "a.test.ts",
            name: "a",
            status: "fail",
            message: "Error: one",
        };
        assert.deepEqual((await call("POST", "/v1/failures", { token: pr(), body: one })).body, { stored: 1 });
        const batch = {
            invocation: "4010.1.job.g.1",
            failures: [
                { file: "b.test.ts", name: "b", message: "TimeoutError: waited" },
                { file: "c.test.ts", name: "c", message: "Error: c" },
            ],
        };
        assert.deepEqual((await call("POST", "/v1/failures", { token: pr(), body: batch })).body, { stored: 2 });
        assert.deepEqual(rows("SELECT name, status FROM failure ORDER BY name"), [
            { name: "a", status: "fail" },
            { name: "b", status: "timeout" },
            { name: "c", status: "fail" },
        ]);
        assert.equal(
            (await call("POST", "/v1/failures", { token: pr(), body: { ...one, invocation: "1.1.job.g.1" } })).status,
            403,
        );
    });

    it("refuses a failures field that is not a list with 400, and stores nothing for an empty one", async () => {
        const { call } = service();
        const body = { invocation: "4010.1.job.g.1", failures: "boom" };
        assert.equal((await call("POST", "/v1/failures", { token: pr(), body })).status, 400);
        assert.deepEqual((await call("POST", "/v1/failures", { token: pr(), body: { ...body, failures: [] } })).body, {
            stored: 0,
        });
        const bad = { ...body, failures: [{ file: "a", name: "a", message: "m" }], root: 7 };
        assert.equal((await call("POST", "/v1/failures", { token: pr(), body: bad })).status, 400);
    });
});

describe("POST /v1/durations", () => {
    it("stores a run's own durations with the credential's kind, a site repository's as deploy", async () => {
        const { call, rows } = service();
        const row = {
            runId: 4010,
            attempt: 1,
            workflow: "ci.yml",
            job: "Build",
            step: "nx",
            ms: 61000,
            conclusion: "success",
        };
        assert.deepEqual(
            (await call("POST", "/v1/durations", { token: master("ci.yml"), body: { rows: [row] } })).body,
            { stored: 1, kind: "full", trend: [] },
        );
        const site = oidc({
            repository: "graphty-org/graphty-site",
            repository_id: "1429353022",
            run_id: "77",
            job_workflow_ref: "graphty-org/graphty-site/.github/workflows/deploy.yml@refs/heads/main",
        });
        const deploy = {
            runId: 77,
            attempt: 1,
            workflow: "deploy.yml",
            job: "deploy",
            ms: 9000,
            conclusion: "success",
        };
        assert.deepEqual((await call("POST", "/v1/durations", { token: site, body: { rows: [deploy] } })).body, {
            stored: 1,
            kind: "deploy",
            trend: [],
        });
        assert.deepEqual(
            rows("SELECT kind FROM duration ORDER BY kind").map((r) => r.kind),
            ["deploy", "full"],
        );
        assert.equal(
            (await call("POST", "/v1/durations", { token: master("ci.yml"), body: { rows: [{ ...row, runId: 1 }] } }))
                .status,
            403,
        );
        assert.equal(
            (await call("POST", "/v1/invocations", { token: site, body: record({ id: "77.1.j.g.1" }) })).status,
            403,
        );
        assert.equal((await call("POST", "/v1/durations", { token: LOCAL_TOKEN, body: { rows: [] } })).status, 403);
    });
});

// ---------- the read side, against seeded records ----------

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const BROWSER = "graphty-element-browser|flags=off|whole";
const X = "graphty-element/test/browser/x.test.ts";
function seed(env) {
    const run = (sql, ...args) => env.DB.sqlite.prepare(sql).run(...args);
    return {
        inv: (
            id,
            { kind = "full", sha = "s1", variant = BROWSER, inputs = "k1", outcome = "passed", at = NOW - HOUR } = {},
        ) =>
            run(
                `INSERT INTO invocation (id, kind, sha, tree, variant, inputs, env, try, outcome, started_at, secs)
                 VALUES (?, ?, ?, 't', ?, ?, 'e', 1, ?, ?, 1)`,
                id,
                kind,
                sha,
                variant,
                inputs,
                outcome,
                at,
            ),
        file: (inv, file = X, ms = 100) => run("INSERT INTO file_run VALUES (?, ?, 1, 0, 0, ?)", inv, file, ms),
        fail: (inv, { file = X, name = "camera > zooms", key = "k", signature = "sig" } = {}) =>
            run("INSERT INTO failure VALUES (?, ?, ?, 'fail', ?, ?, '', '', ?)", inv, file, name, signature, key, NOW),
        quarantine: (family, name, { since = NOW - DAY, expires = NOW + DAY, left = null, issue = 9 } = {}) =>
            run(
                "INSERT INTO quarantine (family, file, name, issue, since, expires, left_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                family,
                X,
                name,
                issue,
                since,
                expires,
                left,
            ),
        site: (sha, at) => run("INSERT INTO site (sha, built_at) VALUES (?, ?)", sha, at),
        verdict: (sha, state, at, extra = {}) =>
            run(
                "INSERT INTO verdict (run_id, attempt, sha, state, lane, issue, at) VALUES (?, 1, ?, ?, ?, ?, ?)",
                at,
                sha,
                state,
                extra.lane ?? null,
                extra.issue ?? null,
                at,
            ),
        nightly: (sha, at) => run("INSERT INTO channel_move (channel, sha, at) VALUES ('nightly', ?, ?)", sha, at),
        duration: (runId, ms, at, kind = "full", job = "Build") =>
            run(
                "INSERT INTO duration (run_id, attempt, workflow, job, sha, kind, started_at, ms, conclusion) VALUES (?, 1, 'ci.yml', ?, ?, ?, ?, ?, 'success')",
                runId,
                job,
                `sha${runId}`,
                kind,
                at,
                ms,
            ),
    };
}
const plan = (call, query, token = master("ci.yml")) =>
    call("GET", `/v1/plan?${new URLSearchParams(query)}`, { token });

describe("GET /v1/plan", () => {
    it("needs a credential and pairwise variants and inputs", async () => {
        const { call } = service();
        assert.equal((await call("GET", "/v1/plan")).status, 401);
        assert.equal((await plan(call, { variants: `${BROWSER},b`, inputs: "k1" })).status, 400);
    });

    it("computes the quarantine when it is read", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.quarantine("graphty-element-browser", "active", { since: NOW - 10 * 60_000 });
        s.quarantine("graphty-element-browser", "expired", { expires: NOW - 1 });
        s.quarantine("graphty-element-browser", "left", { left: NOW - HOUR });
        s.quarantine("webgpu-graph-algorithms-browser", "gpu");
        s.quarantine("graphty-element-browser", "passed20");
        s.quarantine("graphty-element-browser", "prOnly");
        // passed20 has 21 passing master runs of its file since it entered, so it has left; active entered
        // after all but one; prOnly failed on master in the last one, and pull request passes never count
        s.inv("old", { at: NOW - 20 * HOUR - 1, outcome: "failed" });
        s.fail("old", { name: "prOnly" });
        for (let i = 0; i < 20; i++) {
            s.inv(`m${i}`, { at: NOW - 20 * HOUR + i * 60_000 });
            s.file(`m${i}`);
        }
        s.inv("late", { at: NOW - 60_000, outcome: "failed" });
        s.file("late");
        s.fail("late", { name: "prOnly" });
        for (let i = 0; i < 25; i++) {
            s.inv(`p${i}`, { kind: "pr", at: NOW - 30_000 + i });
            s.file(`p${i}`);
        }
        const res = await plan(call, {
            variants: `${BROWSER},webgpu-graph-algorithms-browser|flags=off|whole`,
            inputs: "k1,k2",
        });
        assert.equal(res.status, 200);
        assert.deepEqual(
            res.body.quarantine.map((q) => [q.name, q.issue, q.passes]),
            [
                ["active", 9, 1],
                ["prOnly", 9, 0],
            ],
        );
    });

    it("excuses only failures master's own runs saw on the base or on the same inputs", async () => {
        const { call, env } = service();
        const s = seed(env);
        env.DB.sqlite.prepare("INSERT INTO tracked_issue VALUES ('sig', 'failing-on-master', 31, 'open', 0, 0)").run();
        s.inv("onBase", { sha: "base1", inputs: "other", outcome: "failed" });
        s.fail("onBase");
        s.inv("prOnBase", { kind: "pr", sha: "base1", outcome: "failed" });
        s.fail("prOnBase", { name: "pr says so" });
        s.inv("sameInputs", { kind: "bisect", sha: "later", outcome: "failed" });
        s.fail("sameInputs", { name: "same inputs", signature: "s2" });
        s.inv("elsewhere", { sha: "later", inputs: "k9", outcome: "failed" });
        s.fail("elsewhere", { name: "other inputs" });
        s.inv("otherVariant", { sha: "base1", variant: "graphty-element-browser|flags=on|whole", outcome: "failed" });
        s.fail("otherVariant", { name: "flags on only" });
        s.inv("changedFile", { sha: "base1", outcome: "failed" });
        s.fail("changedFile", { file: "a/changed.test.ts", name: "changed" });
        s.fail("diedBeforeItsRecord", { name: "infra" });
        const res = await plan(call, { base: "base1", variants: BROWSER, inputs: "k1", files: "a/changed.test.ts" });
        assert.deepEqual(res.body.failingOnBase.map((f) => [f.name, f.invocation, f.issue]).sort(), [
            ["camera > zooms", "onBase", 31],
            ["same inputs", "sameInputs", null],
        ]);
    });

    it("answers reuse, recent failures first and per-file durations per variant", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.inv("local", { kind: "local", inputs: "k1" });
        assert.equal(
            (await plan(call, { variants: BROWSER, inputs: "k1" })).body.variants[BROWSER].passedWithInputs,
            null,
        );
        s.inv("reuse", { kind: "pr", inputs: "k1" });
        for (let i = 0; i < 11; i++) {
            s.inv(`r${i}`, { inputs: "kx", at: NOW - DAY + i });
            s.file(`r${i}`, X, i < 2 ? 100_000 : 100 + i); // the two oldest are past the last 9
        }
        s.inv("f1", { outcome: "failed", at: NOW - 2 * DAY });
        s.fail("f1", { file: "a.test.ts" });
        s.inv("f2", { outcome: "failed", at: NOW - HOUR });
        s.fail("f2", { file: "b.test.ts" });
        s.inv("f3", { outcome: "failed", at: NOW - 8 * DAY });
        s.fail("f3", { file: "too-old.test.ts" });
        const v = (await plan(call, { variants: BROWSER, inputs: "k1" })).body.variants[BROWSER];
        assert.equal(v.passedWithInputs, "reuse");
        assert.deepEqual(v.order, ["b.test.ts", "a.test.ts"]);
        assert.deepEqual(v.fileMs, { [X]: 106 });
        // files and no variants (test-changed.mjs's ranking): the same facts over every variant, for those files
        const flat = (await plan(call, { files: `${X},a.test.ts,b.test.ts,too-old.test.ts` })).body;
        assert.deepEqual(flat.order, ["b.test.ts", "a.test.ts"]);
        assert.deepEqual(flat.fileMs, { [X]: 106 });
        assert.equal((await plan(call, { variants: BROWSER, inputs: "k1" })).body.order, undefined);
    });
});

describe("POST /v1/sites", () => {
    const SHA = "a".repeat(40);
    const deployPages = (claims = {}) =>
        oidc({
            event_name: "workflow_run",
            ref: "refs/heads/master",
            job_workflow_ref: `${REPO}/.github/workflows/deploy-pages.yml@refs/heads/master`,
            ...claims,
        });

    it("records master's deploy-pages.yml site once, and the candidate pick lists it", async () => {
        const { call, rows } = service();
        assert.deepEqual(await call("POST", "/v1/sites", { token: deployPages(), body: { sha: SHA } }), {
            status: 200,
            body: { stored: true, sha: SHA },
        });
        const again = await call("POST", "/v1/sites", { token: deployPages(), body: { sha: SHA } });
        assert.deepEqual(again.body, { stored: false, sha: SHA });
        assert.deepEqual(rows("SELECT sha, built_at, run_id FROM site"), [{ sha: SHA, built_at: NOW, run_id: 4010 }]);
        assert.deepEqual((await call("GET", "/v1/candidate", { token: LOCAL_TOKEN })).body.candidate, {
            sha: SHA,
            builtAt: NOW,
        });
    });

    it("refuses every other writer, a short sha, and test records from deploy-pages.yml", async () => {
        const { call, rows } = service();
        const branch = deployPages({
            ref: "refs/heads/x",
            job_workflow_ref: `${REPO}/.github/workflows/deploy-pages.yml@refs/heads/x`,
        });
        const siteRepo = oidc({ repository: "graphty-org/graphty-site", repository_id: "1429353022" });
        for (const token of [branch, master("ci.yml"), pr(), siteRepo, LOCAL_TOKEN]) {
            assert.equal((await call("POST", "/v1/sites", { token, body: { sha: SHA } })).status, 403);
        }
        assert.equal((await call("POST", "/v1/sites", { token: deployPages(), body: { sha: "abc" } })).status, 400);
        const id = "4010.1.site.0.1";
        assert.equal(
            (await call("POST", "/v1/invocations", { token: deployPages(), body: record({ id }) })).status,
            403,
        );
        assert.deepEqual(rows("SELECT * FROM site"), []);
    });
});

describe("GET /v1/candidate", () => {
    it("picks master's newest commit with a site and says whether it is judged", async () => {
        const { call, env } = service();
        const s = seed(env);
        assert.deepEqual((await call("GET", "/v1/candidate", { token: LOCAL_TOKEN })).body, {
            candidate: null,
            judged: null,
            recent: [],
            sites: [],
        });
        s.site("c1", NOW - 2 * HOUR);
        s.site("c2", NOW - HOUR);
        assert.deepEqual((await call("GET", "/v1/candidate", { token: LOCAL_TOKEN })).body, {
            candidate: { sha: "c2", builtAt: NOW - HOUR },
            judged: null,
            recent: [],
            sites: ["c2", "c1"],
        });
        s.verdict("c1", "red", NOW - 40 * DAY);
        s.verdict("c1", "green-images", NOW - 20);
        s.verdict("c2", "green-clean", NOW - 10);
        const { judged, recent } = (await call("GET", "/v1/candidate", { token: LOCAL_TOKEN })).body;
        assert.deepEqual([judged.sha, judged.state], ["c2", "green-clean"]);
        assert.deepEqual(
            recent.map((v) => [v.sha, v.state]),
            [
                ["c2", "green-clean"],
                ["c1", "green-images"],
            ],
            "each commit's latest verdict of the last 30 days, newest first",
        );
    });
});

describe("POST /v1/verdicts", () => {
    it("takes a verdict only from master's release.yml, under its own run", async () => {
        const { call, env } = service();
        const body = { sha: "c9", state: "red", lane: "ci", issue: 12 };
        const post = (token, b = body) => call("POST", "/v1/verdicts", { token, body: b });
        assert.deepEqual((await post(master("release.yml"))).body, { stored: true });
        assert.deepEqual((await post(master("release.yml"))).body, { stored: false }, "a repeated post stores nothing");
        for (const token of [master("ci.yml"), master("bisect.yml"), pr(), LOCAL_TOKEN]) {
            assert.equal((await post(token)).status, 403);
        }
        assert.equal((await post(master("release.yml"), { ...body, state: "approved" })).status, 400);
        assert.equal((await post(master("release.yml"), { ...body, issue: "12" })).status, 400);
        const [v] = env.DB.sqlite.prepare("SELECT run_id, attempt, sha, state, lane, issue FROM verdict").all();
        assert.deepEqual({ ...v }, { run_id: 4010, attempt: 1, sha: "c9", state: "red", lane: "ci", issue: 12 });
        const { judged } = (await call("GET", "/v1/candidate", { token: LOCAL_TOKEN })).body;
        assert.equal(judged, null, "a verdict without a site is no candidate");
    });
});

describe("POST /v1/channel-moves", () => {
    const C = "c".repeat(40);
    const V = "d".repeat(40);
    const body = {
        channel: "nightly",
        sha: C,
        versionCommit: V,
        siteSha256: "1".repeat(64),
        channelSha256: "2".repeat(64),
    };
    it("records master's release.yml nightly promotion once a run, and nightly's age restarts from it", async () => {
        const { call, env, rows } = service();
        const s = seed(env);
        s.site(C, NOW - 30 * HOUR);
        const post = (token, b = body) => call("POST", "/v1/channel-moves", { token, body: b });
        assert.deepEqual((await post(master("release.yml"))).body, { stored: true });
        // a re-run of the site job re-packs channel.json: its new hash replaces the run's row
        assert.deepEqual(
            (await post(master("release.yml"), { ...body, channelSha256: "3".repeat(64) })).body,
            { stored: true, replaced: true },
            "a re-run of the job replaces that run's row",
        );
        assert.deepEqual(
            rows("SELECT channel, sha, at, version_commit, site_sha256, channel_sha256, run_id FROM channel_move"),
            [
                {
                    channel: "nightly",
                    sha: C,
                    at: NOW,
                    version_commit: V,
                    site_sha256: "1".repeat(64),
                    channel_sha256: "3".repeat(64),
                    run_id: 4010,
                },
            ],
        );
        const st = (await call("GET", "/v1/release-state", { token: LOCAL_TOKEN })).body;
        assert.deepEqual([st.nightly.sha, st.ageNightlyMs, st.blocking], [C, 0, null]);
    });
    it("refuses every other writer and a malformed record", async () => {
        const { call, rows } = service();
        const post = (token, b = body) => call("POST", "/v1/channel-moves", { token, body: b });
        for (const token of [master("ci.yml"), master("bisect.yml"), pr(), LOCAL_TOKEN]) {
            assert.equal((await post(token)).status, 403);
        }
        for (const bad of [
            { channel: "production" },
            { sha: "abc" },
            { versionCommit: "v" },
            { siteSha256: "x" },
            { channelSha256: undefined },
        ]) {
            assert.equal((await post(master("release.yml"), { ...body, ...bad })).status, 400, JSON.stringify(bad));
        }
        assert.deepEqual(rows("SELECT * FROM channel_move"), []);
    });
});

describe("GET /v1/failures", () => {
    it("lists a run's failing tests by shard, and those master saw fail before the good commit", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("good", NOW - 10 * HOUR);
        s.inv("3001.1.test.graphty-element-browser-2.1", { at: NOW - HOUR, outcome: "failed" });
        s.inv("3001.1.test.graphty-element-browser-2.2", { at: NOW - HOUR, outcome: "failed" });
        s.fail("3001.1.test.graphty-element-browser-2.1", { name: "old > flake" });
        s.fail("3001.1.test.graphty-element-browser-2.2", { name: "old > flake" });
        s.fail("3001.1.test.graphty-element-browser-2.1", { name: "new > break" });
        s.inv("30011.1.test.layout.1", { at: NOW - HOUR, outcome: "failed" });
        s.fail("30011.1.test.layout.1", { file: "layout/x.test.ts", name: "another run" });
        s.inv("2000.1.test.graphty-element-browser-2.1", { at: NOW - 20 * HOUR, outcome: "failed" });
        s.fail("2000.1.test.graphty-element-browser-2.1", { name: "old > flake" });
        // a failure long before the good commit excuses nothing
        s.inv("1000.1.test.graphty-element-browser-2.1", { at: NOW - 30 * DAY, outcome: "failed" });
        s.fail("1000.1.test.graphty-element-browser-2.1", { name: "new > break" });
        s.inv("local.1.h.2.graphty-element-browser-2", { kind: "local", at: NOW - 20 * HOUR, outcome: "failed" });
        s.fail("local.1.h.2.graphty-element-browser-2", { name: "new > break" });
        const read = async (q) => (await call("GET", `/v1/failures?${q}`, { token: LOCAL_TOKEN })).body;
        const shard = "graphty-element-browser-2";
        assert.deepEqual(await read("run=3001&good=good"), {
            tests: [
                { shard, file: X, name: "new > break" },
                { shard, file: X, name: "old > flake" },
            ],
            failedBefore: [`${shard}: ${X} > old > flake`],
        });
        assert.deepEqual((await read("run=3001")).failedBefore, [], "no good commit: nothing is known before it");
        assert.equal((await call("GET", "/v1/failures?run=30%25", { token: LOCAL_TOKEN })).status, 400);
    });
});

describe("GET /v1/release-state", () => {
    const state = async (call) => (await call("GET", "/v1/release-state", { token: master("ci.yml") })).body;
    it("names the open red, the frozen candidate, due resumes and nightly's age", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("n", NOW - 50 * HOUR);
        s.nightly("n", NOW - 49 * HOUR);
        s.site("c1", NOW - 40 * HOUR);
        s.verdict("c1", "green-images", NOW - 39 * HOUR);
        s.site("c2", NOW - 30 * HOUR);
        s.verdict("c2", "green-images", NOW - 29 * HOUR);
        s.site("c3", NOW - 2 * HOUR);
        s.verdict("c3", "red", NOW - HOUR, { lane: "ci", issue: 77 });
        let st = await state(call);
        assert.deepEqual([st.red.sha, st.red.lane, st.red.issue], ["c3", "ci", 77]);
        assert.equal(st.offered.sha, "c1", "the oldest waiting candidate stays offered");
        assert.deepEqual(st.approved, []);
        assert.equal(st.ageNightlyMs, 40 * HOUR, "from the first site built after nightly's");
        assert.equal(st.blocking, "red");

        s.verdict("c1", "approved", NOW - 30 * 60_000);
        s.site("c4", NOW - 20 * 60_000);
        s.verdict("c4", "green-images", NOW - 10 * 60_000);
        st = await state(call);
        assert.equal(st.red, null, "a later verdict closes the red");
        assert.deepEqual(
            st.approved.map((a) => a.sha),
            ["c1"],
        );
        assert.equal(st.offered.sha, "c2");
        assert.equal(st.blocking, "waiting-for-screenshots");

        s.nightly("c4", NOW - 60_000);
        st = await state(call);
        assert.deepEqual([st.nightly.sha, st.ageNightlyMs, st.blocking], ["c4", 0, null]);
        assert.deepEqual(st.approved, [], "an approved candidate older than nightly promotes nothing");
    });
    it("takes a promotion's version merge, which inherited nightly's verdict, for nightly itself", async () => {
        const { call, env } = service();
        const s = seed(env);
        const n = "a".repeat(40);
        s.site(n, NOW - 50 * HOUR);
        s.nightly(n, NOW - 49 * HOUR);
        s.site("m1", NOW - 48 * HOUR);
        s.verdict("m1", "green-clean", NOW - 47 * HOUR, { lane: "inherited from aaaaaaa" });
        assert.deepEqual([(await state(call)).ageNightlyMs, (await state(call)).blocking], [0, null]);
        // a merge of approval records with the same baselines tree inherits from the version merge: still nightly
        const m1 = "b".repeat(40);
        s.site(m1, NOW - 46 * HOUR);
        s.verdict(m1, "green-clean", NOW - 45 * HOUR, { lane: "inherited from aaaaaaa" });
        s.site("y", NOW - 44 * HOUR);
        s.verdict("y", "green-clean", NOW - 43 * HOUR, { lane: "inherited from bbbbbbb" });
        assert.equal((await state(call)).ageNightlyMs, 0, "the inherited chain leads to nightly");
        s.site("z", NOW - 42 * HOUR);
        s.verdict("z", "green-clean", NOW - 41 * HOUR, { lane: "inherited from ccccccc" });
        assert.equal((await state(call)).ageNightlyMs, 42 * HOUR, "a chain that does not reach nightly waits, from z");
    });
    it("waits on an approved-baselines merge after nightly, which the full run judged itself and did not promote", async () => {
        const { call, env } = service();
        const s = seed(env);
        const n = "e".repeat(40);
        s.site(n, NOW - 50 * HOUR);
        s.nightly(n, NOW - 49 * HOUR);
        // full-run.mjs pick never inherits across a visual-baselines change, so the merge has a verdict of its own
        s.site("ap", NOW - 48 * HOUR);
        s.verdict("ap", "green-clean", NOW - 40 * HOUR, { lane: "" });
        assert.equal((await state(call)).ageNightlyMs, 48 * HOUR, "the approved baselines are not on nightly");
    });
    it("counts nightly's age from the first site after it, so a quiet master is no stall", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("n", NOW - 72 * HOUR);
        s.nightly("n", NOW - 72 * HOUR);
        s.site("c1", NOW - HOUR);
        assert.equal((await state(call)).ageNightlyMs, HOUR);
    });
    it("does not start nightly's clock at a promotion's own version merge", async () => {
        const { call, env } = service();
        const s = seed(env);
        const n = "d".repeat(40);
        s.site(n, NOW - 73 * HOUR);
        s.nightly(n, NOW - 73 * HOUR);
        s.site("m", NOW - 72 * HOUR);
        s.verdict("m", "green-clean", NOW - 71 * HOUR, { lane: "inherited from ddddddd" });
        s.site("x", NOW - HOUR);
        assert.equal((await state(call)).ageNightlyMs, HOUR, "a quiet weekend after a versioned promotion");
    });
    it("counts nightly's age from its move when nightly has no site row", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("old", NOW - 30 * DAY);
        s.nightly("x", NOW - 2 * HOUR);
        assert.equal((await state(call)).ageNightlyMs, 0, "nothing built since the move");
        s.site("y", NOW - HOUR);
        assert.equal((await state(call)).ageNightlyMs, HOUR, "from the first site after the move");
    });
    it("counts the commits built while nightly's promotion ran when nightly has no site row", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("during", NOW - 30 * HOUR);
        s.nightly("x", NOW - 27 * HOUR);
        const st = await state(call);
        assert.equal(st.ageNightlyMs, 30 * HOUR, "a commit merged during the promotion is one nightly lacks");
    });
    it("gives no nightly age while nightly has never moved", async () => {
        const { call, env } = service();
        const s = seed(env);
        s.site("c1", NOW - 30 * HOUR);
        s.site("c2", NOW - HOUR);
        const st = await state(call);
        assert.deepEqual([st.nightly, st.ageNightlyMs, st.blocking], [null, null, "unjudged"]);
    });
});

describe("POST /v1/durations trend", () => {
    const row = (ms) => ({ runId: 4010, attempt: 1, workflow: "ci.yml", job: "Build", ms, startedAt: NOW, sha: "new" });
    it("alarms on 1.3 times the 10 runs before and 60 s slower, naming the range", async () => {
        const { call, env } = service();
        const s = seed(env);
        for (let i = 0; i < 10; i++) s.duration(i, 240_000, NOW - DAY + i);
        for (let i = 10; i < 14; i++) s.duration(i, 900_000, NOW - DAY + i);
        s.duration(99, 900_000, NOW - 40 * DAY); // outside the window
        s.duration(98, 240_000, NOW - DAY, "pr"); // another kind
        const { body } = await call("POST", "/v1/durations", {
            token: master("ci.yml"),
            body: { rows: [row(900_000)] },
        });
        assert.deepEqual(body.trend, [
            { key: "job:ci.yml:Build", kind: "full", recent: 900, earlier: 240, alarm: true, range: "sha9..sha10" },
        ]);
    });
    it("alarms over a budget the poster sends, and not under it", async () => {
        const { call, env } = service();
        const s = seed(env);
        for (let i = 0; i < 4; i++) s.duration(i, 400_000, NOW - DAY + i);
        const post = (budgets) =>
            call("POST", "/v1/durations", { token: master("ci.yml"), body: { rows: [row(400_000)], budgets } });
        assert.equal((await post({ "job:ci.yml:Build": 360 })).body.trend[0].alarm, true);
        env.DB.sqlite.prepare("DELETE FROM duration WHERE run_id = 4010").run();
        const [t] = (await post({ "job:ci.yml:Build": 600 })).body.trend;
        assert.deepEqual([t.alarm, t.earlier], [false, null]);
    });
});

describe("GET /v1/durations/medians", () => {
    it("answers master's median seconds per key over the last n runs of a kind, cancelled runs left out", async () => {
        const { call, env } = service();
        const s = seed(env);
        for (let i = 0; i < 12; i++) s.duration(i, (i < 2 ? 900 : 100 + i) * 1000, NOW - DAY + i);
        s.duration(50, 30_000, NOW - DAY, "pr");
        s.duration(51, 60_000, NOW - DAY, "full", "Lint");
        env.DB.sqlite.prepare("UPDATE duration SET conclusion = 'cancelled' WHERE run_id = 11").run();
        const { status, body } = await call("GET", "/v1/durations/medians?workflows=ci.yml&kind=full&n=4", {
            token: pr(),
        });
        assert.equal(status, 200);
        // runs 7 to 10 (107..110 s): 11 is cancelled, 0 and 1 are older than the last 4
        assert.deepEqual(body, { "job:ci.yml:Build": 108.5, "job:ci.yml:Lint": 60 });
        assert.equal((await call("GET", "/v1/durations/medians?kind=full", { token: pr() })).status, 400);
        assert.equal((await call("GET", "/v1/durations/medians?workflows=ci.yml")).status, 401);
    });
});

describe("/v1/durations/tests/<name>", () => {
    const path = "/v1/durations/tests/graphty-element-browser-1";
    it("keeps a shard's history written by master's runs and answers it to any credential", async () => {
        const { call } = service();
        assert.deepEqual((await call("GET", path, { token: pr() })).body, {});
        const history = { "browser\u0000a.test.ts\u0000zooms": [120, 130] };
        assert.equal((await call("PUT", path, { token: master("ci.yml"), body: history })).status, 200);
        assert.deepEqual((await call("GET", path, { token: pr() })).body, history);
        const next = { "browser\u0000a.test.ts\u0000zooms": [130, 140] };
        await call("PUT", path, { token: master("release.yml"), body: next });
        assert.deepEqual((await call("GET", path, { token: pr() })).body, next);
    });
    it("refuses a pull request's or a local write, a bad name and a body that is not an object", async () => {
        const { call } = service();
        assert.equal((await call("PUT", path, { token: pr(), body: {} })).status, 403);
        assert.equal((await call("PUT", path, { token: LOCAL_TOKEN, body: {} })).status, 403);
        assert.equal((await call("PUT", path, { token: master("ci.yml"), body: [1] })).status, 400);
        assert.equal((await call("GET", "/v1/durations/tests/a%2Fb", { token: pr() })).status, 400);
        assert.equal((await call("DELETE", path, { token: master("ci.yml") })).status, 404);
    });
});

describe("failureHashes", () => {
    it("hashes every failure exactly as the test ledger does", () => {
        const samples = [
            ["\u001b[31mAssertionError: expected 2 to be 3\u001b[0m\n at p/a.test.ts:4:5", "p/a.test.ts", undefined],
            [
                "Error:\nTimeoutError: waited 5000ms\n    at /home/u/repo/.worktrees/w/p/b.test.ts:9:1",
                "p/b.test.ts",
                "/home/u/repo",
            ],
            ["boom 0123456789abcdef in /tmp/x/y\n<div>", "p/c.test.ts", undefined],
            ["Error: frame\n \u276F p/d.test.ts:3:7\n \u276F node_modules/x.js:1:1", "p/d.test.ts", undefined],
        ];
        for (const [text, file, main] of samples)
            assert.deepEqual(failureHashes(text, file, main), ledgerHashes(text, file, main));
    });
});

describe("GitHub's key set", () => {
    it("is fetched once and reused for every token signed with a known key", () => {
        assert.equal(keyFetches, 2, "once for the first token, once for the unknown kid");
    });
});
