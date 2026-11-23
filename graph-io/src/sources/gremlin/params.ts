/**
 * The parameters of the Gremlin source. Experimental.
 */

import { type NodeId } from "@graphty/graph-format";

/**
 * What to read from a Gremlin server. Experimental.
 * @category Network sources
 */
export interface GremlinParams {
    /** The caller's Gremlin script (`g.V().hasLabel('person').limit(50)`); without one a script is generated from `mode`. */
    readonly query?: string | undefined;
    /** The script's bindings, sent separately, never spliced. @defaultValue {} */
    readonly bindings?: Readonly<Record<string, unknown>> | undefined;
    /** "query" (the caller's), "all" (every vertex, then every edge, paged) or "neighborhood" (around `ids`). */
    readonly mode?: "query" | "all" | "neighborhood" | undefined;
    /** The seed vertex ids of "neighborhood". */
    readonly ids?: readonly NodeId[] | undefined;
    /** Hops of "neighborhood", 1 to 10. @defaultValue 1 */
    readonly depth?: number | undefined;
    /** Elements per page of "all", and paths read by "neighborhood", 1 to 100000. @defaultValue 1000 */
    readonly pageSize?: number | undefined;
    /**
     * The server-side traversal source scripts run against, sent as the alias of `g`: a read-only
     * one the server's owner configured (`ro = g.withStrategies(ReadOnlyStrategy)`) makes the
     * server refuse writes. Default the server's `g`.
     */
    readonly traversalSource?: string | undefined;
}
