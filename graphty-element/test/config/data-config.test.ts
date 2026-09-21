import { assert, describe, it } from "vitest";

import { DataConfig } from "../../src/config/DataConfig";

describe("DataConfig", () => {
    it("defaults data.directed to auto", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.directed, "auto");
    });

    it("defaults edgeWeightPath to weight", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.knownFields.edgeWeightPath, "weight");
    });

    it("defaults positionScale to 1 and idCoercion to canonical", () => {
        const parsed = DataConfig.parse({});
        assert.strictEqual(parsed.knownFields.positionScale, 1);
        assert.strictEqual(parsed.knownFields.idCoercion, "canonical");
    });

    it("rejects an unknown top-level key because DataConfig is a strictObject", () => {
        assert.throws(() => DataConfig.parse({ directedness: true }));
    });

    it("rejects an unknown key under knownFields because it is a strictObject too", () => {
        assert.throws(() => DataConfig.parse({ knownFields: { bogus: 1 } }));
        // a misspelling must fail loudly rather than silently falling back to the default
        assert.throws(() => DataConfig.parse({ knownFields: { idCoersion: "keep" } }));
        assert.throws(() => DataConfig.parse({ knownFields: { positionscale: 2 } }));
    });

    it("rejects a positionScale that is not strictly positive", () => {
        // 0 would collapse every file-placed node onto the origin; a negative value would
        // point-reflect the whole imported layout
        assert.throws(() => DataConfig.parse({ knownFields: { positionScale: 0 } }));
        assert.throws(() => DataConfig.parse({ knownFields: { positionScale: -5 } }));
        assert.throws(() => DataConfig.parse({ knownFields: { positionScale: Number.NaN } }));
        assert.throws(() => DataConfig.parse({ knownFields: { positionScale: Number.POSITIVE_INFINITY } }));
    });

    it("accepts a fractional positionScale", () => {
        const parsed = DataConfig.parse({ knownFields: { positionScale: 0.25 } });
        assert.strictEqual(parsed.knownFields.positionScale, 0.25);
    });

    it("accepts keep as the other idCoercion rule and rejects anything else", () => {
        const parsed = DataConfig.parse({ knownFields: { idCoercion: "keep" } });
        assert.strictEqual(parsed.knownFields.idCoercion, "keep");
        // "string" and "number" are graph-format IdCoercion rules the element does NOT expose
        assert.throws(() => DataConfig.parse({ knownFields: { idCoercion: "string" } }));
        assert.throws(() => DataConfig.parse({ knownFields: { idCoercion: "" } }));
    });

    it("accepts an explicit directed boolean and rejects any other sentinel", () => {
        assert.strictEqual(DataConfig.parse({ directed: true }).directed, true);
        assert.strictEqual(DataConfig.parse({ directed: false }).directed, false);
        assert.throws(() => DataConfig.parse({ directed: "undirected" }));
    });
});
