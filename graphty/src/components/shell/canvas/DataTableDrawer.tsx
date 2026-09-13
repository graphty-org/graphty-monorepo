/**
 * The Data table drawer: a DOCK along the canvas bottom edge, 260 by default, drag to
 * resize, remembered per 6.5.
 *
 * Build spec 01 sections 1, 2, 3 and 7 item 3; ART-DTD:650-760.
 *
 * A dock, not an overlay: it SHORTENS the live canvas rect (the canvas region gives
 * the graph host `bottom: <drawer height>`), the time slider docks to its top edge,
 * and the canvas toolbar rides 12 px above whichever of the two is uppermost. While it
 * is open the minimap hides and the legend compacts. It never covers the panel or the
 * inspector -- it is drawn inside the canvas element, which is a column of the body
 * row. Below 1280 it coexists with the inspector and closes the activity panel.
 *
 * The Graph / Table segmented control lives at the top centre of the canvas and is
 * exported beside the drawer, because it is the drawer's own control: Table maximises
 * the drawer to the full canvas height, which is the one state where the toolbar, the
 * minimap and the legend are not drawn at all, and Graph is the way back. It NEVER
 * enters the canvas toolbar -- the bar's item set is fixed, and a centred container
 * that changes width moves every item under the pointer.
 *
 * The table itself is compact-mantine's virtualized `DataTable`. The `Coming` tag the
 * artboard draws on the title stays: the column data table -- issues, agreement,
 * top N by each metric -- is new app work (5.8), and 5.8 draws the target control with
 * a muted tag rather than a control that silently does nothing.
 */

