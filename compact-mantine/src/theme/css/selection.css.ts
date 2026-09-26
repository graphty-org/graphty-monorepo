/**
 * The selection package's CSS (design/figma-spec.md 4.2, 5): Checkbox, Radio, Switch,
 * SegmentedControl (panel, toolbar and loose), pill Tabs, Slider / RangeSlider, Anchor, NavLink,
 * Pagination, Stepper, Burger and the AlignmentMatrix.
 *
 * Every rule is keyed on a `cm-*` class the theme extensions hand to Mantine through
 * `classNames` (../styles/controls.ts, ../styles/navigation.ts) or that a component of this
 * package renders itself. Colours are tokens only, so light, dark and the AA option need no
 * rule of their own.
 *
 * Specificity: Mantine's stylesheet loads first and ours is appended after it, so a rule of the
 * same specificity wins. Where Mantine writes a state with two classes or a pseudo class
 * (`.m_x:checked`, `.m_x:hover`), the rule here carries at least as much.
 *
 * `[data-cm-state="hover" | "pressed"]` forces the hover and pressed looks, for the States
 * stories and visual tests (pseudo classes cannot be forced); it goes on the element the state
 * belongs to (the input of a Checkbox, Radio or Switch, the tab, the link).
 */
import { cmFont } from "../tokens";

