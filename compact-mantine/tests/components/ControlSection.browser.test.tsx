/**
 * A collapsed section's summary, measured in a real browser: it sits after the name on the
 * header's line, and in a narrow header it gives way to an ellipsis before the name does.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { compactTheme, ControlSection, PANEL_GRID } from "../../src";

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
