/**
 * @file The canonical form of a set definition: one spelling for every definition that means the
 * same thing.
 *
 * Every door, the loader and the revision hash go through this one function, so two definitions
 * that hold the same members compare equal as JSON and hash to the same revision. The rules
 * (design/sets/sets-design.md section 12.1):
 *
 * - Object keys sorted by UTF-16 code unit. Absent optional fields omitted, never `null`, except
 *   a path step's `null`, which means "every edge between that pair". An empty edge list and a
 *   path's `directed: false` are the defaults, so they are omitted too.
 * - Member arrays (a fixed set's nodes and edges, a path step's edge group) sorted by one
 *   comparator and de-duplicated: numbers before strings, numbers by value, strings by code unit.
 *   The number `1` and the string `"1"` are different ids. `-0` is stored as `0`.
 * - Path nodes and steps keep their order; `all` and `any` keep their operand order, because the
 *   user wrote it.
 * - A rule whose tree is one expression leaf becomes the bare query; a fixed `clipped` becomes
 *   `listed`, which holds the same members.
 * - Unknown kinds are left exactly as they are. A known node carrying a field this element does
 *   not know keeps that field's value; a fixed set carrying one also keeps its member order, so a
 *   newer element's parallel array (such as `weights`) is never left misaligned.
 *
 * Pure and Node-safe: nothing here reaches a graph, a renderer or the DOM.
 */

import type { EdgeMember, NodeId, SetDefinition } from "../types";

type Loose = Readonly<Record<string, unknown>>;

/** The fields each definition kind defines; anything else is unknown to this element. */
export const DEFINITION_FIELDS = {
    fixed: ["kind", "nodes", "edges", "reading"],
    rule: ["kind", "where", "reading"],
    path: ["kind", "nodes", "edges", "directed"],
} as const;

/** The fields an edge member defines, in its sort order after the endpoints. */
export const EDGE_MEMBER_FIELDS = ["source", "target", "id", "key", "ordinal", "among"] as const;

/**
 * A copy of an object with its keys sorted by code unit and its undefined fields dropped.
 * @param value - The object.
 * @returns The sorted copy.
 */
function sortKeys(value: Loose): Loose {
    const out: Record<string, unknown> = {};

    for (const key of Object.keys(value).sort()) {
        if (value[key] !== undefined) {
            out[key] = value[key];
        }
    }

    return out;
}

/**
 * A number with `-0` folded into `0`, anything else as it was.
 * @param value - Any value.
 * @returns The value, with a negative zero made positive.
 */
function unsigned<T>(value: T): T {
    return (value === 0 ? 0 : value) as T;
}

/**
 * Two strings by UTF-16 code unit.
 * @param a - One string.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
function compareStrings(a: string, b: string): number {
    if (a === b) {
        return 0;
    }

    return a < b ? -1 : 1;
}

/**
 * The member comparator: numbers before strings, numbers by value, strings by UTF-16 code unit.
 * @param a - One id.
 * @param b - The other.
 * @returns Negative, zero or positive.
 */
export function compareIds(a: unknown, b: unknown): number {
    if (typeof a === "number") {
        return typeof b === "number" ? a - b : -1;
    }

    if (typeof b === "number") {
        return 1;
    }

    return compareStrings(String(a), String(b));
}

/**
 * Edge members by (source, target, id, key, ordinal, among), absent before present. Two members
 * equal on all six but differing in a field this element does not know are ordered by their
 * JSON, so neither is dropped as a duplicate.
 * @param a - One member, canonical.
 * @param b - The other, canonical.
 * @returns Negative, zero or positive.
 */
function compareEdgeMembers(a: Loose, b: Loose): number {
    for (const field of EDGE_MEMBER_FIELDS) {
        const left = a[field];
        const right = b[field];

        if (left === undefined || right === undefined) {
            if (left !== right) {
                return left === undefined ? -1 : 1;
            }

            continue;
        }

        const order = compareIds(left, right);
        if (order !== 0) {
            return order;
        }
    }

    return compareStrings(JSON.stringify(a), JSON.stringify(b));
}

/**
 * Sort and de-duplicate a member array.
 * @param items - The members.
 * @param compare - The comparator.
 * @returns A fresh sorted array with no two members comparing equal.
 */
function sortUnique<T>(items: readonly T[], compare: (a: T, b: T) => number): T[] {
    const sorted = [...items].sort(compare);

    return sorted.filter((item, index) => index === 0 || compare(sorted[index - 1], item) !== 0);
}

/**
 * One edge member, canonical: keys sorted, `-0` folded.
 * @param member - The member.
 * @returns The canonical member.
 */
function canonicalMember(member: EdgeMember): EdgeMember {
    const loose = member as unknown as Loose;
    const out: Record<string, unknown> = { ...loose };

    for (const field of EDGE_MEMBER_FIELDS) {
        out[field] = unsigned(loose[field]);
    }

    return sortKeys(out) as unknown as EdgeMember;
}

/**
 * A canonical, sorted, de-duplicated edge member array.
 * @param members - The members.
 * @returns The canonical array.
 */
function canonicalMembers(members: readonly EdgeMember[]): EdgeMember[] {
    return sortUnique(members.map(canonicalMember), (a, b) =>
        compareEdgeMembers(a as unknown as Loose, b as unknown as Loose),
    );
}

