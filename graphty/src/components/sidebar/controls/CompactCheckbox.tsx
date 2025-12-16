import {Checkbox, type CheckboxProps} from "@mantine/core";
import React from "react";

/**
 * Compact checkbox with consistent styling for sidebar controls.
 * Uses 11px font size and xs size for a compact appearance.
 */
export function CompactCheckbox(props: CheckboxProps): React.JSX.Element {
    return (
        <Checkbox
            size="xs"
            styles={{
                label: {fontSize: "11px", paddingLeft: "4px"},
            }}
            {...props}
        />
    );
}
