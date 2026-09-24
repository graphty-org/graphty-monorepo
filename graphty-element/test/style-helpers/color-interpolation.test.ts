import { assert, describe, it } from "vitest";

import { PURPLE_GREEN_COLORS, RED_BLUE_COLORS } from "../../src/config/palettes/diverging";
import { BLUES_COLORS, PLASMA_COLORS, VIRIDIS_COLORS } from "../../src/config/palettes/sequential";
import {
    hexToRgb,
    interpolatePalette,
    MISSING_DATA_COLOR,
    type RgbColor,
} from "../../src/utils/styleHelpers/color/interpolation";

/**
 * The colours the ramp produced before it was made total, pinned so that the fix cannot
 * move a single one of them. Each row is [value, expected hex]. The values are a spread
 * across the domain: both ends, both out-of-range clamps, the anchors' own positions
 * (thirds and sixths of the ten-anchor ramps) and a handful of points between anchors.
 */
const PINNED: Record<string, readonly (readonly [number, string])[]> = {
    viridis: [
        [0, "#440154"],
        [0.05, "#461364"],
        [0.1, "#482474"],
        [0.125, "#472c7a"],
        [0.2, "#404286"],
        [0.25, "#3b518a"],
        [1 / 3, "#31688e"],
        [0.4, "#2a788e"],
        [0.5, "#23908c"],
        [0.6, "#28a883"],
        [2 / 3, "#35b779"],
        [0.7, "#46be6f"],
        [0.75, "#60c860"],
        [0.8, "#7cd14f"],
        [0.9, "#bcdf2a"],
        [0.95, "#dde327"],
        [0.999, "#fce724"],
        [1, "#fde724"],
        [-0.5, "#440154"],
        [1.5, "#fde724"],
    ],
    plasma: [
        [0, "#0d0887"],
        [0.05, "#260691"],
        [0.125, "#4a03a0"],
        [0.25, "#7d08a5"],
        [1 / 3, "#9a179c"],
        [0.5, "#ca4779"],
        [2 / 3, "#ec7953"],
        [0.75, "#f79541"],
        [0.9, "#facf27"],
        [0.999, "#f0f921"],
        [1, "#f0f921"],
        [-0.5, "#0d0887"],
        [1.5, "#f0f921"],
    ],
    blues: [
        [0, "#f7fbff"],
        [0.1, "#e3eef9"],
        [0.25, "#c6dbef"],
        [1 / 3, "#abd0e6"],
        [0.5, "#6baed6"],
        [2 / 3, "#3787c0"],
        [0.75, "#2171b5"],
        [0.9, "#084a92"],
        [1, "#08306b"],
        [-0.5, "#f7fbff"],
        [1.5, "#08306b"],
    ],
    purpleGreen: [
        [0, "#762a83"],
        [0.1, "#9262a3"],
        [0.25, "#c2a5cf"],
        [1 / 3, "#dbc4e0"],
        [0.5, "#f7f7f7"],
        [2 / 3, "#c8e9c2"],
        [0.75, "#a6dba0"],
        [0.9, "#4da359"],
        [1, "#1b7837"],
        [-0.5, "#762a83"],
        [1.5, "#1b7837"],
    ],
    redBlue: [
        [0, "#67001f"],
        [0.1, "#ab162a"],
        [0.25, "#de715a"],
        [1 / 3, "#f4a582"],
        [0.5, "#fae9df"],
        [2 / 3, "#d1e5f0"],
        [0.75, "#a2cde3"],
        [0.9, "#408fc1"],
        [1, "#2166ac"],
        [-0.5, "#67001f"],
        [1.5, "#2166ac"],
    ],
};

const PALETTES: Record<string, readonly string[]> = {
    viridis: VIRIDIS_COLORS,
    plasma: PLASMA_COLORS,
    blues: BLUES_COLORS,
    purpleGreen: PURPLE_GREEN_COLORS,
    redBlue: RED_BLUE_COLORS,
};

