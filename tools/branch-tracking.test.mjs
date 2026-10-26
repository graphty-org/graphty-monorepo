// Tests of the branch-tracking hooks and tools on throwaway repositories: the never-copy hooks
// (tools/no-copy.sh), the post-commit push (tools/branch-push.sh), tools/worktree-new.sh's issue
// requirement and tools/branch-note.mjs, with a fake gh that keeps issues in a JSON file.
//
//   node tools/branch-tracking.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
    chmodSync,
    copyFileSync,
    existsSync,
    mkdirSync,
    mkdtempSync,
    readFileSync,
    rmSync,
    symlinkSync,
    watch,
    writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { after, before, beforeEach, describe, it } from "node:test";

import { issueInName, noteBody, parseNote } from "./branch-note.mjs";
import { isolatedGitEnv } from "./isolated-git-env.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const dir = mkdtempSync(join(tmpdir(), "branch-tracking-"));
after(() => rmSync(dir, { recursive: true, force: true }));

// The fake gh: issues and every call in $FAKE_GH_STATE.
const bin = join(dir, "bin");
const state = join(dir, "gh-state.json");
mkdirSync(bin);
writeFileSync(
    join(bin, "gh"),
    `#!/usr/bin/env node
const fs = require("node:fs");
const file = process.env.FAKE_GH_STATE;
const s = JSON.parse(fs.readFileSync(file, "utf8"));
const args = process.argv.slice(2);
s.calls.push(args);
const field = (name) => args.find((a) => a.startsWith(name + "="))?.slice(name.length + 1);
const all = (name) => args.filter((a) => a.startsWith(name + "=")).map((a) => a.slice(name.length + 1));
const path = args.find((a) => a.startsWith("repos/")) ?? "";
let out = "";
let m;
if (args[1] === "graphql") {
    const repository = {};
    for (const [, alias, n] of field("query").matchAll(/(i\\d+): issue\\(number: (\\d+)\\)/g)) {
        const i = s.issues[n];
        repository[alias] = i && { number: Number(n), title: i.title, state: "OPEN",
            labels: { nodes: i.labels.map((name) => ({ name })) },
            comments: { nodes: i.comments.map((c) => ({ databaseId: c.id, body: c.body })) } };
    }
    out = JSON.stringify({ data: { repository } });
} else if ((m = /issues\\/(\\d+)\\/comments$/.exec(path))) {
    const id = ++s.nextId;
    s.issues[m[1]].comments.push({ id, body: field("body") });
    out = JSON.stringify({ id });
} else if ((m = /issues\\/comments\\/(\\d+)$/.exec(path))) {
    for (const i of Object.values(s.issues)) for (const c of i.comments) if (c.id === Number(m[1])) c.body = field("body");
} else if ((m = /issues\\/(\\d+)\\/labels$/.exec(path))) {
    s.issues[m[1]].labels.push(...all("labels[]"));
} else if (/issues$/.test(path)) {
    const number = 900 + Object.keys(s.issues).length;
    s.issues[number] = { title: field("title"), labels: all("labels[]"), comments: [] };
    out = JSON.stringify({ number });
} else {
    process.stderr.write("fake gh: unknown call " + args.join(" ") + "\\n");
    process.exit(1);
}
fs.writeFileSync(file, JSON.stringify(s));
process.stdout.write(out);
`,
);
chmodSync(join(bin, "gh"), 0o755);
writeFileSync(join(bin, "pnpm"), "#!/bin/sh\nexit 0\n");
chmodSync(join(bin, "pnpm"), 0o755);

const env = {
    ...isolatedGitEnv(),
    PATH: `${bin}:${process.env.PATH}`,
    FAKE_GH_STATE: state,
    CLAUDE_CODE_SESSION_ID: "test-session",
    HUSKY: "",
    // tools/worktree-new.sh hands itself to the live copy: none here, so this checkout's copy runs.
    LAND_LIVE: join(dir, "no-live-copy"),
};
const gh = () => JSON.parse(readFileSync(state, "utf8"));
const issue = (title) => ({ title, labels: [], comments: [] });
const run = (cwd, cmd, ...args) => spawnSync(cmd, args, { cwd, env, encoding: "utf8" });
const git = (cwd, ...args) => {
    const r = run(cwd, "git", ...args);
    assert.equal(r.status, 0, `git ${args.join(" ")}: ${r.stderr}`);
    return r.stdout.trim();
};
/**
 * Waits until `cond` holds, looking again whenever a file in `watched` changes (the hook's log).
 * @param watched a directory
 * @param cond the condition
 * @returns a promise that settles when it holds
 */
