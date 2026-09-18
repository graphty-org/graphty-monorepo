/**
 * Build Bundle Script
 *
 * Creates a single ES module bundle (dist/graph-format.js) that:
 * - Contains all the library code in a single file
 * - Is the entry point that package.json "exports" points at
 * - Can be distributed as a standalone file
 *
 * Run "npm run build" (tsc -p tsconfig.build.json) first so that dist/src/
 * exists; scripts/bundle-types.js then writes dist/graph-format.d.ts, which
 * re-exports the per-module declarations under dist/src/.
 */

import { spawnSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * The commit this bundle is built from, stamped into the wire `producer` string
 * (src/wire/to-wire.ts explains why it is the commit and not the npm version).
 *
 * Never throws and never fails the build: a build from a published tarball, or from a source
 * copy with no git, has no commit to report and gets "unknown". The dirty marker is scoped to
 * this package, so unrelated edits elsewhere in the monorepo do not flag the bundle.
 * @returns the short commit, optionally suffixed "-dirty", or "unknown"
 */
function buildCommit() {
    const pkgDir = path.resolve(__dirname, "..");
    const git = (args) => spawnSync("git", args, { cwd: pkgDir, encoding: "utf8" });

    const head = git(["rev-parse", "--short=12", "HEAD"]);
    if (head.error || head.status !== 0) {
        return "unknown";
    }

    const dirty = git(["status", "--porcelain", "--", pkgDir]);
    const isDirty = !dirty.error && dirty.status === 0 && dirty.stdout.trim() !== "";
    return head.stdout.trim() + (isDirty ? "-dirty" : "");
}

async function buildBundle() {
    try {
        await build({
            configFile: false,
            logLevel: "warn",
            define: {
                __GRAPH_FORMAT_COMMIT__: JSON.stringify(buildCommit()),
            },
            build: {
                lib: {
                    entry: path.resolve(__dirname, "../src/index.ts"),
                    name: "GraphFormat",
                    formats: ["es"],
                    fileName: () => "graph-format.js",
                },
                outDir: path.resolve(__dirname, "../dist"),
                emptyOutDir: false, // Keep the tsc output under dist/src/
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

        console.log("Successfully built dist/graph-format.js");

        const result = spawnSync(process.execPath, [path.resolve(__dirname, "bundle-types.js")], {
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

buildBundle();
