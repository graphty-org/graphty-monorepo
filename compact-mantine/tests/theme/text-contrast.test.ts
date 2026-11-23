import { describe, expect, it } from "vitest";

import { compactColors } from "../../src/theme/colors";
import { CM_COLORS, CM_HIGH_CONTRAST } from "../../src/theme/tokens";
import { contrast } from "../harness/contrast";

/**
 * WCAG 1.4.3 (AA): body text needs 4.5:1 against what it is drawn on. With the AA option
 * (`highContrast`) on, every color the theme hands out for readable, non-disabled text is checked
 * here against every surface it sits on, in both schemes. The default theme is Figma's and is not
 * held to this (tests/constants/panel.test.ts records where it misses). Mantine's dimmed text
 * follows the secondary ink in the AA mode, so it is covered by text-secondary.
 */

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
