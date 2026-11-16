import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import type { Plugin } from "vite";

const root = resolve(__dirname, "..");

/**
 * Packages the plugin leaves on their build. graphty-element and compact-mantine are aliased to
 * source already (vite.aliases.ts). babylonjs-models' decoders find their wasm files next to
 * dist/, where only its build copies them.
 */
const keepBuilt = new Set([
    "@graphty/graphty",
    "@graphty/graphty-element",
    "@graphty/compact-mantine",
    "babylonjs-models",
]);

type ExportTarget = string | { import?: unknown; default?: unknown } | null;

interface WorkspacePackage {
    dir: string;
    exports: Record<string, ExportTarget>;
    /** A bundled package's scripts/entries.js: output name under dist/ to its source entry. */
    entries?: Record<string, string>;
}

/**
 * The workspace's packages by name, read from each top-level folder's package.json.
 * @returns name to folder and exports map.
 */
async function workspacePackages(): Promise<Map<string, WorkspacePackage>> {
    const found = new Map<string, WorkspacePackage>();
    for (const entry of readdirSync(root, { withFileTypes: true })) {
        const file = resolve(root, entry.name, "package.json");
        if (!entry.isDirectory() || !existsSync(file)) {
            continue;
        }
        const pkg = JSON.parse(readFileSync(file, "utf8")) as { name?: string; exports?: unknown };
        if (pkg.name && !keepBuilt.has(pkg.name) && pkg.exports && typeof pkg.exports === "object") {
            const dir = resolve(root, entry.name);
            const entriesFile = resolve(dir, "scripts/entries.js");
            const entries = existsSync(entriesFile)
                ? ((await import(pathToFileURL(entriesFile).href)) as { ENTRIES: Record<string, string> }).ENTRIES
                : undefined;
            found.set(pkg.name, { dir, exports: pkg.exports as Record<string, ExportTarget>, entries });
        }
    }
    return found;
}

/**
 * What a subpath fills an exports key's `*` with.
 * @param key - an exports key, such as "./datasets/*".
 * @param subpath - "." or "./name".
 * @returns the text the `*` stands for ("" for an exact key), or undefined when it does not match.
 */
function keyMatch(key: string, subpath: string): string | undefined {
    const star = key.indexOf("*");
    if (star < 0) {
        return key === subpath ? "" : undefined;
    }
    const [head, tail] = [key.slice(0, star), key.slice(star + 1)];
    if (!subpath.startsWith(head) || !subpath.endsWith(tail)) {
        return undefined;
    }
    return subpath.slice(head.length, subpath.length - tail.length);
}

/**
 * The built file an export entry names, with a `*` subpath filled in.
 * @param exports - the package's exports map.
 * @param subpath - "." or "./name".
 * @returns the dist path relative to the package, or undefined.
 */
function builtFile(exports: Record<string, ExportTarget>, subpath: string): string | undefined {
    for (const [key, value] of Object.entries(exports)) {
        const match = keyMatch(key, subpath);
        if (match === undefined) {
            continue;
        }
        const target = typeof value === "string" ? value : (value?.import ?? value?.default);
        return typeof target === "string" ? target.replace("*", match) : undefined;
    }
    return undefined;
}

/**
 * The TypeScript source a built file is compiled from: a bundled package's entries file names
 * it; otherwise `dist/x.js` comes from `x.ts` or `src/x.ts`, and a root entry may be
 * `src/index.ts`.
 * @param pkg - the package.
 * @param subpath - "." or "./name".
 * @returns the absolute source path, or undefined when there is none.
 */
export function sourceFile(pkg: WorkspacePackage, subpath: string): string | undefined {
    const built = builtFile(pkg.exports, subpath);
    if (!built?.startsWith("./dist/") || !built.endsWith(".js")) {
        return undefined;
    }
    const rel = built.slice("./dist/".length, -".js".length);
    const candidates = [
        ...(pkg.entries?.[rel] ? [pkg.entries[rel]] : []),
        `${rel}.ts`,
        `src/${rel}.ts`,
        ...(subpath === "." ? ["src/index.ts"] : []),
    ];
    return candidates.map((c) => resolve(pkg.dir, c)).find((c) => existsSync(c));
}

/**
 * Dev server only: reads the workspace packages (graph-format, graph-io, algorithms, layout,
 * graph-samples, webgpu-graph-algorithms, remote-logger, babylonjs-map) from their TypeScript
 * source instead of their dist, as vite.aliases.ts already does for graphty-element and
 * compact-mantine.
 *
 * Served from dist, a dev server failed every page load while any of those packages was being
 * rebuilt (each build deletes its dist first), and one started before the packages were built
 * failed every load until restarted, because Vite keeps a failed package resolution (#6223).
 * Builds, tests and `vite preview` still use the packages' builds.
 * @returns the Vite plugin.
 */
export function workspaceSourcePlugin(): Plugin {
    let packages: Map<string, WorkspacePackage> | undefined;
    return {
        name: "graphty:workspace-source",
        apply: (_config, env) => env.command === "serve" && !process.env.VITEST,
        enforce: "pre",
        async resolveId(id) {
            const parts = id.split("/");
            const nameLength = id.startsWith("@") ? 2 : 1;
            packages ??= await workspacePackages();
            const pkg = packages.get(parts.slice(0, nameLength).join("/"));
            if (!pkg) {
                return null;
            }
            const rest = parts.slice(nameLength).join("/");
            return sourceFile(pkg, rest ? `./${rest}` : ".") ?? null;
        },
    };
}