const until = (watched, cond) =>
    new Promise((resolve) => {
        const w = watch(watched, () => cond() && (w.close(), resolve()));
        if (cond()) (w.close(), resolve());
    });

/**
 * A repository with a bare origin, `tools` linked to this checkout's tools, and the given hooks of
 * this checkout's .husky as its hooks.
 * @param name its directory
 * @param hooks the .husky files to use
 * @returns its path
 */
function repoWith(name, hooks) {
    const origin = join(dir, `${name}.git`);
    const repo = join(dir, name);
    git(dir, "init", "-q", "--bare", "-b", "master", origin);
    git(dir, "clone", "-q", origin, repo);
    symlinkSync(join(root, "tools"), join(repo, "tools"));
    writeFileSync(join(repo, ".git/info/exclude"), "tools\n.worktrees/\ntmp/\n");
    const hookDir = join(dir, `${name}-hooks`);
    mkdirSync(hookDir);
    for (const h of hooks) copyFileSync(join(root, ".husky", h), join(hookDir, h));
    git(repo, "config", "core.hooksPath", hookDir);
    writeFileSync(join(repo, "a.txt"), "one\n");
    git(repo, "add", "a.txt");
    git(repo, "commit", "-q", "-m", "base");
    git(repo, "push", "-q", "-u", "origin", "master");
    return repo;
}

beforeEach(() =>
    writeFileSync(state, JSON.stringify({ calls: [], nextId: 0, issues: { 512: issue("t"), 77: issue("u") } })),
);

describe("never copy", () => {
    let repo;
    before(() => {
        // .husky/pre-commit's first check, alone: its other checks need the repository's node_modules.
        assert.match(readFileSync(join(root, ".husky/pre-commit"), "utf8"), /^\.\/tools\/no-copy\.sh \|\| exit 1$/m);
        repo = repoWith("copy", ["prepare-commit-msg", "pre-rebase"]);
        writeFileSync(join(dir, "copy-hooks/pre-commit"), "#!/bin/sh\n./tools/no-copy.sh || exit 1\n", { mode: 0o755 });
        git(repo, "checkout", "-q", "-b", "side");
        writeFileSync(join(repo, "b.txt"), "b\n");
        git(repo, "add", "b.txt");
        git(repo, "commit", "-q", "-m", "side: b");
        writeFileSync(join(repo, "a.txt"), "side\n");
        git(repo, "commit", "-q", "-am", "side: a");
        git(repo, "checkout", "-q", "master");
        writeFileSync(join(repo, "a.txt"), "master\n");
        git(repo, "commit", "-q", "-am", "master: a");
    });

    it("refuses a cherry-pick that applies cleanly, saying to merge", () => {
        const head = git(repo, "rev-parse", "HEAD");
        const r = run(repo, "git", "cherry-pick", "side~1");
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, /a cherry-pick copies commits under new ids\. Never copy, always merge/);
        git(repo, "cherry-pick", "--abort");
        assert.equal(git(repo, "rev-parse", "HEAD"), head);
    });

    it("refuses the commit that ends a conflicted cherry-pick, even with --no-verify", () => {
        assert.notEqual(run(repo, "git", "cherry-pick", "side").status, 0, "it conflicts");
        writeFileSync(join(repo, "a.txt"), "both\n");
        git(repo, "add", "a.txt");
        const r = run(repo, "git", "commit", "-q", "--no-edit");
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, /Last resort only: git cherry-pick -n, then git commit --no-verify/);
        assert.notEqual(run(repo, "git", "commit", "-q", "--no-verify", "--no-edit").status, 0);
        git(repo, "cherry-pick", "--abort");
    });

    it("lets the documented last resort through: cherry-pick -n, then commit --no-verify", () => {
        git(repo, "cherry-pick", "-n", "side~1");
        git(repo, "commit", "-q", "--no-verify", "-m", "a deliberate copy");
        assert.ok(existsSync(join(repo, "b.txt")));
        git(repo, "reset", "-q", "--hard", "HEAD~1");
    });

    it("refuses a rebase before it starts; a merge goes through", () => {
        git(repo, "checkout", "-q", "side");
        const head = git(repo, "rev-parse", "HEAD");
        const r = run(repo, "git", "rebase", "master");
        assert.notEqual(r.status, 0);
        assert.match(r.stderr, /a rebase copies commits under new ids/);
        assert.equal(git(repo, "rev-parse", "HEAD"), head);
        git(repo, "checkout", "-q", "master");
        git(repo, "merge", "-q", "--no-edit", "-X", "theirs", "side~1");
        assert.ok(existsSync(join(repo, "b.txt")));
    });
});

