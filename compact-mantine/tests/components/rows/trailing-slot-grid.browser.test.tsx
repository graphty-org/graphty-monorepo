/**
 * The trailing slot is the same 24px column on every row type.
 *
 * The panel grid identity is `16 + 108 + 8 + 108 + 8 + 24 + 8 = 280`, which
 * puts the trailing slot at x 248..272 of a 280px panel. A row type that spends
 * a different body width -- a 108px icon group track, a 108px compound box, a
 * checkbox and one word -- must still land its slot there, or a column of rows
 * has a ragged right edge and the empty slots stop holding the grid.
 *
 * JSDOM has no layout engine, so this measurement can only be made in a real
 * browser: every assertion here is a `getBoundingClientRect` inside a 280px
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
import { IconGroupRow } from "../../../src/components/rows/IconGroupRow";
import { PanelField } from "../../../src/components/rows/PanelField";
import { RampRow } from "../../../src/components/rows/RampRow";
import { ToggleRow } from "../../../src/components/rows/ToggleRow";
import { DoorButton } from "../../../src/components/rows/TrailingSlot";
import { FieldGlyph } from "../../../src/icons";

/** Where the trailing slot begins: 280 less the 8px right pad and the 24px slot. */
const SLOT_X = PANEL_GRID.WIDTH - PANEL_GRID.PAD_RIGHT - PANEL_GRID.TRAIL;

/** The three drawable shapes every artboard uses for an icon group. */
const SHAPES = [
    { value: "box", label: "Box", icon: <FieldGlyph name="width" /> },
    { value: "sphere", label: "Sphere", icon: <FieldGlyph name="opacity" /> },
    { value: "disc", label: "Disc", icon: <FieldGlyph name="attribute" /> },
];

/**
 * Render one row where the panel puts it: inside a section, inside 280px.
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

/** The door every row type is measured with. */
const door = <DoorButton label="Options" onClick={() => undefined} />;

describe("the trailing slot", () => {
    it("is 24px at x 248 on a field row's pair", () => {
        renderInPanel(
            <FieldRow trailing={door}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
                <PanelField label="Largest node size" glyph="sizeLargest" value="4.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a field row's body-span field", () => {
        renderInPanel(
            <FieldRow trailing={door}>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 when it is empty and the field absorbed the trail gap", () => {
        renderInPanel(
            <FieldRow>
                <PanelField label="Smallest node size" glyph="sizeSmallest" value="1.0" />
            </FieldRow>,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a toggle row, whose body is one word", () => {
        renderInPanel(<ToggleRow label="Labels" trailing={door} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on an icon group row with a 108px track", () => {
        renderInPanel(<IconGroupRow options={SHAPES} trailing={door} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on an icon group row with a 224px track", () => {
        renderInPanel(<IconGroupRow options={SHAPES} width={PANEL_GRID.BODY} trailing={door} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on an icon group row that fills the body", () => {
        renderInPanel(<IconGroupRow options={SHAPES} width="fill" trailing={door} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a compound row's 224px box", () => {
        renderInPanel(
            <CompoundRow
                label="Node size range"
                segments={[
                    { glyph: "sizeSmallest", value: "1.0", grow: true },
                    { value: "4.0" },
                ]}
                trailing={door}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a compound row's 108px box", () => {
        renderInPanel(
            <CompoundRow
                label="Node size range"
                width={PANEL_GRID.FIELD}
                segments={[
                    { glyph: "sizeSmallest", value: "1.0", grow: true },
                    { value: "4.0" },
                ]}
                trailing={door}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a ramp row, whose 4px endpoint gap is topped up to 8", () => {
        renderInPanel(<RampRow min="45" max="68" scale="sqrt" />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a one-pitch chart row", () => {
        renderInPanel(<SparklineRow values={[1, 4, 2, 8]} minLabel="1" maxLabel="8" trailing={door} />);

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("is 24px at x 248 on a two-pitch chart row", () => {
        renderInPanel(
            <HistogramRow
                bins={[
                    { label: "2 links: 5 nodes", count: 5 },
                    { label: "3 links: 12 nodes", count: 12 },
                ]}
                minLabel="2"
                maxLabel="4"
                trailing={door}
            />,
        );

        expect(slotBox()).toEqual({ x: SLOT_X, width: PANEL_GRID.TRAIL });
    });

    it("rides 8px in on a data row, which is a list row rather than a grid row", () => {
        renderInPanel(<DataRow name="Mr_Whiskers" value="4" trailing={door} />);

        // RT-6 is the documented exception: VOCAB section 3 gives a list row
        // "padding 0 8px, radius 4px" so its selected tint is inset from the
        // panel edge, and the whole row -- name, value and slot -- moves in
        // with it. It is the only row type not measured against the field grid.
        expect(slotBox()).toEqual({ x: SLOT_X - PANEL_GRID.GUTTER, width: PANEL_GRID.TRAIL });
    });
});
