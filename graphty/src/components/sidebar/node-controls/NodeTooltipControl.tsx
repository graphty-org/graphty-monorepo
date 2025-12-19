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
 *
 * TODO: This is currently a thin wrapper that only provides the label prop.
 * Future enhancements could include:
 * - Node-specific tooltip triggers (hover, click, focus)
 * - Node-specific positioning relative to node shape
 * - Dynamic content interpolation (e.g., showing node properties)
 * - Integration with node metadata for automatic tooltip content
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
