/**
 * The status bar, build spec 02 sections 4 to 7.
 *
 * 24 px tall, full shell width BELOW the main row so it crosses under the activity
 * rail, `padding: 0 12px`, 12 px between slots, 11 px muted type, a 1 px top border.
 * A 1 x 12 rule divides counts from zoom and zoom from the layout slot, and a
 * `flex: 1 1 auto` spacer between the issues slot and the AI slot right-aligns AI
 * status and the selection count.
 *
 * The bar is driven by a slot TABLE rather than by hand-placed JSX: each slot is one
 * small component carrying its render condition, its string, its click and its
 * tooltip, and the overflow rule of section 4.3 is a function over that table --
 * `useStatusBarOverflow`, which measures the real bar and drops AI status, then the
 * layout NAME, then zoom, then Viewing, and never drops counts, the running slot with
 * its Cancel, the issues chip or the Performance mode chip.
 *
 * One fact, one region (spec 01 section 8): this bar OWNS node and edge counts,
 * "shown of loaded of total", the zoom percentage, the time window with the slider
 * readout, the validation issue counts and the selection size. None of them is
 * repeated in the panels, the inspector, the filter strip or the canvas toolbar.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React, { useState } from "react";

import { STATUS_BAR_NEVER_DROP, STATUS_BAR_SLOT_ORDER } from "../constants";
import type { StatusBarIssues, StatusBarSlotId } from "../types";
import { LayoutChipMenu } from "./LayoutChipMenu";
import { LoadCompleteToast } from "./LoadCompleteToast";
import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";
import type { StatusBarRegionProps } from "./statusBarModel";
import {
    StatusBarAiSlot,
    StatusBarCountsSlot,
    StatusBarIssuesSlot,
    StatusBarLayoutSlot,
    StatusBarLoadingSlot,
    StatusBarRunningSlot,
    StatusBarSelectionSlot,
    StatusBarViewingSlot,
    StatusBarXrSlot,
    StatusBarZoomSlot,
} from "./StatusBarSlots";
import { useStatusBarOverflow } from "./useStatusBarOverflow";

/** The bar itself. */
const BAR_STYLE: React.CSSProperties = {
    position: "relative",
    flex: `0 0 ${String(STATUS_BAR_GEOMETRY.HEIGHT)}px`,
    height: STATUS_BAR_GEOMETRY.HEIGHT,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: STATUS_BAR_GEOMETRY.SLOT_GAP,
    padding: `0 ${String(STATUS_BAR_GEOMETRY.PADDING_X)}px`,
    background: PANEL_INK.PANEL,
    borderTop: `${String(STATUS_BAR_GEOMETRY.BORDER)}px solid ${PANEL_INK.DIVIDER}`,
    boxSizing: "border-box",
    fontSize: STATUS_BAR_GEOMETRY.FONT_SIZE,
    lineHeight: STATUS_BAR_GEOMETRY.LINE_HEIGHT,
    color: PANEL_INK.CHROME,
    overflow: "hidden",
};

/** Every slot box: it never shrinks, so an overflow is real rather than absorbed. */
const SLOT_BOX: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    flex: "0 0 auto",
    minWidth: 0,
};

/** The slots the drop order may take; the layout entry takes its NAME only. */
const DROPPABLE: readonly StatusBarSlotId[] = ["ai", "layout", "viewing", "zoom"];

/** The slots that sit to the right of the `flex: 1 1 auto` spacer. */
const RIGHT_OF_SPACER: readonly StatusBarSlotId[] = ["ai", "selection"];

/** Does nothing: the fallback for a menu verb the host has not wired. */
function noop(): void {
    // A menu verb with no handler is the host's omission, not a user-visible action.
}

/**
 * The 1 x 12 rule between counts and zoom, and between zoom and the layout slot.
 * @returns The rule, which is decorative.
 */
function SlotDivider(): React.JSX.Element {
    return (
        <span
            aria-hidden="true"
            style={{
                flex: "0 0 auto",
                width: STATUS_BAR_GEOMETRY.DIVIDER_WIDTH,
                height: STATUS_BAR_GEOMETRY.DIVIDER_HEIGHT,
                background: PANEL_INK.BORDER,
            }}
        />
    );
}

/**
 * The issues slot's chips, with the notes chip taken out while Explore is open at its
 * Notes section -- the fact is then on screen in the region that owns it.
 * @param issues - The issues model, if any.
 * @param exploreNotesExpanded - Whether Explore is open with Notes expanded.
 * @returns The issues to draw, or undefined when nothing is left to draw.
 */
