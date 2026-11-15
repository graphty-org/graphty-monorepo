/**
 * The built-in sources, registered as lazy sources: their descriptors are here, their code loads
 * on first use through a dynamic import of the source's subpath.
 */

import { CYPHER_DESCRIPTOR, NEO4J_DESCRIPTOR, NEPTUNE_DESCRIPTOR } from "./cypher/descriptor.js";
import {
    CYPHER_SOURCE_ID,
    NDEX_SOURCE_ID,
    NEO4J_SOURCE_ID,
    NEPTUNE_SOURCE_ID,
    OPENALEX_SOURCE_ID,
    REST_SOURCE_ID,
    SPARQL_SOURCE_ID,
} from "./ids.js";
import { NDEX_DESCRIPTOR } from "./ndex/descriptor.js";
import { OPENALEX_DESCRIPTOR, REST_DESCRIPTOR } from "./rest/descriptor.js";
import { SPARQL_DESCRIPTOR } from "./sparql/descriptor.js";
import { type LazySource } from "./types.js";

/**
 * The seven built-in sources, each loading its subpath on first use.
 * @returns the lazy sources, in catalog order
 */
export function builtinSources(): readonly LazySource[] {
    return [
        {
            id: NDEX_SOURCE_ID,
            descriptor: NDEX_DESCRIPTOR,
            load: async () => (await import("./ndex/index.js")).ndexSource,
        },
        {
            id: CYPHER_SOURCE_ID,
            descriptor: CYPHER_DESCRIPTOR,
            load: async () => (await import("./cypher/index.js")).cypherSource,
        },
        {
            id: NEO4J_SOURCE_ID,
            descriptor: NEO4J_DESCRIPTOR,
            load: async () => (await import("./cypher/index.js")).neo4jSource,
        },
        {
            id: NEPTUNE_SOURCE_ID,
            descriptor: NEPTUNE_DESCRIPTOR,
            load: async () => (await import("./cypher/index.js")).neptuneSource,
        },
        {
            id: REST_SOURCE_ID,
            descriptor: REST_DESCRIPTOR,
            load: async () => (await import("./rest/index.js")).restMappingSource,
        },
        {
            id: OPENALEX_SOURCE_ID,
            descriptor: OPENALEX_DESCRIPTOR,
            load: async () => (await import("./rest/index.js")).openalexSource,
        },
        {
            id: SPARQL_SOURCE_ID,
            descriptor: SPARQL_DESCRIPTOR,
            load: async () => (await import("./sparql/index.js")).sparqlSource,
        },
    ];
}
