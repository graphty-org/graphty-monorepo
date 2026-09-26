/**
 * The colour package's CSS (design/figma-spec.md section 7): the chit (Mantine ColorSwatch), the
 * paint field (CompactColorInput), the light colour picker (ColorPickerPanel), the colour sliders
 * (Mantine HueSlider / AlphaSlider), and the gradient editor.
 *
 * Every colour is a --cm-* token except the checkerboards behind translucent colours, which are
 * image content rather than surface colours (the chit's is #e1e1e1 / white in both themes).
 *
 * Two rules use !important, each against an inline style Mantine's ColorSlider writes from
 * JavaScript that no class can outrank: the overlays' inset box-shadow and the alpha overlay's
 * checkerboard. (The thumb's inline `top: 1px` is corrected with a margin instead.)
 */
import { cmFont } from "../tokens";

/** Figma's checkerboard: 3px cells, #e1e1e1 top-left and bottom-right, white between. */
export const CHECKER = "repeating-conic-gradient(#ffffff 0 25%, #e1e1e1 0 50%) 0 0 / 6px 6px";

/**
 * The slider track's checkerboard: three rows of cells across the 16px track. Unlike the chit's,
 * it follows the theme: white / #e1e1e1 in light, the panel greys #2c2c2c / #383838 in dark
 * (sampled from dark-theme/dark-color-picker@2x.png).
 */
const TRACK_CHECKER =
    "repeating-conic-gradient(light-dark(#ffffff, #2c2c2c) 0 25%, light-dark(#e1e1e1, #383838) 0 50%) 0 0 / 10.667px 10.667px";

