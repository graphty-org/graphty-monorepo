/**
 * @file Whether the Graphviz layouts can run here, asked once.
 */

/** Whether the Graphviz layouts can run on this host. */
export interface GraphvizCapability {
    /**
     * True when `@hpcc-js/wasm-graphviz` is installed and loads in a module Worker. False in Node,
     * without the package, or where a Content Security Policy refuses it.
     */
    readonly available: boolean;
}

/**
 * Whether the Graphviz layouts (`graphviz-dot` and the rest) can run here. The first call starts
 * a Worker that loads the optional package once; every later call returns the same answer.
 * @returns the capability
 * @since 3.29.0
 * @example
 * ```ts
 * const { available } = await graphvizAvailability();
 * if (available) {
 *     await element.setLayout("graphviz-dot", { rankdir: "LR" });
 * }
 * ```
 */
export async function graphvizAvailability(): Promise<GraphvizCapability> {
    if (typeof Worker === "undefined") {
        return { available: false };
    }

    const { probeGraphviz } = await import("./host");
    return { available: await probeGraphviz() };
}
