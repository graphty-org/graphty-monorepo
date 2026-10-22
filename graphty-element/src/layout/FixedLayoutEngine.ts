import type { F32 } from "@graphty/graph-format";
import { z } from "zod";

import { defineOptions, type OptionsSchema } from "../config";
import type { Edge } from "../Edge";
import type { Node } from "../Node";
import { GRAPHVIZ_TIME_BUDGET_MS } from "./graphviz/engines";
import { POINTS_PER_UNIT } from "./graphviz/toDot";
import { type EdgePosition, SimpleLayoutConfig } from "./LayoutEngine";
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
    scale: {
        schema: z.number().positive().default(1),
        meta: {
            label: "Scale",
            description: "What every data position is multiplied by, on top of the element's positionScale",
            advanced: true,
        },
    },
    edgeRoutes: {
        schema: z.enum(["element", "graphviz"]).default("element"),
        meta: {
            label: "Edge routes",
            description:
                "Who routes the edges the data stores no route for: the element, or Graphviz round the placed nodes (neato -n2), which needs the optional package @hpcc-js/wasm-graphviz",
        },
    },
    graphvizAttributes: {
        schema: z.record(z.string(), z.string()).default({}),
        meta: {
            label: "Graphviz attributes",
            description: 'Graphviz graph attributes the routes follow, such as { splines: "curved" }',
            advanced: true,
        },
    },
});

const FixedLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    dim: z.number().default(3),
    scale: z.number().positive().default(1),
    edgeRoutes: z.enum(["element", "graphviz"]).default("element"),
    graphvizAttributes: z.record(z.string(), z.string()).default({}),
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
 * is placed at the origin. Either way, nodes whose data gave no position are reported as a
 * `layout-warning` event with code `W_NO_POSITION`, so a misspelled position is never silent.
 * `scale` (1 by default) multiplies every data position on top of `positionScale`: a load that
 * draws a file's styles sets it so the stored drawing is in the same unit as the file's node sizes.
 * `edgeRoutes: "graphviz"` has Graphviz route the edges between the placed nodes (`neato -n2`, how
 * Graphviz draws a file whose nodes carry their place and whose edges do not), reading each data
 * length as a point (`scale` scene units); a route the edge's style stores still wins. When
 * Graphviz cannot route them the nodes are placed all the same, the edges are drawn the element's
 * way, and a `layout-warning` with code `W_ROUTES_NOT_LAID` says why.
 */
export class FixedLayout extends SnapshotLayoutEngine {
    static type = "fixed";
    static maxDimensions = 3;
    static zodOptionsSchema: OptionsSchema = fixedLayoutOptionsSchema;
    config: FixedLayoutConfigType;
    /** The route Graphviz laid each edge along, when `edgeRoutes` is `"graphviz"`. */
    private routes = new Map<Edge, readonly number[]>();
    /** Always three: a node's data carries a z, and a 2D view draws it flat. */
    protected readonly dimensions = 3;

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
            { x?: number; y?: number; z?: number } | undefined;
        if (position) {
            const { scale } = this.config;
            n.setMeshPosition((position.x ?? 0) * scale, (position.y ?? 0) * scale, (position.z ?? 0) * scale);
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
     * unplaced row goes to the origin. With `edgeRoutes: "graphviz"`, the answer waits for the routes.
     * @param input - the graph, the current coordinates and the data's own
     * @returns the coordinates
     */
    protected compute(input: SnapshotLayoutInput): F32 | Promise<F32> {
        const positions = this.place(input);
        return this.config.edgeRoutes === "graphviz" ? this.route(input, positions) : positions;
    }

    /**
     * Where an edge's ends are, and the route Graphviz laid it along when it routed it.
     * @param e - the edge
     * @returns its ends, and its bends when it has a route
     */
    override getEdgePosition(e: Edge): EdgePosition {
        const ends = super.getEdgePosition(e);
        const bends = this.routes.get(e);
        return bends === undefined ? ends : { ...ends, bends };
    }

    /**
     * Have Graphviz route the edges between the placed nodes.
     * @param input - the run's input
     * @param positions - where the nodes are placed
     * @returns the same positions, once the routes are read
     */
    private async route(input: SnapshotLayoutInput, positions: F32): Promise<F32> {
        const { layoutStructure, pinnedRoutes, routesOf } = await import("./GraphvizLayoutEngine");
        const structure = layoutStructure(input, this._nodes, this._edges, this.followerGroups, true);
        try {
            const bends = await pinnedRoutes(
                input,
                positions,
                this.dimensions,
                {
                    // a data length is a point: an inch is 72 of them
                    scale: POINTS_PER_UNIT * this.config.scale,
                    attributes: this.config.graphvizAttributes,
                    timeoutMs: GRAPHVIZ_TIME_BUDGET_MS,
                },
                this.followerGroups,
                structure,
            );
            if (!input.signal.aborted) {
                this.routes = routesOf(bends, structure.edgeOf);
            }
        } catch (error) {
            input.signal.throwIfAborted();
            this.routes = new Map();
            const details = (error as { details?: Readonly<Record<string, unknown>> }).details ?? {};
            input.warn({ code: "W_ROUTES_NOT_LAID", params: { reason: details.reason ?? "graphviz.error" } });
        }

        return positions;
    }

    /**
     * Where every node goes: its data position on the first run, else where it is.
     * @param input - the graph, the current coordinates and the data's own
     * @returns the coordinates
     */
    private place(input: SnapshotLayoutInput): F32 {
        const seeds = input.firstRun ? input.dataPositions() : null;
        if (seeds !== null && this.config.scale !== 1) {
            for (let i = 0; i < seeds.length; i++) {
                seeds[i] *= this.config.scale;
            }
        }

        const { initial } = input;
        const positions = new Float32Array(initial.length);
        // Rows the data gave no position: on the first run, every row without a data position;
        // later, every row nothing has placed (a newcomer is seeded from its data when it arrives).
        let missing = 0;
        for (let i = 0; i < positions.length; i += 3) {
            // A placed row is written back unchanged, which is what keeps it from being mistaken
            // for an unplaced one by a reader of what this engine computed.
            let from: F32 | null = Number.isNaN(initial[i]) ? null : initial;
            if (seeds !== null && !Number.isNaN(seeds[i])) {
                from = seeds;
            } else if (seeds !== null || from === null) {
                missing++;
            }

            positions.set(from === null ? [0, 0, 0] : from.subarray(i, i + 3), i);
        }

        if (missing > 0) {
            input.warn({ code: "W_NO_POSITION", params: { missing, total: positions.length / 3 } });
        }

        return positions;
    }
}
