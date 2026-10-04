// Tests of the public API report: which entry points get a report (tools/api-report.mjs), and that a
// changed export fails the check until the report is regenerated.
//
//   node --test tools/api-report.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import { apiReport, entryPoints } from "./api-report.mjs";

describe("entryPoints", () => {
    it("names each typed export, the root as index", () => {
        assert.deepEqual(
            entryPoints({
                ".": { types: "./dist/index.d.ts", import: "./dist/x.js" },
                "./session": { types: "./dist/session.d.ts", import: "./dist/session.js" },
                "./a/b": { types: "./dist/ab.d.ts" },
            }),
            [
                ["index", "./dist/index.d.ts"],
                ["session", "./dist/session.d.ts"],
                ["a-b", "./dist/ab.d.ts"],
            ],
        );
    });

    it("skips exports without types (a bundle, a JSON file)", () => {
        assert.deepEqual(entryPoints({ "./bundle": "./dist/b.js", "./x.json": "./dist/x.json" }), []);
    });

    it("reads a single root export", () => {
        assert.deepEqual(entryPoints({ types: "./i.d.ts", import: "./i.js" }), [["index", "./i.d.ts"]]);
    });
});

describe("apiReport", () => {
    const dir = mkdtempSync(join(tmpdir(), "api-report-test-"));
    after(() => rmSync(dir, { recursive: true, force: true }));
    const write = (exports, dts) => {
        writeFileSync(join(dir, "package.json"), JSON.stringify({ name: "fixture", version: "1.0.0", exports }));
        writeFileSync(join(dir, "index.d.ts"), dts);
    };

    it("writes one report per entry point, then the check passes", () => {
        write({ ".": { types: "./index.d.ts" } }, "export declare function size(): number;\n");
        assert.deepEqual(apiReport(dir, false), []);
        assert.deepEqual(readdirSync(join(dir, "api")), ["index.api.md"]);
        assert.match(readFileSync(join(dir, "api", "index.api.md"), "utf8"), /function size\(\): number/);
        assert.deepEqual(apiReport(dir, true), []);
    });

    it("fails the check when an exported type changes, and passes once regenerated", () => {
        write({ ".": { types: "./index.d.ts" } }, "export declare function size(): string;\n");
        assert.deepEqual(apiReport(dir, true), ["index: differs from api/index.api.md"]);
        apiReport(dir, false);
        assert.deepEqual(apiReport(dir, true), []);
    });

    it("fails the check on a report whose entry point is gone, and regenerating removes it", () => {
        writeFileSync(join(dir, "api", "old.api.md"), "x");
        assert.deepEqual(apiReport(dir, true), [
            'api/old.api.md is not an entry point of package.json "exports" any more',
        ]);
        apiReport(dir, false);
        assert.deepEqual(readdirSync(join(dir, "api")), ["index.api.md"]);
    });
});
