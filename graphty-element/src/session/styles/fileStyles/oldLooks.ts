/**
 * @file The looks an older project kept beside its data, as ordinary data columns: a version 1
 * file's `fileStyles` (or `styleValues`) member held each load's per-element values outside the
 * records, read by layers at `graphty.style.<set>.<kind>.<key>`. Today a load writes those values
 * onto its elements as columns, so an older file's values become columns named as a load names
 * them, and the layers that read them read those columns. Both opens of a version 1 file (as
 * before, and migrated to version 2) use this, so they name the same columns.
 *
 * Nothing here reaches Babylon.js, Lit or the DOM.
 */

/** The members an older session kept its looks in, oldest first. */
const MEMBERS = ["fileStyles", "styleValues"] as const;

/**
 * The name of a data column a load's look values land in (issue #8259): the key with every
 * character but a letter, a digit or an underscore written as an underscore, or, when that name is
 * taken, `<name> (<source>)`, then `<name> (<source> 2)`, ... with every dot written as an underscore.
 * @param base - The name wanted, already with its punctuation written as underscores.
 * @param source - The id of the data source that read the file (`gexf`, `graphml`).
 * @param taken - Whether a name is taken.
 * @returns The name.
 */
export function lookColumnName(base: string, source: string, taken: (name: string) => boolean): string {
    let name = base;
    let n = 1;
    while (taken(name)) {
        const count = n === 1 ? "" : ` ${String(n)}`;
        name = `${base} (${source}${count})`.replaceAll(".", "_");
        n++;
    }

    return name;
}

/**
 * Whether a value is a plain object.
 * @param value - The value.
 * @returns True for `{...}`.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** An older file's looks as columns, by the row type the caller names elements by. */
export interface OldLooks<N, E> {
    /** Node columns: name, then each element's value. */
    readonly node: Map<string, Map<N, unknown>>;
    /** Edge columns: name, then each element's value. */
    readonly edge: Map<string, Map<E, unknown>>;
    /** Each path an older layer read, and the `data.` path of the column holding its values now. */
    readonly paths: Map<string, string>;
    /** The pointers of what could not be carried over: a malformed load or column, an absent element. */
    readonly leftOut: string[];
}

/** How the caller finds the elements an older file named, and the columns its tables hold. */
export interface OldLookRows<N, E> {
    /** The element a node id names, or undefined when the data has none. */
    readonly node: (id: unknown) => N | undefined;
    /** The element at an edge position (older files named an edge by its place), or undefined. */
    readonly edge: (position: unknown) => E | undefined;
    /** The column names each table already holds. */
    readonly taken: { readonly node: ReadonlySet<string>; readonly edge: ReadonlySet<string> };
}

/**
 * An older session member's looks as data columns, named as a load names them.
 * @param session - The version 1 `graphty-session` member.
 * @param rows - How to find the elements, and the names taken.
 * @returns The columns, the paths to rewrite, and what was left out.
 */
export function oldLookColumns<N, E>(
    session: Readonly<Record<string, unknown>> | undefined,
    rows: OldLookRows<N, E>,
): OldLooks<N, E> {
    const looks: OldLooks<N, E> = { node: new Map(), edge: new Map(), paths: new Map(), leftOut: [] };
    const taken = { node: new Set(rows.taken.node), edge: new Set(rows.taken.edge) };
    for (const member of MEMBERS) {
        const saved = session?.[member];
        if (saved === undefined) {
            continue;
        }

        if (!Array.isArray(saved)) {
            looks.leftOut.push(`/${member}`);
            continue;
        }

        saved.forEach((load: unknown, at: number) => {
            const pointer = `/${member}/${String(at)}`;
            const set = isRecord(load) ? (load.namespace ?? load.name) : undefined;
            if (!isRecord(load) || typeof set !== "string" || !Array.isArray(load.columns)) {
                looks.leftOut.push(pointer);
                return;
            }

            const source = typeof load.format === "string" ? load.format : "file";
            (load.columns as unknown[]).forEach((column, index) => {
                carryColumn(
                    column,
                    { set, source, pointer: `${pointer}/columns/${String(index)}` },
                    rows,
                    taken,
                    looks,
                );
            });
        });
    }

    return looks;
}

/**
 * Carry one older look column over as a data column.
 * @param column - The column as saved.
 * @param where - Its set, the source that read it and its pointer.
 * @param where.set - The set its layers read it under.
 * @param where.source - The id of the data source that read the file.
 * @param where.pointer - Its pointer.
 * @param rows - How to find the elements.
 * @param taken - The names taken so far, per kind; the new name is added.
 * @param taken.node - The node column names.
 * @param taken.edge - The edge column names.
 * @param looks - Collects the column, its path and what is left out.
 */
function carryColumn<N, E>(
    column: unknown,
    where: { readonly set: string; readonly source: string; readonly pointer: string },
    rows: OldLookRows<N, E>,
    taken: { readonly node: Set<string>; readonly edge: Set<string> },
    looks: OldLooks<N, E>,
): void {
    const { pointer } = where;
    if (
        !isRecord(column) ||
        (column.kind !== "node" && column.kind !== "edge") ||
        typeof column.key !== "string" ||
        column.key === "" ||
        !Array.isArray(column.ids) ||
        !Array.isArray(column.values) ||
        column.ids.length !== column.values.length
    ) {
        looks.leftOut.push(pointer);
        return;
    }

    const { kind, key } = column;
    const values = column.values as unknown[];
    const names = taken[kind];
    const name = lookColumnName(key.replaceAll(/\W/g, "_"), where.source, (each) => names.has(each));
    names.add(name);
    const cells = new Map<N | E, unknown>();
    (column.ids as unknown[]).forEach((id, at) => {
        const element = kind === "node" ? rows.node(id) : rows.edge(id);
        if (element === undefined) {
            looks.leftOut.push(`${pointer}/ids/${String(at)}`);
        } else if (values[at] !== null && values[at] !== undefined) {
            cells.set(element, values[at]);
        }
    });
    if (kind === "node") {
        looks.node.set(name, cells as Map<N, unknown>);
    } else {
        looks.edge.set(name, cells as Map<E, unknown>);
    }

    looks.paths.set(`graphty.style.${where.set}.${kind}.${key}`, `data.${name}`);
}

/**
 * A value with every string that is a path an older layer read replaced by the column's path, so a
 * selector's `path` and an encoding's `by` read the data column.
 * @param value - A layer, or any JSON.
 * @param paths - The paths to replace.
 * @returns The value, rewritten.
 */
export function rewriteOldPaths<T>(value: T, paths: ReadonlyMap<string, string>): T {
    if (paths.size === 0) {
        return value;
    }

    const walk = (each: unknown): unknown => {
        if (typeof each === "string") {
            // ponytail: a path inside a selector expression is left as written; parse the
            // expression and rename its fields if older files are found to hold such layers.
            return paths.get(each) ?? each;
        }

        if (Array.isArray(each)) {
            return each.map((child) => walk(child));
        }

        return isRecord(each)
            ? Object.fromEntries(Object.entries(each).map(([key, child]) => [key, walk(child)]))
            : each;
    };
    return walk(value) as T;
}
