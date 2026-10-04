/**
 * A memory guard for the builder importGraph() fills. graph-format stores every attribute as a dense
 * column, one slot per node (or edge) whether or not that element has a value, so a file whose nodes
 * each carry a differently named attribute holds n values but allocates n x n slots: a few hundred
 * kilobytes of input can need gigabytes. The guard counts the slots that hold no value and stops the
 * import once they pass a limit. A dense file has almost no empty slots, so it is never stopped
 * however large it is.
 */

import {
    type ColumnDecl,
    type ColumnHandle,
    GraphBuilder,
    type GraphBuilderOptions,
    GraphFormatError,
    type NodeId,
} from "@graphty/graph-format";

import { describe } from "./options.js";
import { ImportReportBuilder } from "./report.js";

/**
 * Import stopped for allocating too many empty attribute slots.
 * @category Issue and loss codes
 */
export const TOO_MANY_EMPTY_CELLS_CODE = "E_TOO_MANY_EMPTY_CELLS";

/** The default limit: 2^24 empty slots, about 130 MB of f64 columns. */
const DEFAULT_MAX_EMPTY_CELLS = 2 ** 24;

/**
 * Resolve the maxEmptyCells option.
 * @param value - the caller's value
 * @returns a non-negative integer or Infinity
 * @throws GraphFormatError E_UNSUPPORTED for anything else
 * @category Plugin helpers
 */
export function maxEmptyCellsOption(value: unknown): number {
    if (value === undefined) {
        return DEFAULT_MAX_EMPTY_CELLS;
    }
    if (typeof value === "number" && value >= 0 && (Number.isInteger(value) || value === Infinity)) {
        return value;
    }
    throw new GraphFormatError(
        "E_UNSUPPORTED",
        `option maxEmptyCells: ${describe(value)} is not a non-negative integer or Infinity`,
        { option: "maxEmptyCells", found: value },
    );
}

/**
 * A GraphBuilder that throws an ImportError once its attribute columns hold too many empty slots.
 * @category Plugin helpers
 */
export class CellBudgetBuilder extends GraphBuilder {
    private readonly nodeColumns = new Set<number>();
    private readonly edgeColumns = new Set<number>();
    private values = 0;

    /**
     * Create a builder with a limit.
     * @param options - the builder options
     * @param format - the format being read, for the error's report
     * @param maxEmptyCells - the most empty slots allowed
     */
    constructor(
        options: GraphBuilderOptions,
        private readonly format: string,
        private readonly maxEmptyCells: number,
    ) {
        super(options);
    }

    /**
     * Add a node, then check the limit (its row adds a slot to every node column).
     * @param id - the node id
     * @returns the node index
     */
    override addNode(id: NodeId): number {
        const index = super.addNode(id);
        this.checkBudget();
        return index;
    }

    /**
     * Add an edge, then check the limit (its row adds a slot to every edge column).
     * @param source - source id
     * @param target - target id
     * @param weight - the weight
     * @returns the edge index
     */
    override addEdge(source: NodeId, target: NodeId, weight?: number): number {
        const edge = super.addEdge(source, target, weight);
        this.checkBudget();
        return edge;
    }

    /**
     * Declare a node column, then check the limit.
     * @param decl - the declaration
     * @returns the column handle
     */
    override declareNodeColumn(decl: ColumnDecl): ColumnHandle {
        const handle = super.declareNodeColumn(decl);
        this.nodeColumns.add(handle);
        this.checkBudget();
        return handle;
    }

    /**
     * Declare an edge column, then check the limit.
     * @param decl - the declaration
     * @returns the column handle
     */
    override declareEdgeColumn(decl: ColumnDecl): ColumnHandle {
        const handle = super.declareEdgeColumn(decl);
        this.edgeColumns.add(handle);
        this.checkBudget();
        return handle;
    }

    /**
     * Set a node cell (a new name declares a column), then check the limit.
     * @param column - the handle or name
     * @param index - the node index
     * @param value - the value
     */
    override setNodeValue(column: ColumnHandle | string, index: number, value: unknown): void {
        super.setNodeValue(column, index, value);
        this.nodeColumns.add(typeof column === "string" ? this.nodeColumn(column) : column);
        this.count(value);
    }

    /**
     * Set an edge cell (a new name declares a column), then check the limit.
     * @param column - the handle or name
     * @param edge - the edge index
     * @param value - the value
     */
    override setEdgeValue(column: ColumnHandle | string, edge: number, value: unknown): void {
        super.setEdgeValue(column, edge, value);
        this.edgeColumns.add(typeof column === "string" ? this.edgeColumn(column) : column);
        this.count(value);
    }

    /**
     * Count a written value and check the budget.
     * @param value - the value; null and undefined unset a slot and do not count
     */
    private count(value: unknown): void {
        if (value !== null && value !== undefined) {
            this.values++;
        }
        this.checkBudget();
    }

    /**
     * Throw when the columns' slots minus the values written pass the limit.
     * @throws ImportError E_TOO_MANY_EMPTY_CELLS
     */
    private checkBudget(): void {
        const slots = this.nodeColumns.size * this.nodeBound + this.edgeColumns.size * this.edgeBound;
        const empty = slots - this.values;
        if (empty > this.maxEmptyCells) {
            new ImportReportBuilder(this.format, Infinity).fail(
                TOO_MANY_EMPTY_CELLS_CODE,
                `the attributes are too sparse: ${this.nodeColumns.size} node and ${this.edgeColumns.size} edge ` +
                    `attribute column(s) over ${this.nodeBound} node(s) and ${this.edgeBound} edge(s) would ` +
                    `allocate more than ${this.maxEmptyCells} slots that hold no value; pass a larger ` +
                    `maxEmptyCells (or Infinity) to read the file anyway`,
                undefined,
                { emptyCells: empty, maxEmptyCells: this.maxEmptyCells },
            );
        }
    }
}
