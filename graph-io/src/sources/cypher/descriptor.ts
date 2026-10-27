/**
 * The descriptors of the Cypher source and its presets: catalog data, available without loading
 * the sources' code.
 */

import { type SourceDescriptor, type SourceFeature, type SourceParamDescriptor } from "../types.js";

/** The parameters every Cypher source shares. */
const CYPHER_PARAMS: readonly SourceParamDescriptor[] = [
    { name: "query", plainName: "Query", type: "query", language: "cypher" },
    {
        name: "mode",
        plainName: "Mode",
        type: "enum",
        values: [
            { value: "query", label: "Query" },
            { value: "all", label: "Everything" },
            { value: "neighborhood", label: "Neighborhood" },
        ],
    },
    { name: "ids", plainName: "Seed ids", type: "node-id" },
    { name: "depth", plainName: "Depth", type: "integer", default: 1, min: 1, max: 10 },
    { name: "labels", plainName: "Labels", type: "string", role: "filter", advanced: true },
    { name: "relationshipTypes", plainName: "Relationship types", type: "string", role: "filter", advanced: true },
    { name: "idProperty", plainName: "Id property", type: "string", advanced: true },
    { name: "database", plainName: "Database", type: "string" },
    {
        name: "long",
        plainName: "Large integers",
        type: "enum",
        advanced: true,
        values: [
            { value: "f64", label: "Number" },
            { value: "string", label: "Text" },
        ],
    },
    { name: "countFirst", plainName: "Count first", type: "boolean", advanced: true },
    { name: "pageSize", plainName: "Page size", type: "integer", default: 1000, min: 1, max: 100000, advanced: true },
];

/** What every Cypher source can do: expand, probe, validate, and page a capped load. */
const CYPHER_FEATURES: readonly SourceFeature[] = ["expand", "probe", "validate", "page"];

/** The transport parameter of the generic source. */
const TRANSPORT_PARAM: SourceParamDescriptor = {
    name: "transport",
    plainName: "Transport",
    type: "enum",
    values: [
        { value: "query-api", label: "Neo4j Query API" },
        { value: "bolt", label: "Bolt" },
        { value: "neptune-https", label: "Neptune Database" },
        { value: "neptune-analytics", label: "Neptune Analytics" },
    ],
};

/**
 * The descriptor of the generic `cypher` source. Experimental.
 * @category Network sources
 */
export const CYPHER_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Cypher database",
    kind: "database",
    version: 1,
    auth: ["basic", "bearer", "aws-sigv4"],
    authRequired: "optional",
    features: CYPHER_FEATURES,
    params: [...CYPHER_PARAMS, TRANSPORT_PARAM],
});

/**
 * The descriptor of the `neo4j` preset. Experimental.
 * @category Network sources
 */
export const NEO4J_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Neo4j",
    kind: "database",
    version: 1,
    auth: ["basic", "bearer"],
    authRequired: "optional",
    features: CYPHER_FEATURES,
    params: [
        ...CYPHER_PARAMS,
        {
            // no default: a bolt: or bolt+s: endpoint picks Bolt, any other the Query API
            ...TRANSPORT_PARAM,
            values: TRANSPORT_PARAM.values?.filter((v) => v.value === "query-api" || v.value === "bolt"),
        },
    ],
    samples: [
        {
            id: "neo4j-movies",
            plainName: "Neo4j demo: movies",
            endpoint: "https://demo.neo4jlabs.com:7473",
            params: { database: "movies", mode: "all" },
            publicLogin: { username: "movies", password: "movies" }, // NOSONAR(S2068): the public login Neo4j publishes for its demo server
            counts: { nodes: 171, edges: 253 },
        },
        {
            id: "hetionet",
            plainName: "Hetionet",
            endpoint: "bolt+s://neo4j.het.io:7687",
            params: { transport: "bolt", mode: "neighborhood", idProperty: "name", ids: ["Metformin"], depth: 1 },
            counts: { nodes: 47031, edges: 2250197 },
            whole: false,
        },
    ],
});

/**
 * The descriptor of the `neptune` preset. Experimental.
 * @category Network sources
 */
export const NEPTUNE_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Amazon Neptune",
    kind: "database",
    version: 1,
    auth: ["aws-sigv4"],
    authRequired: "optional",
    features: CYPHER_FEATURES,
    params: [
        ...CYPHER_PARAMS,
        {
            // no default: a neptune-graph host picks Neptune Analytics, any other Neptune Database
            ...TRANSPORT_PARAM,
            values: TRANSPORT_PARAM.values?.filter((v) => v.value.startsWith("neptune")),
        },
    ],
    // Neptune sends no CORS headers (Database), or is not shown to (Analytics)
    runtimes: { browser: { supported: false, reason: "cors" }, worker: { supported: false, reason: "cors" } },
});
