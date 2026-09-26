/**
 * The Help menu: the rail's bottom item opens a MENU, not a panel and not a dialog
 * (spec 03 section 2.8).
 *
 * It is a Mantine `Menu` like every other menu in the shell, and the rail's Help item
 * is its `Menu.Target`. Mantine owns the keyboard (arrow keys, Home, End), Escape,
 * the click outside that closes it, and the focus return to the Help item. The
 * dropdown is portalled, so the rail clipping its own overflow does not matter.
 *
 * Anchoring (Main.dc.html revision 1.8, note B4). The menu hangs in the rail lane --
 * 8 px right of the 48 px rail, so 9 px right of the 47 px item plus the rail's 1 px
 * border -- 200 px wide, and bottom-aligned to its opener (`right-end`). The caret
 * sits on the menu's LEFT edge at the opener's vertical centre.
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

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { Menu } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import {
    ACTIVITY_RAIL_ITEM_HEIGHT,
    ACTIVITY_RAIL_ITEM_WIDTH,
    ACTIVITY_RAIL_WIDTH,
    CANVAS_MENU_Z_INDEX,
} from "../constants";

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
 * The menu's own drawn numbers. The parts that ARE shell measurements -- the gap to
 * the rail lane and the caret's centre -- are derived from the rail's constants.
 */
const HELP_MENU = {
    /** The dropdown box: 200 px wide (VOCAB section 9; Main.dc.html [56,755 200x117]). */
    WIDTH: 200,
    /** From the item's right edge to the rail lane: the rail's 1 px border plus the 8 px gap. */
    // The artboard's 8 px shell-boundary gap. It was compact-mantine's POPOUT_GAP until the
    // library docked its pop-outs flush (POPOUT_GAP 0); the menu's own lane keeps the gap.
    OFFSET: ACTIVITY_RAIL_WIDTH - ACTIVITY_RAIL_ITEM_WIDTH + 8,
    /** Box padding (VOCAB section 9 dropdown, 4 px). */
    PADDING: COMPACT_SIZING.SECTION_GAP,
    /** One CSS pixel: the border and the row gap. */
    HAIRLINE: 1,
    /** The separator's breathing room above and below its rule (Main.dc.html `margin: 3px 0`). */
    SEPARATOR_INSET: 3,
    /** The rotated square that draws the caret (Main.dc.html). */
    CARET_SQUARE: 10,
} as const;

/**
 * The caret's offset from the menu's bottom edge, so its centre sits on the opener's
 * vertical centre: half an item above the shared bottom edge, less half the caret and
 * the border it is measured inside.
 */
const CARET_OFFSET = ACTIVITY_RAIL_ITEM_HEIGHT / 2 - HELP_MENU.CARET_SQUARE / 2 - HELP_MENU.HAIRLINE;

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
    /** Whether the menu is open. The shell owns the state. */
    readonly opened: boolean;
    /** Open-state change: a click on the opener, Escape, a click outside, or a row that was taken. */
    readonly onOpenChange: (opened: boolean) => void;
    /** A row was taken. */
    readonly onSelect: (row: HelpMenuRowId) => void;
    /** Suggestion cards not currently on the Insights strip. At zero the row is not drawn. */
    readonly moreSuggestionsCount: number;
    /** Retired analysis cards that can be re-run. At zero the row is not drawn. */
    readonly alreadyRunCount: number;
    /**
     * The opener -- the rail's Help item. It becomes the menu's `Menu.Target`, so it
     * must accept a ref and pass unknown props (aria-expanded, onClick) to its button.
     */
    readonly children: React.ReactElement;
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
 * The Help menu, wrapped around its opener.
 * @param props - the menu's props; `children` is the opener.
 * @returns the opener with its menu.
 */
export function HelpMenu(props: HelpMenuProps): React.JSX.Element {
    const { opened, onOpenChange, onSelect, moreSuggestionsCount, alreadyRunCount, children } = props;
    const rows = helpMenuRows(moreSuggestionsCount, alreadyRunCount);

    return (
        <Menu
            opened={opened}
            onChange={onOpenChange}
            position="right-end"
            // Mantine adds half the caret to the offset so the caret's tip, not the box,
            // lands at it; the box belongs in the rail lane, so take that half back.
            offset={HELP_MENU.OFFSET - HELP_MENU.CARET_SQUARE / 2}
            width={HELP_MENU.WIDTH}
            withArrow
            arrowSize={HELP_MENU.CARET_SQUARE}
            arrowOffset={CARET_OFFSET}
            arrowPosition="side"
            zIndex={CANVAS_MENU_Z_INDEX}
            shadow="md"
            withinPortal
            styles={{
                dropdown: {
                    display: "flex",
                    flexDirection: "column",
                    gap: HELP_MENU.HAIRLINE,
                    padding: HELP_MENU.PADDING,
                    background: PANEL_INK.SURFACE,
                    border: `${HELP_MENU.HAIRLINE}px solid ${PANEL_INK.BORDER}`,
                },
                arrow: { background: PANEL_INK.SURFACE, borderColor: PANEL_INK.BORDER },
                item: {
                    height: COMPACT_SIZING.HEIGHT,
                    flex: `0 0 ${COMPACT_SIZING.HEIGHT}px`,
                    padding: `0 ${COMPACT_SIZING.CONTROL_PADDING}px`,
                    color: PANEL_INK.VALUE,
                },
                divider: {
                    margin: `${HELP_MENU.SEPARATOR_INSET}px 0`,
                    borderColor: PANEL_INK.DIVIDER,
                },
            }}
        >
            <Menu.Target>{children}</Menu.Target>
            <Menu.Dropdown>
                {rows.map((row) => (
                    <React.Fragment key={row.id}>
                        {row.separatorBefore ? <Menu.Divider role="separator" /> : null}
                        <Menu.Item
                            aria-haspopup={row.submenu ? "menu" : undefined}
                            onClick={() => {
                                onSelect(row.id);
                            }}
                            rightSection={<HelpMenuRowTrailing row={row} />}
                        >
                            {row.label}
                        </Menu.Item>
                    </React.Fragment>
                ))}
            </Menu.Dropdown>
        </Menu>
    );
}

/**
 * A row's trailing column: its key chip, or the chevron of a row with a submenu.
 * @param props - the row.
 * @param props.row - the row whose trailing column this is.
 * @returns the chip and chevron, or null when the row has neither.
 */
function HelpMenuRowTrailing({ row }: { readonly row: HelpMenuRow }): React.JSX.Element | null {
    if (row.chip === null && !row.submenu) {
        return null;
    }

    return (
        <>
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
        </>
    );
}
