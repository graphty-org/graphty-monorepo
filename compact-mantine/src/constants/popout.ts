/**
 * Z-index base value for popout panels.
 * Ensures popouts appear above other UI elements.
 */
export const POPOUT_Z_INDEX_BASE = 1000;

/**
 * Z-index for floating UI elements (dropdowns, menus, tooltips) that appear
 * inside popout panels. Must be higher than POPOUT_Z_INDEX_BASE to ensure
 * dropdowns appear above the popout panel.
 */
export const FLOATING_UI_Z_INDEX = 1100;

/**
 * Gap in pixels between trigger and panel for root-level popouts.
 */
export const POPOUT_GAP = 8;

/**
 * Gap in pixels between a pop-out panel and the panel it opened from.
 *
 * A panel opened from inside another panel uses this as its default `gap`, so
 * every level of a nested stack steps out by the same amount and the stack
 * reads as a stack rather than as several panels that happen to overlap.
 */
export const POPOUT_NESTED_GAP = 4;
