import { assert, describe, it } from "vitest";

import { algorithmByKey } from "../../src/catalog/algorithms";
import { LAYOUT_CATALOG } from "../../src/catalog/layouts";
import type { OptionDescriptor } from "../../src/catalog/types";

/**
 * Find one option of one built-in algorithm, failing the test when it is missing.
 * @param key - The algorithm's catalogue key.
 * @param name - The option's name.
 * @returns The option's descriptor.
 */
function algorithmOption(key: string, name: string): OptionDescriptor {
    const option = algorithmByKey(key)?.options.find((candidate) => candidate.name === name);
    assert.isDefined(option, `${key} declares ${name}`);
    return option;
}

describe("option flags a key/advanced form reads", () => {
    const engines = LAYOUT_CATALOG.flatMap((entry) => entry.implementations);

    it("publishes dim on every engine that has it", () => {
        const dims = engines.flatMap((engine) => engine.options.filter((option) => option.name === "dim"));
        assert.isAbove(dims.length, 0);
        for (const option of dims) {
            assert.notStrictEqual(option.internal, true);
        }
    });

    it("leaves at most one of scale and scalingFactor in the key options", () => {
        for (const engine of engines) {
            const key = engine.options.filter(
                (option) => (option.name === "scale" || option.name === "scalingFactor") && option.advanced !== true,
            );
            assert.isAtMost(key.length, 1, `${engine.engine} has ${key.map((option) => option.name).join(", ")}`);
        }
    });

    it("describes pagerank's weight as an edge attribute in the key options", () => {
        const weight = algorithmOption("pagerank", "weight");
        assert.strictEqual(weight.type, "attribute");
        assert.strictEqual(weight.on, "edge");
        assert.notStrictEqual(weight.advanced, true);
    });

    it("marks options that do nothing or are refused as internal", () => {
        assert.isTrue(algorithmOption("pagerank", "useDelta").internal);
        assert.isTrue(algorithmOption("shortest-path", "bidirectional").internal);
        assert.isTrue(algorithmOption("louvain", "useOptimized").internal);
    });
});
