/**
 * The foundation's CSS: the bundled Inter face, the `:root` tokens, the AA token block, body
 * type, and the shared primitive classes every package builds on (design/figma-spec.md 2, 13).
 *
 * Every `src/theme/css/*.css.ts` module default-exports a CSS string; global-styles.ts joins them
 * in filename order, so this file (00-) comes first and a package adds its own file without
 * touching the aggregator.
 *
 * AA rule for every package: the highContrast option changes TOKENS only. A component that needs
 * a different look in the AA mode reads a token here (`--cm-field-shadow`, `--cm-field-border`,
 * `--cm-segment-edge`, ...) instead of writing a `[data-cm-contrast]` selector, so
 * `compactGlobalCss({ highContrast: true })` works without the attribute (SSR, shadow roots).
 */
import interLatinWoff2 from "../../fonts/inter-latin-wght-normal.woff2";
import {
    CM_ELEVATIONS,
    cmFont,
    graphtyAccentDeclarations,
    highContrastDeclarations,
    primaryAccentDeclarations,
    tokenDeclarations,
} from "../tokens";

/** The latin subset's range, as @fontsource-variable/inter 5.3.0 declares it. */
const LATIN_RANGE =
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD";

/** Token-level switches the AA option flips (non-color values built from color tokens). */
const FIGMA_SWITCHES = `--cm-field-shadow: none;
    --cm-field-shadow-hover: none;
    --cm-field-border: var(--cm-border);
    --cm-segment-chosen-weight: 450;
    --cm-tree-action-overlap: -4px;`;

/*
 * Mantine's `c="dimmed"` color follows the AA secondary text, so `<Text c="dimmed">` meets AA too
 * (its default, gray-6 / dark-2, does not). `!important` because Mantine declares it under
 * `:root[data-mantine-color-scheme]`, as specific as this block, from a stylesheet whose order
 * against this one the consumer decides. The token's light-dark() resolves where the text is, so
 * a dimmed caption inside a dark menu gets the dark value.
 */
const AA_SWITCHES = `--cm-field-shadow: inset 0 0 0 1px var(--cm-field-edge);
    --cm-field-shadow-hover: inset 0 0 0 1px var(--cm-field-edge-hover);
    --cm-field-border: var(--cm-field-edge);
    --cm-segment-chosen-weight: 600;
    --cm-tree-action-overlap: 0px;
    --mantine-color-dimmed: var(--cm-text-secondary) !important;`;

/**
 * The AA token block under a selector.
 * @param selector - where the block applies
 * @returns the CSS rule
 */
export function highContrastBlock(selector: string): string {
    return `${selector} {
    ${highContrastDeclarations()}
    ${AA_SWITCHES}
}`;
}

/**
 * The graphty accent token block under a selector.
 * @param selector - where the block applies
 * @returns the CSS rule
 */
export function graphtyAccentBlock(selector: string): string {
    return `${selector} {
    ${graphtyAccentDeclarations()}
}`;
}

/**
 * What a menu or listbox row sets on itself while its highlight is filled: its label and check
 * take the ink on the accent (`--cm-text-onbrand`), its trailing slot the dimmed one, so a lime
 * highlight gets dark labels. `UNLIT` clears them wherever a rule clears the fill, so the ink
 * follows the fill rule for rule.
 */
export const ROW_LIT =
    "--cm-row-ink: var(--cm-text-onbrand); --cm-row-ink-secondary: var(--cm-text-onbrand-secondary);";
export const ROW_UNLIT = "--cm-row-ink: initial; --cm-row-ink-secondary: initial;";

const FOCUSABLE_REST = ".cm-focus-outside, .cm-focus-flush, .cm-focus-inside, .cm-focus-inside-2, .cm-focus-double";

