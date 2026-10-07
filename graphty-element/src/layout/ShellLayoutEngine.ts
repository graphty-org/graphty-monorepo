import { type F32, INVALID_INDEX } from "@graphty/graph-format";
import { shell } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { groupRows } from "./groupBy";
import { layoutDim, SimpleLayoutConfig } from "./LayoutEngine";
import { sceneUnits, SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

/**
 * Zod-based options schema for Shell Layout
 */
const shellLayoutOptionsSchema = defineOptions({
    groupBy: {
        schema: z.string().nullable().default(null),
        meta: {
            label: "Group By",
            description: "The node attribute or result field whose values name each node's group",
        },
    },
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
            advanced: true,
        },
    },
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "Scale factor for the shell layout radius",
            step: 0.1,
        },
    },
    dim: {
        schema: z.number().int().min(2).max(2).default(2),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D only for shell)",
        },
    },
});

const ShellLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    nlist: z.array(z.array(z.number())).or(z.null()).default(null),
    groupBy: z.string().nullable().default(null),
    dim: z.number().default(2),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    scale: z.number().positive().default(1),
});
type ShellLayoutConfigType = z.infer<typeof ShellLayoutConfig>;
type ShellLayoutOpts = Partial<ShellLayoutConfigType>;

/**
 * Shell layout engine that arranges nodes in concentric shells
 */
export class ShellLayout extends SnapshotLayoutEngine {
    static type = "shell";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = shellLayoutOptionsSchema;
    /** Layout units to scene units. */
    private static readonly scale = 100;
    protected readonly dimensions: 2 | 3;
    config: ShellLayoutConfigType;

    /**
     * Create a shell layout engine
     * @param opts - Configuration options including node lists for each shell
     */
    constructor(opts: ShellLayoutOpts) {
        super(opts);
        this.config = ShellLayoutConfig.parse(opts);
        this.dimensions = layoutDim(this.config.dim);
    }

    /**
     * Get dimension-specific options for shell layout
     * @param dimension - The desired dimension (2 or 3)
     * @returns Options object with dim parameter or null for 3D (unsupported)
     */
    static getOptionsForDimension(dimension: 2 | 3): object | null {
        // Shell layout only supports 2D
        if (dimension > this.maxDimensions) {
            return null;
        }

        return { dim: dimension };
    }

    /**
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Compute node positions in concentric shells
     * @param input - the graph to arrange
     * @returns the coordinates, in scene units
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        const { nlist, groupBy } = this.config;
        let rings: number[][] | undefined;
        if (groupBy !== null) {
            const { groups, ungrouped } = groupRows(input, ShellLayout.type);
            rings = ungrouped.length > 0 ? [...groups, [...ungrouped]] : [...groups];
        } else {
            // A node a shell names that the graph does not hold has nowhere to be drawn.
            rings = nlist?.map((shell) => shell.map((id) => this.rowOfId(id)).filter((row) => row !== INVALID_INDEX));
        }

        return sceneUnits(
            shell(input.graph, {
                nlist: rings,
                scale: this.config.scale,
                center: this.config.center ?? undefined,
                dim: layoutDim(this.config.dim),
            }),
            ShellLayout.scale,
        );
    }
}
