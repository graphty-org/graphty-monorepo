/**
 * @file A card's "..." menu in every workspace of cards (the Filters workspace and the join workspace): one
 * builder, its words in CARD_MENU_WORDS.
 */

import { CARD_KEYS } from "./cardKeys";
import type { SelectionMenuItem } from "./SelectionMenu";
import { CARD_MENU_WORDS } from "./words";

/** What a card's menu offers, and where the card stands. */
export interface CardMenuCard {
    /** Its place in the list, from 0. */
    readonly at: number;
    /** How many cards the list holds. */
    readonly count: number;
    /** Whether it is on; null where it cannot be turned off. */
    readonly on: boolean | null;
    /** Whether it can be renamed. */
    readonly renames: boolean;
    /** A workspace's own items, after Turn off and before Move up. */
    readonly more?: readonly SelectionMenuItem[];
}

/** What a card's items do. */
export interface CardMenuActs {
    readonly rename: () => void;
    readonly turn: (on: boolean) => void;
    readonly move: (by: -1 | 1) => void;
    readonly remove: () => void;
}

/**
 * A card's "..." items: Rename, Turn off or on, a workspace's own items, Move up, Move down, Delete, each by
 * the key {@link CARD_KEYS} gives it.
 * @param card - what it offers, and where it stands
 * @param acts - what the items do
 * @returns the items
 */
export function cardMenuItems(card: CardMenuCard, acts: CardMenuActs): readonly SelectionMenuItem[] {
    const { on } = card;
    return [
        ...(card.renames
            ? [
                  {
                      id: "rename",
                      label: CARD_MENU_WORDS.rename,
                      icon: "rename",
                      group: "edit",
                      key: CARD_KEYS.rename,
                      onRun: acts.rename,
                  } as const,
              ]
            : []),
        ...(on === null
            ? []
            : [
                  {
                      id: "hide",
                      label: on ? CARD_MENU_WORDS.turnOff : CARD_MENU_WORDS.turnOn,
                      icon: on ? "hide" : "show",
                      group: "edit",
                      key: CARD_KEYS.off,
                      onRun: () => {
                          acts.turn(!on);
                      },
                  } as const,
              ]),
        ...(card.more ?? []),
        {
            id: "up",
            label: CARD_MENU_WORDS.moveUp,
            icon: "moveUp",
            group: "edit",
            key: CARD_KEYS.up,
            reason: card.at === 0 ? CARD_MENU_WORDS.atTop : null,
            reasonDrawn: false,
            onRun: () => {
                acts.move(-1);
            },
        },
        {
            id: "down",
            label: CARD_MENU_WORDS.moveDown,
            icon: "moveDown",
            group: "edit",
            key: CARD_KEYS.down,
            reason: card.at === card.count - 1 ? CARD_MENU_WORDS.atBottom : null,
            reasonDrawn: false,
            onRun: () => {
                acts.move(1);
            },
        },
        {
            id: "delete",
            label: CARD_MENU_WORDS.delete,
            icon: "delete",
            group: "remove",
            key: CARD_KEYS.delete,
            onRun: acts.remove,
        },
    ];
}
