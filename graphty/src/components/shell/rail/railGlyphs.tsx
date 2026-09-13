/**
 * The activity rail's eight glyphs.
 *
 * The glyph register is closed (6.8, "One verb, one drawing"), and it holds no
 * activity verbs: `UI_GLYPH_NAMES` has no Data, Explore, Analyze, Style, Present, AI
 * or Help drawing. Those seven are therefore inline SVG copied verbatim from build
 * spec 02 sections 1.2 and 1.3, which prints the inner shapes the artboards draw.
 * Settings is the one rail verb the register does hold, so it is drawn through
 * `UiGlyph name="gear"` rather than copied -- a register glyph is used wherever one
 * fits.
 *
 * Every drawing takes the register's rail wrapper: a 16 x 16 box over a 16 unit
 * viewBox, `fill="none"`, `stroke="currentColor"`, stroke width 1.5, round caps and
 * joins. Rail items are the ONLY 16 px drawing in the register (REGISTER 1.5
 * section 1); everything else is 14, 12 or 8.
 *
 * Authority split (CONTRAST-DIVERGENCE section 5): colour never comes from the SVG.
 * `currentColor` inherits the rail item's ink, which the item sets from `PANEL_INK`.
 */

import { PANEL_GRID, UiGlyph } from "@graphty/compact-mantine";
import React, { type ReactNode } from "react";

import type { ActivityId } from "../types";

/**
 * The register's glyph attributes, shared by every inline rail drawing. Identical to
 * compact-mantine's own `SVG_ATTRIBUTES`, so an inline rail glyph and a `UiGlyph`
 * standing beside it are the same drawing weight.
 */
const RAIL_GLYPH_ATTRIBUTES = {
    viewBox: "0 0 16 16",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round",
    strokeLinejoin: "round",
} as const;

/**
 * Wraps one rail drawing in the register's 16 px rail wrapper.
 *
 * The glyph is `aria-hidden` and not focusable: the rail item that holds it carries
 * the accessible name (6.8 item 1).
 * @param shapes - the drawing's inner shapes, verbatim from build spec 02.
 * @returns the wrapped 16 px glyph.
 */
function railGlyph(shapes: ReactNode): React.JSX.Element {
    return (
        <svg
            width={PANEL_GRID.GLYPH_SLOT}
            height={PANEL_GRID.GLYPH_SLOT}
            {...RAIL_GLYPH_ATTRIBUTES}
            aria-hidden="true"
            focusable="false"
            style={{ display: "block", flex: "0 0 auto" }}
        >
            {shapes}
        </svg>
    );
}

/**
 * One 16 px glyph per rail destination, in the rail's own order.
 *
 * Data, Explore, Analyze, Style, Present and AI are build spec 02 section 1.2;
 * Settings and Help are section 1.3.
 */
export const RAIL_GLYPHS: Readonly<Record<ActivityId, ReactNode>> = {
    data: railGlyph(
        <>
            <ellipse cx="8" cy="4" rx="5.5" ry="2" />
            <path d="M2.5 4v8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2V4" />
            <path d="M2.5 8c0 1.1 2.5 2 5.5 2s5.5-.9 5.5-2" />
        </>,
    ),
    explore: railGlyph(
        <>
            <circle cx="8" cy="8" r="6.5" />
            <polygon points="10.5,5.5 9,9 5.5,10.5 7,7" />
        </>,
    ),
    analyze: railGlyph(
        <>
            <line x1="3" y1="13.5" x2="3" y2="8" />
            <line x1="8" y1="13.5" x2="8" y2="2.5" />
            <line x1="13" y1="13.5" x2="13" y2="6" />
        </>,
    ),
    style: railGlyph(
        <>
            <path d="M13.5 2.5l-6 6" />
            <path d="M7.5 8.5c-1.5 0-2.5 1-2.5 2.5s-1 2-2.5 2c1.5 1 4.5 1 5.5-1 .5-1 .5-2-.5-3.5z" />
        </>,
    ),
    present: railGlyph(
        <>
            <rect x="2" y="3" width="12" height="8" rx="1" />
            <line x1="8" y1="11" x2="8" y2="14" />
            <line x1="5.5" y1="14" x2="10.5" y2="14" />
        </>,
    ),
    ai: railGlyph(
        <>
            <path d="M7 3l1.3 3.7L12 8l-3.7 1.3L7 13l-1.3-3.7L2 8l3.7-1.3z" />
            <path d="M13 2v2.5M11.75 3.25h2.5" />
        </>,
    ),
    settings: <UiGlyph name="gear" size={PANEL_GRID.GLYPH_SLOT} />,
    help: railGlyph(
        <>
            <circle cx="8" cy="8" r="6.5" />
            <path d="M6 6.3a2 2 0 0 1 3.9.5c0 1.3-1.9 1.6-1.9 2.7" />
            <line x1="8" y1="11.75" x2="8" y2="12.25" />
        </>,
    ),
};
