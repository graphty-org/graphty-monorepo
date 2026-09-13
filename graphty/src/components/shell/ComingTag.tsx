/**
 * The one 5.8 `Coming` pill, for the whole shell.
 *
 * Spec 5.8 gives an unshipped capability exactly one drawing: the control is drawn at
 * its target shape and carries a muted `Coming` tag, rather than being replaced by a
 * control that silently does nothing. 6.8's "one verb, one drawing" then makes that
 * pill a single drawing, so it is declared once here and imported by every region that
 * needs it -- the activity panel, the inspector and the Views menu each drew their own
 * copy of the same five numbers, which is three places for one pill to drift.
 *
 * An unshipped row carries no key chip anywhere (5.6 section 10.3), which is why
 * nothing here accepts one.
 */

import { PANEL_GRID, PANEL_INK } from "@graphty/compact-mantine";
import { Box } from "@mantine/core";
import React from "react";

/**
 * The 5.8 status word. One word, and the only one: an unshipped control carries this
 * tag and no reading template asserts its output.
 */
export const COMING_LABEL = "Coming";

/**
 * The pill's box: 16 tall (spec 03 section 1.5; VOCAB section 3 "pill (compact)").
 */
export const COMING_TAG_HEIGHT = PANEL_GRID.GLYPH_SLOT;

/** The pill's corner, half its height, so it is fully round. */
export const COMING_TAG_RADIUS = COMING_TAG_HEIGHT / 2;

/**
 * The pill's horizontal padding -- a spec 03 section 1.5 number, named so a reader can
 * check the pill against the artboard even though only the drawing below reads it.
 * @public
 */
export const COMING_TAG_PADDING_X = 6;

/**
 * The pill's type size. A spec 03 section 1.5 number, exported with the pill's other four so
 * the drawing can be checked against the artboard.
 * @public
 */
export const COMING_TAG_FONT_SIZE = 10;

/**
 * The pill's type weight. A spec 03 section 1.5 number, exported with the pill's other four so
 * the drawing can be checked against the artboard.
 * @public
 */
export const COMING_TAG_FONT_WEIGHT = 500;

/**
 * Props of the `Coming` pill.
 * @public
 */
export interface ComingTagProps {
    /**
     * What is not built yet, for the pill's title -- "Find a pattern is not built
     * yet". Without it the pill names itself alone, which is enough on a row whose own
     * label is read immediately before it.
     */
    readonly subject?: string;
}

/**
 * The muted `Coming` pill: 16 px tall, fully round, 10 px at weight 500.
 *
 * It reports a status rather than acting, so it is resident (Rule 7b) and it is never
 * the only signal -- the row it sits on is disabled as well.
 * @param props - the pill's props.
 * @returns the pill.
 */
export function ComingTag(props: ComingTagProps = {}): React.JSX.Element {
    const { subject } = props;
    const name = subject === undefined ? COMING_LABEL : `${subject} is not built yet`;

    return (
        <Box
            component="span"
            // No role and no aria-label: the word itself is the status, and a live
            // region here would announce a tag that never changes. The subject rides
            // in the title for a pointer, and the row it sits on is disabled as well,
            // so nothing about the state depends on the pill alone.
            title={name}
            data-testid="coming-tag"
            style={{
                flex: "0 0 auto",
                display: "inline-flex",
                alignItems: "center",
                height: COMING_TAG_HEIGHT,
                paddingInline: COMING_TAG_PADDING_X,
                borderRadius: COMING_TAG_RADIUS,
                background: PANEL_INK.RAISED,
                color: PANEL_INK.CHROME,
                fontSize: COMING_TAG_FONT_SIZE,
                fontWeight: COMING_TAG_FONT_WEIGHT,
                lineHeight: 1,
                boxSizing: "border-box",
                whiteSpace: "nowrap",
            }}
        >
            {COMING_LABEL}
        </Box>
    );
}
