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

/** Each element fate's color in the preview, and in the panes that name a fate. */
export const FATE_COLORS: Readonly<Record<JoinElementFate, string>> = {
    matched: "#1c7ed6",
    updated: "#e8590c",
    added: "#2f9e44",
    merged: "#7048e8",
};

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
