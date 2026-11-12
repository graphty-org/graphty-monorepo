/**
 * workspace.mjs -- the workspace's packages, and which package a shard, section or report name belongs to.
 * Only node built-ins: tools/restricted-cpu-stress.mjs imports it in a CI job that installs no dependencies.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * @typedef {{packages: string[], deps: Record<string, string[]>}} Workspace the workspace's package
 *   directories and each one's workspace dependencies
 */

/**
 * The workspace packages and their dependencies, read from `pnpm-workspace.yaml` and each
 * package's `package.json` (the edges nx's project graph is made from). Unreadable: none.
 * @param {string} root the checkout
 * @returns {Workspace} the packages
 */
export function readWorkspace(root) {
    /** @type {string[]} */
    const packages = [];
    try {
        let inList = false;
        for (const line of readFileSync(join(root, "pnpm-workspace.yaml"), "utf8").split("\n")) {
            if (line.startsWith("packages:")) inList = true;
            else if (inList && /^\s+-\s/.test(line))
                packages.push(line.replace(/^\s+-\s+/, "").replaceAll(/["']/g, ""));
            else if (inList && /^\S/.test(line)) inList = false;
        }
    } catch {
        return { packages: [], deps: {} };
    }
    /** @type {Record<string, string>} */
    const byName = {};
    /** @type {Record<string, string[]>} */
    const direct = {};
    for (const dir of packages) {
        try {
            const pkg = JSON.parse(readFileSync(join(root, dir, "package.json"), "utf8"));
            byName[pkg.name] = dir;
            direct[dir] = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies, ...pkg.peerDependencies });
        } catch {
            direct[dir] = [];
        }
    }
    /** @type {Record<string, string[]>} */
    const deps = {};
    for (const dir of packages) {
        const seen = new Set();
        const walk = (/** @type {string} */ d) => {
            for (const n of direct[d] ?? []) {
                const to = byName[n];
                if (to && to !== dir && !seen.has(to)) {
                    seen.add(to);
                    walk(to);
                }
            }
        };
        walk(dir);
        deps[dir] = [...seen].sort((a, b) => a.localeCompare(b));
    }
    return { packages, deps };
}

/**
 * The workspace package a name starts with (`graphty-element-browser-1` -> `graphty-element`). The
 * restricted-CPU stress run (tools/restricted-cpu-stress.mjs) names a JUnit report's package with it too.
 * @param {string | undefined} name a shard or section name
 * @param {string[]} packages the package directories
 * @returns {string | null} the longest match
 */
export function packageIn(name, packages) {
    if (!name) return null;
    const hits = packages.filter((p) => name === p || name.startsWith(`${p}-`));
    return hits.reduce((/** @type {string | null} */ best, p) => (best && best.length >= p.length ? best : p), null);
}
