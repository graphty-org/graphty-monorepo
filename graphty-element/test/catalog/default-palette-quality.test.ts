/**
 * @file The palettes the element picks for itself must be legible on the element's own background.
 *
 * A reader who names no palette gets whatever the element chose, so the element's choice is the
 * picture most graphs are drawn with. These checks are measured, never eyeballed, and they read
 * the defaults THROUGH the element -- by planning a colour binding that names no palette -- so they
 * follow the default if it changes rather than pinning an id.
 *
 * The colour science is small and standard, and is written out here rather than imported so the
 * test cannot drift with the code it checks:
 *
 * - sRGB to linear RGB to OKLab (Ottosson 2020); Delta E is Euclidean OKLab distance x100.
 * - Colour-blindness simulation: Machado, Oliveira & Fernandes (2009) at severity 1.0, applied in
 *   linear RGB. The Delta E floors below are calibrated to that model.
 * - Contrast: the WCAG 2 relative-luminance ratio.
 */

import { assert, describe, it } from "vitest";

import { GraphStyle } from "../../src/config/GraphStyle";
import { OTHER_GROUP_COLOR } from "../../src/config/palettes/categorical";
import { prepareRamp } from "../../src/session/styles/palettes";
import { createScaleRegistry } from "../../src/session/styles/scales";

type Rgb = [number, number, number];
type Matrix = [Rgb, Rgb, Rgb];

/** Machado, Oliveira & Fernandes (2009), severity 1.0, linear RGB. */
const MACHADO: Record<"protan" | "deutan", Matrix> = {
    protan: [
        [0.152286, 1.052583, -0.204868],
        [0.114503, 0.786281, 0.099216],
        [-0.003882, -0.048116, 1.051998],
    ],
    deutan: [
        [0.367322, 0.860646, -0.227968],
        [0.280085, 0.672501, 0.047413],
        [-0.01182, 0.04294, 0.968881],
    ],
};

const toLinear = (channel: number): number =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;

function linearRgb(hex: string): Rgb {
    const digits = hex.replace(/^#/, "");

    return [0, 2, 4].map((at) => toLinear(parseInt(digits.slice(at, at + 2), 16) / 255)) as Rgb;
}

function oklab([r, g, b]: Rgb): Rgb {
    const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);

    return [
        0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
        1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
        0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
    ];
}

function simulate(rgb: Rgb, matrix: Matrix): Rgb {
    const clamp = (value: number): number => Math.max(0, Math.min(1, value));

    return matrix.map((row) => clamp(row[0] * rgb[0] + row[1] * rgb[1] + row[2] * rgb[2])) as Rgb;
}