const css = `
/* States a story cannot reach with a pointer are forced with data-state="hover" / "focus"
   (design/figma-spec.md 16); each rule below lists the forced state beside the real one. */

/* 7.1 Chit (Mantine ColorSwatch). Picker form by default: 16 x 16, radius 20%. The alpha
   checkerboard covers the inline-end half only; the ring on near-white colours sits above
   everything so the translucent half cannot hide it. */
.cm-chit { overflow: hidden; border-radius: var(--cs-radius); }
.cm-chit .cm-chit-alpha {
    inset-block: 0;
    inset-inline: 50% 0;
    border-radius: 0;
    background: ${CHECKER};
}
.cm-chit .cm-chit-shadow { z-index: 3; box-shadow: none; }
.cm-chit[data-light] .cm-chit-shadow { box-shadow: inset 0 0 0 2px var(--cm-border-translucent); }
.cm-chit-half {
    position: absolute;
    inset-block: 0;
    inset-inline: 50% 0;
    background: linear-gradient(var(--cm-chit-color), var(--cm-chit-color)), ${CHECKER};
}
/* Field form: 14 x 14, radius 2, a half-pixel inner border drawn at double size and scaled. */
.cm-chit[data-variant="field"]::after {
    content: "";
    position: absolute;
    z-index: 4;
    top: 0;
    left: 0;
    width: 200%;
    height: 200%;
    border-radius: 4px;
    box-shadow: inset 0 0 0 1px var(--cm-border);
    transform: scale(0.5);
    transform-origin: 0 0;
    pointer-events: none;
}

/* A paint field's own label, the field-row legend (spec 6: 11/16 400, secondary, 4 below). */
.cm-paint-label {
    margin-bottom: 4px;
    color: var(--cm-text-secondary);
    ${cmFont("legend")}
}

/* 7.2 Paint field: one 24-tall field, a 1px border in the fill colour that hover and focus
   repaint, the chit at x+5, hex from x+24, a 1px seam, then opacity and its "%" handle. */
.cm-paint {
    display: flex;
    align-items: center;
    gap: 8px;
}
.cm-paint-field {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    box-sizing: border-box;
    height: 24px;
    border: 1px solid var(--cm-bg-secondary);
    border-radius: 5px;
    background-color: var(--cm-bg-secondary);
    color: var(--cm-text);
    ${cmFont("body")}
    box-shadow: var(--cm-field-shadow);
}
.cm-paint-field:hover,
.cm-paint-field[data-state="hover"] {
    border-color: var(--cm-border);
    box-shadow: var(--cm-field-shadow-hover);
}
.cm-paint-field:focus-within,
.cm-paint-field[data-state="focus"] {
    border-color: var(--cm-border-selected);
    box-shadow: none;
}
/* While the chit's picker is open the field, and the row holding it, take --cm-bg-pressed
   (ii/colour-picker-solid #49, dt/dark-color-picker #64 / #66). The row is reached through
   :has(); its background bleeds into the 16 / 8 panel gutters through border-image-outset, which
   paints outside the box without moving anything. */
.cm-paint-field:has(.cm-paint-chit[aria-expanded="true"]),
.cm-paint-field[data-state="open"] {
    border-color: var(--cm-bg-pressed);
    background-color: var(--cm-bg-pressed);
    box-shadow: none;
}
[data-testid="field-row"]:has(.cm-paint-chit[aria-expanded="true"]) {
    border-image: conic-gradient(var(--cm-bg-pressed) 0 0) fill 0 / / 0 8px 0 16px;
}
[data-testid="field-row"]:has(.cm-paint-chit[aria-expanded="true"]):dir(rtl) {
    border-image-outset: 0 16px 0 8px;
}
.cm-paint-field[data-disabled] {
    border-color: var(--cm-border-disabled);
    background-color: var(--cm-bg);
    color: var(--cm-text-disabled);
    box-shadow: none;
}
.cm-paint-chit {
    display: flex;
    flex: none;
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    margin-inline-start: 4px;
    padding: 0;
    border: 0;
    border-radius: 2px;
    background: none;
    outline: none;
    cursor: default;
}
.cm-paint-chit:focus-visible .cm-chit::after { box-shadow: inset 0 0 0 2px var(--cm-border-selected); }
.cm-paint-chit:disabled .cm-chit { opacity: 0.4; }
.cm-paint-input {
    box-sizing: border-box;
    min-width: 0;
    height: 24px;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    outline: none;
    cursor: default;
}
.cm-paint-input:focus { cursor: text; }
.cm-paint-input:disabled { color: var(--cm-text-disabled); }
.cm-paint-input[data-is-default="true"]:not(:disabled) {
    color: var(--cm-text-secondary);
    font-style: italic;
}
.cm-paint-hex {
    flex: 1 1 0;
    margin-inline-start: 5px;
    text-transform: uppercase;
}
.cm-paint-opacity {
    position: relative;
    display: flex;
    flex: none;
    align-items: center;
    box-sizing: border-box;
    width: 54px;
    height: 24px;
    border: 1px solid transparent;
    border-radius: 5px;
}
.cm-paint-field .cm-paint-opacity::before {
    content: "";
    position: absolute;
    inset-block: 0;
    inset-inline-start: -1px;
    width: 1px;
    background-color: var(--cm-bg);
}
.cm-paint-opacity .cm-paint-input {
    flex: none;
    width: 38px;
    padding-inline-start: 7px;
    border-inline-start: 1px solid transparent;
}
.cm-paint-suffix {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 14px;
    height: 24px;
    color: var(--cm-text-secondary);
    cursor: ew-resize;
    user-select: none;
    touch-action: none;
}
.cm-paint-opacity[data-disabled] .cm-paint-suffix {
    color: var(--cm-text-disabled);
    cursor: default;
}

/* 7.3 Colour picker, the body of a light popover 240 wide. */
.cm-color-picker {
    box-sizing: border-box;
    width: 240px;
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-color-picker-types {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 41px;
    padding: 8px;
    border-bottom: 1px solid var(--cm-border);
}
.cm-color-picker-body { padding: 16px 16px 0; }
.cm-color-saturation {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    width: 208px;
    height: 208px;
    border-radius: 5px;
    background:
        linear-gradient(to top, #000000, transparent),
        linear-gradient(to right, #ffffff, transparent),
        hsl(var(--cm-hue) 100% 50%);
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
    touch-action: none;
}
.cm-color-saturation:focus-visible { outline: 1px solid var(--cm-border-translucent); }
.cm-color-saturation .cm-color-thumb {
    position: absolute;
    left: calc(var(--cm-x) - 8px);
    top: calc(var(--cm-y) - 8px);
}
.cm-color-saturation:focus-visible .cm-color-thumb,
.cm-color-saturation[data-state="focus"] .cm-color-thumb {
    left: calc(var(--cm-x) - 10px);
    top: calc(var(--cm-y) - 10px);
}
.cm-color-picker-sliders {
    display: flex;
    align-items: center;
    margin-top: 8px;
}
.cm-color-picker-eyedropper {
    display: flex;
    flex: none;
    width: 24px;
    height: 24px;
    margin-inline-end: 8px;
}
.cm-color-picker-slider-stack {
    display: flex;
    flex: none;
    flex-direction: column;
    gap: 4px;
    width: 180px;
    margin-inline-end: -4px;
}
.cm-color-picker-values {
    display: flex;
    align-items: center;
    margin-top: 8px;
}
/* Figma's format button sizes to its word (55.17 for "Hex"); the joined field takes the rest, up
   to 144. */
.cm-color-picker-format { flex: none; min-width: 55px; }
.cm-color-picker-format input { field-sizing: content; }
.cm-joined-field {
    display: flex;
    flex: 0 1 144px;
    gap: 1px;
    min-width: 0;
    margin-inline-start: auto;
    border-radius: 5px;
    outline: 1px solid transparent;
    outline-offset: -1px;
    box-shadow: var(--cm-field-shadow);
}
.cm-joined-field:hover,
.cm-joined-field[data-state="hover"] { outline-color: var(--cm-border); box-shadow: var(--cm-field-shadow-hover); }
.cm-joined-field:focus-within,
.cm-joined-field[data-state="focus"] { outline-color: var(--cm-border-selected); box-shadow: none; }
.cm-joined-field .cm-paint-input {
    flex: 1 1 0;
    padding-inline: 8px;
    border-start-start-radius: 5px;
    border-end-start-radius: 5px;
    background-color: var(--cm-bg-secondary);
}
.cm-joined-field > .cm-paint-input:last-child {
    border-start-end-radius: 5px;
    border-end-end-radius: 5px;
}
.cm-joined-field .cm-paint-opacity {
    border-radius: 0;
    border-start-end-radius: 5px;
    border-end-end-radius: 5px;
    background-color: var(--cm-bg-secondary);
}
.cm-joined-field .cm-paint-opacity .cm-paint-input {
    flex: none;
    padding-inline: 7px 0;
    background: none;
}
.cm-color-swatches {
    display: grid;
    grid-template-columns: repeat(9, 16px);
    gap: 8px;
    margin-top: 16px;
    padding: 16px;
    border-top: 1px solid var(--cm-border);
}
.cm-color-swatch-button {
    display: flex;
    width: 16px;
    height: 16px;
    padding: 0;
    border: 0;
    border-radius: 20%;
    background: none;
    cursor: default;
}

/* 7.4 Colour sliders (Mantine HueSlider / AlphaSlider): a 180 x 24 slot, the role=slider element
   156 wide in its middle so the pointer maps onto the thumb's centre, the 172 x 16 track half a
   thumb past each end, a 16px thumb with a 12px elevated layer beneath it. */
.cm-color-slider {
    position: relative;
    isolation: isolate;
    height: 24px;
    margin-inline: 12px;
    outline: none;
    touch-action: none;
}
.cm-color-slider + .cm-color-slider { margin-top: 0; }
.cm-color-slider::before {
    content: "";
    position: absolute;
    inset-block: 0;
    inset-inline: -12px;
}
.cm-color-slider-track {
    z-index: -2;
    top: 4px;
    bottom: auto;
    height: 16px;
    inset-inline: -8px;
    border-radius: 9999px;
    box-shadow: none !important;
}
.cm-color-slider[data-alpha] .cm-color-slider-track:first-child {
    background: ${TRACK_CHECKER} !important;
}
.cm-color-slider::after {
    content: "";
    position: absolute;
    z-index: -1;
    top: 4px;
    height: 16px;
    inset-inline: -8px;
    border-radius: 9999px;
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
    pointer-events: none;
}
.cm-color-thumb {
    --cp-thumb-size: 16px;
    position: absolute;
    box-sizing: border-box;
    width: var(--cp-thumb-size);
    height: var(--cp-thumb-size);
    border-radius: 9999px;
    overflow: visible;
    border: 4px solid #ffffff;
    box-shadow: 0 0 0 1px var(--cm-control-knob-off-outline), inset 0 0 0 1px var(--cm-control-knob-off-outline);
    outline: 1px solid transparent;
    outline-offset: -2px;
}
.cm-color-thumb::before {
    content: "";
    position: absolute;
    z-index: -1;
    top: 0;
    left: -2px;
    width: 12px;
    height: 12px;
    border-radius: 9999px;
    box-shadow: var(--cm-elevation-300);
}
/* Mantine writes top: 1px inline on a slider thumb; the margin moves it to Figma's y+4. */
.cm-color-slider .cm-color-thumb { margin-top: 3px; }
.cm-color-slider:focus-visible .cm-color-thumb,
.cm-color-slider[data-state="focus"] .cm-color-thumb,
.cm-color-saturation:focus-visible .cm-color-thumb,
.cm-color-saturation[data-state="focus"] .cm-color-thumb {
    --cp-thumb-size: 20px;
    border-width: 6px;
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -2px;
}
.cm-color-slider:focus-visible .cm-color-thumb,
.cm-color-slider[data-state="focus"] .cm-color-thumb { margin-top: 1px; }

/* Mantine's own ColorPicker, themed onto the same parts. */
.cm-color-mantine-saturation {
    border-radius: 5px;
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
}
.cm-color-mantine-saturation .cm-color-saturation-overlay { border-radius: 5px; inset: 0; }

/* 7.5 Gradient editor: direction row, handles over a 32-tall bar, a Stops header, 32 rows. */
.cm-gradient {
    box-sizing: border-box;
    width: 100%;
    padding-bottom: 12px;
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-gradient-row {
    display: flex;
    align-items: center;
    gap: 8px;
    box-sizing: border-box;
    height: 32px;
    padding-inline: 16px 8px;
}
.cm-gradient-row > .cm-gradient-end { margin-inline-start: auto; }
/* The direction row is 48 tall with its controls at +12 (pm/color-picker-gradient-existing #150). */
.cm-gradient-direction { height: 48px; gap: 4px; }
.cm-gradient-angle { width: 96px; padding-inline: 8px; }
.cm-gradient-area {
    position: relative;
    margin: 0 16px;
    padding-top: 16px;
    direction: ltr;
}
.cm-gradient-bar {
    height: 32px;
    border-radius: 5px;
    background: linear-gradient(to right, var(--cm-gradient)), ${CHECKER};
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
}
.cm-gradient-handle {
    position: absolute;
    z-index: 1;
    top: 0;
    left: calc(var(--cm-offset) * 100% - 12px);
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 24px;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background-color: var(--cm-bg-secondary);
    cursor: default;
    touch-action: none;
}
.cm-gradient-handle::after {
    content: "";
    position: absolute;
    z-index: -1;
    bottom: -3px;
    left: 9px;
    width: 6px;
    height: 6px;
    border-radius: 1px;
    background-color: inherit;
    transform: rotate(45deg);
}
.cm-gradient-handle[data-state="focus"] {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-gradient-handle[data-selected] { background-color: var(--cm-bg-brand); }
.cm-gradient-handle-chit {
    box-sizing: border-box;
    width: 14px;
    height: 14px;
    border: 1px solid var(--cm-border-translucent);
    border-radius: 2px;
    background: linear-gradient(var(--cm-chit-color), var(--cm-chit-color)), ${CHECKER};
}
.cm-gradient-header {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 32px;
    margin-top: 8px;
    padding-inline: 16px 8px;
    ${cmFont("bodyStrong")}
}
.cm-gradient-header > :last-child { margin-inline-start: auto; }
.cm-gradient-stops { margin-top: 4px; }
.cm-gradient-stop[data-selected] { background-color: var(--cm-bg-selected); }
.cm-gradient-position { flex: none; width: 48px; padding-inline: 8px 0; }
/* A stop's colour: a paint field (7.2) holding the chit button that selects the stop and its hex
   box; the colour itself is picked in the editor's own picker, so nothing pops out. */
.cm-gradient-color { flex: 1 1 0; min-width: 0; }
.cm-gradient-color .cm-paint-chit { width: 16px; height: 16px; border-radius: 20%; }
/* The field chit writes --cs-size / --cs-radius inline, so the size is set directly. Its inner
   border is dropped at rest, as Figma's stop chit has none, and kept as the keyboard ring. */
.cm-gradient-color .cm-chit { width: 16px; height: 16px; border-radius: 20%; }
.cm-gradient-color .cm-chit::after { border-radius: 20%; }
.cm-gradient-color .cm-paint-chit:not(:focus-visible) .cm-chit::after { content: none; }
.cm-gradient-color .cm-paint-hex { margin-inline-start: 0; padding-inline-start: 4px; }
`;

export default css;
