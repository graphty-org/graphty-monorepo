/**
 * The trailing slot is the same 24px column on every row type.
 *
 * The panel grid identity is `16 + 88 + 8 + 88 + 8 + 24 + 8 = 240`, which
 * puts the trailing slot at x 208..232 of a 240px panel. A row type that spends
 * a different body width -- an 88px compound box, a checkbox and one word --
 * must still land its slot there, or a column of rows has a ragged right edge
 * and the empty slots stop holding the grid.
 *
 * JSDOM has no layout engine, so this measurement can only be made in a real
 * browser: every assertion here is a `getBoundingClientRect` inside a 240px
 * panel, not a style declaration.
 */
import { MantineProvider } from "@mantine/core";
import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it } from "vitest";

import { compactTheme, PANEL_GRID } from "../../../src";
import { ControlSection } from "../../../src/components/ControlSection";
import { HistogramRow, SparklineRow } from "../../../src/components/rows/ChartRow";
import { CompoundRow } from "../../../src/components/rows/CompoundRow";
import { DataRow } from "../../../src/components/rows/DataRow";
import { FieldRow } from "../../../src/components/rows/FieldRow";
import { PanelField } from "../../../src/components/rows/PanelField";
import { RampRow } from "../../../src/components/rows/RampRow";
import { ToggleRow } from "../../../src/components/rows/ToggleRow";
import { AdvancedButton } from "../../../src/components/rows/TrailingSlot";

/** Where the trailing slot begins: 240 less the 8px right pad and the 24px slot. */
const SLOT_X = PANEL_GRID.WIDTH - PANEL_GRID.PAD_RIGHT - PANEL_GRID.TRAIL;

/**
 * Render one row where the panel puts it: inside a section, inside 240px.
 * @param row - The row under test
 * @returns The testing-library render result
 */
function renderInPanel(row: React.ReactElement): ReturnType<typeof render> {
    return render(
        <MantineProvider theme={compactTheme}>
            <div data-testid="panel" style={{ width: PANEL_GRID.WIDTH }}>
                <ControlSection label="Section">{row}</ControlSection>
            </div>
        </MantineProvider>,
    );
}

/**
 * Measure the trailing slot against the panel's own left edge.
 * @returns The slot's x offset and its drawn width, in pixels
 */
function slotBox(): { x: number; width: number } {
    const panel = screen.getByTestId("panel").getBoundingClientRect();
    const slot = screen.getByTestId("trailing-slot").getBoundingClientRect();

    return { x: slot.left - panel.left, width: slot.width };
}

/** The advanced-settings button every row type is measured with. */
const advanced = <AdvancedButton label="Options" onClick={() => undefined} />;

describe("the trailing slot", () => {
    it("is 24px at x 208 on a field row's pair", () => {
        renderInPanel(
            <FieldRow trailing={advanced}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a field row's body-span field", () => {
        renderInPanel(
            <FieldRow trailing={advanced}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 when it is empty and the field absorbed the trail gap", () => {
        renderInPanel(
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a toggle row, whose body is one word", () => {
        renderInPanel(<ToggleRow label="Labels" trailing={advanced} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a compound row's 184px box", () => {
        renderInPanel(
            <CompoundRow
                label="Node size range"
                segments={[
                    { glyph: "sizeSmallest", value: "1.0", grow: true },
                    { value: "4.0" },
                ]}
                trailing={advanced}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a compound row's 88px box", () => {
        renderInPanel(
            <CompoundRow
                label="Node size range"
                width={PANEL_GRID.FIELD}
                segments={[
                    { glyph: "sizeSmallest", value: "1.0", grow: true },
                    { value: "4.0" },
                ]}
                trailing={advanced}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a ramp row, whose 4px endpoint gap is topped up to 8", () => {
        renderInPanel(<RampRow min="45" max="68" scale="sqrt" />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a one-pitch chart row", () => {
        renderInPanel(<SparklineRow values={[1, 4, 2, 8]} minLabel="1" maxLabel="8" trailing={advanced} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 208 on a two-pitch chart row", () => {
        renderInPanel(
            <HistogramRow
                bins={[
                    { label: "2 links: 5 nodes", count: 5 },
                    { label: "3 links: 12 nodes", count: 12 },
                ]}
                minLabel="2"
                maxLabel="4"
                trailing={advanced}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("rides 8px in on a data row, which is a list row rather than a grid row", () => {
        renderInPanel(<DataRow name="Mr_Whiskers" value="4" trailing={advanced} />);

        // RT-6 is the documented exception: VOCAB section 3 gives a list row
        // "padding 0 8px, radius 4px" so its selected tint is inset from the
        // panel edge, and the whole row -- name, value and slot -- moves in
        // with it. It is the only row type not measured against the field grid.
        expect(slotBox()).toEqual({ x: SLOT_X - PANEL_GRID.GUTTER, width: PANEL_GRID.TRAIL });
    });
});
