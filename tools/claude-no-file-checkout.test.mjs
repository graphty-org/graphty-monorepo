// Tests of tools/claude-no-file-checkout.mjs: git commands that write individual files back from git or
// take one side of a conflict denied; whole-branch checkouts and everything else allowed; silence on bad input.
//
//   node --test tools/claude-no-file-checkout.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { fileCheckoutIn, respond } from "./claude-no-file-checkout.mjs";

const HOOK = new URL("./claude-no-file-checkout.mjs", import.meta.url).pathname;
const bash = (command) => ({ tool_name: "Bash", tool_input: { command } });

describe("claude-no-file-checkout", () => {
    it("denies file checkouts, restores and taking one side", () => {
        for (const command of [
            "git checkout --ours graphty-element/src/webgpu.ts",
            "git checkout --theirs graphty-element/api/index.api.md",
            "git add . && git checkout --ours a.ts && git commit",
            "git -C .worktrees/fix-1 checkout --theirs a.ts",
            "git checkout -- a.ts",
            "git checkout HEAD -- a.ts b.ts",
            "git checkout origin/master -- pnpm-lock.yaml",
            "git checkout origin/master pnpm-lock.yaml",
            "git checkout .",
            "git checkout -p a.ts",
            "git restore a.ts",
            "git restore --source=origin/master a.ts",
            "git restore --staged --worktree .",
            "git checkout-index -f a.ts",
            "git show HEAD:a.ts > a.ts",
            "git show origin/master:graphty/src/x.ts > graphty/src/x.ts",
            "git show :3:a.ts >a.ts",
            "cd x; if true; then git checkout --ours a.ts; fi",
        ]) {
            assert.ok(fileCheckoutIn(bash(command)), command);
        }
        const out = JSON.parse(respond(bash("git checkout --ours a.ts")));
        assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
        assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
        assert.match(out.hookSpecificOutput.permissionDecisionReason, /keeps both intents/);
        assert.match(out.hookSpecificOutput.permissionDecisionReason, /generator/);
    });

    it("allows whole-branch checkouts and other git commands", () => {
        for (const command of [
            "git checkout master",
            "git checkout fix/8889-no-file-checkout",
            "git checkout -b fix/1-x origin/master",
            "git checkout -B fix/1-x",
            "git checkout --detach origin/master",
            "git -C .worktrees/fix-1 checkout fix/1-x",
            "git switch fix/1-x",
            "git switch -c fix/1-x origin/master",
            "git show HEAD:a.ts",
            "git show HEAD:a.ts > tmp/x/old-a.ts",
            "git show HEAD:a.ts | diff - a.ts",
            "git show --stat HEAD > tmp/x/stat.txt",
            "git merge origin/master",
            "git diff -- a.ts",
            "git log --oneline -- a.ts",
            "git status 2>&1",
            "echo git checkout --ours is refused",
        ]) {
            assert.equal(fileCheckoutIn(bash(command)), null, command);
        }
        assert.equal(respond({ tool_name: "Read", tool_input: { file_path: "git restore a" } }), "");
    });

    it("allows malformed input silently", () => {
        for (const stdin of ["not json", "", "null", '{"tool_name":"Bash"}']) {
            const run = spawnSync("node", [HOOK], { input: stdin, encoding: "utf8" });
            assert.equal(run.status, 0, stdin);
            assert.equal(run.stdout, "", stdin);
        }
        const run = spawnSync("node", [HOOK], { input: JSON.stringify(bash("git restore a.ts")), encoding: "utf8" });
        assert.equal(JSON.parse(run.stdout).hookSpecificOutput.permissionDecision, "deny");
    });
});
