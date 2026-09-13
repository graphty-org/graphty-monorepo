/**
 * One item of the activity rail: a 47 x 44 icon-only button carrying a 16 px glyph,
 * its 11 px name, and -- on exactly two of the eight -- a mark.
 *
 * Every rail item is an icon-only control under 6.8, so every one of them carries the
 * four obligations of section 8.2: an `aria-label` equal to its tooltip with the key
 * chip removed, an `aria-hidden` glyph, a tooltip at `TOOLTIP_DELAY_MS`, and a hit
 * area of at least 24 x 24 with 4 px of clear space -- which 47 x 44 exceeds in both
 * directions. The fourth obligation, a full-text twin, is met by the command palette,
 * which indexes every rail destination (spec 02 section 1; 5.5).
 *
 * Authority split (CONTRAST-DIVERGENCE section 5): every colour here is a `PANEL_INK`
 * token or a Mantine CSS variable. The artboard hexes (#7a828e inactive, #d5d7da
 * active, #28364e active ground, #4a7ee8 accent bar, #f7b731 warning, #5f6873
 * disabled) are evidence of ROLE and are never pasted.
 */

import { COMPACT_SIZING, PANEL_INK } from "@graphty/compact-mantine";
import { Tooltip, UnstyledButton } from "@mantine/core";
import React, { useCallback, useState } from "react";

import {
    ACTIVITY_RAIL_ITEM_GAP,
    ACTIVITY_RAIL_ITEM_HEIGHT,
    ACTIVITY_RAIL_ITEM_WIDTH,
    TOOLTIP_DELAY_MS,
} from "../constants";
import type { ActivityId, RailBadge } from "../types";
import { RAIL_GLYPHS } from "./railGlyphs";

/**
 * The marks a rail item draws, in the sizes the artboards give them.
 *
 * `shell/constants.ts` names the rail's box, item and gap; it names none of these
 * five, because they are drawn marks rather than layout. They are gathered here with
 * their sources rather than written into the styles as bare numbers, and the two that
 * are genuinely the rail's own measurements are derived rather than retyped.
 */
const RAIL_MARKS = {
    /**
     * The active marker: a 2 px wide bar up the item's leading edge, the full height
     * of the item (spec 02 section 1.1; Main.dc.html). Two is the rail's own unit --
     * the same 2 px it gaps its items with.
     */
    ACTIVE_BAR_WIDTH: ACTIVITY_RAIL_ITEM_GAP,
    /** The active bar runs the whole item: 44 px (spec 02 section 1.1). */
    ACTIVE_BAR_HEIGHT: ACTIVITY_RAIL_ITEM_HEIGHT,
    /** The Data warning dot: a 6 x 6 circle (DataPanelLoaded.dc.html). */
    DOT_SIZE: 6,
    /** The dot's inset from the item's top edge (DataPanelLoaded.dc.html `top: 6px`). */
    DOT_TOP: 6,
    /** The dot's inset from the item's trailing edge (DataPanelLoaded.dc.html `right: 8px`). */
    DOT_RIGHT: COMPACT_SIZING.CONTROL_PADDING,
    /** The Present badge pill: 14 tall and at least 14 wide (ReportEditorDrawer.dc.html; VOCAB section 3 badge). */
    BADGE_HEIGHT: 14,
    /** The badge's horizontal padding (ReportEditorDrawer.dc.html `padding: 0 4px`). */
    BADGE_PADDING_X: COMPACT_SIZING.SECTION_GAP,
    /** The badge's inset from the item's top edge (ReportEditorDrawer.dc.html `top: 2px`). */
    BADGE_TOP: 2,
    /** The badge's inset from the item's trailing edge (ReportEditorDrawer.dc.html `right: 4px`). */
    BADGE_RIGHT: COMPACT_SIZING.SECTION_GAP,
    /** Badge text: 9 px at weight 500, line-height 1 (VOCAB section 2, badge text). */
    BADGE_FONT_SIZE: 9,
} as const;

/**
 * The tinted ground of the active item. The artboards paint #28364e -- a tint of the
 * accent over the chrome, not a solid patch -- so this is Mantine's own light variant
 * of the primary colour rather than `PANEL_INK.SELECTED`, which is the inverted solid
 * patch a segmented control's checked half takes and would carry `ON_SELECTED` ink.
 */
const ACTIVE_ITEM_BACKGROUND = "var(--mantine-primary-color-light)";

/**
 * A trailing key chip, as the register writes one into a tooltip: a space, then the
 * chip in parentheses. Only one rail title carries one -- `Help and keyboard
 * shortcuts (?)` -- and no other rail title ends in a parenthesis.
 */
const TRAILING_KEY_CHIP = / \([^()]+\)$/;

/**
 * Props of one rail item.
 * @public
 */
export interface ActivityRailItemProps {
    /** Which rail destination this is; it also chooses the glyph. */
    readonly activity: ActivityId;
    /** The visible 11 px name under the glyph -- a floor item (6.10 item 6). */
    readonly label: string;
    /** The tooltip, character for character from the register (spec 02 sections 1.2, 1.3). */
    readonly title: string;
    /** Whether this is the one active item; it draws the bar and the tinted ground. */
    readonly active: boolean;
    /** Whether the item is drawn but inoperable. Its reason rides in `title`. */
    readonly disabled: boolean;
    /** The Present badge, or null. A badge is never drawn at zero. */
    readonly badge?: RailBadge | null;
    /** Whether the Data item carries its UNNUMBERED warning dot. */
    readonly warningDot?: boolean;
    /** Rail click. The store applies close-on-active-click; the item never decides. */
    readonly onClick: (activity: ActivityId) => void;
}

