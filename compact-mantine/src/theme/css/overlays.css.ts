/**
 * The overlays package's CSS (design/figma-spec.md section 8): the dark menu, the tooltip, the
 * light popover family (Popout, Mantine Popover and HoverCard, InfoCircle), the modal, the toast,
 * the overlay scrollbar, and the feedback components (Loader, Progress, RingProgress).
 *
 * Every rule is keyed on a `cm-*` class the theme extensions in ../components/overlays.ts and
 * ../components/feedback.ts hand Mantine through `classNames`, or that this package's own
 * components render. Colours are tokens only. The shared primitives it builds on --
 * `cm-menu-surface`, `cm-menu-row`, `cm-menu-row-check`, `cm-popover-surface` -- live in
 * 00-foundation.css.ts.
 *
 * Specificity: Mantine's own rules are mostly `.m_x` or `:where([scheme]) .m_x`, both (0,1,0),
 * and this sheet is appended after Mantine's, so a single `cm-*` class wins. The few Mantine
 * rules that are stronger are answered with a matching selector, noted where they occur.
 */
import { cmFont } from "../tokens";

const css = `
/* ---------------------------------------------------------------- 8.1 dark menu */

/* The dropdown: the foundation's cm-menu-surface (#1e1e1e, radius 13, elevation 400 from the
   page's scheme, padding 8 0, children dark-scoped) plus the menu's own width floor and the
   viewport clamp, whose max-height the Menu's size middleware writes. The native scrollbar is
   hidden, as in Figma. */
.cm-menu {
    min-width: 152px;
    overflow-y: auto;
    scrollbar-width: none;
}
.cm-menu::-webkit-scrollbar { display: none; }

/* Figma's scroll chevron rows: 24 tall, the menu's fill, a 5 x 3 chevron (the register's
   chevronUp / chevronDown polyline drawn in a 10px box; white because the menu is dark in both
   themes). src/components/overlays/overlayBehaviour.ts sets data-cm-scroll-up / -down on a
   clamped menu for each end it can still scroll towards, and scrolls it while one is hovered.
   The rows are sticky pseudo elements laid over the first and last visible rows. */
.cm-menu[data-cm-scroll-up]::before,
.cm-menu[data-cm-scroll-down]::after {
    content: "";
    display: block;
    position: sticky;
    z-index: 1;
    height: 24px;
    background: center / 10px 10px no-repeat var(--cm-bg-menu);
}
.cm-menu[data-cm-scroll-up]::before {
    top: -8px;
    margin-top: -8px;
    margin-bottom: -16px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='4,10 8,6 12,10' fill='none' stroke='%23fff' stroke-width='1.6'/%3E%3C/svg%3E");
}
.cm-menu[data-cm-scroll-down]::after {
    bottom: -8px;
    margin-top: -16px;
    margin-bottom: -8px;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3E%3Cpolyline points='4,6 8,10 12,6' fill='none' stroke='%23fff' stroke-width='1.6'/%3E%3C/svg%3E");
}

/* A mount hook: overlayBehaviour.ts listens for these animations' animationstart to see a
   menu or tooltip appear, without observing the whole page. */
@keyframes cm-overlay-mount { from { outline-offset: 0; } to { outline-offset: 0; } }
.cm-menu { animation: cm-overlay-mount 1ms; }
/* A tooltip's mount hook also keeps it hidden for its first frame. animationstart fires one frame
   after the element appears, so without this a focus-opened tooltip would paint once before
   overlayBehaviour.ts holds it for the cold delay. */
@keyframes cm-tooltip-mount { from { visibility: hidden; } to { visibility: hidden; } }
.cm-tooltip { animation: cm-tooltip-mount 1ms; }

/* A submenu is rendered inside its parent's dropdown, so the foundation's "children are dark"
   rule reaches it and would resolve its shadow dark in the light app. Its shadow follows the
   page like every other menu's. */
:where([data-mantine-color-scheme="light"]) .cm-menu-surface > .cm-menu-surface { color-scheme: light; }
/* Menu.Sub draws its dropdown through a Popover, so the dropdown also carries the popover's
   classes (cm-popover-surface, cm-popover). The menu's dark surface wins. */
.cm-menu-surface.cm-popover-surface {
    background-color: var(--cm-bg-menu);
    color: var(--cm-text-menu);
    padding: 8px 0;
}

/* A row: the foundation's cm-menu-row (24 tall, text 16 from the menu edge, the highlight an
   inner pill inset 8 each side). Mantine's item draws a radius, an opacity on disabled rows
   and a not-allowed cursor; Figma has none of them. */
.cm-menu-item {
    width: 100%;
    border-radius: 0;
    text-align: start;
}
.cm-menu-item:where([data-disabled], :disabled) {
    opacity: 1;
    cursor: default;
    color: var(--cm-text-menu-disabled);
}
.cm-menu-item-label {
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

/* Leading slot: a 24 x 24 icon starts 12px from the menu edge with a 4px gap to the label; the
   16 x 16 check column starts at 16 with no gap (labels 32 from the edge). */
.cm-menu-item-section {
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--cm-text-menu-secondary);
}
.cm-menu-item-section[data-position="left"] { margin-inline: -4px 4px; color: inherit; }
.cm-menu-item-section[data-position="left"]:has(> .cm-menu-row-check) { margin-inline: 0; }
/* Trailing slot: the shortcut, at least 16px after the label, ending 16px from the edge. */
.cm-menu-item-section[data-position="right"] { margin-inline-start: 16px; }
/* A submenu's 24 x 24 chevron box ends 8px from the menu edge (Figma: the highlight's own end). */
.cm-menu-item[data-sub-menu-item] .cm-menu-item-section[data-position="right"] { margin-inline-end: -8px; }
.cm-menu-chevron {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
}
:where([dir="rtl"]) .cm-menu-chevron { transform: scaleX(-1); }
.cm-menu-row-check { color: var(--cm-text-menu); }

/* Highlight: pointer (:hover, from the foundation), keyboard (:focus: Mantine moves focus
   through the rows) and an open submenu's parent row. Only one row is ever filled: a row under
   the pointer takes the highlight from a keyboard-focused one. */
.cm-menu-item:focus::before,
.cm-menu-item[aria-expanded="true"]::before {
    background: var(--cm-bg-brand);
}
.cm-menu:has(> .cm-menu-item:hover) > .cm-menu-item:focus:not(:hover, [aria-expanded="true"])::before {
    background: transparent;
}
.cm-menu-item:is(:hover, :focus, [data-hovered], [aria-expanded="true"]) .cm-menu-item-section[data-position="right"] {
    color: var(--cm-text-onbrand-secondary);
}
.cm-menu:has(> .cm-menu-item:hover) > .cm-menu-item:focus:not(:hover, [aria-expanded="true"]) .cm-menu-item-section[data-position="right"] {
    color: var(--cm-text-menu-secondary);
}
.cm-menu-item:where([data-disabled], :disabled)::before { background: transparent; }
.cm-menu-item:where([data-disabled], :disabled) .cm-menu-item-section { color: var(--cm-text-menu-disabled); }
.cm-menu-item:focus { outline: none; }

/* Danger rows (color="red"): Mantine writes the colour into the row's inline --menu-item-color;
   the danger slots replace the menu's. ponytail: keyed on the inline style Mantine writes for
   color="red"; any other colour keeps the menu's white. */
.cm-menu-item[style*="--mantine-color-red"] { color: var(--cm-text-danger); }
.cm-menu-item[style*="--mantine-color-red"]:is(:hover, :focus, [data-hovered])::before { background: var(--cm-bg-danger); }
.cm-menu-item[style*="--mantine-color-red"]:is(:hover, :focus, [data-hovered]) { color: var(--cm-text-onbrand); }

/* Menu.Label: a group heading in a row of its own, secondary text. */
.cm-menu-label {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    height: 24px;
    padding: 0 16px;
    color: var(--cm-text-menu-secondary);
    ${cmFont("body")}
}

/* Menu.Divider: a full-width 1px line with 8px above and below (17px between two rows). */
.cm-menu-divider {
    margin: 8px 0;
    border: 0;
    border-top: 1px solid var(--cm-border-translucent);
}

/* ---------------------------------------------------------------- 8.3 tooltip */

/* Dark in both themes; its shadow follows the page (elevation 300). The Tooltip's own color
   prop still wins through Mantine's --tooltip-bg / --tooltip-color. */
.cm-tooltip {
    box-sizing: border-box;
    min-height: 24px;
    width: max-content;
    max-width: 180px;
    padding: 4px 8px;
    border-radius: 5px;
    background-color: var(--tooltip-bg, var(--cm-bg-tooltip));
    color: var(--tooltip-color, var(--cm-text-menu));
    box-shadow: var(--cm-elevation-300);
    white-space: normal;
    overflow-wrap: break-word;
    pointer-events: none;
    ${cmFont("body")}
}
.cm-tooltip-arrow { border: 0; }
/* Hidden by overlayBehaviour.ts: dismissed (pointer-down, key, wheel, pointer left the window)
   for the rest of this tooltip's life, or held for the cold delay after a keyboard focus. */
.cm-tooltip:is([data-cm-dismissed], [data-cm-held]) { visibility: hidden; }

/* TooltipShortcut: the label, then the shortcut 12px after it in the secondary text colour. */
.cm-tooltip-shortcut-row { display: flex; align-items: center; white-space: nowrap; }
.cm-tooltip-shortcut { margin-inline-start: 12px; color: var(--cm-text-menu-secondary); }

/* ---------------------------------------------------------------- 8.4 light popover */

/* Mantine Popover and HoverCard dropdowns: the foundation's cm-popover-surface, padding 8. */
.cm-popover { padding: 8px; }
.cm-popover-arrow { border: 0; }

/* The Popout panel. */
.cm-popout { overflow: hidden; }
.cm-popout:focus { outline: none; }
.cm-popout:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }

/* Header: 40 tall, padding 0 32 0 8, a 1px divider, the whole bar the drag handle. */
.cm-popout-header {
    position: relative;
    display: flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    height: 40px;
    padding-block: 0;
    padding-inline: 8px 32px;
    box-shadow: inset 0 -1px 0 var(--cm-border);
    user-select: none;
}
.cm-popout-title {
    flex: 1;
    min-width: 0;
    margin: 0;
    padding-inline-start: 8px;
    color: var(--cm-text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    ${cmFont("bodyStrong")}
    letter-spacing: normal;
}
.cm-popout-tabs { flex: 1; min-width: 0; }
.cm-popout-actions { display: flex; align-items: center; }
/* The 24px close button, 8px from the top and from the end. */
.cm-popout-close,
.cm-modal-close {
    position: absolute;
    top: 8px;
    inset-inline-end: 8px;
    width: 24px;
    height: 24px;
    min-width: 24px;
    min-height: 24px;
}
/* Body: rows 32 tall, 16px from the divider to the first control and from the last to the
   bottom edge (12 here + the row's own 4). */
.cm-popout-content { padding: 12px 16px; }

/* InfoCircle's bubble: body text in the secondary colour. */
.cm-info-bubble {
    box-sizing: border-box;
    padding: 12px 16px;
    color: var(--cm-text-secondary);
    ${cmFont("body")}
}

/* ---------------------------------------------------------------- 8.5 modal */

.cm-modal {
    --modal-size-sm: 320px;
    --modal-size-md: 480px;
    --modal-size-lg: 760px;
}
.cm-modal-overlay { background: var(--cm-modal-backdrop); }
.cm-modal-content {
    background-color: var(--cm-bg);
    color: var(--cm-text);
    border-radius: 13px;
    box-shadow: var(--cm-elevation-500);
}
.cm-modal-header {
    box-sizing: border-box;
    min-height: 40px;
    height: 40px;
    padding-block: 0;
    padding-inline: 16px 32px;
    background-color: var(--cm-bg);
    box-shadow: inset 0 -1px 0 var(--cm-border);
    transition: none;
}
.cm-modal-title {
    margin: 0;
    color: var(--cm-text);
    ${cmFont("bodyStrong")}
    /* Figma's dialog title (dialog-file--save-to-version-history h2): 0.055px. */
    letter-spacing: 0.055px;
}
.cm-modal-body {
    /* Every Figma dialog capture (save-to-version-history, colour-profile, export-frames-to-pdf,
       element 29): 8px 16px, so the first field sits 8px below the header divider. */
    padding: 8px 16px;
    ${cmFont("body")}
}
/* ModalFooter: 40 tall across the modal's full width (it cancels the body's 8px 16px padding,
   leaving Figma's 8px between the last field and the footer),
   a 1px top divider, buttons end-aligned 8px apart. */
.cm-modal-footer {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    box-sizing: border-box;
    height: 40px;
    margin: 8px -16px -8px;
    padding-block: 0;
    padding-inline: 16px 8px;
    box-shadow: inset 0 1px 0 var(--cm-border);
}

/* ---------------------------------------------------------------- 8.6 toast */

/* The pill: #2c2c2c in both themes with the toast shadow; everything inside renders dark. */
.cm-toast {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    min-height: 40px;
    padding: 0 8px;
    border: 0;
    border-radius: 13px;
    background-color: var(--cm-bg-toolbar);
    box-shadow: var(--cm-elevation-toast);
    color: var(--cm-text-menu);
    overflow: visible;
}
.cm-toast::before { display: none; }
.cm-toast > * { color-scheme: dark; }
.cm-toast-icon {
    width: 16px;
    height: 16px;
    margin-inline: 8px -4px;
    border-radius: 0;
    background: none;
    color: inherit;
}
.cm-toast-body { flex: 0 1 auto; margin: 0; overflow: visible; }
.cm-toast-description {
    display: flex;
    align-items: center;
    color: inherit;
    ${cmFont("bodyStrong")}
}
.cm-toast-title { color: inherit; ${cmFont("bodyStrong")} }
/* The message: padding 8, 11/16 550. */
.cm-toast-message {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 8px;
    white-space: nowrap;
    color: var(--cm-text-menu);
    ${cmFont("bodyStrong")}
}
/* The action: Figma's secondary button in the dark scope -- 24 tall, transparent, a 1px
   translucent outline, radius 5; hover #373737 (the transparent hover over #2c2c2c). */
.cm-toast-action {
    box-sizing: border-box;
    height: 24px;
    margin-inline: 4px;
    padding: 0 8px;
    border: 0;
    border-radius: 5px;
    background-color: transparent;
    color: var(--cm-text-menu);
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
    ${cmFont("body")}
}
/* The button's own inner parts carry no inset of their own here: the 8px is the action's. */
.cm-toast-action .mantine-Button-inner,
.cm-toast-action .mantine-Button-label { padding: 0; margin: 0; }
.cm-toast-action:hover { background-color: var(--cm-bg-transparent-hover); }
.cm-toast-action:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
/* The optional dismiss X: a 33px segment with a 1px start border, reaching the pill's end. */
.cm-toast-close {
    box-sizing: border-box;
    width: 33px;
    height: 40px;
    min-width: 33px;
    margin-inline: 4px -8px;
    border: 0;
    border-inline-start: 1px solid var(--cm-border-translucent);
    border-radius: 0;
    background-color: transparent;
    color: var(--cm-icon);
}
.cm-toast-close:hover { background-color: var(--cm-bg-transparent-hover); }
.cm-toast-close:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }

/* The provider's layer: centred horizontally, its bottom edge a caller-set distance above the
   window's (16px above the bottom toolbar in Figma). */
.cm-toast-layer {
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    z-index: 1300;
    pointer-events: none;
}
.cm-toast-layer > * { pointer-events: auto; }

/* ---------------------------------------------------------------- 8.7 overlay scrollbar */

/* Track 10 wide, padding 2, transparent; shown only while the pointer is over the container.
   Mantine's hover rule is :where(scheme) .m_x:hover (0,2,0) and its thumb rule under it (0,3,0),
   answered with the same weight. */
.cm-scroll-scrollbar {
    padding: 2px;
    background-color: transparent;
    transition: none;
}
.cm-scroll-scrollbar:hover { background-color: transparent; }
.cm-scroll-scrollbar[data-orientation="vertical"]:hover { box-shadow: inset 1px 0 0 var(--cm-border); }
:where([dir="rtl"]) .cm-scroll-scrollbar[data-orientation="vertical"]:hover { box-shadow: inset -1px 0 0 var(--cm-border); }
.cm-scroll-scrollbar[data-orientation="horizontal"]:hover { box-shadow: inset 0 1px 0 var(--cm-border); }
/* The thumb element is 6 wide; the visible pill is its ::after, 4px shorter, radius 6. */
.cm-scroll-thumb,
.cm-scroll-scrollbar:hover > .cm-scroll-thumb {
    background-color: transparent;
    border-radius: 0;
    overflow: visible;
    transition: none;
}
.cm-scroll-thumb::after {
    content: "";
    position: absolute;
    inset: 2px 0;
    border-radius: 6px;
    background-color: var(--cm-scrollbar);
}
.cm-scroll-scrollbar[data-orientation="horizontal"] > .cm-scroll-thumb::after { inset: 0 2px; }
.cm-scroll-corner { background-color: transparent; }
/* Keyboard focus on the scroller: a 1px ring inside, and the thumb shows. */
.cm-scroll-viewport:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-scroll-root:has(> .cm-scroll-viewport:focus-visible) > .cm-scroll-scrollbar[data-state="hidden"] { display: flex; }

/* ---------------------------------------------------------------- 8.8 feedback */

/* The loader draws in the icon colour; a color prop still wins through --loader-color. */
.cm-loader { --loader-color: var(--cm-icon); }

/* Progress: a 4px track in the field fill, the fill in the brand token, fully round. */
.cm-progress {
    background-color: var(--cm-bg-secondary);
    border-radius: 9999px;
}
.cm-progress-section { background-color: var(--progress-section-color, var(--cm-bg-brand)); }
.cm-progress-label { ${cmFont("caption")} color: var(--cm-text-onbrand); }

/* RingProgress: the track in the field fill and the label in the text colour. Mantine sets the
   track at [scheme] .m_x (0,2,0). */
.cm-ring-progress .cm-ring-curve { --rp-curve-root-color: var(--cm-bg-secondary); }
.cm-ring-progress-label { color: var(--cm-text); ${cmFont("body")} }
`;

export default css;
