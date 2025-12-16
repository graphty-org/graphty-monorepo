import React from "react";

import type {RichTextStyle} from "../../../types/style-layer";
import {RichTextStyleEditor} from "../controls/RichTextStyleEditor";

interface EdgeLabelControlProps {
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

/**
 * Control for editing edge label styles.
 * Wraps RichTextStyleEditor with edge-specific label configuration.
 *
 * TODO: This is currently a thin wrapper that only provides the label prop.
 * Future enhancements could include:
 * - Edge-specific positioning options (on path, offset from path)
 * - Edge-specific text orientation (follow path direction)
 * - Edge weight/relationship type display
 * - Multi-segment edge label distribution
 */
export function EdgeLabelControl({value, onChange}: EdgeLabelControlProps): React.JSX.Element {
    return (
        <RichTextStyleEditor
            label="Edge Label"
            value={value}
            onChange={onChange}
        />
    );
}
