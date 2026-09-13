/**
 * The command palette trigger pill (build spec 02 section 2.3c).
 *
 * 300 x 24, the same string on every screen, and NO title: the register gives the
 * search glyph no title "because it sits inside the Cmd K pill and the search input,
 * both of which carry visible text". The pill's own visible text is its accessible
 * name, so it needs no `aria-label` either.
 *
 * The `Cmd+K` chip is one of the two chips spec 04 section 10.3 exempts from the
 * four-places rule, and it still comes from `keyChipFor` rather than a literal.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import { UnstyledButton } from "@mantine/core";
import React from "react";

import { keyChipFor } from "../bindings";
import { TopBarKeyChip } from "./topBarControls";
import {
    PALETTE_PILL_GAP,
    PALETTE_PILL_GLYPH_SIZE,
    PALETTE_PILL_HEIGHT,
    PALETTE_PILL_PADDING_LEFT,
    PALETTE_PILL_PADDING_RIGHT,
    PALETTE_PILL_RADIUS,
    PALETTE_PILL_WIDTH,
    TOP_BAR_FONT_SIZE,
    TOP_BAR_LINE_HEIGHT,
} from "./topBarGeometry";
import { TopBarGlyph } from "./topBarGlyphs";
import { PALETTE_PILL_TEXT } from "./topBarStrings";

/**
 * Props of the command palette trigger pill.
 * @public
 */
export interface CommandPalettePillProps {
    /** Opens the command palette -- the same surface the Mod+K binding opens. */
    readonly onClick: () => void;
}

/**
 * The command palette trigger pill.
 * @param props - the pill's props.
 * @returns the pill.
 */
export function CommandPalettePill(props: CommandPalettePillProps): React.JSX.Element {
    const { onClick } = props;
    const chord = keyChipFor("commandPalette");

    return (
        <UnstyledButton
            type="button"
            onClick={onClick}
            style={{
                display: "flex",
                alignItems: "center",
                flex: "0 0 auto",
                width: PALETTE_PILL_WIDTH,
                height: PALETTE_PILL_HEIGHT,
                gap: PALETTE_PILL_GAP,
                padding: `0 ${PALETTE_PILL_PADDING_RIGHT}px 0 ${PALETTE_PILL_PADDING_LEFT}px`,
                borderRadius: PALETTE_PILL_RADIUS,
                background: PANEL_INK.SURFACE,
                color: PANEL_INK.CHROME,
                boxSizing: "border-box",
            }}
        >
            <span style={{ display: "inline-flex", flex: "0 0 auto", color: PANEL_INK.CHROME }}>
                <TopBarGlyph name="search" size={PALETTE_PILL_GLYPH_SIZE} />
            </span>
            <span
                style={{
                    flex: "1 1 0",
                    minWidth: 0,
                    fontSize: TOP_BAR_FONT_SIZE,
                    lineHeight: TOP_BAR_LINE_HEIGHT,
                    textAlign: "start",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                }}
            >
                {PALETTE_PILL_TEXT}
            </span>
            {chord === null ? null : <TopBarKeyChip chord={chord} />}
        </UnstyledButton>
    );
}