function visibleIssues(issues: StatusBarIssues | undefined, exploreNotesExpanded: boolean): StatusBarIssues | undefined {
    if (issues === undefined) {
        return undefined;
    }

    const notes = exploreNotesExpanded ? undefined : issues.notes;

    if (issues.validation === undefined && notes === undefined && issues.performance === undefined) {
        return undefined;
    }

    return { validation: issues.validation, notes, performance: issues.performance };
}

/**
 * The shell's status bar.
 *
 * An absent slot member does not render, which is what makes the bar's density a
 * function of the session rather than of a layout decision; the overflow rule then
 * decides what gives when even the slots that ARE filled do not fit.
 * @param props - The slot model, the overflow override, the load in progress and its
 * completion toast.
 * @returns The status bar.
 */
export function StatusBar(props: StatusBarRegionProps): React.JSX.Element {
    const { slots, droppedSlots, loading, completion, exploreNotesExpanded } = props;
    const overflow = useStatusBarOverflow();
    const [menuOpened, setMenuOpened] = useState(false);

    const dropped = droppedSlots ?? overflow.droppedSlots;
    const isDropped = (slot: StatusBarSlotId): boolean =>
        dropped.includes(slot) && !STATUS_BAR_NEVER_DROP.includes(slot) && DROPPABLE.includes(slot);

    const { counts, zoom, xr, layout, running, viewing, ai, selection } = slots;
    const issues = visibleIssues(slots.issues, exploreNotesExpanded === true);
    const nodes = new Map<StatusBarSlotId, React.ReactNode>();

    if (counts !== undefined) {
        nodes.set("counts", <StatusBarCountsSlot counts={counts} />);
    }

    if (zoom !== undefined && !isDropped("zoom")) {
        nodes.set("zoom", <StatusBarZoomSlot zoom={zoom} />);
    }

    if (xr !== undefined) {
        nodes.set("xr", <StatusBarXrSlot xr={xr} />);
    }

    if (loading !== undefined) {
        nodes.set("layout", <StatusBarLoadingSlot loading={loading} />);
    } else if (layout !== undefined) {
        const menu = (
            <LayoutChipMenu
                onOpenChange={(opened) => {
                    setMenuOpened(opened);

                    if (opened && layout.onOpenMenu !== undefined) {
                        layout.onOpenMenu();
                    }
                }}
                onOpenSettings={layout.onOpenSettings ?? noop}
                onRerun={layout.onRerun ?? noop}
                onStop={layout.onStop ?? noop}
                opened={menuOpened}
                picks={layout.picks ?? []}
            />
        );

        nodes.set(
            "layout",
            <StatusBarLayoutSlot
                layout={layout}
                menu={menu}
                nameDropped={isDropped("layout")}
                nameRef={overflow.measureSlot("layout")}
            />,
        );
    }

    if (running !== undefined) {
        nodes.set("running", <StatusBarRunningSlot running={running} />);
    }

    if (viewing !== undefined && !isDropped("viewing")) {
        nodes.set("viewing", <StatusBarViewingSlot viewing={viewing} />);
    }

    if (issues !== undefined) {
        nodes.set("issues", <StatusBarIssuesSlot issues={issues} />);
    }

    if (ai !== undefined && !isDropped("ai")) {
        nodes.set("ai", <StatusBarAiSlot ai={ai} />);
    }

    if (selection !== undefined) {
        nodes.set("selection", <StatusBarSelectionSlot selection={selection} />);
    }

    const rendered = STATUS_BAR_SLOT_ORDER.filter((slot) => nodes.has(slot));
    const dividesAfterCounts = nodes.has("counts") && nodes.has("zoom");
    const dividesBeforeLayout = nodes.has("zoom") && nodes.has("layout");

    const drawSlot = (slot: StatusBarSlotId): React.JSX.Element => {
        const measured = slot !== "layout" && DROPPABLE.includes(slot);

        return (
            <React.Fragment key={slot}>
                {slot === "zoom" && dividesAfterCounts ? <SlotDivider /> : null}
                {slot === "layout" && dividesBeforeLayout ? <SlotDivider /> : null}
                <span data-status-slot={slot} ref={measured ? overflow.measureSlot(slot) : undefined} style={SLOT_BOX}>
                    {nodes.get(slot)}
                </span>
            </React.Fragment>
        );
    };

    return (
        <div ref={overflow.barRef} style={BAR_STYLE}>
            {completion === undefined ? null : <LoadCompleteToast completion={completion} />}
            {rendered.filter((slot) => !RIGHT_OF_SPACER.includes(slot)).map(drawSlot)}
            <span data-status-spacer="true" style={{ flex: "1 1 auto" }} />
            {rendered.filter((slot) => RIGHT_OF_SPACER.includes(slot)).map(drawSlot)}
        </div>
    );
}
