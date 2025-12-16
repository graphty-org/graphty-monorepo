import React from "react";

import type {RichTextStyle} from "../../../types/style-layer";
import {RichTextStyleEditor} from "../controls/RichTextStyleEditor";

interface EdgeTooltipControlProps {
    value: RichTextStyle;
    onChange: (value: RichTextStyle) => void;
}

/**
 * Control for editing edge tooltip styles.
 * Wraps RichTextStyleEditor with edge-specific tooltip configuration.
 */
export function EdgeTooltipControl({value, onChange}: EdgeTooltipControlProps): React.JSX.Element {
    return (
        <RichTextStyleEditor
            label="Edge Tooltip"
            value={value}
            onChange={onChange}
        />
    );
}
