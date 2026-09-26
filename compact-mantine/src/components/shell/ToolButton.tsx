import { type ElementProps, Tooltip, type TooltipProps, UnstyledButton, type UnstyledButtonProps } from "@mantine/core";
import React, { forwardRef } from "react";

import { useShellStyles } from "./roving";

/**
 * A tooltip's text with its shortcut 12px after it in the menu's secondary colour ("Frame  F").
 * @param props - Component props
 * @param props.label - The tooltip text
 * @param props.shortcut - The keyboard shortcut, if any
 * @returns The tooltip label
 */
export function TipLabel({ label, shortcut }: { label: React.ReactNode; shortcut?: string }): React.JSX.Element {
    return (
        <>
            {label}
            {shortcut ? <span className="cm-tip-shortcut">{shortcut}</span> : null}
        </>
    );
}

/**
 * Props for the ToolButton component.
 */
export interface ToolButtonProps extends Omit<UnstyledButtonProps, "children">, Omit<ElementProps<"button">, "children"> {
    /** The tool's name: its accessible name and its tooltip. */
    label: string;
    /** The tool's glyph, drawn in a 24px box. */
    icon: React.ReactNode;
    /** The keyboard shortcut shown in the tooltip, such as `"F"`. */
    shortcut?: string;
    /**
     * Whether this is the current tool (`aria-pressed`): a brand fill with a white glyph. Leave it
     * undefined for a button that runs an action rather than picking a tool.
     */
    selected?: boolean;
    /** Where the tooltip opens. Defaults to above, as on Figma's bottom toolbar. */
    tooltipPosition?: TooltipProps["position"];
}

/**
 * A 32 x 32 toolbar tool (Figma's toolbelt button): transparent at rest, `--cm-bg-hover` under the
 * pointer, the brand fill when selected, a 1px inside focus ring (a double ring when selected).
 * The tooltip opens above with the shortcut after the name.
 * @param props - Component props
 * @param props.label - The tool's name
 * @param props.icon - The tool's glyph
 * @param props.shortcut - The keyboard shortcut shown in the tooltip
 * @param props.selected - Whether this is the current tool
 * @param props.tooltipPosition - Where the tooltip opens
 * @returns The tool button
 */
export const ToolButton = forwardRef<HTMLButtonElement, ToolButtonProps>(function ToolButton(
    { label, icon, shortcut, selected, tooltipPosition = "top", className, ...others },
    ref,
) {
    useShellStyles();
    return (
        <Tooltip label={<TipLabel label={label} shortcut={shortcut} />} position={tooltipPosition}>
            <UnstyledButton
                {...others}
                ref={ref}
                aria-label={label}
                aria-pressed={selected}
                className={className ? `cm-tool ${className}` : "cm-tool"}
            >
                <span className="cm-tool-icon" aria-hidden="true">
                    {icon}
                </span>
            </UnstyledButton>
        </Tooltip>
    );
});
