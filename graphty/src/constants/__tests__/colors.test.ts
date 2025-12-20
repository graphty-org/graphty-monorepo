import {describe, expect, it} from "vitest";

import {
    DEFAULT_GRADIENT_STOP_COLOR,
    SWATCH_COLORS,
    SWATCH_COLORS_HEXA,
} from "../colors";

describe("SWATCH_COLORS", () => {
    it("contains valid hex colors", () => {
        SWATCH_COLORS.forEach((color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });

    it("has at least 5 colors", () => {
        expect(SWATCH_COLORS.length).toBeGreaterThanOrEqual(5);
    });

    it("contains unique colors", () => {
        const unique = new Set(SWATCH_COLORS);
        expect(unique.size).toBe(SWATCH_COLORS.length);
    });
});

describe("SWATCH_COLORS_HEXA", () => {
    it("contains valid 8-character hex colors with alpha", () => {
        SWATCH_COLORS_HEXA.forEach((color) => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{8}$/);
        });
    });

    it("has at least 10 colors (5 solid + 5 semi-transparent)", () => {
        expect(SWATCH_COLORS_HEXA.length).toBeGreaterThanOrEqual(10);
    });

    it("contains unique colors", () => {
        const unique = new Set(SWATCH_COLORS_HEXA);
        expect(unique.size).toBe(SWATCH_COLORS_HEXA.length);
    });

    it("includes both fully opaque and semi-transparent variants", () => {
        const fullyOpaque = SWATCH_COLORS_HEXA.filter((c) =>
            c.endsWith("FF"),
        );
        const semiTransparent = SWATCH_COLORS_HEXA.filter((c) =>
            c.endsWith("80"),
        );

        expect(fullyOpaque.length).toBeGreaterThan(0);
        expect(semiTransparent.length).toBeGreaterThan(0);
    });
});

describe("DEFAULT_GRADIENT_STOP_COLOR", () => {
    it("is a valid hex color", () => {
        expect(DEFAULT_GRADIENT_STOP_COLOR).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });

    it("is a neutral gray color", () => {
        // #888888 is a medium gray
        expect(DEFAULT_GRADIENT_STOP_COLOR).toBe("#888888");
    });
});
