// The constants the package publishes: the panel grid every row is measured
// against, the ink map every row is painted from, the pop-out geometry and the
// compact sizing the theme is built on.
//
// FLOATING_UI_Z_INDEX is deliberately absent. It is the layer Mantine's own
// dropdowns are pushed to so they clear a pop-out panel, which is a fact about
// this package's theme rather than something a consumer sets, and a test asserts
// that it stays off this barrel.

export { DEFAULT_GRADIENT_STOP_COLOR, SWATCH_COLORS_HEXA } from "./colors";
export { PANEL_GRID, PANEL_INK } from "./panel";
export { POPOUT_GAP, POPOUT_NESTED_GAP, POPOUT_Z_INDEX_BASE } from "./popout";
export { COMPACT_SIZING, MANTINE_SPACING } from "./spacing";
