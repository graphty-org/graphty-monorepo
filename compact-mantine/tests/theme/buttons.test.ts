import { describe, expect, it } from "vitest";

import { buttonComponentExtensions } from "../../src/theme/components/buttons";
import {
    compactActionIconScale,
    compactActionIconVariantVars,
    compactButtonScale,
    compactButtonVariantVars,
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

    it("exports exactly 4 button components (the joined group is themed too)", () => {
        const components = Object.keys(buttonComponentExtensions);
        expect(components).toHaveLength(4);
        expect(components).toContain("Button");
        expect(components).toContain("ActionIcon");
        expect(components).toContain("ActionIconGroup");
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

    it("puts Figma's measurements on each component's default size (design/figma-spec.md 4)", () => {
        // Button sm = Figma md: 24 tall, 11px, the label inset 8. ActionIcon sm: the 24 ghost.
        // CloseButton sm: Figma's 24 close with a 10 X; xs is the 16 inline clear.
        expect(compactVarsForSize(compactButtonScale, "sm")).toEqual({
            "--button-height": "24px",
            "--button-fz": "11px",
            "--button-padding-x": "8px",
        });
        expect(compactVarsForSize(compactButtonScale, "md")).toEqual({
            "--button-height": "32px",
            "--button-fz": "11px",
            "--button-padding-x": "12px",
        });
        expect(compactVarsForSize(compactActionIconScale, "sm")).toEqual({ "--ai-size": "24px" });
        expect(compactVarsForSize(compactActionIconScale, "md")).toEqual({ "--ai-size": "32px", "--cm-ai-padding": "0 4px" });
        expect(compactVarsForSize(compactCloseButtonScale, "sm")).toEqual({ "--cb-size": "24px", "--cb-icon-size": "10px" });
        expect(compactVarsForSize(compactCloseButtonScale, "xs")).toEqual({ "--cb-size": "16px", "--cb-icon-size": "10px" });
    });

    it("marks CloseButton's compact entry as sm, matching its defaultProps", () => {
        expect(compactCloseButtonScale.compactSize).toBe("sm");
        expect(buttonComponentExtensions.CloseButton.defaultProps?.size).toBe("sm");
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
            if (name === "ActionIconGroup") {
                continue; // the group has no size
            }
            expect(extension.vars, name).toBeDefined();
            expect(extension.vars?.length, name).toBe(2);
        }
    });

    it("names no colour per SIZE for ActionIcon: colours are per variant", () => {
        // Item 2, 2026-09-13: variant="filled" color="red" must still render filled in its
        // colour, so the size scale names only the box; the variant vars decide colour.
        for (const size of SIZES) {
            const keys = Object.keys(compactVarsForSize(compactActionIconScale, size));
            expect(keys.filter((k) => !["--ai-size", "--cm-ai-padding"].includes(k))).toEqual([]);
        }
    });
});

/**
 * The per-variant colours (design/figma-spec.md 4.1, 4.3). Each look writes Mantine's own colour
 * variables from the `--cm-*` tokens. ActionIcon `light` is Figma's "highlighted" look and no
 * longer carries the 1px accent border older releases added (breaking change 8 in spec 15).
 */
describe("ActionIcon variant vars", () => {
    it("draws the omitted variant (subtle) as Figma's ghost", () => {
        expect(compactActionIconVariantVars()).toMatchObject({
            "--ai-bg": "transparent",
            "--ai-hover": "var(--cm-bg-transparent-hover)",
            "--cm-ai-pressed": "var(--cm-bg-transparent-pressed)",
            "--ai-color": "var(--cm-icon)",
            "--ai-bd": "none",
        });
    });

    it("draws light as the highlighted look, with no border", () => {
        const vars = compactActionIconVariantVars("light");
        expect(vars).toMatchObject({
            "--ai-bg": "var(--cm-bg-selected)",
            "--ai-hover": "var(--cm-bg-selected-hover)",
            "--cm-ai-pressed": "var(--cm-bg-selected-pressed)",
            "--ai-color": "var(--cm-icon-brand)",
            "--ai-bd": "none",
        });
    });

    it("gives default the translucent edge and joined the secondary ground", () => {
        expect(compactActionIconVariantVars("default")["--cm-ai-outline"]).toBe("var(--cm-border-translucent)");
        expect(compactActionIconVariantVars("joined")).toMatchObject({
            "--ai-bg": "var(--cm-bg-secondary)",
            "--ai-hover": "var(--cm-bg-pressed)",
        });
    });

    it("keeps the ghost for the neutral palettes AdvancedButton passes", () => {
        expect(compactActionIconVariantVars("subtle", "gray")["--ai-bg"]).toBe("transparent");
    });

    it("leaves a coloured look, outline, transparent, white and gradient to Mantine", () => {
        expect(compactActionIconVariantVars("filled", "red")).toEqual({});
        expect(compactActionIconVariantVars("light", "grape")).toEqual({});
        for (const variant of ["outline", "transparent", "white", "gradient"]) {
            expect(compactActionIconVariantVars(variant), variant).toEqual({});
        }
    });

    it("never names an accent-coloured border", () => {
        for (const variant of ["subtle", "default", "light", "filled", "joined"]) {
            expect(compactActionIconVariantVars(variant)["--ai-bd"], variant).toBe("none");
        }
    });
});

describe("Button variant vars", () => {
    it("draws the omitted variant as the primary, and color='red' as danger", () => {
        expect(compactButtonVariantVars()).toMatchObject({
            "--button-bg": "var(--cm-bg-brand)",
            "--cm-btn-pressed-color": "var(--cm-text-onbrand-secondary)",
            "--cm-btn-disabled-bg": "var(--cm-bg-disabled)",
        });
        expect(compactButtonVariantVars("filled", "red")["--button-bg"]).toBe("var(--cm-bg-danger)");
        expect(compactButtonVariantVars("filled", "brand", "brand")["--button-bg"]).toBe("var(--cm-bg-brand)");
    });

    it("draws the outlined looks' disabled edge and the solid looks' disabled fill", () => {
        expect(compactButtonVariantVars("default")["--cm-btn-disabled-outline"]).toBe("var(--cm-border-disabled)");
        expect(compactButtonVariantVars("danger-outline")["--cm-btn-disabled-outline"]).toBe("var(--cm-border-disabled)");
        expect(compactButtonVariantVars("success")["--cm-btn-disabled-bg"]).toBe("var(--cm-bg-disabled)");
        expect(compactButtonVariantVars("subtle")["--cm-btn-disabled-bg"]).toBe("transparent");
    });

    it("leaves a non-primary filled colour and the Mantine-only variants alone", () => {
        expect(compactButtonVariantVars("filled", "grape")).toEqual({});
        expect(compactButtonVariantVars("gradient")).toEqual({});
        expect(compactButtonVariantVars("white")).toEqual({});
    });
});
