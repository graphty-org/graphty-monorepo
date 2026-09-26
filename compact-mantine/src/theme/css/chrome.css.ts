/**
 * The chrome package's CSS (design/figma-spec.md section 9): section headers, legends, captions,
 * sub-groups, property rows, chart rows, the resize handle, and Mantine's Divider color.
 *
 * Geometry that never changes lives in the components' own inline styles, laid out from
 * PANEL_GRID. What lives here is what inline styles cannot express: hover and focus states, the
 * 100ms color transitions, the type roles, and colors that must yield to a state rule.
 */
import { cmFont } from "../tokens";

const css = `
/* Mantine Divider: Figma's divider color (spec 9.7). Doubled class so it outranks Mantine's
   per-scheme rule; a caller's color prop still wins because Mantine writes it inline. */
.mantine-Divider-root.mantine-Divider-root { --divider-color: var(--cm-border); }

/* Section (spec 9.2): 40 header, rows, 12 bottom pad, a 1px rule BELOW. */
.cm-section { border-bottom: 1px solid var(--cm-border); }
.cm-section-header {
    display: flex;
    align-items: center;
    gap: 4px;
    box-sizing: border-box;
    height: 40px;
    padding-inline: 16px 8px;
    color: var(--cm-text);
    transition: color 100ms ease-out;
}
.cm-section[data-empty] .cm-section-header { color: var(--cm-text-secondary); }
.cm-section[data-empty] .cm-section-header:hover { color: var(--cm-text); }
.cm-section-lead {
    display: flex;
    align-items: center;
    flex: 1 1 auto;
    min-width: 0;
    height: 32px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: inherit;
    text-align: start;
    font: inherit;
}
/* The toggle reaches into the 16px gutter so the chevron sits at x 0..16. */
.cm-section-lead[data-collapsible] { margin-inline-start: -16px; }
.cm-section-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    color: inherit;
    transition: color 100ms ease-out;
}
.cm-section-title {
    display: block;
    min-width: 0;
    ${cmFont("bodyStrong")}
    line-height: 32px;
    letter-spacing: normal;
    color: inherit;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: color 100ms ease-out;
}
.cm-section-technical { font-weight: 450; color: var(--cm-text-secondary); }
.cm-section-dot {
    flex: 0 0 auto;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--cm-bg-brand);
}
.cm-section-actions { display: flex; align-items: center; gap: 4px; flex: 0 0 auto; }
.cm-section .cm-section-add { transition: color 100ms ease-out; }
.cm-section[data-empty] .cm-section-add { color: var(--cm-icon-secondary); }
.cm-section[data-empty] .cm-section-header:hover .cm-section-add { color: var(--cm-icon); }
.cm-section-content { padding: 0 8px 12px 16px; }

/* Legend (spec 9.3): a 16 band, the text a 9/14 500 caption in the secondary ink. */
.cm-legend {
    display: flex;
    align-items: center;
    gap: 4px;
    min-height: 16px;
    margin: 0;
    padding: 0;
}
.cm-legend-text,
.cm-caption {
    display: block;
    min-width: 0;
    ${cmFont("captionStrong")}
    color: var(--cm-text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

/* Sub-group (spec 9.4): a 32 row, chevron in the gutter, secondary label that turns primary
   on hover over 100ms. */
.cm-subgroup-control {
    display: flex;
    align-items: center;
    box-sizing: border-box;
    width: calc(100% + 16px);
    height: 32px;
    margin-inline-start: -16px;
    padding: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--cm-text-secondary);
    ${cmFont("body")}
    transition: color 100ms ease-out;
}
.cm-subgroup-control:hover { color: var(--cm-text); }
.cm-subgroup-chevron {
    display: flex;
    align-items: center;
    justify-content: center;
    flex: 0 0 16px;
    width: 16px;
    height: 16px;
    color: inherit;
}

/* Property rows (spec 9.6). */
.cm-row-reading {
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}
.cm-row-reading[data-disabled] { color: var(--cm-text-disabled); }
.cm-row-actions { transition: opacity 100ms ease-out; }

/* The compound readout: one filled field, 1px panel-colored seams between segments. */
.cm-compound {
    box-sizing: border-box;
    background-color: var(--cm-bg-secondary);
    border-radius: 5px;
    color: var(--cm-text);
    ${cmFont("body")}
}
/* The interactive readout is itself the focused element, so it writes the whole outline:
   Mantine's .mantine-focus-never:focus { outline: none } would otherwise erase cm-field's ring. */
.cm-compound.cm-field:focus { outline: 1px solid var(--cm-border-selected); outline-offset: -1px; }
.cm-compound-seam { background: var(--cm-bg); }
.cm-compound-unit { color: var(--cm-text-secondary); }

/* Chart, ramp and prose rows (spec 9.8). */
.cm-chart-text {
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}
.cm-chart-value { ${cmFont("body")} color: var(--cm-text); }
.cm-prose {
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}

/* Advanced settings button: a changed setting draws its glyph in the brand ink. The open look
   (aria-expanded) belongs to the ghost icon button's theme. */
.cm-advanced-button[data-changed="true"]:not(:disabled):not([aria-expanded="true"]) {
    color: var(--cm-icon-brand);
}

/* Resize handle (spec 9.9): invisible until keyboard focus draws the grip pill. */
.cm-resize-handle {
    position: absolute;
    z-index: 1;
    box-sizing: border-box;
    outline: none;
    touch-action: none;
}
.cm-resize-handle[data-edge="end"],
.cm-resize-handle[data-edge="start"] { top: 0; bottom: 0; width: 8px; }
.cm-resize-handle[data-edge="end"] { inset-inline-end: -4px; }
.cm-resize-handle[data-edge="start"] { inset-inline-start: -4px; }
.cm-resize-handle[data-edge="top"],
.cm-resize-handle[data-edge="bottom"] { left: 0; right: 0; height: 8px; cursor: ns-resize; }
.cm-resize-handle[data-edge="top"] { top: -4px; }
.cm-resize-handle[data-edge="bottom"] { bottom: -4px; }
.cm-resize-handle:focus-visible::before,
[data-cm-force="focus"] .cm-resize-handle::before {
    content: "";
    position: absolute;
    border-radius: 9999px;
    background-color: var(--cm-border-selected);
    pointer-events: none;
}
.cm-resize-handle[data-edge="end"]:focus-visible::before,
.cm-resize-handle[data-edge="start"]:focus-visible::before,
[data-cm-force="focus"] .cm-resize-handle[data-edge="end"]::before,
[data-cm-force="focus"] .cm-resize-handle[data-edge="start"]::before {
    left: 2px;
    right: 2px;
    top: 50%;
    height: min(100%, 500px);
    transform: translateY(-50%);
}
.cm-resize-handle[data-edge="top"]:focus-visible::before,
.cm-resize-handle[data-edge="bottom"]:focus-visible::before,
[data-cm-force="focus"] .cm-resize-handle[data-edge="top"]::before,
[data-cm-force="focus"] .cm-resize-handle[data-edge="bottom"]::before {
    top: 2px;
    bottom: 2px;
    left: 50%;
    width: 120px;
    transform: translateX(-50%);
}

/* States-story hooks (spec 16): a story cannot hold a real :hover or :focus-visible, so a
   wrapper with data-cm-force draws the state on its subtree. Nothing in a component sets it. */
[data-cm-force="hover"] .cm-section[data-empty] .cm-section-header { color: var(--cm-text); }
[data-cm-force="hover"] .cm-section[data-empty] .cm-section-add { color: var(--cm-icon); }
[data-cm-force="hover"] .cm-subgroup-control { color: var(--cm-text); }
[data-cm-force="hover"] .cm-compound.cm-field { outline-color: var(--cm-border); }
[data-cm-force="focus"] .cm-section-lead[data-collapsible],
[data-cm-force="focus"] .cm-subgroup-control,
[data-cm-force="focus"] .cm-compound.cm-field {
    outline: 1px solid var(--cm-border-selected);
    outline-offset: -1px;
}
`;

export default css;
