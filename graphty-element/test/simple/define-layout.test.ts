/**
 * @file `defineLayout` without a browser: the definition checks a beginner meets the moment they
 * call it, and the catalogue entry each of the guide's toy layouts files (design/extensions/
 * simple-tier.md sections 2.4 and 4.2). What the layouts DRAW is proved on a rendered graph by
 * test/browser/simple/define-layout.test.ts.
 */

import { assert, describe, it } from "vitest";

import { layoutDescriptor } from "../../catalog";
import { defineLayout, type GraphtyError, isGraphtyError } from "../../extend";

/** A place function that places nothing, for definitions that are refused before it could run. */
const placeNothing = (): Map<string, [number, number]> => new Map();

/**
 * The error a definition is refused with.
 * @param definition - What the author passed, deliberately unchecked by the compiler.
 * @returns The refusal.
 */
function refusal(definition: unknown): GraphtyError {
    try {
        defineLayout(definition as Parameters<typeof defineLayout>[0]);
    } catch (error) {
        assert.isTrue(isGraphtyError(error), `a GraphtyError, not ${String(error)}`);
        return error as GraphtyError;
    }

    return assert.fail("the definition was accepted");
}

describe("defineLayout refuses a malformed definition at once", () => {
    it("with no place function", () => {
        const error = refusal({ id: "acme-no-place" });

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.message, 'defineLayout("acme-no-place"): "place" must be a function; got undefined.');
        assert.strictEqual(error.details.field, "place");
    });

    it("with place given as something other than a function", () => {
        const error = refusal({ id: "acme-place-text", place: "rows" });

        assert.strictEqual(
            error.message,
            'defineLayout("acme-place-text"): "place" must be a function; got the string "rows".',
        );
    });

    it("with an id that is not a permanent id", () => {
        const error = refusal({ id: "Acme Tiers", place: placeNothing });

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.field, "id");
    });

    it("with dimensions other than 2 or 3", () => {
        const error = refusal({ id: "acme-four-d", dimensions: 4, place: placeNothing });

        assert.strictEqual(
            error.message,
            'defineLayout("acme-four-d"): "dimensions" must be one of 2, 3; got the number 4.',
        );
        assert.strictEqual(error.details.field, "dimensions");
    });

    it("with random given as something other than true or false", () => {
        const error = refusal({ id: "acme-random-text", random: "yes", place: placeNothing });

        assert.strictEqual(error.details.field, "random");
    });

    it("with a malformed option, naming it", () => {
        const error = refusal({ id: "acme-bad-option", options: { spacing: [2] }, place: placeNothing });

        assert.strictEqual(error.code, "E_BAD_COMMAND");
        assert.strictEqual(error.details.field, "options.spacing");
    });

    it("and registers nothing when it refuses", () => {
        refusal({ id: "acme-never-filed" });

        assert.isUndefined(layoutDescriptor("acme-never-filed"));
    });
});

describe("the guide's toy layouts", () => {
    it("each file a catalogue entry under its own id", async () => {
        await import("../../docs/examples/simple-tier/layout-tiers");
        await import("../../docs/examples/simple-tier/layout-category-rows");
        await import("../../docs/examples/simple-tier/layout-precomputed");

        assert.strictEqual(layoutDescriptor("acme-tiers")?.maxDimensions, 2);
        assert.strictEqual(layoutDescriptor("acme-category-rows")?.plainName, "Acme category rows");
        assert.strictEqual(layoutDescriptor("acme-precomputed")?.maxDimensions, 3, "3 when a definition names none");
        assert.deepEqual(
            layoutDescriptor("acme-precomputed")?.options.map((option) => [option.name, option.type, option.default]),
            [
                ["x", "attribute", "x"],
                ["y", "attribute", "y"],
                ["z", "attribute", undefined],
            ],
        );
    });
});