describe("the post-commit push", () => {
    let repo;
    let log;
    before(() => {
        repo = repoWith("push", ["post-commit"]);
        log = join(repo, "tmp/branch-push.log");
    });
    const logText = () => (existsSync(log) ? readFileSync(log, "utf8") : "");
    const commit = (file) => {
        writeFileSync(join(repo, file), `${file}\n`);
        git(repo, "add", file);
        git(repo, "commit", "-q", "-m", `feat: ${file}`);
        return git(repo, "rev-parse", "HEAD");
    };
    const finished = (n) => () => (logText().match(/^finished /gm) ?? []).length >= n;

    it("pushes the branch with its upstream and writes the latest commit into its issue's note", async () => {
        git(repo, "checkout", "-q", "-b", "feat/512-thing");
        const sha = commit("c1.txt");
        await until(dirname(log), finished(1));
        assert.match(logText(), /^pushed feat\/512-thing$/m);
        assert.equal(git(repo, "rev-parse", "origin/feat/512-thing"), sha);
        assert.equal(git(repo, "rev-parse", "--abbrev-ref", "@{upstream}"), "origin/feat/512-thing");
        const [note] = gh().issues[512].comments;
        assert.match(note.body, /^<!-- branch-note: feat\/512-thing -->/);
        assert.equal(parseNote(note.body)["latest commit"].split(" ")[0], sha.slice(0, 7));
    });

    it("pushes again on the next commit, but leaves the note alone for ten minutes", async () => {
        const calls = gh().calls.length;
        const sha = commit("c2.txt");
        await until(dirname(log), finished(2));
        assert.equal(git(repo, "rev-parse", "origin/feat/512-thing"), sha);
        assert.equal(gh().calls.length, calls, "no GitHub call");
    });

    it("merges the branch's newer commits on GitHub (the owner's Finish, a merge of master) before it pushes", async () => {
        const other = join(dir, "push-other");
        git(dir, "clone", "-q", "-b", "feat/512-thing", join(dir, "push.git"), other);
        writeFileSync(join(other, "synced.txt"), "from golden\n");
        git(other, "add", "synced.txt");
        git(other, "commit", "-q", "-m", "Merge golden");
        git(other, "push", "-q", "origin", "feat/512-thing");
        const theirs = git(other, "rev-parse", "HEAD");
        const n = (logText().match(/^finished /gm) ?? []).length;
        // The merge is made in the hook, before the commit command returns.
        const head = commit("c3.txt");
        await until(dirname(log), finished(n + 1));
        assert.match(logText(), /feat\/512-thing: merged origin\/feat\/512-thing/);
        assert.equal(git(repo, "rev-parse", "HEAD^2"), theirs, "a merge, not a rebase");
        assert.equal(git(repo, "log", "-1", "--format=%s", "HEAD^1"), "feat: c3.txt");
        assert.equal(git(repo, "rev-parse", "origin/feat/512-thing"), head, "the merge is pushed");
        assert.ok(existsSync(join(repo, "synced.txt")));

        // With uncommitted changes nothing is merged: the push fails and says why.
        writeFileSync(join(other, "synced2.txt"), "again\n");
        git(other, "add", "synced2.txt");
        git(other, "commit", "-q", "-m", "Merge golden again");
        git(other, "pull", "-q", "--no-rebase", "--no-edit", "origin", "feat/512-thing");
        git(other, "push", "-q", "origin", "feat/512-thing");
        writeFileSync(join(repo, "a.txt"), "edited, not committed\n");
        const sha4 = commit("c4.txt");
        await until(dirname(log), finished(n + 2));
        assert.match(logText(), /not merged \(uncommitted changes or a merge in progress\)/);
        assert.match(logText(), /push of feat\/512-thing failed/);
        assert.equal(git(repo, "rev-parse", "HEAD"), sha4, "nothing merged");
        writeFileSync(join(repo, "a.txt"), "one\n");
    });

    it("never pushes golden, golden-cut, golden-verified, master or a detached HEAD", () => {
        const before = logText();
        for (const b of ["golden", "golden-cut", "golden-verified", "master"]) {
            git(repo, "checkout", "-q", "-B", b);
            commit(`${b}.txt`);
        }
        git(repo, "checkout", "-q", "--detach");
        commit("detached.txt");
        // The hook returns before it starts anything in the background for these.
        assert.equal(logText(), before);
        assert.equal(run(repo, "git", "rev-parse", "-q", "--verify", "origin/golden").status, 1);
    });
});

