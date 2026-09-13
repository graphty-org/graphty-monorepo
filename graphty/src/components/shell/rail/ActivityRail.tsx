/**
 * The activity rail: a fixed 48 px column on the left edge of the shell, below the top
 * bar.
 *
 * Six activities top to bottom -- Data, Explore, Analyze, Style, Present, AI -- then
 * a `flex: 1 1 auto` spacer, then Settings and Help pinned to the bottom
 * (spec 02 sections 1.2 and 1.3).
 *
 * Nesting the rail depends on: the rail is the LEFT column of the main row, and the top
 * bar spans the full shell width ABOVE that row, so the rail starts under the top bar
 * rather than at the very top of the shell; the status bar is full width BELOW the main
 * row, so it DOES cross under the rail. Spec 02 section 1.1 had the bar to the rail's
 * right instead and the rail running the full height; the product owner reversed that on
 * 2026-09-12 ("make the top bar go all the way across the top"), and the amendment is
 * recorded at design 5.1. The shell composes the frame; this component is only the
 * column, and it lost 40 px of height to the move and nothing else.
 *
 * Two rules this component does not implement, on purpose:
 *
 * - **Close-on-active-click** (spec 02 section 1.4) lives in the shell store's
 *   `selectActivity`. The rail reports every click, including a click on the already
 *   active item, and draws whatever `activeActivity` it is handed back.
 * - **The Help menu** is a separate surface ({@link HelpMenu}) anchored to the rail
 *   lane, not a child of the rail: the rail clips its own overflow. Clicking Help
 *   reports "help" and the shell opens the menu.
 *
 * One fact, one region: the Data mark is an UNNUMBERED dot -- the validation issue
 * COUNT belongs to the status bar issues chip and is never repeated here.
 */

import { COMPACT_SIZING, PANEL_INK } from "@graphty/compact-mantine";
import React from "react";

import { keyChipFor } from "../bindings";
import {
    ACTIVITY_RAIL_ITEM_GAP,
    ACTIVITY_RAIL_ITEM_WIDTH,
    ACTIVITY_RAIL_WIDTH,
    PINNED_ACTIVITIES,
    PRIMARY_ACTIVITIES,
} from "../constants";
import type { ActivityId, ActivityRailProps } from "../types";
import { ActivityRailItem } from "./ActivityRailItem";

/**
 * The rail's 1 px right border: the 48 px column less the 47 px item box
 * (spec 02 section 1.1, "1 px of the 48 is the right border").
 */
const RAIL_BORDER_WIDTH = ACTIVITY_RAIL_WIDTH - ACTIVITY_RAIL_ITEM_WIDTH;

/**
 * The rail's 4 px top and bottom padding, 0 left and right (spec 02 section 1.1).
 * Four is compact-mantine's own list gap.
 */
const RAIL_PADDING_Y = COMPACT_SIZING.SECTION_GAP;

/**
 * The eight rail labels, which are floor item 6 (6.10): a name the user needs, never
 * shortened, iconified or defaulted away.
 */
const RAIL_LABELS: Readonly<Record<ActivityId, string>> = {
    data: "Data",
    explore: "Explore",
    analyze: "Analyze",
    style: "Style",
    present: "Present",
    ai: "AI",
    settings: "Settings",
    help: "Help",
};

/**
 * The Help item's tooltip without its key chip (spec 02 section 1.3).
 */
const HELP_TITLE = "Help and keyboard shortcuts";

/**
 * What a disabled activity's tooltip appends: the reason it cannot be operated
 * (floor item 4; REGISTER 1.5 "New, Welcome").
 */
const LOAD_DATA_FIRST = ". Load data first";

/**
 * No activity disabled -- one frozen empty array rather than a new one per render.
 */
const NO_DISABLED_ACTIVITIES: readonly ActivityId[] = [];

/**
 * One rail item's tooltip.
 *
 * Every activity's tooltip is its name alone, or its name plus ". Load data first"
 * when it is disabled. Help is the one rail item whose action has a binding, so its
 * tooltip ends in that binding's chip -- taken from the one binding table, never
 * written down here (10.3, place 1 of the four).
 * @param activity - the rail destination.
 * @param disabled - whether the item is drawn inoperable.
 * @returns the register's tooltip string for that item in that state.
 */
function railItemTitle(activity: ActivityId, disabled: boolean): string {
    if (activity === "help") {
        const chip = keyChipFor("keyboardShortcuts");

        if (chip === null) {
            return HELP_TITLE;
        }

        return `${HELP_TITLE} (${chip})`;
    }

    const label = RAIL_LABELS[activity];

    if (disabled) {
        return `${label}${LOAD_DATA_FIRST}`;
    }

    return label;
}

/**
 * The activity rail.
 * @param props - the rail's props.
 * @returns the 48 px rail column.
 */
export function ActivityRail(props: ActivityRailProps): React.JSX.Element {
    const {
        activeActivity,
        disabledActivities = NO_DISABLED_ACTIVITIES,
        dataHasWarnings = false,
        presentBadge = null,
        onActivityClick,
    } = props;

    const renderItem = (activity: ActivityId): React.JSX.Element => {
        const disabled = disabledActivities.includes(activity);

        return (
            <ActivityRailItem
                key={activity}
                activity={activity}
                label={RAIL_LABELS[activity]}
                title={railItemTitle(activity, disabled)}
                active={activeActivity === activity}
                disabled={disabled}
                badge={activity === "present" ? presentBadge : null}
                warningDot={activity === "data" && dataHasWarnings}
                onClick={onActivityClick}
            />
        );
    };

    return (
        <nav
            aria-label="Activity rail"
            style={{
                flex: `0 0 ${ACTIVITY_RAIL_WIDTH}px`,
                width: ACTIVITY_RAIL_WIDTH,
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: ACTIVITY_RAIL_ITEM_GAP,
                padding: `${RAIL_PADDING_Y}px 0`,
                boxSizing: "border-box",
                overflow: "hidden",
                background: PANEL_INK.PANEL,
                borderRight: `${RAIL_BORDER_WIDTH}px solid ${PANEL_INK.DIVIDER}`,
            }}
        >
            {PRIMARY_ACTIVITIES.map((activity) => renderItem(activity))}
            <div aria-hidden="true" style={{ flex: "1 1 auto" }} />
            {PINNED_ACTIVITIES.map((activity) => renderItem(activity))}
        </nav>
    );
}
