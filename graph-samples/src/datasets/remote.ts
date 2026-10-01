/**
 * Datasets too large to bundle (over about 5,000 nodes) are hosted on graphty.app as
 * graph-format wire bytes and fetched at runtime.
 */

import { fromBytes, type GraphSnapshot } from "@graphty/graph-format";

/**
 * Where hosted datasets live: `<base><name>.gsnp.gz`, a gzipped graph-format wire container.
 * The `v1` segment is the hosting layout's version, independent of the package version.
 */
export const DEFAULT_DATASET_BASE_URL = "https://graphty.app/data/graph-samples/v1/";

/** Options of {@link fetchDataset}. */
export interface FetchDatasetOptions {
    /** Serve the files from elsewhere (self-hosting, a mirror, a test server). */
    baseUrl?: string | undefined;
    /** The fetch implementation; the global `fetch` by default. */
    fetch?: typeof fetch | undefined;
    /** Cancels the download. */
    signal?: AbortSignal | undefined;
}

/**
 * Download a hosted dataset and decode it.
 * @param name - the dataset name: lowercase letters, digits and dashes
 * @param options - the base URL, fetch implementation and abort signal
 * @returns the graph as a frozen graph-format snapshot
 */
export async function fetchDataset(name: string, options: FetchDatasetOptions = {}): Promise<GraphSnapshot> {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(name)) {
        throw new RangeError(`not a dataset name: ${JSON.stringify(name)}`);
    }
    const base = options.baseUrl ?? DEFAULT_DATASET_BASE_URL;
    const url = new URL(`${name}.gsnp.gz`, base.endsWith("/") ? base : `${base}/`);
    const response = await (options.fetch ?? fetch)(url, { signal: options.signal ?? null });
    if (!response.ok || response.body === null) {
        throw new Error(`fetching ${url.href} failed: HTTP ${response.status}`);
    }
    const unzipped = response.body.pipeThrough(new DecompressionStream("gzip"));
    return fromBytes(new Uint8Array(await new Response(unzipped).arrayBuffer()));
}
