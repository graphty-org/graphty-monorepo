/**
 * The Join card's picks and the element reads they turn into (the source-steps experiment, design
 * design/data/multiple-data-sources-design.md, section 5.2). The card only arranges picks: every
 * count, profile and value comes from graphty-element (`data.matchCounts`, `data.matchValues`,
 * `data.profile`, `sourceTable(id).profile`).
 */

import type {
    GraphSession,
    NodeId,
    SourceColumnProfile,
    SourceKey,
    SourceMatchCounts,
    SourceMatchOptions,
    SourceMatchPair,
    SourceTableFacts,
} from "@graphty/graphty-element/session";

import { sourceName } from "../data-place/words";
import type { JoinCardState, JoinField1, JoinField2, WorkspaceState, WorkspaceStore } from "../state/store";
import { panelsInView } from "../time/timeActions";

/** The dock tab the Join card opens on. */
export const FIELDS_TAB = "fields";

/** The dock tab the Join card's Preview opens on a count or a Values differ column. */
export const PREVIEW_TAB = "preview";

/**
 * Opens the Join card, unless a card or a draft is open already. It moves to the Data place's Sources
 * tab, where the card is drawn, from wherever the reader opened it (the inspector shows at every
 * place), and opens the dock on its Fields tab.
 * @param workspace - the workspace store.
 * @param session - the element's session.
 * @param start - Field 1 or Field 2 to start from; Field 2 defaults to the newest staged source.
 * @param start.field1 - Field 1, when opened from a node.
 * @param start.field2 - Field 2's source, when opened from a staged source.
 */
export function openJoin(
    workspace: WorkspaceStore,
    session: GraphSession,
    start: { readonly field1?: JoinField1; readonly field2?: SourceKey } = {},
): void {
    const now = workspace.get();
    if (now.sourceCard !== null || session.data.currentDraft() !== null) {
        return;
    }
    const source = start.field2 ?? session.data.staged().at(-1)?.key;
    showJoinCard(workspace, {
        kind: "join",
        field1: start.field1 ?? null,
        field2: source === undefined ? null : { source },
        act: null,
        edgeType: "",
        reversed: false,
        ignoreCase: false,
        ignoreSpaces: false,
        repeated: "first",
        unmatchedFrom: "keep",
        preview: null,
        editing: null,
        drill: null,
    });
}

/**
 * Draws the Join card on the Data place's Sources tab, from wherever the reader opened it, with the
 * dock open on its Fields tab; closing the card gives the dock back as it was.
 * @param workspace - the workspace store.
 * @param card - the card, but for the dock it found.
 */
export function showJoinCard(workspace: WorkspaceStore, card: Omit<JoinCardState, "dockWas">): void {
    const now = workspace.get();
    workspace.set({
        sourceCard: { ...card, dockWas: { open: now.dockOpen, tab: now.dockTab } },
        page: "panels",
        place: "data",
        dataTab: "loaded",
        ...panelsInView(),
        dockOpen: true,
        dockTab: FIELDS_TAB,
    });
}

/** The picks that make the act: changing one after Preview takes the act back. */
const ACT_PICKS = ["field1", "field2", "act", "edgeType", "reversed"] as const;

/**
 * Changes the open Join card's picks. Changing a field or the act after Preview takes the act back
 * (the draft holds nothing else, so it is discarded) and returns the card to picking.
 * @param workspace - the workspace store.
 * @param patch - the change.
 * @param session - the element's session, whose draft a changed act takes back.
 */
export function updateJoin(
    workspace: WorkspaceStore,
    patch: Partial<Omit<JoinCardState, "kind">>,
    session?: GraphSession,
): void {
    const card = workspace.get().sourceCard;
    if (card?.kind !== "join") {
        return;
    }
    const reAct = card.preview !== null && ACT_PICKS.some((pick) => pick in patch && patch[pick] !== card[pick]);
    if (reAct) {
        const draft = session?.data.currentDraft() ?? null;
        if (draft?.open === true) {
            draft.dispose();
        }
    }
    workspace.set({ sourceCard: { ...card, ...patch, ...(reAct ? { preview: null, drill: null } : {}) } });
}

/**
 * The two fields as `data.matchCounts` takes them, once both are picked.
 * @param card - the card's picks.
 * @returns the pair, or null while a field is unpicked.
 */
export function joinPair(card: JoinCardState): SourceMatchPair | null {
    const { field1, field2 } = card;
    if (field1 === null || field2?.field === undefined) {
        return null;
    }
    const into =
        field1.field === undefined || field1.source === undefined
            ? { space: field1.space }
            : { source: field1.source, field: field1.field };
    return { from: { source: field2.source, field: field2.field }, into };
}

/**
 * The card's Ignore case and Ignore spaces, as the element's match options.
 * @param card - the card's picks.
 * @returns the options.
 */
export function joinOptions(card: JoinCardState): SourceMatchOptions {
    return { ignoreCase: card.ignoreCase, ignoreSpaces: card.ignoreSpaces };
}

