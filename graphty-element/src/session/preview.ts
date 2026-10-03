/**
 * @file What a load would hold, read before anything is loaded.
 *
 * A preview IS a load, into a scratch session that is thrown away: the same detection, the same
 * reader, the same ingest and the same report, so what the preview says and what `import` does
 * cannot disagree. The session being previewed for is never touched.
 */

import type { AttributeDescriptor } from "../catalog/types";
import type {
    DataSourceInput,
    LoadColumnLevel,
    LoadColumnRole,
    LoadMapping,
    LoadPreview,
    LoadPreviewColumn,
    LoadPreviewTable,
    SessionDataApi,
} from "./types";

/** A session a preview loads into and then disposes. */
export interface ScratchSession {
    /** Its data surface. */
    readonly data: SessionDataApi;
    /** Throw it away. */
    dispose(): void;
}

/** How many rows of each table a preview hands back. */
const SAMPLE_ROWS = 5;

/** The CSV options that hand over a node table and an edge table as two files, each to its swap. */
const PAIR_SWAP: Readonly<Record<string, string>> = {
    nodeFile: "edgeFile",
    edgeFile: "nodeFile",
    nodeURL: "edgeURL",
    edgeURL: "nodeURL",
};

/**
 * The name of one of a pair of files: the `File`'s name, or the URL's last part.
 * @param value - a `nodeFile`, `edgeFile`, `nodeURL` or `edgeURL` option
 * @returns the name, or undefined when the option holds neither
 */
