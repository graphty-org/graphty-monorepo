import type { DataTableColumn } from "@graphty/compact-mantine";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { fireEvent, render, screen } from "../../../../test/test-utils";
import { keyChipFor } from "../../bindings";
import { CANVAS_MENU_Z_INDEX, CANVAS_POPOUT_Z_INDEX, DATA_DRAWER_DEFAULT_HEIGHT } from "../../constants";
import { CANVAS_DOCK_Z_INDEX, DATA_DRAWER_MIN_HEIGHT } from "../canvasLayout";
import { DataTableDrawer, GraphTableSegment } from "../DataTableDrawer";

interface Row {
    id: string;
    degree: number;
}

const columns: DataTableColumn<Row>[] = [
    { id: "id", header: "id", value: (row) => row.id },
    { id: "degree", header: "degree", value: (row) => row.degree, align: "end" },
];

const rows: Row[] = [
    { id: "acct-4471", degree: 12 },
    { id: "dev-19c2", degree: 7 },
];

const defaultProps = {
    open: true,
    height: DATA_DRAWER_DEFAULT_HEIGHT,
    maximised: false,
    canvasHeight: 836,
    tab: "nodes" as const,
    onTabChange: vi.fn(),
    rows,
    columns,
    getRowId: (row: Row) => row.id,
    showLabel: "Selected",
    showCount: "3",
    showTotal: "of 200",
    onHeightChange: vi.fn(),
    onClose: vi.fn(),
};

