/**
 * The multi-entry bundle build that graph-io, graph-samples and webgpu-graph-algorithms share: one vite
 * library build (ES modules only) that emits, under the package's dist/, one <name>.js per entry of its
 * scripts/entries.js and chunks/*.js for the code two or more entries share, emitted once.
 *
 * Every name under the package's "dependencies" and "peerDependencies" stays external, subpaths included,
 * so consumers install exactly one copy of each. Run the package's "npm run build" (tsc) first so that
 * dist/src/ exists: writeDeclarationShims then writes one d.ts shim per entry.
 *
 * Each package's scripts/build-bundle.js calls this with its own `build` from vite, so every package keeps
 * building with the vite its own package.json resolves.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
 * Writes one declaration shim per entry, dist/<name>.d.ts, each a single re-export of the tsc output of its
 * source entry under dist/src/, so a shim can never drift from the source export list. A nested name
 * (datasets/karate) gets its directory and a specifier relative to it. Every package that publishes a
 * bundle (the single-entry ones too) writes its shims here, so a fix lands in all of them at once.
 * @param options the shims
 * @param options.packageRoot the package's directory
 * @param options.entries output name under dist/ to source entry, relative to packageRoot
 * @param options.extraShims output name under dist/ to the full text of a shim that is not one re-export
 * (webgpu-graph-algorithms' acquire)
 */
export function writeDeclarationShims({ packageRoot, entries, extraShims = {} }) {
    const distDir = path.resolve(packageRoot, "dist");
    const shims = {};
    for (const [name, source] of Object.entries(entries)) {
        const declaration = path.resolve(distDir, source.replace(/\.ts$/, ".d.ts"));
        if (!existsSync(declaration)) {
            throw new Error(`${path.relative(distDir, declaration)} not found under dist/. Run "npm run build" first.`);
        }
        const target = path.join(distDir, `${name}.d.ts`);
        const specifier = path
            .relative(path.dirname(target), path.resolve(distDir, source.replace(/\.ts$/, ".js")))
            .split(path.sep)
            .join("/");
        const relativeSpecifier = specifier.startsWith(".") ? specifier : "./" + specifier;
        shims[name] = `export * from "${relativeSpecifier}";\n`;
    }
    Object.assign(shims, extraShims);
    for (const [name, content] of Object.entries(shims)) {
        const target = path.join(distDir, `${name}.d.ts`);
        mkdirSync(path.dirname(target), { recursive: true });
        writeFileSync(target, content, "utf8");
    }
    console.log(`Successfully created dist/{${Object.keys(shims).join(",")}}.d.ts`);
}

/**
 * Builds the package's entries into dist/, then writes their declaration shims. Exits the process with
 * status 1 on any failure.
 * @param options the build
 * @param options.build vite's `build`, imported by the package's own script
 * @param options.packageRoot the package's directory
 * @param options.entries output name under dist/ to source entry, relative to packageRoot
 * @param options.extraShims see writeDeclarationShims
 */
export async function buildBundle({ build, packageRoot, entries, extraShims }) {
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

        writeDeclarationShims({ packageRoot, entries, extraShims });
    } catch (error) {
        console.error("Error building bundle:", error);
        process.exit(1);
    }
}
