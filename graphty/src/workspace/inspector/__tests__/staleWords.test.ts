import { assert, describe, it } from "vitest";

import { staleWords } from "../words";

describe("an out-of-date run's words", () => {
    it("says what changed in numbers when the scope changed", () => {
        assert.equal(
            staleWords({ reason: "scope-changed", ranOn: 20, nowVisible: 15 }),
            "Ran on 20 nodes; 15 shown now",
        );
    });

    it("says the data changed when it did", () => {
        assert.equal(staleWords({ reason: "data-changed", ranOn: 20, nowVisible: 20 }), "Data changed since this run");
    });
});
