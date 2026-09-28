/**
 * @file typedoc.json names only files that exist, and names the modules the published API pages document.
 *
 * TypeDoc only warns about an entry point that matches no file, so a moved or deleted module silently drops its pages
 * from the generated docs. This fails instead.
 */

import assert from "node:assert";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { Application, LogLevel } from "typedoc";
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

    it("converts the API with no TypeDoc warnings", async () => {
        // An exported signature that names an unexported type, a broken {@link} or a stale entry point only warns,
        // and the warning is lost in the docs build log. Converting (no rendering) is enough to raise all of them.
        const app = await Application.bootstrapWithPlugins({
            options: resolve(PKG, "typedoc.json"),
            tsconfig: resolve(PKG, "tsconfig.json"),
            entryPoints: config.entryPoints.map((p) => resolve(PKG, p)),
            logLevel: LogLevel.Warn,
        });
        const project = await app.convert();
        assert.ok(project, "TypeDoc failed to convert the project");
        app.validate(project);
        assert.strictEqual(app.logger.warningCount, 0, "TypeDoc warnings: see the log above");
        assert.strictEqual(app.logger.errorCount, 0, "TypeDoc errors: see the log above");
    }, 120_000);
});
