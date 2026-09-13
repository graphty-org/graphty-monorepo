/**
 * The layout chip's caret menu, build spec 02 section 5.
 *
 * Contents, in order (5.1 Layout menu; NAV-12):
 *
 * 1. the four Style quick picks, each with its size estimate and its disabled reason,
 *    the active engine checked;
 * 2. `Re-run`;
 * 3. `Stop`;
 * 4. `Layout settings...`, which opens Style with the list focused.
 *
 * The menu carries no parameters and no All layouts list: Style remains the home. It
 * is a Mantine `Menu` rather than a 6.11 pop-out, and it opens UPWARD because the bar
 * it hangs from is the bottom edge of the shell.
 */

import { PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { Menu, Tooltip } from "@mantine/core";
import React from "react";

import { COMING_LABEL } from "../ComingTag";
import { TOOLTIP_DELAY_MS } from "../constants";
import { MenuCaret } from "../MenuCaret";
import { StatusBarChip } from "./StatusBarChip";
import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";
import type { LayoutQuickPick } from "./statusBarModel";

/**
 * The name of the surface the caret half opens.
 *
 * REGISTER 1.5 (caret, menu affordance): a caret drawn as its own separately
 * clickable half "carries its own title naming what that half opens". Spec 02 section
 * 4.2 slot 4 names this surface "the layout menu" and section 5 heads it "Layout chip
 * caret menu"; the sources print no other string for it.
 */
export const LAYOUT_MENU_LABEL = "Layout menu";

/*
 * The unshipped state mark, spec 04 section 5.8 and spec 03 section 1.5. The WORD has
 * one source shell-wide (`shell/ComingTag.tsx`); the BOX is the status bar's own chip
 * atom, because spec 02 section 4.1 says every chip in this bar is that atom. It is
 * re-exported so a menu row's mark still reads out of this module.
 */
export { COMING_LABEL } from "../ComingTag";

/**
 * The menu's three verbs, spec 02 section 5 items 2, 3 and 4. The one home for the three words,
 * so anything asserting a menu row quotes them rather than retyping them.
 * @public
 */
export const LAYOUT_MENU_VERBS = {
    /** Runs the active engine again. */
    RERUN: "Re-run",
    /** Stops a running layout. */
    STOP: "Stop",
    /** Opens Style with the layout list focused. */
    SETTINGS: "Layout settings...",
} as const;

/**
 * Props of the layout chip's caret menu.
 * @public
 */
export interface LayoutChipMenuProps {
    /** Whether the menu is open. */
    readonly opened: boolean;
    /** Reports an open or a close, including Escape and an outside click. */
    readonly onOpenChange: (opened: boolean) => void;
    /** The four Style quick picks. An empty list leaves the three verbs alone. */
    readonly picks: readonly LayoutQuickPick[];
    /** Runs the active engine again. */
    readonly onRerun: () => void;
    /** Stops a running layout. */
    readonly onStop: () => void;
    /** Opens Style with the layout list focused. */
    readonly onOpenSettings: () => void;
}

/** The column that keeps every row's label on one left edge, checked or not. */
const CHECK_COLUMN: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: STATUS_BAR_GEOMETRY.CHECK,
    height: STATUS_BAR_GEOMETRY.CHECK,
};

/** The trailing column: a size estimate, a `Coming` tag, or both. */
const TRAILING_COLUMN: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: STATUS_BAR_GEOMETRY.CHIP_GAP,
};

/**
 * The caret half's own box.
 *
 * It draws at the chip's 16 px height so the chip does not grow around it, and wins
 * the 24 x 24 hit area spec 04 section 8.2 asks of an icon-only control the way the
 * info circle of section 8.4 wins its own: padding out and an equal negative margin
 * back, over a content box, so the layout box stays 16 x 16.
 */
const CARET_STYLE: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flex: "0 0 auto",
    boxSizing: "content-box",
    width: STATUS_BAR_GEOMETRY.CARET_BOX,
    height: STATUS_BAR_GEOMETRY.CARET_BOX,
    padding: STATUS_BAR_GEOMETRY.CARET_HIT_INSET,
    margin: -STATUS_BAR_GEOMETRY.CARET_HIT_INSET,
    border: "none",
    background: "none",
    color: PANEL_INK.CHROME,
    cursor: "pointer",
};

