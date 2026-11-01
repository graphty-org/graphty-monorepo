/**
 * The selection editor in its second host: an import filter card's body
 * (design/ui/selection-groups/spec.md, section 2). The base is the full graph, references freeze to
 * node ids when written (graphty-element does it), and Hovered or selected is not offered. A flat
 * condition opens as one group starting All (`scope.asUnion`); every edit writes the condition's
 * rule, one undo step each. A new card is written by its first step graphty-element reads as
 * applied: until then (no step, or a step with no test yet) it removes and selects nothing.
 */

import type { GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import React, { useRef, useState } from "react";

import { writeCondition } from "../data-place/filterCards";
import type { WorkspaceStore } from "../state/store";
import { SelectionEditor } from "./SelectionEditor";
import type { PickSection } from "./values";

/** The effect a new card is written with. */
export type StartEffect = { readonly effect: "select"; readonly within: "picture" } | { readonly effect: "keep" };

/**
 * Whether graphty-element reads any step of a selection as applied (a value and a test), so
 * writing it as a condition changes the picture as the reader asked, never by an untested step.
 * @param session - the element's session.
 * @param rule - the selection.
 * @returns true once a step applies.
 */
function applies(session: GraphSession, rule: UnionLeaf): boolean {
    const peek = session.scope.watchSteps(rule, () => undefined);
    peek.end();
    return peek.current.branches.some((branch) => branch.steps.some((step) => step.state === "applied"));
}

/**
 * The editor on one filter condition, or on a new card not yet written.
 * @param props - Component props
 * @param props.session - the element's session
 * @param props.store - the chrome store
 * @param props.id - the condition's id (a new card's is the id it is written with)
 * @param props.rule - the condition's rule as a selection, or a new card's
 * @param props.written - whether the element holds the condition
 * @param props.startEffect - the effect a new card is written with
 * @param props.openFirst - opens the first step's card on arrival
 * @param props.openPicker - opens the value picker at once (a new card)
 * @param props.hostPicks - the filter's own picker entries (Time window)
 * @param props.title - the card's name, which titles the canvas key's preview
 * @param props.onDone - closes the card (Done, or Escape with nothing smaller open)
 * @returns The editor
 */
export function FilterSelection({
    session,
    store,
    id,
    rule,
    written,
    startEffect,
    openFirst,
    openPicker,
    hostPicks,
    title,
    onDone,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    rule: UnionLeaf;
    written: boolean;
    startEffect: StartEffect;
    openFirst?: boolean;
    openPicker?: boolean;
    hostPicks?: readonly PickSection[];
    title?: string;
    onDone: () => void;
}>): React.JSX.Element {
    // The rule as last edited, until the element holds it.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const writes = useRef(0);
    const write = (next: UnionLeaf): Promise<unknown> => {
        if (written) {
            return writeCondition(store, () => session.visibility.updateCondition(id, { rule: next }));
        }
        return writeCondition(store, () => session.visibility.addCondition({ id, ...startEffect, rule: next }));
    };
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
            onDone={onDone}
            onChange={(next) => {
                setLocal(next);
                if (!written && !applies(session, next)) {
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
