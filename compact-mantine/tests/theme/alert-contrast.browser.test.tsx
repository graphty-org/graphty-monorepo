/**
 * A yellow Alert's title reads at 4.5:1 or better on its own tint, over the panel, in both
 * schemes, with the AA option (highContrast). Mantine draws it in yellow-6, which measured 1.75:1
 * in the light scheme; the title takes the warning text token, whose default is Figma's value and
 * whose AA value is raised to meet the guideline.
 */
import { Alert } from "@mantine/core";
import { afterEach, describe, expect, it } from "vitest";

import { contrast, over } from "../harness/contrast";
import { part, renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

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
