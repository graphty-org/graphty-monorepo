/**
 * The status bar's chip atom, build spec 02 section 4.1.
 *
 * `height: 16px`, `padding: 0 6px` -- `0 4px 0 6px` when it carries a caret --
 * `border-radius: 8px`, chip fill, 10 px / 500 text at line-height 1. Every chip in
 * the bar is this atom: the XR mode chip, the layout chip, the validation issues
 * chip, the notes chip and the Performance mode chip.
 */

import { PANEL_INK } from "@graphty/compact-mantine";
import React from "react";

import { MenuCaret } from "../MenuCaret";
import { STATUS_BAR_GEOMETRY } from "./statusBarGeometry";

/**
 * Props of the chip atom.
 * @public
 */
export interface StatusBarChipProps {
    /** The chip's label. */
    readonly children: React.ReactNode;
    /** The chip's tooltip, drawn on the body so a caret half can carry its own. */
    readonly title?: string;
    /** A leading mark: a warning dot, an accent dot, the performance bolt. */
    readonly leading?: React.ReactNode;
    /** Whether a plain, non-interactive menu-affordance caret is drawn. */
    readonly caret?: boolean;
    /**
     * A caret that is a control in its own right -- the layout chip's caret half,
     * which opens the layout menu while the body re-runs the layout. It replaces the
     * plain `caret` glyph and takes the same 4 px right padding.
     */
    readonly caretSlot?: React.ReactNode;
    /** What clicking the chip's body does. Without it the body is not a control. */
    readonly onClick?: () => void;
    /**
     * Whether the chip is a state mark on something unbuilt -- the `Coming` pill --
     * which takes the chrome ink rather than the value ink (spec 03 section 1.5).
     */
    readonly muted?: boolean;
}

/** The chip's ground, shared by its interactive and its static form. */
const CHIP_STYLE: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: STATUS_BAR_GEOMETRY.CHIP_GAP,
    flex: "0 0 auto",
    height: STATUS_BAR_GEOMETRY.CHIP_HEIGHT,
    borderRadius: STATUS_BAR_GEOMETRY.CHIP_RADIUS,
    border: "none",
    background: PANEL_INK.RAISED,
    color: PANEL_INK.VALUE,
    fontSize: STATUS_BAR_GEOMETRY.CHIP_FONT_SIZE,
    fontWeight: STATUS_BAR_GEOMETRY.CHIP_FONT_WEIGHT,
    lineHeight: STATUS_BAR_GEOMETRY.CHIP_LINE_HEIGHT,
    boxSizing: "border-box",
};

/**
 * Builds the chip's padding, which loses 2 px on the right for a caret.
 * @param hasCaret - Whether the chip carries a caret.
 * @returns The padding shorthand.
 */
function chipPadding(hasCaret: boolean): string {
    const { CHIP_PADDING_X, CHIP_PADDING_RIGHT_CARET } = STATUS_BAR_GEOMETRY;

    if (hasCaret) {
        return `0 ${String(CHIP_PADDING_RIGHT_CARET)}px 0 ${String(CHIP_PADDING_X)}px`;
    }

    return `0 ${String(CHIP_PADDING_X)}px`;
}

/**
 * The 16 px chip the status bar draws every state mark in.
 *
 * With a caret half the chip becomes two controls in one ground -- the body, which
 * carries the chip's tooltip, and the caret, which carries its own -- so neither
 * click is a guess about which half was meant.
 * @param props - The chip's content, marks, tooltip and click behaviour.
 * @returns The chip.
 */
export function StatusBarChip(props: StatusBarChipProps): React.JSX.Element {
    const { children, title, leading, caret, caretSlot, onClick, muted } = props;
    const hasCaret = caret === true || caretSlot !== undefined;
    const ground: React.CSSProperties =
        muted === true ? { ...CHIP_STYLE, color: PANEL_INK.CHROME } : CHIP_STYLE;
    // REGISTER-1.5 fixes the menu affordance as its own entry -- 8 px at stroke 2,
    // polyline "3,6 8,11 13,6" -- which is a different drawing from `UiGlyph`'s 12 px
    // disclosure chevron. Spec 02 section 4.2 slot 4: "Use the register."
    const plainCaret =
        caretSlot === undefined && caret === true ? <MenuCaret size={STATUS_BAR_GEOMETRY.CARET} /> : null;

    if (!hasCaret) {
        if (onClick === undefined) {
            return (
                <span style={{ ...ground, padding: chipPadding(false) }} title={title}>
                    {leading}
                    {children}
                </span>
            );
        }

        return (
            <button
                onClick={onClick}
                style={{ ...ground, padding: chipPadding(false), cursor: "pointer" }}
                title={title}
                type="button"
            >
                {leading}
                {children}
            </button>
        );
    }

    return (
        <span style={{ ...ground, padding: chipPadding(true) }} title={onClick === undefined ? title : undefined}>
            {onClick === undefined ? (
                <span style={{ display: "inline-flex", alignItems: "center", gap: STATUS_BAR_GEOMETRY.CHIP_GAP }}>
                    {leading}
                    {children}
                </span>
            ) : (
                <button
                    onClick={onClick}
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: STATUS_BAR_GEOMETRY.CHIP_GAP,
                        padding: 0,
                        border: "none",
                        background: "none",
                        color: "inherit",
                        font: "inherit",
                        cursor: "pointer",
                    }}
                    title={title}
                    type="button"
                >
                    {leading}
                    {children}
                </button>
            )}
            {caretSlot ?? plainCaret}
        </span>
    );
}
