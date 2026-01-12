/**
 * Zod schemas for all 16 layout algorithms.
 * These schemas mirror the configurations from graphty-element layout engines.
 * They are used to dynamically generate form fields in the Run Layouts modal.
 */
import { z } from "zod";

/**
 * Base layout configuration inherited by most layouts
 */
const SimpleLayoutConfig = z.object({
    scalingFactor: z.number().default(100),
});

/**
 * D3 Force Layout Configuration
 * Uses D3 force-directed simulation with customizable physics parameters
 */
const D3LayoutConfig = z.strictObject({
    alphaMin: z.number().positive().default(0.1),
    alphaTarget: z.number().min(0).default(0),
    alphaDecay: z.number().positive().default(0.0228),
    velocityDecay: z.number().positive().default(0.4),
});

/**
 * NGraph Layout Configuration
 * Fast force-directed layout optimized for large graphs
 * Note: NGraph uses a plain object config, this schema represents common options
 */
const NGraphLayoutConfig = z.strictObject({
    springLength: z.number().positive().default(30),
    springCoefficient: z.number().positive().default(0.0008),
    dragCoefficient: z.number().positive().default(0.02),
    gravity: z.number().default(-1.2),
    theta: z.number().positive().default(0.8),
    dimensions: z.number().min(2).max(3).default(3),
    timeStep: z.number().positive().default(20),
});

/**
 * ForceAtlas2 Layout Configuration
 * Gephi-style force-directed layout with gravity and repulsion
 */
const ForceAtlas2LayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    pos: z.record(z.number(), z.array(z.number()).min(2).max(3)).or(z.null()).default(null),
    maxIter: z.number().positive().default(100),
    jitterTolerance: z.number().positive().default(1.0),
    scalingRatio: z.number().positive().default(2.0),
    gravity: z.number().positive().default(1.0),
    distributedAction: z.boolean().default(false),
    strongGravity: z.boolean().default(false),
    nodeMass: z.record(z.number(), z.number()).or(z.null()).default(null),
    nodeSize: z.record(z.number(), z.number()).or(z.null()).default(null),
    weightPath: z.string().or(z.null()).default(null),
    dissuadeHubs: z.boolean().default(false),
    linlog: z.boolean().default(false),
    seed: z.number().or(z.null()).default(null),
    dim: z.number().default(2),
});

/**
 * Spring Layout Configuration
 * Spring-embedded layout using Fruchterman-Reingold algorithm
 */
const SpringLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    k: z.number().or(z.null()).default(null),
    pos: z.record(z.number(), z.array(z.number()).min(2).max(3)).or(z.null()).default(null),
    fixed: z.array(z.number()).or(z.null()).default(null),
    iterations: z.number().positive().default(50),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(3),
    seed: z.number().positive().or(z.null()).default(null),
});

/**
 * Kamada-Kawai Layout Configuration
 * Energy-minimizing layout based on graph-theoretic distances
 */
const KamadaKawaiLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    dist: z.record(z.number(), z.record(z.number(), z.number())).or(z.null()).default(null),
    pos: z.record(z.number(), z.array(z.number()).min(1).max(3)).or(z.null()).default(null),
    weightProperty: z.string().optional(),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(3),
});

/**
 * ARF (Attractive and Repulsive Forces) Layout Configuration
 */
const ArfLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    pos: z.record(z.number(), z.array(z.number())).or(z.null()).default(null),
    scaling: z.number().positive().default(1),
    a: z.number().positive().default(1.1),
    maxIter: z.number().positive().default(1000),
    seed: z.number().positive().or(z.null()).default(null),
});

/**
 * Circular Layout Configuration
 * Positions nodes in a circle or sphere
 */
const CircularLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(2),
});

/**
 * Spiral Layout Configuration
 * Arranges nodes along a spiral pattern
 */
const SpiralLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
    resolution: z.number().positive().default(0.35),
    equidistant: z.boolean().default(false),
});

/**
 * Shell Layout Configuration
 * Positions nodes in concentric circles
 */
const ShellLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    nlist: z.array(z.array(z.number())).or(z.null()).default(null),
    dim: z.number().default(2),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    scale: z.number().positive().default(1),
});

/**
 * Random Layout Configuration
 * Randomly positions nodes in space
 */
const RandomLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    center: z.array(z.number()).min(2).max(3).or(z.null()).default(null),
    dim: z.number().default(2),
    seed: z.number().positive().or(z.null()).default(null),
});

/**
 * Planar Layout Configuration
 * Attempts to create a planar graph embedding
 */
const PlanarLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
    seed: z.number().or(z.null()).default(null),
});

/**
 * Spectral Layout Configuration
 * Uses eigenvectors of the graph Laplacian for positioning
 */
const SpectralLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    dim: z.number().default(2),
});

/**
 * BFS (Breadth-First Search) Layout Configuration
 * Tree layout starting from a specific node
 */
const BfsLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    start: z.number().or(z.string()).optional(),
});

/**
 * Bipartite Layout Configuration
 * Two-column layout for bipartite graphs
 */
const BipartiteLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    nodes: z.array(z.number().or(z.string())).optional(),
    align: z.enum(["vertical", "horizontal"]).default("vertical"),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
    aspectRatio: z
        .number()
        .positive()
        .default(4 / 3),
});

/**
 * Multipartite Layout Configuration
 * Multi-column layout based on node subset keys
 */
const MultipartiteLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    subsetKey: z.string().optional(),
    align: z.enum(["vertical", "horizontal"]).default("vertical"),
    scale: z.number().positive().default(1),
    center: z.array(z.number()).length(2).or(z.null()).default(null),
});

/**
 * Fixed Layout Configuration
 * Uses pre-defined node positions from data
 */
const FixedLayoutConfig = z.strictObject({
    ...SimpleLayoutConfig.shape,
    dim: z.number().default(3),
});

/**
 * Map of layout type to its Zod schema
 */
const LAYOUT_SCHEMAS: Record<string, z.ZodObject<z.ZodRawShape>> = {
    d3: D3LayoutConfig,
    ngraph: NGraphLayoutConfig,
    forceatlas2: ForceAtlas2LayoutConfig,
    spring: SpringLayoutConfig,
    "kamada-kawai": KamadaKawaiLayoutConfig,
    arf: ArfLayoutConfig,
    circular: CircularLayoutConfig,
    spiral: SpiralLayoutConfig,
    shell: ShellLayoutConfig,
    random: RandomLayoutConfig,
    planar: PlanarLayoutConfig,
    spectral: SpectralLayoutConfig,
    bfs: BfsLayoutConfig,
    bipartite: BipartiteLayoutConfig,
    multipartite: MultipartiteLayoutConfig,
    fixed: FixedLayoutConfig,
};

/**
 * Fields that should be hidden from the UI because they require
 * complex data structures or are for internal use only
 */
const HIDDEN_FIELDS: Record<string, string[]> = {
    d3: [],
    ngraph: [],
    forceatlas2: ["scalingFactor", "pos", "nodeMass", "nodeSize", "weightPath", "dim"],
    spring: ["scalingFactor", "k", "pos", "fixed", "center", "dim"],
    "kamada-kawai": ["scalingFactor", "dist", "pos", "weightProperty", "center", "dim"],
    arf: ["scalingFactor", "pos"],
    circular: ["scalingFactor", "center", "dim"],
    spiral: ["scalingFactor", "center", "dim"],
    shell: ["scalingFactor", "nlist", "center", "dim"],
    random: ["scalingFactor", "center", "dim"],
    planar: ["scalingFactor", "center", "dim"],
    spectral: ["scalingFactor", "center", "dim"],
    bfs: ["scalingFactor"],
    bipartite: ["scalingFactor", "center"],
    multipartite: ["scalingFactor", "center"],
    fixed: ["scalingFactor", "dim"],
};

/**
 * Get the Zod schema for a specific layout type.
 * @param layoutType - The layout type to get the schema for
 * @returns The Zod schema or undefined if not found
 */
export function getLayoutSchema(layoutType: string): z.ZodObject<z.ZodRawShape> | undefined {
    return LAYOUT_SCHEMAS[layoutType];
}

/**
 * Get the hidden fields for a specific layout type.
 * @param layoutType - The layout type to get hidden fields for
 * @returns The list of hidden field names
 */
export function getHiddenFields(layoutType: string): string[] {
    return HIDDEN_FIELDS[layoutType] ?? [];
}
