/**
 * The keyboard shortcuts surface the Help menu's first row opens.
 *
 * It is one of the four places a binding may be printed (build spec 04 section 10.3:
 * a control's tooltip, a menu row's trailing column, a command palette row, and this
 * table), and the one the `?` binding lands on.
 *
 * It is NOT a dialog: 6.11 makes the shortcuts table a non-modal surface, so it takes
 * no scrim and no focus trap, the canvas keeps working underneath it, and it closes
 * from its own X or from the shell's Escape ladder -- never by trapping the press
 * itself, because this region installs no key listener (PLAN ground rule 5).
 *
 * The rows are read from the one binding table. Nothing is retyped here: an unshipped
 * action is skipped, because an unshipped row carries no chip anywhere.
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK, UiGlyph } from "@graphty/compact-mantine";
import { ActionIcon, Box } from "@mantine/core";
import React, { useMemo } from "react";

import { formatChords, type KeyBindingScope, SHELL_KEY_BINDINGS, type ShellKeyBinding } from "./bindings";
import { OVERLAY_INSET, PANEL_HEADER_HEIGHT, SHELL_OVERLAY_Z_INDEX } from "./constants";

/** The surface's name, which is also the Help row that opens it. */
export const KEYBOARD_SHORTCUTS_TITLE = "Keyboard shortcuts";

/** The X's tooltip, the one close string the shell uses everywhere. */
export const KEYBOARD_SHORTCUTS_CLOSE_TITLE = "Close (Esc)";

/**
 * The widest rung of 6.11's pop-out width ladder (280 / 360 / 480). A two-column
 * table of chords and sentences is the case that ladder's top rung exists for.
 */
const SHORTCUTS_WIDTH = 480;

/**
 * The chord column, wide enough for the longest cell the table prints once
 * `formatChords` has collapsed the arrow sets: "Arrows or Shift+Arrows" measures
 * 112.8 px and the Apple redo "Shift+Cmd+Z or Ctrl+Y" 111.6 px at this row's 11 px
 * type. 120 left seven pixels of headroom, which is how a wrapping cell went
 * unnoticed. The action column keeps the remainder and already ellipsises.
 */
const CHORD_COLUMN = 140;

/** The group heading's type size, the section-header size of spec 03 section 1.5. */
const GROUP_FONT_SIZE = 11;

/** The surface name's type size, the panel header's own 12 px / weight 500. */
const TITLE_FONT_SIZE = 12;

/** The scope headings, in the order the table walks them. */
const SCOPE_LABELS: Readonly<Record<KeyBindingScope, string>> = {
    global: "Global",
    canvas: "Canvas",
    panel: "Panel",
    "inspector-notes": "Inspector notes",
    "ai-console": "AI",
    "insights-strip": "Insights strip",
    "time-slider": "Time slider",
    "drop-zone": "Drop zone",
};

/**
 * Props of {@link KeyboardShortcutsOverlay}.
 * @public
 */
export interface KeyboardShortcutsOverlayProps {
    /** Whether the surface is open. */
    readonly opened: boolean;
    /** Closes it. The X and the Escape ladder both land here. */
    readonly onClose: () => void;
}

/**
 * The shipped bindings, grouped by the scope they apply in.
 * @returns one group per scope that has a shipped binding, in `SCOPE_LABELS` order.
 */
function groupedBindings(): readonly { readonly scope: KeyBindingScope; readonly rows: readonly ShellKeyBinding[] }[] {
    const scopes = Object.keys(SCOPE_LABELS) as KeyBindingScope[];

    return scopes
        .map((scope) => ({
            scope,
            rows: SHELL_KEY_BINDINGS.filter(
                (binding) => binding.scope === scope && binding.shipped && binding.chords.length > 0,
            ),
        }))
        .filter((group) => group.rows.length > 0);
}

/**
 * The shortcuts table.
 * @param props - whether it is open, and how it closes.
 * @returns the surface, or null while it is closed.
 */
