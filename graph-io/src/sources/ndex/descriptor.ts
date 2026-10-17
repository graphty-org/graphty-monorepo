/**
 * The NDEx source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * The descriptor of the `ndex` source. Experimental.
 * @category Network sources
 */
export const NDEX_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "NDEx",
    kind: "repository",
    version: 1,
    defaultEndpoint: "https://www.ndexbio.org/",
    auth: ["basic", "bearer", "api-key"],
    authRequired: "optional",
    rateLimit: { requests: 50, perMs: 1000, concurrent: 4 },
    params: [
        { name: "uuid", plainName: "Network UUID", type: "string", required: true },
        {
            name: "format",
            plainName: "Format",
            type: "enum",
            default: "cx2",
            advanced: true,
            values: [
                { value: "cx2", label: "CX2" },
                { value: "cx", label: "CX" },
            ],
        },
        { name: "idAttribute", plainName: "Id attribute", type: "string", advanced: true },
    ],
    samples: [
        {
            id: "ndex-wp5483",
            plainName: "WikiPathways WP5483",
            params: { uuid: "86719f5b-1439-11f0-9806-005056ae3c32" },
            counts: { nodes: 57, edges: 34 },
        },
    ],
});
