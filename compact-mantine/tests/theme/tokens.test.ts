import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";

import { describe, expect, it } from "vitest";

import { compactTheme } from "../../src/theme";
import { compactGlobalCss } from "../../src/theme/global-styles";
import {
    CM_COLORS,
    CM_ELEVATIONS,
    CM_HIGH_CONTRAST,
    CM_TYPE,
    type CmColorToken,
    cmFont,
    compactFontSizes,
    compactLineHeights,
    compactRadius,
    compactShadows,
    compactSpacing,
    elevationValue,
} from "../../src/theme/tokens";

/** The Figma study, when this checkout has it (design/ui/figma, found by walking up). */
function figmaStudy(): string | null {
    for (let dir = __dirname; dir !== dirname(dir); dir = dirname(dir)) {
        const candidate = join(dir, "design/ui/figma");
        if (existsSync(join(candidate, "components.md"))) {
            return candidate;
        }
    }
    return null;
}

const STUDY = figmaStudy();

function expandHex(value: string): string {
    const v = value.trim().toLowerCase();
    const m = /^#([0-9a-f]{3,4})$/.exec(v);
    return m ? `#${[...m[1]].map((d) => d + d).join("")}` : v;
}

describe("Mantine scales (spec 2.3-2.6)", () => {
    it("font sizes are Figma's type steps", () => {
        expect(compactFontSizes).toEqual({ xs: "9px", sm: "11px", md: "13px", lg: "15px", xl: "24px" });
        expect(compactTheme.fontSizes).toMatchObject(compactFontSizes);
    });

    it("line heights are px and pair with the font sizes", () => {
        expect(compactLineHeights).toEqual({ xs: "14px", sm: "16px", md: "22px", lg: "25px", xl: "32px" });
        expect(compactTheme.lineHeights).toMatchObject(compactLineHeights);
    });

    it("spacing is on Figma's 4px grid, with md kept at 8", () => {
        expect(compactSpacing).toEqual({ xs: "4px", sm: "8px", md: "8px", lg: "12px", xl: "16px" });
        expect(compactTheme.spacing).toMatchObject(compactSpacing);
    });

    it("radii are Figma's small / medium / large", () => {
        expect(compactRadius).toEqual({ xs: "2px", sm: "5px", md: "5px", lg: "13px", xl: "13px" });
        expect(compactTheme.radius).toMatchObject(compactRadius);
        expect(compactTheme.defaultRadius).toBe("sm");
    });

    it("shadows map onto the five elevations", () => {
        expect(compactShadows).toEqual({
            xs: "var(--cm-elevation-100)",
            sm: "var(--cm-elevation-200)",
            md: "var(--cm-elevation-300)",
            lg: "var(--cm-elevation-400)",
            xl: "var(--cm-elevation-500)",
        });
        expect(compactTheme.shadows).toMatchObject(compactShadows);
    });
});

describe("type roles (spec 2.3)", () => {
    it("body is 11/16 at weight 450 with 0.055px tracking", () => {
        expect(CM_TYPE.body).toEqual({ fontSize: 11, lineHeight: 16, fontWeight: 450, letterSpacing: "0.055px" });
        expect(cmFont("body")).toBe("font-size: 11px; line-height: 16px; font-weight: 450; letter-spacing: 0.055px;");
    });

    it("emphasis is weight: strong 550, top-level layers 600", () => {
        expect(CM_TYPE.bodyStrong.fontWeight).toBe(550);
        expect(CM_TYPE.layerTop.fontWeight).toBe(600);
        expect(CM_TYPE.bodyStrong.fontSize).toBe(CM_TYPE.body.fontSize);
    });
});

describe.skipIf(!STUDY)("colour tokens equal the Figma variables (spec 2.1)", () => {
    const study = STUDY ?? "";
    const light = STUDY
        ? (JSON.parse(readFileSync(join(study, "tokens/css-variables.json"), "utf8")) as { vars: Record<string, string> }).vars
        : {};
    const dark = STUDY
        ? (JSON.parse(readFileSync(join(study, "tokens/css-variables-dark.json"), "utf8")) as { vars: Record<string, string> })
              .vars
        : {};
    const traced = (Object.entries(CM_COLORS) as [string, CmColorToken][]).filter(([, t]) => t.figma);

    it.each(traced)("--cm-%s", (_name, token) => {
        const figma = token.figma ?? "";
        expect(light[figma], `${figma} missing from the light capture`).toBeDefined();
        expect(expandHex(light[figma])).toBe(token.light);
        expect(expandHex(dark[figma])).toBe(token.dark);
    });
});

