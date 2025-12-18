import {describe, expect, it} from "vitest";

import {createColorStop, createDefaultGradientStops} from "../color-stops";

describe("color-stops", () => {
    describe("createColorStop", () => {
        it("creates a color stop with the given offset and color", () => {
            const stop = createColorStop(0.5, "#ff0000");

            expect(stop.offset).toBe(0.5);
            expect(stop.color).toBe("#ff0000");
        });

        it("generates a unique id", () => {
            const stop = createColorStop(0, "#000000");

            expect(stop.id).toBeDefined();
            expect(typeof stop.id).toBe("string");
            expect(stop.id.length).toBeGreaterThan(0);
        });

        it("generates different ids for each call", () => {
            const stop1 = createColorStop(0, "#ff0000");
            const stop2 = createColorStop(0, "#ff0000");

            expect(stop1.id).not.toBe(stop2.id);
        });

        it("supports offset at 0", () => {
            const stop = createColorStop(0, "#000000");
            expect(stop.offset).toBe(0);
        });

        it("supports offset at 1", () => {
            const stop = createColorStop(1, "#ffffff");
            expect(stop.offset).toBe(1);
        });

        it("supports various color formats", () => {
            const hexShort = createColorStop(0, "#fff");
            const hexLong = createColorStop(0, "#ffffff");
            const hexWithAlpha = createColorStop(0, "#ffffff80");

            expect(hexShort.color).toBe("#fff");
            expect(hexLong.color).toBe("#ffffff");
            expect(hexWithAlpha.color).toBe("#ffffff80");
        });
    });

    describe("createDefaultGradientStops", () => {
        it("creates two stops", () => {
            const stops = createDefaultGradientStops();
            expect(stops).toHaveLength(2);
        });

        it("creates stops at 0 and 1 offsets", () => {
            const stops = createDefaultGradientStops();

            expect(stops[0].offset).toBe(0);
            expect(stops[1].offset).toBe(1);
        });

        it("creates stops with unique ids", () => {
            const stops = createDefaultGradientStops();

            expect(stops[0].id).not.toBe(stops[1].id);
        });

        it("creates different ids each time called", () => {
            const stops1 = createDefaultGradientStops();
            const stops2 = createDefaultGradientStops();

            expect(stops1[0].id).not.toBe(stops2[0].id);
            expect(stops1[1].id).not.toBe(stops2[1].id);
        });

        it("creates stops with default colors", () => {
            const stops = createDefaultGradientStops();

            // Just verify they are valid hex colors
            expect(stops[0].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
            expect(stops[1].color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });
});
