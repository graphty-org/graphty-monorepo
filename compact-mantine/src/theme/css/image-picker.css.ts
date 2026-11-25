/**
 * ImagePicker's CSS: the field fills its FieldRow slot; the pop-out stacks the tiles, the loader
 * and the caller's footer 8px apart; each tile is one 24px row, a 16px thumbnail then the name,
 * lit on hover and drawn chosen while pressed. TileButton is the same tile drawn as a picture with its name under
 * it, sharing the tile's ground, hover and pressed states. Tokens only; spacing is logical so dir="rtl" works.
 */
import { cmFont } from "../tokens";

const css = `
.cm-image-picker { width: 100%; min-width: 0; }
.cm-image-picker-body { display: flex; flex-direction: column; gap: 8px; }
.cm-image-picker-tiles { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.cm-image-picker-heading { margin-block-start: 4px; }
.cm-image-picker-tile, .cm-tile-button {
    box-sizing: border-box;
    width: 100%;
    min-width: 0;
    border: 0;
    border-radius: 5px;
    background: transparent;
    color: var(--cm-text);
    ${cmFont("body")}
    text-align: start;
    cursor: default;
}
.cm-image-picker-tile:hover, .cm-tile-button:hover { background: var(--cm-bg-hover); }
.cm-image-picker-tile[aria-pressed="true"], .cm-tile-button[aria-pressed="true"] { background: var(--cm-bg-selected); }
.cm-image-picker-tile {
    display: flex;
    align-items: center;
    gap: 4px;
    height: 24px;
    padding-inline: 4px;
}
.cm-tile-button { display: flex; flex-direction: column; gap: 2px; padding: 4px; }
/* A press always lands on the tile: a picture that swaps in under the pointer between press and release would
   otherwise take the click. */
.cm-tile-button > * { pointer-events: none; }
.cm-tile-button[aria-disabled="true"] { background: transparent; opacity: 0.5; cursor: not-allowed; }
.cm-tile-button-picture {
    display: flex;
    align-items: center;
    justify-content: center;
    box-sizing: border-box;
    width: 100%;
    aspect-ratio: 4 / 3;
    border-radius: 4px;
    background: var(--cm-bg-secondary);
    color: var(--cm-icon);
    object-fit: cover;
}
.cm-tile-button-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cm-image-picker-tile > svg { color: var(--cm-icon); }
.cm-image-picker-glyph { display: block; flex: none; }
.cm-image-picker-thumb { display: block; flex: none; width: 16px; height: 16px; object-fit: cover; }
.cm-image-picker-name { flex: 1 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

export default css;
