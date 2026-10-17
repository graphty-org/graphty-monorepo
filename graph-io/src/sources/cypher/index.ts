/**
 * `@graphty/graph-io/sources/cypher`: the Cypher source and its `neo4j` and `neptune` presets.
 * Experimental. Not built yet: loading rejects with E_SOURCE_UNSUPPORTED until the Cypher work
 * lands.
 * @module @graphty/graph-io/sources/cypher
 */

import { defineSource } from "../define.js";
import { notBuiltYet } from "../fail.js";
import { CYPHER_SOURCE_ID, NEO4J_SOURCE_ID, NEPTUNE_SOURCE_ID } from "../ids.js";
import { type GraphSource } from "../types.js";
import { CYPHER_DESCRIPTOR, NEO4J_DESCRIPTOR, NEPTUNE_DESCRIPTOR } from "./descriptor.js";
import { type CypherParams } from "./params.js";

export { CYPHER_DESCRIPTOR, NEO4J_DESCRIPTOR, NEPTUNE_DESCRIPTOR } from "./descriptor.js";
export { type CypherParams } from "./params.js";

/**
 * The generic Cypher source. Experimental.
 * @category Network sources
 */
export const cypherSource: GraphSource<CypherParams> = defineSource<CypherParams>({
    id: CYPHER_SOURCE_ID,
    descriptor: CYPHER_DESCRIPTOR,
    records: () => notBuiltYet(CYPHER_SOURCE_ID),
});

/**
 * The Neo4j preset. Experimental.
 * @category Network sources
 */
export const neo4jSource: GraphSource<CypherParams> = defineSource<CypherParams>({
    id: NEO4J_SOURCE_ID,
    descriptor: NEO4J_DESCRIPTOR,
    records: () => notBuiltYet(NEO4J_SOURCE_ID),
});

/**
 * The Amazon Neptune preset. Experimental.
 * @category Network sources
 */
export const neptuneSource: GraphSource<CypherParams> = defineSource<CypherParams>({
    id: NEPTUNE_SOURCE_ID,
    descriptor: NEPTUNE_DESCRIPTOR,
    records: () => notBuiltYet(NEPTUNE_SOURCE_ID),
});
