/**
 * The core methods that put graphs into Cytoscape and take them out: graphtyGenerate, graphtyDataset,
 * graphtyImport and graphtyExport. Each loads its implementation (./samples.js or ./io.js, and with them the
 * graph-samples or graph-io package) on its first call, so registering them costs a page nothing.
 */

import type { ImportInput, ImportReport } from "@graphty/graph-io";
import type { FetchDatasetOptions } from "@graphty/graph-samples";
import type { Collection, CollectionReturnValue, Core } from "cytoscape";

import type { ExportFormat, ExportOptions, ImportFormat, ImportOptions } from "./io.js";
import type { GeneratorName, GeneratorOptions } from "./samples.js";

/** What graphtyGenerate and graphtyDataset add to the core. */
export interface AddedGraph {
    /** The added nodes and edges. */
    readonly elements: CollectionReturnValue;
    /** Whether the graph is directed: pass it as `directed` to the algorithms. */
    readonly directed: boolean;
}

/** What graphtyImport adds to the core. */
export interface ImportedGraph extends AddedGraph {
    /** The format the input was read as. */
    readonly format: string;
    /** graph-io's report: counts, warnings, and what could not be represented. */
    readonly report: ImportReport;
}

/** The core methods `cytoscape.use(graphtyCytoscape)` adds for getting graphs in and out. */
export interface GraphtyGraphData {
    /**
     * Adds a generated graph: `cy.graphtyGenerate("barabasi-albert", { n: 500, m: 2, seed: 1 })`. Node ids are
     * "0", "1", ...; ground-truth columns (`community`, ...) become data fields and weights `data.weight`. Nodes
     * are placed at the origin: run a layout next.
     */
    graphtyGenerate<N extends GeneratorName>(name: N, options: GeneratorOptions<N>): Promise<AddedGraph>;
    /**
     * Adds a sample dataset: `cy.graphtyDataset("karate")`. The small ones ship with the package; the large ones
     * (road-ny, ogbn-arxiv, com-dblp) are downloaded from graphty.app.
     */
    graphtyDataset(name: string, options?: FetchDatasetOptions): Promise<AddedGraph>;
    /**
     * Adds the graph in a file: GEXF, GraphML, GML, DOT, Pajek, CSV, JSON, Neo4j, CX2, CX or OBO. Every attribute
     * becomes a data field, and positions in the file become node positions.
     */
    graphtyImport(input: ImportInput, format?: ImportFormat, options?: ImportOptions): Promise<ImportedGraph>;
    /**
     * Writes the graph as a file's text: every data field, and each node's position. On a collection: its nodes,
     * and those of its edges whose two ends are among them.
     */
    graphtyExport(format: ExportFormat, options?: ExportOptions): Promise<string>;
}

declare module "cytoscape" {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type -- declaration merging
    interface Core extends GraphtyGraphData {}
    interface CollectionAlgorithms {
        /** Writes the collection's nodes, and its edges whose two ends are among them, as a file's text. */
        graphtyExport: GraphtyGraphData["graphtyExport"];
    }
}

type Register = (type: string, name: string, registrant: unknown) => void;

/**
 * Registers graphtyGenerate, graphtyDataset, graphtyImport and graphtyExport.
 * @param cytoscape - the cytoscape function
 */
export function registerGraphData(cytoscape: Register): void {
    cytoscape("core", "graphtyGenerate", async function (this: Core, name: GeneratorName, options: unknown) {
        const { generateElements } = await import("./samples.js");
        const r = generateElements(name, options as never);
        return { elements: this.add(r.elements), directed: r.directed };
    });
    cytoscape("core", "graphtyDataset", async function (this: Core, name: string, options?: FetchDatasetOptions) {
        const { datasetElements } = await import("./samples.js");
        const r = await datasetElements(name, options);
        return { elements: this.add(r.elements), directed: r.directed };
    });
    cytoscape(
        "core",
        "graphtyImport",
        async function (this: Core, input: ImportInput, format?: ImportFormat, options?: ImportOptions) {
            const { importElements } = await import("./io.js");
            const r = await importElements(input, format, options);
            return { elements: this.add(r.elements), directed: r.directed, format: r.format, report: r.report };
        },
    );
    const exportFn = async (eles: Collection, format: ExportFormat, options?: ExportOptions): Promise<string> => {
        const { exportElements } = await import("./io.js");
        return exportElements(eles, format, options);
    };
    cytoscape("core", "graphtyExport", function (this: Core, format: ExportFormat, options?: ExportOptions) {
        return exportFn(this.elements(), format, options);
    });
    cytoscape("collection", "graphtyExport", function (this: Collection, format: ExportFormat, options?: ExportOptions) {
        return exportFn(this, format, options);
    });
}
