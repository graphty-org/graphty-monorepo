/**
 * @file The `graph-samples` network source: graph-samples' datasets, downloaded from graphty.app,
 * as a source built with the public `defineSource` (design/graph-io/network-sources-design.md
 * section 20). So the element's catalogue lists the datasets beside the other sources, and the
 * element's own dataset source is written exactly as a third party's would be.
 *
 * Experimental: the id awaits the owner's word, and is this one constant.
 */

import { defineSource, registerSource, registry, type SourceDescriptor } from "@graphty/graph-io";
import { DATASETS, DEFAULT_DATASET_BASE_URL, fetchDataset, toElementData } from "@graphty/graph-samples";

/** The source id. Experimental. */
export const GRAPH_SAMPLES_SOURCE_ID = "graph-samples";

/** What the source takes. Experimental. */
export interface GraphSamplesParams {
    /** The dataset's name, as `DATASET_NAMES` in `@graphty/graph-samples` lists them. */
    readonly dataset: string;
}

/** The descriptor: catalog data, available without loading the source's code. */
const DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Sample datasets",
    kind: "file-host",
    version: 1,
    defaultEndpoint: DEFAULT_DATASET_BASE_URL,
    authRequired: "none",
    params: [
        {
            name: "dataset",
            plainName: "Dataset",
            type: "enum",
            required: true,
            values: DATASETS.map((meta) => ({ value: meta.name, label: meta.title })),
        },
    ],
    samples: DATASETS.map((meta) => ({
        id: `graph-samples-${meta.name}`,
        plainName: meta.title,
        params: { dataset: meta.name },
        counts: { nodes: meta.nodes, edges: meta.edges },
        whole: true,
    })),
});

/**
 * The source: one dataset, downloaded through the guarded fetch (so a missing dataset is
 * `E_SOURCE_NOT_FOUND` and an unreachable host `E_FETCH`), as records. Experimental.
 */
export const graphSamplesSource = defineSource<GraphSamplesParams>({
    id: GRAPH_SAMPLES_SOURCE_ID,
    descriptor: DESCRIPTOR,
    async records(params, ctx) {
        const snapshot = await fetchDataset(params.dataset, {
            ...(ctx.endpoint === null ? {} : { baseUrl: ctx.endpoint.href }),
            fetch: ctx.fetch as typeof fetch,
            signal: ctx.signal,
        });
        const { nodes, edges } = toElementData(snapshot);
        return {
            nodes: nodes as { id: string | number }[],
            edges: edges as { source: string | number; target: string | number }[],
            meta: { directed: snapshot.directed },
        };
    },
});

/**
 * Register the `graph-samples` source with graph-io's default registry, once. Every element path
 * that reads the registry calls it first, so no consumer has to.
 */
export function ensureGraphSamplesSource(): void {
    if (!registry.hasSource(GRAPH_SAMPLES_SOURCE_ID)) {
        registerSource(graphSamplesSource);
    }
}
