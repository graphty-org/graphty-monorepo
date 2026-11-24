/**
 * The columns a reader's last load declared each node's and edge's kind in -- Neo4j's `:LABEL`
 * and `:TYPE`, any column graph-io gives the `labels` or `kind` role -- by the record key they
 * arrive under. The load designates them as the `kind` role in its own step (`session/kinds.ts`).
 */
import type { Column, GraphSnapshot } from "@graphty/graph-format";

/** The record keys of the declared kind columns; a kind left out declares none. */
export interface DeclaredKinds {
    /** The record key of the node kind column. */
    readonly node?: string;
    /** The record key of the edge kind column. */
    readonly edge?: string;
}

const DECLARED = new WeakMap<object, DeclaredKinds>();

/** The graph-format column roles that name an element's kind, most specific first. */
const KIND_ROLES = ["labels", "kind"] as const;

/**
 * Record the kind columns the file a reader is parsing declares.
 * @param reader - The data source.
 * @param kinds - The record keys.
 */
export function declareKinds(reader: object, kinds: DeclaredKinds): void {
    DECLARED.set(reader, Object.freeze({ ...kinds }));
}

/**
 * The kind columns a reader's last load declared.
 * @param reader - The data source.
 * @returns The record keys; empty when it declared none.
 */
export function declaredKindsOf(reader: object): DeclaredKinds {
    return DECLARED.get(reader) ?? {};
}

/**
 * The record keys an import's kind columns arrive under.
 * @param snapshot - The imported graph.
 * @param path - Where the reader puts a column on its records, or null where it leaves it out.
 * @returns The record keys.
 */
export function kindColumnsOf(
    snapshot: GraphSnapshot,
    path: (kind: "node" | "edge", column: Column) => string | null,
): DeclaredKinds {
    const find = (kind: "node" | "edge"): string | null => {
        const table = kind === "node" ? snapshot.nodes : snapshot.edges;
        for (const role of KIND_ROLES) {
            const column = table.byRole(role);
            const key = column === null ? null : path(kind, column);
            if (key !== null) {
                return key;
            }
        }

        return null;
    };
    const node = find("node");
    const edge = find("edge");
    return { ...(node === null ? {} : { node }), ...(edge === null ? {} : { edge }) };
}
