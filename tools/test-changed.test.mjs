// Tests of tools/test-changed.mjs's run arguments: a file-level run of a browser shard runs its selected
// files capped at 4 workers; other runs are unchanged.
//
//   node --test tools/test-changed.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { runArgs } from "./test-changed.mjs";

const cmd = "cd graphty && pnpm exec vitest run --project='!storybook' src/a.real-element.test.tsx";

describe("tools/test-changed.mjs runArgs", () => {
    it("runs a browser shard's selected files at 4 workers", () => {
        const p = { mode: "files", command: cmd, shard: { shard: "graphty-1", "needs-browser": true } };
        assert.deepEqual(runArgs(p), ["--command", "graphty-1", `${cmd} --maxWorkers=4`]);
    });
    it("leaves a Node shard's file-level command alone", () => {
        const p = {
            mode: "files",
            command: "cd layout && pnpm exec vitest run test/a.test.ts",
            shard: { shard: "layout" },
        };
        assert.deepEqual(runArgs(p), ["--command", "layout", p.command]);
    });
    it("runs a whole shard by name", () => {
        assert.deepEqual(
            runArgs({ mode: "all", shard: { shard: "graphty-element-browser-1", "needs-browser": true } }),
            ["graphty-element-browser-1"],
        );
    });
});
