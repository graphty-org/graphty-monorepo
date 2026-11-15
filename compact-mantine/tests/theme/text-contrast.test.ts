import { describe, expect, it } from "vitest";

import { compactColors } from "../../src/theme/colors";
import { CM_COLORS, CM_HIGH_CONTRAST } from "../../src/theme/tokens";

/**
 * WCAG 1.4.3 (AA): body text needs 4.5:1 against what it is drawn on. With the AA option
 * (`highContrast`) on, every color the theme hands out for readable, non-disabled text is checked
 * here against every surface it sits on, in both schemes. The default theme is Figma's and is not
 * held to this (tests/constants/panel.test.ts records where it misses). Mantine's dimmed text
 * follows the secondary ink in the AA mode, so it is covered by text-secondary.
 */

function rgba(color: string): [number, number, number, number] {
    const h = color.slice(1);
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
    const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return [r, g, b, a];
}

function luminance(rgb: number[]): number {
    const [r, g, b] = rgb.map((c) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast of a (possibly translucent) text color over an opaque surface. */
function contrast(text: string, surface: string): number {
    const [fr, fg, fb, a] = rgba(text);
    const bg = rgba(surface);
    const fg2 = [fr * a + bg[0] * (1 - a), fg * a + bg[1] * (1 - a), fb * a + bg[2] * (1 - a)];
    const [hi, lo] = [luminance(fg2), luminance(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

type Scheme = "light" | "dark";
const tok = (name: keyof typeof CM_COLORS, scheme: Scheme): string =>
    (CM_HIGH_CONTRAST[name] ?? CM_COLORS[name])[scheme];

/** The panel, the field and the selected row: where panel text is drawn. */
const panelSurfaces = (s: Scheme): string[] => [tok("bg", s), tok("bg-secondary", s), tok("bg-selected", s)];

/** Each readable text color, by scheme, with the surfaces it is drawn on. */
const TEXT: Record<Scheme, { name: string; color: string; on: string[] }[]> = {
    light: [
        { name: "text", color: tok("text", "light"), on: panelSurfaces("light") },
        { name: "text-secondary", color: tok("text-secondary", "light"), on: panelSurfaces("light") },
        { name: "text-menu-secondary", color: tok("text-menu-secondary", "light"), on: [tok("bg-menu", "light")] },
    ],
    dark: [
        { name: "text", color: tok("text", "dark"), on: panelSurfaces("dark") },
        { name: "text-secondary", color: tok("text-secondary", "dark"), on: panelSurfaces("dark") },
        { name: "text-menu-secondary", color: tok("text-menu-secondary", "dark"), on: [tok("bg-menu", "dark")] },
    ],
};

describe("readable text contrast (WCAG 1.4.3, 4.5:1)", () => {
    for (const scheme of ["light", "dark"] as const) {
        for (const { name, color, on } of TEXT[scheme]) {
            for (const surface of on) {
                it(`${scheme}: ${name} ${color} on ${surface}`, () => {
                    expect(contrast(color, surface)).toBeGreaterThanOrEqual(4.5);
                });
            }
        }
    }

    it("keeps dimmed text visibly darker than the ramp's secondary shade in dark", () => {
        expect(contrast(compactColors.dark[1], compactColors.dark[2])).toBeGreaterThan(1.2);
    });
});
