import type { F32 } from "@graphty/graph-format";
import { grid } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

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
export class GridLayout extends SnapshotLayoutEngine {
    static type = "grid";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = gridLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: GridLayoutConfigType;

    /**
     * Create a grid layout engine
     * @param opts - Configuration options including the column count
     */
    constructor(opts: GridLayoutOpts) {
        super(opts);
        this.config = GridLayoutConfig.parse(opts);
        this.dimensions = 2;
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
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Compute node positions on the lattice
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        return sceneUnits(
            grid(input.graph, {
                columns: this.config.columns,
                scale: this.config.scale,
                center: this.config.center ?? undefined,
            }),
            GridLayout.scale,
        );
    }
}
