import { describe, expect, it } from "vitest";

import { buttonComponentExtensions } from "../../src/theme/components/buttons";
import {
    compactActionIconScale,
    compactActionIconVariantVars,
    compactButtonScale,
    compactCloseButtonScale,
} from "../../src/theme/styles/buttons";
import { type CompactSizeScale, compactVarsForSize } from "../../src/theme/styles/size-scale";

describe("buttonComponentExtensions", () => {
    it("exports Button extension", () => {
        expect(buttonComponentExtensions.Button).toBeDefined();
    });

    it("exports ActionIcon extension", () => {
        expect(buttonComponentExtensions.ActionIcon).toBeDefined();
    });

    it("exports CloseButton extension", () => {
        expect(buttonComponentExtensions.CloseButton).toBeDefined();
    });

    it("exports exactly 3 button components", () => {
        const components = Object.keys(buttonComponentExtensions);
        expect(components).toHaveLength(3);
        expect(components).toContain("Button");
        expect(components).toContain("ActionIcon");
        expect(components).toContain("CloseButton");
    });
});

/**
 * Regression cover for the product owner's 2026-09-13 report, "sizes aren't
 * varying anymore". The defect was a `vars: () => ...` resolver that ignored its
 * arguments and answered every size token with one frozen object, so xs through
 * xl rendered identically. These tests pin the scale that replaced it.
 */
describe("button size scales", () => {
    const SIZES = ["xs", "sm", "md", "lg", "xl"] as const;

    const SCALES: readonly { readonly name: string; readonly scale: CompactSizeScale; readonly probe: `--${string}` }[] = [
        { name: "Button", scale: compactButtonScale, probe: "--button-height" },
        { name: "ActionIcon", scale: compactActionIconScale, probe: "--ai-size" },
        { name: "CloseButton", scale: compactCloseButtonScale, probe: "--cb-size" },
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

    it("keeps the pre-fix compact values on each component's default size", () => {
        // These are exactly what the argument-less resolvers used to return.
        // Button and ActionIcon default to sm, CloseButton to xs.
        expect(compactVarsForSize(compactButtonScale, "sm")).toEqual({
            "--button-height": "24px",
            "--button-fz": "11px",
            "--button-padding-x": "8px",
        });
        expect(compactVarsForSize(compactActionIconScale, "sm")).toEqual({ "--ai-size": "24px" });
        expect(compactVarsForSize(compactCloseButtonScale, "xs")).toEqual({
            "--cb-size": "16px",
            "--cb-icon-size": "12px",
        });
    });

    it("marks CloseButton's compact entry as xs, matching its defaultProps", () => {
        expect(compactCloseButtonScale.compactSize).toBe("xs");
        expect(buttonComponentExtensions.CloseButton.defaultProps?.size).toBe("xs");
        expect(compactButtonScale.compactSize).toBe("sm");
        expect(compactActionIconScale.compactSize).toBe("sm");
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

    it("wires props.size into every button vars resolver", () => {
        // A resolver that declares no parameters is the defect this suite
        // guards: it cannot see the size and answers the same for all of them.
        for (const [name, extension] of Object.entries(buttonComponentExtensions)) {
            expect(extension.vars, name).toBeDefined();
            expect(extension.vars?.length, name).toBe(2);
        }
    });

    it("names only --ai-size per SIZE for ActionIcon, leaving Mantine's variant colours alone", () => {
        // Item 2, 2026-09-13: variant="filled" must still render filled in its
        // colour. Mantine derives --ai-bg / --ai-color / --ai-hover from color +
        // variant in its own varsResolver, and resolve-vars merges per key, so
        // the theme must not name any of them.
        for (const size of SIZES) {
            expect(Object.keys(compactVarsForSize(compactActionIconScale, size))).toEqual(["--ai-size"]);
        }
    });
});

/**
 * Cover for the product owner's 2026-09-13 item 4, "the custom lock button was not
 * necessary ... if the components are wrong, they should be fixed". graphty's shell had
 * written its own inset-box-shadow ring on two header rows because Mantine's `light`
 * ground -- the ACTIVE state of a dense toggle -- measures 1.21:1 against the panel it
 * sits on in the dark scheme and 1.12:1 in the light one, where WCAG 2.2 (1.4.11) asks
 * 3:1 of a state boundary. The boundary is this theme's job, once, for every caller.
 */
describe("ActionIcon variant vars", () => {
    it("gives the light variant a 1px border in the variant's own ink", () => {
        expect(compactActionIconVariantVars("light")).toEqual({ "--ai-bd": "1px solid var(--ai-color)" });
    });

    it("names nothing at all for every other variant", () => {
        // Mantine fills --ai-bd with `1px solid transparent` for these, and that
        // reserved-but-invisible pixel is what keeps the 24px box from moving between a
        // resting control and an active one. `outline` already draws a real border.
        for (const variant of ["subtle", "filled", "outline", "transparent", "white", "default", "gradient", "none"]) {
            expect(compactActionIconVariantVars(variant), variant).toEqual({});
        }
    });

    it("names nothing for an absent variant, which the theme's defaultProps resolve to subtle", () => {
        expect(compactActionIconVariantVars()).toEqual({});
        expect(compactActionIconVariantVars(null)).toEqual({});
    });
});
