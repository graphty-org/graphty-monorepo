import { assert, describe, it } from "vitest";

import { type AlgorithmOnLoad, DataConfig, parseAlgorithmsOnLoad } from "../../src/config/DataConfig";
import { GraphtyError } from "../../src/errors";

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

describe("the load-time algorithm list (data.algorithms)", () => {
    it("keeps a list of plain algorithm names exactly as given", () => {
        const parsed = DataConfig.parse({ algorithms: ["graphty:degree", "pagerank"] });
        assert.deepStrictEqual(parsed.algorithms, ["graphty:degree", "pagerank"]);
    });

    it("accepts an entry that carries run options beside the algorithm", () => {
        const entry: AlgorithmOnLoad = {
            algorithm: "graphty:pagerank",
            params: { dampingFactor: 0.9 },
            style: { size: [1, 5] },
            seed: 7,
            as: "importance",
        };
        const parsed = DataConfig.parse({ algorithms: ["graphty:degree", entry] });
        assert.deepStrictEqual(parsed.algorithms, ["graphty:degree", entry]);
        assert.deepStrictEqual(DataConfig.parse({ algorithms: [{ algorithm: "hits", style: false }] }).algorithms, [
            { algorithm: "hits", style: false },
        ]);
        assert.deepStrictEqual(
            DataConfig.parse({ algorithms: [{ algorithm: "hits", style: { size: true } }] }).algorithms,
            [{ algorithm: "hits", style: { size: true } }],
        );
    });

    it("rejects an entry with no algorithm, an unknown option, or a malformed style", () => {
        assert.throws(() => DataConfig.parse({ algorithms: [""] }));
        assert.throws(() => DataConfig.parse({ algorithms: [{ style: { size: true } }] }));
        // a run option that makes no sense on load, or a misspelling, fails rather than being dropped
        assert.throws(() => DataConfig.parse({ algorithms: [{ algorithm: "degree", queue: "now" }] }));
        assert.throws(() => DataConfig.parse({ algorithms: [{ algorithm: "degree", styles: { size: true } }] }));
        assert.throws(() => DataConfig.parse({ algorithms: [{ algorithm: "degree", style: { size: [1] } }] }));
        assert.throws(() => DataConfig.parse({ algorithms: [{ algorithm: "degree", style: "big" }] }));
        assert.throws(() => DataConfig.parse({ algorithms: [42] }));
    });
});

describe("parseAlgorithmsOnLoad", () => {
    it("returns a valid list unchanged", () => {
        const list = ["graphty:degree", { algorithm: "graphty:pagerank", style: { size: true } }];
        assert.deepStrictEqual(parseAlgorithmsOnLoad(list), list);
    });

    it("refuses a bad entry with E_BAD_COMMAND naming the entry and its position", () => {
        const bad = { algorithm: "graphty:pagerank", style: { size: "big" } };
        const error = captureError(() => parseAlgorithmsOnLoad(["graphty:degree", bad]));

        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.index, 1);
        assert.deepStrictEqual(error.details.entry, bad);
        assert.include(error.message, "graphty:pagerank");
        assert.include(error.message, "at \"style");
    });

    it("refuses a value that is not a list", () => {
        const error = captureError(() => parseAlgorithmsOnLoad("graphty:degree"));

        assert.instanceOf(error, GraphtyError);
        assert.strictEqual(error.code, "E_BAD_COMMAND");
    });
});

/**
 * Run a call that must throw, and hand back what it threw.
 * @param call - The call.
 * @returns The GraphtyError it threw.
 */
function captureError(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        if (error instanceof GraphtyError) {
            return error;
        }

        throw error;
    }

    throw new Error("expected the call to throw");
}
