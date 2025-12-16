import React from "react";

import type {RichTextStyle} from "../../../types/style-layer";
import {RichTextStyleEditor} from "../controls/RichTextStyleEditor";

interface NodeLabelControlProps {
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

/**
 * Control for editing node label styles.
 * Wraps RichTextStyleEditor with node-specific label configuration.
 */
export function NodeLabelControl({value, onChange}: NodeLabelControlProps): React.JSX.Element {
    return (
        <RichTextStyleEditor
            label="Node Label"
            value={value}
            onChange={onChange}
        />
    );
}
