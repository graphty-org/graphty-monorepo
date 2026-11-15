/**
 * `babylonjs-models/files` and `babylonjs-models/detect` must load without Babylon.js or the DOM:
 * everything under src/files/ and src/detect/ imports only its own folders' files and fflate.
 */

import { readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";

import { assert, describe, it } from "vitest";

const SRC = join(import.meta.dirname, "../src");

/**
 * Every .ts file below a folder.
 * @param dir - The folder.
 * @returns Their paths.
 */
function filesIn(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? filesIn(join(dir, entry.name)) : [join(dir, entry.name)],
    );
}

describe.each(["files", "detect"])("src/%s", (folder) => {
    it("imports nothing from Babylon.js or the Babylon half of the package", () => {
        for (const file of filesIn(join(SRC, folder))) {
            const source = readFileSync(file, "utf8");
            const specifiers = [...source.matchAll(/(?:\bfrom\s+|\bimport\s*\(\s*)["']([^"']+)["']/g)].map((m) => m[1]);
            for (const specifier of specifiers) {
                const inside =
                    specifier.startsWith(".") && /^(?:files|detect)\//.test(relative(SRC, join(file, "..", specifier)));
                assert.isTrue(inside || specifier === "fflate", `${relative(SRC, file)} imports ${specifier}`);
            }
        }
    });
});
