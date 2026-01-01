import React from "react";

import type { RichTextStyle } from "../../../types/style-layer";
import { RichTextStyleEditor } from "../controls/RichTextStyleEditor";

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
 * @param root0 - Component props
 * @param root0.value - The current tooltip style configuration
 * @param root0.onChange - Called when the tooltip style changes
 * @returns The edge tooltip control component
 */
export function EdgeTooltipControl({ value, onChange }: EdgeTooltipControlProps): React.JSX.Element {
    return <RichTextStyleEditor label="Edge Tooltip" value={value} onChange={onChange} />;
}
