/**
 * The top bar's glyphs, copied verbatim from build spec 02
 * (tmp/shell-spec/02-bars-and-rail.md) sections 2.3, 2.4 and 8.
 *
 * The register (design/ui/mockups/system/REGISTER-1.5.md) is closed: one verb, one
 * drawing. `@graphty/compact-mantine`'s `UiGlyph` publishes the register's UI glyphs,
 * but none of the nine verbs this bar draws -- undo, redo, search, export, share,
 * compare, toggle inspector, toggle panel, and the menu-affordance caret -- is among
 * them, so their inner SVG is transcribed here and nowhere else in the app.
 *
 * Colour never comes from the SVG: every path is `stroke="currentColor"` and inherits
 * the ink its parent sets from `PANEL_INK` (spec 04 section 1.5).
 */

import React, { type ReactNode } from "react";

import { TOP_BAR_GLYPH_SIZE, TOP_BAR_GLYPH_STROKE } from "./topBarGeometry";

/**
 * Every verb the top bar draws.
 */
export type TopBarGlyphName =
    | "compare"
    | "export"
    | "redo"
    | "search"
    | "share"
    | "splitCaret"
    | "toggleInspector"
    | "togglePanel"
    | "undo";

/**
 * The inner SVG of each verb, inside the register's 16 x 16 viewBox. The wrapper --
 * the viewBox, the stroke, the caps and the joins -- is {@link TopBarGlyph}'s, so a
 * caller never re-declares it and no screen can draw one of these at its own weight.
 *
 * Exported so the register can be read, and its coverage of the glyph names checked, without
 * redrawing a shape.
 * @public
 */
export const TOP_BAR_GLYPHS: Readonly<Record<TopBarGlyphName, ReactNode>> = {
    undo: (
        <>
            <path d="M4 6h6.5a3 3 0 0 1 0 6H7" />
            <polyline points="6.5,3.5 4,6 6.5,8.5" />
        </>
    ),
    redo: (
        <>
            <path d="M12 6H5.5a3 3 0 0 0 0 6H9" />
            <polyline points="9.5,3.5 12,6 9.5,8.5" />
        </>
    ),
    splitCaret: <polyline points="4,6 8,10 12,6" />,
    search: (
        <>
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
        </>
    ),
    export: (
        <>
            <path d="M8 2v8" />
            <polyline points="5,7.5 8,10.5 11,7.5" />
            <path d="M2.5 12.5v1a1 1 0 0 0 1 1h9a1 1 0 0 0 1-1v-1" />
        </>
    ),
    share: (
        <>
            <circle cx="12" cy="3.5" r="1.75" />
            <circle cx="4" cy="8" r="1.75" />
            <circle cx="12" cy="12.5" r="1.75" />
            <line x1="5.6" y1="7.1" x2="10.4" y2="4.4" />
            <line x1="5.6" y1="8.9" x2="10.4" y2="11.6" />
        </>
    ),
    compare: (
        <>
            <rect x="2" y="2.5" width="5.5" height="11" rx="1.5" />
            <rect x="8.5" y="2.5" width="5.5" height="11" rx="1.5" />
        </>
    ),
    toggleInspector: (
        <>
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
            <line x1="10" y1="2.5" x2="10" y2="13.5" />
        </>
    ),
    /*
     * The exact mirror of `toggleInspector`: the same frame with its divider on the LEFT
     * edge, because the two switches say the same thing about opposite sides of the
     * canvas and a reader tells them apart by which side the column is drawn on.
     * Added 2026-09-12 with the panel switch itself, at the product owner's direction
     * ("the right panel has an open / close button, but the left doesn't").
     */
    togglePanel: (
        <>
            <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
            <line x1="6" y1="2.5" x2="6" y2="13.5" />
        </>
    ),
};

/**
 * Props of the top bar's glyph wrapper.
 * @public
 */
export interface TopBarGlyphProps {
    /** Which verb to draw. */
    readonly name: TopBarGlyphName;
    /** The drawn size in CSS pixels; the viewBox is always 16. */
    readonly size?: number;
}

/**
 * Draws one of the top bar's verbs at a given size.
 *
 * The glyph is always `aria-hidden`: an icon-only control carries its name on the
 * button, never on the drawing (spec 04 section 8.2). Every verb here is drawn at the
 * register's 1.5 stroke; the heavier 8 px menu-affordance caret is `MenuCaret`.
 * @param props - the glyph's props.
 * @returns the glyph, drawn at the requested size.
 */
export function TopBarGlyph(props: TopBarGlyphProps): React.JSX.Element {
    const { name, size = TOP_BAR_GLYPH_SIZE } = props;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={TOP_BAR_GLYPH_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {TOP_BAR_GLYPHS[name]}
        </svg>
    );
}
