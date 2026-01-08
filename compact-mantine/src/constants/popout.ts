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
 * Gap in pixels between parent and child panels for nested popouts.
 * Used in Phase 6 for nested popout hierarchies.
 */
export const POPOUT_NESTED_GAP = 4;
