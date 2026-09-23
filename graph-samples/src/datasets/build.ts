/**
 * The shapes shared by every dataset module: its metadata, the compact form its generated data
 * file is written in, and the one function that turns that form into a {@link SampleGraph}.
 */

import { type ColumnInput, type U8 } from "@graphty/graph-format";

import { type SampleGraph } from "../types.js";

/** What a dataset is, where it came from and under which terms. */
export interface DatasetMeta {
    /** The subpath name: `@graphty/graph-samples/datasets/<name>`. */
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
}

/** A categorical column: codes into a list of category names. */
interface DictColumnData {
    readonly dtype: "dict";
    readonly categories: readonly string[];
    readonly codes: readonly number[];
}

/** A text column, e.g. the display label. */
interface StringColumnData {
    readonly dtype: "string";
    readonly role?: "label";
    readonly values: readonly string[];
}

/** A small unsigned integer column, e.g. a bipartite side. */
interface U8ColumnData {
    readonly dtype: "u8";
    readonly values: readonly number[];
}

/** The compact form of a dataset, as scripts/convert-datasets.mjs writes it into data.ts. */
export interface DatasetData {
    readonly directed: boolean;
    readonly nodeCount: number;
    /** External node ids in index order, or null when the index is the id. */
    readonly ids: readonly string[] | null;
    /** Flat edge endpoints: src0, dst0, src1, dst1, ... */
    readonly edges: readonly number[];
    readonly weights: readonly number[] | null;
    readonly columns: Readonly<Record<string, DictColumnData | StringColumnData | U8ColumnData>>;
}

/**
 * Expand a dataset's compact data into typed arrays and graph-format column inputs.
 * @param data - the generated data
 * @returns the graph
 */
export function buildDataset(data: DatasetData): SampleGraph {
    const m = data.edges.length / 2;
    const src = new Uint32Array(m);
    const dst = new Uint32Array(m);
    for (let e = 0; e < m; e++) {
        src[e] = data.edges[2 * e];
        dst[e] = data.edges[2 * e + 1];
    }
    const nodeColumns: Record<string, U8 | ColumnInput> = {};
    for (const [name, column] of Object.entries(data.columns)) {
        switch (column.dtype) {
            case "dict":
                nodeColumns[name] = {
                    data: column.codes.map((code) => column.categories[code]),
                    decl: { dtype: "dict", options: column.categories },
                };
                break;
            case "string":
                nodeColumns[name] = { data: column.values, decl: { dtype: "string", role: column.role } };
                break;
            case "u8":
                nodeColumns[name] = Uint8Array.from(column.values);
                break;
            default:
                throw new TypeError(`unknown column dtype in dataset column "${name}"`);
        }
    }
    return {
        directed: data.directed,
        nodeCount: data.nodeCount,
        src,
        dst,
        ...(data.weights === null ? {} : { weights: Float32Array.from(data.weights) }),
        ...(data.ids === null ? {} : { ids: data.ids }),
        ...(Object.keys(nodeColumns).length === 0 ? {} : { nodeColumns }),
    };
}
