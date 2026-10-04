/**
 * Z-index base value for popout panels.
 * Ensures popouts appear above other UI elements.
 */
export const POPOUT_Z_INDEX_BASE = 1000;

/**
 * Z-index for floating UI elements (dropdowns, menus) that appear
 * inside popout panels. Must be higher than POPOUT_Z_INDEX_BASE to ensure
 * dropdowns appear above the popout panel.
 */
export const FLOATING_UI_Z_INDEX = 1100;

/**
 * Z-index for tooltips: above every popover, menu and dropdown (design/figma-spec.md 8.3), so a
 * tooltip on a control inside an open menu is never covered by the menu.
 */
export const TOOLTIP_Z_INDEX = FLOATING_UI_Z_INDEX + 100;

/**
 * Gap in pixels between trigger and panel for root-level popouts.
 *
 * Zero: Figma docks a light popover flush against the panel it opened from (its end edge on the
 * panel's start border), design/figma-spec.md 8.4.
 */
export const POPOUT_GAP = 0;

/**
 * Gap in pixels between a pop-out panel and the panel it opened from.
 *
 * Zero: a child popout docks flush to the start of its parent, as Figma's create-style dialog
 * docks against the color picker (design/figma-spec.md 8.4).
 */
export const POPOUT_NESTED_GAP = 0;
