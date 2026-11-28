/**
 * @file A card's keys in every workspace of cards (the selection workspace and the join workspace): the
 * keys its "..." menu shows, pressed on the card, and Tab kept inside the modal.
 */

import type React from "react";

import { tabStops } from "../frame/focus";
import { isTypingTarget, matchesKey } from "../keys/keys";
import type { SelectionMenuItem } from "./SelectionMenu";

/** A card's keys, as its "..." menu shows them, in every workspace of cards. */
export const CARD_KEYS = {
    rename: "F2",
    off: "Shift+Mod+H",
    duplicate: "Mod+D",
    up: "Mod+]",
    down: "Mod+[",
    delete: "Delete",
} as const;

/**
 * A card's keys, as its "..." menu shows them, on the card itself (a click on its blank space focuses it)
 * or on its header's controls (its grip, its fold, ...): the item whose key was pressed runs, unless it
 * says why it cannot.
 * @param event - the key press
 * @param itemsOf - a card's "..." items, by its id; undefined for no such card
 * @returns true when an item ran
 */
export function runCardKey(
    event: React.KeyboardEvent<HTMLElement>,
    itemsOf: (cardId: string) => readonly SelectionMenuItem[] | undefined,
): boolean {
    const target = event.target as HTMLElement;
    const card = target.matches("[data-card-id]")
        ? target
        : target.closest<HTMLElement>("[data-card-id] > .cm-card-head")?.parentElement;
    const cardId = card?.dataset.cardId;
    if (cardId === undefined || isTypingTarget(target)) {
        return false;
    }
    const item = itemsOf(cardId)?.find(
        (each) => each.key !== undefined && (each.reason ?? null) === null && matchesKey(event.nativeEvent, each.key),
    );
    if (item === undefined) {
        return false;
    }
    event.preventDefault();
    event.stopPropagation();
    item.onRun();
    return true;
}

/**
 * Tab inside a modal: past its last control to its first, and back, never on to the page behind it.
 * @param event - the key press
 * @param root - the modal
 */
export function tabWrap(event: React.KeyboardEvent<HTMLElement>, root: HTMLElement | null): void {
    if (event.key !== "Tab" || event.altKey || event.ctrlKey || event.metaKey || root === null) {
        return;
    }
    const stops = tabStops(root);
    const [from, to] = event.shiftKey ? [stops.at(0), stops.at(-1)] : [stops.at(-1), stops.at(0)];
    if (from === event.target && to !== undefined) {
        event.preventDefault();
        to.focus();
    }
}
