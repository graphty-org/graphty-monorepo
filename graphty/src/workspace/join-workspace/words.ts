/**
 * The join workspace's words, keys and fate colors: what the shell and every build show for the
 * codes graphty-element returns.
 */

import type { JoinElementFate, JoinRowFate } from "@graphty/graphty-element/session";

/** The workspace's keys, shown on their buttons. */
export const JOIN_KEYS = {
    cancel: "Escape",
    done: "Mod+Enter",
    undo: "Mod+Z",
    redo: "Shift+Mod+Z",
} as const;

/** Each card's color, by its position: its border and number, and its elements in the preview. */
export const CARD_COLORS: readonly string[] = [
    "#9747ff",
    "#f24822",
    "#0fa958",
    "#0d99ff",
    "#ffa629",
    "#e8448f",
    "#14ae5c",
    "#7a5af8",
];

/** Rows on one page of the rows table. */
export const ROWS_PAGE = 50;

/** Each row fate's word in the rows table. */
export const ROW_FATE_WORDS: Readonly<Record<JoinRowFate, string>> = {
    joined: "Joined",
    "new-end": "New end",
    repeat: "Repeat",
    "left-out": "Left out",
    merged: "Merged",
    linked: "Linked",
    "over-cap": "Over cap",
};

/** Each element fate's word in the nodes and edges tables. */
export const ELEMENT_FATE_WORDS: Readonly<Record<JoinElementFate, string>> = {
    matched: "Matched",
    updated: "Updated",
    added: "Added",
    merged: "Merged",
};
