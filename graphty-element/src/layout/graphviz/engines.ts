/**
 * @file The eight Graphviz engines graphty-element offers as layouts, and their budgets.
 *
 * Node-safe: no Worker and no import of the Graphviz package, so the catalogue can read it.
 */

/** A Graphviz layout engine, as Graphviz names it. */
export type GraphvizEngine = "dot" | "neato" | "fdp" | "sfdp" | "circo" | "twopi" | "osage" | "patchwork";

/** Every engine, in the order the catalogue lists them. */
export const GRAPHVIZ_ENGINES: readonly GraphvizEngine[] = Object.freeze([
    "dot",
    "neato",
    "fdp",
    "sfdp",
    "circo",
    "twopi",
    "osage",
    "patchwork",
]);

/** The optional peer package that runs them. */
export const GRAPHVIZ_PACKAGE = "@hpcc-js/wasm-graphviz";

/**
 * The largest graph each engine is handed by default. Measured with Graphviz 16.1.0 in
 * WebAssembly at 10,000 nodes: dot, neato and circo do not finish in 300 s, fdp crashes, and
 * sfdp, twopi, osage and patchwork finish in 6.8 s, 15 s, 1.9 s and 1.2 s.
 */
export const GRAPHVIZ_NODE_BUDGETS: Readonly<Record<GraphvizEngine, number>> = Object.freeze({
    dot: 1500,
    neato: 2000,
    fdp: 1000,
    sfdp: 20000,
    circo: 500,
    twopi: 20000,
    osage: 20000,
    patchwork: 20000,
});

/** How long one layout may run before its Worker is stopped, by default. */
export const GRAPHVIZ_TIME_BUDGET_MS = 60_000;

/**
 * The layout id of an engine.
 * @param engine - the engine
 * @returns `graphviz-<engine>`
 */
export function graphvizLayoutId(engine: GraphvizEngine): string {
    return `graphviz-${engine}`;
}

/**
 * Whether a value names a Graphviz engine.
 * @param value - a graph value, such as the DOT attribute `layout`
 * @returns true for one of the eight engine names
 */
export function isGraphvizEngine(value: unknown): value is GraphvizEngine {
    return typeof value === "string" && (GRAPHVIZ_ENGINES as readonly string[]).includes(value);
}
