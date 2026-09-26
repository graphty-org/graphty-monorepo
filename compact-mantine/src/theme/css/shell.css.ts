/**
 * The editor shell's CSS (design/figma-spec.md 11): the display components Mantine renders
 * (Badge, Indicator, Avatar, Kbd, Pill, ThemeIcon) and the shell components of
 * src/components/shell (Toolbar, ToolButton, ToolGroup, SecondaryToolbar, NavRail, RailButton,
 * HelpButton, ShortcutSheet, QuickActions).
 *
 * Every color is a `--cm-*` token, except the brand palette's shade 2 (#80caff) for the
 * highlighted key cap and LABEL_INK, neither of which has a token of its own. Measurements cite
 * the Figma study.
 */
import { cmFont, elevationValue } from "../tokens";

/**
 * Figma's canvas-floating chrome (the toolbars, the help button, the palette) uses
 * --elevation-200-canvas: elevation 200 with a 1px first blur where the panel token has 0.5px
 * (css-variables.json:1166; bt/toolbar-default #24, bc/help-button--default #24).
 */
const ELEVATION_200_CANVAS = elevationValue("200").replace("0 0 .5px", "0 0 1px");

/**
 * The label text on the bars and the palette's rows: pure black / white, where the glyphs beside
 * it use --cm-icon (#000000e5). bt/secondary-vector-bar "Lasso", dt/light-dialog-quick-actions
 * and dt/dark-dialog-quick-actions row spans.
 */
const LABEL_INK = "light-dark(#000000, #ffffff)";

