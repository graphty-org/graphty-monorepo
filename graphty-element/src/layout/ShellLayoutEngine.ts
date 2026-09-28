import { INVALID_INDEX } from "@graphty/graph-format";
import { indexed } from "@graphty/layout";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { layoutDim, SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

/**
 * Zod-based options schema for Shell Layout
 */
const shellLayoutOptionsSchema = defineOptions({
    scalingFactor: {
        schema: z.number().min(1).max(1000).default(100),
        meta: {
            label: "Scaling Factor",
            description: "Multiplier for node positions",
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
    dim: z.number().default(2),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    scale: z.number().positive().default(1),
});
type ShellLayoutConfigType = z.infer<typeof ShellLayoutConfig>;
type ShellLayoutOpts = Partial<ShellLayoutConfigType>;

/**
 * Shell layout engine that arranges nodes in concentric shells
 */
export class ShellLayout extends SimpleLayoutEngine {
    static type = "shell";
    static maxDimensions = 2;
    static zodOptionsSchema: OptionsSchema = shellLayoutOptionsSchema;
    scalingFactor = 100;
    config: ShellLayoutConfigType;

    /**
     * Create a shell layout engine
     * @param opts - Configuration options including node lists for each shell
     */
    constructor(opts: ShellLayoutOpts) {
        super(opts);
        this.config = ShellLayoutConfig.parse(opts);
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
     * Compute node positions in concentric shells
     */
    doLayout(): void {
        this.stale = false;
        const { nlist } = this.config;
        this.result = indexed.shell(this.graph, {
            // A node a shell names that the graph does not hold has nowhere to be drawn.
            nlist: nlist?.map((shell) => shell.map((id) => this.rowOfId(id)).filter((row) => row !== INVALID_INDEX)),
            scale: this.config.scale,
            center: this.config.center ?? undefined,
            dim: layoutDim(this.config.dim),
        });
    }
}
