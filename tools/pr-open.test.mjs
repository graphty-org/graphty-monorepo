// Tests of tools/pr-open.sh: a throwaway origin and clone, a fake HOME holding the agent's git config
// and gh login directory, and a fake `gh` that records what it was asked and as whom.
// Run: node tools/pr-open.test.mjs

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, beforeEach, describe, it } from "node:test";

import { isolatedGitEnv } from "./isolated-git-env.mjs";

const script = fileURLToPath(new URL("./pr-open.sh", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "pr-open-test-"));
after(() => rmSync(dir, { recursive: true, force: true }));

const home = join(dir, "home");
const bin = join(dir, "bin");
const ghLog = join(dir, "gh.log");
mkdirSync(join(home, ".config/git-agent"), { recursive: true });
mkdirSync(join(home, ".config/gh-agent"), { recursive: true });
writeFileSync(
    join(home, ".config/git-agent/config"),
    "[user]\n\tname = graphty-agent\n\temail = agent@example.invalid\n",
);
mkdirSync(bin);
// The fake gh: one JSON line per call (its arguments and the identity it ran as); `pr list` answers
// with FAKE_EXISTING, `pr create` with a new URL and saves the body it was given.
writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const a = process.argv.slice(2);
fs.appendFileSync(${JSON.stringify(ghLog)}, JSON.stringify({ a, gh: process.env.GH_CONFIG_DIR, git: process.env.GIT_CONFIG_GLOBAL, count: process.env.GIT_CONFIG_COUNT ?? null }) + "\\n");
if (a[0] === "pr" && a[1] === "list") process.stdout.write(process.env.FAKE_EXISTING ?? "");
if (a[0] === "pr" && a[1] === "create") {
    fs.copyFileSync(a[a.indexOf("--body-file") + 1], ${JSON.stringify(join(dir, "body.md"))});
    process.stdout.write("https://github.com/o/r/pull/42\\n");
}
`,
);
chmodSync(join(bin, "gh"), 0o755);

// Setup git runs isolated and unsigned; the script under test gets the fake HOME and PATH, plus a
// session override it must drop.
const setupEnv = isolatedGitEnv({ ...process.env, GIT_CONFIG_COUNT: "0" });
const git = (cwd, ...args) => {
    const r = spawnSync("git", args, { cwd, env: setupEnv, encoding: "utf8" });
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
const proof = join(dir, "proof.md");
writeFileSync(proof, "node tools/x.test.mjs: 3 pass\n");

let work;
let n = 0;
beforeEach(() => {
    n += 1;
    rmSync(ghLog, { force: true });
    const origin = join(dir, `origin-${n}.git`);
    work = join(dir, `work-${n}`);
    git(dir, "init", "-q", "--bare", "-b", "master", origin);
    git(dir, "clone", "-q", origin, work);
    git(work, "commit", "-q", "--allow-empty", "-m", "base");
    git(work, "push", "-q", "origin", "master");
});

const branch = (name, files = { "f.txt": "f\n" }, message = "fix(tools): a fix") => {
    git(work, "checkout", "-q", "-b", name);
    for (const [f, body] of Object.entries(files)) {
        mkdirSync(join(work, f, ".."), { recursive: true });
        writeFileSync(join(work, f), body);
    }
    git(work, "add", ".");
    git(work, "commit", "-q", "-m", message);
};

const run = (args = ["--proof", proof], extra = {}) => {
    const env = {
        ...process.env,
        HOME: home,
        PATH: `${bin}:${process.env.PATH}`,
        PR_OPEN_SCAN: "true",
        GIT_CONFIG_COUNT: "1",
        GIT_CONFIG_KEY_0: "user.name",
        GIT_CONFIG_VALUE_0: "the-owner",
        GH_TOKEN: "owner-token-must-not-be-used",
        ...extra,
    };
    for (const k of ["GIT_DIR", "GIT_WORK_TREE", "GIT_INDEX_FILE", "GIT_CONFIG_GLOBAL", "GH_CONFIG_DIR"]) delete env[k];
    const r = spawnSync("bash", [script, ...args], { cwd: work, env, encoding: "utf8" });
    return { code: r.status, out: r.stdout + r.stderr };
};
const calls = () =>
    readFileSync(ghLog, "utf8")
        .trim()
        .split("\n")
        .map((l) => JSON.parse(l));

describe("pr-open.sh", () => {
    it("pushes the branch, opens the pull request into master with the issue and Proof, and arms auto-merge, as the agent", () => {
        branch("fix/1234-thing");
        const r = run();
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /https:\/\/github\.com\/o\/r\/pull\/42/);
        assert.equal(git(work, "rev-parse", "origin/fix/1234-thing"), git(work, "rev-parse", "HEAD"));
        const c = calls();
        const create = c.find((x) => x.a[1] === "create").a;
        assert.deepEqual(create.slice(0, 8), [
            "pr",
            "create",
            "--base",
            "master",
            "--head",
            "fix/1234-thing",
            "--title",
            "fix(tools): a fix",
        ]);
        const merge = c.find((x) => x.a[1] === "merge").a;
        assert.deepEqual(merge, ["pr", "merge", "https://github.com/o/r/pull/42", "--auto", "--merge"]);
        for (const x of c) {
            assert.equal(x.gh, join(home, ".config/gh-agent"));
            assert.equal(x.git, join(home, ".config/git-agent/config"));
            assert.equal(x.count, null, "the session's GIT_CONFIG_COUNT override is dropped");
        }
        const body = readFileSync(join(dir, "body.md"), "utf8");
        assert.match(body, /^- fix\(tools\): a fix$/m);
        assert.match(body, /^Fixes #1234$/m);
        assert.match(body, /^## Proof\n\nnode tools\/x\.test\.mjs: 3 pass$/m);
    });

    it("writes Refs with --refs, and merges master in when the branch is behind", () => {
        branch("ci/3418-thing");
        git(work, "checkout", "-q", "master");
        writeFileSync(join(work, "m.txt"), "m\n");
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "chore: master moved");
        git(work, "push", "-q", "origin", "master");
        git(work, "checkout", "-q", "ci/3418-thing");
        const r = run(["--proof", proof, "--refs"]);
        assert.equal(r.code, 0, r.out);
        assert.match(readFileSync(join(dir, "body.md"), "utf8"), /^Refs #3418$/m);
        assert.equal(
            spawnSync("git", ["merge-base", "--is-ancestor", "origin/master", "HEAD"], { cwd: work, env: setupEnv })
                .status,
            0,
        );
        assert.equal(git(work, "log", "-1", "--format=%an"), "graphty-agent", "the merge is the agent's");
    });

    it("reuses an open pull request instead of opening a second", () => {
        branch("fix/1235-again");
        const r = run(undefined, { FAKE_EXISTING: "https://github.com/o/r/pull/7" });
        assert.equal(r.code, 0, r.out);
        assert.equal(calls().filter((x) => x.a[1] === "create").length, 0);
        assert.deepEqual(
            calls()
                .find((x) => x.a[1] === "merge")
                .a.slice(2, 3),
            ["https://github.com/o/r/pull/7"],
        );
    });

    it("refuses, pushing and opening nothing: no Proof, no issue, uncommitted changes, master, nothing new", () => {
        const cases = [
            ["no proof", () => branch("fix/1236-a"), [], /--proof <file> is required/],
            [
                "empty proof",
                () => branch("fix/1237-a"),
                ["--proof", join(dir, "empty.md")],
                /--proof <file> is required/,
            ],
            ["no issue", () => branch("fix/no-number"), undefined, /names no issue/],
            [
                "dirty",
                () => (branch("fix/1238-a"), writeFileSync(join(work, "dirty.txt"), "x")),
                undefined,
                /uncommitted/,
            ],
            ["master", () => {}, undefined, /refusing to open a pull request from master/],
            [
                "nothing new",
                () => git(work, "checkout", "-q", "-b", "fix/1239-empty"),
                undefined,
                /nothing master lacks/,
            ],
        ];
        writeFileSync(join(dir, "empty.md"), "");
        for (const [name, setup, args, message] of cases) {
            git(work, "checkout", "-q", "-f", "master");
            git(work, "clean", "-qfd");
            setup();
            rmSync(ghLog, { force: true });
            const r = run(args);
            assert.equal(r.code, 1, `${name}: ${r.out}`);
            assert.match(r.out, message, name);
            assert.throws(() => readFileSync(ghLog), undefined, `${name}: gh was not called`);
            assert.equal(
                spawnSync("git", ["ls-remote", "--exit-code", "origin", "refs/heads/fix/*"], {
                    cwd: work,
                    env: setupEnv,
                }).status,
                2,
                name,
            );
        }
    });

    it("stops with exit 2 when master does not merge cleanly, leaving no merge in progress", () => {
        branch("fix/1240-clash", { "c.txt": "branch\n" });
        git(work, "checkout", "-q", "master");
        writeFileSync(join(work, "c.txt"), "master\n");
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "chore: clash");
        git(work, "push", "-q", "origin", "master");
        git(work, "checkout", "-q", "fix/1240-clash");
        const r = run();
        assert.equal(r.code, 2, r.out);
        assert.match(r.out, /does not merge cleanly/);
        assert.equal(git(work, "status", "--porcelain"), "");
    });

    it("refuses without the agent's git config, never falling back to the owner's", () => {
        branch("fix/1241-noagent");
        const r = run(undefined, { HOME: join(dir, "nohome") });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /no agent git config/);
    });

    it("opens a breaking change without auto-merge, for the owner's go", () => {
        branch("feat/1243-break", { "b.txt": "b\n" }, "feat(tools)!: drop a flag");
        const r = run();
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /holds a breaking change; auto-merge is NOT on/);
        assert.equal(calls().filter((x) => x.a[1] === "merge").length, 0);
        assert.equal(calls().filter((x) => x.a[1] === "create").length, 1);
    });

    it("reminds about the real GPU when webgpu-graph-algorithms changes", () => {
        branch("fix/1242-gpu", { "webgpu-graph-algorithms/src/a.ts": "x\n" });
        const r = run();
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /changes webgpu-graph-algorithms; CI has no real GPU/);
    });
});
