// Tests of the release scheduler Worker, with a generated key and a stubbed fetch.
//
//   node tools/release-scheduler/test/index.test.mjs
//
// Not `node --test` in a package.json script: that switches on knip's Node test
// runner plugin, whose test globs then make every workspace's test/**/*.js an entry.
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import worker, {
    buildJwt,
    checkDeployKeys,
    DEPLOY_KEY_ISSUE_TITLE,
    ISSUE_TITLE,
    isOnMaster,
    KEY_CHECK_CRON,
    PKCS1_MESSAGE,
    RELEASE_DEPLOY_KEY_ID,
    run,
} from "../src/worker.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
    APP_ID: "12345",
    INSTALLATION_ID: "678",
    PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
};
const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

// A fetch stub: answers the token exchange, the dispatch with `dispatchStatus`, the issue search
// with `openIssues`, and records every request.
// `keys` answers the deploy key list (`keysStatus` its HTTP status); `compare` the compare's status.
function github({
    dispatchStatus = 204,
    tokenStatus = 201,
    openIssues = [],
    keys = [],
    keysStatus = 200,
    compare = { status: 200, body: { status: "behind" } },
} = {}) {
    const calls = [];
    const fetch = async (url, init = {}) => {
        const { pathname } = new URL(url);
        calls.push({ url, pathname, method: init.method ?? "GET", headers: init.headers, body: init.body });
        if (pathname.endsWith("/access_tokens")) {
            return tokenStatus === 201
                ? Response.json({ token: "inst-token" }, { status: 201 })
                : new Response("Bad credentials", { status: tokenStatus });
        }
        if (pathname.endsWith("/dispatches")) {
            return new Response(dispatchStatus === 204 ? null : '{"message":"Unexpected inputs provided"}', {
                status: dispatchStatus,
            });
        }
        if (pathname.endsWith("/keys")) {
            return keysStatus === 200
                ? Response.json(keys)
                : new Response("Resource not accessible", { status: keysStatus });
        }
        if (pathname.includes("/compare/")) {
            return Response.json(compare.body, { status: compare.status });
        }
        if (pathname === "/search/issues") {
            return Response.json({ items: openIssues });
        }
        return Response.json({}, { status: 201 });
    };
    return { fetch, calls };
}
const slot = new Date("2026-10-07T06:00:00Z");

describe("buildJwt", () => {
    it("signs RS256 with the App's key and GitHub's claims", async () => {
        const now = Date.UTC(2026, 9, 7, 6);
        const jwt = await buildJwt(env.APP_ID, env.PRIVATE_KEY, now);
        const [header, payload, signature] = jwt.split(".");
        assert.deepEqual(decode(header), { alg: "RS256", typ: "JWT" });
        assert.deepEqual(decode(payload), { iat: now / 1000 - 60, exp: now / 1000 + 540, iss: "12345" });
        const verify = createVerify("RSA-SHA256").update(`${header}.${payload}`);
        assert.ok(verify.verify(publicKey, Buffer.from(signature, "base64url")));
    });

    it("names the conversion command for a PKCS#1 key", async () => {
        const pkcs1 = privateKey.export({ type: "pkcs1", format: "pem" });
        await assert.rejects(buildJwt(env.APP_ID, pkcs1), { message: PKCS1_MESSAGE });
        assert.match(PKCS1_MESSAGE, /openssl pkcs8 -topk8 -nocrypt/);
    });
});

