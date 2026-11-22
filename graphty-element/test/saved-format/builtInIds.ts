/**
 * @file Every fixed list of built-in ids a source module declares through
 * `builtInIdsForTesting()`, for the saved-name scan and the catalog census
 * (design/architecture/self-contained-save-files.md, sections 2.2 and 2.3). Found by reading the
 * source, so a new module that exports one is scanned and counted without being listed here.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

/** One kind of built-in id. */
export interface BuiltInIds {
    readonly kind: string;
    readonly ids: readonly string[];
    /** The module that declares it, relative to the package. */
    readonly module: string;
}

const PACKAGE = fileURLToPath(new URL("../../", import.meta.url));

/**
 * Every built-in id list a module under `src/` exports.
 * @returns The lists.
 */
export async function builtInModuleIds(): Promise<BuiltInIds[]> {
    const found: BuiltInIds[] = [];
    const files = readdirSync(join(PACKAGE, "src"), { recursive: true, encoding: "utf8" })
        .filter((file) => file.endsWith(".ts"))
        .sort((a, b) => a.localeCompare(b));
    for (const file of files) {
        const path = join(PACKAGE, "src", file);
        if (!readFileSync(path, "utf8").includes("export function builtInIdsForTesting(")) {
            continue;
        }

        const loaded = (await import(/* @vite-ignore */ path)) as {
            builtInIdsForTesting: () => BuiltInIds | readonly BuiltInIds[];
        };
        const lists = [loaded.builtInIdsForTesting()].flat();
        found.push(...lists.map(({ kind, ids }) => ({ kind, ids, module: relative(PACKAGE, path) })));
    }

    return found;
}
