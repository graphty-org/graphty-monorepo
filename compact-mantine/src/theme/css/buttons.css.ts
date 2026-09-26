/**
 * The button family's CSS (design/figma-spec.md 4.1, 4.3-4.7): Button, ActionIcon (ghost, open,
 * highlighted, filled, joined), ActionIcon.Group, CloseButton, ToggleIconButton and SplitButton.
 *
 * Colors are never written here: each variant's colors arrive as variables from the theme's
 * vars resolvers (../styles/buttons.ts), and the states Mantine has no variable for read the
 * `--cm-btn-*` / `--cm-ai-*` ones. Every state selector also accepts `[data-state="hover" |
 * "press" | "focus"]`, so the States stories can show a state a pseudo class cannot be forced
 * into.
 *
 * Specificity: Mantine's own rules are one class plus `:where()`; ours are at least one class plus
 * one attribute or pseudo class, and this sheet is appended after Mantine's.
 */
import { cmFont } from "../tokens";

const HOVER = ':is(:hover, [data-state="hover"])';
const PRESSED = ':is(:active, [data-state="press"])';
const FOCUS = ':is(:focus-visible, [data-state="focus"])';
const ENABLED = ":not(:disabled, [data-disabled], [data-loading])";
const DISABLED = ":is(:disabled, [data-disabled]):not([data-loading])";
/** Variants that keep a gray (or danger) edge, so their focus ring moves onto ::before. */
const EDGED_BUTTON = ':is([data-variant="default"], [data-variant="outline"], [data-variant="danger-outline"])';
const EDGED_ICON = ':is([data-variant="default"], [aria-haspopup]:not([aria-haspopup="false"]))';
/** An icon button showing the "on" look: its popover is open, or it is a pressed toggle. */
const ON = ':is([aria-expanded="true"], [aria-pressed="true"])';
/** Icon buttons inside a joined group take the joined look unless they asked for another. */
const JOINED = '.cm-ai-group > .cm-action-icon:is([data-variant="subtle"], [data-variant="default"], [data-variant="joined"])';

