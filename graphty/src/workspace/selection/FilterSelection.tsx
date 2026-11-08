/**
 * The selection editor in its second host: an import filter card (design/ui/selection-groups/spec.md,
 * sections 2 and 3.3). A card has no effect word: its selection IS what stays, starting with All
 * and narrowed by Keep and Except. The base is the full graph, references freeze to node ids when
 * written (graphty-element does it), and Hovered or selected is not offered. A tier 4 card is read
 * as what stays (`scope.asUnion`; a Filter out card as All + Except) and is written in that form on
 * its first edit: Filter to and Filter out keep their effect on the picture, and a Select card,
 * which never filtered, is written turned off. A new card is written with its first step.
 */

import type { FilterCondition, FilterDraft, GraphSession, UnionLeaf } from "@graphty/graphty-element/session";
import React, { useEffect, useRef, useState } from "react";

import { keepChange, writeCondition } from "../data-place/filterCards";
import { selectionWorkspaceOn } from "../features";
import type { WorkspaceStore } from "../state/store";
import { SelectionEditor } from "./SelectionEditor";
import { SelectionEditorInline } from "./SelectionEditorInline";
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
 * @param props.openTitle - opens the workspace on the title row at once (a new card switched to edges)
 * @param props.switchedSide - a new card's side was just switched: focus stays on Nodes | Edges
 * @param props.hostPicks - the filter's own picker entries (Time window)
 * @param props.title - the card's name
 * @param props.lead - the card's on box
 * @param props.titleMenu - the card's "..." items
 * @param props.titleExtra - a new card's Nodes | Edges
 * @param props.onEmptyCancel - the value picker closed with nothing chosen on a card with no step
 * @param props.onDraft - takes a new card's selection while it has no step yet, so the host keeps it
 * @param props.onDone - the workspace closed, or Escape with no row selected
 * @param props.onTitleToggle - Space on the title row: switches the card's on box
 * @param props.titleOff - the card's on box is off
 * @param props.name - the name the reader gave the card, written with it
 * @param props.onRename - renames the card from the workspace's title bar
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
    openTitle,
    switchedSide,
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
    name,
    onRename,
}: Readonly<{
    session: GraphSession;
    store: WorkspaceStore;
    id: string;
    rule: UnionLeaf;
    effect: FilterCondition["effect"] | undefined;
    openFirst?: boolean;
    openPicker?: boolean;
    openTitle?: boolean;
    switchedSide?: boolean;
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
    name?: string;
    onRename?: (name: string | undefined) => void;
}>): React.JSX.Element {
    // The rule as last edited, until the element holds it.
    const [local, setLocal] = useState<UnionLeaf | null>(null);
    const writes = useRef(0);
    const write = (next: UnionLeaf): Promise<unknown> =>
        effect === undefined
            ? writeCondition(store, () =>
                  session.visibility.addCondition({
                      id,
                      effect: "keep",
                      rule: next,
                      ...(name === undefined ? {} : { name }),
                  }),
              )
            : writeCondition(store, () => session.visibility.updateCondition(id, keepChange(next, effect)));
    // IN THE SELECTION WORKSPACE, WHILE THE ELEMENT READS THE WORKING GRAPH, the card is edited as a
    // draft: nothing that is shown changes and nothing is laid out again until the workspace closes,
    // when the draft is written as one step (graphty-element's `visibility.draft`;
    // design/working-graph/design.md, section 3). A new card is written only once it has a step, as
    // before. The outline-and-pane editor has no Done, so it writes each edit as it always has.
    const drafting = session.workingGraph && selectionWorkspaceOn(session);
    const draft = useRef<FilterDraft | null>(null);
    const toDraft = (next: UnionLeaf): void => {
        if (draft.current?.open !== true) {
            draft.current = session.visibility.draft(
                effect === undefined ? { id, effect: "keep", rule: next, ...(name === undefined ? {} : { name }) } : id,
            );
        }
        draft.current.update(effect === undefined ? { rule: next } : keepChange(next, effect));
    };
    // Written when it differs from what the element holds (Cancel hands the old rule back first),
    // otherwise let go; a new card with no step is never written.
    const finish = (): void => {
        const open = draft.current;
        draft.current = null;
        if (open?.open !== true) {
            return;
        }
        const saved = session.visibility.conditions.find((each) => each.id === id);
        // A new card's name, typed in the title bar while it was edited, goes with it.
        if (saved === undefined && name !== undefined) {
            open.update({ name });
        }
        const { rule: held } = open.condition;
        const stepless = held.kind === "union" && held.branches.every((branch) => branch.steps.length === 0);
        const unchanged = saved === undefined ? stepless : JSON.stringify(saved) === JSON.stringify(open.condition);
        if (unchanged) {
            open.cancel();
            return;
        }
        void writeCondition(store, () => open.commit());
    };
    const finishRef = useRef(finish);
    finishRef.current = finish;
    // Leaving the card open (a switch of place, a side switch) closes it as Done; an element that
    // has gone (the app closing) takes nothing more.
    useEffect(() => {
        let gone = false;
        const unwatch = session.on("session:disposed", () => {
            gone = true;
        });
        return () => {
            unwatch();
            if (gone) {
                draft.current?.cancel();
                draft.current = null;
            }
            finishRef.current();
        };
    }, [session]);
    // The full-screen workspace is an experiment; off, the outline-and-pane editor is drawn.
    const Editor = selectionWorkspaceOn(session) ? SelectionEditor : SelectionEditorInline;
    return (
        <Editor
            session={session}
            rule={local ?? rule}
            host="filter"
            ownerName="Filters"
            openFirst={openFirst}
            openTitle={openTitle}
            switchedSide={switchedSide}
            openPicker={openPicker}
            hostPicks={hostPicks}
            // With the working graph on, only what is shown is drawn: nothing is held as a ghost.
            {...(session.workingGraph ? {} : { hold: id })}
            title={title}
            lead={lead}
            titleMenu={titleMenu}
            titleExtra={titleExtra}
            onDone={() => {
                finish();
                onDone();
            }}
            onEmptyCancel={
                onEmptyCancel === undefined
                    ? undefined
                    : () => {
                          draft.current?.cancel();
                          draft.current = null;
                          onEmptyCancel();
                      }
            }
            onTitleToggle={onTitleToggle}
            titleOff={titleOff}
            onRename={onRename}
            onChange={(next) => {
                setLocal(next);
                if (drafting) {
                    toDraft(next);
                    // The host keeps a new card's selection, so Done reads it as having a step.
                    if (effect === undefined) {
                        onDraft?.(next);
                    }
                    return;
                }
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