function fileName(value: unknown): string | undefined {
    if (typeof value === "string") {
        return value.split(/[?#]/)[0]?.split("/").pop();
    }

    const named = (value as { name?: unknown } | null | undefined)?.name;
    return typeof named === "string" ? named : undefined;
}

/**
 * The names of a CSV pair's two files.
 * @param config - the source's options
 * @returns the node file's and the edge file's names, or null when the source is not a pair
 */
export function pairNames(config: Readonly<Record<string, unknown>>): { nodes?: string; edges?: string } | null {
    const nodes = fileName(config.nodeFile ?? config.nodeURL);
    const edges = fileName(config.edgeFile ?? config.edgeURL);
    return nodes === undefined && edges === undefined ? null : { nodes, edges };
}

/**
 * A source with a CSV pair's two files swapped when the reader said they were handed over the
 * wrong way round.
 * @param source - the source
 * @param tables - the reader's table roles, by name
 * @returns the source, swapped or as it was
 */
export function withPairRoles(source: DataSourceInput, tables: LoadMapping["tables"]): DataSourceInput {
    const names = tables === undefined ? null : pairNames(source.config);
    if (names === null || tables === undefined) {
        return source;
    }

    const misread =
        (names.nodes !== undefined && tables[names.nodes] === "edges") ||
        (names.edges !== undefined && tables[names.edges] === "nodes");
    if (!misread) {
        return source;
    }

    const config = Object.fromEntries(
        Object.entries(source.config).map(([key, value]) => [PAIR_SWAP[key] ?? key, value]),
    );
    return { ...source, config };
}

/**
 * The CSV variant a single file is read as, when the reader named its table's role.
 * @param tables - the reader's table roles, by name
 * @returns the variant, or undefined to let the reader decide
 */
export function csvVariantFor(tables: LoadMapping["tables"]): "node-list" | "edge-list" | undefined {
    // A single table is named for the role it was read as, so naming it the other role is the edit.
    if (tables?.edges === "nodes") {
        return "node-list";
    }

    return tables?.nodes === "edges" ? "edge-list" : undefined;
}

/**
 * A record key from the expression ingest read it with: `"from station"` back to its name.
 * @param expression - the expression
 * @returns the key
 */
function keyOf(expression: string): string {
    if (!expression.startsWith('"')) {
        return expression;
    }

    try {
        return String(JSON.parse(expression));
    } catch {
        return expression;
    }
}

/**
 * What a column's values measure.
 * @param role - its role in the load
 * @param descriptor - what the session says of it, when it is an attribute
 * @returns the level
 */
function levelOf(role: LoadColumnRole, descriptor: AttributeDescriptor | undefined): LoadColumnLevel {
    if (role === "id" || role === "source" || role === "target") {
        return "id";
    }

    switch (descriptor?.type) {
        case "number":
        case "integer":
            return "quantity";
        case "time":
            return "time";
        case "boolean":
        case "category":
            return "category";
        default:
            return "text";
    }
}

/**
 * The type of a key column, from its first value.
 * @param value - a value it holds
 * @returns the type
 */
function keyType(value: unknown): LoadPreviewColumn["type"] {
    if (typeof value === "number") {
        return Number.isInteger(value) ? "integer" : "number";
    }

    return "string";
}

/**
 * Describe what a scratch session loaded.
 * @param data - the scratch session's data surface, holding the load
 * @param source - the source as it was loaded
 * @param mapping - the reader's column roles
 * @param nodeIdKey - the configured node id path
 * @param suggested - the role the element picks for a column by itself, by table and name
 * @returns the preview
 */
function describeLoad(
    data: SessionDataApi,
    source: DataSourceInput,
    mapping: LoadMapping,
    nodeIdKey: string,
    suggested: ((table: "nodes" | "edges", name: string) => LoadColumnRole) | null,
): LoadPreview {
    const report = data.lastImport();
    if (report === null) {
        throw new Error("A preview load finished without a report.");
    }

    const { nodeRecords, edgeRecords } = report.counts;
    const keys = {
        node: nodeRecords > 0 ? (mapping.nodeId ?? nodeIdKey) : null,
        source: edgeRecords > 0 ? (mapping.source ?? keyOf(report.endpoints.source)) : null,
        target: edgeRecords > 0 ? (mapping.target ?? keyOf(report.endpoints.target)) : null,
    };
    const weight = edgeRecords > 0 ? report.weights.attribute : null;
    const attributes = data.attributes().filter((attribute) => attribute.origin === "imported");
    const names = pairNames(withPairRoles(source, mapping.tables).config);

    const build = (
        role: "nodes" | "edges",
        rowCount: number,
        keyColumns: readonly (readonly [string, LoadColumnRole, unknown])[],
        sample: readonly Readonly<Record<string, unknown>>[],
    ): LoadPreviewTable => {
        const kind = role === "nodes" ? "node" : "edge";
        const keyNames = new Set(keyColumns.map(([name]) => name));
        const columns: LoadPreviewColumn[] = keyColumns.map(([name, columnRole, value]) => ({
            name,
            type: keyType(value),
            level: "id",
            role: columnRole,
            suggested: suggested?.(role, name) ?? columnRole,
        }));
        for (const attribute of attributes) {
            if (attribute.kind !== kind || keyNames.has(attribute.name)) {
                continue;
            }

            const columnRole: LoadColumnRole = kind === "edge" && attribute.name === weight ? "weight" : "attribute";
            columns.push({
                name: attribute.name,
                type: attribute.type,
                level: levelOf(columnRole, attribute),
                role: columnRole,
                suggested: suggested?.(role, attribute.name) ?? columnRole,
            });
        }

        return Object.freeze({
            name: names?.[role] ?? role,
            role,
            rowCount,
            columns: Object.freeze(columns.map((column) => Object.freeze(column))),
            sample: Object.freeze(sample),
        });
    };

    const tables: LoadPreviewTable[] = [];
    if (keys.node !== null) {
        const { records } = data.nodePage({ limit: SAMPLE_ROWS });
        const sample = records.map(({ id, ...rest }) => Object.freeze({ [keys.node as string]: id, ...rest }));
        tables.push(build("nodes", nodeRecords, [[keys.node, "id", records[0]?.id]], sample));
    }

    if (keys.source !== null && keys.target !== null) {
        const { records } = data.edgePage({ limit: SAMPLE_ROWS });
        const sample = records.map(({ id: _id, source: from, target: to, ...rest }) =>
            Object.freeze({ [keys.source as string]: from, [keys.target as string]: to, ...rest }),
        );
        tables.push(
            build(
                "edges",
                edgeRecords,
                [
                    [keys.source, "source", records[0]?.source],
                    [keys.target, "target", records[0]?.target],
                ],
                sample,
            ),
        );
    }

    return Object.freeze({
        format: report.format,
        tables: Object.freeze(tables),
        keys: Object.freeze(keys),
        weight,
        report,
    });
}

/**
 * Load a source into a scratch session and run `read` over it, disposing the session whatever
 * happens.
 * @param scratch - builds the scratch session
 * @param source - the source
 * @param mapping - the reader's column roles
 * @param read - what to make of the load
 * @returns what `read` returned
 */
async function withLoad<T>(
    scratch: () => ScratchSession,
    source: DataSourceInput,
    mapping: LoadMapping | undefined,
    read: (data: SessionDataApi) => T,
): Promise<T> {
    const session = scratch();
    try {
        await session.data.import(source, mapping === undefined ? {} : { mapping });
        return read(session.data);
    } finally {
        session.dispose();
    }
}

/**
 * What a load would hold.
 * @param scratch - builds a scratch session with the previewing session's data configuration
 * @param source - what `import` takes
 * @param mapping - the reader's column roles
 * @param nodeIdKey - the configured node id path
 * @returns the preview
 * @throws Whatever `import` would reject with, with the same code.
 */
export async function previewLoad(
    scratch: () => ScratchSession,
    source: DataSourceInput,
    mapping: LoadMapping | undefined,
    nodeIdKey: string,
): Promise<LoadPreview> {
    if (mapping === undefined) {
        return withLoad(scratch, source, undefined, (data) => describeLoad(data, source, {}, nodeIdKey, null));
    }

    // ponytail: reads the source a second time to learn the element's own picks; keep them from
    // one read if a preview of a large file with a mapping is slow.
    const own = await previewLoad(scratch, source, undefined, nodeIdKey).catch(() => null);
    const roleOf = (table: "nodes" | "edges", name: string): LoadColumnRole =>
        own?.tables.find((each) => each.role === table)?.columns.find((column) => column.name === name)?.role ??
        "attribute";
    return withLoad(scratch, source, mapping, (data) => describeLoad(data, source, mapping, nodeIdKey, roleOf));
}
