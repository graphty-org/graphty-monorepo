// Tests of tools/claude-area-rules.mjs: a path in, the expected rule (or nothing) out, each rule
// once per session, and silence on bad input.
//
//   node --test tools/claude-area-rules.test.mjs
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";

import { loadRules, matchRules, respond } from "./claude-area-rules.mjs";

const HOOK = new URL("./claude-area-rules.mjs", import.meta.url).pathname;
const ROOT = new URL("..", import.meta.url).pathname;
const at = (rel) => join(ROOT, rel);
const names = (file) => matchRules(file).map((rule) => rule.name);

describe("claude-area-rules", () => {
    it("reads every rule's globs and paragraph", () => {
        for (const rule of loadRules()) {
            assert.ok(rule.globs.length > 0, `${rule.name} has paths`);
            assert.ok(rule.text.length > 0 && !rule.text.includes("\n\n"), `${rule.name} is one paragraph`);
        }
    });

    it("matches each area and nothing else", () => {
        assert.deepEqual(names(at("layout/test/forceatlas2.test.ts")), ["tests.md"]);
        assert.deepEqual(names(at("graphty/src/App.spec.tsx")), ["tests.md"]);
        assert.deepEqual(names(at("tools/claude-area-rules.test.mjs")), ["tests.md"]);
        assert.deepEqual(names(at("graphty-element/src/events.ts")), ["events.md"]);
        assert.deepEqual(names(at("graphty-element/src/managers/EventManager.ts")), ["events.md"]);
        assert.deepEqual(names(at("graphty-element/src/session/runs/Run.ts")), ["result-builders.md"]);
        assert.deepEqual(names(at("graphty-element/src/algorithms/AlgorithmResult.ts")), ["result-builders.md"]);
        assert.deepEqual(names(at("graphty-element/src/cost/estimate.ts")), ["result-builders.md"]);
        assert.deepEqual(names(at("graphty-element/src/Graph.ts")), []);
        assert.deepEqual(names(at("graphty/src/session/Thing.ts")), []);
        assert.deepEqual(names("/somewhere/else/x.test.ts"), []);
    });

    it("strips a worktree prefix", () => {
        assert.deepEqual(names(at(".worktrees/some-branch/graphty-element/src/events.ts")), ["events.md"]);
        assert.deepEqual(names(at(".claude/worktrees/agent-1/graphty-element/src/events.ts")), ["events.md"]);
    });

    it("emits a rule once per session", () => {
        const dir = mkdtempSync(join(tmpdir(), "claude-area-rules-"));
        const edit = (session, rel) => respond({ session_id: session, tool_input: { file_path: at(rel) } }, ROOT, dir);
        const first = JSON.parse(edit("a", "layout/test/x.test.ts"));
        assert.equal(first.hookSpecificOutput.hookEventName, "PostToolUse");
        assert.match(first.hookSpecificOutput.additionalContext, /never on time/);
        assert.equal(edit("a", "layout/test/y.test.ts"), "");
        assert.match(edit("a", "graphty-element/src/events.ts"), /event type map/);
        assert.match(edit("b", "layout/test/x.test.ts"), /never on time/);
        assert.equal(edit("a", "README.md"), "");
    });

    it("exits 0 silently on bad input or no match", () => {
        for (const stdin of [
            "not json",
            "{}",
            JSON.stringify({ session_id: "s", tool_input: { file_path: at("README.md") } }),
        ]) {
            const r = spawnSync("node", [HOOK], { input: stdin, encoding: "utf8" });
            assert.equal(r.status, 0);
            assert.equal(r.stdout, "");
        }
    });
});
