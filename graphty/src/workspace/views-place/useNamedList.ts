/**
 * What the Views place's Cameras and Video tours sections share: a list of named items in the
 * element's order (`session.views` or `session.tours`), one card unfolded at a time, renamed from
 * the title or F2, moved with Mod+] and Mod+[, deleted with Delete, each change one undo step.
 */

import type { CardListItem, CardListProps } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import { type RefObject, useEffect, useRef, useState } from "react";

import { orRefusal } from "../graph-place/actions";
import type { SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";
import { moveBy, useHeaderKeys } from "./commands";

/** The CardList props a named list sets. */
type ListProps = Required<
    Pick<CardListProps, "autoFold" | "folded" | "onFoldedChange" | "onReorder" | "onRenamingChange" | "onRename">
> &
    Pick<CardListProps, "renaming">;

/** A named list's state and actions. */
export interface NamedList {
    readonly names: string[];
    readonly open: string | null;
    readonly setOpen: (name: string | null) => void;
    readonly setRenaming: (name: string | null) => void;
    readonly wrapper: RefObject<HTMLDivElement | null>;
    /** The Move up and Move down rows of a card's menu. */
    readonly moveItems: (name: string, at: number) => SelectionMenuItem[];
    /** The Delete row of a card's menu. */
    readonly deleteItems: (name: string) => SelectionMenuItem[];
    /** The props for the section's CardList. */
    readonly listProps: ListProps;
    /** Draws a card for each name that is still saved. */
    readonly cards: <T>(
        get: (name: string) => T | undefined,
        card: (name: string, item: T, at: number) => CardListItem,
    ) => CardListItem[];
}

/**
 * The state and actions of a list of named cameras or tours.
 * @param list - `session.views` or `session.tours`.
 * @param store - the workspace store, for refusals.
 * @param onRenamed - called after the element renamed an item, with its old and new name.
 * @returns the list.
 */
export function useNamedList(
    list: GraphSession["views"] | GraphSession["tours"],
    store: WorkspaceStore,
    onRenamed?: (from: string, to: string) => void,
): NamedList {
    const [open, setOpen] = useState<string | null>(null);
    const [renaming, setRenaming] = useState<string | null>(null);
    const names = [...list.keys()];
    // A card's title to focus once the list draws again: after a rename, under its new name (or
    // its old one when the element refused it).
    const focusTitle = useRef<string | null>(null);

    const remove = (name: string): void => {
        void orRefusal(store, `delete ${name}`, list.remove([name]));
    };
    const move = (name: string, by: -1 | 1): void => {
        const work = moveBy(list, name, by);
        if (work !== undefined) {
            void orRefusal(store, `move ${name}`, work);
        }
    };
    const wrapper = useHeaderKeys((name, key) => {
        if (key === "rename") {
            setRenaming(name);
        } else if (key === "delete") {
            remove(name);
        } else {
            move(name, key === "up" ? -1 : 1);
        }
    });
    const titleOf = (name: string): HTMLElement | null | undefined =>
        wrapper.current?.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(name)}"] .cm-card-name`);
    useEffect(() => {
        const name = focusTitle.current;
        if (name !== null && names.includes(name)) {
            focusTitle.current = null;
            titleOf(name)?.focus();
        }
    });

    return {
        names,
        open,
        setOpen,
        setRenaming,
        wrapper,
        moveItems: (name, at) => [
            {
                id: "up",
                label: "Move up",
                icon: "moveUp",
                group: "edit",
                key: "Mod+]",
                reason: at === 0 ? "Already at the top" : null,
                reasonDrawn: false,
                onRun: () => {
                    move(name, -1);
                },
            },
            {
                id: "down",
                label: "Move down",
                icon: "moveDown",
                group: "edit",
                key: "Mod+[",
                reason: at === names.length - 1 ? "Already at the bottom" : null,
                reasonDrawn: false,
                onRun: () => {
                    move(name, 1);
                },
            },
        ],
        deleteItems: (name) => [
            {
                id: "delete",
                label: "Delete",
                icon: "delete",
                group: "remove",
                key: "Delete",
                onRun: () => {
                    remove(name);
                },
            },
        ],
        cards: (get, card) =>
            names.flatMap((name, at) => {
                const item = get(name);
                return item === undefined ? [] : [card(name, item, at)];
            }),
        listProps: {
            autoFold: false,
            folded: new Set(names.filter((name) => name !== open)),
            onFoldedChange: (folded) => {
                // One unfolded at a time: the card just unfolded, or none.
                setOpen(names.find((name) => !folded.has(name) && name !== open) ?? null);
            },
            onReorder: (name, to) => {
                void orRefusal(store, `move ${name}`, list.move(name, to));
            },
            renaming,
            onRenamingChange: setRenaming,
            onRename: (from, typed) => {
                const to = typed.trim();
                if (to === "" || to === from) {
                    return;
                }
                let renamed = false;
                const work = list.rename(from, to).then(() => {
                    renamed = true;
                });
                void orRefusal(store, `rename ${from}`, work).then(() => {
                    const now = renamed ? to : from;
                    if (renamed) {
                        onRenamed?.(from, to);
                    }
                    if (open === from) {
                        setOpen(now);
                    }
                    // The list may not draw again after a refusal: focus the title now when it is
                    // drawn, else once it is.
                    const title = titleOf(now);
                    if (title === null || title === undefined) {
                        focusTitle.current = now;
                    } else {
                        title.focus();
                    }
                });
            },
        },
    };
}
