/**
 * The script-tag build (dist/cytoscape-extensions.bundle.js, built by vite.bundle.config.ts). Loaded after
 * Cytoscape's own script, it registers every extension onto the global `cytoscape`, the way other Cytoscape
 * extensions do. It also sets the global `graphtyCytoscape`, for a page that loads Cytoscape afterwards and calls
 * `cytoscape.use(graphtyCytoscape)` itself. A classic script has no named imports, so the package's named exports
 * hang off that global: `graphtyCytoscape.configureWebGpu(...)`, `graphtyCytoscape.LAYOUT_NAMES`, and so on.
 */

import graphtyCytoscape, {
    ALGORITHM_NAMES,
    ASYNC_ALGORITHM_NAMES,
    configureWebGpu,
    GPU_SIZE_FLOOR,
    LAYOUT_NAMES,
    toSnapshot,
    writeData,
} from "./src/index.js";

const extension = Object.assign(graphtyCytoscape, {
    ALGORITHM_NAMES,
    ASYNC_ALGORITHM_NAMES,
    configureWebGpu,
    GPU_SIZE_FLOOR,
    LAYOUT_NAMES,
    toSnapshot,
    writeData,
});

const { cytoscape } = globalThis as {
    cytoscape?: ((...args: never[]) => unknown) & { use(ext: typeof graphtyCytoscape): unknown };
};
if (typeof cytoscape === "function") {
    cytoscape.use(extension);
}

export default extension;
