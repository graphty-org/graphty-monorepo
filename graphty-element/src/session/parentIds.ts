/**
 * How a saved `graphty-data` member's node records name their group.
 *
 * A record's `parent` key names the node whose group it is in. Files saved before graphty-element
 * wrote it as that node's id held, for a node read from a file with nesting, graph-io's raw row
 * number of the parent in that load instead. A member written since says so with the
 * {@link PARENT_IDS} extension; one without it is translated on open by {@link withParentIds}.
 * @module
 */

import { REF_KEY } from "./sources/references";

/** The data member extension that says its records' `parent` keys hold node ids, not rows. */
const PARENT_IDS = "graphty.parent-ids";

/** The reserved column a record names its loads in. */
const LOADS_KEY = "_source.loads";

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for an object that is not an array.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The extensions a data member writes for its node records.
 * @param nodes - The node records it writes.
 * @returns The `extensions` field, or nothing when no record names a parent.
 */
export function parentIdsExtension(nodes: readonly Record<string, unknown>[]): { extensions?: Record<string, true> } {
    return nodes.some((node) => Object.hasOwn(node, "parent")) ? { extensions: { [PARENT_IDS]: true } } : {};
}

/**
 * A data member as this element reads it: in a member saved before {@link PARENT_IDS}, each node
 * record whose `parent` is a whole number holds the row of its parent in the load it came from,
 * and gets that node's id. A load's rows are its records in file order (a referenced load's
 * placeholders keep their places), which is the order graph-io gave them rows.
 *
 * ponytail: a row the old load gave a node it never declared (an edge naming it before its
 * declaration) shifts the rows after it; such a parent is misread, as it was before.
 * @param member - The member as read.
 * @returns The member, its parents as ids.
 */
export function withParentIds<T extends Record<string, unknown>>(member: T): T {
    const { graph, extensions } = member;
    if ((isRecord(extensions) && extensions[PARENT_IDS] === true) || !isRecord(graph) || !Array.isArray(graph.nodes)) {
        return member;
    }

    const { nodes } = graph as { nodes: unknown[] };
    const rowed = (node: unknown): node is Record<string, unknown> & { parent: number } =>
        isRecord(node) && Number.isInteger(node.parent);
    if (!nodes.some((node) => rowed(node))) {
        return member;
    }

    const loadOf = (node: Record<string, unknown>): unknown => {
        const loads = node[LOADS_KEY];
        return Array.isArray(loads) ? loads[0] : node[REF_KEY];
    };
    const rows = new Map<unknown, unknown[]>();
    for (const node of nodes.filter(isRecord)) {
        const load = loadOf(node);
        const held = rows.get(load) ?? [];
        held.push(node.id);
        rows.set(load, held);
    }

    const translated = nodes.map((node) => {
        const id = rowed(node) ? rows.get(loadOf(node))?.[node.parent] : undefined;
        return id === undefined || !isRecord(node) ? node : { ...node, parent: id };
    });
    return { ...member, graph: { ...graph, nodes: translated } };
}
