/**
 * The sub-group's geometry, measured in a real browser.
 *
 * Two things about this component can only be checked where there is a layout
 * engine. Its header has to be at least 24px tall to meet the WCAG 2.2 target
 * size minimum, and that height comes from a style Mantine applies through a
 * class rather than from an inline declaration. And its chevron has to lead the
 * label when text runs left to right and follow it when text runs right to
 * left, which is a resolved flex direction rather than an attribute.
 *
 * JSDOM has no layout engine, so every assertion here is a
 * `getBoundingClientRect`, not a style declaration.
 */
import { DirectionProvider, MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSubGroup, PANEL_GRID } from "../../src";

/**
 * Render the sub-group where a panel puts it: inside 280px.
 * @param direction - The text direction to render under
 * @returns The testing-library render result
 */
function renderInPanel(direction: "ltr" | "rtl"): ReturnType<typeof render> {
    return render(
        <DirectionProvider initialDirection={direction} detectDirection={false}>
            <MantineProvider theme={compactTheme}>
                <div dir={direction} style={{ width: PANEL_GRID.WIDTH }}>
                    <ControlSubGroup label="Text effects" defaultOpened>
                        <div data-testid="child">Outline</div>
                    </ControlSubGroup>
                </div>
            </MantineProvider>
        </DirectionProvider>,
    );
}

describe("ControlSubGroup geometry", () => {
    it("draws a header at least 24px tall", () => {
        renderInPanel("ltr");

        // WCAG 2.2 (2.5.8, Target Size). The label is 10px type, so without
        // this the whole pointer target would be about 12px tall.
        const header = screen.getByTestId("control-sub-group-control").getBoundingClientRect();
        expect(header.height).toBeGreaterThanOrEqual(PANEL_GRID.TOGGLE_PITCH);
    });

    it("leads with the chevron when text runs left to right", () => {
        renderInPanel("ltr");

        const control = screen.getByTestId("control-sub-group-control");
        const chevron = control.querySelector("[data-glyph]")?.getBoundingClientRect();
        const label = screen.getByTestId("control-sub-group-label").getBoundingClientRect();

        expect(chevron).toBeDefined();
        expect(chevron?.left).toBeLessThan(label.left);
    });

    it("follows with the chevron when text runs right to left", () => {
        renderInPanel("rtl");

        const control = screen.getByTestId("control-sub-group-control");
        const chevron = control.querySelector("[data-glyph]")?.getBoundingClientRect();
        const label = screen.getByTestId("control-sub-group-label").getBoundingClientRect();

        // The whole point of the rebase's logical layout: the chevron sits at
        // the edge the reader starts from, which is the right-hand one here.
        expect(chevron).toBeDefined();
        expect(chevron?.left).toBeGreaterThan(label.left);
    });

    it("indents its content from the edge the reader starts at, in both directions", () => {
        const ltr = renderInPanel("ltr");
        const ltrChild = screen.getByTestId("child").getBoundingClientRect();
        const ltrPanel = screen.getByTestId("control-sub-group").getBoundingClientRect();
        expect(ltrChild.left - ltrPanel.left).toBeCloseTo(PANEL_GRID.GUTTER, 0);
        ltr.unmount();

        renderInPanel("rtl");
        const rtlChild = screen.getByTestId("child").getBoundingClientRect();
        const rtlPanel = screen.getByTestId("control-sub-group").getBoundingClientRect();
        expect(rtlPanel.right - rtlChild.right).toBeCloseTo(PANEL_GRID.GUTTER, 0);
    });
});
