/**
 * @file Options in short form, and the checks made on them before an author's code runs
 * (design/extensions/simple-tier.md section 2.2).
 *
 * A misspelt attribute must fail loudly with the names the graph does carry, and a reader's typo
 * in a node id must never be dropped silently -- both are refused before the plugin runs.
 */

import { assert, describe, it } from "vitest";

import { resolveOptionValues } from "../../src/catalog/options";
import { GraphtyError, isGraphtyError } from "../../src/errors";
import { checkViewOptions, expandOptions } from "../../src/simple/options";
import { viewSourceOf } from "../../src/simple/source";
import { createGraphView, viewInputs } from "../../src/simple/view";
import { makeSession } from "../session/helpers";

/**
 * The error a call throws, asserted to be a GraphtyError.
 * @param call - The call.
 * @returns The error.
 */
function thrown(call: () => unknown): GraphtyError {
    try {
        call();
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the call did not throw");
}

describe("the short form", () => {
    it("expands every spelling the guide shows into option descriptors, in key order", () => {
        const options = expandOptions("defineAlgorithm", "acme-x", {
            tier: { type: "attribute", default: "tier" },
            confidence: { type: "attribute", on: "edge", default: "confidence" },
            spacing: 1,
            label: "name",
            weighted: false,
            alpha: { type: "number", default: 0.5, min: 0, max: 1 },
            hops: { type: "integer", default: 2, min: 1, max: 5 },
            weight: { type: "attribute", on: "edge", default: null },
            seeds: { type: "node-set" },
        });

        assert.deepEqual(options, [
            { name: "tier", plainName: "Tier", type: "attribute", default: "tier" },
            { name: "confidence", plainName: "Confidence", type: "attribute", on: "edge", default: "confidence" },
            { name: "spacing", plainName: "Spacing", type: "number", default: 1 },
            { name: "label", plainName: "Label", type: "string", default: "name" },
            { name: "weighted", plainName: "Weighted", type: "boolean", default: false },
            { name: "alpha", plainName: "Alpha", type: "number", default: 0.5, min: 0, max: 1 },
            { name: "hops", plainName: "Hops", type: "integer", default: 2, min: 1, max: 5 },
            { name: "weight", plainName: "Weight", type: "attribute", on: "edge" },
            { name: "seeds", plainName: "Seeds", type: "node-set" },
        ]);
    });

    it("leaves an optional attribute unbound, so its value is undefined", () => {
        const options = expandOptions("defineLayout", "acme-x", { z: { type: "attribute", default: null } });

        assert.deepEqual(resolveOptionValues(options, {}, { kind: "layout", id: "acme-x" }), {});
    });

    it("keeps a plain name the author wrote", () => {
        const [option] = expandOptions("defineLayout", "acme-x", {
            secondsPerTurn: { type: "number", default: 60, plainName: "Seconds for one turn" },
        });

        assert.strictEqual(option.plainName, "Seconds for one turn");
        assert.strictEqual(expandOptions("defineLayout", "acme-x", { secondsPerTurn: 60 })[0].plainName, "Seconds per turn");
    });

    it("is empty when the definition declares no options", () => {
        assert.deepEqual(expandOptions("defineAlgorithm", "acme-x", undefined), []);
    });

    it("refuses what it cannot read, naming the option", () => {
        const cases: [unknown, string, string][] = [
            [[1], "options", '"options" must be an object such as { spacing: 2 }; got an array.'],
            [{ tier: () => 1 }, "options.tier", '"options.tier" must be a number, a string, a boolean, or an object'],
            [{ tier: { default: "tier" } }, "options.tier.type", '"options.tier" needs a "type", one of "number"'],
            [{ tier: { type: "unknown" } }, "options.tier.type", '"options.tier" needs a "type"'],
            [{ n: Number.NaN }, "options.n", '"options.n" must be a finite number; got the number NaN.'],
            [{ n: { type: "number", on: "edge" } }, "options.n.on", 'only an "attribute" or "partition" option takes'],
            [{ w: { type: "attribute", on: "nodes" } }, "options.w.on", '"options.w.on" must be "node" or "edge"'],
            [{ mode: { type: "enum" } }, "options.mode.values", 'is an "enum" and needs "values"'],
        ];

        for (const [options, field, message] of cases) {
            const error = thrown(() => expandOptions("defineAlgorithm", "acme-x", options));

            assert.strictEqual(error.code, "E_BAD_COMMAND", field);
            assert.strictEqual(error.details.field, field);
            assert.include(error.message, message);
            assert.isTrue(error.message.startsWith('defineAlgorithm("acme-x"): '), error.message);
        }
    });
});

describe("the checks before the author's code runs", () => {
    /**
     * A small graph with a node attribute and an edge attribute.
     * @returns The view over it.
     */
    function graph(): ReturnType<typeof createGraphView> {
        const harness = makeSession({ directed: false });
        harness.add(
            [
                { id: 0, tier: 1 },
                { id: "b", tier: 2 },
            ],
            [{ source: 0, target: "b", confidence: 0.9 }],
        );

        return createGraphView(viewSourceOf(harness.session), { id: "acme-confidence-degree", directed: false });
    }

    const declared = expandOptions("defineAlgorithm", "acme-confidence-degree", {
        confidence: { type: "attribute", on: "edge", default: "confidence" },
        seeds: { type: "node-set" },
        start: { type: "node-id" },
        weight: { type: "attribute", on: "edge", default: null },
    });

    it("pass a graph that carries every attribute named and every node named, and record the inputs", () => {
        const view = graph();

        checkViewOptions(view, "acme-confidence-degree", declared, { confidence: "confidence", seeds: [0, "b"], start: 0 });
        assert.deepEqual(viewInputs(view), [{ target: "edge", path: "confidence" }]);
    });

    it("refuse a misspelt edge attribute, listing what edges carry", () => {
        const error = thrown(() =>
            checkViewOptions(graph(), "acme-confidence-degree", declared, { confidence: "confidance" }),
        );

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.match(
            error.message,
            /^acme-confidence-degree: option "confidence" names edge attribute "confidance", which no edge carries; edges carry: .*confidence/,
        );
    });

    it("refuse a node the graph does not have, telling the number 0 from the string", () => {
        const view = graph();
        const error = thrown(() => checkViewOptions(view, "acme-confidence-degree", declared, { seeds: [0, "0"] }));

        assert.strictEqual(error.code, "E_OPTION_RANGE");
        assert.strictEqual(error.message, 'acme-confidence-degree: option "seeds" names node "0", which the graph does not have.');
        assert.strictEqual(
            thrown(() => checkViewOptions(view, "acme-confidence-degree", declared, { start: 4217 })).message,
            'acme-confidence-degree: option "start" names node 4217, which the graph does not have.',
        );
    });

    it("refuse a result path whose run has not completed", () => {
        const options = expandOptions("defineAlgorithm", "acme-share", {
            strength: { type: "attribute", default: "results.strength.value" },
        });
        const error = thrown(() => checkViewOptions(graph(), "acme-share", options, { strength: "results.strength.value" }));

        assert.strictEqual(
            error.message,
            'acme-share: option "strength" reads results.strength.value, but no completed run is named "strength"; ' +
                'run the algorithm that produces it first, with { as: "strength" }.',
        );
    });

    it("skip an unbound optional attribute", () => {
        checkViewOptions(graph(), "acme-confidence-degree", declared, { weight: undefined });
    });
});