const css = `
@font-face {
    font-family: "Inter Variable";
    font-style: normal;
    font-display: swap;
    font-weight: 100 900;
    src: url("${interLatinWoff2}") format("woff2");
    unicode-range: ${LATIN_RANGE};
}

:root,
:host {
    ${tokenDeclarations()}
    ${FIGMA_SWITCHES}
}

${highContrastBlock(':root[data-cm-contrast="high"]')}

/* A theme whose primaryColor is not "brand" (global-styles.ts sets the attribute): the accent
   tokens follow the primary palette. After the AA block, so a custom accent wins there too. */
:root[data-cm-accent] {
    ${primaryAccentDeclarations()}
}

/* The graphty brand accent (createCompactTheme({ accent: "graphty" })): fixed brand values, so
   after the derived block above. */
${graphtyAccentBlock(':root[data-cm-accent="graphty"]')}

/* Reduced motion: the few things that move (spec 2.8: a checkbox tick, a switch knob, a hover
   color, the help button's ring, the loading fade) change in one frame. Every such transition
   reads its duration from these two tokens. */
@media (prefers-reduced-motion: reduce) {
    :root,
    :host {
        --cm-duration-sm: 0ms;
        --cm-duration-md: 0ms;
    }
}

body {
    font-family: var(--cm-font-family);
    ${cmFont("body")}
    color: var(--cm-text);
    background-color: var(--cm-bg);
}

::selection {
    background-color: var(--cm-text-highlight);
}

/* Focus ring (spec 2.7): 1px, keyboard focus only, the resting outline reserves the slot so
   focus never shifts layout. The focus rules write the whole outline shorthand because Mantine's
   .mantine-focus-never:focus { outline: none } has the same specificity. */
${FOCUSABLE_REST} {
    outline: 1px solid transparent;
}
/* The default ring: a Mantine focusable the theme gave no cm- class (an UnstyledButton with the
   app's own class) still rings on keyboard focus. A control with a cm- class draws its own ring,
   so it is left out; :where keeps this at Mantine's specificity so any later rule wins. */
.mantine-focus-never:where(:not([class^="cm-"], [class*=" cm-"])):focus-visible {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: 1px;
}
/* One cursor for every control: the arrow (the theme's cursorType, Figma's and the desktop's
   convention). Mantine's UnstyledButton, the base of the rail, the toolbars and an app's own
   buttons, draws the hand; without this a rail button showed the hand while a Button, a Checkbox
   and a segment beside it showed the arrow. Only text drawn as a link (Anchor) keeps the hand.
   The class is doubled to win whatever order the two stylesheets load in. */
.mantine-UnstyledButton-root.mantine-UnstyledButton-root { cursor: default; }
.cm-focus-outside { outline-offset: 1px; }
.cm-focus-flush { outline-offset: 0; }
.cm-focus-inside { outline-offset: -1px; }
.cm-focus-inside-2 { outline-offset: -2px; }
.cm-focus-outside:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: 1px; }
.cm-focus-flush:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: 0; }
.cm-focus-inside:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-focus-inside-2:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -2px; }
.cm-focus-double:focus-visible {
    outline: 1px solid transparent;
    box-shadow: inset 0 0 0 1px var(--cm-bg), 0 0 0 1px var(--cm-bg), 0 0 0 2px var(--cm-border-selected);
}
.cm-focus-pseudo { position: relative; }
.cm-focus-pseudo::before {
    content: "";
    position: absolute;
    inset: 0;
    border-radius: inherit;
    pointer-events: none;
    outline: 1px solid transparent;
    outline-offset: 1px;
}
.cm-focus-pseudo:focus-visible::before { outline-color: var(--cm-border-selected); }
.cm-focus-primary:focus-visible {
    outline: 1px solid var(--cm-border-selected-strong);
    outline-offset: -1px;
    box-shadow: inset 0 0 0 2px #ffffff;
}
.cm-focus-switch { outline: 1px solid transparent; outline-offset: 1px; }
:focus-visible + .cm-focus-switch,
.cm-focus-switch:focus-visible {
    outline: 1px solid var(--cm-border-selected-strong);
    outline-offset: 1px;
}

/* A <fieldset> used as a plain group: none of the browser's border, padding, margin or
   min-content floor, so it lays out exactly like a <div>. Zero specificity: a component's
   own class still sets its padding, margin or border. */
:where(.cm-fieldset) {
    margin: 0;
    padding: 0;
    border: 0;
    min-inline-size: auto;
}

/* A subtree that renders dark in both themes: every token inside resolves dark. */
.cm-dark-surface { color-scheme: dark; }

.cm-visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
}

/* The filled field (spec 6): 24 tall, no border, an outline slot at -1px that hover and focus
   paint. Focus (mouse or keyboard) wins over hover and invalid. */
.cm-field {
    box-sizing: border-box;
    min-height: 24px;
    background-color: var(--cm-bg-secondary);
    border: 0;
    border-radius: 5px;
    color: var(--cm-text);
    ${cmFont("body")}
    outline: 1px solid transparent;
    outline-offset: -1px;
    box-shadow: var(--cm-field-shadow);
}
.cm-field-outlined {
    background-color: var(--cm-bg);
    border: 1px solid var(--cm-field-border);
    padding-inline-start: 7px;
}
.cm-field:hover {
    outline-color: var(--cm-border);
    box-shadow: var(--cm-field-shadow-hover);
}
.cm-field[data-error] { outline-color: var(--cm-border-danger-strong); }
.cm-field:focus-within {
    outline-color: var(--cm-border-selected);
    box-shadow: none;
}
.cm-field[data-disabled],
.cm-field:has(:disabled) {
    background-color: var(--cm-bg);
    outline-color: var(--cm-border-disabled);
    color: var(--cm-text-disabled);
    box-shadow: none;
}
.cm-field ::placeholder { color: var(--cm-text-tertiary); opacity: 1; }
.cm-field ::selection { background-color: var(--cm-text-highlight); }

/* The menu surface (spec 6.5, 8.1): menus, list boxes and context menus follow the page's
   scheme. Every rule inside reads the menu tokens (--cm-bg-menu, --cm-text-menu, ...), which on
   their own are the always-dark values; this surface points them at the page-following set, so a
   light app gets a light menu with dark ink and a dark app the dark menu. The highlights are
   Figma's brand and danger fills; the AA option darkens them and the shortcut on them.

   The class cm-menu-inverse keeps Figma's always-dark menu in both schemes (a Menu adds it for
   variant="inverse"; any other dropdown, a Select's or a Combobox's, takes it through
   classNames={{ dropdown: "cm-menu-inverse" }}): the surface resolves dark and the
   menu tokens and highlights keep their Figma values. Only its shadow follows the page. */
.cm-menu-surface {
    --cm-menu-shadow: var(--cm-elevation-400);
    background-color: var(--cm-bg-menu);
    color: var(--cm-text-menu);
    border: 0;
    border-radius: 13px;
    box-shadow: var(--cm-menu-shadow);
    padding: 8px 0;
}
.cm-menu-surface:not(.cm-menu-inverse) {
    --cm-bg-menu: var(--cm-bg-menu-page);
    --cm-text-menu: var(--cm-text-menu-page);
    --cm-text-menu-secondary: var(--cm-text-menu-page-secondary);
    --cm-text-menu-disabled: var(--cm-text-menu-page-disabled);
    --cm-border-menu: var(--cm-border-menu-page);
    --cm-text-onbrand-secondary: var(--cm-menu-onbrand-secondary);
}
.cm-menu-surface.cm-menu-inverse { color-scheme: dark; }
:where([data-mantine-color-scheme="light"]) .cm-menu-surface.cm-menu-inverse {
    --cm-menu-shadow: ${CM_ELEVATIONS["400"].light.join(", ")};
}

/* A menu or listbox row: 24 tall, text 16px from the menu edge, the highlight an inner pill
   inset 8px each side. Only one row is ever filled: a selected row gives its highlight up while
   another row is under the pointer. */
.cm-menu-row {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    height: 24px;
    padding: 0 16px;
    background: transparent;
    color: var(--cm-row-ink, var(--cm-text-menu));
    ${cmFont("body")}
    cursor: default;
}
.cm-menu-row::before {
    content: "";
    position: absolute;
    inset: 0 8px;
    z-index: -1;
    border-radius: 5px;
    background: transparent;
}
.cm-menu-row:hover::before,
.cm-menu-row[data-hovered]::before,
.cm-menu-row[data-combobox-selected]::before,
.cm-menu-row[aria-selected="true"]::before {
    background: var(--cm-bg-brand);
}
.cm-menu-row:hover,
.cm-menu-row[data-hovered],
.cm-menu-row[data-combobox-selected],
.cm-menu-row[aria-selected="true"] { ${ROW_LIT} }
.cm-menu-surface:not(.cm-pointer-still):has(.cm-menu-row:hover) .cm-menu-row[aria-selected="true"]:not(:hover)::before {
    background: transparent;
}
.cm-menu-surface:not(.cm-pointer-still):has(.cm-menu-row:hover) .cm-menu-row[aria-selected="true"]:not(:hover) { ${ROW_UNLIT} }
.cm-menu-row[data-disabled],
.cm-menu-row[aria-disabled="true"] { color: var(--cm-text-menu-disabled); }
.cm-menu-row[data-disabled]::before,
.cm-menu-row[aria-disabled="true"]::before { background: transparent; }
.cm-menu-row[data-disabled],
.cm-menu-row[aria-disabled="true"] { ${ROW_UNLIT} }
/* The 16 x 16 check column; its glyph shows on a checked or selected row. */
.cm-menu-row-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 16px;
    height: 16px;
    opacity: 0;
}
.cm-menu-row[aria-checked="true"] .cm-menu-row-check,
.cm-menu-row[aria-selected="true"] .cm-menu-row-check,
.cm-menu-row[data-checked] .cm-menu-row-check { opacity: 1; }

/* The light popover shell (spec 8.4). */
.cm-popover-surface {
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border: 0;
    border-radius: 13px;
    box-shadow: var(--cm-elevation-400);
}
`;

export default css;
