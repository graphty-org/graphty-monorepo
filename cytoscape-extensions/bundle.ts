/**
 * The script-tag build (dist/cytoscape-extensions.bundle.js, built by vite.bundle.config.ts). Loaded after
 * Cytoscape's own script, it registers every extension onto the global `cytoscape`, the way other Cytoscape
 * extensions do. It also sets the global `graphtyCytoscape`, for a page that loads Cytoscape afterwards and calls
 * `cytoscape.use(graphtyCytoscape)` itself.
 */

import graphtyCytoscape from "./src/index.js";

const { cytoscape } = globalThis as {
    cytoscape?: ((...args: never[]) => unknown) & { use(ext: typeof graphtyCytoscape): unknown };
};
if (typeof cytoscape === "function") {
    cytoscape.use(graphtyCytoscape);
}

export default graphtyCytoscape;
