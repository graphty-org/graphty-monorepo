/**
 * The selection editor in its second host: an import filter card's body
 * (design/ui/selection-groups/spec.md, section 2). The base is the full graph, references freeze to
 * node ids when written (graphty-element does it), and Hovered or selected is not offered. A flat
 * condition opens as one group starting All (`scope.asUnion`); every edit writes the condition's
 * rule, one undo step each.
 */

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import { writeCondition } from "../data-place/filterCards";
import type { WorkspaceStore } from "../state/store";
import { SelectionEditor } from "./SelectionEditor";

/**
 * The editor on one filter condition.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id
 * @param props.rule - the condition's rule, as a selection
 * @param props.openFirst - opens the first step's card on arrival
 * @param props.onDone - closes the card
 * @returns The editor
 */
export function FilterSelection({
    session,
    store,
    id,
    rule,
    openFirst,
    onDone,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    rule: UnionLeaf;
    openFirst?: boolean;
    onDone: () => void;
}>): React.JSX.Element {
    // The rule as last edited, until the element holds it.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const writes = useRef(0);
    return (
        <SelectionEditor
            session={session}
            rule={local ?? rule}
            host="filter"
            openFirst={openFirst}
            onDone={onDone}
            onChange={(next) => {
                setLocal(next);
                writes.current += 1;
                const mine = writes.current;
                void writeCondition(store, () => session.visibility.updateCondition(id, { rule: next })).then(() => {
                    if (writes.current === mine) {
                        setLocal(null);
                    }
                });
            }}
        />
    );
}