function deltaE(left: string, right: string, vision?: keyof typeof MACHADO): number {
    const see = (hex: string): Rgb => oklab(vision ? simulate(linearRgb(hex), MACHADO[vision]) : linearRgb(hex));
    const [a, b] = [see(left), see(right)];

    return 100 * Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

const lightness = (hex: string): number => oklab(linearRgb(hex))[0];

function hueDegrees(hex: string): number {
    const [, a, b] = oklab(linearRgb(hex));

    return (((Math.atan2(b, a) * 180) / Math.PI) % 360 + 360) % 360;
}

function contrast(left: string, right: string): number {
    const luminance = (hex: string): number => {
        const [r, g, b] = linearRgb(hex);

        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const [high, low] = [luminance(left), luminance(right)].sort((x, y) => y - x);

    return (high + 0.05) / (low + 0.05);
}

/**
 * The smallest arc of the hue circle that holds every hue, in degrees.
 * @param hues - Hue angles in degrees.
 * @returns The arc's width.
 */
function hueSpread(hues: readonly number[]): number {
    const sorted = [...hues].sort((a, b) => a - b);
    let widestGap = 360 - (sorted[sorted.length - 1] - sorted[0]);
    for (let index = 1; index < sorted.length; index++) {
        widestGap = Math.max(widestGap, sorted[index] - sorted[index - 1]);
    }

    return 360 - widestGap;
}

/** The only CSS colour name the default background is spelled with, and its hex. */
const NAMED_BACKGROUNDS: Record<string, string> = { whitesmoke: "#f5f5f5" };

function defaultBackground(): string {
    const { background } = GraphStyle.parse({});
    if (background.backgroundType !== "color" || background.color === undefined) {
        assert.fail("the default background is expected to be a plain colour");
    }

    const color = background.color.toLowerCase();

    return NAMED_BACKGROUNDS[color] ?? color;
}

const registry = createScaleRegistry();
const background = defaultBackground();

describe("the default palette for a measurement", () => {
    const ramp = prepareRamp({ domain: [0, 1] }, registry);
    const samples = Array.from({ length: 11 }, (_, index) => ramp.color(index / 10)?.hex ?? "");
    const anchors = ramp.palette.colors;
    // By lightness rather than by end, so these hold whichever way round a ramp runs.
    const byLightness = [...samples].sort((a, b) => lightness(b) - lightness(a));

    it("is resolved to a sequential palette", () => {
        assert.strictEqual(ramp.palette.kind, "sequential");
        assert.notInclude(samples, "");
    });

    it("gets darker as the value grows, so more reads as more on a light background", () => {
        for (let index = 1; index < samples.length; index++) {
            assert.isBelow(
                lightness(samples[index]),
                lightness(samples[index - 1]),
                `${ramp.palette.id}: ${samples[index - 1]} -> ${samples[index]}`,
            );
        }
    });

    it("keeps its palest step visible against the background (>= 2:1)", () => {
        const palest = byLightness[0];
        assert.isAtLeast(contrast(palest, background), 2, `${ramp.palette.id} palest ${palest} on ${background}`);
    });

    it("does not end in near-black (<= 12:1)", () => {
        const darkest = byLightness[byLightness.length - 1];
        assert.isAtMost(contrast(darkest, background), 12, `${ramp.palette.id} darkest ${darkest} on ${background}`);
    });

    it("stays inside one hue family (OKLCH hue spread <= 40 degrees)", () => {
        // A hue sweep makes a sparse set of nodes read as groups rather than as "how much".
        assert.isAtMost(hueSpread(anchors.map(hueDegrees)), 40, `${ramp.palette.id}: ${anchors.join(", ")}`);
    });
});

describe("the default palette for groups", () => {
    const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ramp = prepareRamp({ scale: "ordinal", domain: [0, 0], categories: eight }, registry);
    const slots = eight.map((category) => ramp.color(category)?.hex ?? "");

    it("is resolved to a categorical palette with a colour for each of eight groups", () => {
        assert.strictEqual(ramp.palette.kind, "categorical");
        assert.notInclude(slots, "");
    });

    // Every pair, not only neighbours: two groups of nodes can sit side by side anywhere in a graph.
    const pairs = slots.flatMap((left, index) => slots.slice(index + 1).map((right) => [left, right] as const));

    it("keeps every pair apart for normal vision (Delta E >= 15)", () => {
        for (const [left, right] of pairs) {
            assert.isAtLeast(deltaE(left, right), 15, `${ramp.palette.id}: ${left} vs ${right}`);
        }
    });

    it("keeps every pair apart under protanopia and deuteranopia (Delta E >= 6)", () => {
        // 6 is the floor that is legal only with a secondary cue. In a graph that cue is space: a
        // group's nodes cluster together, so a pair of groups is also told apart by where they sit.
        for (const vision of ["protan", "deutan"] as const) {
            for (const [left, right] of pairs) {
                assert.isAtLeast(deltaE(left, right, vision), 6, `${ramp.palette.id} ${vision}: ${left} vs ${right}`);
            }
        }
    });

    it("keeps every colour but the last visible against the background (>= 1.5:1)", () => {
        // The last slot is exempt: it is reached only when all eight colours are needed, and the
        // palette puts the one colour that barely shows on a light background (yellow) there.
        for (const color of slots.slice(0, -1)) {
            assert.isAtLeast(contrast(color, background), 1.5, `${ramp.palette.id}: ${color} on ${background}`);
        }
    });
});

describe("the grey an overflowing encoding paints its smallest groups", () => {
    const eight = ["a", "b", "c", "d", "e", "f", "g", "h"];
    const ramp = prepareRamp({ scale: "ordinal", domain: [0, 0], categories: eight }, registry);
    const slots = eight.map((category) => ramp.color(category)?.hex ?? "");

    it("stands off the background (>= 2:1)", () => {
        assert.isAtLeast(contrast(OTHER_GROUP_COLOR, background), 2, `${OTHER_GROUP_COLOR} on ${background}`);
    });

    it("is apart from every colour of the default group palette (Delta E >= 15)", () => {
        for (const color of slots) {
            assert.isAtLeast(deltaE(OTHER_GROUP_COLOR, color), 15, `${OTHER_GROUP_COLOR} vs ${color}`);
        }
    });

    it("is apart from them under protanopia and deuteranopia too (Delta E >= 6)", () => {
        for (const vision of ["protan", "deutan"] as const) {
            for (const color of slots) {
                assert.isAtLeast(deltaE(OTHER_GROUP_COLOR, color, vision), 6, `${vision}: ${color}`);
            }
        }
    });
});
