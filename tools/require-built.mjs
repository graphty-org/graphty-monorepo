#!/usr/bin/env node
// `node ../tools/require-built.mjs <tsconfig>...`, run from a package before a compile that checks its published
// declarations (tsconfig.strict-consumer.json and the like). Fails, naming the build to run, when a package name
// that compile imports would resolve outside this checkout.
//
// Why: those configs map a package name onto dist/ with `paths`. When dist/ is missing TypeScript does not stop:
// it falls back to node_modules and walks up the directory tree, and a worktree under .worktrees/ sits inside the
// main checkout, so the walk ends in the main checkout's node_modules and its older build (#5296). The compile then
// passes or fails against code this checkout does not hold.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import ts from "typescript";

const ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));

/**
 * The names a compile under `configPath` may import by package name: its exact `paths` keys and the package's own exports.
 * @param configPath the tsconfig's absolute path
 * @param options its parsed compiler options
 * @returns the module names
 */
function importedNames(configPath, options) {
    const names = new Set(Object.keys(options.paths ?? {}).filter((key) => !key.includes("*")));
    const packageJson = path.join(path.dirname(configPath), "package.json");
    if (existsSync(packageJson)) {
        const { name, exports } = JSON.parse(readFileSync(packageJson, "utf8"));
        // Only entries that publish declarations: a bare file entry (a bundle, a manifest) is not compiled against.
        for (const [key, entry] of Object.entries(exports ?? { ".": { types: "" } })) {
            if (!key.includes("*") && typeof entry === "object" && "types" in entry) {
                names.add(name + key.slice(1));
            }
        }
    }
    return [...names];
}

/**
 * Every name the compile under `configPath` imports by package name that resolves outside `root`, or not at all.
 * @param configPath the tsconfig to check
 * @param root the checkout every resolution must stay inside
 * @returns each escaping name and where it resolved
 */
export function escapes(configPath, root = ROOT) {
    const file = path.resolve(configPath);
    const { config, error } = ts.readConfigFile(file, ts.sys.readFile);
    if (error) {
        throw new Error(ts.flattenDiagnosticMessageText(error.messageText, "\n"));
    }
    const { options } = ts.parseJsonConfigFileContent(config, ts.sys, path.dirname(file));
    const from = path.join(path.dirname(file), "index.ts");
    return importedNames(file, options)
        .map((name) => ({
            name,
            resolved: ts.resolveModuleName(name, from, options, ts.sys).resolvedModule?.resolvedFileName,
        }))
        .filter(({ resolved }) => resolved === undefined || path.relative(root, resolved).startsWith(".."));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    let failed = false;
    for (const config of process.argv.slice(2)) {
        const found = escapes(config);
        if (found.length > 0) {
            failed = true;
            const [{ name, resolved }] = found;
            console.error(
                `${config}: ${found.length} import(s) resolve outside this checkout (${ROOT}), ` +
                    `e.g. ${name} -> ${resolved ?? "nothing"}: ${found.map((e) => e.name).join(", ")}`,
            );
        }
    }
    if (failed) {
        console.error("Build these packages here first (npm run build in each), then run this check again.");
        process.exit(1);
    }
}
