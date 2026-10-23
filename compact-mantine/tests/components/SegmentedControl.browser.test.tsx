/**
 * The panel track's unchosen option is a choice the reader can make: in a real browser, its
 * label is drawn in the same body color as the chosen one (the face and edge mark the choice),
 * reads at 4.5:1 or more on the track, and is not drawn in the disabled color. The secondary
 * gray it had passed 4.5:1 on paper and still read as disabled at 10-11px beside the raised
 * chosen option.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SegmentedControl } from "../../src/components/SegmentedControl";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

/**
 * The WCAG contrast ratio of a (possibly translucent) text color over an opaque surface.
 * @param text - the computed text color
 * @param surface - the computed surface color
 * @returns the ratio
 */
function contrast(text: string, surface: string): number {
    const parts = (c: string): number[] => (c.match(/[\d.]+/g) ?? []).map(Number);
    const [r, g, b, a = 1] = parts(text);
    const bg = parts(surface);
    const mixed = [r * a + bg[0] * (1 - a), g * a + bg[1] * (1 - a), b * a + bg[2] * (1 - a)];
    const lum = (rgb: number[]): number => {
        const [lr, lg, lb] = rgb.map((c) => {
            const v = c / 255;
            return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
    };
    const [hi, lo] = [lum(mixed), lum(bg)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
}

describe("SegmentedControl: the unchosen option", () => {
    for (const scheme of ["light", "dark"] as const) {
        it(`${scheme}: is drawn in the chosen option's color, at 4.5:1, not in the disabled color`, async () => {
            await renderThemed(
                <SegmentedControl
                    size="xs"
                    aria-label="Unmatched ends"
                    defaultValue="leave-out"
                    data={[
                        { value: "add", label: "Add" },
                        { value: "leave-out", label: "Leave out" },
                        { value: "off", label: "Off", disabled: true },
                    ]}
                />,
                { scheme },
            );
            const label = (text: string): HTMLElement => screen.getByText(text).closest("label")!;
            const track = screen.getByRole("radiogroup");
            const add = getComputedStyle(label("Add")).color;
            const disabled = getComputedStyle(label("Off")).color;
            expect(add).toBe(getComputedStyle(label("Leave out")).color);
            expect(add).not.toBe(disabled);
            expect(contrast(add, getComputedStyle(track).backgroundColor)).toBeGreaterThanOrEqual(4.5);
        });
    }
});

describe("SegmentedControl: the chosen option", () => {
    it("draws its label in the strong weight, the unchosen ones in the body weight", async () => {
        await renderThemed(
            <SegmentedControl
                size="xs"
                aria-label="Unmatched ends"
                defaultValue="leave-out"
                data={[
                    { value: "add", label: "Add" },
                    { value: "leave-out", label: "Leave out" },
                ]}
            />,
        );
        const weight = (text: string): number =>
            Number(getComputedStyle(screen.getByText(text).closest("label")!).fontWeight);
        expect(weight("Leave out")).toBe(600);
        expect(weight("Add")).toBe(450);
    });
});
