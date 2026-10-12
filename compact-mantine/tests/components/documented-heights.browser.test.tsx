/**
 * Every height a section or row documents, measured in a real browser. A doc comment that says
 * "a 32px row" is a promise to the reader laying out a panel; this holds the component to it.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import type React from "react";
import { describe, expect, it } from "vitest";

import {
    ActionRow,
    compactTheme,
    ControlGroup,
    ControlSection,
    ControlSubGroup,
    DataRow,
    FieldRow,
    HistogramRow,
    PANEL_GRID,
    SparklineRow,
    ToggleRow,
    ToggleWithContent,
} from "../../src";

/**
 * Render inside a 240px panel column.
 * @param ui - the component under test
 * @returns the panel column
 */
function inPanel(ui: React.ReactElement): HTMLElement {
    render(
        <MantineProvider theme={compactTheme}>
            <div data-testid="panel" style={{ width: PANEL_GRID.WIDTH }}>
                {ui}
            </div>
        </MantineProvider>,
    );
    return screen.getByTestId("panel");
}

/**
 * The rendered height of an element.
 * @param el - the element
 * @returns its border-box height in CSS pixels
 */
function height(el: Element): number {
    return el.getBoundingClientRect().height;
}

describe("documented heights", () => {
    it("draws an empty section as its 40px header and the 1px rule below", () => {
        inPanel(<ControlSection label="Stroke" empty onAdd={() => undefined} />);
        expect(height(screen.getByTestId("control-section-header"))).toBe(PANEL_GRID.SECTION_HEADER);
        expect(height(screen.getByTestId("control-section"))).toBe(PANEL_GRID.SECTION_HEADER + 1);
    });

    it("draws a section with rows as its 40px header, the rows, 12px of padding and the rule", () => {
        inPanel(
            <ControlSection label="Fill">
                <div style={{ height: PANEL_GRID.ROW_PITCH }} />
            </ControlSection>,
        );
        expect(height(screen.getByTestId("control-section-header"))).toBe(PANEL_GRID.SECTION_HEADER);
        expect(height(screen.getByTestId("control-section"))).toBe(
            PANEL_GRID.SECTION_HEADER + PANEL_GRID.ROW_PITCH + PANEL_GRID.SECTION_PAD_BOTTOM + 1,
        );
    });

    it("draws a field row 32px tall, and 48px under a legend", () => {
        const panel = inPanel(
            <>
                <FieldRow>
                    <div style={{ height: PANEL_GRID.CONTROL_HEIGHT, width: "100%" }} />
                </FieldRow>
                <ControlGroup label="Position">
                    <FieldRow>
                        <div style={{ height: PANEL_GRID.CONTROL_HEIGHT, width: "100%" }} />
                    </FieldRow>
                </ControlGroup>
            </>,
        );
        expect(height(panel.children[0])).toBe(32);
        expect(height(panel.children[1])).toBe(48);
    });

    it("draws a toggle row 32px tall", () => {
        const panel = inPanel(<ToggleRow label="Labels" />);
        expect(height(panel.children[0])).toBe(PANEL_GRID.TOGGLE_PITCH);
    });

    it("draws a toggle-with-content checkbox row 32px tall", () => {
        inPanel(
            <ToggleWithContent label="Glow">
                <div style={{ height: PANEL_GRID.CONTROL_HEIGHT }} />
            </ToggleWithContent>,
        );
        expect(height(screen.getByTestId("toggle-with-content").children[0])).toBe(PANEL_GRID.TOGGLE_PITCH);
    });

    it("draws an action row 32px tall", () => {
        const panel = inPanel(<ActionRow state="Running, 40%" />);
        expect(height(panel.children[0])).toBe(PANEL_GRID.ROW_PITCH);
    });

    it("draws a sub-group's header row 32px tall", () => {
        const panel = inPanel(
            <ControlSubGroup label="Text effects" defaultOpened={false}>
                <ToggleRow label="Outline" />
            </ControlSubGroup>,
        );
        expect(height(panel.children[0])).toBe(32);
    });

    it("draws a data row 32px tall", () => {
        const panel = inPanel(<DataRow name="node-1" value={3} />);
        expect(height(panel.children[0])).toBe(PANEL_GRID.DATA_PITCH);
    });

    it("draws a sparkline row 32px tall and a histogram row 64px tall", () => {
        const panel = inPanel(
            <>
                <SparklineRow
                    label="Layout settling"
                    values={[92, 71, 55, 44, 36]}
                    minLabel="Tick 1"
                    maxLabel="Tick 40"
                />
                <HistogramRow
                    label="Links per node"
                    minLabel="2 links"
                    maxLabel="3 links"
                    bins={[
                        { label: "2 links: 5 nodes", count: 5 },
                        { label: "3 links: 12 nodes", count: 12 },
                    ]}
                />
            </>,
        );
        expect(height(panel.children[0])).toBe(32);
        expect(height(panel.children[1])).toBe(64);
    });
});