describe("the AA option (spec 2.9)", () => {
    it("changes exactly the listed tokens and no others", () => {
        expect(Object.keys(CM_HIGH_CONTRAST).sort()).toEqual(
            [
                "text-secondary",
                "icon-secondary",
                "border-translucent-strong",
                "field-edge",
                "field-edge-hover",
                "segment-edge",
                "text-tertiary",
                "border-selected",
                "bg-brand",
                "bg-brand-hover",
                "bg-brand-pressed",
                "text-brand",
                "icon-brand",
                "bg-danger",
                "bg-success",
            ].sort(),
        );
    });

    it("uses the owner's values", () => {
        expect(CM_HIGH_CONTRAST["text-secondary"]).toEqual({ light: "#0000008c", dark: "#ffffffb2" });
        expect(CM_HIGH_CONTRAST["border-translucent-strong"]).toEqual({ light: "#00000073", dark: "#ffffff59" });
        expect(CM_HIGH_CONTRAST["field-edge"]).toEqual({ light: "#00000073", dark: "#ffffff59" });
        expect(CM_HIGH_CONTRAST["segment-edge"]).toEqual({ light: "#00000073", dark: "#ffffff73" });
    });

    it("leaves the dividers as Figma", () => {
        expect(CM_HIGH_CONTRAST).not.toHaveProperty("border");
    });

    it("stays inside the token vocabulary", () => {
        for (const name of Object.keys(CM_HIGH_CONTRAST)) {
            expect(CM_COLORS).toHaveProperty(name);
        }
    });
});

describe("elevations (spec 2.6)", () => {
    it("carries both schemes' layers, each colour stop light-dark() with transparent for the other", () => {
        const value = elevationValue("400");
        const layers = value.split(/,\s*(?![^(]*\))/);
        expect(layers.length).toBeGreaterThan(0);
        const lightLayers = CM_ELEVATIONS["400"].light.length;
        const darkLayers = CM_ELEVATIONS["400"].dark.length;
        expect(value.match(/light-dark\(rgba\([^)]*\), transparent\)/g)).toHaveLength(lightLayers);
        expect(value.match(/light-dark\(transparent, rgba\([^)]*\)\)/g)).toHaveLength(darkLayers);
    });

    it("uses the 0.5px first blur measured live", () => {
        expect(CM_ELEVATIONS["100"].light[0]).toBe("0 0 .5px rgba(0,0,0,.3)");
    });
});

describe("the stylesheet", () => {
    const css = compactGlobalCss();

    it("declares every colour token with light-dark() where the schemes differ", () => {
        for (const [name, token] of Object.entries(CM_COLORS) as [string, CmColorToken][]) {
            const expected = token.light === token.dark ? token.light : `light-dark(${token.light}, ${token.dark})`;
            expect(css).toContain(`--cm-${name}: ${expected};`);
        }
    });

    it("scopes the AA block to data-cm-contrast=high", () => {
        expect(css).toMatch(/:root\[data-cm-contrast="high"\] \{\s+--cm-text-secondary: light-dark\(#0000008c, #ffffffb2\);/);
    });

    it("with highContrast, applies the AA tokens without the attribute (SSR, shadow roots)", () => {
        expect(compactGlobalCss({ highContrast: true })).toMatch(/:root, :host \{\s+--cm-text-secondary/);
    });

    it("bundles the Inter face and sets the body type", () => {
        expect(css).toMatch(/@font-face \{\s+font-family: "Inter Variable";/);
        expect(css).toContain("font-weight: 100 900;");
        expect(css).toMatch(/body \{\s+font-family: var\(--cm-font-family\);\s+font-size: 11px; line-height: 16px; font-weight: 450; letter-spacing: 0.055px;/);
    });
});