/**
 * The live counts, or null while a field is unpicked or the element refuses the pair.
 * @param session - the element's session.
 * @param card - the card's picks.
 * @returns the counts.
 */
export function joinCounts(session: GraphSession, card: JoinCardState): SourceMatchCounts | null {
    const pair = joinPair(card);
    if (pair === null) {
        return null;
    }
    try {
        return session.data.matchCounts(pair, joinOptions(card));
    } catch {
        return null;
    }
}

/**
 * Field 1's profile: its space's keys, or the column of the source it names.
 * @param session - the element's session.
 * @param field - Field 1.
 * @returns the profile, or null when the element has none.
 */
export function field1Profile(session: GraphSession, field: JoinField1 | null): SourceColumnProfile | null {
    if (field === null) {
        return null;
    }
    try {
        return field.field === undefined || field.source === undefined
            ? session.data.profile({ space: field.space })
            : session.data.sourceTable(field.source).profile(field.field, { table: "nodes" });
    } catch {
        return null;
    }
}

/**
 * Field 2's profile: its column, in the table its node rows live in, else its edge rows.
 * @param session - the element's session.
 * @param field - Field 2.
 * @returns the profile, or null while no field is picked.
 */
export function field2Profile(session: GraphSession, field: JoinField2 | null): SourceColumnProfile | null {
    if (field?.field === undefined) {
        return null;
    }
    try {
        return session.data.sourceTable(field.source).profile(field.field);
    } catch {
        return null;
    }
}

/**
 * A source's columns as Field 1 or 2 offers them: its node rows', else its edge rows'.
 * @param session - the element's session.
 * @param source - the source.
 * @param table - only this table's.
 * @returns the columns.
 */
export function sourceColumns(session: GraphSession, source: SourceKey, table?: "nodes"): readonly string[] {
    const tables = summaryOf(session, source)?.tables ?? [];
    const nodes = tables.find((each) => each.table === "nodes");
    if (table === "nodes") {
        return nodes?.columns ?? [];
    }
    return (nodes ?? tables.find((each) => each.table === "edges"))?.columns ?? [];
}

/**
 * Whether a source holds node rows: Make an edge and Merge both need them (`E_STEP_NEEDS_NODES`).
 * @param session - the element's session.
 * @param source - the source.
 * @returns true when it does.
 */
export function holdsNodes(session: GraphSession, source: SourceKey): boolean {
    return summaryOf(session, source)?.mapping.rows !== "edges";
}

/**
 * A source's tables and mapping, or null once it is gone (an undo took it away while the card is open).
 * @param session - the element's session.
 * @param source - the source.
 * @returns the facts, or null.
 */
function summaryOf(session: GraphSession, source: SourceKey): SourceTableFacts | null {
    try {
        return session.data.sourceTable(source).summary();
    } catch {
        return null;
    }
}

/**
 * The space the graph's nodes of a source live in, as `data.spaces()` lists it.
 * @param session - the element's session.
 * @param source - the source.
 * @returns the space, or undefined when it built no node.
 */
function spaceOfSource(session: GraphSession, source: SourceKey): string | undefined {
    return session.data.spaces().find((row) => row.nodes > 0 && row.sources.includes(source))?.space;
}

/**
 * Field 1 for a node: its space, on its key (`data.nodeRef`).
 * @param session - the element's session.
 * @param node - the node.
 * @returns Field 1, or null for an id no node holds.
 */
export function nodeField1(session: GraphSession, node: NodeId): JoinField1 | null {
    const ref = session.data.nodeRef(node);
    return ref === null ? null : { space: ref.space };
}

/**
 * Swaps Field 1 and Field 2: only while both name a column of a source in the graph, since the
 * acts add only a staged source 2 and Key is no column of source 2.
 * @param session - the element's session.
 * @param card - the card's picks.
 * @returns the swapped picks, or null when they cannot swap.
 */
export function swapped(
    session: GraphSession,
    card: JoinCardState,
): { readonly field1: JoinField1; readonly field2: JoinField2 } | null {
    const { field1, field2 } = card;
    if (field1?.source === undefined || field1.field === undefined || field2?.field === undefined) {
        return null;
    }
    if (!session.data.sources().some((each) => each.key === field2.source)) {
        return null;
    }
    const space = spaceOfSource(session, field2.source);
    if (space === undefined || !holdsNodes(session, field2.source)) {
        return null;
    }
    return {
        field1: { space, source: field2.source, field: field2.field },
        field2: { source: field1.source, field: field1.field },
    };
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
 * The open card when it is the Join card.
 * @param card - the store's open card.
 * @returns the Join card, or null.
 */
export function joinCardOf(card: WorkspaceState["sourceCard"]): JoinCardState | null {
    return card?.kind === "join" ? card : null;
}

/**
 * Whether the open card is the Join card, previewing its act in a draft.
 * @param card - the store's open card.
 * @returns true while it previews.
 */
export function previewing(card: WorkspaceState["sourceCard"]): boolean {
    return (joinCardOf(card)?.preview ?? null) !== null;
}
