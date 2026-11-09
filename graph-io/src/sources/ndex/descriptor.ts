/**
 * The NDEx source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor, type SourceExample } from "../types.js";

/**
 * One public NDEx network offered as an example.
 * @param id - the example id
 * @param plainName - its name
 * @param uuid - the network UUID
 * @param nodes - its node count
 * @param edges - its edge count
 * @returns the example
 */
function example(id: string, plainName: string, uuid: string, nodes: number, edges: number): SourceExample {
    return { id, plainName, params: { uuid }, counts: { nodes, edges } };
}

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
    features: ["probe", "list", "expand", "validate"],
    // Each loads whole from www.ndexbio.org with no login (checked live by scripts/live-examples.ts).
    examples: [
        example("ndex-wp5483", "WikiPathways WP5483", "86719f5b-1439-11f0-9806-005056ae3c32", 57, 34),
        example("ndex-nci-pid", "NCI PID cancer signaling", "640e2cef-795d-11e8-a4bf-0ac135e8bacf", 2794, 25296),
        example("ndex-huri", "HuRI human interactome", "73bc2c06-5fb2-11e9-9f06-0ac135e8bacf", 8275, 52569),
        example("ndex-signor", "Signor", "523fff27-afe8-11e9-8bb4-0ac135e8bacf", 10339, 33381),
        example("ndex-dgidb", "DGIdb drugs and target genes", "7e5e64ff-f6cf-11ea-99da-0ac135e8bacf", 12100, 32814),
        example(
            "ndex-wikipathways-landscape",
            "WikiPathways landscape",
            "2b3ed6af-5031-11eb-9e72-0ac135e8bacf",
            32077,
            74109,
        ),
    ],
});
