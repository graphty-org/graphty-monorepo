import type { F32 } from "@graphty/graph-format";
import { z } from "zod/v4";

import { defineOptions, type OptionsSchema } from "../config";
import type { Node } from "../Node";
import { SimpleLayoutConfig } from "./LayoutEngine";
import { SnapshotLayoutEngine, type SnapshotLayoutInput } from "./SnapshotLayoutEngine";

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
 * The fixed layout: every node goes to its `data.position`, and then stays where it is put.
 *
 * The first time an engine lays out, every node carrying a `data.position` is placed there (scaled
 * by `data.knownFields.positionScale`), whatever an earlier layout left in the element's position
 * array -- switching to "fixed" means "put the nodes where the data says". After that the engine
 * keeps what the array holds, so a drag survives a later recompute; a node added later reaches the
 * array from its own `data.position` when the graph is frozen. A node with no coordinates at all
 * is placed at the origin.
 */
export class FixedLayout extends SnapshotLayoutEngine {
    static type = "fixed";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = fixedLayoutOptionsSchema;
    config: FixedLayoutConfigType;
    /** Always three: a node's data carries a z, and a 2D view draws it flat. */
    protected readonly dimensions = 3;
    #placedFromData = false;

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
     * The options the layout reads: the parsed configuration.
     * @returns the configuration
     */
    protected get options(): Readonly<Record<string, unknown>> {
        return this.config;
    }

    /**
     * Place every node at its data position on the first run; later, keep every placed row. An
     * unplaced row goes to the origin.
     * @param input - the graph, the current coordinates and the data's own
     * @returns the coordinates
     */
    protected compute(input: SnapshotLayoutInput): F32 {
        const seeds = this.#placedFromData ? null : input.dataPositions();
        this.#placedFromData = true;
        const { initial } = input;
        const positions = new Float32Array(initial.length);
        for (let i = 0; i < positions.length; i += 3) {
            // A placed row is written back unchanged, which is what keeps it from being mistaken
            // for an unplaced one by a reader of what this engine computed.
            let from: F32 | null = Number.isNaN(initial[i]) ? null : initial;
            if (seeds !== null && !Number.isNaN(seeds[i])) {
                from = seeds;
            }

            positions.set(from === null ? [0, 0, 0] : from.subarray(i, i + 3), i);
        }

        return positions;
    }
}
