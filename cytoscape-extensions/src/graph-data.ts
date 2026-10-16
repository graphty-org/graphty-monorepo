/**
 * The core methods that put graphs into Cytoscape and take them out: graphtyGenerate, graphtyDataset,
 * graphtyImport and graphtyExport. Each loads its implementation (./samples.js or ./io.js, and with them the
 * graph-samples or graph-io package) on its first call, so registering them costs a page nothing.
 */

import type { ImportInput, ImportReport } from "@graphty/graph-io";
import type { FetchDatasetOptions } from "@graphty/graph-samples";
import type { Collection, CollectionReturnValue, Core, ElementDefinition } from "cytoscape";

import { coreDestroyedError } from "./gpu.js";
import type { CytoscapeStylesheetRule, ExportFormat, ExportOptions, ImportFormat, ImportOptions } from "./io.js";
import { loadPart } from "./lazy.js";
import type { GeneratorName, GeneratorOptions } from "./samples.js";

/** What graphtyGenerate and graphtyDataset add to the core. */
export interface AddedGraph {
    /** The added nodes and edges. */
    readonly elements: CollectionReturnValue;
    /** Whether the graph is directed: pass it as `directed` to the algorithms. */
    readonly directed: boolean;
}

/** The part of a core's live style graphtyImport appends rules with, which Cytoscape's typings leave out. */
interface AppendableStyle {
    selector(s: string): { style(props: object): AppendableStyle };
    update(): void;
}

/** What graphtyImport adds to the core. */
export interface ImportedGraph extends AddedGraph {
    /** The format the input was read as. */
    readonly format: string;
    /** graph-io's report: counts, warnings, and what could not be represented. */
    readonly report: ImportReport;
    /**
     * With `styles: true`, the file's styles as a Cytoscape.js stylesheet whose every rule applies only to this
     * import's elements (they hold its id in `data.graphty_import`). `applyStyles: true` has already appended it to
     * the core's stylesheet; otherwise append it yourself, rule by rule:
     * `for (const r of stylesheet) cy.style().selector(r.selector).style(r.style); cy.style().update()`.
     * Absent without `styles`.
     */
    readonly stylesheet?: CytoscapeStylesheetRule[];
}

/** The core methods `cytoscape.use(graphtyCytoscape)` adds for getting graphs in and out. */
export interface GraphtyGraphData {
    /**
     * Adds a generated graph: `cy.graphtyGenerate("barabasi-albert", { n: 500, m: 2, seed: 1 })`. Node ids are
     * "0", "1", ... and edge ids "e0", "e1", ...; ground-truth columns (`community`, ...) become data fields and
     * weights `data.weight`. Nodes are placed at the origin (run a layout next), except that a generator's
     * coordinates (`positions: true` on the lattices; the geometric generators) become node positions, in the
     * generator's own units. Throws, adding nothing, when the core already holds one of the graph's node ids.
     */
    graphtyGenerate<N extends GeneratorName>(name: N, options: GeneratorOptions<N>): Promise<AddedGraph>;
    /**
     * Adds a sample dataset: `cy.graphtyDataset("karate")`, downloaded from graphty.app (`options.baseUrl` for a
     * mirror of your own). Throws, adding nothing, when the core already holds one of the graph's node ids.
     * `options.signal` cancels it: once aborted, it rejects with the signal's reason and adds nothing, whatever
     * `options.fetch` does with the signal.
     */
    graphtyDataset(name: string, options?: FetchDatasetOptions): Promise<AddedGraph>;
    /**
     * Adds the graph in a file: GEXF, GraphML, GML, DOT, Pajek, CSV, JSON, Neo4j, XGMML, CX2, CX, OBO or a
     * Cytoscape session (`.cys`, as bytes). Every attribute becomes a data field, and positions in the file become
     * node positions, the way up the program that wrote the file draws them (a yEd box's top-left corner is
     * moved to its center). Throws, adding
     * nothing, when the core already holds one of the graph's node ids.
     * `{ styles: true }` also reads the file's colors, sizes, shapes, ... and returns them as `stylesheet`;
     * `{ styles: true, applyStyles: true }` draws them too (the core needs `styleEnabled` when headless).
     * Without `styles`, a GEXF `viz:color`, `viz:size`, `viz:shape` and `viz:thickness` also become data fields;
     * these fields are deprecated and are removed in the next major release: use `styles: true`, which leaves
     * them out of data and draws them through the stylesheet.
     */
    graphtyImport(
        input: ImportInput | ArrayBuffer,
        format?: ImportFormat,
        options?: ImportOptions,
    ): Promise<ImportedGraph>;
    /**
     * Writes the graph as a file's text: every data field, each node's position and parent, and each edge's id, as
     * far as the format holds them (`options.onLoss` hears about the rest). Hidden elements are written too. On a
     * collection: its nodes, and those of its edges whose two ends are among them. `{ styles: true }` also writes
     * how the core draws each element, so graphtyImport with `styles: true` draws the file the same.
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
 * Rejected by graphtyGenerate, graphtyDataset and graphtyImport when a node id of the new graph is already in the
 * core; nothing is added. `name` is "IdTakenError", `code` is "E_ID_TAKEN" and `id` is the first clashing id.
 */
export class IdTakenError extends Error {
    /** Always "E_ID_TAKEN". */
    readonly code = "E_ID_TAKEN";
    /** The first node id of the new graph that the core already holds. */
    readonly id: string;