const css = `
/* ---- Card (C55; ls/panel-assets, ls/assets-component-tile-hover / -focus) --------------------- */
.cm-card {
    background: transparent;
    color: var(--cm-text);
    box-shadow: none;
}
/* A 1px edge that is transparent at rest: the capture's border is rgba(0,0,0,0). */
.cm-card[data-with-border] { border-color: transparent; }
.cm-card:is(a, button):hover, .cm-card[data-cm-state="hover"] { background: var(--cm-bg-hover); }
.cm-card:is(a, button):focus-visible, .cm-card[data-cm-state="focus"] { outline: none; box-shadow: inset 0 0 0 2px var(--cm-border-selected); }

/* ---- Badge (C51; bt/mode-metronome-full #296) -------------------------------------------- */
.cm-badge {
    ${cmFont("body")}
    text-transform: none;
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-badge[data-variant="outline"] { outline-color: var(--cm-border); }
/* Inside a dark menu the outline is #383838 and the text the menu's secondary. */
.cm-menu-surface .cm-badge[data-variant="outline"] {
    outline-color: var(--cm-border-menu);
    color: var(--cm-text-menu-secondary);
}

/* ---- Indicator: the notification dot (C51; ls/rail-default #56) -------------------------- */
.cm-indicator[data-with-border] { border-color: var(--cm-bg); }

/* ---- Avatar and Avatar.Group (C52; hm/header-right-default #39, #49, #59) ---------------- */
.cm-avatar-placeholder {
    font-size: 12px;
    line-height: 24px;
    font-weight: 400;
    letter-spacing: normal;
}
.cm-avatar[data-within-group] {
    width: 28px;
    height: 28px;
    min-width: 28px;
    border-color: var(--cm-bg);
    background: var(--cm-bg);
    animation: cm-avatar-in 150ms ease-out;
}
@keyframes cm-avatar-in { from { opacity: 0; } }

/* ---- Kbd: the key cap, dark in both themes (C39; pm/keyboard-shortcuts-tab-tools #114, #141;
   ma/keyboard-shortcuts-essential #128, #147) ----------------------------------------------- */
.cm-kbd {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: var(--kbd-height, 25px);
    min-width: var(--kbd-min-width, 26px);
    padding: 1px 4px 0;
    font-family: var(--cm-font-family);
    font-size: var(--kbd-fz, 11px);
    line-height: var(--kbd-lh, 16px);
    font-weight: 400;
    letter-spacing: normal;
    border: 1px solid var(--cm-text-menu-secondary);
    border-radius: 2px;
    background-color: var(--cm-bg-menu);
    color: var(--cm-text-menu-secondary);
    vertical-align: middle;
}
.cm-kbd[data-active] {
    border-color: var(--mantine-color-brand-2);
    background-color: var(--mantine-color-brand-2);
    color: var(--cm-bg-menu);
}
.cm-kbd[data-variant="inline"] {
    height: auto;
    min-width: 0;
    padding: 0 4px;
    ${cmFont("body")}
    border-color: var(--cm-border);
    background-color: transparent;
    color: var(--cm-text-secondary);
}

/* ---- Pill: the variable-pill shape (spec 6.6 / 6.7) --------------------------------------- */
.cm-pill {
    ${cmFont("body")}
    padding-inline: 4px;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border: 1px solid var(--cm-border);
}
/* Disabled content dims (spec 6.7; Figma captures no disabled pill). */
.cm-pill[data-disabled] {
    color: var(--cm-text-disabled);
    border-color: var(--cm-border-disabled);
}

/* ---- Text: the body role's 450 weight at sm, the caption's at xs (spec 2.3). The weight and
   letter-spacing come from the theme's vars for those sizes; other sizes keep Mantine's normal
   weight and the inherited spacing. A \`fw\` prop still wins (it is an inline style). The rule
   matches only a Text whose vars set the role (they are inline on the root), so a Text of any
   other size keeps whatever weight a caller's own class gives it. */
.cm-text[style*="--cm-text-fw"]:not([data-inherit]) {
    font-weight: var(--cm-text-fw);
    letter-spacing: var(--cm-text-ls);
}

/* ---- ThemeIcon (spec 11.10) ---------------------------------------------------------------- */
.cm-theme-icon { border-radius: var(--ti-radius, 5px); }

/* ---- Floating toolbar (C40; bt/toolbar-default #24, #82) ---------------------------------- */
.cm-toolbar {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 48px;
    padding: 8px;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border-radius: 13px;
    box-shadow: ${ELEVATION_200_CANVAS};
    ${cmFont("body")}
}
.cm-toolbar[data-floating] {
    position: fixed;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
}
.cm-toolbar-divider {
    flex: none;
    align-self: stretch;
    width: 1px;
    margin-block: -8px;
    background-color: var(--cm-border);
}

/* ---- Tool button, chevron and group (C41; bc/tool-rectangle--*, bc/tool-chevron--*) ------- */
.cm-tool-group {
    display: inline-flex;
    gap: 1px;
}
.cm-tool,
.cm-tool-chevron {
    box-sizing: border-box;
    border: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 32px;
    border-radius: 5px;
    background-color: transparent;
    color: var(--cm-icon);
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-tool { width: 32px; padding: 4px; }
.cm-tool-chevron { width: 16px; padding: 4px 0; }
.cm-tool-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
}
/* data-state="hover" | "press" | "focus" force a state for the States stories (a pseudo class
   cannot be forced). */
.cm-tool:hover,
.cm-tool:active,
.cm-tool[data-state="hover"],
.cm-tool[data-state="press"],
.cm-tool-chevron:hover,
.cm-tool-chevron[data-state="hover"] { background-color: var(--cm-bg-hover); }
.cm-tool-chevron:active,
.cm-tool-chevron[data-state="press"],
.cm-tool-chevron[aria-expanded="true"],
.cm-tool-chevron[data-state="open"] { background-color: var(--cm-bg-pressed); }
.cm-tool[aria-pressed="true"] {
    background-color: var(--cm-bg-brand);
    color: var(--cm-text-onbrand);
}
.cm-tool:focus-visible,
.cm-tool[data-state="focus"],
.cm-tool-chevron:focus-visible,
.cm-tool-chevron[data-state="focus"] { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-tool[aria-pressed="true"]:focus-visible,
.cm-tool[aria-pressed="true"][data-state="focus"] {
    outline: 1px solid transparent;
    box-shadow: inset 0 0 0 1px var(--cm-bg), 0 0 0 1px var(--cm-bg), 0 0 0 2px var(--cm-border-selected);
}
/* The tooltip's shortcut, 12px after the label (spec 8.3). */
.cm-tip-shortcut {
    margin-inline-start: 12px;
    color: var(--cm-text-menu-secondary);
}

/* The flyout: a dark menu above the chevron (bt/flyout-ShapeTools-chevron). The overlays theme's
   row puts the leading slot at 12 with a 4px gap, so the check sits at x+12, the icon at +32 and
   the label at +60. */
.cm-tool-flyout-lead {
    display: inline-flex;
    align-items: center;
    gap: 4px;
}
.cm-tool-flyout-check {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    opacity: 0;
}
[aria-checked="true"] > * > .cm-tool-flyout-lead > .cm-tool-flyout-check,
[aria-checked="true"] .cm-tool-flyout-check { opacity: 1; }

/* ---- Contextual secondary bar (C42; bt/secondary-vector-bar, bt/secondary-image-bar) ------ */
.cm-secondary-toolbar {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 40px;
    padding: 8px;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border-radius: 13px;
    box-shadow: ${ELEVATION_200_CANVAS};
    ${cmFont("body")}
}
.cm-secondary-toolbar[data-flush] { padding: 0; }
.cm-secondary-divider {
    flex: none;
    align-self: stretch;
    width: 1px;
    margin-block: -8px;
    background-color: var(--cm-border);
}
.cm-secondary-toolbar[data-flush] .cm-secondary-divider { margin-block: 0; }
.cm-secondary-item {
    box-sizing: border-box;
    border: 0;
    padding: 0;
    display: inline-flex;
    align-items: center;
    height: 24px;
    min-width: 24px;
    border-radius: 5px;
    background-color: transparent;
    color: var(--cm-icon);
    font-size: 11px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: normal;
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-secondary-item:hover,
.cm-secondary-item[data-state="hover"] { background-color: var(--cm-bg-hover); }
.cm-secondary-item[aria-pressed="true"] {
    background-color: var(--cm-bg-brand);
    color: var(--cm-text-onbrand);
}
.cm-secondary-item[aria-expanded="true"] {
    background-color: var(--cm-bg-selected);
    color: var(--cm-text-brand);
}
.cm-secondary-item:focus-visible,
.cm-secondary-item[data-state="focus"] { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-secondary-item-label { padding-inline-end: 8px; }
.cm-secondary-item:not([aria-pressed="true"], [aria-expanded="true"]) .cm-secondary-item-label { color: ${LABEL_INK}; }
/* A dropdown item ("More", bt/secondary-vector-bar #53-#55): the label at x+8, then a 16px
   chevron and 4px of end padding. */
.cm-secondary-item[data-dropdown] { padding-inline-end: 4px; }
.cm-secondary-item[data-dropdown] .cm-secondary-item-label { padding-inline-end: 0; }
.cm-secondary-item-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 16px;
    height: 16px;
}
.cm-secondary-hint {
    box-sizing: border-box;
    padding: 0 12px;
    background-color: var(--cm-bg-info);
    color: var(--cm-text-brand);
    border-radius: 13px 13px 0 0;
    ${cmFont("headingSmall")}
    font-weight: 500;
}

/* ---- Navigation rail (C43; ls/rail-default #14-#56, ls/rail-assets-*) --------------------- */
.cm-nav-rail {
    box-sizing: content-box;
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 56px;
    height: 100%;
    padding: 8px 0 16px;
    background-color: var(--cm-bg);
    border-inline-end: 1px solid var(--cm-border);
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-nav-rail-footer {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    margin-top: auto;
}
.cm-nav-rail-separator {
    flex: none;
    width: 16px;
    height: 1px;
    margin: 8px 0 7px;
    background-color: var(--cm-border);
}
.cm-rail-button {
    box-sizing: border-box;
    border: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 56px;
    height: 56px;
    padding: 4px 0;
    background: transparent;
    color: var(--cm-icon);
    outline: none;
}
.cm-rail-pill {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    border-radius: 5px;
    outline: 1px solid transparent;
    outline-offset: 0;
}
.cm-rail-label {
    display: block;
    width: 40px;
    height: 14px;
    overflow: hidden;
    white-space: nowrap;
    text-align: center;
    color: var(--cm-text);
    ${cmFont("caption")}
}
.cm-rail-button:hover .cm-rail-pill,
.cm-rail-button:active .cm-rail-pill,
.cm-rail-button[data-state="hover"] .cm-rail-pill,
.cm-rail-button[data-state="press"] .cm-rail-pill { background-color: var(--cm-bg-hover); }
.cm-rail-button[data-active] .cm-rail-pill {
    background-color: var(--cm-bg-selected);
    color: var(--cm-icon-brand);
    outline-offset: -1px;
}
.cm-rail-button:focus-visible .cm-rail-pill,
.cm-rail-button[data-state="focus"] .cm-rail-pill { outline: 1px solid var(--cm-border-selected); }

/* ---- Floating help button (C15; bc/help-button--default #24, --focus #24) ------------------ */
.cm-help-button {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    padding: 0;
    border-radius: 100%;
    border: 1px solid transparent;
    background-color: var(--cm-bg);
    color: var(--cm-icon);
    box-shadow: ${ELEVATION_200_CANVAS};
    outline: 1px solid transparent;
    outline-offset: -2px;
    transition: outline-color var(--cm-duration-md) var(--cm-ease-out), border-color var(--cm-duration-md) var(--cm-ease-out);
}
.cm-help-button:focus-visible,
.cm-help-button[data-state="focus"] {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -2px;
    border-color: var(--cm-border-selected);
}

/* ---- Keyboard shortcuts sheet (C39; pm/keyboard-shortcuts-tab-tools, ma/keyboard-shortcuts-essential) */
.cm-shortcut-sheet {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    width: 100%;
    /* A fixed 241 (240 plus the top edge) whatever the tab holds; the body scrolls
       (pm/keyboard-shortcuts-tab-tools #80, #101). */
    height: 241px;
    background-color: var(--cm-bg-menu);
    color: var(--cm-text-menu);
    /* Figma: an invisible 1px edge in light, #444 in dark (dt/dark-dialog-keyboard-shortcuts #590). */
    border-top: 1px solid light-dark(transparent, var(--cm-border));
    font-size: 12px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: normal;
}
.cm-shortcut-sheet > * { color-scheme: dark; }
/* The strip is 38 tall and its 39px tabs overflow it by 1px (pm/keyboard-shortcuts-tab-tools #81). */
.cm-sheet-strip {
    display: flex;
    height: 38px;
}
.cm-sheet-tablist {
    display: flex;
    flex: 1;
    min-width: 0;
}
.cm-sheet-filler,
.cm-sheet-tab,
.cm-sheet-close {
    box-sizing: border-box;
    height: 39px;
    background-color: var(--cm-bg-menu);
    border: 0 solid var(--cm-border-menu);
    border-bottom-width: 1px;
    border-radius: 0;
}
.cm-sheet-filler { flex: 1; }
.cm-sheet-tab {
    flex: none;
    padding: 0 16px;
    color: var(--cm-text-menu-secondary);
    font-size: 12px;
    line-height: 38px;
    white-space: nowrap;
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-sheet-tab[aria-selected="true"] {
    height: 38px;
    border-bottom-width: 0;
    color: var(--cm-text-menu);
}
.cm-sheet-tab:hover,
.cm-sheet-tab[data-state="hover"] { color: var(--cm-text-menu); }
.cm-sheet-tab:focus-visible,
.cm-sheet-tab[data-state="focus"] { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-shortcut-sheet [data-left-of-active] {
    border-right-width: 1px;
    border-radius: 0 0 2px 0;
}
.cm-sheet-tab[data-left-of-active] { padding-inline-end: 15px; }
.cm-shortcut-sheet [data-right-of-active] {
    border-left-width: 1px;
    border-radius: 0 0 0 2px;
}
.cm-sheet-tab[data-right-of-active] { padding-inline-start: 15px; }
.cm-sheet-close {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 38px;
    padding: 0;
    color: var(--cm-text-menu-disabled);
    outline: 1px solid transparent;
    outline-offset: -1px;
}
.cm-sheet-close:hover { color: var(--cm-text-menu); }
.cm-sheet-close:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-sheet-body {
    display: flex;
    flex: 1;
    min-height: 0;
    justify-content: center;
    padding: 8px 0 0;
    overflow: auto;
}
.cm-sheet-content {
    display: flex;
    flex-direction: column;
}
.cm-sheet-columns {
    display: flex;
    gap: 46px;
}
.cm-sheet-column {
    display: flex;
    flex-direction: column;
    width: 302px;
}
.cm-sheet-column-title {
    ${cmFont("sheet")}
    color: var(--cm-text-menu);
    padding: 8px 0 4px;
}
.cm-sheet-row {
    display: flex;
    align-items: center;
    height: 37px;
}
.cm-sheet-row-icon {
    display: inline-flex;
    align-items: center;
    flex: none;
    width: 29px;
    color: var(--cm-icon-secondary);
}
.cm-sheet-row-label {
    flex: 1;
    min-width: 0;
    padding-inline-end: 20px;
    font-size: 12px;
    line-height: 15.6px;
    color: var(--cm-text-menu-secondary);
}
.cm-sheet-row[data-highlighted] .cm-sheet-row-label { color: var(--mantine-color-brand-2); }
.cm-sheet-keys {
    display: inline-flex;
    gap: 3px;
    flex: none;
}
/* The "essential" tab (ma/keyboard-shortcuts-essential #118-#148): a 14/24 caption 10px down
   with 16px under it, a numbered 23px circle over each column (10px under it), 68px rows whose
   label sits 10px down with a 12/16 description 2px under it, and caps 6px down. */
.cm-sheet-caption {
    margin-top: 10px;
    padding-bottom: 16px;
    font-size: 14px;
    line-height: 24px;
    color: var(--cm-text-menu);
}
.cm-sheet-step {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 23px;
    height: 23px;
    margin-bottom: 10px;
    border: 1px solid var(--cm-text-menu);
    border-radius: 50%;
    font-size: 12px;
    line-height: 16px;
    color: var(--cm-text-menu);
}
.cm-sheet-body[data-variant="essential"] .cm-sheet-row {
    align-items: flex-start;
    height: auto;
    min-height: 68px;
}
.cm-sheet-body[data-variant="essential"] .cm-sheet-row-label {
    padding-top: 10px;
    font-size: 14px;
    line-height: 24px;
}
.cm-sheet-row-description {
    display: block;
    padding-top: 2px;
    font-size: 12px;
    line-height: 16px;
    color: var(--cm-text-menu-secondary);
}
.cm-sheet-body[data-variant="essential"] .cm-sheet-keys { padding-top: 6px; }

/* ---- Quick actions palette (C38; pm/quick-actions-open #33-#119) --------------------------- */
.cm-quick-actions {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border-radius: 13px;
    box-shadow: ${ELEVATION_200_CANVAS};
    ${cmFont("largeRow")}
    overflow: hidden;
}
.cm-qa-search.cm-field {
    display: flex;
    align-items: center;
    flex: none;
    height: 32px;
    margin: 8px 8px 0;
    ${cmFont("largeRow")}
}
/* Figma draws no ring on the palette's search: focus never leaves it, and the caret shows it
   (pm/quick-actions-open #37). The AA option keeps its 3:1 field edge (--cm-field-shadow is none
   in the Figma look). */
.cm-qa-search.cm-field:focus-within { outline-color: transparent; box-shadow: var(--cm-field-shadow); }
.cm-qa-search-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 32px;
    height: 32px;
    color: var(--cm-icon-tertiary);
}
.cm-qa-input {
    flex: 1;
    min-width: 0;
    height: 32px;
    margin-inline-start: 4px;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--cm-text);
    font: inherit;
    letter-spacing: inherit;
}
/* The trailing action: a 24 box 16px after the text, 6px in from the field's right edge
   (dt/light-dialog-quick-actions #41, #45). */
.cm-qa-search-action {
    display: inline-flex;
    flex: none;
    margin: 0 6px 0 16px;
}
/* Its glyph takes the palette's label ink, pure black / white (#45: rgb(0,0,0)), not the
   ghost button's #000000e5. */
.cm-qa-search-action .cm-action-icon { color: ${LABEL_INK}; }
/* The scope tabs' row: 32 tall, 8px below the search, tabs 8px in and 8px apart
   (dt/light-dialog-quick-actions #51, #54-#68). */
.cm-qa-header {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    flex: none;
    height: 32px;
    margin-top: 8px;
    padding: 0 8px;
}
.cm-qa-header .cm-tabs[data-variant="pills"] .cm-tabs-list { gap: 8px; }
.cm-qa-input::placeholder { color: var(--cm-text-tertiary); opacity: 1; }
.cm-qa-list {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 4px 8px 8px;
}
.cm-qa-group + .cm-qa-group { margin-top: 12px; }
.cm-qa-group-title {
    margin: 0 0 4px 8px;
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}
.cm-qa-row {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 32px;
    padding: 4px;
    border-radius: 5px;
    color: ${LABEL_INK};
    cursor: default;
}
.cm-qa-row[data-highlighted] { background-color: var(--cm-bg-hover); }
/* A disabled row dims its glyph and its shortcut with its name (dt/light-dialog-quick-actions-results
   #77-#90: all rgba(0,0,0,.3); dark rgba(255,255,255,.4)). */
.cm-qa-row[aria-disabled="true"],
.cm-qa-row[aria-disabled="true"] .cm-qa-row-icon,
.cm-qa-row[aria-disabled="true"] .cm-qa-row-shortcut { color: var(--cm-text-disabled); }
.cm-qa-row-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex: none;
    width: 24px;
    height: 24px;
    color: ${LABEL_INK};
}
.cm-qa-row-label {
    flex: 1;
    min-width: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
}
.cm-qa-row-shortcut {
    flex: none;
    padding-inline-end: 4px;
    font-size: 11px;
    line-height: 24px;
    color: var(--cm-text-tertiary);
}
.cm-qa-empty {
    padding: 8px 16px;
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}
`;

export default css;
