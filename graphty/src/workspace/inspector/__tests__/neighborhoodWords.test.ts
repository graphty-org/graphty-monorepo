import { assert, describe, it } from "vitest";

import { neighborhoodWords } from "../words";

describe("a neighborhood's heading", () => {
    it("names the center beside the count, so it adds up to the Selection count", () => {
        assert.equal(neighborhoodWords("Ava", 14, 2), "Ava and 14 connections within 2 hops");
        assert.equal(neighborhoodWords("Ava", 1), "Ava and 1 connection");
    });
});
