import {describe, expect, it} from "vitest";

import type {
    ColorConfig,
    ColorMode,
    ColorStop,
    GradientColorConfig,
    RadialColorConfig,
    SolidColorConfig,
} from "../style-layer";

describe("style-layer types", () => {
    it("should allow creating SolidColorConfig", () => {
        const config: SolidColorConfig = {
            mode: "solid",
            color: "#ff0000",
            opacity: 100,
        };
        expect(config.mode).toBe("solid");
        expect(config.color).toBe("#ff0000");
        expect(config.opacity).toBe(100);
    });

    it("should allow creating GradientColorConfig with stops", () => {
        const config: GradientColorConfig = {
            mode: "gradient",
            stops: [{offset: 0, color: "#ff0000"}, {offset: 100, color: "#00ff00"}],
            direction: 90,
            opacity: 100,
        };
        expect(config.mode).toBe("gradient");
        expect(config.stops).toHaveLength(2);
        expect(config.direction).toBe(90);
    });

    it("should allow creating RadialColorConfig with stops", () => {
        const config: RadialColorConfig = {
            mode: "radial",
            stops: [{offset: 0, color: "#ff0000"}, {offset: 100, color: "#00ff00"}],
            opacity: 100,
        };
        expect(config.mode).toBe("radial");
        expect(config.stops).toHaveLength(2);
    });

    it("should allow creating ColorStop", () => {
        const stop: ColorStop = {
            offset: 50,
            color: "#888888",
        };
        expect(stop.offset).toBe(50);
        expect(stop.color).toBe("#888888");
    });

    it("should allow ColorConfig union type", () => {
        const solid: ColorConfig = {mode: "solid", color: "#000", opacity: 100};
        const gradient: ColorConfig = {mode: "gradient", stops: [], direction: 0, opacity: 100};
        const radial: ColorConfig = {mode: "radial", stops: [], opacity: 100};

        expect(solid.mode).toBe("solid");
        expect(gradient.mode).toBe("gradient");
        expect(radial.mode).toBe("radial");
    });

    it("should allow ColorMode type values", () => {
        const modes: ColorMode[] = ["solid", "gradient", "radial"];
        expect(modes).toContain("solid");
        expect(modes).toContain("gradient");
        expect(modes).toContain("radial");
    });
});
