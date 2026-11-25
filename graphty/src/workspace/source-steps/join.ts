/**
 * The join workspace's door and the element reads its cards share (the source-steps experiment,
 * design design/data/multiple-data-sources-design.md). Every count, profile and value comes from
 * graphty-element; this only arranges them.
 */

import type {
    GraphSession,
    NodeId,
    SourceColumnProfile,
    SourceKey,
    SourceTableFacts,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import type { JoinWorkspaceOpen, WorkspaceStore } from "../state/store";

/**
 * Opens the join workspace (Join +, Shift+J, a node's Join, a source's Remove). It adopts any open
 * draft, so nothing else has to be closed first.
 * @param workspace - the workspace store.
 * @param open - how it opens: a staged source for its first card, node 1's type, or a removal.
 */
export function openJoinWorkspace(workspace: WorkspaceStore, open: JoinWorkspaceOpen = {}): void {
    workspace.set({ joinWorkspace: open });
}

/**
 * A column's profile as a draft reads it: a source's column in its node rows, else its edge rows,
 * or a space's keys.
 * @param reader - `session.data` or a draft.
 * @param side - the column, or the space.
 * @param side.source - the source.
 * @param side.field - its column.
 * @param side.space - the space, for its keys.
 * @returns the profile, or null when the element has none.
 */
export function profileOf(
    reader: Pick<GraphSession["data"], "sourceTable" | "profile">,
    side: { readonly source?: SourceKey; readonly field?: string; readonly space?: string },
): SourceColumnProfile | null {
    try {
        if (side.source !== undefined && side.field !== undefined) {
            return reader.sourceTable(side.source).profile(side.field);
        }
        return side.space === undefined || side.space === "" ? null : reader.profile({ space: side.space });
    } catch {
        return null;
    }
}

/**
 * A source's columns as a reader of source tables reads them (the committed sources or an open
 * draft): its node rows', else its edge rows'.
 * @param reader - `session.data` or a draft.
 * @param source - the source.
 * @param table - only this table's.
 * @returns the columns.
 */
export function columnsOf(
    reader: Pick<GraphSession["data"], "sourceTable">,
    source: SourceKey,
    table?: "nodes",
): readonly string[] {
    const tables = summaryOf(reader, source)?.tables ?? [];
    const nodes = tables.find((each) => each.table === "nodes");
    if (table === "nodes") {
        return nodes?.columns ?? [];
    }
    return (nodes ?? tables.find((each) => each.table === "edges"))?.columns ?? [];
}

/**
 * A source's tables and mapping, or null once it is gone (an undo took it away while the card is open).
 * @param reader - `session.data` or a draft.
 * @param source - the source.
 * @returns the facts, or null.
 */
function summaryOf(reader: Pick<GraphSession["data"], "sourceTable">, source: SourceKey): SourceTableFacts | null {
    try {
        return reader.sourceTable(source).summary();
    } catch {
        return null;
    }
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
 * A space as the reader reads it: its name, or its owning source's name (see `spaceChoices`).
 * @param session - the element's session.
 * @param space - the space.
 * @returns its name.
 */
export function spaceLabel(session: GraphSession, space: string): string {
    return spaceChoices(session).find((choice) => choice.value === space)?.label ?? space;
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
