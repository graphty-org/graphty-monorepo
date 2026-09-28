/**
 * @file `definePalette` builds an ordinary palette registration: the same palette registered
 * through the simple tier and through `registerPalette` is indistinguishable in the catalogue
 * (design/extensions/simple-tier.md sections 3 and 4.5).
 */

import { afterAll, assert, describe, it } from "vitest";

import { paletteDescriptor, palettesOfKind } from "../../catalog";
import { clearRegisteredPalettesForTesting, definePalette, isGraphtyError, registerPalette } from "../../extend";
import { createGraphSession } from "../../src/session";

const COLORS = ["#0b1d51", "rgb(27, 127, 121)", "rebeccapurple"];

afterAll(() => {
    clearRegisteredPalettesForTesting();
});

describe("a palette defined through the simple tier", () => {
    it("is catalogued exactly like the same palette registered through the advanced tier", () => {
        definePalette({ id: "acme-parity-simple", kind: "categorical", colors: COLORS });
        registerPalette({
            id: "acme-parity-advanced",
            plainName: "Acme parity simple",
            kind: "categorical",
            colors: COLORS,
            capacity: COLORS.length,
            colorblindSafe: [],
        });

        const simple = paletteDescriptor("acme-parity-simple");
        const advanced = paletteDescriptor("acme-parity-advanced");

        assert.isDefined(simple, "the simple palette resolves by id, as a built-in does");
        assert.isDefined(advanced);
        assert.deepStrictEqual(
            { ...simple, id: "same" },
            { ...advanced, id: "same" },
            "the same entry, member for member, but the id: name, kind, hex colours, capacity, claim",
        );
        assert.deepStrictEqual([...simple.colors], ["#0B1D51", "#1B7F79", "#663399"], "normalised to hex");
        assert.isFalse("options" in simple, "a palette takes no options in either tier");
        assert.isTrue(Object.isFrozen(simple), "and is published frozen, as an advanced one is");

        const categorical = palettesOfKind("categorical").map((palette) => palette.id);
        assert.includeMembers(categorical, ["acme-parity-simple", "acme-parity-advanced"]);

        const offered = createGraphSession()
            .catalog.palettes()
            .map((palette) => palette.id);
        assert.includeMembers(offered, ["acme-parity-simple", "acme-parity-advanced"], "a picker offers both");
    });

    it("keeps a name and a colour-vision claim the definition makes", () => {
        definePalette({
            id: "acme-claimed",
            name: "Acme claimed",
            kind: "diverging",
            colors: ["#0B1D51", "#FFFFFF", "#E07A1F"],
            colorblindSafe: ["deuteranopia"],
        });

        const claimed = paletteDescriptor("acme-claimed");
        assert.isDefined(claimed);
        assert.strictEqual(claimed.plainName, "Acme claimed");
        assert.strictEqual(claimed.capacity, null);
        assert.deepStrictEqual([...claimed.colorblindSafe], ["deuteranopia"]);
    });

    it("is refused with E_DUPLICATE_PLUGIN when it takes a built-in palette's id, as registerPalette is", () => {
        let code: unknown;
        try {
            definePalette({ id: "viridis", kind: "sequential", colors: ["#000000", "#FFFFFF"] });
        } catch (error) {
            code = isGraphtyError(error) ? error.code : error;
        }

        assert.strictEqual(code, "E_DUPLICATE_PLUGIN");
    });

    it("refuses a colour-vision claim that is not one of the three deficiencies, in both tiers", () => {
        const refusals = [
            () => definePalette({ id: "acme-claim", kind: "categorical", colors: COLORS, colorblindSafe: ["nonsense"] as never }),
            () =>
                registerPalette({
                    id: "acme-claim-advanced",
                    plainName: "Acme claim",
                    kind: "categorical",
                    colors: COLORS,
                    colorblindSafe: ["deuteranomaly"] as never,
                }),
        ];
        for (const refused of refusals) {
            let caught: unknown;
            try {
                refused();
            } catch (error) {
                caught = error;
            }

            assert.isTrue(isGraphtyError(caught), "refused with a GraphtyError");
            assert.strictEqual((caught as { details: { field: string } }).details.field, "colorblindSafe");
        }

        assert.isUndefined(paletteDescriptor("acme-claim"));
        assert.isUndefined(paletteDescriptor("acme-claim-advanced"));
    });

    it("is one palette, not two, when the same definition is registered again", () => {
        const definition = { id: "acme-again", kind: "sequential", colors: ["#000000", "#FFFFFF"] } as const;
        definePalette(definition);
        definePalette(definition);

        assert.strictEqual(palettesOfKind("sequential").filter((palette) => palette.id === "acme-again").length, 1);
    });
});

describe("what definePalette fills in", () => {
    it("names the palette from its id, derives the capacity and makes no colour-vision claim", () => {
        definePalette({ id: "acme-filled-in", kind: "sequential", colors: ["white", "oklch(0.3 0.1 260)"] });

        const filled = paletteDescriptor("acme-filled-in");
        assert.isDefined(filled);
        assert.strictEqual(filled.plainName, "Acme filled in");
        assert.strictEqual(filled.capacity, null, "a ramp has no fixed number of groups");
        assert.deepStrictEqual([...filled.colorblindSafe], []);
        assert.strictEqual(filled.colors[0], "#FFFFFF");
        assert.match(filled.colors[1], /^#[0-9A-F]{6}$/);
    });

    it("gives a categorical palette one group per colour", () => {
        definePalette({ id: "acme-three", kind: "categorical", colors: ["red", "green", "blue"] });

        assert.strictEqual(paletteDescriptor("acme-three")?.capacity, 3);
    });
});
