import { Box, type BoxProps, type ElementProps, UnstyledButton, type UnstyledButtonProps } from "@mantine/core";
import React, { forwardRef } from "react";

import { UiGlyph } from "../../icons";
import { useRovingFocus, useShellStyles } from "./roving";

/**
 * Props for the SecondaryToolbar component.
 */
export interface SecondaryToolbarProps extends BoxProps, ElementProps<"div"> {
    /** Accessible name of the bar, such as "Vector editing". */
    "aria-label": string;
    /** Drop the 8px padding, for a crop-style bar whose items sit on its edges. */
    flush?: boolean;
    /** The bar's buttons and dividers. */
    children?: React.ReactNode;
}

/**
 * The contextual bar that appears 8px above the main toolbar while a mode is active (Figma's
 * vector-edit and image bars): 40 tall, 13px corners, the 200 elevation, 1 x 40 dividers.
 * One Tab stop, ArrowLeft / ArrowRight between its items. The caller positions it.
 * @param props - Component props
 * @param props.flush - Drop the 8px padding
 * @param props.children - The bar's buttons and dividers
 * @param props.className - Extra class on the root
 * @param props.onKeyDown - Called before the roving-focus key handling
 * @param props.onFocus - Called before the roving-focus bookkeeping
 * @returns The bar
 */
function SecondaryToolbarRoot({ flush, children, className, onKeyDown, onFocus, ...others }: SecondaryToolbarProps): React.JSX.Element {
    useShellStyles();
    const roving = useRovingFocus<HTMLDivElement>("horizontal");
    return (
        <Box
            {...others}
            ref={roving.ref}
            role="toolbar"
            aria-orientation="horizontal"
            className={className ? `cm-secondary-toolbar ${className}` : "cm-secondary-toolbar"}
            mod={{ flush }}
            onKeyDown={(event: React.KeyboardEvent<HTMLDivElement>) => {
                onKeyDown?.(event);
                roving.onKeyDown(event);
            }}
            onFocus={(event: React.FocusEvent<HTMLDivElement>) => {
                onFocus?.(event);
                roving.onFocus(event);
            }}
        >
            {children}
        </Box>
    );
}

/**
 * Props for SecondaryToolbar.Button.
 */
export interface SecondaryToolbarButtonProps extends UnstyledButtonProps, ElementProps<"button"> {
    /** A 24px glyph before the label. */
    icon?: React.ReactNode;
    /** Whether this is the current mode (`aria-pressed`): brand fill, white content. */
    selected?: boolean;
    /**
     * The button opens a dropdown (Figma's "More"): a 16px chevron trails the label with 4px end
     * padding. Wrap the button in `Menu.Target` so `aria-expanded` draws the open state.
     */
    dropdown?: boolean;
    /** The visible label. Without one the button is a 24 x 24 icon button and needs an `aria-label`. */
    children?: React.ReactNode;
}

/**
 * An item of the secondary bar: 24 tall, a 24 glyph and an 11/16 label, `--cm-bg-hover` under the
 * pointer, the brand fill when selected, and `--cm-bg-selected` with brand text while a dropdown
 * it opens is open (`aria-expanded`, set by `Menu.Target`).
 * @param props - Component props
 * @param props.icon - A 24px glyph before the label
 * @param props.selected - Whether this is the current mode
 * @param props.dropdown - Whether the button opens a dropdown (a trailing chevron)
 * @param props.children - The visible label
 * @returns The button
 */
const SecondaryToolbarButton = forwardRef<HTMLButtonElement, SecondaryToolbarButtonProps>(function SecondaryToolbarButton(
    { icon, selected, dropdown, children, className, ...others },
    ref,
) {
    return (
        <UnstyledButton
            {...others}
            ref={ref}
            aria-pressed={selected}
            className={className ? `cm-secondary-item ${className}` : "cm-secondary-item"}
            mod={{ dropdown }}
        >
            {icon ? (
                <span className="cm-tool-icon" aria-hidden="true">
                    {icon}
                </span>
            ) : null}
            {children ? (
                <span className="cm-secondary-item-label" style={icon ? undefined : { paddingInlineStart: 8 }}>
                    {children}
                </span>
            ) : null}
            {dropdown ? (
                <span className="cm-secondary-item-chevron" aria-hidden="true">
                    <UiGlyph name="chevronDown" size={10} />
                </span>
            ) : null}
        </UnstyledButton>
    );
});

/**
 * The divider between groups of the secondary bar, full height.
 * @returns The divider
 */
function SecondaryToolbarDivider(): React.JSX.Element {
    return <div className="cm-secondary-divider" role="separator" aria-orientation="vertical" />;
}

/** The contextual secondary bar, with `SecondaryToolbar.Button` and `SecondaryToolbar.Divider`. */
export const SecondaryToolbar = Object.assign(SecondaryToolbarRoot, {
    Button: SecondaryToolbarButton,
    Divider: SecondaryToolbarDivider,
});
