/**
 * The one 5.8 `Coming` pill, for the whole shell.
 *
 * Spec 5.8 gives an unshipped capability exactly one drawing: the control is drawn at
 * its target shape and carries a `Coming` tag, rather than being replaced by a control
 * that silently does nothing. 6.8's "one verb, one drawing" then makes that pill a
 * single drawing, so it is declared once here and imported by every region that needs
 * it -- the activity panel, the inspector and the Views menu.
 *
 * The drawing is compact-mantine's Badge at its defaults (16 tall, outlined), so the tag
 * takes the library's text ink and meets WCAG 1.4.3 in every scheme the theme draws.
 *
 * An unshipped row carries no key chip anywhere (5.6 section 10.3), which is why
 * nothing here accepts one.
 */

import { Badge } from "@mantine/core";
import React from "react";

/**
 * The 5.8 status word. One word, and the only one: an unshipped control carries this
 * tag and no reading template asserts its output.
 */
export const COMING_LABEL = "Coming";

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
 * The `Coming` pill: compact-mantine's default Badge carrying the status word.
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
        <Badge
            component="span"
            // No role and no aria-label: the word itself is the status, and a live
            // region here would announce a tag that never changes. The subject rides
            // in the title for a pointer, and the row it sits on is disabled as well,
            // so nothing about the state depends on the pill alone.
            title={name}
            data-testid="coming-tag"
            style={{ flex: "0 0 auto" }}
        >
            {COMING_LABEL}
        </Badge>
    );
}
