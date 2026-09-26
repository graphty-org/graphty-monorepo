import { Box, type BoxProps, type ElementProps, Tooltip, UnstyledButton, type UnstyledButtonProps } from "@mantine/core";
import React, { forwardRef } from "react";

import { useLabels } from "../../i18n";
import { TOOLTIP_GAP } from "../../theme/styles/overlays";
import { useRovingFocus, useShellStyles } from "./roving";
import { TipLabel } from "./ToolButton";

/**
 * The rail buttons' cold tooltip delay, in ms (flows.md: 500 on the rail, 1000 elsewhere). Inside
 * the app's shell-wide Tooltip.Group, Mantine uses the group's delays instead (1000 cold, instant
 * warm): the rail joins that group rather than nesting its own, so the warm hand-off crosses the
 * whole shell (spec 8.3).
 */
const RAIL_TOOLTIP_OPEN_DELAY = 500;

/**
 * Props for the NavRail component.
 */
export interface NavRailProps extends BoxProps, ElementProps<"div"> {
    /** Accessible name of the rail. Defaults to the "Navigation" label. */
    "aria-label"?: string;
    /** Buttons pinned to the rail's foot, 8px apart (a 32 icon button with a notification dot). */
    footer?: React.ReactNode;
    /** Rail buttons and separators, top to bottom. */
    children?: React.ReactNode;
}

/**
 * The vertical navigation rail at the window's start edge (Figma's navigation bar): 56 wide plus
 * a 1px end border, padding 8 top and 16 bottom, full height. One Tab stop; ArrowUp / ArrowDown /
 * Home / End move between its buttons, Enter or Space activates.
 * @param props - Component props
 * @param props.footer - Buttons pinned to the rail's foot
 * @param props.children - Rail buttons and separators
 * @param props.className - Extra class on the root
 * @param props.onKeyDown - Called before the roving-focus key handling
 * @param props.onFocus - Called before the roving-focus bookkeeping
 * @returns The rail
 */
function NavRailRoot({ footer, children, className, onKeyDown, onFocus, ...others }: NavRailProps): React.JSX.Element {
    useShellStyles();
    const labels = useLabels();
    const roving = useRovingFocus<HTMLDivElement>("vertical");
    return (
        <Box
            {...others}
            ref={roving.ref}
            role="toolbar"
            aria-label={others["aria-label"] ?? labels.navigation}
            aria-orientation="vertical"
            className={className ? `cm-nav-rail ${className}` : "cm-nav-rail"}
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
            {footer ? <div className="cm-nav-rail-footer">{footer}</div> : null}
        </Box>
    );
}

/**
 * The rail's 16 x 1 separator (8px above, 7px below).
 * @returns The separator
 */
function NavRailSeparator(): React.JSX.Element {
    return <div className="cm-nav-rail-separator" role="separator" />;
}

/** The navigation rail, with `NavRail.Separator`. */
export const NavRail = Object.assign(NavRailRoot, { Separator: NavRailSeparator });

/**
 * Props for the RailButton component.
 */
export interface RailButtonProps extends Omit<UnstyledButtonProps, "children">, Omit<ElementProps<"button">, "children"> {
    /** The destination's glyph, drawn in the 32 x 32 pill. */
    icon: React.ReactNode;
    /** The 9px caption under the pill, also the accessible name and the tooltip. */
    label: string;
    /** The keyboard shortcut shown in the tooltip. */
    shortcut?: string;
    /**
     * Whether the destination is open. `aria-expanded="true"` means the same thing, so a button
     * that opens a panel only needs that.
     */
    active?: boolean;
}

/**
 * A 56 x 56 rail button: a 32 x 32 pill (24 glyph) above a 9/14 caption. The pill turns
 * `--cm-bg-hover` under the pointer and `--cm-bg-selected` with a brand glyph when active; the
 * caption never changes. Tooltip to the end side after 500ms, none on the active button.
 * @param props - Component props
 * @param props.icon - The destination's glyph
 * @param props.label - The caption, accessible name and tooltip
 * @param props.shortcut - The keyboard shortcut shown in the tooltip
 * @param props.active - Whether the destination is open
 * @returns The rail button
 */
export const RailButton = forwardRef<HTMLButtonElement, RailButtonProps>(function RailButton(
    { icon, label, shortcut, active, className, ...others },
    ref,
) {
    const isActive = active === true || others["aria-expanded"] === true || others["aria-expanded"] === "true";
    // The tooltip is centered on the 32px pill, 8px above the 56px button's center, its bubble 6px
    // past the button's end edge (ls/state-rail-button-hover-tooltip #70). With an object offset
    // Mantine no longer adds half the arrow, so the main axis is the whole gap.
    return (
        <Tooltip
            label={<TipLabel label={label} shortcut={shortcut} />}
            position="right"
            offset={{ mainAxis: TOOLTIP_GAP, crossAxis: -8 }}
            openDelay={RAIL_TOOLTIP_OPEN_DELAY}
            withArrow
            disabled={isActive}
        >
            <UnstyledButton
                {...others}
                ref={ref}
                aria-label={label}
                className={className ? `cm-rail-button ${className}` : "cm-rail-button"}
                mod={{ active: isActive }}
            >
                <span className="cm-rail-pill" aria-hidden="true">
                    {icon}
                </span>
                <span className="cm-rail-label" aria-hidden="true">
                    {label}
                </span>
            </UnstyledButton>
        </Tooltip>
    );
});
