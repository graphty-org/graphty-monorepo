import { assert, describe, it } from "vitest";

import { sliceAfter } from "../../../src/session/styles/repaint";

describe("sliceAfter", () => {
    it("keeps a page that answers at once to 8 ms, and takes a share of a long absence", () => {
        assert.strictEqual(sliceAfter(0), 8);
        assert.strictEqual(sliceAfter(16), 8);
        assert.strictEqual(sliceAfter(4000), 1000, "a pass waiting on 4 s frames does not take 36 of them");
    });
});
