import { Edge as LayoutEdge, gridLayout, Node as LayoutNode } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

/**
 * Zod-based options schema for Grid Layout
 */
const gridLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
        },
    },
    columns: {
        schema: z.number().int().positive().nullable().default(null),
        meta: {
            label: "Columns",
            description: "Number of columns; empty makes the grid as close to square as it can",
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Half the length of the grid's longer side",
            step: 0.1,
        },
    },
});

const GridLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    columns: z.number().int().positive().nullable().default(null),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
});
type GridLayoutConfigType = z.infer<typeof GridLayoutConfig>;
type GridLayoutOpts = Partial<GridLayoutConfigType>;

/**
 * Grid layout engine that places nodes in rows and columns on an evenly spaced lattice
 */
export class GridLayout extends SimpleLayoutEngine {
    static type = "grid";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = gridLayoutOptionsSchema;
    scalingFactor = 100;
    config: GridLayoutConfigType;

    /**
     * Create a grid layout engine
     * @param opts - Configuration options including the column count
     */
    constructor(opts: GridLayoutOpts) {
        super(opts);
        this.config = GridLayoutConfig.parse(opts);
    }

    /**
     * Get dimension-specific options for grid layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Empty object for 2D, null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        if (dimension > this.maxDimensions) {
            return null;
        }

        return {};
    }

    /**
     * Compute node positions on the lattice
     */
    doLayout(): void {
        this.stale = false;
        const nodes = (): LayoutNode[] => this._nodes.map((n) => n.id as LayoutNode);
        const edges = (): LayoutEdge[] => this._edges.map((e) => [e.srcId, e.dstId] as LayoutEdge);

        this.positions = gridLayout({ nodes, edges }, this.config.columns, this.config.scale, this.config.center);
    }
}
