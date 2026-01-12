/**
 * Static visual styles and CSS variables for compact-sized button components.
 *
 * These are applied via the `vars` and `styles` props on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * CSS Variables (from baseline):
 * - Button: --button-height: 24px, --button-fz: 11px
 * - ActionIcon: --ai-size: 24px
 * - CloseButton: --cb-size: 16px, --cb-icon-size: 12px
 */

/**
 * CSS variables for compact Button component.
 */
export const compactButtonVars = {
    "--button-height": "24px",
    "--button-fz": "11px",
    "--button-padding-x": "8px",
} as const;

/**
 * CSS variables for compact ActionIcon component.
 */
export const compactActionIconVars = {
    "--ai-size": "24px",
} as const;

/**
 * CSS variables for compact CloseButton component.
 */
export const compactCloseButtonVars = {
    "--cb-size": "16px",
    "--cb-icon-size": "12px",
} as const;
