/**
 * The filter status strip: directly under the Insights strip, only while a filter or
 * a time window is active. Chips ONLY.
 *
 * "One fact, one region" (build spec 01 section 8) empties this strip of everything
 * but the chips: shown of loaded of total belongs to the status bar, the time window
 * belongs to the slider readout and the status bar Viewing slot, so the strip drops
 * its time chip while the slider is docked, and the active chips belong to the Explore
 * panel whenever Explore is open.
 *
 * Two rules the strip keeps of its own (SPEC:190-200):
 * - chips beyond two collapse into one "N filters" chip that opens Explore;
 * - above the edge cap it carries the criterion of the cut and the override, which
 *   names its own cost at the control (floor item 4), e.g.
 *   "Edge cap: highest weight first." / "Show all 1.1M (about 1.4 GB, 8 fps)".
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";

import { OVERLAY_INSET } from "../constants";
import { CANVAS_LEADING, CANVAS_METRICS, CANVAS_SPACE, CANVAS_TYPE } from "./canvasLayout";

/**
 * One active filter chip.
 */
export interface FilterStatusChip {
    /** Stable id, unique within the strip. */
    readonly id: string;
    /** The chip's text, e.g. "indoorOutdoor = outdoor". */
    readonly label: string;
    /** The chip's full text when the label is shortened. */
    readonly title?: string;
    /** Opens the filter in Explore. */
    readonly onClick?: () => void;
}

/**
 * The criterion-and-override line the strip carries above the render ceiling.
 */
export interface FilterStatusNote {
    /** The criterion of the cut, e.g. "Edge cap: highest weight first." */
    readonly label: string;
    /** The override, naming its own cost, e.g. "Show all 1.1M (about 1.4 GB, 8 fps)". */
    readonly actionLabel?: string;
    /** Applies the override. */
    readonly onAction?: () => void;
}

/**
 * Props of the filter status strip.
 * @public
 */
export interface FilterStatusStripProps {
    /** The active chips. The strip does not render when there are none and no note. */
    readonly chips: readonly FilterStatusChip[];
    /** The criterion-and-override line, when one applies. */
    readonly note?: FilterStatusNote | null;
    /** Opens Explore. The collapsed "N filters" chip lands here. */
    readonly onOpenExplore?: () => void;
}

/**
 * Applies the collapse rule: more than two chips become one chip that opens Explore.
 * The collapsed chip carries the count, in the spec's own form ("3 filters").
 * @param chips - the active chips.
 * @param onOpenExplore - what the collapsed chip does.
 * @returns the chips the strip should actually draw.
 */
export function collapseFilterChips(
    chips: readonly FilterStatusChip[],
    onOpenExplore?: () => void,
): readonly FilterStatusChip[] {
    if (chips.length <= 2) {
        return chips;
    }

    return [
        {
            id: "collapsed",
            label: `${String(chips.length)} filters`,
            title: chips.map((chip) => chip.label).join(", "),
            onClick: onOpenExplore,
        },
    ];
}

/**
 * Draws the filter status strip, or nothing when nothing is active.
 * @param props - the chips, the note and the Explore handler.
 * @returns the strip element, or null when there is nothing to report.
 */
export function FilterStatusStrip(props: FilterStatusStripProps): React.JSX.Element | null {
    const { chips, note, onOpenExplore } = props;
    const drawn = collapseFilterChips(chips, onOpenExplore);

    if (drawn.length === 0 && (note === undefined || note === null)) {
        return null;
    }

    const chipStyle: React.CSSProperties = {
        display: "inline-flex",
        alignItems: "center",
        gap: CANVAS_SPACE.SM,
        height: CANVAS_METRICS.CHIP_HEIGHT,
        padding: `0 ${String(CANVAS_METRICS.CHIP_PAD_X)}px`,
        borderRadius: CANVAS_METRICS.FULLY_ROUND,
        background: PANEL_INK.PANEL,
        border: `${String(CANVAS_SPACE.HAIRLINE)}px solid ${PANEL_INK.BORDER}`,
        color: PANEL_INK.PROSE,
        fontSize: CANVAS_TYPE.SMALL,
        lineHeight: 1,
        whiteSpace: "nowrap",
        boxSizing: "border-box",
    };

    return (
        <div
            data-canvas-overlay="filter-status"
            style={{
                display: "flex",
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: CANVAS_SPACE.SM,
                paddingLeft: OVERLAY_INSET,
                paddingRight: OVERLAY_INSET,
                boxSizing: "border-box",
            }}
        >
            {drawn.map((chip) =>
                chip.onClick === undefined ? (
                    <span key={chip.id} title={chip.title} style={chipStyle}>
                        {chip.label}
                    </span>
                ) : (
                    <button key={chip.id} type="button" title={chip.title} onClick={chip.onClick} style={chipStyle}>
                        {chip.label}
                    </button>
                ),
            )}

            {note === undefined || note === null ? null : (
                <span style={chipStyle}>
                    <span style={{ lineHeight: CANVAS_LEADING.TIGHT }}>{note.label}</span>
                    {note.actionLabel === undefined ? null : (
                        <button
                            type="button"
                            onClick={note.onAction}
                            style={{
                                padding: 0,
                                border: "none",
                                background: "transparent",
                                color: PANEL_INK.ACCENT,
                                fontSize: CANVAS_TYPE.SMALL,
                                lineHeight: CANVAS_LEADING.TIGHT,
                                whiteSpace: "nowrap",
                                cursor: "pointer",
                            }}
                        >
                            {note.actionLabel}
                        </button>
                    )}
                </span>
            )}
        </div>
    );
}