describe("DataTableDrawer", () => {
    describe("rendering", () => {
        it("does not render when it is closed", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} open={false} />);

            expect(container.querySelector("[data-canvas-overlay='data-drawer']")).toBeNull();
        });

        it("names itself Data table and carries its Coming tag", () => {
            render(<DataTableDrawer {...defaultProps} />);

            expect(screen.getByText("Data table", { selector: "span" })).toBeInTheDocument();
            expect(screen.getByText("Coming", { selector: "span" })).toBeInTheDocument();
        });

        it("draws the Nodes and Edges tabs with Nodes checked", () => {
            render(<DataTableDrawer {...defaultProps} />);

            expect(screen.getByRole("radio", { name: "Nodes" })).toHaveAttribute("aria-checked", "true");
            expect(screen.getByRole("radio", { name: "Edges" })).toHaveAttribute("aria-checked", "false");
        });

        it("draws the Show control with its count and total", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} />);

            expect(screen.getByRole("button", { name: "Show" })).toHaveTextContent("Selected");
            expect(container.querySelector("[data-drawer-show='count']")).toHaveTextContent("3");
            expect(container.querySelector("[data-drawer-show='total']")).toHaveTextContent("of 200");
        });

        /*
         * Spec 5.2:448 -- the drawer never covers the activity panel or the inspector --
         * and the ONE way that guarantee may be kept.
         *
         * When the owner reported "the data table isn't visible when the panels are
         * open", the tempting repair was to raise this dock above the sidebars: at
         * 1200x800 it sat at z-index 5 under a panel at 8 and an inspector at 15, and
         * a bigger number would have put the table on screen in one line. It would also
         * have inverted the guarantee above -- bought the drawer's visibility with the
         * panel's -- and the spec is explicit that the drawer is the surface that yields.
         *
         * The real repair was the rect the drawer is measured against, not its z-order:
         * both sidebars are docked flex columns now, so `left: 0; right: 0` already
         * stops at the live canvas edges (measured end to end in CanvasRegion.test.tsx's
         * "the live canvas strip" boards). This board is what stops the tempting repair
         * being made later by somebody who has only the symptom in front of them.
         */
        it("stays a dock BELOW the sidebars in z-order and spans its container edge to edge", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} />);
            const drawer = container.querySelector("[data-canvas-overlay='data-drawer']") as HTMLElement;

            expect(drawer.style.zIndex).toBe(String(CANVAS_DOCK_Z_INDEX));
            expect(CANVAS_DOCK_Z_INDEX).toBeLessThan(CANVAS_POPOUT_Z_INDEX);
            expect(CANVAS_DOCK_Z_INDEX).toBeLessThan(CANVAS_MENU_Z_INDEX);

            // No inset of its own. An inset is a property of the RECT the whole bottom
            // stack is measured against -- it belongs in `canvasBottomStack`, once, where
            // the slider, the minimap and the legend would get it too.
            expect(drawer.style.left).toBe("0px");
            expect(drawer.style.right).toBe("0px");
        });
    });

    describe("the close control", () => {
        it("carries the register's exact name and its binding", () => {
            render(<DataTableDrawer {...defaultProps} />);

            const close = screen.getByRole("button", { name: "Hide the data table" });

            expect(close).toBeInTheDocument();
            expect(keyChipFor("toggleDataDrawer", false)).toBe("Shift+T");
        });

        it("closes the drawer", () => {
            const onClose = vi.fn();
            render(<DataTableDrawer {...defaultProps} onClose={onClose} />);

            fireEvent.click(screen.getByRole("button", { name: "Hide the data table" }));

            expect(onClose).toHaveBeenCalledTimes(1);
        });
    });

    describe("docking", () => {
        it("docks along the bottom edge at the height it is handed", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} height={320} />);
            const box = container.querySelector("[data-canvas-overlay='data-drawer']") as HTMLElement;

            expect(box.style.bottom).toBe("0px");
            expect(box.style.height).toBe("320px");
        });

        it("takes the whole canvas when Table has maximised it", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} maximised />);
            const box = container.querySelector("[data-canvas-overlay='data-drawer']") as HTMLElement;

            expect(box.style.height).toBe("836px");
            expect(box).toHaveAttribute("data-maximised", "true");
        });

        it("clamps a height below its own chrome", () => {
            const { container } = render(<DataTableDrawer {...defaultProps} height={10} />);
            const box = container.querySelector("[data-canvas-overlay='data-drawer']") as HTMLElement;

            expect(box.style.height).toBe(`${DATA_DRAWER_MIN_HEIGHT}px`);
        });
    });

    describe("the resize handle", () => {
        it("offers a keyboard resize with its own name", () => {
            render(<DataTableDrawer {...defaultProps} />);

            expect(screen.getByRole("separator", { name: "Resize the data table" })).toBeInTheDocument();
        });

        it("grows the drawer on ArrowUp and shrinks it on ArrowDown", () => {
            const onHeightChange = vi.fn();
            render(<DataTableDrawer {...defaultProps} onHeightChange={onHeightChange} />);

            const handle = screen.getByRole("separator", { name: "Resize the data table" });

            fireEvent.keyDown(handle, { key: "ArrowUp" });
            expect(onHeightChange).toHaveBeenLastCalledWith(DATA_DRAWER_DEFAULT_HEIGHT + 32);

            fireEvent.keyDown(handle, { key: "ArrowDown" });
            expect(onHeightChange).toHaveBeenLastCalledWith(DATA_DRAWER_DEFAULT_HEIGHT - 32);
        });

        it("is not drawn while the drawer is maximised", () => {
            render(<DataTableDrawer {...defaultProps} maximised />);

            expect(screen.queryByRole("separator")).toBeNull();
        });
    });
});

describe("GraphTableSegment", () => {
    describe("rendering", () => {
        it("draws Graph and Table with the current half checked", () => {
            render(<GraphTableSegment value="graph" onChange={vi.fn()} />);

            expect(screen.getByRole("radio", { name: "Graph" })).toHaveAttribute("aria-checked", "true");
            expect(screen.getByRole("radio", { name: "Table" })).toHaveAttribute("aria-checked", "false");
        });
    });

    describe("switching", () => {
        it("maximises the drawer from the Table half", () => {
            const onChange = vi.fn();
            render(<GraphTableSegment value="graph" onChange={onChange} />);

            fireEvent.click(screen.getByRole("radio", { name: "Table" }));

            expect(onChange).toHaveBeenCalledWith("table");
        });
    });
});
