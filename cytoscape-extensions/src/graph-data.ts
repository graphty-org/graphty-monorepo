/**
 * The core methods that put graphs into Cytoscape and take them out: graphtyGenerate, graphtyDataset,
 * graphtyImport and graphtyExport. Each loads its implementation (./samples.js or ./io.js, and with them the
 * graph-samples or graph-io package) on its first call, so registering them costs a page nothing.
 */

import type { ImportInput, ImportReport } from "@graphty/graph-io";
import type { FetchDatasetOptions } from "@graphty/graph-samples";
import type { Collection, CollectionReturnValue, Core, ElementDefinition } from "cytoscape";

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
     * are placed at the origin: run a layout next. Throws, adding nothing, when the core already holds one of the graph's node ids.
     */
    graphtyGenerate<N extends GeneratorName>(name: N, options: GeneratorOptions<N>): Promise<AddedGraph>;
    /**
     * Adds a sample dataset: `cy.graphtyDataset("karate")`. The small ones ship with the package; the large ones
     * (road-ny, ogbn-arxiv, com-dblp) are downloaded from graphty.app. Throws, adding nothing, when the core already holds one of the graph's node ids.
     */
    graphtyDataset(name: string, options?: FetchDatasetOptions): Promise<AddedGraph>;
    /**
     * Adds the graph in a file: GEXF, GraphML, GML, DOT, Pajek, CSV, JSON, Neo4j, CX2, CX or OBO. Every attribute
     * becomes a data field, and positions in the file become node positions. Throws, adding nothing, when the core already holds one of the graph's node ids.
     */
    graphtyImport(input: ImportInput, format?: ImportFormat, options?: ImportOptions): Promise<ImportedGraph>;
    /**
     * Writes the graph as a file's text: every data field, each node's position and parent, and each edge's id, as
     * far as the format holds them (`options.onLoss` hears about the rest). Hidden elements are written too. On a
     * collection: its nodes, and those of its edges whose two ends are among them.
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
 * Adds element definitions to a core. An edge whose id the core already holds loses it and gets one from
 * Cytoscape, so a second import into the same core does not fail on edge ids the file chose. A node id the core
 * already holds is refused: Cytoscape would skip that node and attach the new edges to the old one, merging the
 * two graphs.
 * @param cy - the core
 * @param elements - the definitions; edge data may be changed
 * @returns the added elements
 * @throws Error naming the first node id the core already holds; nothing is added
 */
function addTo(cy: Core, elements: ElementDefinition[]): CollectionReturnValue {
    for (const el of elements) {
        if (el.group === "nodes" && el.data.id !== undefined && cy.getElementById(el.data.id).nonempty()) {
            throw new Error(
                `graphty: the core already has an element with id "${el.data.id}", so the new graph would merge ` +
                    "into it; remove the existing elements (cy.elements().remove()) or add the graph to an empty core",
            );
        }
    }
    for (const el of elements) {
        if (el.group === "edges" && el.data.id !== undefined && cy.getElementById(el.data.id).nonempty()) {
            delete el.data.id;
        }
    }
    return cy.add(elements);
}

/**
 * Registers graphtyGenerate, graphtyDataset, graphtyImport and graphtyExport.
 * @param cytoscape - the cytoscape function
 */
export function registerGraphData(cytoscape: Register): void {
    cytoscape("core", "graphtyGenerate", async function (this: Core, name: GeneratorName, options: unknown) {
        const { generateElements } = await import("./samples.js");
        const r = generateElements(name, options as never);
        return { elements: addTo(this, r.elements), directed: r.directed };
    });
    cytoscape("core", "graphtyDataset", async function (this: Core, name: string, options?: FetchDatasetOptions) {
        const { datasetElements } = await import("./samples.js");
        const r = await datasetElements(name, options);
        return { elements: addTo(this, r.elements), directed: r.directed };
    });
    cytoscape(
        "core",
        "graphtyImport",
        async function (this: Core, input: ImportInput, format?: ImportFormat, options?: ImportOptions) {
            const { importElements } = await import("./io.js");
            const r = await importElements(input, format, options);
            return { elements: addTo(this, r.elements), directed: r.directed, format: r.format, report: r.report };
        },
    );
    const exportFn = async (eles: Collection, format: ExportFormat, options?: ExportOptions): Promise<string> => {
        const { exportElements } = await import("./io.js");
        return exportElements(eles, format, options);
    };
    cytoscape("core", "graphtyExport", function (this: Core, format: ExportFormat, options?: ExportOptions) {
        return exportFn(this.elements(), format, options);
    });
    cytoscape(
        "collection",
        "graphtyExport",
        function (this: Collection, format: ExportFormat, options?: ExportOptions) {
            return exportFn(this, format, options);
        },
    );
}
