import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin, type UserConfig } from "vite";

import { BUNDLED_DATASET_NAMES } from "./src/samples.js";

/**
 * The two builds for a page with no bundler, both in dist/ (tsc owns the rest of it):
 *
 * - `vite build --mode cdn`: the ES module build in dist/cdn/, loaded with `<script type="module">` from a CDN.
 *   The library build (tsc) leaves every dependency to the consumer's installer; this one bundles them all
 *   (Cytoscape excepted: the extension never imports it, `use()` hands it over), so every import is a relative
 *   path the browser resolves against the CDN. It keeps the library's code splitting: the WebGPU code, the
 *   generators, each dataset and the file formats are chunks fetched on first use. The file formats
 *   (`io.js`) and each dataset (`datasets/<name>.js`) have fixed names, because the script-tag build loads them.
 *
 * - the default mode: the script-tag build, `dist/cytoscape-extensions.bundle.js`, one classic script. Every
 *   dynamic import is inlined, GPU detection included, except the file formats and the datasets: those are most
 *   of the size and few pages use them, so the bundle loads them from dist/cdn/ next to itself, at the same URL
 *   prefix (so the same version) the bundle came from.
 */

const pkg = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// the package's `imports` field maps "#gpu-platform" to the Node or the browser build; both builds are for a browser
const resolve = { alias: { "#gpu-platform": pkg("src/gpu-platform-browser.ts") } };

const DATASET = /^@graphty\/graph-samples\/datasets\/(.+)$/;

/**
 * The script-tag build's lazy parts: the dynamic import of ./io.js and of each dataset becomes a call to
 * `graphtyLoadLazy("io.js")` (defined in the bundle's intro), which imports that file from dist/cdn/.
 * @returns the plugin
 */
function lazyFromCdnBuild(): Plugin {
    const lazy = new Set<string>();
    return {
        name: "graphty-lazy-from-cdn-build",
        resolveDynamicImport(specifier) {
            if (typeof specifier !== "string") {
                return null;
            }
            const dataset = DATASET.exec(specifier);
            if (specifier !== "./io.js" && dataset === null) {
                return null;
            }
            const id = dataset === null ? "io.js" : `datasets/${dataset[1]}.js`;
            lazy.add(id);
            return { id, external: true };
        },
        renderDynamicImport({ targetModuleId }) {
            return targetModuleId !== null && lazy.has(targetModuleId)
                ? { left: "graphtyLoadLazy(", right: ")" }
                : null;
        },
    };
}

// Runs as the bundle starts, while document.currentScript is still this script.
const intro = `
var graphtyLazyBase = typeof document !== "undefined" && document.currentScript && document.currentScript.src;
function graphtyLoadLazy(path) {
    if (!graphtyLazyBase) {
        return Promise.reject(new Error(
            "graphty: the script-tag bundle loads the file formats and the datasets from dist/cdn/ next to itself, " +
            "but it was not loaded by a <script src> tag, so it cannot tell where that is. Load it with " +
            "<script src>, or use the ES module build: <script type=\\"module\\"> importing " +
            "https://cdn.jsdelivr.net/npm/@graphty/cytoscape-extensions/dist/cdn/cytoscape-extensions.js"));
    }
    return import(new URL("cdn/" + path, graphtyLazyBase).href);
}`;

// Not lib mode: Vite's library build never strips whitespace from an ES module. A plain build with the entries as
// inputs is minified in full; preserveEntrySignatures keeps their exports, and modulePreload off leaves each dynamic
// import a plain import() of a relative path, with no preload helper.
const cdn: UserConfig = {
    resolve,
    base: "./",
    build: {
        outDir: "dist/cdn",
        emptyOutDir: true,
        minify: true,
        sourcemap: false,
        modulePreload: false,
        rollupOptions: {
            input: {
                "cytoscape-extensions": pkg("src/index.ts"),
                io: pkg("src/io.ts"),
                ...Object.fromEntries(
                    BUNDLED_DATASET_NAMES.map((n) => [
                        `datasets/${n}`,
                        fileURLToPath(import.meta.resolve(`@graphty/graph-samples/datasets/${n}`)),
                    ]),
                ),
            },
            preserveEntrySignatures: "strict",
            output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" },
        },
    },
};

const scriptTag: UserConfig = {
    resolve,
    plugins: [lazyFromCdnBuild()],
    build: {
        emptyOutDir: false,
        lib: {
            entry: pkg("bundle.ts"),
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
                intro,
            },
        },
    },
};

export default defineConfig(({ mode }) => (mode === "cdn" ? cdn : scriptTag));
