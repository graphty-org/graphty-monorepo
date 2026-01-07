import { describe, expect, it } from "vitest";

import { controlComponentExtensions } from "../../src/theme/components/controls";

describe("controlComponentExtensions", () => {
    it("exports SegmentedControl extension", () => {
        expect(controlComponentExtensions.SegmentedControl).toBeDefined();
    });

    it("exports Checkbox extension", () => {
        expect(controlComponentExtensions.Checkbox).toBeDefined();
    });

    it("exports Switch extension", () => {
        expect(controlComponentExtensions.Switch).toBeDefined();
    });

    it("exports Slider extension", () => {
        expect(controlComponentExtensions.Slider).toBeDefined();
    });

    it("exports Radio extension", () => {
        expect(controlComponentExtensions.Radio).toBeDefined();
    });

    it("exports RangeSlider extension", () => {
        expect(controlComponentExtensions.RangeSlider).toBeDefined();
    });

    it("exports exactly 6 control components", () => {
        const components = Object.keys(controlComponentExtensions);
        expect(components).toHaveLength(6);
        expect(components).toContain("SegmentedControl");
        expect(components).toContain("Checkbox");
        expect(components).toContain("Switch");
        expect(components).toContain("Slider");
        expect(components).toContain("Radio");
        expect(components).toContain("RangeSlider");
    });
});
