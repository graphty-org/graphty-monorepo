/**
 * @file The edge set's change log: the pairs since a version, and when a reader has to start over (issue #9164).
 */
import { assert, describe, it } from "vitest";

import { EdgeSetLog } from "../../src/data/edgeSetLog";

describe("EdgeSetLog", () => {
    it("names the pairs changed since a version, newest first", () => {
        const log = new EdgeSetLog();
        log.record(0, 1, ["a", "b"]);
        log.record(1, 2, ["b", "c"]);
        log.record(2, 3, [1, 2]);

        assert.deepEqual(log.since(3, 3), []);
        assert.deepEqual(log.since(1, 3), [
            [1, 2],
            ["b", "c"],
        ]);
        assert.deepEqual(log.since(0, 3), [
            [1, 2],
            ["b", "c"],
            ["a", "b"],
        ]);
    });

    it("sends a reader back to the whole set after a change it was not told of", () => {
        const log = new EdgeSetLog();
        log.record(0, 1, ["a", "b"]);

        assert.isNull(log.since(0, 2), "version 2 came from an untold change");

        // A told change after the gap starts a new chain: older readers start over, newer ones follow.
        log.record(2, 3, ["c", "d"]);
        assert.isNull(log.since(1, 3));
        assert.deepEqual(log.since(2, 3), [["c", "d"]]);
    });

    it("forgets past its limit, and a reader older than what it kept starts over", () => {
        const log = new EdgeSetLog();
        for (let version = 0; version < 5000; version++) {
            log.record(version, version + 1, [version, version + 1]);
        }

        assert.isNull(log.since(0, 5000));
        assert.deepEqual(log.since(4999, 5000), [[4999, 5000]]);
    });
});
