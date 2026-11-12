/**
 * The public names of network sources: one constant per built-in source id, and the reserved
 * `_source.` attribute names. Nothing else in graph-io spells them, so a rename is one edit here.
 *
 * Experimental: the ids and the `_source.` namespace await the owner's final word (design
 * section 22, items 4 and 5).
 */

/**
 * The NDEx source (www.ndexbio.org). Experimental.
 * @category Network sources
 */
export const NDEX_SOURCE_ID = "ndex";

/**
 * The generic Cypher source, for any openCypher server. Experimental.
 * @category Network sources
 */
export const CYPHER_SOURCE_ID = "cypher";

/**
 * The Neo4j preset of the Cypher source. Experimental.
 * @category Network sources
 */
export const NEO4J_SOURCE_ID = "neo4j";

/**
 * The Amazon Neptune preset of the Cypher source. Experimental.
 * @category Network sources
 */
export const NEPTUNE_SOURCE_ID = "neptune";

/**
 * The generic REST mapping source. Experimental.
 * @category Network sources
 */
export const REST_SOURCE_ID = "rest";

/**
 * The OpenAlex preset of the REST mapping source. Experimental.
 * @category Network sources
 */
export const OPENALEX_SOURCE_ID = "openalex";

/**
 * The SPARQL source, for any SPARQL 1.1 endpoint. Experimental.
 * @category Network sources
 */
export const SPARQL_SOURCE_ID = "sparql";

/**
 * The prefix of the reserved attribute namespace sources and graphty-element write facts under.
 * @category Network sources
 */
export const SOURCE_ATTR_PREFIX = "_source.";

/**
 * Node attribute: true on a stub, a node known only by its id until it is hydrated or expanded.
 * @category Network sources
 */
export const SOURCE_STUB_ATTR = "_source.stub";

/**
 * Node attribute: the entity a stub node is (a REST mapping's entity name).
 * @category Network sources
 */
export const SOURCE_ENTITY_ATTR = "_source.entity";

/**
 * Node attribute: the node's degree at the source, when the source returns it at no extra cost
 * (the Cypher source's degree hint).
 * @category Network sources
 */
export const SOURCE_DEGREE_ATTR = "_source.degree";

/**
 * The prefix of `ImportGraphResult.format` for a load from a source: `"source:<id>"`.
 * @category Network sources
 */
export const SOURCE_FORMAT_PREFIX = "source:";
