/**
 * @file typedoc.json names only files that exist, and names the modules the published API pages document.
 *
 * TypeDoc only warns about an entry point that matches no file, so a moved or deleted module silently drops its pages
 * from the generated docs. This fails instead.
 */

import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, it } from "vitest";

const PKG = resolve(__dirname, "../..");
const config = JSON.parse(readFileSync(resolve(PKG, "typedoc.json"), "utf8")) as { entryPoints: string[] };

describe("typedoc.json", () => {
    it("every entry point exists", () => {
        const missing = config.entryPoints.filter((p) => !existsSync(resolve(PKG, p)));
        assert.deepStrictEqual(missing, []);
    });

    it("documents the layouts, the indexed namespace and the position helpers", () => {
        for (const p of ["./src/index.ts", "./src/indexed/index.ts", "./src/positions.ts"]) {
            assert.ok(config.entryPoints.includes(p), `${p} is not an entry point`);
        }
    });
});
