/**
 * @file What every built-in algorithm draws by itself.
 *
 * WHAT THIS REPLACES. Twenty-one algorithm test files each carried a "Suggested Styles" block
 * asserting on that algorithm's hand-written `suggestedStyles` -- the expression string it built,
 * the `algorithmResults` path it read, the helper it named. Those blocks are gone with the blocks
 * they described: a run now derives what it suggests from its own result shape and the fields it
 * publishes, so there is one derivation rather than twenty-four, and no per-algorithm branch that
 * can get it wrong.
 *
 * The coverage moves here and gets wider in the process. This walks the CATALOGUE, so an
 * algorithm added tomorrow is asserted about the moment it is declared, and the table below has
 * to be extended deliberately rather than a new algorithm quietly suggesting nothing.
 */

import { assert, describe, it } from "vitest";

import { BUILT_IN_ALGORITHMS } from "../../src/catalog/algorithms";
import type { AlgorithmKey, Channel, FieldDescriptor, ResultShape, RunId } from "../../src/catalog/types";
import { resultShapeContract } from "../../src/session/results/types";
import { suggestStyles } from "../../src/session/styles";

/**
 * What a shape draws: which verb applies it, and the channels it paints.
 *
 * Written out rather than derived from the same table the code reads, because a test that derives
 * its expectation from the implementation asserts only that the implementation is self-consistent.
 */
const EXPECTED: Readonly<Record<ResultShape, { as: "encoding" | "highlight" | "nothing"; channels: readonly Channel[] }>> = {
    "node-metric": { as: "encoding", channels: ["node.color"] },
    "edge-metric": { as: "encoding", channels: ["edge.color"] },
    community: { as: "encoding", channels: ["node.color"] },
    "layered-grouping": { as: "encoding", channels: ["node.color"] },
    "category-table": { as: "encoding", channels: ["node.color"] },
    path: { as: "highlight", channels: ["node.color", "edge.color"] },
    "node-set": { as: "highlight", channels: ["node.color"] },
    "edge-set": { as: "highlight", channels: ["edge.color"] },
    "pair-list": { as: "nothing", channels: [] },
    temporal: { as: "nothing", channels: [] },
    fact: { as: "nothing", channels: [] },
};

/**
 * A run of one catalogued algorithm, as the derivation reads it: its shape and its fields.
 * @param key - The algorithm's catalogue key, which is also the run id here.
 * @param shape - The shape it declares.
 * @param fields - The fields it declares.
 * @returns What `suggestStyles` takes.
 */
function runOf(key: AlgorithmKey, shape: ResultShape, fields: readonly FieldDescriptor[]) {
    return { id: key as RunId, algorithm: key, params: {}, label: key, shape, fields };
}

describe("what a built-in algorithm draws by itself", () => {
    for (const descriptor of BUILT_IN_ALGORITHMS) {
        const expected = EXPECTED[descriptor.shape];

        it(`${descriptor.key} suggests ${expected.as === "nothing" ? "nothing" : `a ${expected.as}`}`, () => {
            const suggestions = suggestStyles(runOf(descriptor.key, descriptor.shape, descriptor.fields));

            if (expected.as === "nothing") {
                assert.lengthOf(suggestions, 0);
                return;
            }

            assert.isAtLeast(suggestions.length, 1);

            const painted = suggestions.flatMap((suggestion) => [...suggestion.channels]);

            // The first suggestion is the one the shape's primary field draws.
            assert.strictEqual(suggestions[0].as, expected.as);

            for (const channel of expected.channels) {
                // A route publishes membership on both halves, so both are painted. A metric or a
                // community publishes on one, so only the half it measured is.
                if (descriptor.fields.some((field) => field.kind === channel.split(".")[0])) {
                    assert.include(painted, channel);
                }
            }
        });

        it(`${descriptor.key} binds the field its shape calls primary first`, () => {
            const { primaryField } = resultShapeContract(descriptor.shape);
            const suggestions = suggestStyles(runOf(descriptor.key, descriptor.shape, descriptor.fields));

            if (suggestions.length > 0) {
                assert.strictEqual(suggestions[0].spec.field, primaryField);
            }
        });
    }

    // A result drawn on its edges also says which group it put each node in: the two sides of a
    // pairing, the two sides of a cut, the source and the sink of a flow. Every node carrying that
    // value is part of the result, so painting it is the algorithm's to do, and 1.x did.
    for (const [key, name] of [
        ["bipartite-matching", "side"],
        ["min-cut", "side"],
        ["max-flow", "role"],
    ] as const) {
        it(`${key} colours its nodes by their ${name}`, () => {
            const descriptor = BUILT_IN_ALGORITHMS.find((entry) => entry.key === key);
            assert.ok(descriptor);

            const suggestions = suggestStyles(runOf(key, descriptor.shape, descriptor.fields));
            const byGroup = suggestions.find((suggestion) => suggestion.spec.field === name);

            assert.ok(byGroup, `${key} suggests nothing for its nodes' ${name}`);
            assert.strictEqual(byGroup.as, "encoding");
            assert.deepEqual([...byGroup.channels], ["node.color"]);
        });
    }

    it("does not colour nodes by a group when the primary field already paints the nodes", () => {
        const fields = [
            { name: "group", plainName: "g", technicalName: "g", kind: "node", type: "integer", path: "results.x.group" },
            { name: "label", plainName: "l", technicalName: "l", kind: "node", type: "string", path: "results.x.label" },
        ] as const satisfies readonly FieldDescriptor[];
        const suggestions = suggestStyles(runOf("louvain", "community", fields));

        assert.lengthOf(suggestions, 1);
    });

    it("suggests nothing for a run that published none of the fields its shape declares", () => {
        // A run that stopped early, or an algorithm that fills fewer fields than it declares,
        // publishes what it publishes. A suggestion naming a field nothing carries would paint
        // nothing and be refused on application either way.
        assert.lengthOf(suggestStyles(runOf("degree", "node-metric", [])), 0);
    });

    it("paints only the elements a run measured, never the rest of the graph", () => {
        // The rule the ten empty-selector layers broke: a suggestion names the run and the field,
        // and the selector is written for it by `styles.encode()` as {match:"has"} over that
        // field's path. Nothing here writes a selector, so nothing here can write an empty one.
        for (const descriptor of BUILT_IN_ALGORITHMS) {
            for (const suggestion of suggestStyles(runOf(descriptor.key, descriptor.shape, descriptor.fields))) {
                assert.notProperty(suggestion.spec, "selector");
                assert.strictEqual(suggestion.spec.run, descriptor.key);
            }
        }
    });
});
