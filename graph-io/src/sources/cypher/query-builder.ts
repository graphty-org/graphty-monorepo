/**
 * The one query builder of the Cypher source (design sections 11 and 12.2). Caller values travel
 * as query parameters, never spliced. What Cypher cannot parameterize -- labels, relationship
 * types, property keys, variable-length bounds and LIMIT -- is either backtick-quoted (an
 * identifier, a backtick inside doubled) or inlined as a checked integer. The generated queries
 * differ between servers only in the id expression.
 */

import { type ImportReportBuilder } from "../../common/report.js";
import { failAlone, failOn } from "../fail.js";
import { type CypherProfile } from "./profiles.js";

/** The deepest neighborhood a generated query asks for. */
export const MAX_DEPTH = 10;

/** The largest page of mode "all". */
export const MAX_PAGE_SIZE = 100_000;

/** The page size of mode "all" when the caller gives none. */
export const DEFAULT_PAGE_SIZE = 1000;

/**
 * Why an identifier cannot be quoted, or null when it can.
 * @param name - the identifier
 * @returns the reason, or null
 */
function identifierProblem(name: unknown): string | null {
    return typeof name !== "string" || name === "" || name.includes("\u0000") ? "identifier" : null;
}

/**
 * Quote one Cypher identifier (a label, relationship type or property key) for a query: wrapped in
 * backticks, with every backtick inside doubled, so no value can end the identifier early. An
 * empty name, or one with a NUL character, is refused (E_SOURCE_PARAM, reason "identifier").
 * Experimental.
 * @param name - the identifier
 * @returns the quoted identifier
 * @example
 * ```ts
 * cypherIdentifier("Person"); // "`Person`"
 * cypherIdentifier("odd`name"); // "`odd``name`"
 * ```
 * @category Network sources
 */
export function cypherIdentifier(name: string): string {
    if (identifierProblem(name) !== null) {
        failAlone("E_SOURCE_PARAM", "a Cypher identifier must be a non-empty string without NUL", {
            name: "identifier",
            reason: "identifier",
        });
    }
    return `\`${name.replaceAll("`", "``")}\``;
}

/**
 * Quote an identifier a parameter gave, failing the load when it cannot be.
 * @param name - the identifier
 * @param param - the parameter it came from
 * @param report - the load's report
 * @returns the quoted identifier
 */
export function quoted(name: unknown, param: string, report: ImportReportBuilder): string {
    if (identifierProblem(name) !== null) {
        failOn(report, "E_SOURCE_PARAM", `parameter ${param}: not a Cypher identifier`, {
            name: param,
            reason: "identifier",
        });
    }
    return cypherIdentifier(name as string);
}

/**
 * An integer to inline, checked to lie in its range.
 * @param value - the value
 * @param name - the parameter it came from
 * @param min - the smallest allowed
 * @param max - the largest allowed
 * @param report - the load's report
 * @returns the integer, as query text
 */
export function checkedInteger(
    value: unknown,
    name: string,
    min: number,
    max: number,
    report: ImportReportBuilder,
): string {
    if (typeof value !== "number" || !Number.isInteger(value)) {
        failOn(report, "E_SOURCE_PARAM", `parameter ${name}: not an integer`, { name, reason: "type" });
    }
    if (value < min || value > max) {
        failOn(report, "E_SOURCE_PARAM", `parameter ${name}: outside ${String(min)} to ${String(max)}`, {
            name,
            reason: "range",
        });
    }
    return String(value);
}

/** What narrows a generated query: compiled into it, so filtering happens at the source. */
export interface QueryFilters {
    /** Quoted labels; a node must have one of them. */
    readonly labels: readonly string[];
    /** Quoted relationship types. */
    readonly relationshipTypes: readonly string[];
    /** The quoted id property, or null for the server's id. */
    readonly idProperty: string | null;
}

/**
 * The id expression of a node or relationship variable.
 * @param v - the variable
 * @param profile - the server's profile
 * @param filters - the id property, for a node
 * @param node - whether `v` is a node
 * @returns the expression
 */
