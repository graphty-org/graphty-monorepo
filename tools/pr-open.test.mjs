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
if (a[0] === "pr" && a[1] === "view") process.stdout.write(process.env.FAKE_REVIEWS ?? "");
if (a[0] === "pr" && a[1] === "create") {
    fs.copyFileSync(a[a.indexOf("--body-file") + 1], ${JSON.stringify(join(dir, "body.md"))});
    process.stdout.write("https://github.com/o/r/pull/42\\n");
}
`,
);
chmodSync(join(bin, "gh"), 0o755);
// The fake review (tools/pr-review.sh): writes a report with a fixed marker, prints its path, exits FAKE_REVIEW_RC.
const review = join(dir, "review.sh");
const report = join(dir, "report.md");
writeFileSync(
    review,
    `#!/bin/bash
printf '<!-- fresh-review abc123 -->\\n\\nBlocking findings: 0\\n' > ${JSON.stringify(report)}
echo ${JSON.stringify(report)}
exit "\${FAKE_REVIEW_RC:-0}"
`,
);
chmodSync(review, 0o755);

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
        PR_OPEN_TITLE_LINT: "true",
        PR_OPEN_REVIEW: review,
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
const armed = () => calls().filter((x) => x.a[1] === "merge" && x.a.includes("--auto"));
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
        const r = run(undefined, { FAKE_EXISTING: "https://github.com/o/r/pull/7 graphty-agent" });
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
        assert.match(r.out, /auto-merge is NOT on for .*: it holds a breaking change/);
        assert.equal(armed().length, 0);
        assert.equal(calls().filter((x) => x.a[1] === "create").length, 1);
    });

    it("leaves auto-merge off, and turns it off, for a change to what judges a pull request", () => {
        branch("ci/1244-workflow", { ".github/workflows/ci.yml": "x\n" }, "ci(ci): change the gate");
        const r = run(undefined, { FAKE_EXISTING: "https://github.com/o/r/pull/8 graphty-agent" });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /changes what judges a pull request or guards the owner: \.github\/workflows\/ci\.yml/);
        assert.equal(armed().length, 0);
        assert.deepEqual(calls().find((x) => x.a[1] === "merge").a, [
            "pr",
            "merge",
            "https://github.com/o/r/pull/8",
            "--disable-auto",
        ]);
    });

    it("leaves auto-merge off for a path master's CODEOWNERS owns", () => {
        mkdirSync(join(work, ".github"), { recursive: true });
        writeFileSync(join(work, ".github/CODEOWNERS"), "# owned\n/nx.json @o\n**/.storybook/vitest.setup.* @o\n");
        git(work, "add", ".");
        git(work, "commit", "-q", "-m", "owners");
        git(work, "push", "-q", "origin", "master");
        branch("ci/1246-nx", { "nx.json": "{}\n", "graphty/.storybook/vitest.setup.ts": "x\n" }, "ci(ci): change nx");
        const r = run(undefined, { FAKE_EXISTING: "https://github.com/o/r/pull/9 graphty-agent" });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /guards the owner: graphty\/\.storybook\/vitest\.setup\.ts nx\.json/);
        assert.equal(armed().length, 0);
    });

    it("never arms auto-merge on a pull request someone else opened", () => {
        branch("fix/1245-owners");
        const r = run(undefined, { FAKE_EXISTING: "https://github.com/o/r/pull/9 apowers313" });
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /opened by apowers313, not by graphty-agent/);
        assert.equal(armed().length, 0);
    });

    it("takes the issue from --issue or the branch's config, and only right after the type prefix", () => {
        branch("docs/2026-10-25-notes");
        let r = run();
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /names no issue/, "a date is not an issue");
        r = run(["--proof", proof, "--issue", "4321"]);
        assert.equal(r.code, 0, r.out);
        assert.match(readFileSync(join(dir, "body.md"), "utf8"), /^Fixes #4321$/m);
        git(work, "checkout", "-q", "-b", "revert/abc1234");
        git(work, "commit", "-q", "--allow-empty", "-m", "revert: something");
        git(work, "config", "branch.revert/abc1234.issue", "777");
        rmSync(ghLog, { force: true });
        r = run();
        assert.equal(r.code, 0, r.out);
        assert.match(readFileSync(join(dir, "body.md"), "utf8"), /^Fixes #777$/m);
    });

    it("merges commits pushed to GitHub's copy of the branch (the owner's approvals) before pushing", () => {
        branch("fix/1246-approved");
        run();
        const other = join(dir, `other-${n}`);
        git(dir, "clone", "-q", "-b", "fix/1246-approved", git(work, "remote", "get-url", "origin"), other);
        writeFileSync(join(other, "approval.json"), "{}\n");
        git(other, "add", ".");
        git(other, "commit", "-q", "-m", "test(workspace): approve");
        git(other, "push", "-q", "origin", "fix/1246-approved");
        git(work, "commit", "-q", "--allow-empty", "-m", "fix(tools): more");
        const r = run();
        assert.equal(r.code, 0, r.out);
        assert.equal(git(work, "rev-parse", "origin/fix/1246-approved"), git(work, "rev-parse", "HEAD"));
        assert.equal(readFileSync(join(work, "approval.json"), "utf8"), "{}\n");
    });

    it("refuses a title Lint PR Title would reject, before opening anything", () => {
        branch("fix/1247-title", undefined, "wip");
        const r = run(undefined, { PR_OPEN_TITLE_LINT: "false" });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /Lint PR Title would reject "wip"; pass --title/);
        assert.throws(() => readFileSync(ghLog), undefined, "gh was not called");
    });

    it("lists at most 50 commits in the description", () => {
        branch("fix/1248-many");
        for (let i = 0; i < 54; i += 1) git(work, "commit", "-q", "--allow-empty", "-m", `fix(tools): step ${i}`);
        const r = run();
        assert.equal(r.code, 0, r.out);
        const body = readFileSync(join(dir, "body.md"), "utf8");
        assert.equal(body.match(/^- fix/gm).length, 50);
        assert.match(body, /^- and 5 more$/m);
    });

    it("posts the fresh review's report as a COMMENT review, once per patch id", () => {
        branch("fix/1249-review");
        let r = run();
        assert.equal(r.code, 0, r.out);
        const posted = calls().filter((x) => x.a[1] === "review");
        assert.equal(posted.length, 1);
        assert.deepEqual(posted[0].a, [
            "pr",
            "review",
            "https://github.com/o/r/pull/42",
            "--comment",
            "--body-file",
            report,
        ]);
        rmSync(ghLog, { force: true });
        r = run(undefined, {
            FAKE_EXISTING: "https://github.com/o/r/pull/42 graphty-agent",
            FAKE_REVIEWS: "old\n<!-- fresh-review abc123 -->\n",
        });
        assert.equal(r.code, 0, r.out);
        assert.equal(calls().filter((x) => x.a[1] === "review").length, 0, "the same patch id is not posted twice");
    });

    it("stops with exit 3 on a blocking review, pushing nothing, unless the findings are answered", () => {
        branch("fix/1250-blocked");
        let r = run(undefined, { FAKE_REVIEW_RC: "3" });
        assert.equal(r.code, 3, r.out);
        assert.match(r.out, /blocking findings/);
        assert.throws(() => readFileSync(ghLog), undefined, "gh was not called");
        r = run(["--proof", proof, "--review-answered"], { FAKE_REVIEW_RC: "3" });
        assert.equal(r.code, 0, r.out);
        assert.equal(armed().length, 1);
        r = run(undefined, { FAKE_REVIEW_RC: "1" });
        assert.equal(r.code, 1, r.out);
        assert.match(r.out, /the review failed/);
    });

    it("reminds about the real GPU when webgpu-graph-algorithms changes", () => {
        branch("fix/1242-gpu", { "webgpu-graph-algorithms/src/a.ts": "x\n" });
        const r = run();
        assert.equal(r.code, 0, r.out);
        assert.match(r.out, /changes webgpu-graph-algorithms; CI has no real GPU/);
    });
});
