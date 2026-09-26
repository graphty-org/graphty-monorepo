/**
 * The sub-group's geometry, measured in a real browser (design/figma-spec.md 9.4).
 *
 * The header is Figma's 32px row whose chevron hangs in the panel's 16px gutter, to the
 * inline-start side of the section's content edge, and the content sits on that same edge
 * with no indent. Both are resolved layout under a text direction, so every assertion here is a
 * `getBoundingClientRect`, not a style declaration.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSubGroup, PANEL_GRID } from "../../src";

/**
 * Render the sub-group where a panel puts it: inside a section's content, which pads 16 at the
 * inline start and 8 at the inline end of a 240px panel.
 * @param direction - The text direction to render under
 * @returns The testing-library render result
 */
function renderInPanel(direction: "ltr" | "rtl"): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection={direction} detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <div
                    dir={direction}
                    data-testid="panel"
                    style={{
                        width: PANEL_GRID.WIDTH,
                        boxSizing: "border-box",
                        paddingInlineStart: PANEL_GRID.PAD_LEFT,
                        paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    }}
                >
                    <ControlSubGroup label="Text effects" defaultOpened>
                        <div data-testid="child">Outline</div>
                    </ControlSubGroup>
                </div>
            </MantineProvider>
        </DirectionProvider>,
    );
}

describe("ControlSubGroup geometry", () => {
    it("draws the header as a 32px row", () => {
        renderInPanel("ltr");

        const header = screen.getByTestId("control-sub-group-control").getBoundingClientRect();
        expect(header.height).toBeCloseTo(PANEL_GRID.ROW_PITCH, 1);
    });

    it("hangs the chevron in the gutter at x 0..16 and starts the label on the content edge (ltr)", () => {
        renderInPanel("ltr");

        const panel = screen.getByTestId("panel").getBoundingClientRect();
        const slot = screen.getByTestId("control-sub-group-control").firstElementChild!.getBoundingClientRect();
        const label = screen.getByTestId("control-sub-group-label").getBoundingClientRect();

        expect(slot.left - panel.left).toBeCloseTo(0, 1);
        expect(slot.width).toBeCloseTo(16, 1);
        expect(label.left - panel.left).toBeCloseTo(PANEL_GRID.PAD_LEFT, 1);
    });

    it("mirrors the gutter when text runs right to left", () => {
        renderInPanel("rtl");

        const panel = screen.getByTestId("panel").getBoundingClientRect();
        const slot = screen.getByTestId("control-sub-group-control").firstElementChild!.getBoundingClientRect();
        const label = screen.getByTestId("control-sub-group-label").getBoundingClientRect();

        expect(panel.right - slot.right).toBeCloseTo(0, 1);
        expect(panel.right - label.right).toBeCloseTo(PANEL_GRID.PAD_LEFT, 1);
    });

    it("lays its content on the content edge, in both directions", () => {
        const ltr = renderInPanel("ltr");
        const ltrChild = screen.getByTestId("child").getBoundingClientRect();
        const ltrPanel = screen.getByTestId("panel").getBoundingClientRect();
        expect(ltrChild.left - ltrPanel.left).toBeCloseTo(PANEL_GRID.PAD_LEFT, 1);
        ltr.unmount();

        renderInPanel("rtl");
        const rtlChild = screen.getByTestId("child").getBoundingClientRect();
        const rtlPanel = screen.getByTestId("panel").getBoundingClientRect();
        expect(rtlPanel.right - rtlChild.right).toBeCloseTo(PANEL_GRID.PAD_LEFT, 1);
    });
});
