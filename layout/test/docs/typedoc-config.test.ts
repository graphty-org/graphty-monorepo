/**
 * @file typedoc.json names only files that exist, and names the modules the published API pages document.
 *
 * TypeDoc only warns about an entry point that matches no file, so a moved or deleted module silently drops its pages
 * from the generated docs. This fails instead.
 */

import assert from "node:assert";
import { execFile } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

import { describe, it } from "vitest";

const PKG = resolve(__dirname, "../..");
const CONVERTER = resolve(__dirname, "convert-typedoc.mjs");
const execFileAsync = promisify(execFile);
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

    it("converts the API with no TypeDoc warnings", async () => {
        // An exported signature that names an unexported type, a broken {@link} or a stale entry point only warns,
        // and the warning is lost in the docs build log. Converting (no rendering) is enough to raise all of them.
        // In a child process, which coverage does not instrument (see convert-typedoc.mjs).
        const { stdout } = await execFileAsync(process.execPath, [CONVERTER, PKG]);
        const result = JSON.parse(stdout) as {
            converted: boolean;
            warningCount: number;
            errorCount: number;
            messages: string[];
        };
        const log = result.messages.join("\n");
        assert.ok(result.converted, `TypeDoc failed to convert the project:\n${log}`);
        assert.strictEqual(result.warningCount, 0, `TypeDoc warnings:\n${log}`);
        assert.strictEqual(result.errorCount, 0, `TypeDoc errors:\n${log}`);
    });
});
