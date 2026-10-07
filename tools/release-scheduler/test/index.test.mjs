// Tests of the release scheduler Worker, with a generated key and a stubbed fetch.
//
//   node --test tools/release-scheduler/test/
import assert from "node:assert/strict";
import { createVerify, generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";

import { buildJwt, ISSUE_TITLE, PKCS1_MESSAGE, run } from "../src/worker.js";

const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const env = {
    APP_ID: "12345",
    INSTALLATION_ID: "678",
    PRIVATE_KEY: privateKey.export({ type: "pkcs8", format: "pem" }),
};
const decode = (part) => JSON.parse(Buffer.from(part, "base64url").toString());

// A fetch stub: answers the token exchange, the dispatch with `dispatchStatus`, the issue search
// with `openIssues`, and records every request.
function github({ dispatchStatus = 204, tokenStatus = 201, openIssues = [] } = {}) {
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
        assert.deepEqual(JSON.parse(calls[1].body), { ref: "master", inputs: { scheduled: "true" } });
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
