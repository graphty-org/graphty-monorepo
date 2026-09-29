/**
 * @file What `defineLayout` fills in for the author, without a browser: the catalogue members a
 * definition never writes, the seed option `random: true` adds, and the registration rules it
 * shares with every advanced layout (design/extensions/simple-tier.md sections 3 and 4.2).
 */

import { assert, describe, it } from "vitest";

import { layoutDescriptor } from "../../catalog";
import { defineLayout, isGraphtyError, LayoutEngine } from "../../extend";

/** A place function that places nothing. */
const placeNothing = (): Map<string, [number, number]> => new Map();

describe("defineLayout fills in the catalogue entry", () => {
    it("uses the name and description the author gave for both names", () => {
        defineLayout({
            id: "test-named",
            name: "Org chart",
            description: "Managers above staff.",
            place: placeNothing,
        });

        const entry = layoutDescriptor("test-named");
        assert.strictEqual(entry?.plainName, "Org chart");
        assert.strictEqual(entry?.technicalName, "Org chart");
        assert.strictEqual(entry?.description, "Managers above staff.");
        assert.strictEqual(entry?.family, "custom");
        assert.strictEqual(entry?.kind, "batch");
        assert.strictEqual(entry?.sizeRating, "any");
        assert.strictEqual(entry?.engine, "test-named");
        assert.isFalse(entry?.honoursWeights);
        assert.isTrue(entry?.scoped);
    });

    it("derives the structural inputs from the option types", () => {
        defineLayout({
            id: "test-structural",
            options: {
                root: { type: "node-id" },
                groups: { type: "partition", default: "group" },
                spacing: 2,
            },
            place: placeNothing,
        });

        assert.deepEqual(layoutDescriptor("test-structural")?.structuralInputs, ["node", "partition"]);
    });

    it("declares a seed option for a layout that asks for randomness, and none otherwise", () => {
        defineLayout({ id: "test-random", random: true, place: placeNothing });
        defineLayout({ id: "test-not-random", place: placeNothing });

        assert.deepEqual(
            layoutDescriptor("test-random")?.options.map((option) => [option.name, option.type]),
            [["seed", "seed"]],
        );
        assert.deepEqual(layoutDescriptor("test-not-random")?.options, []);
    });
});

describe("defineLayout registers the way an advanced layout registers", () => {
    it("treats the same definition registered twice as one layout", () => {
        const definition = { id: "test-twice", place: placeNothing };
        defineLayout(definition);
        const first = LayoutEngine.getClass("test-twice");

        defineLayout(definition);

        assert.isNotNull(first);
        assert.strictEqual(LayoutEngine.getClass("test-twice"), first, "one engine, not two");
    });

    it("replaces a layout redefined under the same id, unless asked to be strict", () => {
        defineLayout({ id: "test-replaced", place: placeNothing });
        const first = LayoutEngine.getClass("test-replaced");

        defineLayout({ id: "test-replaced", place: () => new Map() });
        const second = LayoutEngine.getClass("test-replaced");
        assert.notStrictEqual(second, first, "the newer definition wins");

        let error: unknown;
        try {
            defineLayout({ id: "test-replaced", place: () => new Map() }, { strict: true });
        } catch (thrown) {
            error = thrown;
        }

        assert.isTrue(isGraphtyError(error) && error.code === "E_DUPLICATE_PLUGIN", "strict refuses a second layout");
        assert.strictEqual(LayoutEngine.getClass("test-replaced"), second, "and leaves the first in place");
    });

    it("refuses a built-in layout's id", () => {
        let error: unknown;
        try {
            defineLayout({ id: "circular", place: placeNothing });
        } catch (thrown) {
            error = thrown;
        }

        assert.isTrue(isGraphtyError(error) && error.code === "E_DUPLICATE_PLUGIN");
    });
});
