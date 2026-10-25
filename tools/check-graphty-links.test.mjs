// Tests of tools/check-graphty-links.mjs against two local HTTP servers standing in for canary and
// nightly (LINKS_CANARY_URL, LINKS_NIGHTLY_URL). No real network. Run: node tools/check-graphty-links.test.mjs
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("check-graphty-links.mjs", import.meta.url));

function site(paths) {
    const server = createServer((req, res) => {
        res.writeHead(paths.has(new URL(req.url, "http://x").pathname) ? 200 : 404);
        res.end();
    });
    return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}
const base = (server) => `http://127.0.0.1:${server.address().port}`;

function run(stdin, env) {
    return new Promise((resolve) => {
        const child = spawn(process.execPath, [script], { env: { ...process.env, ...env } });
        let out = "";
        child.stdout.on("data", (d) => (out += d));
        child.stderr.on("data", (d) => (out += d));
        child.on("close", (code) => resolve({ code, out }));
        child.stdin.end(stdin);
    });
}

describe("check-graphty-links.mjs", () => {
    let canary, nightly, env;
    before(async () => {
        canary = await site(new Set(["/docs/layout/"]));
        nightly = await site(new Set(["/docs/layout/", "/docs/new-page/"]));
        env = { LINKS_CANARY_URL: base(canary), LINKS_NIGHTLY_URL: base(nightly) };
    });
    after(() => {
        canary.close();
        nightly.close();
    });

    it("passes a page on canary", async () => {
        const { code, out } = await run("https://graphty.app/docs/layout/\n", env);
        assert.equal(code, 0, out);
        assert.match(out, /1 ok, 0 pending promotion, 0 dead/);
    });

    it("reports a nightly-only page as pending promotion without failing", async () => {
        const { code, out } = await run("https://graphty.app/docs/new-page/#intro\n", env);
        assert.equal(code, 0, out);
        assert.match(out, /pending promotion: https:\/\/graphty\.app\/docs\/new-page\//);
    });

    it("fails a page missing from both", async () => {
        const { code, out } = await run("https://graphty.app/docs/layout/\nhttps://graphty.app/docs/gone/\n", env);
        assert.equal(code, 1, out);
        assert.match(out, /dead: https:\/\/graphty\.app\/docs\/gone\//);
        assert.match(out, /1 ok, 0 pending promotion, 1 dead/);
    });
});
