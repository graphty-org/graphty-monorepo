// Tests of tools/claude-no-foreground-wait.mjs: foreground waits denied, the same commands in the
// background allowed, everything else allowed, and silence on bad input.
//
//   node --test tools/claude-no-foreground-wait.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { describe, it } from "node:test";

import { respond, waitIn } from "./claude-no-foreground-wait.mjs";

const HOOK = new URL("./claude-no-foreground-wait.mjs", import.meta.url).pathname;
const bash = (command, run_in_background) => ({ tool_name: "Bash", tool_input: { command, run_in_background } });
const WAITS = [
    'until grep -q "push exit" tmp/x/push.log; do sleep 20; done',
    "while ! test -f done; do sleep 5; done",
    "sleep 300",
    "sleep 90 && gh pr view 1",
    "sleep 20; git status; sleep 20",
    "sleep 1m",
    "gh run watch 123",
    "gh pr checks 42 --watch",
    "watch -n 5 git status",
    "tail -f tmp/x/push.log",
    "tail -F log",
    "tail --follow=name log",
    "tail -n0 -f log",
    "tail -fn0 log",
    "timeout 595 tail -n0 -f tmp/x.log",
    "timeout 590 grep -m1 done <(tail -f tmp/x.log)",
    "timeout 590 grep -m1 done tmp/x.log",
    "timeout 10m bash -c 'until test -f x; do :; done'",
    "timeout -s KILL 60 sh -c 'cat fifo'",
    "timeout 1h while true; do :; done",
    "inotifywait -e close_write tmp/x.log",
    "timeout 590 inotifywait tmp",
];

describe("claude-no-foreground-wait", () => {
    it("denies a foreground wait", () => {
        for (const command of WAITS) {
            assert.ok(waitIn(bash(command)), command);
        }
        const out = JSON.parse(respond(bash("sleep 300")));
        assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
        assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
        assert.match(out.hookSpecificOutput.permissionDecisionReason, /run_in_background/);
    });

    it("allows the same commands in the background", () => {
        for (const command of WAITS) {
            assert.equal(respond(bash(command, true)), "", command);
        }
    });

    it("allows short sleeps, loops that do not sleep, and other tools", () => {
        for (const command of [
            "sleep 2",
            "sleep 5 && curl -s localhost",
            "for f in *; do echo $f; done",
            "while read l; do echo $l; done < f",
            "npm run watch:css",
            "git log --oneline",
            "tail -n 50 file",
            "tail -n 5 log | grep -f patterns",
            "grep -m1 x file",
            "timeout 590 npx vitest run",
            "timeout 600 pnpm test",
            "timeout 300 node script.mjs",
            "timeout 20 tail -n 5 log | cat",
            "timeout 10 grep -m1 x <(cat log)",
            "timeout 600 bash script.sh",
        ]) {
            assert.equal(waitIn(bash(command)), null, command);
        }
        assert.equal(respond({ tool_name: "Read", tool_input: { file_path: "sleep 300" } }), "");
    });

    it("allows malformed input silently", () => {
        for (const stdin of ["not json", "", "null", '{"tool_name":"Bash"}']) {
            const run = spawnSync("node", [HOOK], { input: stdin, encoding: "utf8" });
            assert.equal(run.status, 0, stdin);
            assert.equal(run.stdout, "", stdin);
        }
        const run = spawnSync("node", [HOOK], { input: JSON.stringify(bash("sleep 300")), encoding: "utf8" });
        assert.equal(JSON.parse(run.stdout).hookSpecificOutput.permissionDecision, "deny");
    });
});
