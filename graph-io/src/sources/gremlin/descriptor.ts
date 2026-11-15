/**
 * The Gremlin source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * The descriptor of the `gremlin` source. Experimental. It lists no examples: no public Gremlin
 * server exists to offer.
 * @category Network sources
 */
export const GREMLIN_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Gremlin server",
    kind: "database",
    version: 1,
    auth: ["basic", "aws-sigv4"],
    authRequired: "optional",
    features: ["expand", "probe", "page"],
    params: [
        { name: "query", plainName: "Query", type: "query", language: "gremlin" },
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
        {
            name: "pageSize",
            plainName: "Page size",
            type: "integer",
            default: 1000,
            min: 1,
            max: 100000,
            advanced: true,
        },
        { name: "traversalSource", plainName: "Traversal source", type: "string", advanced: true },
    ],
});
