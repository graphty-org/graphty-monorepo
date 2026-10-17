/**
 * The descriptors of the REST mapping source and its `openalex` preset: catalog data, available
 * without loading the sources' code.
 */

import { type SourceDescriptor } from "../types.js";

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
    params: [{ name: "mapping", plainName: "Mapping", type: "text", required: true }],
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
    rateLimit: { requests: 10, perMs: 1000 },
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
        },
    ],
});
