import { describe, expect, it } from "vitest";

import { controlComponentExtensions } from "../../src/theme/components/controls";
import {
    compactCheckboxScale,
    compactRadioScale,
    compactSegmentedControlScale,
    compactSliderScale,
    compactSwitchScale,
} from "../../src/theme/styles/controls";
import { type CompactSizeScale, compactVarsForSize } from "../../src/theme/styles/size-scale";

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

/**
 * Regression cover for the product owner's 2026-09-13 report, "sizes aren't
 * varying anymore". The defect was a `vars: () => ...` resolver that ignored its
 * arguments and answered every size token with one frozen object, so xs through
 * xl rendered identically. These tests pin the scale that replaced it.
 */
describe("control size scales", () => {
    const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

    const SCALES: readonly { readonly name: string; readonly scale: CompactSizeScale; readonly probe: `--${string}` }[] = [
        { name: "Slider", scale: compactSliderScale, probe: "--slider-size" },
        { name: "Checkbox", scale: compactCheckboxScale, probe: "--checkbox-size" },
        { name: "Radio", scale: compactRadioScale, probe: "--radio-size" },
        { name: "Switch", scale: compactSwitchScale, probe: "--switch-height" },
        { name: "SegmentedControl", scale: compactSegmentedControlScale, probe: "--sc-font-size" },
    ];

    it.each(SCALES)("$name answers every size token with a distinct value", ({ scale, probe }) => {
        const values = SIZES.map((size) => compactVarsForSize(scale, size)[probe]);
        expect(values.every((value) => typeof value === "string")).toBe(true);
        expect(new Set(values).size).toBe(SIZES.length);
    });

    it.each(SCALES)("$name grows monotonically from xs to xl", ({ scale, probe }) => {
        const pixels = SIZES.map((size) => Number.parseFloat(compactVarsForSize(scale, size)[probe]));
        const sorted = [...pixels].sort((a, b) => a - b);
        expect(pixels).toEqual(sorted);
        expect(new Set(pixels).size).toBe(SIZES.length);
    });

    it("keeps the pre-fix compact values on the sm entry", () => {
        // These are exactly what the argument-less resolvers used to return, so
        // the compact default is unchanged and only the other tokens move.
        expect(compactVarsForSize(compactSliderScale, "sm")).toEqual({
            "--slider-size": "4px",
            "--slider-thumb-size": "12px",
        });
        expect(compactVarsForSize(compactCheckboxScale, "sm")).toEqual({ "--checkbox-size": "16px" });
        expect(compactVarsForSize(compactRadioScale, "sm")["--radio-size"]).toBe("16px");
        expect(compactVarsForSize(compactSwitchScale, "sm")["--switch-height"]).toBe("16px");
        expect(compactVarsForSize(compactSwitchScale, "sm")["--switch-width"]).toBe("28px");
        expect(compactVarsForSize(compactSegmentedControlScale, "sm")["--sc-font-size"]).toBe("10px");
    });

    it.each(SCALES)("$name resolves an unspecified size to the compact entry", ({ scale }) => {
        expect(compactVarsForSize(scale, undefined)).toEqual(scale.sizes[scale.compactSize]);
    });

    it.each(SCALES)("$name resolves the legacy size name 'compact' to the compact entry", ({ scale }) => {
        // graphty still passes size="compact" at several hundred call sites and
        // it is not a Mantine size token, so it must not fall through to Mantine.
        expect(compactVarsForSize(scale, "compact")).toEqual(scale.sizes[scale.compactSize]);
    });

    it.each(SCALES)("$name falls back to the compact entry for a size it does not list", ({ scale }) => {
        // Not {}: leaving Mantine's resolver unopposed would answer in rem and
        // mix unit systems with this package's px grid. A numeric size is the
        // case that matters -- several components pass size={PANEL_GRID.TRAIL}.
        expect(compactVarsForSize(scale, "gargantuan")).toEqual(scale.sizes[scale.compactSize]);
        expect(compactVarsForSize(scale, 24)).toEqual(scale.sizes[scale.compactSize]);
    });

    it("wires props.size into every control vars resolver", () => {
        // A resolver that declares no parameters is the defect this suite
        // guards: it cannot see the size and answers the same for all of them.
        for (const [name, extension] of Object.entries(controlComponentExtensions)) {
            expect(extension.vars, name).toBeDefined();
            expect(extension.vars?.length, name).toBe(2);
        }
    });
});
