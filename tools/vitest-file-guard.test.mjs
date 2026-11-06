// node --test tools/vitest-file-guard.test.mjs   (part of pnpm run test:ci-workflows)
// A real run against a blocked page: graphty/test/file-guard.test.ts.
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { FILE_GUARD_MS, TEST_GUARD_MS } from "./test-wait-guard.mjs";
import setup, { FileGuard, hangMessage } from "./vitest-file-guard.mjs";

/**
 * A stand-in for vitest's TestModule.
 * @param pending - the full names of the tests with no result
 * @param project - the project's name
 * @returns the module
 */
const fileOf = (pending, project = "real-element (chromium)") => ({
    id: pending.join() || "imports",
    relativeModuleId: "src/a.test.tsx",
    project: { name: project },
    children: { allTests: (state) => (state === "pending" ? pending.map((fullName) => ({ fullName })) : []) },
});

describe("vitest-file-guard", () => {
    it("sits above the test guard, so a test the page can still time out is ended by it", () => {
        assert.ok(FILE_GUARD_MS > TEST_GUARD_MS);
    });

    it("names the test a file had reached, or says it never finished importing", () => {
        assert.equal(
            hangMessage(fileOf(["slow one", "next one"]), 2000),
            "[HANG] src/a.test.tsx ran past the 2 s file guard; it had reached test: slow one",
        );
        assert.match(hangMessage(fileOf([]), 2000), /no test: it never finished importing/);
    });

    it("is overdue only for a file still running at its limit", () => {
        let now = 0;
        const guard = new FileGuard({ limit: 10, now: () => now });
        const ended = fileOf(["ended"]);
        const running = fileOf(["running"]);
        guard.onTestModuleQueued(ended);
        now = 5;
        guard.onTestModuleQueued(running);
        now = 12;
        guard.onTestModuleEnd(ended);
        assert.equal(guard.overdue(), undefined);
        now = 15;
        assert.match(guard.overdue(), /reached test: running/);
    });

    it("reads the tests from the module vitest collected, not the empty one it queued", () => {
        let now = 0;
        const guard = new FileGuard({ limit: 10, now: () => now });
        guard.onTestModuleQueued({ ...fileOf(["blocks"]), children: { allTests: () => [] } });
        guard.onTestModuleCollected(fileOf(["blocks"]));
        now = 10;
        assert.match(guard.overdue(), /reached test: blocks/);
    });

    it("never stops a measurement", () => {
        let now = 0;
        const guard = new FileGuard({ limit: 10, now: () => now });
        guard.onTestModuleQueued(fileOf(["measures"], "bench-browser (chromium)"));
        now = 1000;
        assert.equal(guard.overdue(), undefined);
    });

    it("watches a run once, however many projects start it, and never watch mode", () => {
        const vitest = { reporters: [], config: {} };
        setup({ vitest });
        setup({ vitest });
        assert.equal(vitest.reporters.length, 1);
        const watching = { reporters: [], config: { watch: true } };
        setup({ vitest: watching });
        assert.equal(watching.reporters.length, 0);
    });
});