const css = `
/* Mouse focus: Mantine's .mantine-focus-never:focus { outline: none } would drop the resting
   transparent ring slot on a pressed control; keep it, so only :focus-visible paints a ring. */
.cm-checkbox-input:focus:not(:focus-visible),
.cm-radio-input:focus:not(:focus-visible),
.cm-tab:focus:not(:focus-visible),
.cm-anchor:focus:not(:focus-visible),
.cm-navlink:focus:not(:focus-visible),
.cm-slider-thumb:focus:not(:focus-visible) { outline: 1px solid transparent; }
.cm-anchor[data-variant="secondary"]:focus:not(:focus-visible) { outline-width: 2px; }
/* ---------------------------------------------------------------- labels (5.4 - 5.6) */
.cm-checkbox-body,
.cm-radio-body,
.cm-switch-body { align-items: flex-start; }
.cm-checkbox-inner,
.cm-radio-inner { margin: 4px 0; flex: none; }
.cm-checkbox-label,
.cm-radio-label,
.cm-switch-label {
    ${cmFont("body")}
    color: var(--cm-text);
    padding-block: 4px;
    padding-inline-start: 8px;
}
.cm-checkbox-label[data-disabled],
.cm-radio-label[data-disabled],
.cm-switch-label[data-disabled] { color: var(--cm-text-disabled); }
.cm-control-description {
    ${cmFont("body")}
    color: var(--cm-text-secondary);
    margin-top: 0;
    padding-inline-start: 8px;
}
.cm-control-error {
    ${cmFont("body")}
    color: var(--cm-text-danger);
    padding-inline-start: 8px;
}

/* ---------------------------------------------------------------- Checkbox (5.4) */
.cm-checkbox-input {
    box-sizing: border-box;
    border: 1px solid var(--cm-border-translucent-strong);
    border-radius: 2px;
    background-color: var(--cm-bg-secondary);
    outline: 1px solid transparent;
    outline-offset: 1px;
    transition: none;
    cursor: default;
}
/* Neutral checked keeps the unchecked face (Mantine paints :checked with the primary colour). */
.cm-checkbox[data-variant="neutral"] .cm-checkbox-input:is(:checked, [data-indeterminate]) {
    background-color: var(--cm-bg-secondary);
    border-color: var(--cm-border-translucent-strong);
}
/* The forced states carry .cm-checkbox so they outrank the neutral checked rule above, as the
   real :hover and :active rules do. */
.cm-checkbox-body:hover .cm-checkbox-input:not(:disabled),
.cm-checkbox .cm-checkbox-input[data-cm-state="hover"]:not(:disabled) {
    background-color: var(--cm-bg-secondary-hover);
}
.cm-checkbox-body:active .cm-checkbox-input:not(:disabled),
.cm-checkbox .cm-checkbox-input[data-cm-state="pressed"]:not(:disabled) {
    background-color: var(--cm-bg-secondary-pressed);
}
.cm-checkbox-input:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
/* The blue (filled, default) variant. */
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-input:is(:checked, [data-indeterminate]) {
    background-color: var(--cm-bg-brand);
    border-color: var(--cm-border-translucent);
    transition: background-color var(--cm-duration-sm) var(--cm-ease-in-out);
}
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-body:hover .cm-checkbox-input:is(:checked, [data-indeterminate]):not(:disabled),
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-input:is(:checked, [data-indeterminate])[data-cm-state="hover"]:not(:disabled) {
    background-color: var(--cm-bg-brand);
    border-color: var(--cm-border-translucent-strong);
}
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-body:active .cm-checkbox-input:is(:checked, [data-indeterminate]):not(:disabled),
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-input:is(:checked, [data-indeterminate])[data-cm-state="pressed"]:not(:disabled) {
    background-color: var(--cm-bg-brand-hover);
    border-color: var(--cm-border-translucent-strong);
}
.cm-checkbox-input:disabled,
.cm-checkbox .cm-checkbox-input:disabled:not(:checked):not([data-indeterminate]),
.cm-checkbox[data-variant="neutral"] .cm-checkbox-input:disabled:is(:checked, [data-indeterminate]) {
    background-color: transparent;
    border-color: var(--cm-border-disabled);
    cursor: not-allowed;
}
.cm-checkbox:not([data-variant="neutral"]) .cm-checkbox-input:disabled:is(:checked, [data-indeterminate]) {
    background-color: var(--cm-bg-disabled);
    border-color: transparent;
}
/* The glyph: no pop-in; the tick draws itself in over 100ms when the box is checked, and only
   then (unchecking is instant). */
.cm-checkbox-icon {
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    transform: none;
    transition: none;
    color: var(--cm-text-onbrand);
}
.cm-checkbox-input:is(:checked, [data-indeterminate]) + .cm-checkbox-icon { opacity: 1; transform: none; }
.cm-checkbox-halo,
.cm-checkbox-glyph {
    stroke-dasharray: 12;
    stroke-dashoffset: 12;
    transition: none;
}
.cm-checkbox-glyph { stroke: currentColor; stroke-width: 1.5px; }
.cm-checkbox-halo { stroke: var(--cm-control-icon-outline); stroke-width: 4px; }
.cm-checkbox-input:is(:checked, [data-indeterminate]) + .cm-checkbox-icon :is(.cm-checkbox-halo, .cm-checkbox-glyph) {
    stroke-dashoffset: 0;
    transition: stroke-dashoffset var(--cm-duration-sm) var(--cm-ease-in-out);
}
.cm-checkbox-input:disabled + .cm-checkbox-icon { color: var(--cm-icon-ondisabled); }
.cm-checkbox-input:disabled + .cm-checkbox-icon .cm-checkbox-halo { display: none; }
/* The neutral (panel) variant stays grey when checked; its glyph is the ink. */
.cm-checkbox[data-variant="neutral"] .cm-checkbox-icon { color: var(--cm-icon); }
.cm-checkbox[data-variant="neutral"] .cm-checkbox-halo { display: none; }
.cm-checkbox[data-variant="neutral"] .cm-checkbox-input:disabled + .cm-checkbox-icon { color: var(--cm-icon-disabled); }

/* ---------------------------------------------------------------- Radio (5.6) */
.cm-radio-input {
    box-sizing: border-box;
    border: 1px solid var(--cm-border-translucent-strong);
    background-color: var(--cm-bg-secondary);
    outline: 1px solid transparent;
    outline-offset: 1px;
    transition: none;
    cursor: default;
}
.cm-radio-body:hover .cm-radio-input:not(:disabled):not(:checked),
.cm-radio-input[data-cm-state="hover"]:not(:disabled):not(:checked) { background-color: var(--cm-bg-secondary-hover); }
.cm-radio-body:active .cm-radio-input:not(:disabled):not(:checked),
.cm-radio-input[data-cm-state="pressed"]:not(:disabled):not(:checked) { background-color: var(--cm-bg-secondary-pressed); }
.cm-radio-input:checked {
    background-color: var(--cm-bg-brand);
    border-color: var(--cm-border-translucent);
}
.cm-radio-body:active .cm-radio-input:checked:not(:disabled),
.cm-radio-input:checked[data-cm-state="pressed"]:not(:disabled) { background-color: var(--cm-bg-brand-hover); }
.cm-radio-input:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-radio-input:disabled {
    background-color: transparent;
    border-color: var(--cm-border-disabled);
    cursor: not-allowed;
}
.cm-radio-input:disabled:checked {
    background-color: var(--cm-bg-disabled);
    border-color: transparent;
}
.cm-radio-icon { color: var(--cm-text-onbrand); transition: none; }
.cm-radio-input:checked + .cm-radio-icon { --radio-icon-transform: none; }
.cm-radio-input:disabled + .cm-radio-icon { color: var(--cm-icon-ondisabled); }

/* ---------------------------------------------------------------- Switch (5.5) */
.cm-switch-track {
    box-sizing: border-box;
    width: var(--switch-width);
    min-width: var(--switch-width);
    height: var(--switch-height);
    margin: 4px 0;
    border: 1px solid var(--cm-border-translucent-strong);
    border-radius: 9999px;
    background-color: var(--cm-bg-secondary);
    transition: background-color var(--cm-duration-sm) var(--cm-ease-in-out);
    cursor: default;
}
.cm-switch-body:hover .cm-switch-input:not(:checked):not([data-indeterminate]):not(:disabled) + .cm-switch-track,
.cm-switch-input[data-cm-state="hover"]:not(:checked):not([data-indeterminate]):not(:disabled) + .cm-switch-track {
    background-color: var(--cm-bg-secondary-hover);
}
.cm-switch-body:active .cm-switch-input:not(:checked):not([data-indeterminate]):not(:disabled) + .cm-switch-track,
.cm-switch-input[data-cm-state="pressed"]:not(:checked):not([data-indeterminate]):not(:disabled) + .cm-switch-track {
    background-color: var(--cm-bg-secondary-pressed);
}
.cm-switch-input:is(:checked, [data-indeterminate]) + .cm-switch-track { background-color: var(--cm-bg-brand); }
/* Mantine's own 2px ring on the track (.m_x:focus-visible + .m_y) outranks the foundation's
   cm-focus-switch rule, so the 1px strong ring is restated here at Mantine's specificity. */
.cm-switch-input:focus-visible + .cm-switch-track {
    outline: 1px solid var(--cm-border-selected-strong);
    outline-offset: 1px;
}
.cm-switch-body:active .cm-switch-input:is(:checked, [data-indeterminate]):not(:disabled) + .cm-switch-track,
.cm-switch-input:is(:checked, [data-indeterminate])[data-cm-state="pressed"]:not(:disabled) + .cm-switch-track {
    background-color: var(--cm-bg-brand-hover);
}
.cm-switch-input:disabled + .cm-switch-track {
    background-color: transparent;
    border-color: var(--cm-border-disabled);
    cursor: not-allowed;
}
.cm-switch-input:disabled:is(:checked, [data-indeterminate]) + .cm-switch-track {
    background-color: var(--cm-bg-disabled);
    border-color: transparent;
}
/* The knob: a 12 x 8 pill at x+4 (off) or x+16 (on) of the track's outer edge. */
.cm-switch-thumb {
    box-sizing: border-box;
    width: calc(var(--switch-thumb-size) * 1.5);
    height: var(--switch-thumb-size);
    inset-inline-start: calc(var(--switch-height) / 4 - 1px);
    border-radius: 9999px;
    background-color: var(--cm-text-onbrand);
    box-shadow: 0 0 0 1px var(--cm-control-knob-off-outline);
    transition: inset-inline-start var(--cm-duration-sm) var(--cm-ease-out);
}
.cm-switch-input:checked + * > .cm-switch-thumb {
    inset-inline-start: calc(var(--switch-width) - var(--switch-thumb-size) * 1.5 - var(--switch-height) / 4 - 1px);
    box-shadow: 0 0 0 1px var(--cm-control-icon-outline);
}
/* Mixed: a 10 x 2 bar centred in the track. */
.cm-switch-input[data-indeterminate] + * > .cm-switch-thumb {
    width: calc(var(--switch-thumb-size) * 1.25);
    height: 2px;
    inset-inline-start: calc(50% - var(--switch-thumb-size) * 0.625);
    box-shadow: none;
}
.cm-switch-input:disabled:not(:checked):not([data-indeterminate]) + * > .cm-switch-thumb {
    background-color: var(--cm-icon-disabled);
    box-shadow: none;
}
.cm-switch-input:disabled:is(:checked, [data-indeterminate]) + * > .cm-switch-thumb { box-shadow: none; }

/* ---------------------------------------------------------------- SegmentedControl (5.2, 5.3) */
/* The panel track: Figma's segmented control, the default. */
.cm-sc {
    box-sizing: border-box;
    min-height: 24px;
    padding: 0;
    gap: 0;
    border-radius: 5px;
    background-color: var(--cm-bg-secondary);
    overflow: visible;
}
.cm-sc-indicator { display: none; }
.cm-sc-control { flex: 1 1 0; min-width: 0; }
.cm-sc[data-content-width] .cm-sc-control { flex: 1 1 auto; min-width: 24px; }
.cm-sc[data-content-width] .cm-sc-label { padding-inline: 0; }
.cm-sc .cm-sc-label {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 24px;
    padding: var(--sc-padding);
    border-radius: 5px;
    ${cmFont("body")}
    font-size: var(--sc-font-size);
    color: var(--cm-text-secondary);
    background-color: transparent;
    outline: 1px solid transparent;
    outline-offset: 1px;
    transition: none;
    cursor: default;
}
.cm-sc .cm-sc-label[data-active] {
    color: var(--cm-text);
    background-color: var(--cm-bg);
    box-shadow: inset 0 0 0 1px var(--cm-segment-edge);
}
.cm-sc .cm-sc-label[data-active]::before { display: none; }
.cm-sc .cm-sc-label[data-disabled],
.cm-sc .cm-sc-label[data-read-only]:not([data-active]) { color: var(--cm-icon-disabled); }
.cm-sc .cm-sc-input:focus-visible + .cm-sc-label {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-sc-inner { display: inline-flex; align-items: center; justify-content: center; gap: 4px; min-width: 0; }

/* The toolbar mode switch: a padded track and a raised thumb under the selected option. */
.cm-sc[data-variant="toolbar"] {
    min-height: 32px;
    padding: 2px;
    gap: 2px;
    background-color: var(--cm-bg-mode-switcher);
}
.cm-sc[data-variant="toolbar"] .cm-sc-control { flex: 0 0 28px; }
.cm-sc[data-variant="toolbar"] .cm-sc-label {
    width: 28px;
    height: 28px;
    padding: 0;
    border-radius: 3px;
    color: var(--cm-icon-secondary);
    outline-offset: -1px;
}
.cm-sc[data-variant="toolbar"] .cm-sc-label:not([data-active]):not([data-disabled]):hover,
.cm-sc[data-variant="toolbar"] .cm-sc-label[data-cm-state="hover"]:not([data-active]) {
    background-color: var(--cm-bg-mode-switcher-hover);
}
.cm-sc[data-variant="toolbar"] .cm-sc-label[data-active] {
    color: var(--cm-icon-brand);
    background-color: var(--cm-bg);
    /* The capture's own shadow (segmented-toolbelt-mode--default): its first blur is 1px, where
       --cm-elevation-100 has 0.5px. */
    box-shadow: rgba(0, 0, 0, 0.3) 0 0 1px, rgba(0, 0, 0, 0.15) 0 1px 3px;
}
.cm-sc[data-variant="toolbar"] .cm-sc-input:focus-visible + .cm-sc-label { outline-offset: -1px; }

/* The loose group: separate 24 x 24 options 4 apart, no track. */
.cm-sc[data-variant="loose"] {
    gap: 4px;
    background-color: transparent;
}
.cm-sc[data-variant="loose"] .cm-sc-control { flex: 0 0 24px; }
.cm-sc[data-variant="loose"] .cm-sc-label {
    width: 24px;
    padding: 0;
    color: var(--cm-icon-secondary);
}
.cm-sc[data-variant="loose"] .cm-sc-label[data-active],
.cm-sc[data-variant="loose"] .cm-sc-label:not([data-disabled]):hover,
.cm-sc[data-variant="loose"] .cm-sc-label[data-cm-state="hover"] {
    color: var(--cm-icon);
    background-color: var(--cm-bg-secondary);
    box-shadow: none;
}
.cm-sc[data-variant="loose"] .cm-sc-input:focus-visible + .cm-sc-label {
    outline: 2px solid var(--cm-border-selected);
    outline-offset: -2px;
}

/* ---------------------------------------------------------------- Tabs (5.1) */
.cm-tab { ${cmFont("body")} }
.cm-tabs[data-variant="pills"] .cm-tabs-list { gap: 4px; }
.cm-tabs[data-variant="pills"] .cm-tab {
    box-sizing: border-box;
    height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: 5px;
    color: var(--cm-text-secondary);
    background-color: var(--cm-bg);
    outline: 1px solid transparent;
    outline-offset: 1px;
    cursor: default;
}
.cm-tabs[data-variant="pills"] .cm-tab:not([data-active]):not([data-disabled]):hover,
.cm-tabs[data-variant="pills"] .cm-tab[data-cm-state="hover"]:not([data-active]) {
    background-color: var(--cm-bg-hover);
}
.cm-tabs[data-variant="pills"] .cm-tab[data-active][data-active] {
    color: var(--cm-text);
    background-color: var(--cm-bg-secondary);
    font-weight: 550;
}
.cm-tabs[data-variant="pills"] .cm-tab:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-tabs[data-variant="pills"][data-orientation="vertical"] .cm-tabs-list { gap: 0; }
.cm-tabs[data-variant="pills"][data-orientation="vertical"] .cm-tab { width: 100%; justify-content: flex-start; }
/* The underline tabs (variant="default"), kept on the tokens. */
.cm-tabs[data-variant="default"] .cm-tab { padding: 6px 10px; color: var(--cm-text-secondary); }
.cm-tabs[data-variant="default"] .cm-tab[data-active] { color: var(--cm-text); }
.cm-tabs:not([data-variant="pills"]) .cm-tab:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -1px;
}
/* The label reserves the width of its bold form: an empty aria-hidden span (added by the
   theme's renderRoot, src/components/selection/tab-root.tsx) draws the text at weight 550 with
   no height and no visibility, under the visible text. */
.cm-tab-label {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    line-height: 16px;
}
.cm-tab-reserve { height: 0; overflow: hidden; visibility: hidden; pointer-events: none; user-select: none; }
.cm-tab-reserve::after { content: attr(data-text); font-weight: 550; }

/* ---------------------------------------------------------------- Slider, RangeSlider (5.8) */
.cm-slider { --slider-color: var(--cm-bg-brand); }
.cm-slider-track::before {
    background-color: var(--cm-bg-secondary);
    box-shadow: inset 0 0 0 1px var(--cm-border-translucent-strong);
}
.cm-slider-bar { background-color: var(--cm-bg-brand); }
.cm-slider .cm-slider-thumb {
    box-sizing: border-box;
    border: 2px solid var(--cm-text-onbrand);
    color: var(--cm-text-onbrand);
    background-color: var(--cm-text-onbrand);
    box-shadow: 0 0 0 1px var(--cm-control-knob-off-outline), inset 0 0 0 1px var(--cm-control-knob-off-outline), var(--cm-elevation-300);
    outline: 1px solid transparent;
    outline-offset: -2px;
    transition: none;
    cursor: default;
}
.cm-slider .cm-slider-thumb[data-dragging] { transform: translate(-50%, -50%); }
.cm-slider .cm-slider-thumb:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -2px;
}
.cm-slider[data-disabled] .cm-slider-track::before,
.cm-slider-track[data-disabled]::before {
    background-color: var(--cm-bg);
    box-shadow: inset 0 0 0 1px var(--cm-border-disabled);
}
.cm-slider-bar[data-disabled] { background-color: var(--cm-bg-disabled); }
.cm-slider .cm-slider-thumb[data-disabled] {
    display: flex;
    border-color: var(--cm-icon-ondisabled);
    background-color: var(--cm-icon-ondisabled);
}
.cm-slider-mark { border-width: 1px; border-color: var(--cm-border-translucent-strong); background-color: var(--cm-bg); }
.cm-slider-mark[data-filled] { border-color: var(--cm-bg-brand); }
.cm-slider-mark-label { ${cmFont("caption")} margin-top: 2px; color: var(--cm-text-secondary); }

/* ---------------------------------------------------------------- Anchor (4.2) */
.cm-anchor {
    position: relative;
    isolation: isolate;
    ${cmFont("body")}
    color: var(--cm-text-brand);
    text-decoration: none;
    border-radius: 2px;
    outline: 1px solid transparent;
    outline-offset: 0;
    cursor: pointer;
}
.cm-anchor:hover { text-decoration: none; }
.cm-anchor:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 0;
}
/* Pressed: a pill behind the text, 4 above and below, 8 each side. */
.cm-anchor::before {
    content: "";
    position: absolute;
    inset: -4px -8px;
    z-index: -1;
    border-radius: 5px;
    background-color: transparent;
    pointer-events: none;
}
.cm-anchor:not([data-variant="secondary"]):active::before,
.cm-anchor:not([data-variant="secondary"])[data-cm-state="pressed"]::before { background-color: var(--cm-bg-selected); }
/* The secondary link ("Drafts"): grey, a hover pill of its own, a 2px inner ring. */
.cm-anchor[data-variant="secondary"] {
    display: inline-block;
    padding: 0 4px;
    border-radius: 5px;
    color: var(--cm-text-secondary);
    outline: 2px solid transparent;
    outline-offset: -2px;
}
.cm-anchor[data-variant="secondary"]:hover,
.cm-anchor[data-variant="secondary"][data-cm-state="hover"] {
    color: var(--cm-text);
    background-color: var(--cm-bg-hover);
}
.cm-anchor[data-variant="secondary"]:focus-visible {
    outline: 2px solid var(--cm-border-selected);
    outline-offset: -2px;
}

/* ---------------------------------------------------------------- NavLink (5.9) */
/* A 32 row holding a 24 pill inset 8 each side; text 16 in. */
.cm-navlink {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    min-height: 32px;
    padding: 4px 16px;
    ${cmFont("body")}
    color: var(--cm-text);
    background-color: transparent;
    border-radius: 5px;
    outline: 1px solid transparent;
    outline-offset: 0;
    cursor: default;
}
.cm-navlink::before {
    content: "";
    position: absolute;
    inset: 4px 8px;
    z-index: -1;
    border-radius: 5px;
    background-color: transparent;
}
.cm-navlink.cm-navlink:hover,
.cm-navlink.cm-navlink:is([data-active], [aria-current="page"]),
.cm-navlink.cm-navlink:is([data-active], [aria-current="page"]):hover { background-color: transparent; color: var(--cm-text); }
.cm-navlink:not([data-disabled]):hover::before,
.cm-navlink[data-cm-state="hover"]::before { background-color: var(--cm-bg-hover); }
.cm-navlink:is([data-active], [aria-current="page"])::before { background-color: var(--cm-bg-secondary); }
.cm-navlink:is([data-active], [aria-current="page"]) .cm-navlink-label { font-weight: 550; }
.cm-navlink:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 0;
}
.cm-navlink-label { font-size: 11px; line-height: 16px; }
.cm-navlink-description { ${cmFont("body")} color: var(--cm-text-secondary); }
.cm-navlink-section { color: var(--cm-icon-secondary); }

/* ---------------------------------------------------------------- Pagination (5.9) */
.cm-pagination-control {
    border: 0;
    border-radius: 5px;
    ${cmFont("body")}
    font-size: var(--pagination-control-fz);
    color: var(--cm-text);
    background-color: transparent;
    cursor: default;
}
.cm-pagination-control.cm-pagination-control:not([data-disabled]):not([data-active]):hover { background-color: var(--cm-bg-transparent-hover); }
.cm-pagination-control.cm-pagination-control:not([data-disabled]):not([data-active]):active { background-color: var(--cm-bg-transparent-pressed); }
.cm-pagination-control.cm-pagination-control[data-active] {
    color: var(--cm-text);
    background-color: var(--cm-bg-secondary);
    font-weight: 550;
}
.cm-pagination-control.cm-pagination-control:disabled,
.cm-pagination-control[data-disabled] {
    color: var(--cm-icon-disabled);
    background-color: transparent;
    opacity: 1;
}
.cm-pagination-dots { color: var(--cm-icon-secondary); }

/* ---------------------------------------------------------------- Stepper (5.9) */
.cm-stepper-icon {
    border: 0;
    background-color: var(--cm-bg-secondary);
    color: var(--cm-text);
    ${cmFont("body")}
    font-size: var(--stepper-fz);
}
.cm-stepper-step[data-progress] .cm-stepper-icon,
.cm-stepper-step[data-completed] .cm-stepper-icon,
.cm-stepper-icon:is([data-progress], [data-completed]) {
    background-color: var(--cm-bg-brand);
    color: var(--cm-text-onbrand);
}
.cm-stepper-label { ${cmFont("body")} font-size: var(--stepper-fz); color: var(--cm-text); }
.cm-stepper-description { ${cmFont("body")} color: var(--cm-text-secondary); }
.cm-stepper-separator { background-color: var(--cm-border); }
.cm-stepper-separator[data-active] { background-color: var(--cm-bg-brand); }
.cm-stepper-step:focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}

/* ---------------------------------------------------------------- Burger (5.9) */
.cm-burger { --burger-color: var(--cm-icon); border-radius: 5px; }
.cm-burger:hover { background-color: var(--cm-bg-transparent-hover); }

/* ---------------------------------------------------------------- AlignmentMatrix (5.7) */
.cm-align {
    position: relative;
    box-sizing: border-box;
    width: 88px;
    height: 56px;
    margin: 0;
    padding: 0;
    border: 4px solid transparent;
    border-inline-width: 0;
    border-radius: 5px;
    background-color: var(--cm-bg-secondary);
    outline: 1px solid transparent;
    outline-offset: 0;
}
.cm-align:has(:focus-visible) {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 0;
}
.cm-align-grid {
    position: absolute;
    inset: 1px;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(3, 1fr);
}
.cm-align-cell {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 0;
    min-height: 0;
    cursor: default;
}
.cm-align-cell input {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    margin: 0;
    opacity: 0;
    cursor: default;
}
/* The pointer reaches the radio through the drawing, so the radio's tooltip opens anywhere in
   the cell. */
.cm-align-dot,
.cm-align-bars { pointer-events: none; }
.cm-align-dot {
    width: 2px;
    height: 2px;
    border-radius: 2px;
    background-color: var(--cm-text-tertiary);
    pointer-events: none;
}
/* The bars: a 16 x 16 indicator with padding 3, three bars 2 apart. */
.cm-align-bars {
    box-sizing: border-box;
    display: none;
    width: 16px;
    height: 16px;
    padding: 3px;
    gap: 2px;
    flex-direction: column;
    align-items: var(--cm-align-cross, flex-start);
    color: var(--cm-icon-secondary);
    pointer-events: none;
}
.cm-align[data-direction="horizontal"] .cm-align-bars { flex-direction: row; }
.cm-align-bar {
    box-sizing: border-box;
    flex: none;
    border-radius: 2px;
    background-color: currentColor;
}
.cm-align[data-direction="vertical"] .cm-align-bar { width: var(--cm-bar); height: 2px; }
.cm-align[data-direction="horizontal"] .cm-align-bar { width: 2px; height: var(--cm-bar); }
.cm-align-cell:is(:hover, [data-cm-state="hover"]):not([data-checked]) .cm-align-bars,
.cm-align-cell[data-checked] .cm-align-bars { display: flex; }
.cm-align-cell:is(:hover, [data-cm-state="hover"]):not([data-checked]) .cm-align-dot,
.cm-align-cell[data-checked] .cm-align-dot { display: none; }
.cm-align-cell[data-checked] .cm-align-bars { color: var(--cm-text-brand); }
.cm-align-cell[data-checked] .cm-align-bar { border: 1px solid currentColor; }
.cm-align[data-disabled] .cm-align-cell[data-checked] .cm-align-bars { color: var(--cm-icon-disabled); }
.cm-align[data-disabled] .cm-align-cell:not([data-checked]) .cm-align-bars { display: none; }
.cm-align[data-disabled] .cm-align-cell:not([data-checked]) .cm-align-dot { display: block; }
`;

export default css;
