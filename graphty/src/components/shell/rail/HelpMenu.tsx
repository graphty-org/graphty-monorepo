/**
 * The Help menu: the rail's bottom item opens a MENU, not a panel and not a dialog
 * (spec 03 section 2.8).
 *
 * Anchoring (Main.dc.html revision 1.8, note B4). The menu hangs in the rail lane:
 * `left: 56` -- the 48 px rail plus the 8 px shell-boundary gap -- 200 px wide, and
 * bottom-aligned to its opener, which for a rail opener means the shared edge line
 * runs opener-bottom to menu-bottom. Because the rail's own bottom padding is 4 px,
 * bottom-aligning to the last rail item is `bottom: 4` in the main row. The caret
 * sits on the menu's LEFT edge -- the one facing the rail -- at the opener's vertical
 * centre, which is half an item above the shared bottom edge.
 *
 * The menu is therefore NOT a child of the rail: the rail clips its own overflow, and
 * the artboard draws the menu as a sibling inside the main row. Render it inside a
 * `position: relative` main row that does not clip, and it lands where it is drawn.
 *
 * Floor: the menu is at its floor and nothing here is behind a door (Main.dc.html
 * D8). Every row is a verb, rows carry no leading glyph -- the closed register owns
 * none of these verbs and a glyph is never invented for one screen (6.8) -- and every
 * row is also indexed by the command palette, so this menu is never the only route to
 * any of them.
 *
 * Counted rows: "More suggestions (N)" and "Already run (N)" open submenus when their
 * counts are non-zero and are NOT drawn at zero, because a zero count is not drawn at
 * all (spec 04 section 5.2, "Zero, null and default rows are not drawn").
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK, POPOUT_GAP, UiGlyph } from "@graphty/compact-mantine";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { keyChipFor } from "../bindings";
import { ACTIVITY_RAIL_ITEM_HEIGHT, ACTIVITY_RAIL_WIDTH, CANVAS_MENU_Z_INDEX } from "../constants";

/**
 * The rows of the Help menu, in the order spec 03 section 2.8 fixes.
 */
export type HelpMenuRowId =
    | "alreadyRun"
    | "documentation"
    | "keyboardShortcuts"
    | "moreSuggestions"
    | "sendFeedback"
    | "showSuggestions"
    | "whatTheMarksMean";

/**
 * The menu's own drawn numbers.
 *
 * `shell/constants.ts` names the rail and the shell; VOCAB section 9 names the
 * dropdown box, and Main.dc.html draws this instance of it. The parts that ARE shell
 * measurements -- the lane, the shared bottom edge, the caret's centre -- are derived
 * from the rail's constants rather than retyped.
 */
const HELP_MENU = {
    /** The dropdown box: 200 px wide (VOCAB section 9; Main.dc.html [56,755 200x117]). */
    WIDTH: 200,
    /** The rail lane: the 48 px rail plus the 8 px shell-boundary gap = 56. */
    LEFT: ACTIVITY_RAIL_WIDTH + POPOUT_GAP,
    /**
     * The shared bottom edge: the rail's own 4 px bottom padding puts the last rail
     * item's bottom exactly this far above the main row's floor.
     */
    BOTTOM: COMPACT_SIZING.SECTION_GAP,
    /** Box padding (VOCAB section 9 dropdown, 4 px). */
    PADDING: COMPACT_SIZING.SECTION_GAP,
    /** One CSS pixel: the border, the row gap, and the rule inside a separator. */
    HAIRLINE: 1,
    /** The separator's breathing room above and below its rule (Main.dc.html `margin: 3px 0`). */
    SEPARATOR_INSET: 3,
    /** The caret: 8 px at the anchored edge for a surface narrower than 280 (VOCAB 14.2). */
    CARET_WIDTH: PANEL_GRID.GLYPH_SLOT / 2,
    /** The caret's clipping box is a full glyph slot tall, so a rotated square fits inside it. */
    CARET_BOX_HEIGHT: PANEL_GRID.GLYPH_SLOT,
    /** The rotated square that draws the caret (Main.dc.html). */
    CARET_SQUARE: 10,
    /** The rotated square's inset inside the clipping box (Main.dc.html). */
    CARET_SQUARE_INSET: 3,
} as const;

/**
 * The caret's offset from the menu's bottom edge.
 *
 * The menu's bottom edge sits on the opener's bottom edge, so the opener's vertical
 * centre is half an item above it. The caret box is measured from the menu's PADDING
 * box, which is one border inside the menu's bottom edge.
 */
const CARET_BOTTOM = ACTIVITY_RAIL_ITEM_HEIGHT / 2 - HELP_MENU.CARET_BOX_HEIGHT / 2 - HELP_MENU.HAIRLINE;

/**
 * One row of the menu.
 */
interface HelpMenuRow {
    /** The row's id, which is what {@link HelpMenuProps.onSelect} is called with. */
    readonly id: HelpMenuRowId;
    /** The row's full text, verbatim from spec 03 section 2.8. */
    readonly label: string;
    /** The row's key chip, from the one binding table, or null when it has no binding. */
    readonly chip: string | null;
    /** Whether the row opens a submenu (a counted row with a non-zero count). */
    readonly submenu: boolean;
    /** Whether a separator rule is drawn above the row. */
    readonly separatorBefore: boolean;
}