/**
 * The trailing cell of one quick pick: its size estimate, then its `Coming` tag.
 * @param props - Component props.
 * @param props.pick - The quick pick the cell belongs to.
 * @returns The trailing cell, or null when the pick carries neither.
 */
function QuickPickTrailing({ pick }: { pick: LayoutQuickPick }): React.JSX.Element | null {
    const showComing = pick.coming === true;

    if (pick.estimate === undefined && !showComing) {
        return null;
    }

    return (
        <span style={TRAILING_COLUMN}>
            {pick.estimate === undefined ? null : (
                <span style={{ color: PANEL_INK.CHROME, fontSize: STATUS_BAR_GEOMETRY.FONT_SIZE }}>
                    {pick.estimate}
                </span>
            )}
            {showComing ? <StatusBarChip muted>{COMING_LABEL}</StatusBarChip> : null}
        </span>
    );
}

/**
 * The layout chip's caret menu, drawn around its own caret half.
 *
 * A pick that is not built yet is drawn at the unshipped ink with a muted `Coming`
 * tag and cannot be activated, but it keeps its hover and its focus so that the
 * reason in its tooltip stays reachable: floor item 4 asks a disabled control to say
 * why it is disabled, which a control nobody can point at cannot do.
 * @param props - The menu's open state, its picks and its three verbs.
 * @returns The caret half with its menu.
 */
export function LayoutChipMenu(props: LayoutChipMenuProps): React.JSX.Element {
    const { opened, onOpenChange, picks, onRerun, onStop, onOpenSettings } = props;

    return (
        <Menu
            closeOnItemClick
            onChange={onOpenChange}
            opened={opened}
            position="top-start"
            shadow="md"
            trigger="click"
            withinPortal
        >
            <Menu.Target>
                <Tooltip label={LAYOUT_MENU_LABEL} openDelay={TOOLTIP_DELAY_MS} position="top" withinPortal>
                    <button
                        aria-expanded={opened}
                        aria-haspopup="menu"
                        aria-label={LAYOUT_MENU_LABEL}
                        style={CARET_STYLE}
                        type="button"
                    >
                        {/* The register's menu affordance, not the disclosure
                            chevron: 8 px at stroke 2 (spec 02 section 4.2 slot 4). */}
                        <MenuCaret size={STATUS_BAR_GEOMETRY.CARET} />
                    </button>
                </Tooltip>
            </Menu.Target>
            <Menu.Dropdown aria-label={LAYOUT_MENU_LABEL}>
                {picks.map((pick) => {
                    const disabled = pick.coming === true || pick.disabledReason !== undefined;

                    return (
                        <Menu.Item
                            aria-disabled={disabled || undefined}
                            data-disabled={disabled || undefined}
                            key={pick.id}
                            leftSection={
                                <span style={CHECK_COLUMN}>
                                    {pick.active ? <UiGlyph name="check" size={STATUS_BAR_GEOMETRY.CHECK} /> : null}
                                </span>
                            }
                            onClick={disabled ? undefined : pick.onSelect}
                            rightSection={<QuickPickTrailing pick={pick} />}
                            style={disabled ? { color: PANEL_INK.DISABLED } : undefined}
                            title={pick.title}
                        >
                            {pick.label}
                        </Menu.Item>
                    );
                })}
                {picks.length > 0 ? <Menu.Divider /> : null}
                <Menu.Item leftSection={<span style={CHECK_COLUMN} />} onClick={onRerun}>
                    {LAYOUT_MENU_VERBS.RERUN}
                </Menu.Item>
                <Menu.Item leftSection={<span style={CHECK_COLUMN} />} onClick={onStop}>
                    {LAYOUT_MENU_VERBS.STOP}
                </Menu.Item>
                <Menu.Item leftSection={<span style={CHECK_COLUMN} />} onClick={onOpenSettings}>
                    {LAYOUT_MENU_VERBS.SETTINGS}
                </Menu.Item>
            </Menu.Dropdown>
        </Menu>
    );
}
