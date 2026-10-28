/**
 * The parameters of the SPARQL source. Experimental.
 */

import { type NodeId } from "@graphty/graph-format";

/**
 * What to read from a SPARQL endpoint. Experimental.
 * @category Network sources
 */
export interface SparqlParams {
    /** The caller's CONSTRUCT or DESCRIBE query; without one a query is generated from `mode`. */
    readonly query?: string | undefined;
    /** "query" (the caller's), "all" (every triple, paged) or "neighborhood" (the triples of `ids`). */
    readonly mode?: "query" | "all" | "neighborhood" | undefined;
    /** The seed IRIs of "neighborhood". */
    readonly ids?: readonly NodeId[] | undefined;
    /** Keep literals tagged with this language (`en`) or with none; default every literal. */
    readonly language?: string | undefined;
    /**
     * Generated queries and expansions follow only predicates starting with one of these IRIs
     * (Wikidata's direct claims: `http://www.wikidata.org/prop/direct/`); literals are always kept.
     * Default every predicate.
     */
    readonly predicates?: readonly string[] | string | undefined;
    /** Solutions per page, 1 to 10000. A load stops between pages. @defaultValue 1000 */
    readonly pageSize?: number | undefined;
}
