import { fileURLToPath } from "node:url";

import { defineConfig } from "vite";

/**
 * The script-tag build: one classic script, `dist/cytoscape-extensions.bundle.js`, for a page with no bundler.
 *
 * The library build (tsc) leaves every dependency to the consumer's installer and loads the GPU code, the
 * generators, the datasets and the file formats as separate chunks on first use. A page loading one file from a
 * CDN has no installer and no chunk loader, so here nothing is external (Cytoscape excepted: the extension never
 * imports it, `use()` hands it over) and every dynamic import is inlined. GPU detection is therefore in the file:
 * a GPU-eligible call probes `navigator.gpu` exactly as it does in a bundled application.
 */
export default defineConfig({
    resolve: {
        // the package's `imports` field maps "#gpu-platform" to the Node or the browser build; a script tag is a browser
        alias: { "#gpu-platform": fileURLToPath(new URL("src/gpu-platform-browser.ts", import.meta.url)) },
    },
    build: {
        // tsc owns dist/; this build adds one file to it
        emptyOutDir: false,
        lib: {
            entry: fileURLToPath(new URL("bundle.ts", import.meta.url)),
            name: "graphtyCytoscape",
            formats: ["iife"],
            fileName: (): string => "cytoscape-extensions.bundle.js",
        },
        minify: true,
        sourcemap: false,
        rollupOptions: {
            output: {
                // the global is the extension function itself, not a module namespace
                exports: "default",
                inlineDynamicImports: true,
            },
        },
    },
});
