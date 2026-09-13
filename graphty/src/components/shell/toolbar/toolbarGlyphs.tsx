/**
 * The canvas toolbar's own drawings.
 *
 * The shared register in `@graphty/compact-mantine` (`UiGlyph`) is CLOSED: it holds
 * the chevrons, the doors and the status marks a panel row draws, and nothing else
 * (build spec 04 section 1.5). The toolbar's verbs -- zoom out, zoom in, zoom to fit,
 * zoom to selection -- and the Views menu's view presets are not in it, so they are
 * copied here verbatim from the artboards, exactly as the activity rail copies its
 * six activity glyphs.
 *
 * Every drawing keeps the register's own drawing contract: a 16x16 viewBox, no fill,
 * `currentColor` stroke at 1.5, round caps and joins. Colour never comes from the
 * SVG -- it is inherited from the control that holds it, which is what lets one
 * drawing read correctly at rest, on hover and disabled.
 *
 * Sources: ART-TB (design/ui/mockups/artboards/CanvasToolbar.dc.html, the two size
 * plates) for the five bar glyphs; ART-VM
 * (design/ui/mockups/artboards/ViewsMenu.dc.html, the open menu) for the view
 * presets, the bookmark and the two XR glyphs. Reset view is NOT here: its drawing is
 * the register's own `refresh`, and the register wins wherever it has the verb.
 */

import React from "react";

/**
 * The drawings this region owns. `cube` is one drawing with two homes -- the Views
 * trigger and the Views menu's Isometric row -- which is 6.8's "one verb, one
 * drawing" rather than two near-identical cubes.
 *
 * Named in {@link ToolbarGlyphProps.name} and keyed by {@link TOOLBAR_GLYPHS}.
 * @public
 */
export type ToolbarGlyphName =
    | "cube"
    | "enterAr"
    | "enterVr"
    | "saveView"
    | "viewFront"
    | "viewSide"
    | "viewTop"
    | "zoomIn"
    | "zoomOut"
    | "zoomToFit"
    | "zoomToSelection";

const SVG_ATTRIBUTES = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
} as const;

const ZOOM_TO_FIT_CORNERS = (
    <>
        <path d="M2.5 6V2.5H6" />
        <path d="M10 2.5h3.5V6" />
        <path d="M13.5 10v3.5H10" />
        <path d="M6 13.5H2.5V10" />
    </>
);

const VIEW_PRESET_FRAME = <rect x="2.5" y="2.5" width="11" height="11" rx="1.5" />;

/**
 * The shapes, by name. Each entry is the inside of an `<svg>`; {@link ToolbarGlyph}
 * supplies the element and its size.
 *
 * Exported so the register can be read, and its coverage of {@link ToolbarGlyphName} checked,
 * without redrawing a shape.
 * @public
 */
export const TOOLBAR_GLYPHS: Readonly<Record<ToolbarGlyphName, React.JSX.Element>> = {
    zoomOut: (
        <>
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
            <line x1="5" y1="7" x2="9" y2="7" />
        </>
    ),
    zoomIn: (
        <>
            <circle cx="7" cy="7" r="4.5" />
            <line x1="10.5" y1="10.5" x2="14" y2="14" />
            <line x1="7" y1="5" x2="7" y2="9" />
            <line x1="5" y1="7" x2="9" y2="7" />
        </>
    ),
    zoomToFit: ZOOM_TO_FIT_CORNERS,
    zoomToSelection: (
        <>
            {ZOOM_TO_FIT_CORNERS}
            <circle cx="8" cy="8" r="2" />
        </>
    ),
    cube: (
        <>
            <path d="M8 2l5.5 3v6L8 14l-5.5-3V5z" />
            <path d="M8 8l5.5-3M8 8v6M8 8L2.5 5" />
        </>
    ),
    viewTop: (
        <>
            {VIEW_PRESET_FRAME}
            <line x1="2.5" y1="6" x2="13.5" y2="6" />
        </>
    ),
    viewFront: (
        <>
            {VIEW_PRESET_FRAME}
            <line x1="2.5" y1="10" x2="13.5" y2="10" />
        </>
    ),
    viewSide: (
        <>
            {VIEW_PRESET_FRAME}
            <line x1="10" y1="2.5" x2="10" y2="13.5" />
        </>
    ),
    saveView: <path d="M4 2.5h8a1 1 0 0 1 1 1v10l-5-3-5 3v-10a1 1 0 0 1 1-1z" />,
    enterVr: (
        <>
            <path d="M2.5 5.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5h-2l-1.2-1.6h-1.6L6 11H4a1.5 1.5 0 0 1-1.5-1.5z" />
            <circle cx="5.75" cy="7.5" r="0.75" />
            <circle cx="10.25" cy="7.5" r="0.75" />
        </>
    ),
    enterAr: (
        <>
            <path d="M2.5 5.5v-2a1 1 0 0 1 1-1h2M10.5 2.5h2a1 1 0 0 1 1 1v2M13.5 10.5v2a1 1 0 0 1-1 1h-2M5.5 13.5h-2a1 1 0 0 1-1-1v-2" />
            <path d="M8 5l2.5 1.4v2.8L8 10.6 5.5 9.2V6.4z" />
        </>
    ),
};

/**
 * Props of {@link ToolbarGlyph}.
 * @public
 */
export interface ToolbarGlyphProps {
    /** Which drawing to make. */
    readonly name: ToolbarGlyphName;
    /** Drawn size in CSS pixels: 14 on the desktop bar, 16 below 1280 px. */
    readonly size: number;
}

/**
 * One toolbar drawing, at the size its profile asks for.
 *
 * Decorative to assistive technology: the control that holds it carries the tooltip
 * and the accessible name (6.8, and build spec 04 section 8.2 point 1).
 * @param props - which drawing to make and how big.
 * @returns the glyph SVG.
 */
export function ToolbarGlyph(props: ToolbarGlyphProps): React.JSX.Element {
    const { name, size } = props;

    return (
        <svg
            width={size}
            height={size}
            {...SVG_ATTRIBUTES}
            aria-hidden="true"
            focusable="false"
            data-glyph={name}
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {TOOLBAR_GLYPHS[name]}
        </svg>
    );
}
