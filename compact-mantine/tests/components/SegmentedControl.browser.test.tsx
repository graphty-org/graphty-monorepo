/**
 * The panel track's options in a real browser, as Figma draws them: an unchosen label in the
 * secondary ink (not the disabled one), the chosen label at 450 (600 in the AA option, where the
 * secondary ink also reads at 4.5:1), and every option an equal share of a track that is not
 * fullWidth, as wide as the widest label so none is cut.
 */
import { screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { SegmentedControl } from "../../src/components/SegmentedControl";
import { contrast } from "../harness/contrast";
import { renderThemed, resetHarness } from "../harness/measure";

afterEach(resetHarness);

const ENDS = [
    { value: "add", label: "Add" },
    { value: "leave-out", label: "Leave out" },
];

const label = (text: string): HTMLElement => screen.getByText(text).closest("label")!;

describe("SegmentedControl: the unchosen option", () => {
    it("light: Figma's secondary ink, not the disabled color", async () => {
        await renderThemed(
            <SegmentedControl
                size="xs"
                aria-label="Unmatched ends"
                defaultValue="leave-out"
                data={[...ENDS, { value: "off", label: "Off", disabled: true }]}
            />,
        );
        expect(getComputedStyle(label("Add")).color).toBe("rgba(0, 0, 0, 0.5)");
        expect(getComputedStyle(label("Add")).color).not.toBe(getComputedStyle(label("Off")).color);
    });

    for (const scheme of ["light", "dark"] as const) {
        it(`${scheme}, AA option: reads at 4.5:1 on the track`, async () => {
            await renderThemed(
                <SegmentedControl size="xs" aria-label="Unmatched ends" defaultValue="leave-out" data={ENDS} />,
                { scheme, highContrast: true },
            );
            const track = screen.getByRole("radiogroup");
            expect(
                contrast(getComputedStyle(label("Add")).color, getComputedStyle(track).backgroundColor),
            ).toBeGreaterThanOrEqual(4.5);
        });
    }
});

describe("SegmentedControl: the chosen option", () => {
    it("draws its label at Figma's 450, as the unchosen ones; the AA option draws it at 600", async () => {
        await renderThemed(
            <SegmentedControl size="xs" aria-label="Unmatched ends" defaultValue="leave-out" data={ENDS} />,
        );
        const weight = (text: string): number => Number(getComputedStyle(label(text)).fontWeight);
        expect(weight("Leave out")).toBe(450);
        expect(weight("Add")).toBe(450);
    });

    it("AA option: the chosen label is 600", async () => {
        await renderThemed(
            <SegmentedControl size="xs" aria-label="Unmatched ends" defaultValue="leave-out" data={ENDS} />,
            { highContrast: true },
        );
        expect(Number(getComputedStyle(label("Leave out")).fontWeight)).toBe(600);
    });
});

describe("SegmentedControl: a track that is not fullWidth", () => {
    it("gives each option an equal share, as wide as the widest label, and cuts no label", async () => {
        await renderThemed(
            <SegmentedControl size="xs" aria-label="Unmatched ends" defaultValue="leave-out" data={ENDS} />,
        );
        const add = label("Add").getBoundingClientRect();
        const leave = label("Leave out");
        expect(Math.abs(add.width - leave.getBoundingClientRect().width)).toBeLessThan(1);
        expect(add.height).toBe(24);
        expect(leave.scrollWidth).toBeLessThanOrEqual(leave.clientWidth);
    });
});