describe("run", () => {
    it("dispatches release.yml and files no issue on 204", async () => {
        const { fetch, calls } = github();
        assert.deepEqual(await run(env, { fetch, slot }), { dispatched: true, status: 204 });
        assert.deepEqual(
            calls.map((c) => c.pathname),
            [
                "/app/installations/678/access_tokens",
                "/repos/graphty-org/graphty-monorepo/actions/workflows/release.yml/dispatches",
            ],
        );
        assert.deepEqual(JSON.parse(calls[1].body), { ref: "master", inputs: { scheduled: "true", mode: "full" } });
        assert.equal(calls[1].headers.Authorization, "Bearer inst-token");
        for (const { headers } of calls) {
            assert.equal(headers["User-Agent"], "graphty-release-scheduler");
            assert.equal(headers.Accept, "application/vnd.github+json");
            assert.equal(headers["X-GitHub-Api-Version"], "2022-11-28");
        }
    });

    it("opens one issue when the dispatch returns 422", async () => {
        const { fetch, calls } = github({ dispatchStatus: 422 });
        assert.deepEqual(await run(env, { fetch, slot }), { dispatched: false, status: 422 });
        const created = calls.filter((c) => c.method === "POST" && c.pathname.endsWith("/issues"));
        assert.equal(created.length, 1);
        const { title, body } = JSON.parse(created[0].body);
        assert.equal(title, ISSUE_TITLE);
        assert.match(body, /2026-10-07T06:00:00\.000Z/);
        assert.match(body, /HTTP 422/);
        assert.match(body, /Unexpected inputs provided/);
        assert.doesNotMatch(body, /inst-token|PRIVATE KEY/);
    });

    it("comments on the open issue instead of opening another", async () => {
        const { fetch, calls } = github({ dispatchStatus: 500, openIssues: [{ number: 42, title: ISSUE_TITLE }] });
        await run(env, { fetch, slot });
        const posts = calls.filter((c) => c.method === "POST").map((c) => c.pathname);
        assert.ok(posts.includes("/repos/graphty-org/graphty-monorepo/issues/42/comments"));
        assert.ok(!posts.includes("/repos/graphty-org/graphty-monorepo/issues"));
    });

    it("throws and files nothing when the token exchange fails", async () => {
        const { fetch, calls } = github({ tokenStatus: 401 });
        await assert.rejects(run(env, { fetch, slot }), /HTTP 401/);
        assert.equal(calls.length, 1);
    });
});

const releaseKey = {
    id: RELEASE_DEPLOY_KEY_ID,
    title: "release workflow push",
    read_only: false,
    key: "ssh-ed25519 AAAA",
};
const created = (calls) => calls.filter((c) => c.method === "POST" && c.pathname.endsWith("/issues"));

describe("checkDeployKeys", () => {
    it("passes and files nothing with only the release key (read-only keys ignored)", async () => {
        const { fetch, calls } = github({ keys: [releaseKey, { id: 9, title: "ro", read_only: true }] });
        assert.deepEqual(await checkDeployKeys(env, { fetch }), { ok: true, writeKeyIds: [RELEASE_DEPLOY_KEY_ID] });
        assert.equal(calls.filter((c) => c.method === "POST").length, 1); // the token exchange only
    });

    it("files one priority:critical issue for a seeded second write key", async () => {
        const second = { id: 777, title: "seeded", read_only: false, created_at: "2026-10-24T00:00:00Z" };
        const { fetch, calls } = github({ keys: [releaseKey, second] });
        assert.deepEqual(await checkDeployKeys(env, { fetch }), {
            ok: false,
            writeKeyIds: [RELEASE_DEPLOY_KEY_ID, 777],
        });
        const issues = created(calls);
        assert.equal(issues.length, 1);
        const { title, body, labels } = JSON.parse(issues[0].body);
        assert.equal(title, DEPLOY_KEY_ISSUE_TITLE);
        assert.deepEqual(labels, ["bug", "priority:critical", "effort:medium"]);
        assert.match(body, /id 777, "seeded"/);
        assert.doesNotMatch(body, /ssh-ed25519|inst-token/);
    });

    it("accepts the key release.yml pushes with (167635448) and flags the retired one (#3628)", async () => {
        const live = { id: 167635448, title: "release deploy key 2026-10-25", read_only: false };
        const retired = { id: 164375816, title: "release workflow push", read_only: false };
        assert.equal((await checkDeployKeys(env, { fetch: github({ keys: [live] }).fetch })).ok, true);
        const both = await checkDeployKeys(env, { fetch: github({ keys: [retired, live] }).fetch });
        assert.deepEqual(both, { ok: false, writeKeyIds: [164375816, 167635448] });
    });

    it("files when the release key is gone, and comments on an open issue instead of opening another", async () => {
        const open = [{ number: 51, title: DEPLOY_KEY_ISSUE_TITLE }];
        const { fetch, calls } = github({ keys: [], openIssues: open });
        assert.equal((await checkDeployKeys(env, { fetch })).ok, false);
        assert.equal(created(calls).length, 0);
        assert.ok(calls.some((c) => c.pathname === "/repos/graphty-org/graphty-monorepo/issues/51/comments"));
    });

    it("files an issue naming Administration: read when the keys cannot be read", async () => {
        const { fetch, calls } = github({ keysStatus: 403 });
        assert.deepEqual(await checkDeployKeys(env, { fetch }), { ok: false, writeKeyIds: null });
        assert.match(JSON.parse(created(calls)[0].body).body, /HTTP 403[\s\S]*Administration: read/);
    });
});

