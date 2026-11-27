/**
 * The join workspace's door, and the names its pickers offer (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md).
 */

import type { GraphSession, NodeId } from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import type { JoinWorkspaceOpen, WorkspaceStore } from "../state/store";

/**
 * Opens the join workspace (Join +, Shift+J, a node's Join, a source's Remove). It adopts any open
 * draft, so nothing else has to be closed first.
 * @param workspace - the workspace store.
 * @param open - how it opens: on a source or a node's kind for its first card, on a join, or a removal.
 */
export function openJoinWorkspace(workspace: WorkspaceStore, open: JoinWorkspaceOpen = {}): void {
    workspace.set({ joinWorkspace: open });
}

/**
 * The id space of a node, which a node's Join presets as node 1's type (`data.nodeRef`).
 * @param session - the element's session.
 * @param node - the node.
 * @returns the space, or null for an id no node holds.
 */
export function nodeSpace(session: GraphSession, node: NodeId): string | null {
    return session.data.nodeRef(node)?.space ?? null;
}

/** A name offered by a picker: what the element calls it, and what the reader reads. */
export interface Choice {
    readonly value: string;
    readonly label: string;
}

/**
 * The spaces as choices: a named space reads as its name, a source's own space as that source's
 * name (`ownedBy` on the element's space row).
 * @param session - the element's session.
 * @returns the choices.
 */
export function spaceChoices(session: GraphSession): readonly Choice[] {
    const all = session.data.sources({ staged: true });
    return session.data.spaces().map((row) => {
        const owner = row.ownedBy === undefined ? undefined : all.find((each) => each.key === row.ownedBy);
        return { value: row.space, label: owner === undefined ? row.space : sourceName(owner) };
    });
}

/**
 * The edge types the element declares, as an Edge type box offers them.
 * @param session - the element's session
 * @returns the choices
 */
export function edgeTypeChoices(session: GraphSession): { readonly value: string }[] {
    return session.data
        .types()
        .filter((type) => type.kind === "edge")
        .map((type) => ({ value: type.name }));
}
