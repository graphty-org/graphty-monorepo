/**
 * The multi-entry bundle build that graph-io, graph-samples and webgpu-graph-algorithms share: one vite
 * library build (ES modules only) that emits, under the package's dist/, one <name>.js per entry of its
 * scripts/entries.js and chunks/*.js for the code two or more entries share, emitted once.
 *
 * Every name under the package's "dependencies" and "peerDependencies" stays external, subpaths included,
 * so consumers install exactly one copy of each. Run the package's "npm run build" (tsc) first so that
 * dist/src/ exists: the package's scripts/bundle-types.js then writes one d.ts shim per entry.
 *
 * Each package's scripts/build-bundle.js calls this with its own `build` from vite, so every package keeps
 * building with the vite its own package.json resolves.
 */

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

/**
 * Every package listed in dependencies or peerDependencies is external to the bundle, including its subpaths.
 * @param packageRoot the package's directory
 * @returns rollup's `external` predicate
 */
function externalDependencies(packageRoot) {
    const packageJson = JSON.parse(readFileSync(path.resolve(packageRoot, "package.json"), "utf8"));
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

/**
 * Builds the package's entries into dist/, then runs its scripts/bundle-types.js. Exits the process with
 * status 1 on any failure.
 * @param options the build
 * @param options.build vite's `build`, imported by the package's own script
 * @param options.packageRoot the package's directory
 * @param options.entries output name under dist/ to source entry, relative to packageRoot
 */
export async function buildBundle({ build, packageRoot, entries }) {
    try {
        const entry = Object.fromEntries(
            Object.entries(entries).map(([name, source]) => [name, path.resolve(packageRoot, source)]),
        );
        await build({
            configFile: false,
            logLevel: "warn",
            build: {
                lib: {
                    entry,
                    formats: ["es"],
                    fileName: (_format, entryName) => `${entryName}.js`,
                },
                outDir: path.resolve(packageRoot, "dist"),
                emptyOutDir: false, // Keep the tsc output under dist/src/
                rollupOptions: {
                    external: externalDependencies(packageRoot),
                    output: {
                        preserveModules: false,
                        chunkFileNames: "chunks/[name]-[hash].js",
                    },
                },
                minify: false,
                sourcemap: true,
            },
        });

        console.log(`Successfully built dist/{${Object.keys(entries).join(",")}}.js`);

        const result = spawnSync(process.execPath, [path.resolve(packageRoot, "scripts/bundle-types.js")], {
            stdio: "inherit",
        });

        if (result.error) {
            throw result.error;
        }

        if (result.status !== 0) {
            throw new Error(`bundle-types.js exited with status ${String(result.status)}`);
        }
    } catch (error) {
        console.error("Error building bundle:", error);
        process.exit(1);
    }
}
