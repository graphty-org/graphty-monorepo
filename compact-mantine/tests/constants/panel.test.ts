import { describe, expect, it } from "vitest";

import { PANEL_GRID, PANEL_INK } from "../../src/constants/panel";
import { CM_COLORS, CM_HIGH_CONTRAST, type CmColorName } from "../../src/theme/tokens";

// PANEL_INK resolves through the --cm-* token table. These tests resolve each ink in each
// scheme and contrast mode and measure WCAG 2.x contrast on the composited colour, so the AA
// option provably reaches AA and a token moved below its role's ratio fails here.

type Scheme = "light" | "dark";
type Mode = "figma" | "high";
type Rgba = [number, number, number, number];

function tokenOf(ink: string): CmColorName {
    const m = /^var\(--cm-([a-z-]+)\)$/.exec(ink);
    if (!m || !(m[1] in CM_COLORS)) {
        throw new Error(`${ink} is not a --cm-* token`);
    }
    return m[1] as CmColorName;
}

function resolve(name: CmColorName, scheme: Scheme, mode: Mode): Rgba {
    const token = (mode === "high" ? CM_HIGH_CONTRAST[name] : undefined) ?? CM_COLORS[name];
    const hex = token[scheme].slice(1);
    const a = hex.length === 8 ? parseInt(hex.slice(6, 8), 16) / 255 : 1;
    return [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16), a];
}

/** Composite a (possibly translucent) colour over an opaque ground. */
function over(top: Rgba, ground: Rgba): Rgba {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + ground[i] * (1 - a)).concat(1) as Rgba;
}