/**
 * Props of the Help menu.
 * @public
 */
export interface HelpMenuProps {
    /** Whether the menu is open. The shell owns the state; the rail only reports clicks. */
    readonly opened: boolean;
    /** Open-state change: an Escape press, or a row that was taken. */
    readonly onOpenChange: (opened: boolean) => void;
    /** A row was taken. */
    readonly onSelect: (row: HelpMenuRowId) => void;
    /** Suggestion cards not currently on the Insights strip. At zero the row is not drawn. */
    readonly moreSuggestionsCount: number;
    /** Retired analysis cards that can be re-run. At zero the row is not drawn. */
    readonly alreadyRunCount: number;
}

/**
 * The menu's rows for a given pair of counts.
 *
 * The order is spec 03 section 2.8's, and the separator is the one Main.dc.html
 * draws: it divides the two rows that act on this session's suggestions from the
 * three reference and feedback rows below them.
 * @param moreSuggestionsCount - suggestion cards not currently shown.
 * @param alreadyRunCount - retired cards that can be re-run.
 * @returns the rows to draw, in order.
 */
function helpMenuRows(moreSuggestionsCount: number, alreadyRunCount: number): readonly HelpMenuRow[] {
    const rows: HelpMenuRow[] = [
        {
            id: "keyboardShortcuts",
            label: "Keyboard shortcuts",
            chip: keyChipFor("keyboardShortcuts"),
            submenu: false,
            separatorBefore: false,
        },
        { id: "showSuggestions", label: "Show suggestions", chip: null, submenu: false, separatorBefore: false },
    ];

    if (moreSuggestionsCount > 0) {
        rows.push({
            id: "moreSuggestions",
            label: `More suggestions (${moreSuggestionsCount})`,
            chip: null,
            submenu: true,
            separatorBefore: false,
        });
    }

    if (alreadyRunCount > 0) {
        rows.push({
            id: "alreadyRun",
            label: `Already run (${alreadyRunCount})`,
            chip: null,
            submenu: true,
            separatorBefore: false,
        });
    }

    rows.push(
        { id: "whatTheMarksMean", label: "What the marks mean", chip: null, submenu: false, separatorBefore: true },
        { id: "documentation", label: "Documentation", chip: null, submenu: false, separatorBefore: false },
        { id: "sendFeedback", label: "Send feedback", chip: null, submenu: false, separatorBefore: false },
    );

    return rows;
}

/**
 * The menu's items, in document order.
 * @param container - the menu element.
 * @returns every menu item inside it.
 */
function menuItems(container: HTMLElement): HTMLButtonElement[] {
    return Array.from(container.querySelectorAll<HTMLButtonElement>('[role="menuitem"]'));
}

/**
 * Moves focus to one item, wrapping at both ends.
 * @param items - the menu's items.
 * @param index - the item to focus; out-of-range indexes wrap.
 */
function focusItemAt(items: readonly HTMLButtonElement[], index: number): void {
    if (items.length === 0) {
        return;
    }

    const wrapped = ((index % items.length) + items.length) % items.length;
    const item = items[wrapped];

    if (item !== undefined) {
        item.focus();
    }
}

/**
 * The Help menu.
 *
 * Escape is handled on the menu's own element rather than through the shell
 * dispatcher: this is a widget closing itself, not a shell binding, and the
 * dispatcher's Escape ladder rung "close the topmost transient" lands on the same
 * `onOpenChange(false)` call, so the two are idempotent.
 * @param props - the menu's props.
 * @returns the menu, or null when it is closed.
 */