const css = `
/* ---------- Button (4.1) ---------- */
.cm-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    overflow: visible;
    font-size: var(--button-fz);
    line-height: 16px;
    font-weight: 450;
    letter-spacing: 0.055px;
    cursor: default;
}
/* The resting outline slot (and the secondary's gray edge). Keyed on :not(:focus-visible) so that
   Mantine's .mantine-focus-never:focus { outline: none }, which has one class and one pseudo
   class too, cannot erase it when a mouse press focuses the button. */
.cm-button:not(:focus-visible) {
    outline: 1px solid var(--cm-btn-outline, transparent);
    outline-offset: -1px;
}
.cm-button:where([data-block]) { display: flex; }
.cm-button:where([data-with-left-section], [data-with-right-section]) { padding: 0; }
.cm-button-inner { transition: opacity var(--cm-duration-md) var(--cm-ease-loading); }
/* The label carries the inset, so the button reports padding 0 (C7). */
.cm-button-label { margin-inline: var(--button-padding-x); }
/* An icon: a 24 slot pulled 4px into the start inset. */
.cm-button-section[data-position="left"] {
    width: 24px;
    height: 24px;
    justify-content: center;
    margin-inline: -4px 0;
}
/* A shortcut: 4px after the label, in the variant's secondary ink, and the label's own inset
   after it. Figma's specimen ends the shortcut flush with the button's edge, its last letter
   touching the fill (bc/btn-primary-md-shortcut); the end keeps the size's inset instead. */
.cm-button-section[data-position="right"] {
    margin-inline: 0 var(--button-padding-x);
    padding-inline-start: 4px;
    color: var(--cm-btn-shortcut, inherit);
}
.cm-button${HOVER}${ENABLED} {
    background-color: var(--button-hover);
    color: var(--button-hover-color, var(--button-color));
}
.cm-button${PRESSED}${ENABLED} {
    background-color: var(--cm-btn-pressed, var(--button-hover));
    color: var(--cm-btn-pressed-color, var(--button-color));
}
.cm-button${PRESSED}${ENABLED} .cm-button-section[data-position="right"] { color: var(--cm-btn-pressed-color); }
.cm-button${FOCUS} {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
/* Mantine's loading shimmer lives on ::before; it becomes the focus ring of the edged looks. */
.cm-button::before {
    inset: 0;
    transform: none;
    opacity: 1;
    filter: none;
    background: none;
    transition: none;
    border-radius: inherit;
    outline: 1px solid transparent;
    outline-offset: 1px;
}
.cm-button${EDGED_BUTTON}${FOCUS} {
    outline: 1px solid var(--cm-btn-outline, transparent);
    outline-offset: -1px;
}
.cm-button${EDGED_BUTTON}${FOCUS}::before { outline-color: var(--cm-border-selected); }
.cm-button${DISABLED} {
    background: var(--cm-btn-disabled-bg, var(--mantine-color-disabled));
    color: var(--cm-btn-disabled-color, var(--mantine-color-disabled-color));
    outline-color: var(--cm-btn-disabled-outline, transparent);
    border: var(--button-bd, 1px solid transparent);
    cursor: auto;
}
.cm-button${DISABLED} .cm-button-section[data-position="right"] { color: inherit; }
/* Loading: width unchanged, the label fades out, a 16px spinner fades in centered (2.8). */
.cm-button[data-loading] { cursor: progress; }
.cm-button[data-loading] .cm-button-inner { opacity: 0; transform: none; }
/* Mantine's Transition writes the spinner's slide as inline style, so only !important reaches it. */
.cm-button-loader {
    display: flex;
    transform: translate(-50%, -50%) !important;
    transition: opacity var(--cm-duration-sm) var(--cm-ease-loading) var(--cm-duration-sm) !important;
}

.cm-button-loader .mantine-Loader-root { display: flex; width: 16px; height: 16px; }
.cm-button-spinner { animation: cm-button-spin 1s linear infinite; }
@keyframes cm-button-spin { to { transform: rotate(360deg); } }

/* ---------- ActionIcon: ghost, secondary, highlighted, filled, open (4.3) ---------- */
.cm-action-icon {
    overflow: visible;
    padding: var(--cm-ai-padding, 0);
    cursor: default;
}
.cm-action-icon:not(:focus-visible) {
    outline: 1px solid var(--cm-ai-outline, transparent);
    outline-offset: -1px;
}
.cm-action-icon-icon { transition: none; }
.cm-action-icon${HOVER}${ENABLED} {
    background-color: var(--ai-hover);
    color: var(--ai-hover-color, var(--ai-color));
}
.cm-action-icon${PRESSED}${ENABLED} { background-color: var(--cm-ai-pressed, var(--ai-hover)); }
.cm-action-icon${FOCUS} {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-action-icon${EDGED_ICON}::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    outline: 1px solid transparent;
    outline-offset: 1px;
}
.cm-action-icon${EDGED_ICON}${FOCUS} {
    outline: 1px solid var(--cm-ai-outline, transparent);
    outline-offset: -1px;
}
.cm-action-icon${EDGED_ICON}${FOCUS}::before { outline-color: var(--cm-border-selected); }
/* Open (aria-expanded) and toggled on (aria-pressed): selected ground, brand glyph. */
.cm-action-icon${ON}:not(:disabled, [data-disabled]) {
    background-color: var(--cm-bg-selected);
    color: var(--cm-icon-brand);
}
.cm-action-icon${ON}${HOVER}${ENABLED} { background-color: var(--cm-bg-selected-secondary); }
.cm-action-icon${ON}${PRESSED}${ENABLED} { background-color: var(--cm-bg-selected); }
.cm-action-icon${DISABLED} {
    background: var(--cm-ai-disabled-bg, transparent);
    color: var(--cm-ai-disabled-color, var(--cm-icon-disabled));
    outline-color: var(--cm-ai-disabled-outline, var(--cm-ai-outline, transparent));
    border: var(--ai-bd, 1px solid transparent);
    cursor: auto;
}
.cm-action-icon[aria-pressed="true"]${DISABLED} { background: var(--cm-bg-selected); }
.cm-action-icon[data-loading] { cursor: progress; }
.cm-action-icon[data-loading] .cm-action-icon-icon { opacity: 0; transform: none; }
.cm-action-icon-loader {
    inset: 0;
    background-color: transparent;
    transform: none !important;
    transition: none !important;
}

/* ---------- ActionIcon.Group: the joined bar (4.6) ---------- */
.cm-ai-group { gap: 1px; }
.cm-ai-group[data-orientation="horizontal"] {
    display: inline-grid;
    grid-auto-flow: column;
    grid-auto-columns: minmax(0, 1fr);
    width: 88px;
}
.cm-ai-group[data-orientation="horizontal"] > .cm-action-icon { width: auto; min-width: 0; }
${JOINED} {
    background-color: var(--cm-bg-secondary);
    color: var(--cm-icon);
    outline-color: transparent;
}
${JOINED}::before { content: none; }
${JOINED}${HOVER}${ENABLED},
${JOINED}${PRESSED}${ENABLED} { background-color: var(--cm-bg-pressed); }
${JOINED}${FOCUS} {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -1px;
}

/* ---------- CloseButton (4.7) ---------- */
.cm-close-button {
    background: transparent;
    color: var(--cm-icon);
    border: 0;
    cursor: default;
}
.cm-close-button:not(:focus-visible) {
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-close-button${HOVER}:not(:disabled, [data-disabled]) { background-color: var(--cm-bg-transparent-hover); }
.cm-close-button${PRESSED}:not(:disabled, [data-disabled]) { background-color: var(--cm-bg-transparent-pressed); }
.cm-close-button${FOCUS} {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
.cm-close-button:is(:disabled, [data-disabled]) {
    opacity: 1;
    color: var(--cm-icon-disabled);
    cursor: auto;
}
.cm-close-glyph {
    display: block;
    width: var(--cb-icon-size);
    height: var(--cb-icon-size);
}

/* ---------- ToggleIconButton (4.4): an ActionIcon with aria-pressed; the "on" rules above ---------- */
.cm-toggle-icon[data-swap][aria-pressed="true"]:not(:disabled, [data-disabled]) {
    background-color: var(--ai-bg);
    color: var(--ai-color);
}
.cm-toggle-icon[data-swap][aria-pressed="true"]${HOVER}${ENABLED} { background-color: var(--ai-hover); }
.cm-toggle-icon[data-swap][aria-pressed="true"]${PRESSED}${ENABLED} { background-color: var(--cm-ai-pressed); }
.cm-toggle-icon[data-swap][aria-pressed="true"]${DISABLED} { background: transparent; }
/* Disabled: Figma draws it exactly like the enabled toggle, pointer states included
   (bc/toggle-icon-off|on-disabled--*); only the press does nothing. */
.cm-toggle-icon${DISABLED} { color: var(--ai-color); }
.cm-toggle-icon[aria-pressed]${DISABLED}${HOVER} { background-color: var(--ai-hover); }
.cm-toggle-icon[aria-pressed]${DISABLED}${PRESSED} { background-color: var(--cm-ai-pressed); }
.cm-toggle-icon:not([data-swap])[aria-pressed="true"]${DISABLED} { color: var(--cm-icon-brand); }
.cm-toggle-icon:not([data-swap])[aria-pressed="true"]${DISABLED}${HOVER} { background-color: var(--cm-bg-selected-secondary); }
.cm-toggle-icon:not([data-swap])[aria-pressed="true"]${DISABLED}${PRESSED} { background-color: var(--cm-bg-selected); }

/* ---------- SplitButton (4.5) ---------- */
.cm-split {
    display: inline-flex;
    gap: 1px;
    ${cmFont("body")}
}
.cm-split > .cm-split-main { border-radius: 5px 0 0 5px; }
.cm-split > .cm-split-chevron {
    width: 16px;
    min-width: 16px;
    padding: 0;
    border-radius: 0 5px 5px 0;
}
/* Hovering either half lights both, so they read as one control with a 1px seam. */
.cm-split:is(:hover, [data-state="hover"]) > .cm-action-icon${ENABLED} { background-color: var(--cm-bg-transparent-hover); }
.cm-split > .cm-action-icon${PRESSED}${ENABLED} { background-color: var(--cm-bg-transparent-pressed); }
/* The chevron while its menu is open: selected ground, brand caret, square (header-and-modes/present-dropdown-open #73). */
.cm-split > .cm-split-chevron[aria-expanded="true"]:not(:disabled, [data-disabled]) {
    background-color: var(--cm-bg-selected);
    color: var(--cm-icon-brand);
    border-radius: 0;
}
`;

export default css;
