/**
 * The descriptors of the REST mapping source and its `openalex` preset: catalog data, available
 * without loading the sources' code.
 */

import { type SourceDescriptor } from "../types.js";
import { DEPS_DEV_MAPPING } from "./samples/deps-dev.js";
import { STRING_MAPPING } from "./samples/string.js";

/**
 * The descriptor of the generic `rest` source. Experimental.
 * @category Network sources
 */
export const REST_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "REST API",
    kind: "rest",
    version: 1,
    auth: ["bearer", "api-key"],
    authRequired: "optional",
    // ponytail: a mapping without `expand` or paging cannot do either; per-mapping features when a form needs them
    features: ["expand", "probe", "validate", "page"],
    params: [{ name: "mapping", plainName: "Mapping", type: "text", required: true }],
    samples: [
        {
            id: "string-tp53",
            plainName: "STRING: TP53's functional partners",
            params: { mapping: STRING_MAPPING, identifiers: "TP53", species: "9606", add_nodes: "20" },
            endpoint: STRING_MAPPING.endpoint,
            counts: { nodes: 21, edges: 113 },
        },
        {
            id: "deps-dev-webpack",
            plainName: "deps.dev: webpack 5.90.0",
            params: { mapping: DEPS_DEV_MAPPING, system: "npm", package: "webpack", version: "5.90.0" },
            endpoint: DEPS_DEV_MAPPING.endpoint,
            counts: { nodes: 84, edges: 121 },
        },
    ],
});

/**
 * The descriptor of the `openalex` preset. Experimental.
 * @category Network sources
 */
export const OPENALEX_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "OpenAlex",
    kind: "rest",
    version: 1,
    defaultEndpoint: "https://api.openalex.org",
    auth: ["api-key"],
    authRequired: "optional",
    apiKey: { query: "api_key" },
    rateLimit: { requests: 10, perMs: 1000 },
    features: ["expand", "probe", "validate", "page"],
    params: [
        { name: "work", plainName: "Work", type: "string" },
        { name: "author", plainName: "Author", type: "string" },
        {
            name: "graph",
            plainName: "Graph",
            type: "enum",
            default: "citation",
            values: [
                { value: "citation", label: "Citations" },
                { value: "coauthorship", label: "Co-authors" },
            ],
        },
        { name: "include", plainName: "Include", type: "string", advanced: true },
    ],
    samples: [
        {
            id: "openalex-watts-strogatz",
            plainName: "Watts-Strogatz paper's citations",
            params: { work: "W2112090702" },
            whole: false,
            firstPage: 200,
        },
    ],
});
