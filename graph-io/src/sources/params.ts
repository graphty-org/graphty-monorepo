/**
 * `SourceParamsMap`: the params type of every built-in source by id, so `loadFromSource("ndex", ...)`
 * type-checks its params. A consumer adds its own source by declaration merging.
 */

import { type CypherParams } from "./cypher/params.js";
import { type NdexParams } from "./ndex/params.js";
import { type OpenAlexParams, type RestParams } from "./rest/params.js";
import { type SparqlParams } from "./sparql/params.js";

/**
 * Parameter types by source id; extend it by declaration merging:
 * `declare module "@graphty/graph-io" { interface SourceParamsMap { people: { team: string } } }`.
 * Experimental.
 * @category Network sources
 */
export interface SourceParamsMap {
    /** NDEx. */
    ndex: NdexParams;
    /** Any openCypher server. */
    cypher: CypherParams;
    /** Neo4j. */
    neo4j: CypherParams;
    /** Amazon Neptune. */
    neptune: CypherParams;
    /** A REST API through a mapping. */
    rest: RestParams;
    /** OpenAlex. */
    openalex: OpenAlexParams;
    /** Any SPARQL 1.1 endpoint. */
    sparql: SparqlParams;
}
