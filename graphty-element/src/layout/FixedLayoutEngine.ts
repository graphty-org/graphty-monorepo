import { INVALID_INDEX } from "@graphty/graph-format";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import { readSeedPosition } from "../data/ingest";
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
 * The fixed layout: every node goes to its `data.position` (scaled by
 * `data.knownFields.positionScale`) each time the layout runs.
 *
 * The position array is shared by every layout engine, so a row can already hold where another
 * layout put the node -- the default force layout, or the one the reader switched away from. The
 * data position wins over that row. A node with no `data.position` keeps its row, and one with no
 * row either goes to the origin.
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
     * Put every node at its data position; keep the row of a node without one, or use the origin.
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

            const seed = readSeedPosition(node.data as Record<string, unknown>);
            if (seed !== null) {
                const scale = positionScale(node);
                positions.set([seed[0] * scale, seed[1] * scale, seed[2] * scale], 3 * row);
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

/**
 * The element's record-to-scene scale for a node's data position; 1 for a node with no element.
 * @param node - the node
 * @returns `data.knownFields.positionScale`
 */
function positionScale(node: Node): number {
    const graph = node.parentGraph as Node["parentGraph"] | undefined;
    return graph?.getStyles().config.data.knownFields.positionScale ?? 1;
}
