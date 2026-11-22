// Tests of tools/test-changed.mjs: a file-level run of a browser shard runs its selected files capped at 4
// workers, and a whole browser shard is left to CI unless asked for; other runs are unchanged.
//
//   node --test tools/test-changed.test.mjs   (part of pnpm run test:ci-workflows)
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { parallelRuns, pool, runArgs, startOrder, withoutWholeBrowserShards } from "./test-changed.mjs";

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

describe("tools/test-changed.mjs withoutWholeBrowserShards", () => {
    const browser = { shard: "graphty-element-browser-1", package: "graphty-element", "needs-browser": true };
    it("leaves a whole browser shard to CI when it has no file-level answer", () => {
        const [p] = withoutWholeBrowserShards([{ shard: browser, mode: "all", files: [], covers: [browser.shard] }]);
        assert.equal(p.mode, "none");
        assert.equal(p.leftToCi, true);
    });
    it("keeps a whole Node shard whole", () => {
        const node = { shard: "layout", package: "layout" };
        const [p] = withoutWholeBrowserShards([{ shard: node, mode: "all", files: [], covers: ["layout"] }]);
        assert.equal(p.mode, "all");
    });
});

describe("tools/test-changed.mjs side-by-side runs", () => {
    it("runs half the machine's test slots at once, at least one", () => {
        assert.equal(parallelRuns(4), 2);
        assert.equal(parallelRuns(1), 1);
        assert.equal(parallelRuns(0), Infinity);
    });
    it("starts browser runs first", () => {
        const runs = [{ shard: { shard: "a" } }, { shard: { shard: "b", "needs-browser": true } }];
        assert.deepEqual(
            startOrder(runs).map((r) => r.shard.shard),
            ["b", "a"],
        );
    });
    it("never has more than the limit in flight and keeps the results in order", async () => {
        let inFlight = 0;
        let most = 0;
        const results = await pool([1, 2, 3, 4, 5], 2, async (n) => {
            inFlight++;
            most = Math.max(most, inFlight);
            await new Promise((r) => setImmediate(r));
            inFlight--;
            return n * 10;
        });
        assert.equal(most, 2);
        assert.deepEqual(results, [10, 20, 30, 40, 50]);
    });
});
