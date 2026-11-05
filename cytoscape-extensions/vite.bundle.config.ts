import { fileURLToPath } from "node:url";

import { defineConfig, type Plugin, type UserConfig } from "vite";

/**
 * The two builds for a page with no bundler, both in dist/ (tsc owns the rest of it):
 *
 * - `vite build --mode cdn`: the ES module build in dist/cdn/, loaded with `<script type="module">` from a CDN.
 *   The library build (tsc) leaves every dependency to the consumer's installer; this one bundles them all
 *   (Cytoscape excepted: the extension never imports it, `use()` hands it over), so every import is a relative
 *   path the browser resolves against the CDN. It keeps the library's code splitting: the WebGPU code, the
 *   generators and the file formats are chunks fetched on first use. The file formats (`io.js`) have a fixed
 *   name, because the script-tag build loads them. The datasets are not code: they download from graphty.app.
 *
 * - the default mode: the script-tag build, `dist/cytoscape-extensions.bundle.js`, one classic script. Every
 *   dynamic import is inlined, GPU detection included, except the file formats: those are most of the size and
 *   few pages use them, so the bundle loads them from dist/cdn/ next to itself, at the same URL prefix (so the
 *   same version) the bundle came from.
 */

const pkg = (path: string): string => fileURLToPath(new URL(path, import.meta.url));

// the package's `imports` field maps "#gpu-platform" to the Node or the browser build; both builds are for a browser
const resolve = { alias: { "#gpu-platform": pkg("src/gpu-platform-browser.ts") } };

/**
 * The script-tag build's lazy part: the dynamic import of ./io.js becomes a call to `graphtyLoadLazy("io.js")`
 * (defined in the bundle's intro), which imports that file from dist/cdn/. Rewritten in the source, because Vite 8's
 * bundler (Rolldown) has no renderDynamicImport hook, and a call to the intro's function also keeps the minifier
 * from dropping it as unused.
 * @returns the plugin
 */
function lazyFromCdnBuild(): Plugin {
    return {
        name: "graphty-lazy-from-cdn-build",
        transform(code) {
            return code.includes('import("./io.js")')
                ? code.replaceAll('import("./io.js")', 'graphtyLoadLazy("io.js")')
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
            "graphty: the script-tag bundle loads the file formats from dist/cdn/ next to itself, " +
            "but it was not loaded by a <script src> tag, so it cannot tell where that is. Load it with " +
            "<script src>, or use the ES module build: <script type='module'> importing " +
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
                intro,
            },
        },
    },
};

export default defineConfig(({ mode }) => (mode === "cdn" ? cdn : scriptTag));