    /**
     * Creates the error.
     * @param id - the clashing id
     */
    constructor(id: string) {
        super(
            `graphty: the core already has an element with id "${id}", so the new graph would merge into it; ` +
                "remove the existing elements (cy.elements().remove()) or add the graph to an empty core",
        );
        this.name = "IdTakenError";
        this.id = id;
    }
}

/**
 * Adds element definitions to a core. An edge whose id the core already holds loses it and gets one from
 * Cytoscape, so a second import into the same core does not fail on edge ids the file chose. A node id the core
 * already holds is refused: Cytoscape would skip that node and attach the new edges to the old one, merging the
 * two graphs.
 * @param cy - the core
 * @param elements - the definitions; edge data may be changed
 * @returns the added elements
 * @throws IdTakenError naming the first node id the core already holds; nothing is added
 * @throws Error coded E_CORE_DESTROYED when the core was destroyed (before the call or while it loaded); nothing
 * is added
 */
function addTo(cy: Core, elements: ElementDefinition[]): CollectionReturnValue {
    if (cy.destroyed()) {
        throw coreDestroyedError();
    }
    for (const el of elements) {
        if (el.group === "nodes" && el.data.id !== undefined && cy.getElementById(el.data.id).nonempty()) {
            throw new IdTakenError(el.data.id);
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
 * An import id no element of the core holds yet.
 * @param cy - the core
 * @returns the id
 */
function freeImportId(cy: Core): string {
    const taken = new Set(cy.elements("[graphty_import]").map((e) => String(e.data("graphty_import"))));
    let k = taken.size + 1;
    while (taken.has(String(k))) {
        k++;
    }
    return String(k);
}

/**
 * Sets each added element's style bypass. Cytoscape skips a definition whose id an earlier one took, so the added
 * collection is walked beside the definitions and a definition gets its bypass only when it is the next element.
 * @param added - what cy.add returned, in definition order
 * @param defs - the definitions, whose `data.id` cy.add filled in
 * @param bypass - one bypass or null per definition
 */
function applyBypass(
    added: CollectionReturnValue,
    defs: ElementDefinition[],
    bypass: readonly (Readonly<Record<string, string | number>> | null)[],
): void {
    let j = 0;
    defs.forEach((def, i) => {
        const ele = added[j];
        if (ele?.id() !== def.data.id) {
            return;
        }
        j++;
        const b = bypass[i];
        if (b !== null && b !== undefined) {
            ele.style(b as never);
        }
    });
}

/**
 * Registers graphtyGenerate, graphtyDataset, graphtyImport and graphtyExport.
 * @param cytoscape - the cytoscape function
 */
export function registerGraphData(cytoscape: Register): void {
    cytoscape("core", "graphtyGenerate", async function (this: Core, name: GeneratorName, options: unknown) {
        const { generateElements } = await loadPart(import("./samples.js"), "graphtyGenerate");
        const r = generateElements(name, options as never);
        return { elements: addTo(this, r.elements), directed: r.directed };
    });
    cytoscape("core", "graphtyDataset", async function (this: Core, name: string, options?: FetchDatasetOptions) {
        const { datasetElements } = await loadPart(import("./samples.js"), "graphtyDataset");
        const r = await datasetElements(name, options);
        options?.signal?.throwIfAborted();
        return { elements: addTo(this, r.elements), directed: r.directed };
    });
    cytoscape(
        "core",
        "graphtyImport",
        async function (this: Core, input: ImportInput | ArrayBuffer, format?: ImportFormat, options?: ImportOptions) {
            const { importElements } = await loadPart(import("./io.js"), "graphtyImport");
            const styled = options?.styles !== undefined && options.styles !== false;
            const r = await importElements(input, format, {
                ...options,
                ...(styled && options.importId === undefined ? { importId: freeImportId(this) } : {}),
            });
            const apply = options?.applyStyles === true && r.stylesheet !== undefined;
            const elements = addTo(this, r.elements);
            if (apply && r.bypass !== undefined) {
                // Set after the add, not as the definition's `style`: Cytoscape 3.31 applies a creation-time
                // bypass before the edge has its endpoints, and a `curve-style` there throws in parallelEdges().
                applyBypass(elements, r.elements, r.bypass);
            }
            const style = this.style() as unknown as AppendableStyle | undefined;
            if (apply && r.stylesheet !== undefined && style !== undefined) {
                // appended rule by rule: a round trip through style.json() turns the core's own function-valued
                // properties into the string "fn", which Cytoscape then rejects
                let s = style;
                for (const rule of r.stylesheet) {
                    s = s.selector(rule.selector).style(rule.style);
                }
                s.update();
            }
            return {
                elements,
                directed: r.directed,
                format: r.format,
                report: r.report,
                ...(r.stylesheet === undefined ? {} : { stylesheet: r.stylesheet }),
            };
        },
    );
    const exportFn = async (eles: Collection, format: ExportFormat, options?: ExportOptions): Promise<string> => {
        const { exportElements } = await loadPart(import("./io.js"), "graphtyExport");
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