describe("tools/worktree-new.sh", () => {
    let repo;
    before(() => {
        repo = repoWith("wt", []);
    });
    const script = join(root, "tools/worktree-new.sh");
    const make = (...args) => run(repo, script, ...args);

    it("refuses a branch with no issue, and makes nothing", () => {
        const r = make("feat/no-number");
        assert.equal(r.status, 1);
        assert.match(r.stderr, /every branch belongs to an issue/);
        assert.match(r.stderr, /--issue N/);
        assert.match(r.stderr, /--new-issue/);
        assert.ok(!existsSync(join(repo, ".worktrees/feat-no-number")));
        assert.equal(run(repo, "git", "rev-parse", "-q", "--verify", "feat/no-number").status, 1);
    });

    it("takes the issue from the branch's name, pushes the branch, labels the issue and writes its note", () => {
        const r = make("feat/512-thing", "origin/master");
        assert.equal(r.status, 0, r.stderr);
        const wt = join(repo, ".worktrees/feat-512-thing");
        assert.equal(git(wt, "rev-parse", "--abbrev-ref", "@{upstream}"), "origin/feat/512-thing");
        assert.equal(git(repo, "config", "branch.feat/512-thing.issue"), "512");
        const i = gh().issues[512];
        assert.deepEqual(i.labels, ["in-progress"]);
        assert.equal(i.comments.length, 1);
        const note = parseNote(i.comments[0].body);
        assert.equal(note.branch, "feat/512-thing");
        assert.equal(note.worktree, wt);
        assert.equal(note.owner, "session test-session");
        assert.match(note["latest commit"], /base/);
        assert.match(
            i.comments[0].body,
            /- done: \(not written yet\)\n- left: \(not written yet\)\n- next: \(not written yet\)/,
        );
    });

    it("takes --issue, and --owner for the note", () => {
        const r = make("chore/tidy", "origin/master", "--issue", "77", "--owner", "the owner");
        assert.equal(r.status, 0, r.stderr);
        assert.equal(parseNote(gh().issues[77].comments[0].body).owner, "the owner");
    });

    it("opens an issue with type, priority and effort labels for --new-issue", () => {
        const r = make("fix/flaky-thing", "--new-issue", "A flaky thing");
        assert.equal(r.status, 0, r.stderr);
        const [n, i] = Object.entries(gh().issues).find(([, x]) => x.title === "A flaky thing");
        assert.deepEqual(i.labels, ["bug", "priority:medium", "effort:medium", "in-progress"]);
        assert.equal(git(repo, "config", "branch.fix/flaky-thing.issue"), n);
        assert.match(r.stdout, new RegExp(`issue #${n}`));
    });

    it("starts a new branch from master even when GitHub has golden-verified", () => {
        git(repo, "commit", "-q", "--allow-empty", "-m", "verified on golden");
        git(repo, "push", "-q", "origin", "HEAD:golden-verified");
        const r = make("feat/513-on-master");
        assert.equal(r.status, 0, r.stderr);
        const master = git(repo, "rev-parse", "origin/master");
        const wt = join(repo, ".worktrees/feat-513-on-master");
        assert.equal(git(wt, "merge-base", "HEAD", "origin/master"), master);
        assert.equal(git(repo, "config", "--default", "", "branch.feat/513-on-master.prBase"), "");
    });

    it("starts from golden-verified when asked, measured as a branch of golden", () => {
        const verified = git(repo, "rev-parse", "origin/golden-verified");
        const r = make("feat/516-on-verified", "origin/golden-verified");
        assert.equal(r.status, 0, r.stderr);
        assert.equal(git(join(repo, ".worktrees/feat-516-on-verified"), "rev-parse", "HEAD"), verified);
        assert.equal(git(repo, "config", "branch.feat/516-on-verified.prBase"), "golden");
    });

    it("hands itself to the live copy with the same arguments and directory, passing its exit code", () => {
        const live = join(dir, "wt-live");
        const record = join(dir, "wt-live-record");
        mkdirSync(join(live, "tools"), { recursive: true });
        writeFileSync(
            join(live, "tools/worktree-new.sh"),
            `#!/bin/sh\nprintf '%s|' "$@" "$PWD" "$WORKTREE_NEW_LIVE_COPY" > ${record}\nexit 7\n`,
        );
        chmodSync(join(live, "tools/worktree-new.sh"), 0o755);
        const r = spawnSync(script, ["feat/514-x", "--issue", "514"], {
            cwd: repo,
            env: { ...env, LAND_LIVE: live },
            encoding: "utf8",
        });
        assert.equal(r.status, 7, r.stderr);
        const seen = readFileSync(record, "utf8");
        assert.equal(seen, `feat/514-x|--issue|514|${repo}|${join(live, "tools/worktree-new.sh")}|`);
        assert.doesNotMatch(r.stderr, /no live copy/);
    });

    it("runs itself with one warning line when there is no live copy", () => {
        const r = make("feat/no-number-either");
        assert.equal(r.status, 1);
        const lines = r.stderr.trim().split("\n");
        assert.match(lines[0], /^tools\/worktree-new\.sh: no live copy at .*no-live-copy.*; running .* instead$/);
        assert.match(lines[1], /every branch belongs to an issue/);
    });

    it("never loops: a live copy that is this script runs once", () => {
        const copy = join(dir, "wt-live-real");
        mkdirSync(join(copy, "tools"), { recursive: true });
        copyFileSync(script, join(copy, "tools/worktree-new.sh"));
        const r = spawnSync(join(copy, "tools/worktree-new.sh"), ["feat/no-number-again"], {
            cwd: repo,
            env: { ...env, LAND_LIVE: copy },
            encoding: "utf8",
        });
        assert.equal(r.status, 1, r.stderr);
        assert.equal(r.stderr.match(/every branch belongs/g).length, 1, r.stderr);
        assert.doesNotMatch(r.stderr, /no live copy/);
        const handed = spawnSync(script, ["feat/no-number-again"], {
            cwd: repo,
            env: { ...env, LAND_LIVE: copy },
            encoding: "utf8",
        });
        assert.equal(handed.status, 1, handed.stderr);
        assert.equal(handed.stderr.match(/every branch belongs/g).length, 1, handed.stderr);
    });

    it("makes golden's worktree with no issue and no push", () => {
        const r = make("golden", "origin/master", "golden-local");
        assert.equal(r.status, 0, r.stderr);
        assert.equal(run(repo, "git", "rev-parse", "-q", "--verify", "origin/golden").status, 1);
        assert.equal(gh().calls.length, 0);
    });
});

