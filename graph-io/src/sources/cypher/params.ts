/**
 * The parameters of the Cypher source and its `neo4j` and `neptune` presets (design section 12.2).
 * Experimental. The Cypher work may add optional fields only.
 */

import { type NodeId } from "@graphty/graph-format";

/**
 * What to read from an openCypher server. Experimental.
 * @category Network sources
 */
export interface CypherParams {
    /** The caller's query; without one a query is generated from `mode`. */
    readonly query?: string | undefined;
    /** The query's parameters, sent separately, never spliced. @defaultValue {} */
    readonly parameters?: Readonly<Record<string, unknown>> | undefined;
    /** "query" (the caller's), "all" (the whole database, paged) or "neighborhood" (around `ids`). */
    readonly mode?: "query" | "all" | "neighborhood" | undefined;
    /** The seed ids of "neighborhood". */
    readonly ids?: readonly NodeId[] | undefined;
    /** Hops of "neighborhood", 1 to 10. @defaultValue 1 */
    readonly depth?: number | undefined;
    /** Only nodes with these labels (generated queries). */
    readonly labels?: readonly string[] | undefined;
    /** Only relationships of these types (generated queries). */
    readonly relationshipTypes?: readonly string[] | undefined;
    /** Key nodes on this property (`uuid`) instead of the server's id. */
    readonly idProperty?: string | undefined;
    /** The database; default the server's default. */
    readonly database?: string | undefined;
    /** How the query travels; the presets set it. */
    readonly transport?: "query-api" | "bolt" | "neptune-https" | "neptune-analytics" | undefined;
    /** The server's profile; "auto" detects it. @defaultValue "auto" */
    readonly profile?: "neo4j" | "neptune" | "auto" | undefined;
    /** Integers past 2^53: "f64" (rounded, with a warning) or "string". @defaultValue "f64" */
    readonly long?: "f64" | "string" | undefined;
    /** Run a count first, for a progress total. @defaultValue false */
    readonly countFirst?: boolean | undefined;
    /** Rows per page of mode "all", 1 to 100000. Under a node cap a page holds at most the cap's nodes, with the relationships among the nodes loaded so far. @defaultValue 1000 */
    readonly pageSize?: number | undefined;
}