/**
 * The item's ink. Disabled beats active, because a disabled item is never the active
 * one and its dimness is what says it cannot be operated (PANEL_INK.DISABLED is
 * deliberately below the text contrast minimum; WCAG 2.2 exempts inactive controls).
 * @param active - whether this is the active item.
 * @param disabled - whether the item is inoperable.
 * @returns the ink token the glyph and the label take.
 */
function itemInk(active: boolean, disabled: boolean): string {
    if (disabled) {
        return PANEL_INK.DISABLED;
    }

    if (active) {
        return PANEL_INK.VALUE;
    }

    return PANEL_INK.CHROME;
}

/**
 * The item's ground: the active tint, else the hover fill, else nothing. A disabled
 * item never takes the hover fill.
 * @param active - whether this is the active item.
 * @param disabled - whether the item is inoperable.
 * @param hovered - whether the pointer is over the item.
 * @returns the background value, or undefined for no ground at all.
 */
function itemBackground(active: boolean, disabled: boolean, hovered: boolean): string | undefined {
    if (active) {
        return ACTIVE_ITEM_BACKGROUND;
    }

    if (hovered && !disabled) {
        return PANEL_INK.SURFACE;
    }

    return undefined;
}

/**
 * The accessible name of a rail item: its tooltip with the trailing key chip removed
 * (6.8 item 1). The chip is a rendering of a binding, not part of the control's name.
 * @param title - the register's tooltip string.
 * @returns the tooltip without its trailing key chip.
 */
function ariaLabelFor(title: string): string {
    return title.replace(TRAILING_KEY_CHIP, "");
}

/**
 * One rail item.
 *
 * A disabled item is `aria-disabled` rather than `disabled`: floor item 4 says the
 * reason a control is unavailable stays readable, and a truly disabled button takes
 * no pointer events, so its tooltip -- which is where that reason lives -- could
 * never open. The click is guarded instead, and the item stays focusable so a
 * keyboard user can read the reason too.
 * @param props - the item's props.
 * @returns the rail item element.
 */
export function ActivityRailItem(props: ActivityRailItemProps): React.JSX.Element {
    const { activity, label, title, active, disabled, badge = null, warningDot = false, onClick } = props;
    const [hovered, setHovered] = useState(false);

    const handleClick = useCallback((): void => {
        if (disabled) {
            return;
        }

        onClick(activity);
    }, [activity, disabled, onClick]);

    const handleMouseEnter = useCallback((): void => {
        setHovered(true);
    }, []);

    const handleMouseLeave = useCallback((): void => {
        setHovered(false);
    }, []);

    return (
        <Tooltip label={title} position="right" openDelay={TOOLTIP_DELAY_MS}>
            <UnstyledButton
                type="button"
                aria-label={ariaLabelFor(title)}
                aria-pressed={active}
                aria-disabled={disabled ? true : undefined}
                data-activity={activity}
                onClick={handleClick}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                style={{
                    position: "relative",
                    flex: `0 0 ${ACTIVITY_RAIL_ITEM_HEIGHT}px`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: ACTIVITY_RAIL_ITEM_GAP,
                    width: ACTIVITY_RAIL_ITEM_WIDTH,
                    height: ACTIVITY_RAIL_ITEM_HEIGHT,
                    boxSizing: "border-box",
                    background: itemBackground(active, disabled, hovered),
                    color: itemInk(active, disabled),
                    cursor: disabled ? "default" : "pointer",
                    fontSize: COMPACT_SIZING.FONT_SIZE,
                    lineHeight: 1.2,
                }}
            >
                {active ? (
                    <span
                        aria-hidden="true"
                        data-rail-mark="active"
                        style={{
                            position: "absolute",
                            left: 0,
                            top: 0,
                            width: RAIL_MARKS.ACTIVE_BAR_WIDTH,
                            height: RAIL_MARKS.ACTIVE_BAR_HEIGHT,
                            background: PANEL_INK.ACCENT,
                        }}
                    />
                ) : null}
                {RAIL_GLYPHS[activity]}
                <span>{label}</span>
                {warningDot ? (
                    <span
                        aria-hidden="true"
                        data-rail-mark="warning"
                        style={{
                            position: "absolute",
                            top: RAIL_MARKS.DOT_TOP,
                            right: RAIL_MARKS.DOT_RIGHT,
                            width: RAIL_MARKS.DOT_SIZE,
                            height: RAIL_MARKS.DOT_SIZE,
                            borderRadius: "50%",
                            background: PANEL_INK.WARNING,
                        }}
                    />
                ) : null}
                {badge !== null && badge.count > 0 ? (
                    <span
                        aria-hidden="true"
                        data-rail-mark="badge"
                        title={badge.title}
                        style={{
                            position: "absolute",
                            top: RAIL_MARKS.BADGE_TOP,
                            right: RAIL_MARKS.BADGE_RIGHT,
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            minWidth: RAIL_MARKS.BADGE_HEIGHT,
                            height: RAIL_MARKS.BADGE_HEIGHT,
                            padding: `0 ${RAIL_MARKS.BADGE_PADDING_X}px`,
                            borderRadius: RAIL_MARKS.BADGE_HEIGHT / 2,
                            boxSizing: "border-box",
                            background: PANEL_INK.ACCENT,
                            color: PANEL_INK.ON_ACCENT,
                            fontSize: RAIL_MARKS.BADGE_FONT_SIZE,
                            fontWeight: 500,
                            lineHeight: 1,
                        }}
                    >
                        {badge.count}
                    </span>
                ) : null}
            </UnstyledButton>
        </Tooltip>
    );
}
