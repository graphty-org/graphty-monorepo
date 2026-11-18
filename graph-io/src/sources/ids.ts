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
 * The URL source: a graph file at a web address. Experimental.
 * @category Network sources
 */
export const URL_SOURCE_ID = "url";

/**
 * The GitHub source, a file host: one file of a repository, read through GitHub's API. Not among
 * the built-in sources: pass `githubSource` (`@graphty/graph-io/sources/github`) or register it.
 * Experimental.
 * @category Network sources
 */
export const GITHUB_SOURCE_ID = "github";

/**
 * The Amazon S3 source, a file host: one object of a public bucket. Not among the built-in sources:
 * pass `s3Source` (`@graphty/graph-io/sources/s3`) or register it. Experimental.
 * @category Network sources
 */
export const S3_SOURCE_ID = "s3";

/**
 * The Zenodo source, a file host: one file of a Zenodo record, read through Zenodo's API. Not among
 * the built-in sources: pass `zenodoSource` (`@graphty/graph-io/sources/zenodo`) or register it.
 * Experimental.
 * @category Network sources
 */
export const ZENODO_SOURCE_ID = "zenodo";

/**
 * The Figshare source, a file host: one file of a public Figshare item, read through Figshare's API.
 * Not among the built-in sources: pass `figshareSource` (`@graphty/graph-io/sources/figshare`) or
 * register it. Experimental.
 * @category Network sources
 */
export const FIGSHARE_SOURCE_ID = "figshare";

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