function idExpression(v: string, profile: CypherProfile, filters: QueryFilters, node = true): string {
    if (node && filters.idProperty !== null) {
        return `${v}.${filters.idProperty}`;
    }
    return profile.elementIds ? `elementId(${v})` : `id(${v})`;
}

/**
 * The node predicate of the label and id property filters, or null.
 * @param v - the node variable
 * @param filters - the filters
 * @returns the predicate
 */
function nodePredicate(v: string, filters: QueryFilters): string | null {
    const parts: string[] = [];
    if (filters.labels.length > 0) {
        const prefix = `${v}:`;
        parts.push(`(${filters.labels.map((l) => prefix + l).join(" OR ")})`);
    }
    if (filters.idProperty !== null) {
        parts.push(`${v}.${filters.idProperty} IS NOT NULL`);
    }
    return parts.length === 0 ? null : parts.join(" AND ");
}

/**
 * The relationship type part of a pattern: `:`A`|`B``, or "".
 * @param filters - the filters
 * @returns the pattern text
 */
function typesPattern(filters: QueryFilters): string {
    return filters.relationshipTypes.length === 0 ? "" : `:${filters.relationshipTypes.join("|")}`;
}

/**
 * The degree hint of a node variable: its relationship count, by pattern comprehension.
 * @param v - the variable
 * @returns the expression
 */
function degreeOf(v: string): string {
    return `size([(${v})--() | 1])`;
}

/** The arrows of each direction around a relationship pattern. */
const ARROWS = { out: ["-", "->"], in: ["<-", "-"], both: ["-", "-"] } as const;

/**
 * One page of the nodes of mode "all", ordered by the id expression (keyset paging, never SKIP).
 * @param profile - the server's profile
 * @param filters - the filters
 * @param pageSize - the checked page size, as text
 * @param after - whether the page starts after `$after`
 * @param degree - whether to add the degree hint
 * @returns the statement; it reads `$after`
 */
export function nodePage(
    profile: CypherProfile,
    filters: QueryFilters,
    pageSize: string,
    after: boolean,
    degree: boolean,
): string {
    const where = nodePredicate("n", filters);
    return [
        "MATCH (n)",
        where === null ? null : `WHERE ${where}`,
        `WITH n, ${idExpression("n", profile, filters)} AS key`,
        after ? "WHERE key > $after" : null,
        degree ? `RETURN n, key, ${degreeOf("n")} AS degree` : "RETURN n, key",
        `ORDER BY key LIMIT ${pageSize}`,
    ]
        .filter((l) => l !== null)
        .join(" ");
}

/**
 * One page of the relationships of mode "all", with their end nodes, ordered by the relationship
 * id expression.
 * @param profile - the server's profile
 * @param filters - the filters
 * @param pageSize - the checked page size, as text
 * @param after - whether the page starts after `$after`
 * @returns the statement; it reads `$after`
 */
export function edgePage(profile: CypherProfile, filters: QueryFilters, pageSize: string, after: boolean): string {
    const a = nodePredicate("a", filters);
    const b = nodePredicate("b", filters);
    const where = [a, b].filter((p) => p !== null);
    return [
        `MATCH (a)-[r${typesPattern(filters)}]->(b)`,
        where.length === 0 ? null : `WHERE ${where.join(" AND ")}`,
        `WITH a, r, b, ${idExpression("r", profile, filters, false)} AS key`,
        after ? "WHERE key > $after" : null,
        "RETURN a, r, b, key",
        `ORDER BY key LIMIT ${pageSize}`,
    ]
        .filter((l) => l !== null)
        .join(" ");
}

/**
 * The relationships among the nodes a capped mode "all" has loaded: both ends at or before the
 * node page's last key `$last`, and, after the first page, one end past the previous page's last
 * key `$after`, so each relationship arrives with the page that loads its later end.
 * @param profile - the server's profile
 * @param filters - the filters
 * @param after - whether earlier pages were loaded
 * @returns the statement; it reads `$last` and `$after`
 */