describe("isOnMaster", () => {
    const sha = "a".repeat(40);
    for (const [status, expected] of [
        ["behind", true],
        ["identical", true],
        ["ahead", false],
        ["diverged", false],
    ]) {
        it(`is ${expected} when compare master...sha says ${status}`, async () => {
            const { fetch, calls } = github({ compare: { status: 200, body: { status } } });
            assert.equal(await isOnMaster(sha, "inst-token", fetch), expected);
            assert.equal(calls[0].pathname, `/repos/graphty-org/graphty-monorepo/compare/master...${sha}`);
        });
    }

    it("is false for an unknown commit and for something that is not a sha, which it never sends", async () => {
        const { fetch, calls } = github({ compare: { status: 404, body: {} } });
        assert.equal(await isOnMaster(sha, "inst-token", fetch), false);
        assert.equal(await isOnMaster("master/../x", "inst-token", fetch), false);
        assert.equal(calls.length, 1);
    });

    it("throws on any other error, so a caller never takes an outage for an answer", async () => {
        const { fetch } = github({ compare: { status: 500, body: {} } });
        await assert.rejects(isOnMaster(sha, "inst-token", fetch), /HTTP 500/);
    });
});

describe("scheduled", () => {
    it("runs the key check on its cron and dispatches on every other", async () => {
        const original = globalThis.fetch;
        const { fetch, calls } = github({ keys: [releaseKey] });
        globalThis.fetch = fetch;
        try {
            for (const cron of [KEY_CHECK_CRON, "0 0,6,12,18 * * *"]) {
                const pending = [];
                worker.scheduled({ cron, scheduledTime: slot.getTime() }, env, { waitUntil: (p) => pending.push(p) });
                await Promise.all(pending);
            }
        } finally {
            globalThis.fetch = original;
        }
        const paths = calls.map((c) => c.pathname).filter((p) => !p.endsWith("/access_tokens"));
        assert.deepEqual(paths, [
            "/repos/graphty-org/graphty-monorepo/keys",
            "/repos/graphty-org/graphty-monorepo/actions/workflows/release.yml/dispatches",
        ]);
    });

    it("dispatches only inputs release.yml declares (GitHub answers 422 to any other)", async () => {
        const { readFile } = await import("node:fs/promises");
        const release = await readFile(new URL("../../../.github/workflows/release.yml", import.meta.url), "utf8");
        const inputs = /workflow_dispatch:\n\s+inputs:\n([\s\S]*?)\n {4}\S/.exec(release)[1];
        const declared = [...inputs.matchAll(/^ {12}([\w-]+):$/gm)].map((m) => m[1]);
        const { fetch, calls } = github();
        await run(env, { fetch, slot });
        for (const name of Object.keys(JSON.parse(calls[1].body).inputs)) {
            assert.ok(declared.includes(name), `release.yml has no workflow_dispatch input "${name}"`);
        }
    });

    it("keeps the key check's cron in wrangler.toml", async () => {
        const { readFile } = await import("node:fs/promises");
        const toml = await readFile(new URL("../wrangler.toml", import.meta.url), "utf8");
        assert.ok(toml.includes(`"${KEY_CHECK_CRON}"`));
    });
});