export function KeyboardShortcutsOverlay(props: KeyboardShortcutsOverlayProps): React.JSX.Element | null {
    const { opened, onClose } = props;
    const groups = useMemo(groupedBindings, []);

    if (!opened) {
        return null;
    }

    return (
        <Box
            data-testid="keyboard-shortcuts"
            aria-label={KEYBOARD_SHORTCUTS_TITLE}
            role="region"
            style={{
                position: "absolute",
                insetBlock: OVERLAY_INSET,
                insetInlineEnd: OVERLAY_INSET,
                zIndex: SHELL_OVERLAY_Z_INDEX,
                width: SHORTCUTS_WIDTH,
                maxWidth: `calc(100% - ${OVERLAY_INSET * 2}px)`,
                display: "flex",
                flexDirection: "column",
                boxSizing: "border-box",
                // The shell's own surfaces are not inside a panel, so the compact type
                // size the panel grid assumes is set here rather than inherited.
                fontSize: COMPACT_SIZING.FONT_SIZE,
                background: PANEL_INK.PANEL,
                border: `1px solid ${PANEL_INK.BORDER}`,
                borderRadius: "var(--mantine-radius-lg)",
                boxShadow: "var(--mantine-shadow-md)",
                overflow: "hidden",
            }}
        >
            <Box
                component="header"
                style={{
                    flex: `0 0 ${PANEL_HEADER_HEIGHT}px`,
                    height: PANEL_HEADER_HEIGHT,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingInlineStart: PANEL_GRID.PAD_LEFT,
                    paddingInlineEnd: PANEL_GRID.PAD_RIGHT,
                    borderBottom: `1px solid ${PANEL_INK.DIVIDER}`,
                    boxSizing: "border-box",
                }}
            >
                <Box component="span" style={{ fontSize: TITLE_FONT_SIZE, fontWeight: 500 }}>
                    {KEYBOARD_SHORTCUTS_TITLE}
                </Box>
                <ActionIcon
                    variant="subtle"
                    color="gray"
                    size={PANEL_GRID.TRAIL}
                    aria-label={KEYBOARD_SHORTCUTS_TITLE}
                    title={KEYBOARD_SHORTCUTS_CLOSE_TITLE}
                    onClick={onClose}
                >
                    <UiGlyph name="close" size={PANEL_GRID.CHEVRON} />
                </ActionIcon>
            </Box>

            <Box
                style={{
                    flex: "1 1 auto",
                    minHeight: 0,
                    overflowY: "auto",
                    paddingBlockEnd: PANEL_GRID.SECTION_PAD_BOTTOM,
                }}
            >
                {groups.map((group) => (
                    <Box key={group.scope}>
                        <Box
                            style={{
                                display: "flex",
                                alignItems: "center",
                                height: PANEL_GRID.SECTION_HEADER,
                                paddingInline: PANEL_GRID.PAD_LEFT,
                                fontSize: GROUP_FONT_SIZE,
                                fontWeight: 500,
                                color: PANEL_INK.CHROME,
                            }}
                        >
                            {SCOPE_LABELS[group.scope]}
                        </Box>
                        {group.rows.map((row) => {
                            const chips = formatChords(row.chords);

                            return (
                                // The row's height is frozen at DATA_PITCH, so one line is
                                // the only legal state (VOCAB's table-cell text rule, and
                                // every row on ShortcutsOverlay.dc.html). `overflow: hidden`
                                // here is the structural guarantee: no cell of any length can
                                // paint outside its own row again, whatever it holds.
                                <Box
                                    key={row.id}
                                    style={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: PANEL_GRID.TRIPLE_GAP,
                                        height: PANEL_GRID.DATA_PITCH,
                                        paddingInline: PANEL_GRID.PAD_LEFT,
                                        overflow: "hidden",
                                    }}
                                >
                                    <Box
                                        component="span"
                                        style={{
                                            flex: `0 0 ${CHORD_COLUMN}px`,
                                            minWidth: 0,
                                            color: PANEL_INK.CHROME,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                        title={chips}
                                    >
                                        {chips}
                                    </Box>
                                    <Box
                                        component="span"
                                        style={{
                                            flex: "1 1 0",
                                            minWidth: 0,
                                            overflow: "hidden",
                                            textOverflow: "ellipsis",
                                            whiteSpace: "nowrap",
                                        }}
                                        title={row.action}
                                    >
                                        {row.action}
                                    </Box>
                                </Box>
                            );
                        })}
                    </Box>
                ))}
            </Box>
        </Box>
    );
}
