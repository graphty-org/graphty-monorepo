// Tests of the rolling approval merge window (rolling-merge.mjs).
// Run: node tools/channel/rolling-merge.test.mjs
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { mergeWindow } from "./rolling-merge.mjs";

const ok = { branch: "visual/approve-rolling-0123456789ab", state: "OPEN", hold: null, releaseRuns: [] };

describe("mergeWindow", () => {
    it("merges a rolling approval with no candidate held and no full run going", () => {
        assert.equal(mergeWindow(ok).merge, true);
    });

    it("waits while nightly is held, and while a full run is between its pick and its verdict", () => {
        const held = mergeWindow({ ...ok, hold: { head: "f".repeat(40), issue: 7 } });
        assert.deepEqual([held.merge, held.retry], [false, true]);
        const running = mergeWindow({ ...ok, releaseRuns: [{ status: "in_progress", url: "https://gh/runs/1" }] });
        assert.deepEqual([running.merge, running.retry], [false, true]);
        assert.match(running.why, /runs\/1/);
    });

    it("refuses anything that is not an open rolling approval", () => {
        assert.deepEqual(mergeWindow({ ...ok, branch: "visual/approve-0123456789ab" }).merge, false);
        assert.deepEqual(mergeWindow({ ...ok, branch: "feat/x" }).retry, false);
        assert.deepEqual(mergeWindow({ ...ok, state: "MERGED" }).retry, false);
    });
});
