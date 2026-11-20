// Shared plumbing for the Claude Code hooks in tools/claude-*.mjs: the PreToolUse deny decision and the
// entry point that reads the hook's JSON input from stdin.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * A PreToolUse decision that refuses the tool call.
 * @param reason - Why, shown to the session.
 * @returns The hook's JSON stdout.
 */
export function deny(reason) {
    return JSON.stringify({
        hookSpecificOutput: {
            hookEventName: "PreToolUse",
            permissionDecision: "deny",
            permissionDecisionReason: reason,
        },
    });
}

/**
 * Runs a hook when its module is the process's entry script: feeds stdin's JSON to respond and prints its
 * answer. Any failure exits 0 silently, so a broken hook never blocks a tool call.
 * @param moduleUrl - The hook module's import.meta.url.
 * @param respond - Maps the hook's input to its stdout ("" for no output).
 */
export function runHook(moduleUrl, respond) {
    if (process.argv[1] !== fileURLToPath(moduleUrl)) {
        return;
    }
    try {
        process.stdout.write(respond(JSON.parse(readFileSync(0, "utf8"))));
    } catch {
        // Never block a tool call because the hook itself failed.
    }
    process.exit(0);
}
