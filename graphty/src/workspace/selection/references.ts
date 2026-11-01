/**
 * The reference picker's lists (design/ui/selection-groups/spec.md, section 4.3): sections that
 * never grow with the graph. With nothing typed: the live references, the first 8 sets and a
 * Nodes heading with the node count and no node rows; typed, at most 8 nodes, those whose name
 * starts with the text first, then the most connected (graphty-element's `data.nodePage`).
 */

import type { GraphSession, NodeRecord } from "@graphty/graphty-element/session";

import { formatNumber } from "../inspector/words";
import type { Host } from "./values";

/** How many sets or nodes the list draws at most. */
export const SHOWN_REFERENCES = 8;

/** One option of the list. */
export interface ReferenceOption {
    readonly value: string;
    readonly label: string;
    readonly disabled?: boolean;
}

/** A section of the list: its heading and its options. */
export interface ReferenceSection {
    readonly heading: string;
    readonly items: readonly ReferenceOption[];
}

/**
 * The nodes a typed text finds, at most {@link SHOWN_REFERENCES}: names that start with it first,
 * then those that hold it, each the most connected first; and how many hold it in all.
 * @param session - the element's session.
 * @param typed - the text.
 * @returns the nodes and the total.
 */
export function findNodes(session: GraphSession, typed: string): { nodes: readonly NodeRecord[]; total: number } {
    const sort = { key: "graphty.degree", descending: true } as const;
    const starts = session.data.nodePage({
        matching: { text: typed, mode: "starts-with" },
        sort,
        limit: SHOWN_REFERENCES,
    }).records;
    const holds = session.data.nodePage({ matching: { text: typed }, sort, limit: SHOWN_REFERENCES * 2 });
    const seen = new Set(starts.map((each) => String(each.id)));
    const rest = holds.records.filter((each) => !seen.has(String(each.id)));
    return { nodes: [...starts, ...rest].slice(0, SHOWN_REFERENCES), total: Math.max(holds.total, starts.length) };
}

/**
 * The list's sections for what is typed (spec 4.3): Live (or Selection in a filter), Sets, Nodes.
 * @param session - the element's session.
 * @param host - where the selection is edited.
 * @param firstStep - the step is its group's first, where So far holds only the group's start.
 * @param typed - the search, trimmed.
 * @returns the sections, each with its heading; an empty one is left out, except Nodes.
 */
export function referenceSections(
    session: GraphSession,
    host: Host,
    firstStep: boolean,
    typed: string,
): ReferenceSection[] {
    const lower = typed.toLowerCase();
    const has = (label: string): boolean => lower === "" || label.toLowerCase().includes(lower);
    const live: ReferenceOption[] = [
        ...(host === "selector" ? [{ value: "hovered-or-selected", label: "Hovered or selected" }] : []),
        { value: "selection", label: `Selected (${formatNumber(session.selection.nodes.length)})` },
        // So far on a group's first step is its start, which holds nothing on a None group.
        { value: "so-far", label: "So far", ...(firstStep ? { disabled: true } : {}) },
    ].filter((each) => has(each.label));
    const sets = session.sets
        .list()
        .map((each) => ({ value: `set:${each.id}`, label: each.name }))
        .filter((each) => has(each.label))
        .sort((a, b) => a.label.localeCompare(b.label));
    const { nodeCount } = session.data.statistics();
    const found = typed === "" ? null : findNodes(session, typed);
    const nodes = (found?.nodes ?? []).map((each) => ({
        value: `node:${String(each.id)}`,
        label: session.data.name(each.id) ?? String(each.id),
    }));
    const counted = (name: string, shown: number, total: number): string =>
        total > shown ? `${name} ${formatNumber(shown)} of ${formatNumber(total)}` : name;
    return [
        { heading: host === "selector" ? "Live" : "Selection", items: live },
        {
            heading: counted("Sets", Math.min(sets.length, SHOWN_REFERENCES), sets.length),
            items: sets.slice(0, SHOWN_REFERENCES),
        },
        {
            heading: found === null ? `Nodes ${formatNumber(nodeCount)}` : counted("Nodes", nodes.length, found.total),
            items: nodes,
        },
    ].filter((each) => each.items.length > 0 || each.heading.startsWith("Nodes"));
}
