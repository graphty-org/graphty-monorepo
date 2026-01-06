import { describe, expect, it } from "vitest";

import { createColorStop, createDefaultGradientStops } from "../../src/utils/color-stops";

describe("createColorStop", () => {
    it("creates a color stop with unique id", () => {
        const stop = createColorStop(0.5, "#ff0000");
        expect(stop.offset).toBe(0.5);
        expect(stop.color).toBe("#ff0000");
        expect(stop.id).toBeDefined();
        expect(stop.id.length).toBe(8);
    });

    it("creates color stops with unique ids", () => {
        const stop1 = createColorStop(0, "#ff0000");
        const stop2 = createColorStop(1, "#00ff00");
        expect(stop1.id).not.toBe(stop2.id);
    });

    it("creates color stop with 0 offset", () => {
        const stop = createColorStop(0, "#000000");
        expect(stop.offset).toBe(0);
    });

    it("creates color stop with 1 offset", () => {
        const stop = createColorStop(1, "#ffffff");
        expect(stop.offset).toBe(1);
    });
});

describe("createDefaultGradientStops", () => {
    it("returns two color stops", () => {
        const stops = createDefaultGradientStops();
        expect(stops).toHaveLength(2);
    });

    it("first stop is at offset 0", () => {
        const stops = createDefaultGradientStops();
        expect(stops[0].offset).toBe(0);
    });

    it("second stop is at offset 1", () => {
        const stops = createDefaultGradientStops();
        expect(stops[1].offset).toBe(1);
    });

    it("stops have unique ids", () => {
        const stops = createDefaultGradientStops();
        expect(stops[0].id).not.toBe(stops[1].id);
    });

    it("stops have valid hex colors", () => {
        const stops = createDefaultGradientStops();
        expect(stops[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(stops[1].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
});
