/**
 * The command palette: the full-text twin of every icon-only control in the shell.
 *
 * Build spec 04 section 6.8 item 4 requires an icon-only control to have a full-text
 * path as well, and the rail's eight icons, the canvas toolbar's items and every Help
 * row are exactly that case. It is also the ONLY way back to a hidden canvas toolbar
 * (spec 01 section 4), which is why the row `Show canvas toolbar` exists here and
 * nowhere else.
 *
 * It is a tier 3b dialog: a scrim, a focus trap and one commit point. The shell passes
 * `modalOpen` to the key dispatcher while it is open, so 5.6's preconditions suppress
 * every other binding, and Escape closes it through the ladder's second rung.
 *
 * The rows themselves are the shell's, not this component's: AppShell owns what each
 * one does and hands them over already built, in the order they should read.
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box, Modal, TextInput, UnstyledButton } from "@mantine/core";
import React, { useMemo, useState } from "react";

import { keyChipFor } from "./bindings";

/**
 * The palette's name, which is also its accessible name. The one home for the word, so anything
 * asserting the palette's name quotes it rather than retyping it.
 * @public
 */
export const COMMAND_PALETTE_LABEL = "Command palette";

/**
 * What the field invites, the same words the top bar's trigger pill prints. The one home for
 * the sentence, so anything asserting the field quotes it rather than retyping it.
 * @public
 */
export const COMMAND_PALETTE_PLACEHOLDER = "Search commands, nodes and edges";

/** What the list says when the query matches nothing. */
export const COMMAND_PALETTE_EMPTY = "No matching commands";

/**
 * The dialog's width: the top rung of 6.11's 280 / 360 / 480 width ladder, which is
 * the widest surface the design system admits.
 */
const PALETTE_WIDTH = 480;

/** The scrolling list's height cap: ten rows of the 28 px data pitch. */
const PALETTE_LIST_MAX_HEIGHT = PANEL_GRID.DATA_PITCH * 10;

/** The key chip's own type size, as the top bar draws it. */
const CHIP_FONT_SIZE = 11;

/**
 * One row of the palette.
 */
export interface CommandPaletteItem {
    /** Stable id, unique within the list. */
    readonly id: string;
    /** The row's full text -- the words, never a glyph. */
    readonly label: string;
    /** The group the row belongs to, e.g. "Go to", "View", "Help". */
    readonly group: string;
    /**
     * The action id whose chip the row prints, when the action has one. The chip comes
     * from `keyChipFor`, so an unshipped action prints none.
     */
    readonly chipFor?: Parameters<typeof keyChipFor>[0];
    /** Runs the row. The palette closes itself first: one commit point. */
    readonly onSelect: () => void;
}

/**
 * Props of {@link CommandPalette}.
 * @public
 */
export interface CommandPaletteProps {
    /** Whether the palette is open. */
    readonly opened: boolean;
    /** Closes it: Escape, the scrim, or a row that has been taken. */
    readonly onClose: () => void;
    /** Every command the shell offers, in reading order. */
    readonly items: readonly CommandPaletteItem[];
}

/**
 * Whether a row matches what has been typed. Every word of the query must appear
 * somewhere in the row's group or label, so "show tool" finds "Show canvas toolbar".
 * @param item - the row to test.
 * @param query - what has been typed.
 * @returns true when the row should be drawn.
 */
function matches(item: CommandPaletteItem, query: string): boolean {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);

    if (words.length === 0) {
        return true;
    }

    const haystack = `${item.group} ${item.label}`.toLowerCase();

    return words.every((word) => haystack.includes(word));
}

/**
 * The command palette.
 * @param props - whether it is open, how it closes, and the rows it offers.
 * @returns the dialog.
 */
export function CommandPalette(props: CommandPaletteProps): React.JSX.Element {
    const { opened, onClose, items } = props;
    const [query, setQuery] = useState("");

    const visible = useMemo(() => items.filter((item) => matches(item, query)), [items, query]);

    const take = (item: CommandPaletteItem): void => {
        onClose();
        setQuery("");
        item.onSelect();
    };

    return (
        <Modal
            opened={opened}
            onClose={onClose}
            title={COMMAND_PALETTE_LABEL}
            size={PALETTE_WIDTH}
            padding={PANEL_GRID.PAD_RIGHT}
            data-testid="command-palette"
        >
            <TextInput
                size="compact"
                autoFocus
                value={query}
                placeholder={COMMAND_PALETTE_PLACEHOLDER}
                aria-label={COMMAND_PALETTE_PLACEHOLDER}
                onChange={(event) => {
                    setQuery(event.currentTarget.value);
                }}
            />

            <Box
                role="listbox"
                aria-label={COMMAND_PALETTE_LABEL}
                style={{
                    marginBlockStart: PANEL_GRID.TRAIL_GAP,
                    maxHeight: PALETTE_LIST_MAX_HEIGHT,
                    overflowY: "auto",
                    // The dialog is not inside a panel, so the compact type size the
                    // panel grid assumes is set here rather than inherited.
                    fontSize: COMPACT_SIZING.FONT_SIZE,
                }}
            >
                {visible.length === 0 ? (
                    <Box style={{ height: PANEL_GRID.DATA_PITCH, display: "flex", alignItems: "center", color: PANEL_INK.CHROME }}>
                        {COMMAND_PALETTE_EMPTY}
                    </Box>
                ) : (
                    visible.map((item) => {
                        const chip = item.chipFor === undefined ? null : keyChipFor(item.chipFor);

                        return (
                            <UnstyledButton
                                key={item.id}
                                role="option"
                                aria-selected={false}
                                onClick={() => {
                                    take(item);
                                }}
                                style={{
                                    width: "100%",
                                    display: "flex",
                                    alignItems: "center",
                                    gap: PANEL_GRID.TRAIL_GAP,
                                    height: PANEL_GRID.DATA_PITCH,
                                    paddingInline: PANEL_GRID.TRAIL_GAP,
                                    borderRadius: "var(--mantine-radius-xs)",
                                }}
                            >
                                <Box component="span" style={{ flex: "0 0 auto", color: PANEL_INK.CHROME }}>
                                    {item.group}
                                </Box>
                                <Box
                                    component="span"
                                    style={{
                                        flex: "1 1 0",
                                        minWidth: 0,
                                        overflow: "hidden",
                                        textOverflow: "ellipsis",
                                        whiteSpace: "nowrap",
                                        textAlign: "start",
                                    }}
                                >
                                    {item.label}
                                </Box>
                                {chip === null ? null : (
                                    <Box
                                        component="span"
                                        style={{
                                            flex: "0 0 auto",
                                            fontSize: CHIP_FONT_SIZE,
                                            color: PANEL_INK.CHROME,
                                        }}
                                    >
                                        {chip}
                                    </Box>
                                )}
                            </UnstyledButton>
                        );
                    })
                )}
            </Box>
        </Modal>
    );
}
