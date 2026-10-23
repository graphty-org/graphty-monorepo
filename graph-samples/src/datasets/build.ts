/**
 * The metadata every dataset carries.
 */

/** What a dataset is, where it came from and under which terms. */
export interface DatasetMeta {
    /** The dataset name: `fetchDataset(name)`, and for the small ones the subpath `@graphty/graph-samples/datasets/<name>`. */
    readonly name: string;
    /** The human-readable title. */
    readonly title: string;
    /** One or two sentences on what the nodes and edges are. */
    readonly description: string;
    /** The reference to cite. */
    readonly citation: string;
    /** The URL the data was converted from. */
    readonly source: string;
    /** The license as known, or "unclear" with what is known. */
    readonly license: string;
    /** The node count. */
    readonly nodes: number;
    /** The edge count. */
    readonly edges: number;
    /** Whether the edges are directed. */
    readonly directed: boolean;
    /** Whether the edges carry weights. */
    readonly weighted: boolean;
    /** The node columns, name to description. */
    readonly attributes: Readonly<Record<string, string>>;
    /** The node column holding the ground-truth grouping, or null when there is none. */
    readonly groundTruth: string | null;
    /** The algorithms and layouts it shows off. */
    readonly showcases: readonly string[];
    /**
     * Where the graph data lives. Every dataset is "remote": published on graphty.app and loaded with
     * `fetchDataset(name)`. "bundled" (the data inside the package) is no longer used.
     */
    readonly hosting?: "bundled" | "remote";
    /** The download size: the bytes of its `.gsnp.gz` file. */
    readonly bytes?: number;
    /** The checksum: the SHA-256 of its `.gsnp.gz` file, lowercase hex. */
    readonly sha256?: string;
    /**
     * A small picture of the graph (a 480 x 300 WebP with a transparent background, drawn by
     * graphty-element): its file name beside the dataset's file, so its address is the dataset base
     * URL plus this name. Absent when the dataset has none.
     */
    readonly thumbnail?: string;
}
