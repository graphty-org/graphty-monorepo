// Tests of tools/claude-no-destructive-git.mjs: the banned git commands denied in every spelling,
// the allowed forms and quoted data allowed, and silence on bad input.
//
//   node --test tools/claude-no-destructive-git.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { gitRefusal, respond } from "./claude-no-destructive-git.mjs";

const HOOK = new URL("./claude-no-destructive-git.mjs", import.meta.url).pathname;
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

const DENIED = [
    "git stash",
    "git stash push -m wip",
    "git stash pop",
    "git -C .worktrees/x stash",
    "git -c core.pager=cat stash drop",
    "/usr/bin/git stash",
    "git reset --hard origin/master",
    "git reset HEAD file.ts",
    "git reset",
    "git restore file.ts",
    "git restore --source=HEAD -- file.ts",
    "git restore --staged --worktree file.ts",
    "git clean -fd",
    "git checkout -- file.ts",
    "git checkout .",
    "git checkout origin/master -- tools/x.mjs",
    "git checkout master",
    "git checkout -b x -- file.ts",
    "git cherry-pick abc123",
    "git rebase origin/master",
    "git commit --amend --no-edit",
    "cd x && git stash",
    "git status; git reset --hard",
    "if true; then git stash; fi",
    "for f in a b; do git checkout -- $f; done",
    "bash -c 'git stash'",
    'sh -c "git reset --hard"',
    "echo $(git stash)",
    "xargs git checkout --",
    "env GIT_DIR=x git reset --hard",
];

const ALLOWED = [
    "git status",
    "git add -A && git commit -m 'fix: x'",
    "git push origin HEAD",
    "git merge origin/master",
    "git checkout -b fix/do-thing origin/master",
    "git checkout -B x",
    "git switch master",
    "git switch -c x",
    "git worktree add .worktrees/x origin/master",
    "git restore --staged file.ts",
    "git restore -S file.ts",
    "git stash list",
    "git stash show -p stash@{0}",
    "git -C .worktrees/x stash list",
    "git clean -n",
    "git rebase --abort",
    "git cherry-pick --abort",
    "git log --oneline -- file.ts",
    "git diff HEAD -- file.ts",
    "git fetch origin",
    // Quoted data and here-documents are not commands.
    "git commit -m 'never git stash or git reset --hard'",
    'git commit -m "fix: refuse git checkout -- file and git commit --amend"',
    "git commit -F - <<'EOF'\nfix: git stash and git reset are refused\nEOF",
    "gh pr create --body 'run git rebase origin/master'",
    "grep -n 'git stash' tools/*.sh",
    "ls",
];

describe("claude-no-destructive-git", () => {
    it("denies the banned git commands", () => {
        for (const command of DENIED) {
            assert.ok(gitRefusal(bash(command)), command);
        }
        const out = JSON.parse(respond(bash("git stash")));
        assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
        assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
        assert.match(out.hookSpecificOutput.permissionDecisionReason, /stash/);
    });

    it("allows everything else", () => {
        for (const command of ALLOWED) {
            assert.equal(gitRefusal(bash(command)), null, command);
            assert.equal(respond(bash(command)), "", command);
        }
    });

    it("ignores other tools and malformed input", () => {
        assert.equal(respond({ tool_name: "Read", tool_input: { file_path: "git stash" } }), "");
        assert.equal(respond({ tool_name: "Bash", tool_input: {} }), "");
        assert.equal(respond(null), "");
    });

    it("runs as a hook: denies on stdout, exits 0, and stays silent on bad input", () => {
        const denied = spawnSync("node", [HOOK], { input: JSON.stringify(bash("git reset --hard")) });
        assert.equal(denied.status, 0);
        assert.equal(JSON.parse(denied.stdout).hookSpecificOutput.permissionDecision, "deny");
        const bad = spawnSync("node", [HOOK], { input: "not json" });
        assert.equal(bad.status, 0);
        assert.equal(bad.stdout.toString(), "");
    });
});
