/**
 * Static visual styles for compact-sized overlay components.
 *
 * These are applied via the `styles` prop on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * Target styles (from baseline):
 * - Menu: item fontSize 11px
 * - Tooltip: tooltip fontSize 11px
 * - Popover: dropdown padding 8px
 * - HoverCard: dropdown padding 8px
 */

/**
 * CSS variables for compact Menu component.
 * Menu supports custom CSS variables via its vars API.
 */
export const compactMenuVars = {
    "--menu-item-fz": "11px",
} as const;

/**
 * Static styles for compact Tooltip component.
 * Uses styles instead of vars since Mantine doesn't expose font size CSS variable.
 */
export const compactTooltipStyles = {
    tooltip: {
        fontSize: 11,
        padding: "4px 8px",
    },
} as const;

/**
 * Static styles for compact Popover component.
 * Uses styles since Mantine doesn't expose padding CSS variable.
 */
export const compactPopoverStyles = {
    dropdown: {
        padding: 8,
    },
} as const;

/**
 * Static styles for compact HoverCard component.
 * Uses styles since Mantine doesn't expose padding CSS variable.
 */
export const compactHoverCardStyles = {
    dropdown: {
        padding: 8,
    },
} as const;
