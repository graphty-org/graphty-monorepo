/**
 * The descriptors of the Cypher source and its presets: catalog data, available without loading
 * the sources' code.
 */

import { type SourceDescriptor, type SourceExample, type SourceFeature, type SourceParamDescriptor } from "../types.js";

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

/** Neo4j Labs' public read-only demo server: its Query API, and its Bolt address. */
const NEO4J_DEMO = "https://demo.neo4jlabs.com:7473";
const NEO4J_DEMO_BOLT = "bolt+s://demo.neo4jlabs.com:7687";

/**
 * One database on Neo4j Labs' demo server, loaded whole over the Query API. Its login is the
 * database's name as both user and password, which Neo4j publishes for everyone.
 * @param id - the example id
 * @param plainName - its name
 * @param database - the database
 * @param nodes - its node count
 * @param edges - its edge count
 * @returns the example
 */
function demoDatabase(id: string, plainName: string, database: string, nodes: number, edges: number): SourceExample {
    return {
        id,
        plainName,
        endpoint: NEO4J_DEMO,
        params: { database, mode: "all" },
        publicLogin: { username: database, password: database },
        counts: { nodes, edges },
    };
}

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
    examples: [
        demoDatabase("neo4j-movies", "Neo4j demo: movies", "movies", 171, 253),
        demoDatabase("neo4j-northwind", "Neo4j demo: Northwind orders", "northwind", 1035, 3139),
        demoDatabase("neo4j-gameofthrones", "Neo4j demo: Game of Thrones", "gameofthrones", 798, 6620),
        demoDatabase("neo4j-fincen", "Neo4j demo: FinCEN files", "fincen", 7524, 40835),
        {
            id: "neo4j-movies-bolt",
            plainName: "Neo4j demo: movies over Bolt",
            endpoint: NEO4J_DEMO_BOLT,
            params: { database: "movies", mode: "all", transport: "bolt" },
            publicLogin: { username: "movies", password: "movies" }, // NOSONAR(S2068): the public login Neo4j publishes for its demo server
            counts: { nodes: 171, edges: 253 },
        },
        {
            // neo4j.het.io runs Neo4j 3.5 (end of life) and speaks only Bolt 3: kept as an extra
            id: "hetionet",
            plainName: "Hetionet (end-of-life server)",
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
