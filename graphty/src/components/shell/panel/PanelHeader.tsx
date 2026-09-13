import { PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box, Menu, Tooltip } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import { KEEP_OPEN_LABEL, PANEL_HEADER_HEIGHT, TOOLTIP_DELAY_MS } from "../constants";
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

/**
 * The close control's accessible name: the tooltip with the key chip removed
 * (spec 04 section 8.2 obligation 1).
 */
export const CLOSE_PANEL_LABEL = "Close the panel";

/** The overflow control's name. The register keeps this control's own word. */
export const MORE_LABEL = "More";

/**
 * The text the close control's tooltip prints: the verb, then the key chip.
 *
 * The chip comes from the one binding table and resolves Cmd against Ctrl for
 * the running platform (spec 04 section 10.3), so the string is
 * "Close the panel (Cmd+B)" on an Apple platform and "(Ctrl+B)" elsewhere. An
 * unshipped action returns no chip at all, in which case the verb stands alone.
 * @returns the close control's tooltip text.
 */
function closePanelTooltip(): string {
    const chip = keyChipFor("togglePanel");

    return chip === null ? CLOSE_PANEL_LABEL : `${CLOSE_PANEL_LABEL} (${chip})`;
}

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
    /**
     * Whether the panel is latched open, which the `Keep open` toggle reports as its
     * pressed state. The title never changes with it: an active toggle does not rename
     * itself (REGISTER-1.5 section 10.2).
     */
    readonly keptOpen?: boolean;
    /**
     * The latch (6.12, "The latch"). The control is drawn only where a region supplies
     * this, exactly as `Pin as A` is in the inspector; the shell always supplies it.
     */
    readonly onKeepOpenChange?: (kept: boolean) => void;
    /** The header X. */
    readonly onClose: () => void;
}

/**
 * The activity panel's title row: the activity glyph, the activity name, the
 * `Keep open` latch, an optional `More` overflow and the close X.
 *
 * The latch sits left of `More` and the X, which is where 6.8 reads a keep-open
 * against a dismiss, and it was added on 2026-09-12 at the product owner's
 * direction ("the left panel has no way of keeping it open after I click"). The
 * row has room for it: the panel's name is a single activity word, so nothing in
 * this header competes for the name band the way the inspector's does.
 *
 * There is no panel-level info circle, ever (spec 03 section 1.2): an unshipped
 * row's explanation rides on the row itself as a `Coming` tag.
 * @param props - the header's props.
 * @returns the 36px title row.
 */
export function PanelHeader(props: PanelHeaderProps): React.JSX.Element {
    const { title, glyph, overflowItems, actionsRef, keptOpen, onKeepOpenChange, onClose } = props;

    const hasOverflow = overflowItems !== undefined && overflowItems.length > 0;
    const closeTooltip = closePanelTooltip();
    const latched = keptOpen ?? false;

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
                {onKeepOpenChange !== undefined && (
                    <Tooltip label={KEEP_OPEN_LABEL} openDelay={TOOLTIP_DELAY_MS} position="bottom">
                        <ActionIcon
                            type="button"
                            variant="subtle"
                            size={PANEL_GRID.CONTROL_HEIGHT}
                            radius="sm"
                            c={latched ? PANEL_INK.VALUE : PANEL_INK.CHROME}
                            aria-label={KEEP_OPEN_LABEL}
                            aria-pressed={latched}
                            data-testid="panel-header-keep-open"
                            onClick={() => {
                                onKeepOpenChange(!latched);
                            }}
                        >
                            <UiGlyph name="keepOpen" size={PANEL_GRID.GLYPH} />
                        </ActionIcon>
                    </Tooltip>
                )}

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

                <Tooltip label={closeTooltip} openDelay={TOOLTIP_DELAY_MS} position="bottom">
                    <ActionIcon
                        type="button"
                        variant="subtle"
                        size={PANEL_GRID.CONTROL_HEIGHT}
                        radius="sm"
                        c={PANEL_INK.CHROME}
                        aria-label={CLOSE_PANEL_LABEL}
                        data-testid="panel-header-close"
                        onClick={onClose}
                    >
                        <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                    </ActionIcon>
                </Tooltip>
            </Box>
        </Box>
    );
}
