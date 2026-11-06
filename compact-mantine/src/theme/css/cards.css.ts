/**
 * The CardList's CSS: a stack of cards, each tinted in its identity color (a 4px start border, a 7%
 * ground, a 45% border and a 14% header), its header one line whose title truncates so the header
 * slot after it never overlaps it.
 */
import { cmFont } from "../tokens";

const css = `
.cm-card-list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.cm-list-card {
    --cm-card-color: var(--cm-border);
    min-width: 0;
    background: var(--cm-bg);
    border: 1px solid var(--cm-border);
    border-radius: 6px;
}
.cm-list-card[data-colored] {
    background: color-mix(in srgb, var(--cm-card-color) 7%, var(--cm-bg));
    border-color: color-mix(in srgb, var(--cm-card-color) 45%, var(--cm-bg));
    border-inline-start: 4px solid var(--cm-card-color);
}
.cm-list-card:focus { outline: none; }
.cm-list-card:focus-visible { outline: 1px solid var(--cm-border-selected); }
.cm-list-card[data-off] { opacity: 0.6; }
.cm-list-card[data-dragging] { box-shadow: 0 4px 12px rgb(0 0 0 / 18%); }
.cm-card-head {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
    height: 30px;
    padding-inline: 4px;
    border-start-end-radius: 5px;
    ${cmFont("body")}
}
.cm-list-card[data-colored] .cm-card-head { background: color-mix(in srgb, var(--cm-card-color) 14%, var(--cm-bg)); }
.cm-list-card[data-folded] .cm-card-head { border-end-end-radius: 5px; }
.cm-card-head > * { flex: none; }
.cm-card-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    padding: 0;
    color: var(--cm-text-secondary);
    background: none;
    border: 0;
    border-radius: 3px;
    cursor: pointer;
}
.cm-card-icon:hover { color: var(--cm-text); background: color-mix(in srgb, var(--cm-text) 8%, transparent); }
.cm-card-icon:focus-visible, .cm-card-name:focus-visible { outline: 1px solid var(--cm-border-selected); }
.cm-card-grip { cursor: grab; touch-action: none; }
/* At rest a card's header holds its name and what it says: the grip and the x come with the pointer
   or the keyboard, and stay where a pointer cannot hover. */
@media (hover: hover) {
    .cm-list-card:not(:hover, :focus-within) .cm-card-grip,
    .cm-list-card:not(:hover, :focus-within) [data-card-remove] { opacity: 0; }
}
.cm-list-card[data-dragging] .cm-card-grip { cursor: grabbing; }
.cm-list-card[data-folded] .cm-card-fold svg { transform: rotate(-90deg); }
.cm-card-chit {
    width: 12px;
    height: 12px;
    border-radius: 3px;
    background: var(--cm-card-color);
}
/* The title shrinks before anything else in the header, with an ellipsis. */
.cm-card-head > .cm-card-name,
.cm-card-head > .cm-card-title,
.cm-card-head > .mantine-TextInput-root { flex: 0 1 auto; min-width: 24px; }
/* Folded, a long title leaves the summary its share of the line. */
.cm-list-card[data-folded] .cm-card-head > .cm-card-name,
.cm-list-card[data-folded] .cm-card-head > .cm-card-title { max-width: 40%; }
.cm-card-name {
    display: inline-flex;
    min-width: 0;
    padding: 0 2px;
    font: inherit;
    font-weight: 600;
    color: var(--cm-text);
    background: none;
    border: 0;
    border-radius: 3px;
    cursor: text;
}
.cm-card-name:hover { background: color-mix(in srgb, var(--cm-text) 8%, transparent); }
.cm-card-title {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-weight: 600;
}
.cm-card-head > .cm-card-summary {
    flex: 1 1 0;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--cm-text-secondary);
}
.cm-card-slot { display: inline-flex; align-items: center; gap: 4px; }
.cm-card-body { min-width: 0; }
.cm-card-foot {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px;
    border-top: 1px solid color-mix(in srgb, var(--cm-card-color) 30%, var(--cm-bg));
}
`;

export default css;
