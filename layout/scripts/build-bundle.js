/**
 * Build Bundle Script
 *
 * Creates a single ES module bundle (dist/layout.js) that:
 * - Contains all the library code in a single file
 * - Is used by the examples (via Vite alias)
 * - Can be distributed as a standalone file
 * - Is the single source of truth for the bundled version
 */

import { build } from "vite";
import { readFileSync } from "node:fs";
import path from "path";
import { fileURLToPath } from "url";
import { spawnSync } from "child_process";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Every package listed in dependencies or peerDependencies is external to the
 * bundle, including its subpaths (the graph-io helper). external: [] would inline
 * a second copy of @graphty/graph-format into dist/layout.js.
 */
function externalDependencies() {
    const packageJson = JSON.parse(readFileSync(path.resolve(__dirname, "../package.json"), "utf8"));
    const names = new Set([
        ...Object.keys(packageJson.dependencies ?? {}),
        ...Object.keys(packageJson.peerDependencies ?? {}),
    ]);
    return (id) => {
        for (const name of names) {
            if (id === name || id.startsWith(`${name}/`)) {
                return true;
            }
        }
        return false;
    };
}

async function buildBundle() {
    try {
        // Build a bundled ES module version
        await build({
            configFile: false,
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphLayout",
                    formats: ["es"],
                    fileName: () => "layout.js",
                },
                outDir: path.resolve(__dirname, "../dist"),
                emptyOutDir: false, // Don't clean the dist directory
                rollupOptions: {
                    external: externalDependencies(),
                    output: {
                        preserveModules: false,
                        inlineDynamicImports: true,
                    },
                },
                minify: false,
                sourcemap: true,
            },
        });

        console.log("Successfully built dist/layout.js");

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
