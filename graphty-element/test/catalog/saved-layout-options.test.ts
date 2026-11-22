/**
 * @file The names a save file gives layout options (spec/README.md 5 rule 9): the arrangement's
 * own, and the ones each engine takes when it draws an arrangement.
 */

import { assert, describe, it } from "vitest";

import { engineOptionNames, layoutEntry, savedLayoutOptions } from "../../src/catalog/layouts";

describe("savedLayoutOptions", () => {
    it("gives force the options that mean the same on every engine that draws it", () => {
        assert.deepEqual(
            [...savedLayoutOptions("force")],
            ["seed", "dim", "clusterBy", "clusterStrength", "nodeGap", "nodeGapFront"],
        );
    });

    it("gives an arrangement one engine draws that engine's option names", () => {
        const circular = layoutEntry("circular")?.implementations;
        assert.strictEqual(circular?.length, 1);
        assert.deepEqual(
            [...savedLayoutOptions("circular")],
            circular?.[0].options.map((option) => option.name),
        );
    });

    it("gives an arrangement nothing answers to no names", () => {
        assert.deepEqual([...savedLayoutOptions("com.example.nothing")], []);
    });
});

describe("engineOptionNames", () => {
    it("answers an engine that draws the arrangement, and nothing for one that does not", () => {
        const d3 = engineOptionNames("force", "d3");
        assert.isDefined(d3);
        assert.include([...d3], "alphaDecay");
        assert.isUndefined(engineOptionNames("circular", "d3"));
        assert.isUndefined(engineOptionNames("force", "com.example.gone"));
    });
});
