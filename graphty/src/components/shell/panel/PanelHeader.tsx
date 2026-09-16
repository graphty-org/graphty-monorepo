import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { ActionIcon, Box, Menu } from "@mantine/core";
import React from "react";

import { PANEL_HEADER_HEIGHT } from "../constants";
import type { PanelOverflowItem } from "../types";

/**
 * The gap the header's two clusters pack their own members at.
 *
 * 4px, as the trailing cluster of two 24px hit boxes is drawn on every panel
 * board (spec 03 section 1.2; Main.dc.html:298, DataPanelLoaded.dc.html:191).
 * `PANEL_GRID` publishes no 4px gap of its own, so this follows the idiom of
 * compact-mantine's own rows, which name theirs `INLINE_GAP` / `AFFORDANCE_GAP`.
 */
const CLUSTER_GAP = 4;

/**
 * The header's trailing padding when a `More` overflow is present.
 *
 * The artboard writes `padding: 0 12px 0 16px` with a `More` and
 * `0 8px 0 16px` without it (spec 03 section 1.2; DataPanelLoaded.dc.html:187 and
 * Main.dc.html:292). Written here over the grid it is the panel's own 8px
 * trailing pad plus the 4px the cluster packs at, so the last glyph in the
 * longer cluster keeps the same optical inset as the only glyph in the shorter.
 */
const HEADER_PAD_RIGHT_WITH_MORE = PANEL_GRID.PAD_RIGHT + CLUSTER_GAP;

/**
 * The panel name's type size.
 *
 * 12px / weight 500 / line-height 1.2 (spec 03 section 1.2). 12px falls between
 * the compact theme's `sm` (11px) and `md` (13px) tokens, so it has no variable
 * of its own -- `ControlSection` carries the same constant for the same reason.
 */
const NAME_FONT_SIZE = 12;

/** The panel name's line height, from the same row of the type ramp. */
const NAME_LINE_HEIGHT = 1.2;

/**
 * The three-dot `More` drawing, copied from the artboard.
 *
 * compact-mantine's glyph register is CLOSED and holds no `more` verb
 * (spec 04 section 1.5), so the overflow's drawing comes from the board that
 * draws it (DataPanelLoaded.dc.html:197) rather than from a new register entry.
 * It inherits its colour from the button, exactly as a register glyph does.
 * It is exported so the one drawing serves every `More` in the region -- a
 * panel header's and a section header's alike (6.8, "one verb, one drawing").
 * @returns the three vertical dots, at the register's stroke weight.
 */
export function MoreGlyph(): React.JSX.Element {
    return (
        <svg
            width={PANEL_GRID.GLYPH}
            height={PANEL_GRID.GLYPH}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            <circle cx="8" cy="3.5" r="0.75" />
            <circle cx="8" cy="8" r="0.75" />
            <circle cx="8" cy="12.5" r="0.75" />
        </svg>
    );
}

/** The overflow control's name. The register keeps this control's own word. */
export const MORE_LABEL = "More";

/*
 * TWO CONTROLS AND THEIR STRINGS LEFT THIS HEADER ON 2026-09-14.
 *
 * `CLOSE_PANEL_LABEL` / `closePanelTooltip` drew an X titled "Close the panel (Ctrl+B)",
 * and a `Keep open` latch sat left of `More`. Both were individual controls over ONE
 * sidebar. The product owner's instruction was "our panel open / closed / autohide is a
 * confusing nightmare. remove the panel locks and remove autohide ... there is one button
 * to hide / show both at the same time and not individual buttons", so the panel is drawn
 * whenever the sidebars are shown and has nothing of its own to close and nothing of its
 * own to latch.
 *
 * The header keeps `More` and the panel-body actions slot, which are about the panel's
 * CONTENT rather than its presence.
 */

/**
 * Props of the activity panel's 36px title row.
 * @public
 */
export interface PanelHeaderProps {
    /** The activity name, drawn at 12px / weight 500 and never truncated away. */
    readonly title: string;
    /** The 14px activity glyph that leads the row. Drawn `aria-hidden`. */
    readonly glyph: React.ReactNode;
    /**
     * The overflow rows. When none are given the `More` control is not rendered
     * at all and the row takes its narrower trailing padding.
     */
    readonly overflowItems?: readonly PanelOverflowItem[];
    /**
     * Receives the trailing slot a panel body draws its own header controls into
     * -- Analyze's Cards / List toggle is the one instance (AnalyzePanel.dc.html
     * :206-216). It leads the trailing cluster, so a panel's own control sits
     * left of the universal `More` and X rather than between them.
     */
    readonly actionsRef?: (node: HTMLDivElement | null) => void;
}

