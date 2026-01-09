/**
 * Static visual styles and CSS variables for compact-sized display components.
 *
 * These are applied via the `vars` and `styles` props on component extensions,
 * providing compact sizing with consistent dimensions.
 *
 * CSS Variables (from baseline):
 * - Badge: --badge-height: 14px, --badge-fz: 9px
 * - Text: --text-fz: 11px, --text-lh: 1.2
 * - Avatar: --avatar-size: 24px
 * - ThemeIcon: --ti-size: 24px
 * - Indicator: --indicator-size: 8px
 * - Kbd: --kbd-fz: 10px
 * - Pill: --pill-height: 16px, --pill-fz: 10px
 */

/**
 * CSS variables for compact Badge component.
 */
export const compactBadgeVars = {
    "--badge-height": "14px",
    "--badge-fz": "9px",
    "--badge-padding-x": "4px",
} as const;

/**
 * CSS variables for compact Text component.
 */
export const compactTextVars = {
    "--text-fz": "11px",
    "--text-lh": "1.2",
} as const;

/**
 * CSS variables for compact Avatar component.
 */
export const compactAvatarVars = {
    "--avatar-size": "24px",
} as const;

/**
 * CSS variables for compact ThemeIcon component.
 */
export const compactThemeIconVars = {
    "--ti-size": "24px",
} as const;

/**
 * CSS variables for compact Indicator component.
 */
export const compactIndicatorVars = {
    "--indicator-size": "8px",
} as const;

/**
 * CSS variables for compact Kbd component.
 */
export const compactKbdVars = {
    "--kbd-fz": "10px",
    "--kbd-padding": "2px 4px",
} as const;

/**
 * CSS variables for compact Pill component.
 */
export const compactPillVars = {
    "--pill-height": "16px",
    "--pill-fz": "10px",
} as const;
