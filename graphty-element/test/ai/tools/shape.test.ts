/**
 * @file The query tool's records: a field asked for in the facts block's spelling (`data.weight`)
 * returns the attribute, under the name it was asked by, instead of being dropped.
 */

import { assert, describe, it } from "vitest";

import { compactRecord } from "../../../src/ai/tools/shape";

describe("compactRecord", () => {
    const edge = { id: "0", source: "1", target: "2", weight: 0.8 };

    it("reads a data. field from the record's bare attribute", () => {
        assert.deepStrictEqual(compactRecord(edge, ["source", "target", "data.weight"]), {
            source: "1",
            target: "2",
            "data.weight": 0.8,
        });
    });

    it("leaves out a field the record does not have", () => {
        assert.deepStrictEqual(compactRecord(edge, ["source", "data.latency", "latency"]), { source: "1" });
    });

    it("returns every field when none is asked for", () => {
        assert.deepStrictEqual(compactRecord(edge), edge);
    });
});
