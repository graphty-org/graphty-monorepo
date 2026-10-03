import React from "react";

import { PANEL_GRID } from "../../constants/panel";
import { UiGlyph } from "../../icons";

/**
 * Props for the disclosure caret.
 */
interface CaretProps {
    /** Whether the thing it discloses is open: down when open, along the text when closed. */
    open: boolean;
    /** Whether text runs right to left, which points a closed caret to the left. */
    rtl: boolean;
}

/**
 * The 5 x 3 disclosure caret of a section or sub-group header, drawn in a 10px box.
 *
 * The register has no left-pointing caret, so a closed caret in a right-to-left interface is the
 * right-pointing one mirrored.
 * @param props - Component props
 * @param props.open - Whether the disclosed content is open
 * @param props.rtl - Whether text runs right to left
 * @returns The caret glyph
 */
export function Caret({ open, rtl }: CaretProps): React.JSX.Element {
    if (open) {
        return <UiGlyph name="caretDown" size={PANEL_GRID.CHEVRON} />;
    }

    return (
        <span data-caret="closed" style={{ display: "inline-flex", transform: rtl ? "scaleX(-1)" : undefined }}>
            <UiGlyph name="caretRight" size={PANEL_GRID.CHEVRON} />
        </span>
    );
}
