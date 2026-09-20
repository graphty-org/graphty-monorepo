/**
 * Build Bundle Script
 *
 * Creates a single ES module bundle (dist/algorithms.js) that:
 * - Contains all the library code in a single file
 * - Is used by the examples (via Vite alias)
 * - Can be distributed as a standalone file
 * - Is the single source of truth for the bundled version
 */

import { build } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildBundle() {
    try {
        // Build a bundled ES module version
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphAlgorithms",
                    formats: ["es"],
                    fileName: () => "algorithms.js",
                },
                outDir: path.resolve(__dirname, "../dist"),
                emptyOutDir: false, // Don't clean the dist directory
                rollupOptions: {
                    // @graphty/graph-format is a declared dependency AND a caret peer, so the npm
                    // entry must not inline a second copy: an app that installs the format directly
                    // would then ship it twice. isGraphSnapshot() is a Symbol.for brand check
                    // (graph-format/src/constants.ts:37), so two copies would still interoperate and
                    // no test would fail -- the bundle would just double in size, silently. Exactly
                    // the reasoning the layout seam used (2026-09-16-graphty-monorepo-integration.md:2245).
                    // NOTHING ELSE is externalised: typedfastbitset stays inlined, as today.
                    external: [/^@graphty\/graph-format(\/|$)/],
                    output: {
                        preserveModules: false,
                        inlineDynamicImports: true,
                    },
                },
                minify: false,
                sourcemap: true,
            },
        });

        // The examples (the vite dev server's redirect plugin and the gh-pages copies) load the
        // bundle as a plain relative module from a browser, which cannot resolve a bare specifier.
        // They get their own build with nothing external. It is NOT an entry point -- package.json's
        // "main" and "exports" both stay on dist/algorithms.js -- and it needs no .d.ts, because
        // nothing types against it; it rides along in the published tarball only because "files"
        // names the whole dist/ directory.
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphAlgorithms",
                    formats: ["es"],
                    fileName: () => "algorithms.standalone.js",
                },
                outDir: path.resolve(__dirname, "../dist"),
                emptyOutDir: false,
                rollupOptions: {
                    external: [],
                    output: {
                        preserveModules: false,
                        inlineDynamicImports: true,
                    },
                },
                minify: false,
                sourcemap: true,
            },
        });

        console.log("Successfully built dist/algorithms.standalone.js");

        console.log("Successfully built dist/algorithms.js");

        // Bundle TypeScript declarations to match the bundle
        const result = spawnSync("node", [path.resolve(__dirname, "bundle-types.js")], {
            stdio: "inherit",
            shell: true,
        });

        if (result.error) {
            console.error("Warning: Could not bundle TypeScript declarations:", result.error);
            console.error('Make sure to run "npm run build" before "npm run build:bundle"');
        }
    } catch (error) {
        console.error("Error building bundle:", error);
        process.exit(1);
    }
}

buildBundle();
