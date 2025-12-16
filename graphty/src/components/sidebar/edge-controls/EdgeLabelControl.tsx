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
