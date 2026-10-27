// Tests of the held nightly candidate's records (hold.mjs).
// Run: node tools/channel/hold.test.mjs
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { createServer } from "node:http";
import { join } from "node:path";
import { describe, it } from "node:test";

import { HOLD_TITLE, holdIssue } from "./hold.mjs";

describe("holdIssue", () => {
    it("names the commit by 12 characters and says how the hold ends", () => {
        const { title, body } = holdIssue({ sha: "a".repeat(40), state: "red", what: "T4 GPU", run: "https://run" });
        assert.equal(title, `${HOLD_TITLE} ${"a".repeat(12)}`);
        assert.match(body, /ended red \(T4 GPU\) after its one same-commit re-run: https:\/\/run/);
        assert.match(
            body,
            /start the fix from the candidate's head, never from newer master: `worktree-new.sh fix\/<issue>-<topic> origin\/channel\/candidate/,
        );
        assert.match(body, /-f mode=abandon/);
    });
});

describe("start", () => {
    it("fails the job, opening no issue, when the store cannot say what is held", () => {
        const dir = mkdtempSync(join(tmpdir(), "hold-"));
        const log = join(dir, "calls.log");
        writeFileSync(join(dir, "gh"), `#!/bin/bash\necho "$*" >> "${log}"\necho https://github.com/o/r/issues/31\n`, {
            mode: 0o755,
        });
        const r = spawnSync(process.execPath, ["tools/channel/hold.mjs", "start"], {
            encoding: "utf8",
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                RESULTS_URL: "",
                GITHUB_OUTPUT: "",
                SHA: "b".repeat(40),
                STATE: "green-images",
                WHAT: "2 screenshots differ",
                RUN_URL: "https://run",
            },
        });
        assert.ok(!existsSync(log), "no hold issue the store does not hold");
        assert.notEqual(r.status, 0, "a hold the store did not record is no hold");
        assert.match(r.stderr, /the results store did not answer/);
    });
});

// hold.mjs against a store on localhost and a gh that only logs
async function withStore(cmd, hold, env) {
    const posts = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (d) => (body += d));
        req.on("end", () => {
            if (req.method === "POST") posts.push({ url: req.url, body: JSON.parse(body) });
            res.setHeader("content-type", "application/json");
            res.end(JSON.stringify(req.method === "POST" ? { ok: true } : { hold, recent: [] }));
        });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    const dir = mkdtempSync(join(tmpdir(), "hold-"));
    const log = join(dir, "calls.log");
    writeFileSync(log, "");
    writeFileSync(join(dir, "gh"), `#!/bin/bash\necho "$*" >> "${log}"\necho https://github.com/o/r/issues/31\n`, {
        mode: 0o755,
    });
    let stdout = "";
    const code = await new Promise((resolve) => {
        const child = spawn(process.execPath, ["tools/channel/hold.mjs", cmd], {
            stdio: ["ignore", "pipe", "ignore"],
            env: {
                ...process.env,
                PATH: `${dir}:${process.env.PATH}`,
                RESULTS_URL: `http://127.0.0.1:${server.address().port}`,
                GRAPHTY_RESULTS_TOKEN: "t",
                HEALTH_API_URL: "",
                GITHUB_OUTPUT: "",
                RUN_URL: "https://run",
                ...env,
            },
        });
        child.stdout.on("data", (d) => (stdout += d));
        child.on("close", resolve);
    });
    server.close();
    return { code, posts, calls: readFileSync(log, "utf8"), stdout };
}

describe("start for a red run that was not re-run", () => {
    const env = { ONLY_IF_FREE: "true", SHA: "c".repeat(40), STATE: "red", WHAT: "T4 GPU" };
    it("holds the commit when nothing is held", async () => {
        const r = await withStore("start", null, env);
        assert.equal(r.code, 0);
        assert.match(r.calls, /issue create --title Nightly held on cccccccccccc/);
        assert.deepEqual(r.posts, [
            { url: "/v1/hold", body: { base: "c".repeat(40), head: "c".repeat(40), issue: 31 } },
        ]);
    });
    it("never replaces a held candidate", async () => {
        const r = await withStore("start", { base: "d".repeat(40), head: "d".repeat(40), issue: 5 }, env);
        assert.equal(r.code, 0);
        assert.equal(r.calls, "");
        assert.deepEqual(r.posts, []);
    });
});

describe("start for a verdict, which read the hold when its run was picked", () => {
    const env = { SHA: "c".repeat(40), STATE: "red", WHAT: "CI, T4 GPU" };
    it("holds the commit when nothing is held", async () => {
        const r = await withStore("start", null, env);
        assert.equal(r.code, 0);
        assert.match(r.calls, /issue create --title Nightly held on cccccccccccc/);
        assert.equal(r.posts.length, 1);
        assert.match(r.stdout, /^action=start$/m);
    });
    it("opens no second hold issue when another run held its commit since the pick", async () => {
        const r = await withStore("start", { base: "d".repeat(40), head: "d".repeat(40), issue: 5 }, env);
        assert.equal(r.code, 0);
        assert.equal(r.calls, "");
        assert.deepEqual(r.posts, []);
        assert.match(r.stdout, /^action=none$/m, "so channel/candidate is not moved to this commit");
    });
    it("comments on the hold issue when the commit is the one held", async () => {
        const r = await withStore("start", { base: "c".repeat(40), head: "c".repeat(40), issue: 5 }, env);
        assert.equal(r.code, 0);
        assert.match(r.calls, /^issue comment 5 /);
        assert.doesNotMatch(r.calls, /issue create/);
        assert.deepEqual(r.posts, []);
        assert.match(r.stdout, /^action=update$/m);
    });
    it("is what the jobs after the verdict follow", () => {
        const yml = readFileSync(new URL("../../.github/workflows/release.yml", import.meta.url), "utf8");
        assert.match(yml, /^ {12}hold: \$\{\{ steps\.hold\.outputs\.action \|\| steps\.verdict\.outputs\.hold \}\}$/m);
    });
});

describe("end", () => {
    const hold = { base: "d".repeat(40), head: "e".repeat(40), issue: 5 };
    it("an abandon records the held head rejected, so a later approval of it promotes nothing", async () => {
        const r = await withStore("end", hold, { ABANDONED: "true", WHY: "abandoned by the owner" });
        assert.equal(r.code, 0);
        assert.deepEqual(r.posts, [
            { url: "/v1/verdicts", body: { sha: "e".repeat(40), state: "rejected", lane: "abandoned" } },
            { url: "/v1/hold", body: { clear: true } },
        ]);
        assert.match(r.calls, /issue close 5/);
    });
    it("a promotion only clears the hold", async () => {
        const r = await withStore("end", hold, { WHY: "promoted" });
        assert.deepEqual(
            r.posts.map((p) => p.url),
            ["/v1/hold"],
        );
    });
});