export function HelpMenu(props: HelpMenuProps): React.JSX.Element | null {
    const { opened, onOpenChange, onSelect, moreSuggestionsCount, alreadyRunCount } = props;
    const menuRef = useRef<HTMLDivElement | null>(null);
    const [hoveredRow, setHoveredRow] = useState<HelpMenuRowId | null>(null);

    useEffect(() => {
        if (!opened) {
            return undefined;
        }

        const container = menuRef.current;

        if (container === null) {
            return undefined;
        }

        focusItemAt(menuItems(container), 0);

        return undefined;
    }, [opened]);

    const handleKeyDown = useCallback(
        (event: React.KeyboardEvent<HTMLDivElement>): void => {
            const container = menuRef.current;

            if (container === null) {
                return;
            }

            const items = menuItems(container);
            const current = items.findIndex((item) => item === document.activeElement);

            if (event.key === "ArrowDown") {
                event.preventDefault();
                focusItemAt(items, current + 1);

                return;
            }

            if (event.key === "ArrowUp") {
                event.preventDefault();
                focusItemAt(items, current - 1);

                return;
            }

            if (event.key === "Home") {
                event.preventDefault();
                focusItemAt(items, 0);

                return;
            }

            if (event.key === "End") {
                event.preventDefault();
                focusItemAt(items, items.length - 1);

                return;
            }

            if (event.key === "Escape") {
                onOpenChange(false);
            }
        },
        [onOpenChange],
    );

    if (!opened) {
        return null;
    }

    const rows = helpMenuRows(moreSuggestionsCount, alreadyRunCount);

    return (
        <div
            ref={menuRef}
            role="menu"
            aria-label="Help"
            aria-orientation="vertical"
            onKeyDown={handleKeyDown}
            style={{
                position: "absolute",
                left: HELP_MENU.LEFT,
                bottom: HELP_MENU.BOTTOM,
                width: HELP_MENU.WIDTH,
                display: "flex",
                flexDirection: "column",
                gap: HELP_MENU.HAIRLINE,
                padding: HELP_MENU.PADDING,
                boxSizing: "border-box",
                borderRadius: "var(--mantine-radius-sm)",
                background: PANEL_INK.SURFACE,
                border: `${HELP_MENU.HAIRLINE}px solid ${PANEL_INK.BORDER}`,
                boxShadow: "var(--mantine-shadow-md)",
                zIndex: CANVAS_MENU_Z_INDEX,
            }}
        >
            <div
                aria-hidden="true"
                data-help-menu-caret="true"
                style={{
                    position: "absolute",
                    left: -HELP_MENU.CARET_WIDTH,
                    bottom: CARET_BOTTOM,
                    width: HELP_MENU.CARET_WIDTH,
                    height: HELP_MENU.CARET_BOX_HEIGHT,
                    overflow: "hidden",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: HELP_MENU.CARET_SQUARE_INSET,
                        top: HELP_MENU.CARET_SQUARE_INSET,
                        width: HELP_MENU.CARET_SQUARE,
                        height: HELP_MENU.CARET_SQUARE,
                        transform: "rotate(45deg)",
                        boxSizing: "border-box",
                        background: PANEL_INK.SURFACE,
                        borderLeft: `${HELP_MENU.HAIRLINE}px solid ${PANEL_INK.BORDER}`,
                        borderBottom: `${HELP_MENU.HAIRLINE}px solid ${PANEL_INK.BORDER}`,
                    }}
                />
            </div>
            {rows.map((row, index) => (
                <React.Fragment key={row.id}>
                    {row.separatorBefore ? (
                        <div
                            role="separator"
                            aria-orientation="horizontal"
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: HELP_MENU.HAIRLINE + HELP_MENU.SEPARATOR_INSET * 2,
                                flex: "0 0 auto",
                            }}
                        >
                            <div
                                style={{
                                    width: "100%",
                                    height: HELP_MENU.HAIRLINE,
                                    background: PANEL_INK.DIVIDER,
                                }}
                            />
                        </div>
                    ) : null}
                    <button
                        type="button"
                        role="menuitem"
                        tabIndex={index === 0 ? 0 : -1}
                        aria-haspopup={row.submenu ? "menu" : undefined}
                        onClick={() => {
                            onSelect(row.id);
                        }}
                        onMouseEnter={() => {
                            setHoveredRow(row.id);
                        }}
                        onMouseLeave={() => {
                            setHoveredRow(null);
                        }}
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: COMPACT_SIZING.CONTROL_PADDING,
                            height: COMPACT_SIZING.HEIGHT,
                            flex: `0 0 ${COMPACT_SIZING.HEIGHT}px`,
                            padding: `0 ${COMPACT_SIZING.CONTROL_PADDING}px`,
                            border: "none",
                            borderRadius: "var(--mantine-radius-sm)",
                            boxSizing: "border-box",
                            background: hoveredRow === row.id ? PANEL_INK.RAISED : "transparent",
                            color: PANEL_INK.VALUE,
                            fontFamily: "inherit",
                            fontSize: COMPACT_SIZING.FONT_SIZE,
                            lineHeight: 1.2,
                            textAlign: "start",
                            cursor: "pointer",
                        }}
                    >
                        <span
                            style={{
                                flex: "1 1 0",
                                minWidth: 0,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                            }}
                        >
                            {row.label}
                        </span>
                        {row.chip === null ? null : (
                            <span
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    height: PANEL_GRID.GLYPH_SLOT,
                                    padding: `0 ${COMPACT_SIZING.SECTION_GAP}px`,
                                    borderRadius: "var(--mantine-radius-xs)",
                                    border: `${HELP_MENU.HAIRLINE}px solid ${PANEL_INK.BORDER}`,
                                    boxSizing: "border-box",
                                    color: PANEL_INK.CHROME,
                                    fontFamily: "var(--mantine-font-family-monospace)",
                                    fontSize: COMPACT_SIZING.FONT_SIZE,
                                    lineHeight: 1,
                                }}
                            >
                                {row.chip}
                            </span>
                        )}
                        {row.submenu ? (
                            <span style={{ display: "inline-flex", color: PANEL_INK.CHROME }}>
                                <UiGlyph name="chevronRight" size={PANEL_GRID.CHEVRON} />
                            </span>
                        ) : null}
                    </button>
                </React.Fragment>
            ))}
        </div>
    );
}
