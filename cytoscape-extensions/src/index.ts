/**
 * The Cytoscape.js adapter (package "@graphty/cytoscape-extensions"): graphty layouts and algorithms as Cytoscape.js extensions.
 *
 * ```ts
 * import cytoscape from "cytoscape";
 * import graphtyCytoscape from "@graphty/cytoscape-extensions";
 * cytoscape.use(graphtyCytoscape);
 * cy.layout({ name: "graphty-forceatlas2" }).run();
 * cy.elements().graphtyPageRank().rank("#a");
 *
 * // the ...Async methods and the simulations use WebGPU when the runtime has it; nothing else to import
 * const r = await cy.elements().graphtyPageRankAsync();
 * r.backend.ran; // "gpu" or "cpu", with r.backend.reason saying why
 *
 * // graphs in and out; each loads its parsers or generators on first use
 * await cy.graphtyGenerate("barabasi-albert", { n: 500, m: 2, seed: 1 });
 * await cy.graphtyImport(graphmlText, "graphml");
 * const gexf = await cy.graphtyExport("gexf");
 * ```
 */

import { registerAlgorithms } from "./algorithms.js";
import { registerGraphData } from "./graph-data.js";
import { registerLayouts } from "./layouts.js";

export {
    ALGORITHM_NAMES,
    type AlgorithmOptions,
    ASYNC_ALGORITHM_NAMES,
    type CutResult,
    type ElementRef,
    type GraphtyAlgorithms,
    type NodePair,
    type Partition,
    type PathsResult,
    type PointPathResult,
    type PredictedLink,
    type ScoreResult,
    type SearchResult,
} from "./algorithms.js";
export { type Backend, configureWebGpu, GPU_SIZE_FLOOR, type GpuMode, type WebGpuOptions } from "./gpu.js";
export { type AddedGraph, type GraphtyGraphData, type ImportedGraph } from "./graph-data.js";
export type { ExportFormat, ExportOptions, ImportFormat, ImportOptions, LossNote } from "./io.js";
export { type GraphtyLayoutOptions, type GraphtyLayouts, LAYOUT_NAMES } from "./layouts.js";
export type { GeneratorName, GeneratorOptions } from "./samples.js";
export { type CytoscapeSnapshot, type NodeSelection, type SnapshotOptions, toSnapshot, writeData } from "./snapshot.js";

/** Set on a cytoscape function once the extension is registered on it. */
const REGISTERED = Symbol.for("@graphty/cytoscape-extensions");

/**
 * The Cytoscape extension: `cytoscape.use(graphtyCytoscape)` registers every layout in LAYOUT_NAMES as
 * "graphty-<name>", every algorithm in ALGORITHM_NAMES as a collection and core method, and the core methods
 * graphtyGenerate, graphtyDataset, graphtyImport and graphtyExport. A second `use()` with the same cytoscape does
 * nothing (the script-tag build has already registered itself when a page calls `use()` again).
 * @param cytoscape - the cytoscape function `use()` passes in
 */
export default function graphtyCytoscape(cytoscape: (type: string, name: string, registrant: unknown) => void): void {
    const marked = cytoscape as unknown as Record<symbol, boolean | undefined>;
    if (marked[REGISTERED] === true) {
        return;
    }
    marked[REGISTERED] = true;
    registerLayouts(cytoscape);
    registerAlgorithms(cytoscape);
    registerGraphData(cytoscape);
}
