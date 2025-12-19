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
 *
 * TODO: This is currently a thin wrapper that only provides the label prop.
 * Future enhancements could include:
 * - Edge-specific tooltip triggers (hover on edge line)
 * - Edge relationship data display in tooltip
 * - Edge metadata interpolation (source, target, weight)
 * - Click-to-reveal detailed edge information
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
