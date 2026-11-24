/**
 * FontPicker's pop-out body: the search box, the grouped list (the listbox rows of spec 6.5, drawn
 * on the pop-out itself rather than on a floating menu surface) and the actions under it.
 */
import { cmFont } from "../tokens";

const css = `
.cm-font-picker {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.cm-font-picker-search {
    padding: 12px 16px 4px;
}
/* The list keeps the listbox's row look and the page's menu ink, without the floating surface's
   radius, shadow and padding: the pop-out is the surface. */
.cm-listbox.cm-menu-surface.cm-font-picker-list {
    max-height: 280px;
    padding: 4px 0;
    border-radius: 0;
    box-shadow: none;
    background-color: transparent;
}
.cm-font-picker-empty {
    padding: 4px 16px;
    ${cmFont("body")}
    color: var(--cm-text-secondary);
}
.cm-font-picker-actions {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px 16px 12px;
    border-block-start: 1px solid var(--cm-border-translucent);
}
`;

export default css;
