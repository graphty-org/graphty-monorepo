/**
 * One icon-only item of the canvas toolbar, and the key chip its tooltip prints.
 *
 * Every item here is icon-only, so 6.8's four obligations are not optional (build
 * spec 04 section 8.2):
 *
 * 1. an `aria-label` equal to the tooltip text with the key chip removed, over an
 *    `aria-hidden` glyph;
 * 2. a tooltip -- the verb, then the chip after a 6 px gap -- opening after
 *    `TOOLTIP_DELAY_MS` and UPWARD, because the bar sits on the canvas floor
 *    (SPEC:3517);
 * 3. a hit area of 28 x 28 with a 14 px glyph at or above 1280 px, growing to
 *    32 x 32 with a 16 px glyph below it, which is 6.8 point 3's larger form for an
 *    icon that is the SOLE PATH to a capability rather than a size invented here;
 * 4. a full-text twin, which is the command palette (Cmd+K) -- the bar's verbs are
 *    palette rows, so no item is reachable by pointer alone.
 *
 * A disabled item is drawn, not removed: the item set is fixed (SPEC:3511-3517),
 * because a centred container that changes width moves every item under the pointer.
 * It states its reason in its tooltip (floor item 4), which is why it carries
 * `aria-disabled` and Mantine's `data-disabled` rather than the `disabled` attribute
 * -- a natively disabled button fires no pointer events, so its reason could never be
 * read.
 */

import { COMPACT_SIZING, PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { ActionIcon, Tooltip } from "@mantine/core";
import React from "react";

import { type CanvasToolbarProfile, TOOLTIP_DELAY_MS } from "../constants";
import { toolbarItemSentence, TOOLTIP_KEY_CHIP_GAP } from "./toolbarMetrics";

/** Chip height. VOCAB section 4 "Keyboard chip". */
const KEY_CHIP_HEIGHT = PANEL_GRID.GLYPH_SLOT;

/** Chip padding, per side. VOCAB section 4 "Keyboard chip". */
const KEY_CHIP_PADDING_X = COMPACT_SIZING.SECTION_GAP;

/** Chip corner radius. VOCAB section 4 "Keyboard chip". */
const KEY_CHIP_RADIUS = 3;

/**
 * Props of {@link ToolbarKeyChip}.
 * @public
 */
export interface ToolbarKeyChipProps {
    /** The chip text, always from `keyChipFor` so one table spells every binding. */
    readonly children: string;
}

/**
 * A binding, drawn as the bordered mono chip.
 *
 * A binding may appear in exactly four places (build spec 04 section 10.3) and this
 * chip serves two of them: the last element of a control's tooltip after a 6 px gap,
 * and the trailing column of a menu row. It is never drawn inside a button.
 *
 * It is `aria-hidden`: the chip is the binding's DRAWING, and the control it belongs
 * to carries the same fact as `aria-keyshortcuts`, so a reader who cannot see it is
 * told the shortcut once rather than having it spelled into the control's name.
 * @param props - the chip's text.
 * @returns the chip.
 */
export function ToolbarKeyChip(props: ToolbarKeyChipProps): React.JSX.Element {
    const { children } = props;

    return (
        <span
            aria-hidden="true"
            style={{
                display: "inline-flex",
                alignItems: "center",
                flex: "0 0 auto",
                height: KEY_CHIP_HEIGHT,
                padding: `0 ${KEY_CHIP_PADDING_X}px`,
                borderRadius: KEY_CHIP_RADIUS,
                background: PANEL_INK.SURFACE,
                border: `1px solid ${PANEL_INK.BORDER}`,
                color: PANEL_INK.CHROME,
                fontFamily: "var(--mantine-font-family-monospace)",
                fontSize: COMPACT_SIZING.FONT_SIZE,
                lineHeight: 1,
                boxSizing: "border-box",
            }}
        >
            {children}
        </span>
    );
}

/**
 * Props of {@link ToolbarItem}.
 * @public
 */
export interface ToolbarItemProps {
    /**
     * The register's title, character for character, chip and all:
     * "Zoom out (-)", "Zoom to selection (F). Select something first".
     */
    readonly title: string;
    /** The chip inside that title, from `keyChipFor`, or null where there is none. */
    readonly keyChip: string | null;
    /** The drawing, already sized for the profile. */
    readonly glyph: React.ReactNode;
    /** Whether the item is drawn inoperable. It is never removed. */
    readonly disabled?: boolean;
    /** The size profile in force. */
    readonly profile: CanvasToolbarProfile;
    /** What the item does. */
    readonly onClick: () => void;
}

/**
 * One icon-only toolbar item.
 * @param props - the item's title, chip, drawing, state, profile and action.
 * @returns the item button inside its tooltip.
 */
export function ToolbarItem(props: ToolbarItemProps): React.JSX.Element {
    const { title, keyChip, glyph, disabled = false, profile, onClick } = props;
    const sentence = toolbarItemSentence(title, keyChip);

    return (
        <Tooltip
            label={
                <span style={{ display: "inline-flex", alignItems: "center", gap: TOOLTIP_KEY_CHIP_GAP }}>
                    <span>{sentence}</span>
                    {keyChip === null ? null : <ToolbarKeyChip>{keyChip}</ToolbarKeyChip>}
                </span>
            }
            openDelay={TOOLTIP_DELAY_MS}
            position="top"
            events={{ hover: true, focus: true, touch: true }}
        >
            <ActionIcon
                variant="subtle"
                color="gray"
                radius={profile.itemRadius}
                aria-label={sentence}
                aria-disabled={disabled}
                aria-keyshortcuts={keyChip ?? undefined}
                data-disabled={disabled || undefined}
                onClick={() => {
                    if (!disabled) {
                        onClick();
                    }
                }}
                __vars={{
                    "--ai-color": PANEL_INK.CHROME,
                    "--ai-hover-color": PANEL_INK.VALUE,
                    "--ai-bg": "transparent",
                }}
                style={{
                    width: profile.itemSize,
                    height: profile.itemSize,
                    minWidth: profile.itemSize,
                    minHeight: profile.itemSize,
                    flex: "0 0 auto",
                    // The library's own disabled ink paints through `data-disabled`;
                    // only its disabled GROUND is refused, because a filled box on a
                    // canvas overlay reads as a control that is still there to press.
                    background: "transparent",
                    cursor: disabled ? "default" : "pointer",
                }}
            >
                {glyph}
            </ActionIcon>
        </Tooltip>
    );
}
