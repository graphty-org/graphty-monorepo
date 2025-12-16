import React from "react";

import type {RichTextStyle} from "../../../types/style-layer";
import {RichTextStyleEditor} from "../controls/RichTextStyleEditor";

interface NodeTooltipControlProps {
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

/**
 * Control for editing node tooltip styles.
 * Wraps RichTextStyleEditor with node-specific tooltip configuration.
 */
export function NodeTooltipControl({value, onChange}: NodeTooltipControlProps): React.JSX.Element {
    return (
        <RichTextStyleEditor
            label="Node Tooltip"
            value={value}
            onChange={onChange}
        />
    );
}
