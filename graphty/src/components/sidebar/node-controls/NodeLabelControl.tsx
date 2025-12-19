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
 *
 * TODO: This is currently a thin wrapper that only provides the label prop.
 * Future enhancements could include:
 * - Node-specific default values different from edge labels
 * - Node-specific validation (e.g., max text length)
 * - Node-specific font presets optimized for 3D node rendering
 * - Integration with node selection state
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