describe("interpolatePalette: the colours for valid values do not move", () => {
    for (const [name, rows] of Object.entries(PINNED)) {
        const colors = PALETTES[name];

        describe(name, () => {
            for (const [value, expected] of rows) {
                it(`maps ${String(value)} to ${expected}`, () => {
                    assert.strictEqual(interpolatePalette(value, colors), expected);
                });
            }
        });
    }

    it("returns the single colour of a one-colour palette for every value in range", () => {
        for (const value of [0, 0.25, 0.5, 0.75, 1]) {
            assert.strictEqual(interpolatePalette(value, ["#123456"]), "#123456");
        }
    });

    it("interpolates a two-colour palette linearly in each channel", () => {
        assert.strictEqual(interpolatePalette(0.25, ["#000000", "#ffffff"]), "#404040");
        assert.strictEqual(interpolatePalette(0.5, ["#000000", "#ffffff"]), "#808080");
        assert.strictEqual(interpolatePalette(0.75, ["#000000", "#ffffff"]), "#bfbfbf");
    });

    it("accepts a palette written without the leading hash", () => {
        assert.strictEqual(interpolatePalette(0.5, ["000000", "ffffff"]), "#808080");
    });

    it("accepts uppercase hex", () => {
        assert.strictEqual(interpolatePalette(0.5, ["#000000", "#FFFFFF"]), "#808080");
    });
});

describe("interpolatePalette: a value it cannot place on the ramp", () => {
    const unplaceable: readonly (readonly [string, number | null | undefined])[] = [
        ["undefined", undefined],
        ["null", null],
        ["NaN", Number.NaN],
        ["Infinity", Number.POSITIVE_INFINITY],
        ["-Infinity", Number.NEGATIVE_INFINITY],
    ];

    for (const [label, value] of unplaceable) {
        it(`returns the missing colour for ${label} instead of throwing`, () => {
            assert.doesNotThrow(() => interpolatePalette(value, VIRIDIS_COLORS));
            assert.strictEqual(interpolatePalette(value, VIRIDIS_COLORS), MISSING_DATA_COLOR);
        });
    }

    it("returns the caller's own missing colour when one is given", () => {
        assert.strictEqual(interpolatePalette(undefined, VIRIDIS_COLORS, "#101010"), "#101010");
        assert.strictEqual(interpolatePalette(Number.NaN, VIRIDIS_COLORS, "#101010"), "#101010");
    });

    it("does not spend the missing colour on a value it can place", () => {
        assert.strictEqual(interpolatePalette(0, VIRIDIS_COLORS, "#101010"), "#440154");
        assert.strictEqual(interpolatePalette(0.5, VIRIDIS_COLORS, "#101010"), "#23908c");
        assert.strictEqual(interpolatePalette(1, VIRIDIS_COLORS, "#101010"), "#fde724");
    });

    it("uses a default missing colour that no palette in this package contains", () => {
        for (const colors of Object.values(PALETTES)) {
            assert.notInclude(colors, MISSING_DATA_COLOR);
        }
    });
});

describe("interpolatePalette: a palette it cannot read", () => {
    it("returns the missing colour for an anchor that is not a hex colour", () => {
        const broken = ["#000000", "not a colour", "#ffffff"];
        assert.doesNotThrow(() => interpolatePalette(0.25, broken));
        assert.strictEqual(interpolatePalette(0.25, broken), MISSING_DATA_COLOR);
    });

    it("still reads the anchors of a broken palette that do parse", () => {
        const broken = ["#000000", "not a colour", "#ffffff"];
        assert.strictEqual(interpolatePalette(0, broken), "#000000");
        assert.strictEqual(interpolatePalette(1, broken), "#ffffff");
    });

    it("throws for an empty palette, which is a programmer error rather than a bad value", () => {
        assert.throws(() => interpolatePalette(0.5, []), /empty/i);
        assert.throws(() => interpolatePalette(undefined, []), /empty/i);
    });
});

describe("hexToRgb", () => {
    it("parses a six-digit hex colour", () => {
        const first: RgbColor = { r: 0x44, g: 0x01, b: 0x54 };
        assert.deepEqual(hexToRgb("#440154"), first);
    });

    it("parses without the leading hash and ignores case", () => {
        const last: RgbColor = { r: 0xfd, g: 0xe7, b: 0x24 };
        assert.deepEqual(hexToRgb("FDE724"), last);
    });

    it("returns null rather than throwing for anything it cannot parse", () => {
        const unparseable = ["", "#fff", "#1234567", "rgb(1,2,3)", "#gggggg", "  #440154  "];
        for (const input of unparseable) {
            assert.doesNotThrow(() => hexToRgb(input));
            assert.isNull(hexToRgb(input));
        }
    });

    it("returns null for undefined and null", () => {
        assert.isNull(hexToRgb(undefined));
        assert.isNull(hexToRgb(null));
    });
});
