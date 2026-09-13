/**
 * The menu-affordance caret, for the whole shell.
 *
 * REGISTER-1.5 section 1.1 holds TWO caret entries, and they are different drawings:
 *
 * - `caret, disclosure (12px)`: open `<polyline points="4,6 8,10 12,6">`. That is the
 *   one `UiGlyph name="chevronDown"` publishes, at the library's 1.5 stroke.
 * - `caret, menu affordance (8px, stroke-width="2")`:
 *   `<polyline points="3,6 8,11 13,6">`.
 *
 * The second is the one a menu trigger draws, and it exists because 1.5 in a 16 px
 * viewBox drawn at 8 px resolves to three quarters of a pixel (spec 02 section 8:
 * "`8` for the menu-affordance caret. Never any other size"). Drawing the disclosure
 * polyline at 8 px instead -- which is what `UiGlyph name="chevronDown" size={8}` does
 * -- is the wrong shape at the wrong weight, at the one size the register added the
 * heavier stroke to protect. So the register's own drawing lives here, once, and every
 * menu trigger in the shell uses it: the top bar's Export, the status bar chip, the
 * layout chip and the canvas toolbar's Views button.
 *
 * Colour never comes from the SVG: the path is `stroke="currentColor"` and inherits
 * the ink its parent sets from `PANEL_INK` (spec 04 section 1.5).
 */

import React from "react";

import { MENU_CARET_SIZE, MENU_CARET_STROKE } from "./constants";

/**
 * Props of the menu-affordance caret.
 * @public
 */
export interface MenuCaretProps {
    /**
     * The drawn size in CSS pixels. It defaults to the register's 8 and is not an
     * invitation to another size: it is here only so a caller can name the constant it
     * already holds.
     */
    readonly size?: number;
}

/**
 * Draws the register's 8 px menu-affordance caret.
 *
 * The glyph is always `aria-hidden`: it trails a trigger that carries its own text or
 * its own accessible name (spec 04 section 8.2).
 * @param props - the caret's props.
 * @returns the caret.
 */
export function MenuCaret(props: MenuCaretProps = {}): React.JSX.Element {
    const { size = MENU_CARET_SIZE } = props;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={MENU_CARET_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            data-testid="menu-caret"
        >
            <polyline points="3,6 8,11 13,6" />
        </svg>
    );
}
