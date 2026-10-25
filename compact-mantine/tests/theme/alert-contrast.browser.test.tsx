/**
 * A yellow Alert's title reads at 4.5:1 or better on its own tint, over the panel, in both
 * schemes, with the AA option (highContrast). Mantine draws it in yellow-6, which measured 1.75:1
 * in the light scheme; the title takes the warning text token, whose default is Figma's value and
 * whose AA value is raised to meet the guideline.
 */
import { Alert } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

import { part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

/** The rgba channels of a computed color. */
function channels(color: string): number[] {
    const [r, g, b, a = 1] = (color.match(/[\d.]+/g) ?? []).map(Number);
    return [r, g, b, a];
}

/** Composite a translucent color over an opaque ground. */
function over(color: string, ground: string): string {
    const [r, g, b, a] = channels(color);
    const [gr, gg, gb] = channels(ground);
    return `rgb(${r * a + gr * (1 - a)}, ${g * a + gg * (1 - a)}, ${b * a + gb * (1 - a)})`;
}

/** WCAG relative luminance of an opaque rgb() color. */
function luminance(color: string): number {
    const [r, g, b] = channels(color)
        .slice(0, 3)
        .map((c) => {
            const v = c / 255;
            return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast of two opaque colors. */
function contrast(a: string, b: string): number {
    const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("Alert", () => {
    for (const scheme of ["light", "dark"] as const) {
        it(`a yellow alert's title meets 4.5:1 on its tint with the AA option (${scheme})`, async () => {
            const { container } = await renderThemed(
                <div className="ground" style={{ background: "var(--cm-bg)", padding: 8 }}>
                    <Alert color="yellow" title="Layout still moving" />
                </div>,
                { scheme, highContrast: true },
            );
            const ground = getComputedStyle(part(container, ".ground")).backgroundColor;
            const tint = over(getComputedStyle(part(container, ".mantine-Alert-root")).backgroundColor, ground);
            const title = over(getComputedStyle(part(container, ".mantine-Alert-title")).color, tint);
            expect(contrast(title, tint)).toBeGreaterThanOrEqual(4.5);
        });
    }
});
