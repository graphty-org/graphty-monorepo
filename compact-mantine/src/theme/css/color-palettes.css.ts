/**
 * PaletteBrowser (src/components/color/PaletteBrowser.tsx): a 240-wide list of palettes, each a
 * row with its name above a 16px strip of its colors in equal hard-stop segments, the strip
 * drawn as the gradient bar is (radius, a 1px translucent outline, the checkerboard behind a
 * translucent color). Spacing is logical, so the list and each strip follow dir="rtl".
 */
import { cmFont } from "../tokens";
import { CHECKER } from "./color.css";

const css = `
.cm-palettes {
    box-sizing: border-box;
    width: 240px;
    padding-block: 8px;
    color: var(--cm-text);
    ${cmFont("body")}
}
.cm-palettes-search { padding-inline: 8px; padding-block-end: 8px; }
.cm-palettes-list { display: flex; flex-direction: column; min-inline-size: 0; }
.cm-palettes-row {
    display: flex;
    flex-direction: column;
    gap: 4px;
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    padding: 4px 16px;
    border: 0;
    background: none;
    color: inherit;
    font: inherit;
    letter-spacing: inherit;
    text-align: start;
    cursor: default;
}
.cm-palettes-row:hover { background: var(--cm-bg-hover); }
.cm-palettes-row[aria-pressed="true"] { background: var(--cm-bg-selected); }
.cm-palettes-row[aria-pressed="true"]:hover { background: var(--cm-bg-selected-hover); }
.cm-palettes-name {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.cm-palettes-strip {
    display: flex;
    height: 16px;
    overflow: hidden;
    border-radius: 2px;
    background: ${CHECKER};
    outline: 1px solid var(--cm-border-translucent);
    outline-offset: -1px;
}
.cm-palettes-strip > span { flex: 1 1 0; }
.cm-palettes-empty { display: block; padding-inline: 16px; color: var(--cm-text-secondary); }
`;

export default css;
