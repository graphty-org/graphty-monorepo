// Tests of tools/lfs-pre-push.sh: a push still uploads its Git LFS objects when the LFS lock
// endpoint answers 500 (issue #1414). A real `git push` runs the script as its pre-push hook, with
// the LFS API served by a local stub that fails /locks/verify and accepts every upload.
//
//   node --test tools/lfs-pre-push.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

const SCRIPT = new URL("./lfs-pre-push.sh", import.meta.url).pathname;
const hasLfs = spawnSync("git", ["lfs", "version"]).status === 0;

// The stub LFS API: 500 on the lock check, upload actions on the batch API, records each upload.
async function startLfs() {
    const uploads = [];
    const locksCalls = [];
    const server = createServer((req, res) => {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", () => {
            const json = (status, obj) => {
                res.writeHead(status, { "Content-Type": "application/vnd.git-lfs+json" });
                res.end(JSON.stringify(obj));
            };
            if (req.url.includes("/locks")) {
                locksCalls.push(req.url);
                return json(500, { message: "Unable to verify locks" });
            }
            if (req.url.endsWith("/objects/batch")) {
                const { objects } = JSON.parse(body);
                const base = `http://127.0.0.1:${server.address().port}`;
                return json(200, {
                    transfer: "basic",
                    objects: objects.map((o) => ({
                        ...o,
                        authenticated: true,
                        actions: { upload: { href: `${base}/upload/${o.oid}` } },
                    })),
                });
            }
            if (req.method === "PUT" && req.url.startsWith("/upload/")) {
                uploads.push(req.url.slice("/upload/".length));
                res.writeHead(200);
                return res.end();
            }
            res.writeHead(404);
            res.end();
        });
    });
    await new Promise((r) => server.listen(0, "127.0.0.1", r));
    return { server, uploads, locksCalls, url: `http://127.0.0.1:${server.address().port}/lfs` };
}

function run(cwd, args, env) {
    return new Promise((resolve) => {
        const p = spawn("git", args, { cwd, env });
        let out = "";
        p.stdout.on("data", (c) => (out += c));
        p.stderr.on("data", (c) => (out += c));
        p.on("close", (status) => resolve({ status, out }));
    });
}

// A repository with one commit holding an LFS pointer (its object in .git/lfs), a bare remote, and
// a pre-push hook that runs `hook`. Global config is isolated so nothing outside the temp dir counts.
async function setup(lfsUrl, hook) {
    const dir = mkdtempSync(join(tmpdir(), "lfs-pre-push-"));
    const repo = join(dir, "repo");
    const hooks = join(dir, "hooks");
    mkdirSync(hooks);
    writeFileSync(join(hooks, "pre-push"), `#!/bin/sh\n${hook}\n`);
    chmodSync(join(hooks, "pre-push"), 0o755);
    writeFileSync(join(dir, "gitconfig"), "");
    const env = {
        ...process.env,
        HOME: dir,
        GIT_CONFIG_GLOBAL: join(dir, "gitconfig"),
        GIT_CONFIG_NOSYSTEM: "1",
        GIT_TERMINAL_PROMPT: "0",
    };
    const git = (...args) => spawnSync("git", args, { cwd: repo, env, encoding: "utf8" });
    spawnSync("git", ["init", "-q", "--bare", join(dir, "remote.git")], { env });
    spawnSync("git", ["init", "-q", "-b", "main", repo], { env });
    for (const [k, v] of [
        ["user.name", "t"],
        ["user.email", "t@example.com"],
        ["commit.gpgsign", "false"],
        ["core.hooksPath", hooks],
        ["lfs.url", lfsUrl],
        // git-lfs turns the lock check on by itself only for github.com; turn it on here the same way.
        ["lfs.locksverify", "true"],
        ["remote.origin.url", join(dir, "remote.git")],
    ])
        git("config", k, v);

    const content = "an LFS object\n";
    const oid = createHash("sha256").update(content).digest("hex");
    const objDir = join(repo, ".git", "lfs", "objects", oid.slice(0, 2), oid.slice(2, 4));
    mkdirSync(objDir, { recursive: true });
    writeFileSync(join(objDir, oid), content);
    writeFileSync(join(repo, ".gitattributes"), "*.png filter=lfs diff=lfs merge=lfs -text\n");
    writeFileSync(
        join(repo, "image.png"),
        `version https://git-lfs.github.com/spec/v1\noid sha256:${oid}\nsize ${content.length}\n`,
    );
    git("add", ".");
    git("commit", "-q", "-m", "add image");
    return { push: () => run(repo, ["push", "origin", "main"], env), oid };
}

describe("lfs-pre-push", { skip: !hasLfs && "git-lfs is not installed" }, () => {
    it("pushes and uploads LFS objects when the lock endpoint answers 500", async () => {
        const lfs = await startLfs();
        try {
            const { push, oid } = await setup(lfs.url, `exec "${SCRIPT}" "$@"`);
            const r = await push();
            assert.equal(r.status, 0, r.out);
            assert.deepEqual(lfs.uploads, [oid]);
            assert.deepEqual(lfs.locksCalls, [], "the script must not ask the lock endpoint at all");
        } finally {
            lfs.server.close();
        }
    });

    // The control: plain `git lfs pre-push` against the same stub fails, so the test above
    // exercises the lock check rather than a stub that never reaches it.
    it("control: plain git lfs pre-push fails on the same 500", async () => {
        const lfs = await startLfs();
        try {
            const { push } = await setup(lfs.url, 'exec git lfs pre-push "$@"');
            const r = await push();
            assert.notEqual(r.status, 0, r.out);
            assert.ok(lfs.locksCalls.length > 0);
        } finally {
            lfs.server.close();
        }
    });
});
