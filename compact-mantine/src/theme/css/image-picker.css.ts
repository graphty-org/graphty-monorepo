/**
 * ImagePicker's and TileButton's CSS: the field fills its FieldRow slot; the pop-out stacks the tiles, the loader
 * and the caller's footer 8px apart. At size sm (ImagePicker's library) a tile is one 24px row, a 16px thumbnail
 * then the name, lit on hover and drawn chosen while pressed. At md and lg it follows Figma's asset tile (design/ui/
 * figma/components.md, "Cards and tiles"): a square picture, radius 5, 96px (md) or 144px (lg), the name 4px under it,
 * no padding; hover lights the tile and a 4px ring of the same ground around it; keyboard focus rings the picture
 * 2px inside. A tile is never wider than its grid cell. Tokens only; spacing is logical so dir="rtl" works.
 */
import { cmFont } from "../tokens";

const css = `
.cm-image-picker { width: 100%; min-width: 0; }
.cm-image-picker-body { display: flex; flex-direction: column; gap: 8px; }
.cm-image-picker-tiles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cm-image-picker-heading { margin-block-start: 4px; }
.cm-tile-button {
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 96px;
    max-width: 100%;
    min-width: 0;
    padding: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--cm-text);
    ${cmFont("body")}
    text-align: start;
    cursor: default;
}
.cm-tile-button[data-size="lg"] { width: 144px; }
.cm-tile-button:hover { background: var(--cm-bg-hover); }
.cm-tile-button[aria-pressed="true"] { background: var(--cm-bg-selected); }
.cm-tile-button:not([data-size="sm"]):hover { outline: 4px solid var(--cm-bg-hover); }
.cm-tile-button:not([data-size="sm"])[aria-pressed="true"] { outline: 4px solid var(--cm-bg-selected); }
/* Keyboard focus rings the picture, 2px inside, not the tile. */
.cm-tile-button:not([data-size="sm"]):focus-visible { outline: none; }
.cm-tile-button:not([data-size="sm"]):focus-visible > .cm-tile-button-picture {
    outline: 2px solid var(--cm-border-selected);
    outline-offset: -2px;
}
/* A press always lands on the tile: a picture that swaps in under the pointer between press and release would
   otherwise take the click. */
.cm-tile-button > * { pointer-events: none; }
.cm-tile-button[aria-disabled="true"] { background: transparent; outline: none; opacity: 0.5; cursor: not-allowed; }
.cm-tile-button-picture {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 1;
    border-radius: 5px;
    background: var(--cm-bg-secondary);
    color: var(--cm-icon);
    object-fit: cover;
}
.cm-tile-button-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-tile-button[data-size="sm"] {
    flex-direction: row;
    align-items: center;
    width: 100%;
    height: 24px;
    padding: 0 4px;
}
.cm-tile-button[data-size="sm"] .cm-tile-button-picture {
    flex: none;
    width: auto;
    aspect-ratio: auto;
    border-radius: 0;
    background: none;
}
.cm-tile-button[data-size="sm"] img.cm-tile-button-picture { width: 16px; height: 16px; }
.cm-tile-button[data-size="sm"] .cm-tile-button-name { flex: 1 1 auto; }
.cm-image-picker-glyph { display: block; flex: none; }
.cm-image-picker-thumb { display: block; flex: none; width: 16px; height: 16px; object-fit: cover; }
`;

export default css;
