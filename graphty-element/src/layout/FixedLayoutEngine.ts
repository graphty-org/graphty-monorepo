import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import type { Node } from "../Node";
import { SimpleLayoutConfig, SimpleLayoutEngine } from "./LayoutEngine";

/**
 * Zod-based options schema for Fixed Layout
 */
const fixedLayoutOptionsSchema = defineOptions({
    dim: {
        schema: z.number().int().min(2).max(3).default(3),
        meta: {
            label: "Dimensions",
            description: "Layout dimensionality (2D or 3D)",
        },
    },
});

const FixedLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    dim: z.number().default(3),
});
type FixedLayoutConfigType = z.infer<typeof FixedLayoutConfig>;
type FixedLayoutOpts = Partial<FixedLayoutConfigType>;

/**
 * The fixed layout: every node stays where the element's position array already has it.
 *
 * A node's `data.position` reaches that array when the node is loaded (scaled by
 * `data.knownFields.positionScale`), and a drag writes it there too, so this engine computes
 * nothing: it reads the array and places only a node that has no coordinates at all, at the origin.
 */
export class FixedLayout extends SimpleLayoutEngine {
    static type = "fixed";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = fixedLayoutOptionsSchema;
    config: FixedLayoutConfigType;
    scalingFactor = 1;

    /**
     * Create a fixed layout engine
     * @param opts - Configuration options including dimensions
     */
    constructor(opts: FixedLayoutOpts = {}) {
        super(opts);
        this.config = FixedLayoutConfig.parse(opts);
    }

    /**
     * Add a node, and put its mesh at its `data.position` straight away.
     *
     * The array is not touched here: the node's row is seeded from the same `data.position` when
     * the graph is next frozen, which is before this engine next reads it. This only spares the
     * node the frames between its arrival and that read, which it would otherwise spend wherever a
     * new mesh starts -- and a caller that reads a node's mesh position as soon as the add has
     * finished, as the element's own tests do, gets the node's place rather than that.
     * @param n - The node to add
     */
    override addNode(n: Node): void {
        super.addNode(n);
        const position = (n.data as Record<string, unknown>).position as
            | { x?: number; y?: number; z?: number }
            | undefined;
        if (position) {
            n.mesh.position.set(position.x ?? 0, position.y ?? 0, position.z ?? 0);
        }
    }

    /**
     * Keep every placed row, and put an unplaced one at the origin.
     */
    doLayout(): void {
        this.stale = false;
        const { graph } = this;
        const positions = new Float32Array(3 * graph.nodeCount).fill(Number.NaN);
        const at = { x: 0, y: 0, z: 0 };
        for (const node of this._nodes) {
            const row = this.rowOfId(node.id);
            if (row === INVALID_INDEX) {
                continue;
            }

            // A placed row is written back unchanged, which is what keeps it from being mistaken
            // for an unplaced one by a reader of what this engine computed.
            const placed = this.readNodePosition(node, at);
            positions.set(placed ? [at.x, at.y, at.z] : [0, 0, 0], 3 * row);
        }

        this.result = { positions, dim: 3, n: graph.nodeCount };
    }
}