describe("tools/branch-note.mjs", () => {
    const note = join(root, "tools/branch-note.mjs");

    it("update edits the one note in place, keeping what it does not set", () => {
        const wt = join(dir, "wt/.worktrees/feat-512-thing");
        writeFileSync(
            state,
            JSON.stringify({
                calls: [],
                nextId: 1,
                issues: {
                    512: {
                        ...issue("t"),
                        comments: [{ id: 1, body: noteBody("feat/512-thing", { owner: "session s1" }) }],
                    },
                },
            }),
        );
        const r = run(wt, process.execPath, note, "update", "--done", "the parser", "--next", "the tests");
        assert.equal(r.status, 0, r.stderr);
        const { comments } = gh().issues[512];
        assert.equal(comments.length, 1);
        const fields = parseNote(comments[0].body);
        assert.equal(fields.owner, "session s1");
        assert.equal(fields.done, "the parser");
        assert.equal(fields.next, "the tests");
        assert.equal(fields.left, undefined);
    });

    it("has no busy command, and drops a note's old busy and sync lines on its next write", () => {
        const wt = join(dir, "wt/.worktrees/feat-512-thing");
        const old = `${noteBody("feat/512-thing", { owner: "session s1" })}- busy: until 2099-01-01T00:00:00Z -- x\n- sync: synced\n`;
        writeFileSync(
            state,
            JSON.stringify({
                calls: [],
                nextId: 1,
                issues: { 512: { ...issue("t"), comments: [{ id: 1, body: old }] } },
            }),
        );
        assert.equal(run(wt, process.execPath, note, "busy", "--until", "24h", "--reason", "x").status, 1);
        assert.equal(run(wt, process.execPath, note, "update", "--done", "d").status, 0);
        const body = gh().issues[512].comments[0].body;
        assert.doesNotMatch(body, /^- (busy|sync):/m);
        assert.equal(parseNote(body).owner, "session s1");
        assert.equal(parseNote(body).done, "d");
    });

    it("finds the issue number in a branch's name", () => {
        assert.equal(issueInName("fix/1234-scroll"), 1234);
        assert.equal(issueInName("issue-321"), 321);
        assert.equal(issueInName("feat/v2-api"), null);
    });
});
