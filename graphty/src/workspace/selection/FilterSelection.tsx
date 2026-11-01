/**
 * The selection editor in its second host: an import filter card (design/ui/selection-groups/spec.md,
 * sections 2 and 3.3). A card has no effect word: its selection IS what stays, starting with All
 * and narrowed by Keep and Except. The base is the full graph, references freeze to node ids when
 * written (graphty-element does it), and Hovered or selected is not offered. A tier 4 card is read
 * as what stays (`scope.asUnion`; a Filter out card as All + Except) and is written in that form on
 * its first edit: Filter to and Filter out keep their effect on the picture, and a Select card,
 * which never filtered, is written turned off. A new card is written with its first step.
 */

import type { FilterCondition, GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import { keepChange, writeCondition } from "../data-place/filterCards";
import type { WorkspaceStore } from "../state/store";
import { SelectionEditor } from "./SelectionEditor";
import type { SelectionMenuItem } from "./SelectionMenu";
import type { PickSection } from "./values";

/**
 * The editor on one filter condition, or on a new card not yet written.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id (a new card's is the id it is written with)
 * @param props.rule - the card's selection (what stays)
 * @param props.effect - the condition's effect, or undefined for a card not yet written
 * @param props.openFirst - selects the first step on arrival
 * @param props.openPicker - opens the value picker at once (a new card)
 * @param props.hostPicks - the filter's own picker entries (Time window)
 * @param props.title - the card's name
 * @param props.lead - the card's on box
 * @param props.titleMenu - the card's "..." items
 * @param props.titleExtra - a new card's Nodes | Edges
 * @param props.onEmptyCancel - the value picker closed with nothing chosen on a card with no step
 * @param props.onDraft - takes a new card's selection while it has no step yet, so the host keeps it
 * @param props.onDone - Escape with no row selected
 * @param props.onTitleToggle - Space on the title row: switches the card's on box
 * @param props.titleOff - the card's on box is off
 * @returns The editor
 */
export function FilterSelection({
    session,
    store,
    id,
    rule,
    effect,
    openFirst,
    openPicker,
    hostPicks,
    title,
    lead,
    titleMenu,
    titleExtra,
    onDraft,
    onEmptyCancel,
    onDone,
    onTitleToggle,
    titleOff,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    rule: UnionLeaf;
    effect: FilterCondition["effect"] | undefined;
    openFirst?: boolean;
    openPicker?: boolean;
    hostPicks?: readonly PickSection[];
    title?: string;
    lead?: React.ReactNode;
    titleMenu?: readonly SelectionMenuItem[];
    titleExtra?: React.ReactNode;
    onDraft?: (rule: UnionLeaf) => void;
    onEmptyCancel?: () => void;
    onDone: () => void;
    onTitleToggle?: () => void;
    titleOff?: boolean;
}>): React.JSX.Element {
    // The rule as last edited, until the element holds it.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const writes = useRef(0);
    const write = (next: UnionLeaf): Promise<unknown> =>
        effect === undefined
            ? writeCondition(store, () => session.visibility.addCondition({ id, effect: "keep", rule: next }))
            : writeCondition(store, () => session.visibility.updateCondition(id, keepChange(next, effect)));
    return (
        <SelectionEditor
            session={session}
            rule={local ?? rule}
            host="filter"
            openFirst={openFirst}
            openPicker={openPicker}
            hostPicks={hostPicks}
            hold={id}
            title={title}
            lead={lead}
            titleMenu={titleMenu}
            titleExtra={titleExtra}
            onDone={onDone}
            onEmptyCancel={onEmptyCancel}
            onTitleToggle={onTitleToggle}
            titleOff={titleOff}
            onChange={(next) => {
                setLocal(next);
                if (effect === undefined && next.branches.every((branch) => branch.steps.length === 0)) {
                    onDraft?.(next);
                    return;
                }
                writes.current += 1;
                const mine = writes.current;
                void write(next).then(() => {
                    if (writes.current === mine) {
                        setLocal(null);
                    }
                });
            }}
        />
    );
}
