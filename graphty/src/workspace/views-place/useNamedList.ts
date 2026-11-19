/**
 * What the Views place's Cameras and Video tours sections share: a list of named items in the
 * element's order (`session.views` or `session.tours`), one card unfolded at a time, renamed from
 * the title, each change one undo step. Also the drag order cameras and tour stops share.
 */

import type { CardListItem, CardListProps } from "@graphty/compact-mantine";
import type { GraphSession } from "@graphty/graphty-element/session";
import React, { type RefObject, useEffect, useRef, useState } from "react";

import { orRefusal } from "../graph-place/actions";
import type { SelectionMenuItem } from "../selection/SelectionMenu";
import type { WorkspaceStore } from "../state/store";

/** The CardList props a named list sets. */
type ListProps = Required<
    Pick<CardListProps, "autoFold" | "folded" | "onFoldedChange" | "onRenamingChange" | "onRename">
> &
    Pick<CardListProps, "renaming">;

/** A named list's state and actions. */
export interface NamedList {
    readonly names: string[];
    readonly open: string | null;
    readonly setOpen: (name: string | null) => void;
    readonly setRenaming: (name: string | null) => void;
    readonly wrapper: RefObject<HTMLDivElement | null>;
    /** The Delete row of a card's menu. */
    readonly deleteItems: (name: string) => SelectionMenuItem[];
    /** The props for the section's CardList. */
    readonly listProps: ListProps;
    /** Draws a card for each name, in this order, that is still saved. */
    readonly cards: <T>(
        order: readonly string[],
        get: (name: string) => T | undefined,
        card: (name: string, item: T) => CardListItem,
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
    const wrapper = useRef<HTMLDivElement>(null);
    // A card's title to focus once the list draws again: after a rename, under its new name (or
    // its old one when the element refused it).
    const focusTitle = useRef<string | null>(null);

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
        deleteItems: (name) => [
            {
                id: "delete",
                label: "Delete",
                icon: "delete",
                group: "remove",
                onRun: () => {
                    void orRefusal(store, `delete ${name}`, list.remove([name]));
                },
            },
        ],
        cards: (order, get, card) =>
            order.flatMap((name) => {
                const item = get(name);
                return item === undefined ? [] : [card(name, item)];
            }),
        listProps: {
            autoFold: false,
            folded: new Set(names.filter((name) => name !== open)),
            onFoldedChange: (folded) => {
                // One unfolded at a time: the card just unfolded, or none.
                setOpen(names.find((name) => !folded.has(name) && name !== open) ?? null);
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

/** A drag order: the cards' order to draw, and the props that reorder them. */
interface DragOrder {
    /** The ids in the order to draw: the dragged preview while the pointer is down, else the saved one. */
    readonly order: readonly string[];
    /** Goes on the element around the CardList: notes that a press on a grip starts a drag. */
    readonly onPointerDownCapture: (event: React.PointerEvent<HTMLElement>) => void;
    /** The CardList's reorder props. */
    readonly listProps: Required<Pick<CardListProps, "onReorder" | "onReorderEnd" | "keyboardReorder">>;
}

/**
 * Reorders a CardList by its grip, each move one undo step: while the pointer drags, the cards
 * follow a local preview and nothing is written; the drop commits once, a cancelled drag commits
 * nothing. Alt+Up and Alt+Down on the grip commit at once.
 * @param ids - the card ids in their saved order.
 * @param commit - writes one card's move to its new index; `byKey` is true for a key move.
 * @returns the order and props.
 */
export function useDragOrder(
    ids: readonly string[],
    commit: (id: string, to: number, byKey: boolean) => Promise<unknown>,
): DragOrder {
    const [preview, setPreview] = useState<string[] | null>(null);
    const dragging = useRef(false);
    const moved = (id: string, to: number): string[] => {
        const rest = ids.filter((each) => each !== id);
        return [...rest.slice(0, to), id, ...rest.slice(to)];
    };
    return {
        order: preview ?? ids,
        onPointerDownCapture: (event) => {
            if (event.button === 0 && (event.target as Element).closest("[data-card-grip]") !== null) {
                dragging.current = true;
            }
        },
        listProps: {
            keyboardReorder: true,
            onReorder: (id, to) => {
                if (dragging.current) {
                    setPreview(moved(id, to));
                } else {
                    void commit(id, to, true);
                }
            },
            onReorderEnd: (id, to) => {
                dragging.current = false;
                if (to === null || to === ids.indexOf(id)) {
                    setPreview(null);
                    return;
                }
                // The preview stays until the write is drawn, so the cards do not jump back meanwhile.
                void commit(id, to, false).finally(() => {
                    setPreview(null);
                });
            },
        },
    };
}
