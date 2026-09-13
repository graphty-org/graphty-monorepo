/**
 * The AI panel's two glyphs, transcribed from the closed register.
 *
 * REGISTER-1.5 section 1.4 fixes the voice verb, and AiPanel.dc.html:539 and :541 draw
 * both of them at 14 px inside the register's 16 px viewBox at stroke 1.5. Neither is
 * published by `@graphty/compact-mantine`'s `UiGlyph`, so their inner SVG is
 * transcribed here, exactly as `rail/railGlyphs.tsx` and `toolbar/toolbarGlyphs.tsx`
 * do for their own regions -- a third-party icon set is a second drawing of a verb the
 * register has already closed.
 *
 * Colour never comes from the SVG: every path is `stroke="currentColor"` and inherits
 * the ink its parent sets from `PANEL_INK` (spec 04 section 1.5).
 */

import { PANEL_GRID } from "@graphty/compact-mantine";
import React, { type ReactNode } from "react";

/**
 * The two verbs the AI panel's console row draws. Named in {@link AiGlyphProps.name} and keyed
 * by {@link AI_GLYPHS}.
 * @public
 */
export type AiGlyphName = "send" | "stopListening";

/** The stroke every register glyph is drawn at. Spec 02 section 8's wrapper. */
const AI_GLYPH_STROKE = 1.5;

/**
 * The inner SVG of each verb, inside the register's 16 x 16 viewBox. The wrapper -- the
 * viewBox, the stroke, the caps and the joins -- is {@link AiGlyph}'s, so no caller
 * re-declares it and no screen draws one of these at its own weight.
 *
 * Exported so the register can be read, and its coverage of {@link AiGlyphName} checked,
 * without redrawing a shape.
 * @public
 */
export const AI_GLYPHS: Readonly<Record<AiGlyphName, ReactNode>> = {
    // REGISTER-1.5 section 1.4, "stop listening (voice)"; AiPanel.dc.html:539.
    stopListening: (
        <>
            <rect x="6" y="2" width="4" height="7" rx="2" />
            <path d="M3.5 7.5a4.5 4.5 0 0 0 9 0" />
            <line x1="8" y1="12" x2="8" y2="14" />
            <line x1="5.5" y1="14" x2="10.5" y2="14" />
        </>
    ),
    // AiPanel.dc.html:541, the blue send button's drawing.
    send: (
        <>
            <path d="M14 2L2 6.5l5.5 2 2 5.5z" />
            <line x1="14" y1="2" x2="7.5" y2="8.5" />
        </>
    ),
};

/**
 * Props of the AI panel's glyph wrapper.
 * @public
 */
export interface AiGlyphProps {
    /** Which verb to draw. */
    readonly name: AiGlyphName;
    /** The drawn size in CSS pixels; the viewBox is always 16. */
    readonly size?: number;
}

/**
 * Draws one of the AI panel's verbs.
 *
 * The glyph is always `aria-hidden`: an icon-only control carries its name on the
 * button, never on the drawing (spec 04 section 8.2).
 * @param props - the glyph's props.
 * @returns the glyph, drawn at the requested size.
 */
export function AiGlyph(props: AiGlyphProps): React.JSX.Element {
    const { name, size = PANEL_GRID.GLYPH } = props;

    return (
        <svg
            width={size}
            height={size}
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth={AI_GLYPH_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
        >
            {AI_GLYPHS[name]}
        </svg>
    );
}
