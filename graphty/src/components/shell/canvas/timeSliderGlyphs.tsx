/**
 * The time slider's four transport glyphs.
 *
 * The `@graphty/compact-mantine` glyph register is CLOSED (spec 04 section 1.5) and
 * holds no transport verbs, so these four are copied verbatim from the artboard that
 * draws them (ART-TS:1363-1366) rather than invented here or approximated with a
 * register glyph that means something else. They obey the register's own drawing
 * rules: a 16 x 16 viewBox, `fill="none"`, `stroke="currentColor"`, stroke width 1.5,
 * round caps and joins, and NO colour of their own -- the ink is inherited.
 *
 * Adding one of these verbs to the register proper means editing the vocabulary
 * document and the package, never drawing a second one in a second screen (6.8, "One
 * verb, one drawing"). This module is the one drawing.
 */

import { PANEL_GRID } from "@graphty/compact-mantine";
import React from "react";

import { CANVAS_METRICS } from "./canvasLayout";

/**
 * The four transport verbs the time slider's first row carries. Named in
 * {@link TimeSliderGlyphProps.name}, so a caller can say which verb it wants.
 * @public
 */
export type TimeSliderGlyphName = "pause" | "play" | "stepBack" | "stepForward";

const SHAPES: Readonly<Record<TimeSliderGlyphName, React.ReactNode>> = {
    stepBack: (
        <>
            <line x1="4" y1="3.5" x2="4" y2="12.5" />
            <polygon points="12,3.5 6,8 12,12.5" />
        </>
    ),
    play: <polygon points="5,3 13,8 5,13" />,
    pause: (
        <>
            <line x1="5.5" y1="3.5" x2="5.5" y2="12.5" />
            <line x1="10.5" y1="3.5" x2="10.5" y2="12.5" />
        </>
    ),
    stepForward: (
        <>
            <polygon points="4,3.5 10,8 4,12.5" />
            <line x1="12" y1="3.5" x2="12" y2="12.5" />
        </>
    ),
};

/**
 * Props of a transport glyph.
 * @public
 */
export interface TimeSliderGlyphProps {
    /** Which transport verb to draw. */
    readonly name: TimeSliderGlyphName;
    /** The drawn size. Defaults to the register's own 14 px. */
    readonly size?: number;
}

/**
 * Draws one transport glyph, in the ink it inherits.
 * @param props - the verb and the drawn size.
 * @returns the glyph element.
 */
export function TimeSliderGlyph(props: TimeSliderGlyphProps): React.JSX.Element {
    const { name, size = PANEL_GRID.GLYPH } = props;

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${String(CANVAS_METRICS.GLYPH_VIEWBOX)} ${String(CANVAS_METRICS.GLYPH_VIEWBOX)}`}
            fill="none"
            stroke="currentColor"
            strokeWidth={CANVAS_METRICS.GLYPH_STROKE}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
            focusable="false"
            data-glyph={name}
            style={{ flex: "0 0 auto", display: "block" }}
        >
            {SHAPES[name]}
        </svg>
    );
}
