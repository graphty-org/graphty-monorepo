/**
 * The tree package's CSS (design/figma-spec.md section 10 and the RankChip look of 9.8): the
 * layer tree, the page list, inline rename, the find result row, DataRow, DataRowHeader,
 * RankChip and DataTable.
 *
 * Row fills are pseudo elements behind the row content (z-index -1 inside an isolated row), with
 * the insets Figma measured and no transition. `[data-state="hover"]` repeats every `:hover` rule
 * so a States story can show hover without a pointer.
 */
import { cmFont } from "../tokens";

const css = `
/* ---- Layer tree (10.1) ------------------------------------------------------------------- */
.cm-tree {
    position: relative;
    color: var(--cm-text);
    outline: none;
}
.cm-tree[data-virtual] { overflow: auto; }
.cm-tree-content { position: relative; }
.cm-tree-row {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    height: 32px;
    ${cmFont("layerNested")}
    color: var(--cm-text);
    outline: none;
    cursor: default;
    user-select: none;
}
.cm-tree-row[data-strong] { font-weight: 600; }
.cm-tree-row::before,
.cm-tree-row::after {
    content: "";
    position: absolute;
    z-index: -1;
    inset-inline-start: 12px;
    inset-inline-end: 8px;
    pointer-events: none;
}
/* The pill: hover, selection, the selected parent. */
.cm-tree-row::after {
    top: 4px;
    height: 24px;
    border-radius: 5px;
    background: transparent;
}
/* The band behind the children of a selected parent. */
.cm-tree-row::before {
    display: none;
    top: 0;
    bottom: 0;
    background: var(--cm-bg-selected-secondary);
}
.cm-tree-row:hover::after,
.cm-tree-row[data-state="hover"]::after { background: var(--cm-bg-hover); }
.cm-tree-row[aria-selected="true"]::after { background: var(--cm-bg-selected); }
.cm-tree-row[data-tint="first"]::after { height: 28px; border-radius: 5px 5px 0 0; }
.cm-tree-row[data-tint="middle"]::after { top: 0; height: 32px; border-radius: 0; }
.cm-tree-row[data-tint="last"]::after { top: 0; height: 28px; border-radius: 0 0 5px 5px; }
.cm-tree-row[data-tint="parent"]::after {
    box-sizing: content-box;
    height: 24px;
    border-bottom: 4px solid var(--cm-bg-selected-secondary);
    border-radius: 5px 5px 0 0;
}
.cm-tree-row[data-tint="child"]::before,
.cm-tree-row[data-tint="child-last"]::before { display: block; }
.cm-tree-row[data-tint="child-last"]::before { bottom: 4px; border-radius: 0 0 5px 5px; }
.cm-tree-row[data-tint^="child"]:hover::after,
.cm-tree-row[data-tint^="child"][data-state="hover"]::after { background: var(--cm-bg-selected-hover); }

/* Keyboard focus (ours; Figma rows take no focus): a 1px ring on the 24 pill area. */
.cm-tree-ring {
    position: absolute;
    top: 4px;
    inset-inline-start: 12px;
    inset-inline-end: 8px;
    height: 24px;
    border-radius: 5px;
    outline: 1px solid transparent;
    outline-offset: 0;
    pointer-events: none;
}
.cm-tree-row:focus-visible .cm-tree-ring,
.cm-tree-row[data-state="focus"] .cm-tree-ring { outline-color: var(--cm-border-selected); }

.cm-tree-indent { flex: none; }
.cm-tree-caret {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 32px;
    color: var(--cm-icon-tertiary);
    visibility: hidden;
}
.cm-tree:hover .cm-tree-caret,
.cm-tree:focus-within .cm-tree-caret,
.cm-tree-row:hover .cm-tree-caret,
.cm-tree-row[data-state="hover"] .cm-tree-caret,
.cm-tree-row[aria-expanded="true"] .cm-tree-caret { visibility: visible; }
.cm-tree-icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 32px;
    color: var(--cm-icon-tertiary);
}
.cm-tree-row[data-strong] .cm-tree-icon,
.cm-tree-row[aria-selected="true"] .cm-tree-icon { color: var(--cm-icon); }
.cm-tree-row[data-tone="component"] .cm-tree-icon { color: var(--cm-icon-component-tertiary); }
.cm-tree-row[data-tone="component"][aria-selected="true"] .cm-tree-icon,
.cm-tree-row[data-tone="component"] .cm-tree-name { color: var(--cm-text-component); }
.cm-tree-name {
    flex: 1 1 auto;
    min-width: 0;
    margin-inline-start: 8px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.cm-tree-row[data-dimmed] .cm-tree-name,
.cm-tree-row[data-dimmed] .cm-tree-icon { color: var(--cm-text-tertiary); }
.cm-tree-row .cm-rename { flex: none; width: 176px; }

/* Lock / eye: 24 hit targets on a 20 pitch, ending 8 from the panel edge. Hidden until the row
   is hovered or focused; a toggle that is on stays visible. */
.cm-tree-actions {
    flex: none;
    display: flex;
    align-items: center;
    height: 24px;
    margin-inline-end: 8px;
}
.cm-tree-actions > * + * { margin-inline-start: -4px; }
.cm-tree-actions > * {
    opacity: 0;
    transition: opacity var(--cm-duration-sm) var(--cm-ease-out);
}
.cm-tree-row:hover .cm-tree-actions > *,
.cm-tree-row[data-state="hover"] .cm-tree-actions > *,
.cm-tree-row:focus-visible .cm-tree-actions > *,
.cm-tree-row:focus-within .cm-tree-actions > *,
.cm-tree-actions > [aria-pressed="true"],
.cm-tree-actions > [aria-checked="true"],
.cm-tree-actions > [data-pinned],
.cm-tree-actions > :has([aria-pressed="true"], [aria-checked="true"], :checked) { opacity: 1; }

/* Sticky expanded top-level rows (stickyRoots). */
.cm-tree[data-sticky-roots] .cm-tree-block > .cm-tree-row[aria-level="1"][aria-expanded="true"] {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--cm-bg);
    box-shadow: 0 1px 0 0 var(--cm-border);
}

/* Drag and drop: a box around the target container, a 2px line at the insertion point. */
.cm-tree-drop-box {
    position: absolute;
    left: 0;
    right: 0;
    height: 32px;
    box-sizing: border-box;
    border: 1px solid var(--cm-border-selected);
    pointer-events: none;
    z-index: 3;
}
.cm-tree-drop-line {
    position: absolute;
    right: 0;
    height: 2px;
    background: var(--cm-icon);
    pointer-events: none;
    z-index: 3;
}

/* ---- Page list (10.2) -------------------------------------------------------------------- */
.cm-page-list { display: flex; flex-direction: column; outline: none; }
.cm-page-cell {
    box-sizing: border-box;
    height: 32px;
    padding: 4px 8px;
    border-radius: 5px;
    outline: 1px solid transparent;
    outline-offset: 0;
    cursor: default;
}
.cm-page-cell:focus-visible,
.cm-page-cell[data-state="focus"] { outline: 1px solid var(--cm-border-selected); outline-offset: 0; }
.cm-page-button {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    width: 100%;
    height: 24px;
    padding: 0 8px;
    border: 0;
    border-radius: 5px;
    background: var(--cm-bg);
    color: var(--cm-text);
    font-size: 11px;
    line-height: 24px;
    font-weight: 400;
    letter-spacing: normal;
}
.cm-page-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-page-cell:hover .cm-page-button,
.cm-page-cell[data-state="hover"] .cm-page-button { background: var(--cm-bg-hover); }
.cm-page-cell[aria-current="page"] .cm-page-button {
    background: var(--cm-bg-secondary);
    font-weight: 550;
    letter-spacing: 0.055px;
}
.cm-page-cell[data-tone="group"][aria-selected="true"] .cm-page-button {
    background: var(--cm-bg-selected);
    font-weight: 600;
}
.cm-page-divider { flex: 1 1 auto; height: 1px; background: var(--cm-border); }
.cm-page-cell .cm-rename { width: 100%; }

/* ---- Inline rename (10.3) ---------------------------------------------------------------- */
/* Doubled classes: the inputs package themes TextInput through classNames too, and this field
   must win over its filled-field look without !important. */
.cm-rename.cm-rename { min-width: 0; }
.cm-rename.cm-rename .cm-rename-wrapper {
    margin: 0;
    background: transparent;
    outline: none;
    box-shadow: none;
    border: 0;
    min-height: 0;
}
.cm-rename.cm-rename .cm-rename-input {
    box-sizing: border-box;
    width: 100%;
    height: 24px;
    min-height: 24px;
    padding-block: 0;
    padding-inline: 7px 0;
    background: var(--cm-bg);
    border: 1px solid var(--cm-border-selected);
    border-radius: 5px;
    outline: none;
    box-shadow: none;
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-rename.cm-rename .cm-rename-input::selection { background-color: var(--cm-text-highlight); }

/* ---- Find result row (10.4) -------------------------------------------------------------- */
.cm-result-row {
    box-sizing: border-box;
    display: flex;
    align-items: flex-start;
    gap: 8px;
    width: 100%;
    min-height: 34px;
    padding-block: 8px;
    padding-inline: 16px 8px;
    border: 1px solid var(--cm-bg);
    background: var(--cm-bg);
    color: var(--cm-text);
    font-size: 11px;
    line-height: 16px;
    font-weight: 400;
    letter-spacing: normal;
    text-align: start;
    cursor: default;
}
.cm-result-row:hover,
.cm-result-row[data-state="hover"] { background: var(--cm-bg-hover); border-color: var(--cm-bg-hover); }
.cm-result-row[aria-selected="true"] { background: var(--cm-bg-selected); border-color: var(--cm-bg-selected); }
.cm-result-icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--cm-icon);
}
.cm-result-text { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.cm-result-name,
.cm-result-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-result-match { font-weight: 600; }
.cm-result-path { font-size: 10px; line-height: 16px; color: var(--cm-text-secondary); }
.cm-result-row[data-tone="component"],
.cm-result-row[data-tone="component"] .cm-result-icon,
.cm-result-row[data-tone="component"] .cm-result-path { color: var(--cm-text-component); }

/* ---- DataRow, DataRowHeader, RankChip (10.5, 9.8) ---------------------------------------- */
.cm-data-row {
    position: relative;
    isolation: isolate;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding-block: 0;
    padding-inline: 16px 8px;
    color: var(--cm-text);
    font-size: 11px;
    line-height: 32px;
    font-weight: 450;
    letter-spacing: 0.055px;
}
.cm-data-row::after,
.cm-data-row::before {
    content: "";
    position: absolute;
    top: 4px;
    inset-inline-start: 12px;
    inset-inline-end: 8px;
    height: 24px;
    border-radius: 5px;
    pointer-events: none;
}
.cm-data-row::after { z-index: -1; background: transparent; }
.cm-data-row::before { outline: 1px solid transparent; outline-offset: 0; }
.cm-data-row[data-interactive]:hover::after,
.cm-data-row[data-state="hover"]::after { background: var(--cm-bg-hover); }
/* Selected wins over hover: the :hover selector matches the hover rule's specificity. */
.cm-data-row[data-selected]::after,
.cm-data-row[data-selected]:hover::after { background: var(--cm-bg-selected); }
.cm-data-row:has(.cm-data-row-body:focus-visible)::before,
.cm-data-row[data-state="focus"]::before { outline-color: var(--cm-border-selected); }
.cm-data-row-body {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    height: 100%;
    padding: 0;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: start;
    outline: none;
    cursor: default;
}
.cm-data-row-icon {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    color: var(--cm-icon-secondary);
}
.cm-data-row-name {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.cm-data-row-value { flex: none; color: var(--cm-text-secondary); }
.cm-data-row:not([data-trailing]) .cm-data-row-value { padding-inline-end: 8px; }

.cm-data-row-header {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    height: 32px;
    padding-block: 0;
    padding-inline: 16px;
    ${cmFont("bodyStrong")}
    color: var(--cm-text-secondary);
}
.cm-data-row-header-sort {
    display: flex;
    align-items: center;
    gap: 8px;
    flex: 1 1 auto;
    min-width: 0;
    height: 24px;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: start;
    cursor: default;
    outline: 1px solid transparent;
    outline-offset: 1px;
}
.cm-data-row-header-sort:focus-visible { outline: 1px solid var(--cm-border-selected); outline-offset: 1px; }
.cm-data-row-header-label {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.cm-data-row-header[aria-sort="ascending"] .cm-data-row-header-label,
.cm-data-row-header[aria-sort="descending"] .cm-data-row-header-label,
.cm-data-row-header[data-sorted] .cm-data-row-header-label,
.cm-sort-caret { color: var(--cm-text); }
.cm-sort-caret {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 10px;
    height: 16px;
}
.cm-sort-caret[data-direction="ascending"] { transform: rotate(180deg); }

.cm-rank-chip {
    flex: none;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    height: 16px;
    padding: 0 4px;
    border-radius: 5px;
    outline: 1px solid var(--cm-border);
    outline-offset: -1px;
    background: transparent;
    color: var(--cm-text);
    ${cmFont("body")}
    white-space: nowrap;
}

/* ---- DataTable (10.6) -------------------------------------------------------------------- */
.cm-dt { display: flex; flex-direction: column; gap: 8px; width: 100%; color: var(--cm-text); }
.cm-dt-count { flex: none; color: var(--cm-text-secondary); ${cmFont("body")} }
.cm-dt-viewport { position: relative; overflow: auto; background: var(--cm-bg); }
/* Every cell draws its grid line as a 1px outline over a 1px gap, so neighboring lines overlap
   instead of doubling. The table's 1px padding keeps the outer lines inside the scroll area. */
.cm-dt .cm-dt-table {
    display: grid;
    row-gap: 1px;
    box-sizing: border-box;
    padding: 1px;
    background: var(--cm-bg);
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-dt .cm-dt-head { display: grid; position: sticky; top: 1px; z-index: 1; background: var(--cm-bg); }
.cm-dt .cm-dt-row { display: flex; gap: 1px; }
.cm-dt .cm-dt-cell {
    position: relative;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    min-width: 0;
    padding: 0 8px;
    border: 0;
    background: var(--cm-bg);
    outline: 1px solid var(--cm-border);
    outline-offset: 0;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    cursor: default;
}
/* Figma's variables table (ls/vars-04): the name column is padded 0 16 and set at 400 with no
   tracking; value cells are padded 12 / 8 at the body font; every header cell is padded 0 16. */
.cm-dt .cm-dt-cell:not(:first-child) { padding-inline: 12px 8px; }
.cm-dt .cm-dt-cell:first-child { padding: 0 16px; }
.cm-dt .cm-dt-cell:first-child:not(.cm-dt-header) { font-weight: 400; letter-spacing: normal; }
.cm-dt .cm-dt-cell.cm-dt-header { padding: 0 16px; }
.cm-dt .cm-dt-header { ${cmFont("body")} font-weight: 600; letter-spacing: normal; color: var(--cm-text); }
.cm-dt .cm-dt-row[aria-selected="true"] > .cm-dt-cell { background: var(--cm-bg-selected); }
/* The active (keyboard) cell: a 1px box drawn inside the cell; the grid line stays. */
.cm-dt .cm-dt-cell::before,
.cm-dt .cm-dt-sort::before {
    content: "";
    position: absolute;
    inset: 0;
    box-sizing: content-box;
    border: 1px solid transparent;
    pointer-events: none;
}
.cm-dt .cm-dt-cell:focus-visible,
.cm-dt .cm-dt-sort:focus-visible { outline: 1px solid var(--cm-border); outline-offset: 0; }
.cm-dt .cm-dt-cell:focus-visible::before,
.cm-dt .cm-dt-cell[data-state="focus"]::before,
.cm-dt .cm-dt-sort:focus-visible::before { border-color: var(--cm-border-selected); }
.cm-dt .cm-dt-cell:has(> .cm-dt-sort) { padding: 0; }
.cm-dt .cm-dt-sort {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 16px;
    border: 0;
    background: transparent;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: start;
    cursor: default;
}
.cm-dt .cm-dt-sort[data-align="end"] { justify-content: flex-end; }
.cm-dt .cm-dt-sort-priority { flex: none; color: var(--cm-text-secondary); ${cmFont("caption")} }
.cm-dt .cm-dt-text { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-dt-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    color: var(--cm-text-secondary);
    ${cmFont("body")}
}
`;

export default css;