function luminance([r, g, b]: Rgba): number {
    const [lr, lg, lb] = [r, g, b].map((c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

/**
 * Contrast of `fg` drawn on `bg`, where `bg` itself sits on the panel.
 * @returns the WCAG ratio
 */
function contrast(fg: string, bg: string, scheme: Scheme, mode: Mode): number {
    const panel = resolve("bg", scheme, mode);
    const ground = over(resolve(tokenOf(bg), scheme, mode), panel);
    const ink = over(resolve(tokenOf(fg), scheme, mode), ground);
    const [hi, lo] = [luminance(ink), luminance(ground)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("PANEL_GRID (spec 9.1)", () => {
    it("adds up to the 240px panel", () => {
        const { PAD_LEFT, FIELD, GUTTER, TRAIL_GAP, TRAIL, PAD_RIGHT, WIDTH } = PANEL_GRID;
        expect(PAD_LEFT + FIELD + GUTTER + FIELD + TRAIL_GAP + TRAIL + PAD_RIGHT).toBe(WIDTH);
        expect(WIDTH).toBe(240);
    });

    it("derives the content, body and triple spans from the members", () => {
        expect(PANEL_GRID.CONTENT).toBe(PANEL_GRID.WIDTH - PANEL_GRID.PAD_LEFT - PANEL_GRID.PAD_RIGHT);
        expect(PANEL_GRID.BODY).toBe(PANEL_GRID.FIELD * 2 + PANEL_GRID.GUTTER);
        expect(PANEL_GRID.TRIPLE * 3).toBeCloseTo(PANEL_GRID.BODY);
        expect(PANEL_GRID.TRIPLE_GAP).toBe(0);
    });

    it("carries Figma's row geometry", () => {
        expect(PANEL_GRID).toMatchObject({
            FIELD: 88,
            CONTROL_HEIGHT: 24,
            ROW_PITCH: 32,
            TOGGLE_PITCH: 32,
            DATA_PITCH: 32,
            SECTION_HEADER: 40,
            SECTION_PAD_BOTTOM: 12,
            GLYPH_SLOT: 24,
            GLYPH: 12,
            CHEVRON: 10,
            LABEL_COLUMN: 72,
            FIELD_ROW: 48,
            CAPTION_ROW: 50,
            LEGEND: 16,
            POPOVER_WIDTH: 240,
            POPOVER_HEADER: 40,
        });
        expect(PANEL_GRID.FIELD_ROW).toBe(PANEL_GRID.LEGEND + 4 + PANEL_GRID.CONTROL_HEIGHT + 4);
    });
});

describe("PANEL_INK (spec 2.2)", () => {
    it("resolves every role to a --cm-* token", () => {
        for (const ink of Object.values(PANEL_INK)) {
            expect(() => tokenOf(ink)).not.toThrow();
        }
    });

    it("gives a selected item Figma's selected ground and a brand glyph", () => {
        expect(PANEL_INK.SELECTED).toBe("var(--cm-bg-selected)");
        expect(PANEL_INK.ON_SELECTED).toBe("var(--cm-icon-brand)");
    });

    it("keeps an inoperable control's ink separate from placeholder text", () => {
        expect(PANEL_INK.DISABLED).not.toBe(PANEL_INK.PLACEHOLDER);
    });
});

describe.each(["light", "dark"] as Scheme[])("the AA option reaches WCAG 2.2 AA (%s)", (scheme) => {
    const c = (fg: string, bg: string): number => contrast(fg, bg, scheme, "high");

    it("secondary text on the panel and on a field (1.4.3, 4.5:1)", () => {
        expect(c(PANEL_INK.CHROME, PANEL_INK.PANEL)).toBeGreaterThanOrEqual(4.5);
        expect(c(PANEL_INK.CHROME, PANEL_INK.SURFACE)).toBeGreaterThanOrEqual(4.5);
    });

    it("placeholder text on a field (1.4.3, 4.5:1)", () => {
        expect(c(PANEL_INK.PLACEHOLDER, PANEL_INK.SURFACE)).toBeGreaterThanOrEqual(4.5);
    });

    it("checkbox and switch borders, and the field edge, against the panel (1.4.11, 3:1)", () => {
        expect(c(PANEL_INK.TRANSLUCENT_STRONG, PANEL_INK.PANEL)).toBeGreaterThanOrEqual(3);
        expect(c("var(--cm-field-edge)", PANEL_INK.PANEL)).toBeGreaterThanOrEqual(3);
    });

    it("the selected segment's edge against its track (1.4.11, 3:1)", () => {
        expect(c("var(--cm-segment-edge)", PANEL_INK.SURFACE)).toBeGreaterThanOrEqual(3);
    });

    it("the focus ring against the panel (2.4.13 / 1.4.11, 3:1)", () => {
        expect(c(PANEL_INK.FOCUS, PANEL_INK.PANEL)).toBeGreaterThanOrEqual(3);
    });

    it("white text on the brand, danger and success fills (1.4.3, 4.5:1)", () => {
        expect(c(PANEL_INK.ON_ACCENT, PANEL_INK.ACCENT)).toBeGreaterThanOrEqual(4.5);
        expect(c(PANEL_INK.ON_ACCENT, PANEL_INK.DANGER)).toBeGreaterThanOrEqual(4.5);
        expect(c(PANEL_INK.ON_ACCENT, PANEL_INK.SUCCESS)).toBeGreaterThanOrEqual(4.5);
    });

    it("links on the panel (1.4.3, 4.5:1)", () => {
        expect(c(PANEL_INK.BRAND_TEXT, PANEL_INK.PANEL)).toBeGreaterThanOrEqual(4.5);
    });

    it("a disabled control stays visibly dimmer than placeholder text", () => {
        expect(c(PANEL_INK.DISABLED, PANEL_INK.SURFACE)).toBeLessThan(c(PANEL_INK.PLACEHOLDER, PANEL_INK.SURFACE));
    });
});

describe("at Figma defaults the values are Figma's, including where they miss AA", () => {
    it("secondary text is 50% black: 4.1:1 on a light field", () => {
        expect(contrast(PANEL_INK.CHROME, PANEL_INK.SURFACE, "light", "figma")).toBeLessThan(4.5);
    });

    it("the #0d99ff focus ring is just under 3:1 on white", () => {
        expect(contrast(PANEL_INK.FOCUS, PANEL_INK.PANEL, "light", "figma")).toBeCloseTo(2.99, 1);
    });
});
