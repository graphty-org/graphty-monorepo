/**
 * AnglePicker: a 24px dial at the line's inline start, a gutter, then a number field filling the
 * rest. The dial is the field's own fill and border; its hand is turned with `transform`, written
 * with physical `left`/`top` on purpose: an angle has no reading direction, so `dir="rtl"` must not
 * mirror it.
 */
import { PANEL_GRID } from "../../constants/panel";

const css = `
.cm-angle-picker {
    display: flex;
    align-items: center;
    gap: ${String(PANEL_GRID.GUTTER)}px;
    width: 100%;
    min-width: 0;
}
.cm-angle-picker > :last-child {
    flex: 1 1 auto;
    min-width: 0;
}
.cm-angle-picker-dial {
    position: relative;
    flex: none;
    box-sizing: border-box;
    width: ${String(PANEL_GRID.CONTROL_HEIGHT)}px;
    height: ${String(PANEL_GRID.CONTROL_HEIGHT)}px;
    border: 1px solid var(--cm-border);
    border-radius: 50%;
    background-color: var(--cm-bg-secondary);
    color: var(--cm-icon);
    touch-action: none;
}
.cm-angle-picker-dial:focus-visible,
.cm-angle-picker[data-dragging] .cm-angle-picker-dial {
    color: var(--cm-icon-brand);
}
.cm-angle-picker-dial[aria-disabled="true"] {
    color: var(--cm-icon-disabled);
}
.cm-angle-picker-hand {
    position: absolute;
    left: calc(50% - 0.5px);
    top: 0;
    width: 1px;
    height: 50%;
    background-color: currentColor;
    transform-origin: 50% 100%;
    pointer-events: none;
}
.cm-angle-picker-hub {
    position: absolute;
    left: 50%;
    top: 50%;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background-color: currentColor;
    transform: translate(-50%, -50%);
    pointer-events: none;
}
`;

export default css;
