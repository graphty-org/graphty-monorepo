/**
 * A collapsed section's summary, measured in a real browser: it sits after the name on the
 * header's line, and in a narrow header it gives way to an ellipsis before the name does. A
 * title the header cuts short shows whole in the shared tooltip.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { userEvent } from "vitest/browser";

import { compactTheme, ControlSection, PANEL_GRID } from "../../src";
import { renderThemed, resetHarness } from "../harness/measure";

describe("ControlSection summary layout", () => {
    it("draws the summary after the name and cuts the summary before the name", () => {
        render(
            <MantineProvider theme={compactTheme}>
                <div style={{ width: PANEL_GRID.WIDTH }}>
                    <ControlSection
                        label="Sources"
                        defaultOpened={false}
                        summary="les miserables character co-occurrence network . 77 nodes . 254 edges"
                    >
                        <div>Source rows</div>
                    </ControlSection>
                </div>
            </MantineProvider>,
        );

        const name = screen.getByTestId("control-section-name");
        const summary = screen.getByTestId("control-section-summary");
        const nameBox = name.getBoundingClientRect();
        const summaryBox = summary.getBoundingClientRect();

        expect(summaryBox.left).toBeGreaterThanOrEqual(nameBox.right);
        expect(summaryBox.top).toBeCloseTo(nameBox.top, 1);
        expect(name.scrollWidth).toBeLessThanOrEqual(name.clientWidth);
        expect(summary.scrollWidth).toBeGreaterThan(summary.clientWidth);
        expect(getComputedStyle(summary).textOverflow).toBe("ellipsis");
    });
});

afterEach(resetHarness);

describe("ControlSection title cut short", () => {
    const LONG = "Medici and 11 connections within 2 hops of the selected node";

    it("shows the whole title in the shared tooltip while the header cuts it", async () => {
        await renderThemed(
            <div style={{ width: PANEL_GRID.WIDTH }}>
                <ControlSection label={LONG} technicalName="Neighborhood">
                    <div>Rows</div>
                </ControlSection>
            </div>,
        );
        const name = screen.getByTestId("control-section-name");
        expect(name.scrollWidth).toBeGreaterThan(name.clientWidth);
        expect(name).not.toHaveAttribute("title");
        // The group is still named by the title's own, whole text.
        expect(name.textContent).toBe(`${LONG} (Neighborhood)`);
        expect(screen.getByTestId("control-section")).toHaveAttribute("aria-labelledby", name.id);
        await userEvent.hover(name);
        expect((await screen.findByRole("tooltip", {}, { timeout: 3000 })).textContent).toBe(`${LONG} (Neighborhood)`);
    });

    it("shows no tooltip for a title drawn whole", async () => {
        await renderThemed(
            <div style={{ width: PANEL_GRID.WIDTH }}>
                <ControlSection label="Size">
                    <div>Rows</div>
                </ControlSection>
            </div>,
        );
        await userEvent.hover(screen.getByTestId("control-section-name"));
        await expect(screen.findByRole("tooltip", {}, { timeout: 2000 })).rejects.toThrow();
    });
});