import { DataTable, type DataTableColumn, PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import React, { useCallback, useRef } from "react";

import { keyChipFor } from "../bindings";
import { CANVAS_TOOLBAR_Z_INDEX } from "../constants";
import { CanvasIconButton } from "./CanvasIconButton";
import {
    CANVAS_DOCK_Z_INDEX,
    CANVAS_LEADING,
    CANVAS_METRICS,
    CANVAS_SPACE,
    CANVAS_TYPE,
    clampDataDrawerHeight,
    DATA_DRAWER_MIN_HEIGHT,
} from "./canvasLayout";

/** Which half of the dataset the drawer is showing. */
export type DataDrawerTab = "edges" | "nodes";

/**
 * Which half of the canvas the Graph / Table control is showing. Named in
 * {@link GraphTableSegmentProps.value}: the caller owns the choice.
 * @public
 */
export type CanvasSurface = "graph" | "table";

/**
 * Props of the Graph / Table segmented control.
 * @public
 */
export interface GraphTableSegmentProps {
    /** Which half is showing. */
    readonly value: CanvasSurface;
    /** Table maximises the drawer to the full canvas height; Graph restores it. */
    readonly onChange: (value: CanvasSurface) => void;
}

const SURFACES: readonly { readonly value: CanvasSurface; readonly label: string }[] = [
    { value: "graph", label: "Graph" },
    { value: "table", label: "Table" },
];

/**
 * Draws the top-centre Graph / Table control, shown only while the drawer is open.
 * @param props - the current surface and the change handler.
 * @returns the segmented control element.
 */
export function GraphTableSegment(props: GraphTableSegmentProps): React.JSX.Element {
    const { onChange, value } = props;

    return (
        <div
            role="radiogroup"
            aria-label="Graph or table"
            data-canvas-overlay="graph-table"
            style={{
                display: "flex",
                gap: CANVAS_SPACE.TIGHT,
                height: CANVAS_METRICS.SEGMENT_TRACK,
                padding: CANVAS_METRICS.SEGMENT_PAD,
                borderRadius: "var(--mantine-radius-sm)",
                background: PANEL_INK.SURFACE,
                border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                boxSizing: "border-box",
                zIndex: CANVAS_TOOLBAR_Z_INDEX,
            }}
        >
            {SURFACES.map((surface) => {
                const checked = surface.value === value;

                return (
                    <button
                        key={surface.value}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        onClick={() => {
                            onChange(surface.value);
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            height: CANVAS_METRICS.SEGMENT_ITEM,
                            padding: `0 ${String(CANVAS_METRICS.SEGMENT_ITEM_PAD_X)}px`,
                            border: "none",
                            borderRadius: "var(--mantine-radius-xs)",
                            background: checked ? PANEL_INK.SELECTED : "transparent",
                            color: checked ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                            fontSize: CANVAS_TYPE.SMALL,
                            fontWeight: 500,
                            lineHeight: 1,
                            cursor: "pointer",
                        }}
                    >
                        {surface.label}
                    </button>
                );
            })}
        </div>
    );
}

/**
 * Props of the data table drawer.
 * @public
 */
export interface DataTableDrawerProps<TRow extends object> {
    /** Whether the drawer is docked open. */
    readonly open: boolean;
    /** Its height, which the drag changes and 6.5 remembers. */
    readonly height: number;
    /** Whether Table has maximised it to the full canvas height. */
    readonly maximised: boolean;
    /** The canvas element's height, which caps the drag and the maximised form. */
    readonly canvasHeight: number;
    /** Which half of the dataset is showing. */
    readonly tab: DataDrawerTab;
    /** Tab change. */
    readonly onTabChange: (tab: DataDrawerTab) => void;
    /** The rows to draw. */
    readonly rows: readonly TRow[];
    /** The columns to draw. */
    readonly columns: readonly DataTableColumn<TRow>[];
    /** A stable id per row. The row selection IS the canvas selection. */
    readonly getRowId?: (row: TRow, index: number) => string;
    /** The Show control's value, e.g. "Selected". */
    readonly showLabel: string;
    /** The Show control's count, e.g. "3". */
    readonly showCount: string;
    /** The Show control's total, e.g. "of 200". */
    readonly showTotal: string;
    /** Opens the Show menu: All rows / Selected / Rows with issues / In window. */
    readonly onOpenShowMenu?: () => void;
    /** A drag on the top edge. The caller clamps nothing; this component already has. */
    readonly onHeightChange: (height: number) => void;
    /** The header X, titled "Hide the data table (Shift+T)". */
    readonly onClose: () => void;
    /** The selected row ids; one selection store, shared with the canvas. */
    readonly selectedIds?: readonly string[];
    /** Row selection change. */
    readonly onSelectionChange?: (ids: string[]) => void;
}

const CLOSE_LABEL = "Hide the data table";
const RESIZE_LABEL = "Resize the data table";
const TABS: readonly { readonly value: DataDrawerTab; readonly label: string }[] = [
    { value: "nodes", label: "Nodes" },
    { value: "edges", label: "Edges" },
];

/**
 * Draws the bottom data table drawer, or nothing when it is closed.
 * @param props - the dock state, the table contents and the handlers.
 * @returns the drawer element, or null when the drawer is closed.
 */
export function DataTableDrawer<TRow extends object>(
    props: DataTableDrawerProps<TRow>,
): React.JSX.Element | null {
    const {
        canvasHeight,
        columns,
        getRowId,
        height,
        maximised,
        onClose,
        onHeightChange,
        onOpenShowMenu,
        onSelectionChange,
        onTabChange,
        open,
        rows,
        selectedIds,
        showCount,
        showLabel,
        showTotal,
        tab,
    } = props;
    const dragRef = useRef<{ startY: number; startHeight: number } | null>(null);

    const handlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            event.currentTarget.setPointerCapture(event.pointerId);
            dragRef.current = { startY: event.clientY, startHeight: height };
        },
        [height],
    );

    const handlePointerMove = useCallback(
        (event: React.PointerEvent<HTMLDivElement>) => {
            const drag = dragRef.current;

            if (drag === null) {
                return;
            }

            onHeightChange(clampDataDrawerHeight(drag.startHeight + (drag.startY - event.clientY), canvasHeight));
        },
        [canvasHeight, onHeightChange],
    );

    const handlePointerUp = useCallback(() => {
        dragRef.current = null;
    }, []);

    const handleResizeKey = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>) => {
            if (event.key !== "ArrowUp" && event.key !== "ArrowDown") {
                return;
            }

            event.preventDefault();
            const step = event.key === "ArrowUp" ? PANEL_GRID.ROW_PITCH : -PANEL_GRID.ROW_PITCH;

            onHeightChange(clampDataDrawerHeight(height + step, canvasHeight));
        },
        [canvasHeight, height, onHeightChange],
    );

    if (!open) {
        return null;
    }

    const drawnHeight = maximised ? canvasHeight : clampDataDrawerHeight(height, canvasHeight);
    const chromeHeight = CANVAS_METRICS.DRAWER_ROW;
    const tableHeight = Math.max(PANEL_GRID.DATA_PITCH, drawnHeight - chromeHeight);

    return (
        <div
            data-canvas-overlay="data-drawer"
            data-maximised={maximised ? "true" : "false"}
            style={{
                position: "absolute",
                left: 0,
                right: 0,
                bottom: 0,
                height: drawnHeight,
                display: "flex",
                flexDirection: "column",
                background: PANEL_INK.PANEL,
                borderTop: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
                boxSizing: "border-box",
                overflow: "hidden",
                zIndex: CANVAS_DOCK_Z_INDEX,
            }}
        >
            {maximised ? null : (
                <div
                    role="separator"
                    aria-label={RESIZE_LABEL}
                    aria-orientation="horizontal"
                    aria-valuenow={drawnHeight}
                    aria-valuemin={DATA_DRAWER_MIN_HEIGHT}
                    aria-valuemax={canvasHeight}
                    tabIndex={0}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onKeyDown={handleResizeKey}
                    style={{
                        position: "absolute",
                        left: 0,
                        right: 0,
                        top: 0,
                        height: CANVAS_METRICS.DRAWER_HANDLE,
                        cursor: "row-resize",
                    }}
                />
            )}

            <div
                style={{
                    flex: `0 0 ${String(CANVAS_METRICS.DRAWER_ROW)}px`,
                    height: CANVAS_METRICS.DRAWER_ROW,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: CANVAS_SPACE.MD,
                    padding: `0 ${String(CANVAS_SPACE.LG)}px`,
                    borderBottom: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.DIVIDER}`,
                    boxSizing: "border-box",
                }}
            >
                <div style={{ display: "flex", alignItems: "center", gap: CANVAS_SPACE.LG }}>
                    <div style={{ display: "flex", alignItems: "center", gap: CANVAS_SPACE.SM }}>
                        <span
                            style={{
                                fontSize: CANVAS_TYPE.BODY,
                                fontWeight: 500,
                                lineHeight: CANVAS_LEADING.TIGHT,
                                color: PANEL_INK.VALUE,
                            }}
                        >
                            Data table
                        </span>
                        <span
                            style={{
                                display: "inline-flex",
                                alignItems: "center",
                                height: CANVAS_METRICS.PILL_HEIGHT,
                                padding: `0 ${String(CANVAS_METRICS.PILL_PAD_X)}px`,
                                borderRadius: "var(--mantine-radius-lg)",
                                background: PANEL_INK.RAISED,
                                color: PANEL_INK.CHROME,
                                fontSize: CANVAS_TYPE.PILL,
                                fontWeight: 500,
                                lineHeight: 1,
                                boxSizing: "border-box",
                            }}
                        >
                            Coming
                        </span>
                    </div>

                    <div
                        role="radiogroup"
                        aria-label="Data table rows"
                        style={{
                            display: "flex",
                            gap: CANVAS_SPACE.TIGHT,
                            height: CANVAS_METRICS.SEGMENT_TRACK - CANVAS_METRICS.SEGMENT_PAD * 2,
                            padding: CANVAS_METRICS.SEGMENT_PAD,
                            borderRadius: "var(--mantine-radius-sm)",
                            background: PANEL_INK.SURFACE,
                            boxSizing: "border-box",
                        }}
                    >
                        {TABS.map((entry) => {
                            const checked = entry.value === tab;

                            return (
                                <button
                                    key={entry.value}
                                    type="button"
                                    role="radio"
                                    aria-checked={checked}
                                    onClick={() => {
                                        onTabChange(entry.value);
                                    }}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        height: CANVAS_METRICS.SEGMENT_ITEM,
                                        padding: `0 ${String(CANVAS_METRICS.SEGMENT_ITEM_PAD_X)}px`,
                                        border: "none",
                                        borderRadius: "var(--mantine-radius-xs)",
                                        background: checked ? PANEL_INK.SELECTED : "transparent",
                                        color: checked ? PANEL_INK.ON_SELECTED : PANEL_INK.CHROME,
                                        fontSize: CANVAS_TYPE.SMALL,
                                        fontWeight: 500,
                                        lineHeight: 1,
                                        cursor: "pointer",
                                    }}
                                >
                                    {entry.label}
                                </button>
                            );
                        })}
                    </div>

                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            height: CANVAS_METRICS.SEGMENT_TRACK - CANVAS_METRICS.SEGMENT_PAD * 2,
                            borderRadius: "var(--mantine-radius-sm)",
                            background: PANEL_INK.SURFACE,
                            overflow: "hidden",
                            boxSizing: "border-box",
                        }}
                    >
                        <button
                            type="button"
                            aria-label="Show"
                            onClick={onOpenShowMenu}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: CANVAS_SPACE.XS,
                                height: "100%",
                                padding: `0 ${String(CANVAS_METRICS.PILL_PAD_X)}px 0 ${String(CANVAS_SPACE.MD)}px`,
                                border: "none",
                                background: "transparent",
                                color: PANEL_INK.VALUE,
                                fontSize: CANVAS_TYPE.SMALL,
                                lineHeight: 1,
                                cursor: "pointer",
                            }}
                        >
                            {showLabel}
                            <UiGlyph name="chevronDown" size={PANEL_GRID.CHEVRON} />
                        </button>
                        <div
                            style={{
                                width: CANVAS_SPACE.HAIRLINE,
                                alignSelf: "stretch",
                                background: PANEL_INK.PANEL,
                            }}
                        />
                        <span
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: CANVAS_SPACE.XS,
                                height: "100%",
                                padding: `0 ${String(CANVAS_SPACE.MD)}px`,
                                fontSize: CANVAS_TYPE.SMALL,
                                lineHeight: 1,
                            }}
                        >
                            <span
                                data-drawer-show="count"
                                style={{ color: PANEL_INK.VALUE, fontVariantNumeric: "tabular-nums" }}
                            >
                                {showCount}
                            </span>
                            <span data-drawer-show="total" style={{ color: PANEL_INK.CHROME }}>
                                {showTotal}
                            </span>
                        </span>
                    </div>
                </div>

                <CanvasIconButton
                    label={CLOSE_LABEL}
                    chip={keyChipFor("toggleDataDrawer")}
                    glyph={<UiGlyph name="close" size={PANEL_GRID.CHEVRON} />}
                    onClick={onClose}
                />
            </div>

            <DataTable<TRow>
                data={rows}
                columns={columns}
                getRowId={getRowId}
                label="Data table"
                height={tableHeight}
                selectionMode="multiple"
                selectedIds={selectedIds}
                onSelectionChange={onSelectionChange}
            />
        </div>
    );
}
