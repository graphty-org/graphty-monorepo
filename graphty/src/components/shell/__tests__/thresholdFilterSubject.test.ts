import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import { thresholdFilterSubject } from "../thresholdFilterSubject";

/**
 * A session whose results answer one run's path, and nothing else.
 * @param run - the run that has a path.
 * @param path - its path.
 * @returns the stand-in session.
 */
function sessionWithPath(run: string, path: string): GraphSession {
    const results = { path: (id: string): string | undefined => (id === run ? path : undefined) };

    return { results } as unknown as GraphSession;
}

describe("the threshold filter chip's subject", () => {
    const session = sessionWithPath("run-1", "results.run-1.score");

    it("names the result on screen when the filter reads its run", () => {
        assert.strictEqual(
            thresholdFilterSubject({ title: "Most connected", runId: "run-1" }, session, "results.run-1.score"),
            "Most connected",
        );
    });

    it('says "Result" when the result on screen reads another run', () => {
        assert.strictEqual(
            thresholdFilterSubject({ title: "Most connected", runId: "run-2" }, session, "results.run-1.score"),
            "Result",
        );
    });

    it('says "Result" when the result on screen has no run, or there is none', () => {
        assert.strictEqual(thresholdFilterSubject({ title: "Groups" }, session, "results.run-1.score"), "Result");
        assert.strictEqual(thresholdFilterSubject(null, session, "results.run-1.score"), "Result");
    });

    it('says "Result" before the element has a session', () => {
        assert.strictEqual(
            thresholdFilterSubject({ title: "Most connected", runId: "run-1" }, null, "results.run-1.score"),
            "Result",
        );
    });
});
