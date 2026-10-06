/**
 * The workspace packages and the source files the repository checkers walk, read one way.
 *
 * `workspaceDirs` reads the package directories from the `packages:` block of
 * pnpm-workspace.yaml, and only that block, so a list item elsewhere in the file (a future
 * `onlyBuiltDependencies:` entry, say) is never taken for a package. `sourceFiles` lists the
 * JavaScript and TypeScript sources under a directory, skipping declaration files.
 *
 * Run with --self-test to check both against a scratch workspace.
 */

import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";

import { scratchWorkspace } from "./scratch-workspace.mjs";

/** .js .jsx .ts .tsx and their .c / .m variants. */
const SOURCE_FILE = /\.[cm]?[jt]sx?$/;

/**
 * The package directories pnpm-workspace.yaml lists, in file order.
 * @param rootDir - the workspace root (holds pnpm-workspace.yaml)
 * @returns the directories, relative to rootDir, e.g. ["graph-format", "graph-io"]
 */
export function workspaceDirs(rootDir) {
    const yaml = readFileSync(join(rootDir, "pnpm-workspace.yaml"), "utf8");
    const packagesBlock = yaml.split(/^packages:\s*$/m)[1]?.split(/^\S/m)[0] ?? "";
    return [...packagesBlock.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?/gm)].map((m) => m[1]);
}

/**
 * Every JavaScript or TypeScript source file under a directory, recursively, skipping
 * declaration files (.d.ts and its variants).
 * @param dir - the directory; one that does not exist has no files
 * @returns absolute paths
 */
export function sourceFiles(dir) {
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && SOURCE_FILE.test(e.name) && !/\.d\.[cm]?ts$/.test(e.name))
        .map((e) => join(e.parentPath, e.name));
}

/** Checks both helpers against a scratch workspace. */
function selfTest() {
    const { dir, write } = scratchWorkspace("workspace-files-");
    try {
        write(
            "pnpm-workspace.yaml",
            'packages:\n    - "graph-format"\n    - layout\n\ncatalog:\n    vitest: 4.1.11\nonlyBuiltDependencies:\n    - esbuild\n',
        );
        assert.deepEqual(workspaceDirs(dir), ["graph-format", "layout"]);

        for (const file of ["a.ts", "b.tsx", "c.js", "d.jsx", "e.mjs", "f.cjs", "g.mts", "sub/h.ts"]) {
            write(`src/${file}`, "");
        }
        for (const file of ["types.d.ts", "types.d.mts", "readme.md", "data.json"]) {
            write(`src/${file}`, "");
        }
        const found = sourceFiles(join(dir, "src"))
            .map((f) => relative(join(dir, "src"), f).split(sep).join("/"))
            .sort();
        assert.deepEqual(found, ["a.ts", "b.tsx", "c.js", "d.jsx", "e.mjs", "f.cjs", "g.mts", "sub/h.ts"]);
        assert.deepEqual(sourceFiles(join(dir, "missing")), []);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
    console.log("workspace-files self-test: ok");
}

if (process.argv[1] === fileURLToPath(import.meta.url) && process.argv.includes("--self-test")) {
    selfTest();
}
