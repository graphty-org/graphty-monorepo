/**
 * The words beside a note's target chip: a target a filter or the time window hides is still in the
 * graph, so it is said to be hidden, never missing.
 */
import { assert, describe, it } from "vitest";

import { targetStateWords } from "../words";

describe("a note target's state in words", () => {
    it("says a hidden target is hidden, not gone from the graph", () => {
        assert.strictEqual(targetStateWords("filtered"), "Hidden now");
        assert.strictEqual(targetStateWords("missing"), "Not in the data");
        assert.isNull(targetStateWords("present"));
    });
});
