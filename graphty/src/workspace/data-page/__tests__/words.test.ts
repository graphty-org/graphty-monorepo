import { assert, describe, it } from "vitest";

import { roleWords } from "../words";

describe("the Data page's role words", () => {
    it("names the time role as a date, so a column of minutes is not taken for it", () => {
        assert.equal(roleWords("time"), "Date or time");
        assert.equal(roleWords("weight"), "Weight");
    });
});