export function edgesAmong(profile: CypherProfile, filters: QueryFilters, after: boolean): string {
    const where = [nodePredicate("a", filters), nodePredicate("b", filters)].filter((p) => p !== null);
    return [
        `MATCH (a)-[r${typesPattern(filters)}]->(b)`,
        where.length === 0 ? null : `WHERE ${where.join(" AND ")}`,
        `WITH a, r, b, ${idExpression("a", profile, filters)} AS ka, ${idExpression("b", profile, filters)} AS kb`,
        `WHERE ka <= $last AND kb <= $last${after ? " AND (ka > $after OR kb > $after)" : ""}`,
        "RETURN a, r, b",
    ]
        .filter((l) => l !== null)
        .join(" ");
}

/** How far a neighborhood reaches. */
interface NeighborhoodShape {
    /** The checked depth, as text. */
    readonly depth: string;
    /** Which way relationships are followed. */
    readonly direction: "out" | "in" | "both";
    /** The checked path limit, as text, or null for none. */
    readonly limit: string | null;
    /** Whether the page starts after the neighbor key `$after` (a capped expansion's next page). */
    readonly after?: boolean;
}

/**
 * The neighborhood of the seeds `$ids`: every path up to `depth` hops, each seed included even with
 * no neighbor, plus the degree of every node returned.
 * @param profile - the server's profile
 * @param filters - the filters
 * @param shape - depth, direction and limit
 * @param degree - whether to add the degree hint
 * @returns the statement; it reads `$ids`
 */
export function neighborhood(
    profile: CypherProfile,
    filters: QueryFilters,
    shape: NeighborhoodShape,
    degree: boolean,
): string {
    const rel = `[${typesPattern(filters)}*1..${shape.depth}]`;
    const [left, right] = ARROWS[shape.direction];
    const pattern = `${left}${rel}${right}`;
    const x = nodePredicate("x", filters);
    const degrees = degree
        ? `, [m IN CASE WHEN p IS NULL THEN [s] ELSE nodes(p) END | [${idExpression("m", profile, filters)}, ${degreeOf("m")}]] AS degrees`
        : "";
    // A capped expansion is ordered by the neighbor's key, so its next page starts after the last
    // key it returned. ponytail: a page boundary falling between two paths to the same neighbor
    // (parallel relationships, or depth > 1) drops the later paths; page on (key, path) if that matters.
    const head = [
        `MATCH (s) WHERE ${idExpression("s", profile, filters)} IN $ids`,
        `OPTIONAL MATCH p = (s)${pattern}(x)${whereClause(x)}`,
    ];
    if (shape.limit === null) {
        return [...head, "WITH s, p", `RETURN s, p${degrees}`].join(" ");
    }
    return [
        ...head,
        `WITH s, p, ${idExpression("x", profile, filters)} AS key`,
        shape.after === true ? "WHERE key > $after" : null,
        `WITH s, p, key ORDER BY key LIMIT ${shape.limit}`,
        `RETURN s, p, key${degrees}`,
    ]
        .filter((l) => l !== null)
        .join(" ");
}

/**
 * A ` WHERE` clause for a predicate.
 * @param predicate - the predicate, or null
 * @returns the clause with its leading space, or "" for no predicate
 */
function whereClause(predicate: string | null): string {
    return predicate === null ? "" : ` WHERE ${predicate}`;
}

/**
 * The counts of mode "all", for a progress total.
 * @param filters - the filters
 * @returns two statements: the nodes, then the relationships
 */
export function counts(filters: QueryFilters): readonly [string, string] {
    const n = nodePredicate("n", filters);
    const where = [nodePredicate("a", filters), nodePredicate("b", filters)].filter((p) => p !== null);
    return [
        `MATCH (n)${whereClause(n)} RETURN count(n) AS c`,
        `MATCH (a)-[r${typesPattern(filters)}]->(b)${whereClause(where.length === 0 ? null : where.join(" AND "))} RETURN count(r) AS c`,
    ];
}

/**
 * The node count of a mode "all" load with at most one label and the server's ids: a pattern
 * Neo4j answers from its count store in one cheap lookup, whatever the graph's size.
 * @param label - the quoted label, or undefined for every node
 * @returns the statement
 */
export function storeCount(label: string | undefined): string {
    const pattern = label === undefined ? "n" : `n:${label}`;
    return `MATCH (${pattern}) RETURN count(n) AS c`;
}
