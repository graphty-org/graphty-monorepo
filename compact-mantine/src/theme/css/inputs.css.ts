/**
 * The input family's CSS (design/figma-spec.md 6): Mantine's fields on the foundation's
 * `cm-field` / `cm-field-outlined`, the select trigger, the listbox on `cm-menu-surface` /
 * `cm-menu-row`, pill fields, and the package's own SearchInput, ComboInput and VariablePill.
 *
 * Mantine's field is three boxes: the Input wrapper (`cm-input-wrapper`, which also takes
 * `cm-field`), the input element (`cm-input`) and absolutely placed sections. Figma draws the
 * fill, radius and 1px outline slot on the wrapper and nothing on the input, so the input here
 * is borderless and transparent and the wrapper is the field.
 *
 * Colors are tokens only. The AA option needs nothing here: `cm-field` reads
 * `--cm-field-shadow` / `--cm-field-border`, which the AA token block switches.
 */
import { cmFont } from "../tokens";
import { ROW_UNLIT } from "./00-foundation.css";

const css = `
/* ---- The field (spec 6, shared rules) ---- */
.cm-input-wrapper {
    --input-color: var(--cm-text);
    --input-placeholder-color: var(--cm-text-tertiary);
    --input-section-color: var(--cm-text-secondary);
    --input-padding: 8px;
    --input-left-section-size: var(--input-left-section-width, var(--input-height));
    --input-right-section-size: var(--input-right-section-width, var(--input-height));
    --left-section-start: 0px;
    --right-section-end: 0px;
    --section-y: 0px;
    min-height: 0;
    border-radius: var(--input-radius);
}
[data-mantine-color-scheme] .cm-input-wrapper[data-error] {
    --input-color: var(--cm-text);
    --input-placeholder-color: var(--cm-text-tertiary);
    --input-section-color: var(--cm-text-secondary);
}
.cm-input-wrapper .cm-input {
    border: 0;
    background-color: transparent;
    color: var(--input-color);
    /* A value or placeholder longer than the field (a translated "Mixed") ends in an ellipsis
       instead of being cut mid-letter against the unit or the field's end. */
    text-overflow: ellipsis;
    font-weight: 450;
    letter-spacing: 0.055px;
    border-radius: inherit;
    transition: none;
}
.cm-input-wrapper .cm-input::placeholder,
.cm-input-wrapper .cm-input ::placeholder {
    color: var(--input-placeholder-color);
    opacity: 1;
}
.cm-input-wrapper .cm-input:disabled,
.cm-input-wrapper .cm-input[data-disabled],
.cm-input-wrapper .cm-input:has(input:disabled) {
    opacity: 1;
    background-color: transparent;
    color: var(--cm-text-disabled);
    cursor: default;
}
/* Disabled by its own prop, by a disabled fieldset around it (its inputs match :disabled), or by
   aria-disabled on it or around it. */
.cm-input-wrapper .cm-input:is(:disabled, [data-disabled], [aria-disabled="true"], [aria-disabled="true"] *),
.cm-input-wrapper .cm-input:is(:disabled, [data-disabled], [aria-disabled="true"], [aria-disabled="true"] *)::placeholder {
    color: var(--cm-text-disabled);
}
.cm-input-wrapper[data-disabled],
.cm-input-wrapper:is([aria-disabled="true"] *),
.cm-input-wrapper:has(:disabled) {
    --input-color: var(--cm-text-disabled);
    --input-placeholder-color: var(--cm-text-disabled);
    --input-section-color: var(--cm-text-disabled);
}
/* A disabled field's placeholder dims with its value (spec 6, bc/number-input-disabled): an
   empty disabled field otherwise reads exactly like an enabled one. Set on the pseudo-element
   itself, so a caller's inline --input-placeholder-color (PanelField sets one) cannot undo it. */
.cm-input-wrapper .cm-input:disabled::placeholder,
.cm-input-wrapper .cm-input:disabled ::placeholder,
.cm-input-wrapper:is([data-disabled], :has(:disabled)) .cm-input-inner::placeholder,
.cm-input-wrapper:is([data-disabled], :has(:disabled)) .cm-input-placeholder,
.cm-field:is([data-disabled], :has(:disabled)) ::placeholder {
    color: var(--cm-text-disabled);
}
.cm-input-wrapper .cm-input-section {
    color: var(--input-section-color);
}

/* States a story cannot reach with a pointer are forced with data-state="hover" | "focus" on the
   field or on its input (Mantine hands a field's data attributes to the input). */
.cm-field:is([data-state="hover"], :has([data-state="hover"])) {
    outline-color: var(--cm-field-edge-hover);
    box-shadow: none;
}
/* Filled hover paints its edge with the outline alone. The foundation's hover pairs the Figma
   outline (--cm-border) with the AA inset shadow, and an outline paints over a box-shadow, so in
   the AA option the lighter outline hid the darker hover edge. --cm-field-edge-hover is
   --cm-border in the Figma look (no visible change) and the AA hover edge in the AA option. The
   :where keeps this at the foundation's specificity so error, focus, disabled, search and the
   outlined field still win. */
:where(.cm-input-wrapper, .cm-var-field).cm-field:hover:where(:not(:focus-within, [data-error], [data-disabled], :has(:disabled))) {
    outline-color: var(--cm-field-edge-hover);
    box-shadow: none;
}
.cm-field:is([data-state="focus"], :has([data-state="focus"])) {
    outline-color: var(--cm-border-selected);
    box-shadow: none;
}
.cm-select.cm-field:is([data-state="hover"], :has([data-state="hover"])) {
    outline-color: transparent;
}

/* The outlined field (spec 6, "Outlined variant"): the 1px border is inside the 24px box, so the
   input loses 2px of height; its text starts 8 in (1 border + 7). */
.cm-field-outlined.cm-input-wrapper {
    --input-padding: 7px;
    padding-inline-start: 0;
    box-shadow: none;
}
.cm-field-outlined.cm-input-wrapper:hover,
.cm-field-outlined.cm-input-wrapper:focus-within {
    box-shadow: none;
}
/* The outlined field's edge is its border. Hover raises the border (a no-op in the Figma look,
   where --cm-field-edge-hover equals --cm-border; the AA option's darker edge), and neither hover
   nor disabled paints the outline slot over it, which would lighten the AA edge. */
.cm-field-outlined.cm-input-wrapper:hover:not(:focus-within):not([data-error]),
.cm-field-outlined.cm-input-wrapper:not([data-error]):is([data-state="hover"], :has([data-state="hover"])) {
    outline-color: transparent;
    border-color: var(--cm-field-edge-hover);
}
.cm-field-outlined.cm-input-wrapper:is([data-disabled], :has(:disabled)) {
    outline-color: transparent;
}
.cm-field-outlined.cm-input-wrapper:not([data-multiline]) > .cm-input {
    height: calc(var(--input-size) - 2px);
    min-height: 0;
}
.cm-field-outlined.cm-input-wrapper[data-multiline] > .cm-input {
    min-height: calc(var(--input-height) - 2px);
}

/* Label, description, error. The label is the field-row legend's visible text (a <legend> band
   16 tall holding a 9/14 500 caption, ii/number-input-default #24/#25), 4px above the field. */
.cm-field-label {
    display: flex;
    align-items: center;
    min-height: 16px;
    ${cmFont("captionStrong")}
    color: var(--cm-text-secondary);
    margin: 0 0 4px 0;
}
.cm-field-description {
    ${cmFont("legend")}
    color: var(--cm-text-secondary);
}
.cm-field-error {
    ${cmFont("legend")}
    color: var(--cm-text-danger);
}

/* ---- Select trigger (spec 6.4): the outlined field, text 9 in, a 24px caret slot; hover
   changes nothing; the ring shows on keyboard focus only. ---- */
.cm-select.cm-input-wrapper {
    --input-padding: 8px;
    --input-section-color: var(--cm-text-tertiary);
}
.cm-select.cm-input-wrapper[data-disabled],
.cm-select.cm-input-wrapper:has(:disabled) {
    --input-section-color: var(--cm-text-disabled);
}
.cm-select.cm-field:hover:not(:focus-within) {
    outline-color: transparent;
}
/* The trigger is a read-only input, which Chromium counts as :focus-visible even after a click;
   the modality attribute (ensureFocusModality) tells the two apart. */
:root[data-cm-modality="pointer"] .cm-select.cm-field:focus-within,
.cm-select.cm-field:focus-within:not(:has(:focus-visible)) {
    outline-color: transparent;
}
.cm-select.cm-field[data-error]:not(:focus-within) {
    outline-color: var(--cm-border-danger-strong);
}
.cm-select.cm-field:is([data-state="focus"], :has([data-state="focus"])) {
    outline-color: var(--cm-border-selected);
}
.cm-select .cm-input {
    cursor: default;
}
.cm-field-caret {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 10px;
    color: var(--cm-icon);
}
.cm-input-wrapper:is([data-disabled], :has(:disabled)) .cm-field-caret {
    color: var(--cm-text-disabled);
}
/* A disabled select keeps its caret, dimmed with its text (Figma, spec 6.4), and draws its edge in
   the disabled ink like every disabled field. */
.cm-select.cm-field-outlined.cm-input-wrapper:is([data-disabled], :has(:disabled)),
.cm-select.cm-field-outlined.cm-input-wrapper:is([data-disabled], :has(:disabled)):hover:not(:focus-within) {
    border-color: var(--cm-border-disabled);
}

/* ---- The listbox (spec 6.5): the menu surface, following the page's scheme ---- */
/* The surface restated at two classes: a Combobox dropdown is a Mantine Popover dropdown, so it
   also receives the Popover's theme classes (the light popover), which must not win here. */
.cm-listbox.cm-menu-surface {
    box-sizing: border-box;
    min-width: 0;
    max-width: calc(100vw - 12px);
    /* The list scrolls itself (no ScrollArea), clamped to the viewport less 6px each side; the
       menus' chevron rows (cm-menu) cover 24px at a scrollable end, so keyboard scrolling keeps
       the highlight clear of them. */
    max-height: calc(100vh - 12px);
    overflow-y: auto;
    scrollbar-width: none;
    scroll-padding-block: 24px;
    padding: 8px 0;
    border: 0;
    border-radius: 13px;
    background-color: var(--cm-bg-menu);
    color: var(--cm-text-menu);
    box-shadow: var(--cm-menu-shadow);
}
.cm-listbox .cm-listbox-option {
    gap: 4px;
    padding: 0 32px 0 12px;
    border-radius: 0;
    background: transparent;
    color: var(--cm-row-ink, var(--cm-text-menu));
    white-space: nowrap;
    opacity: 1;
    cursor: default;
}
.cm-listbox .cm-listbox-option:hover,
.cm-listbox .cm-listbox-option[data-combobox-selected],
.cm-listbox .cm-listbox-option[data-checked] {
    background: transparent;
    color: var(--cm-row-ink, var(--cm-text-menu));
}
.cm-listbox .cm-listbox-option[data-combobox-disabled] {
    opacity: 1;
    color: var(--cm-text-menu-disabled);
    cursor: default;
}
.cm-listbox .cm-listbox-option[data-combobox-disabled]::before {
    background: transparent;
}
.cm-listbox .cm-listbox-option[data-combobox-disabled] { ${ROW_UNLIT} }
/* Only one row is ever filled: the pointer's row, else the keyboard's, else the selected one. */
.cm-listbox:not(.cm-pointer-still):has(.cm-menu-row:hover) .cm-menu-row[data-combobox-selected]:not(:hover)::before,
.cm-listbox:has([data-combobox-selected]) .cm-menu-row[aria-selected="true"]:not([data-combobox-selected])::before,
.cm-listbox-multi .cm-menu-row[aria-selected="true"]:not(:hover):not([data-combobox-selected])::before {
    background: transparent;
}
/* A pointer that has not moved since the list opened is not hovering a choice: the
   row under it is not filled, and the selected row keeps its fill. The row still takes a press, so
   a click or a tap that comes with no move lands. */
.cm-listbox.cm-pointer-still .cm-menu-row:hover:not([data-combobox-selected], [aria-selected="true"])::before {
    background: transparent;
}
.cm-listbox:has(.cm-menu-row:hover) .cm-menu-row[data-combobox-selected]:not(:hover),
.cm-listbox:has([data-combobox-selected]) .cm-menu-row[aria-selected="true"]:not([data-combobox-selected]),
.cm-listbox-multi .cm-menu-row[aria-selected="true"]:not(:hover):not([data-combobox-selected]) { ${ROW_UNLIT} }
/* The check follows the value (data-checked), not aria-selected: Mantine's store moves
   aria-selected along with the keyboard highlight. */
.cm-listbox .cm-menu-row .cm-menu-row-check {
    opacity: 0;
}
.cm-listbox .cm-menu-row[data-checked] .cm-menu-row-check {
    opacity: 1;
}
/* A StyleSelect laid out as a grid (layout="grid"): one cell per option, its glyph over its name.
   The columns are set inline by the select; the fill keeps 2px from the cell's sides. The value in
   force carries the list's check, in the cell's top corner, so a grid and a list mark it alike. */
.cm-listbox .cm-listbox-grid {
    display: grid;
    padding: 0 8px;
}
.cm-listbox .cm-listbox-grid .cm-listbox-option {
    position: relative;
    flex-direction: column;
    justify-content: flex-start;
    align-items: center;
    gap: 2px;
    min-width: 64px;
    min-height: 52px;
    height: auto;
    padding: 4px;
}
.cm-listbox .cm-listbox-grid .cm-menu-row::before {
    inset: 0 2px;
}
.cm-listbox .cm-listbox-grid .cm-menu-row-check {
    position: absolute;
    inset-block-start: 2px;
    inset-inline-start: 4px;
}
/* A name is never cut: it wraps between words, and the columns are as wide as the longest word
   (the label's min-content). */
.cm-listbox .cm-listbox-grid .cm-listbox-label {
    width: min-content;
    min-width: 100%;
    font-size: 11px;
    line-height: 13px;
    text-align: center;
    white-space: normal;
    overflow: visible;
    text-overflow: clip;
}
.cm-listbox .cm-listbox-option-content {
    display: contents;
}
.cm-listbox .cm-listbox-glyph {
    display: inline-flex;
    flex: none;
    width: 24px;
    height: 24px;
    align-items: center;
    justify-content: center;
}
/* Any depth: a caller's glyph may wrap its svg (a catalog's markup in a span), and an svg left at
   its own size spills over the value's words. */
.cm-style-select-glyph svg,
.cm-listbox .cm-listbox-glyph svg {
    width: 100%;
    height: 100%;
}
.cm-listbox .cm-listbox-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
}
.cm-listbox .cm-listbox-group-label {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 32px;
    ${cmFont("body")}
    color: var(--cm-text-menu-secondary);
}
.cm-listbox .cm-listbox-group-label::after {
    display: none;
}
.cm-listbox .cm-listbox-group + .cm-listbox-group,
.cm-listbox .cm-listbox-separator {
    margin: 8px 0 0;
    padding-top: 8px;
    border: 0;
    border-top: 1px solid var(--cm-border-translucent);
}
.cm-listbox .cm-listbox-separator {
    height: 0;
    margin-bottom: 8px;
    padding: 0;
}
.cm-listbox .cm-listbox-empty {
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 16px;
    ${cmFont("body")}
    color: var(--cm-text-menu-secondary);
}

/* ---- Pill fields (spec 6.7): variable-pill shaped pills, 20 tall. ---- */
.cm-pills-field .cm-input {
    display: flex;
    align-items: center;
}
/* The text box beside the pills is one pill tall, so the field holds its size's height (the
   scale's padding leaves 20 inside at every size) until the pills wrap. Mantine draws it 1.6em,
   which overflowed every size above sm. Hidden and unfocused auto boxes are out of flow anyway. */
.cm-pills-field :is(.cm-input-pills-field, .mantine-PillsInputField-field) {
    height: 20px;
}
.cm-input-pills {
    column-gap: 4px;
    row-gap: 2px;
}
.cm-input-pill,
.cm-pills-field .mantine-Pill-root {
    box-sizing: border-box;
    height: 20px;
    margin: 0;
    padding: 0 4px;
    border: 1px solid var(--cm-border);
    border-radius: 5px;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    ${cmFont("body")}
}
/* The label fills the 18px inside the pill's 1px edges; its text centered in it. */
.cm-input-pill .mantine-Pill-label,
.cm-pills-field .mantine-Pill-root .mantine-Pill-label {
    line-height: 18px;
}
.cm-input-pill[data-with-remove],
.cm-pills-field .mantine-Pill-root[data-with-remove] {
    padding-inline-end: 0;
}

/* ---- PasswordInput, FileInput ---- */
.cm-input-inner {
    color: var(--input-color);
    font-weight: 450;
    letter-spacing: 0.055px;
}
.cm-input-inner::placeholder {
    color: var(--input-placeholder-color);
    opacity: 1;
}
.cm-input-placeholder {
    color: var(--input-placeholder-color);
}

/* ---- The clear (x) of a field ---- */
/* Mantine's InputClearButton writes an inline background: var(--input-bg), which beats any
   stylesheet background; setting the variable on the button itself is what reaches it. */
.cm-input-clear.cm-input-clear {
    --input-bg: transparent;
    background-color: transparent;
    color: var(--cm-icon-secondary);
}
.cm-input-clear.cm-input-clear:hover {
    --input-bg: var(--cm-bg-transparent-hover);
    background-color: var(--cm-bg-transparent-hover);
}

/* ---- SearchInput (spec 6.2) ---- */
.cm-search.cm-field,
.cm-search.cm-field:hover,
.cm-search.cm-field:focus-within {
    outline-offset: 0;
}
.cm-search.cm-field:hover:not(:focus-within),
.cm-search.cm-field:not(:focus-within):is([data-state="hover"], :has([data-state="hover"])) {
    outline-color: transparent;
    box-shadow: var(--cm-field-shadow);
}
[data-cm-linger] .cm-search.cm-field.cm-field.cm-field {
    outline-color: var(--cm-border-selected);
}
.cm-search .cm-search-icon {
    display: inline-flex;
    color: var(--cm-icon);
}
.cm-search-joined {
    display: flex;
    gap: 1px;
}
.cm-search-joined > :first-child {
    flex: 1 1 auto;
    min-width: 0;
}
.cm-search-joined .cm-search.cm-input-wrapper {
    border-radius: 5px 0 0 5px;
}
.cm-search-joined-end {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    border-radius: 0 5px 5px 0;
    background-color: var(--cm-bg-secondary);
}

/* ---- ComboInput (spec 6.3) ---- */
.cm-combo.cm-input-wrapper {
    --input-padding: 7px;
    --input-section-color: var(--cm-text-tertiary);
}
.cm-combo-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 100%;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 0 5px 5px 0;
    background: transparent;
    color: inherit;
    cursor: default;
}
.cm-combo-divided .cm-combo-chevron {
    width: 25px;
    border-inline-start: 1px solid var(--cm-bg);
}
.cm-combo-suffix {
    ${cmFont("body")}
    color: var(--cm-text-secondary);
    white-space: nowrap;
}

/* ---- Number field slot (spec 6.1): the scrub handle ---- */
.cm-scrub-slot {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--cm-text-secondary);
}
.cm-scrub-slot[data-scrub] {
    cursor: ew-resize;
    touch-action: none;
}
.cm-number-field .cm-input:not(:focus) {
    cursor: default;
}

/* ---- VariablePill (spec 6.6) ---- */
.cm-var-pill {
    display: inline-flex;
    align-items: center;
    box-sizing: border-box;
    height: 20px;
    max-width: 100%;
    margin: 0;
    padding: 0 4px;
    border: 1px solid var(--cm-border);
    border-radius: 5px;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    ${cmFont("body")}
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
}
.cm-var-pill:hover {
    background-color: var(--cm-bg-secondary-hover);
}
.cm-var-field {
    position: relative;
    display: flex;
    align-items: center;
    gap: 0;
    padding-inline-end: 3px;
}
/* A field with no glyph: the pill sits 2px in from the field's edge, as it does from its top. */
.cm-var-field:not(:has(> .cm-scrub-slot)) {
    padding-inline-start: 2px;
}
/* The pill and Detach ring themselves on keyboard focus, so the field around them does not ring
   too: one ring, on the control that has focus. The field still rings for its own input. */
.cm-var-field.cm-field:has(.cm-var-pill:focus-visible, .cm-var-detach:focus-visible) {
    outline-color: transparent;
}
.cm-var-field .cm-var-pill-slot {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    align-items: center;
}
/* The editable rest of a bound field (rs/apply-variable-radius-bound #73): flush after the pill,
   24 tall, transparent, the field's value type. */
.cm-var-field:has(.cm-var-input) .cm-var-pill-slot {
    flex: 0 1 auto;
}
.cm-var-input {
    flex: 1 1 0;
    min-width: 0;
    height: 24px;
    margin: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--cm-text);
    ${cmFont("body")}
    font-family: inherit;
}
/* Detach shows while the field is hovered or holds focus. It is never display:none, so the
   keyboard can reach it: at rest it is transparent (bound field) or 0 wide (fill row), and
   focusing it reveals it. */
.cm-var-detach {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--cm-icon);
    cursor: default;
    opacity: 0;
}
.cm-var-field .cm-var-detach {
    width: 16px;
    height: 16px;
}
.cm-var-fill .cm-var-detach {
    width: 0;
    height: 24px;
    margin-inline-start: -4px;
    overflow: hidden;
}
.cm-var-field:hover .cm-var-detach,
.cm-var-field:focus-within .cm-var-detach,
.cm-var-fill:hover .cm-var-detach,
.cm-var-fill:focus-within .cm-var-detach {
    opacity: 1;
}
.cm-var-fill:hover .cm-var-detach,
.cm-var-fill:focus-within .cm-var-detach {
    width: 24px;
    margin-inline-start: 0;
}
.cm-var-detach:hover {
    background-color: var(--cm-bg-transparent-hover);
}
.cm-var-fill {
    display: flex;
    gap: 4px;
    align-items: center;
}
.cm-var-fill-button {
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    align-items: center;
    gap: 5px;
    box-sizing: border-box;
    height: 24px;
    margin: 0;
    padding: 0 0 0 5px;
    border: 0;
    border-radius: 5px;
    outline: 1px solid var(--cm-border);
    outline-offset: -1px;
    background: transparent;
    color: var(--cm-text);
    ${cmFont("body")}
    text-align: start;
    cursor: default;
}
.cm-var-fill:hover .cm-var-fill-button {
    background-color: var(--cm-bg-hover);
}
.cm-var-fill-button:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -1px;
}
.cm-var-fill-button[data-kind="property"] {
    outline-color: transparent;
    background-color: var(--cm-bg-component-tertiary);
}
.cm-var-chit {
    flex: none;
    width: 14px;
    height: 14px;
    border-radius: 2px;
    box-shadow: inset 0 0 0 1px var(--cm-swatch-ring);
}
/* tone="component": the name drawn in the component purple, as the tree's component rows are. */
.cm-var-name[data-tone="component"],
.cm-var-pill[data-tone="component"] {
    color: var(--cm-text-component);
    font-weight: 600;
}
.cm-var-name {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
/* ---- FileSource: a URL field, a drop target or a button ---- */
.cm-file-source {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
}
.cm-file-source[data-variant="row"][data-over] .cm-file-url .cm-input-wrapper,
.cm-file-source[data-variant="row"][data-over] > .mantine-Button-root {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -1px;
}
.cm-file-drop-target {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    padding: 16px 8px;
    border: 1px dashed var(--cm-border);
    border-radius: 5px;
    color: var(--cm-icon-secondary);
}
.cm-file-source[data-over] .cm-file-drop-target {
    border-color: var(--cm-border-selected);
    background-color: var(--cm-bg-selected);
}
.cm-file-source[data-disabled] .cm-file-drop-target {
    border-color: var(--cm-border-disabled);
    color: var(--cm-icon-disabled);
}
.cm-file-drop-glyph {
    display: inline-flex;
}
`;

export default css;