/**
 * The activity panel's title row: the activity glyph, the activity name, the panel's own
 * actions slot and an optional `More` overflow.
 *
 * It USED to end in a `Keep open` latch and a close X. Both were deleted on 2026-09-14
 * with the rest of the per-surface panel model; see the note above `MORE_LABEL` for what
 * they were and why they went. The row is one control shorter on both counts, so the four
 * `__screenshots__` baselines that draw a panel header move -- that is the change, not a
 * regression, and they were re-approved deliberately.
 *
 * There is no panel-level info circle, ever (spec 03 section 1.2): an unshipped
 * row's explanation rides on the row itself as a `Coming` tag.
 * @param props - the header's props.
 * @returns the 36px title row.
 */
export function PanelHeader(props: PanelHeaderProps): React.JSX.Element {
    const { title, glyph, overflowItems, actionsRef } = props;

    const hasOverflow = overflowItems !== undefined && overflowItems.length > 0;

    return (
        <Box
            component="header"
            data-testid="panel-header"
            style={{
                flex: `0 0 ${PANEL_HEADER_HEIGHT}px`,
                height: PANEL_HEADER_HEIGHT,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: PANEL_GRID.TRAIL_GAP,
                boxSizing: "border-box",
                paddingInlineStart: PANEL_GRID.PAD_LEFT,
                paddingInlineEnd: hasOverflow ? HEADER_PAD_RIGHT_WITH_MORE : PANEL_GRID.PAD_RIGHT,
                borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
            }}
        >
            <Box
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: PANEL_GRID.TRAIL_GAP,
                    minWidth: 0,
                }}
            >
                <Box
                    aria-hidden="true"
                    data-testid="panel-header-glyph"
                    style={{
                        flex: "0 0 auto",
                        width: PANEL_GRID.GLYPH,
                        height: PANEL_GRID.GLYPH,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: PANEL_INK.CHROME,
                    }}
                >
                    {glyph}
                </Box>
                <Box
                    component="h2"
                    data-testid="panel-header-title"
                    style={{
                        margin: 0,
                        minWidth: 0,
                        fontSize: NAME_FONT_SIZE,
                        fontWeight: 500,
                        lineHeight: NAME_LINE_HEIGHT,
                        color: PANEL_INK.VALUE,
                        whiteSpace: "nowrap",
                    }}
                >
                    {title}
                </Box>
            </Box>

            <Box style={{ display: "flex", alignItems: "center", gap: CLUSTER_GAP, flex: "0 0 auto" }}>
                <Box
                    ref={actionsRef}
                    data-testid="panel-header-actions"
                    style={{ display: "flex", alignItems: "center", gap: CLUSTER_GAP, flex: "0 0 auto" }}
                />
                {hasOverflow && (
                    <Menu position="bottom-end" withinPortal shadow="md">
                        <Menu.Target>
                            {/*
                                A menu opener takes its tooltip from the native
                                `title` rather than from Mantine's Tooltip: the
                                Tooltip would sit between Menu.Target and the
                                button it must hand its click to.
                            */}
                            <ActionIcon
                                type="button"
                                variant="subtle"
                                size={PANEL_GRID.CONTROL_HEIGHT}
                                radius="sm"
                                c={PANEL_INK.CHROME}
                                title={MORE_LABEL}
                                aria-label={MORE_LABEL}
                                data-testid="panel-header-more"
                            >
                                <MoreGlyph />
                            </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                            {overflowItems.map((item) => (
                                <React.Fragment key={item.id}>
                                    {item.separatorBefore === true && <Menu.Divider />}
                                    <Menu.Item
                                        disabled={item.disabled ?? false}
                                        title={item.disabled === true ? item.disabledReason : undefined}
                                        onClick={item.onSelect}
                                    >
                                        {item.label}
                                    </Menu.Item>
                                </React.Fragment>
                            ))}
                        </Menu.Dropdown>
                    </Menu>
                )}
            </Box>
        </Box>
    );
}