/**
 * A fixed set's edge list, canonical, or undefined when it is absent or empty.
 * @param edges - The listed edges.
 * @returns The canonical list, or undefined.
 */
function canonicalEdgeList(edges: readonly EdgeMember[] | undefined): EdgeMember[] | undefined {
    return edges === undefined || edges.length === 0 ? undefined : canonicalMembers(edges);
}

/**
 * One path step, canonical: `null` kept, a group sorted, a single member's keys sorted.
 * @param step - The step.
 * @returns The canonical step.
 */
function canonicalStep(step: EdgeMember | readonly EdgeMember[] | null): EdgeMember | EdgeMember[] | null {
    if (step === null) {
        return null;
    }

    return Array.isArray(step) ? canonicalMembers(step as readonly EdgeMember[]) : canonicalMember(step as EdgeMember);
}

/** The leaf kinds whose fields this module knows, and the numeric or id-list fields they carry. */
const KNOWN_LEAVES = new Set(["expression", "edges", "range", "categories", "degree", "component", "neighborhood"]);

/**
 * One rule tree node, canonical. `all`, `any` and `not` recurse; known leaves have their keys
 * sorted and `-0` folded; unknown kinds are returned untouched.
 * @param node - The node.
 * @returns The canonical node.
 */
function canonicalTree(node: unknown): unknown {
    if (typeof node !== "object" || node === null || Array.isArray(node)) {
        return node;
    }

    const loose = node as Loose;
    const { kind } = loose;

    if (kind === "all" || kind === "any") {
        return sortKeys({ ...loose, of: Array.isArray(loose.of) ? loose.of.map(canonicalTree) : loose.of });
    }

    if (kind === "not") {
        return sortKeys({ ...loose, of: canonicalTree(loose.of) });
    }

    if (kind === "scope") {
        return sortKeys({ ...loose, scope: canonicalScope(loose.scope) });
    }

    if (typeof kind === "string" && KNOWN_LEAVES.has(kind)) {
        const out: Record<string, unknown> = {};

        for (const [key, value] of Object.entries(loose)) {
            out[key] = key === "seeds" && Array.isArray(value) ? value.map(unsigned) : unsigned(value);
        }

        return sortKeys(out);
    }

    return node;
}

/**
 * A scope inside a rule tree, canonical: an inline definition canonical, a `{ nodes }` list sorted
 * and de-duplicated like a fixed set's, anything else (a keyword, `{ set }`, `{ where }`, an
 * unknown form) as it is.
 * @param scope - The scope.
 * @returns The canonical scope.
 */
function canonicalScope(scope: unknown): unknown {
    if (typeof scope !== "object" || scope === null || Array.isArray(scope)) {
        return scope;
    }

    const loose = scope as Loose;
    if (hasUnknownField(loose, ["define"]) && hasUnknownField(loose, ["nodes"])) {
        return scope;
    }

    if (typeof loose.define === "object" && loose.define !== null) {
        return { define: canonicalSetDefinition(loose.define as SetDefinition) };
    }

    return Array.isArray(loose.nodes) ? { nodes: sortUnique<NodeId>((loose.nodes as NodeId[]).map(unsigned), compareIds) } : scope;
}

/**
 * Whether an object carries a field outside a known list.
 * @param value - The object.
 * @param known - The fields this element defines for it.
 * @returns True when some other field is present.
 */
function hasUnknownField(value: Loose, known: readonly string[]): boolean {
    return Object.keys(value).some((key) => value[key] !== undefined && !known.includes(key));
}

/**
 * The canonical form of a set definition. Never modifies its input. Accepts a definition holding
 * content this element does not know and keeps that content exactly.
 * @param definition - The definition, already validated or loaded.
 * @returns A fresh canonical definition.
 */
export function canonicalSetDefinition(definition: SetDefinition): SetDefinition {
    const loose = definition as unknown as Loose;

    switch (definition.kind) {
        case "fixed": {
            const keepOrder = hasUnknownField(loose, DEFINITION_FIELDS.fixed);
            const { reading, edges } = definition as { reading: string; edges?: readonly EdgeMember[] };
            const nodes = definition.nodes.map(unsigned);

            return sortKeys({
                ...loose,
                nodes: keepOrder ? nodes : sortUnique<NodeId>(nodes, compareIds),
                edges: keepOrder ? edges?.map(canonicalMember) : canonicalEdgeList(edges),
                reading: reading === "clipped" ? "listed" : reading,
            }) as unknown as SetDefinition;
        }
        case "rule": {
            const where = canonicalTree(definition.where) as Loose | string;
            const bare =
                typeof where === "object" && where.kind === "expression" && !hasUnknownField(where, ["kind", "where"])
                    ? where.where
                    : where;

            return sortKeys({ ...loose, where: bare }) as unknown as SetDefinition;
        }
        case "path": {
            const steps = definition.edges?.map(canonicalStep);

            return sortKeys({
                ...loose,
                nodes: definition.nodes.map(unsigned),
                edges: steps === undefined || steps.length === 0 ? undefined : steps,
                directed: definition.directed === false ? undefined : definition.directed,
            }) as unknown as SetDefinition;
        }
        default:
            return definition;
    }
}
