// Tests of the public API report: which entry points get a report (tools/api-report.mjs), that a
// changed export fails the check until the report is regenerated, and that a report adding a plain
// string to a result type fails.
//
//   node --test tools/api-report.test.mjs
import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, describe, it } from "node:test";

import {
    apiReport,
    entryPoints,
    PLAIN_STRING_ALLOWLIST,
    plainStringAdditions,
    plainStringProperties,
} from "./api-report.mjs";

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

describe("plainStringAdditions", () => {
    // a report as api-extractor writes it: a session, a type it returns, a named result type and a catalog descriptor
    const report = (extra = {}) => `## API Report File for "fixture"

\`\`\`ts

// @public
export interface GraphSession {
    find(text: string, options?: FindOptions): FindResult;
    readonly runs: RunsApi;
}

// @public
export interface FindOptions {
    text?: string;
}

// @public
export interface FindResult {
    readonly id: string;
    readonly total: number;${extra.find ?? ""}
}

// @public
export interface RunsApi {
    get(id: string): RunRecord;
}

// @public
export interface RunRecord {
    readonly runId: string;
    readonly state: RunState;${extra.run ?? ""}
}

// @public
export type RunState = "running" | "done";

// @public
export interface CostEstimate {
    readonly seconds: number;${extra.cost ?? ""}
}

// @public
export interface AlgorithmDescriptor {
    readonly plainName: string;${extra.descriptor ?? ""}
}

\`\`\`
`;
    const check = (head) => plainStringAdditions([report()], [report(head)]);

    it("fails a plain string added to a type named as a result", () => {
        const [message, ...rest] = check({ cost: "\n    readonly reason: string;" });
        assert.equal(rest.length, 0);
        assert.match(
            message,
            /^CostEstimate\.reason is a new plain string on a result type \(its name ends in Estimate\)/,
        );
        assert.match(message, /string-literal union of codes, or a CodedFact \{ code, params \}/);
    });

    it("fails a plain string added to a type a session method returns, through a sub-API", () => {
        assert.match(
            check({ run: "\n    readonly note?: string | undefined;" })[0],
            /^RunRecord\.note .*\(GraphSession returns it\)/,
        );
    });

    it("fails a plain string inside an object type a method returns", () => {
        const head = report().replace(
            "get(id: string): RunRecord;",
            "get(id: string): RunRecord;\n    stats(options?: {\n        readonly label?: string;\n    }): {\n        readonly why: string;\n    };",
        );
        assert.deepEqual(
            plainStringAdditions([report()], [head]).map((m) => m.split(" ")[0]),
            ["RunsApi.why"],
        );
    });

    it("passes a code union or a CodedFact", () => {
        assert.deepEqual(
            check({ cost: '\n    readonly reason: RunState;\n    readonly fact: CodedFact<"a" | "b">;' }),
            [],
        );
        assert.deepEqual(check({ cost: '\n    readonly kind: "exact" | "sampled";' }), []);
    });

    it("passes an allowlisted identifier or catalog name, and a catalog description", () => {
        assert.deepEqual(
            check({
                find: "\n    readonly nodeId: string;\n    readonly name: string;\n    readonly coalesceKey: string;",
                descriptor: "\n    readonly description: string;",
            }),
            [],
        );
    });

    it("passes a plain string that is not on a result type, or only in an input", () => {
        const head = report().replace("    text?: string;", "    text?: string;\n    scope?: string;");
        assert.deepEqual(plainStringAdditions([report()], [head]), []);
    });

    it("passes a plain string field that already exists, wherever the type is reachable from", () => {
        const existing = report({ run: "\n    readonly summary: string;" });
        assert.deepEqual(plainStringAdditions([existing], [existing]), []);
        assert.deepEqual(plainStringAdditions([existing], [existing, existing]), []);
    });

    it("fails a field that changes from a code union to a plain string", () => {
        const before = report({ cost: "\n    readonly reason: RunState;" });
        const after = report({ cost: "\n    readonly reason: string;" });
        assert.deepEqual(
            plainStringAdditions([before], [after]).map((m) => m.split(" ")[0]),
            ["CostEstimate.reason"],
        );
    });
});

describe("PLAIN_STRING_ALLOWLIST", () => {
    it("holds identifiers and catalog names, never reader-facing words", () => {
        for (const name of ["id", "nodeId", "key", "plainName", "name"])
            assert.ok(PLAIN_STRING_ALLOWLIST.has(name), name);
        for (const name of ["reason", "message", "summary", "status", "kind", "note", "label"]) {
            assert.ok(!PLAIN_STRING_ALLOWLIST.has(name), name);
        }
    });
});

describe("the committed graphty-element reports", () => {
    it("add no plain string to a result type compared with themselves", () => {
        const dir = join(import.meta.dirname, "..", "graphty-element", "api");
        const texts = readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8"));
        assert.deepEqual(plainStringAdditions(texts, texts), []);
        assert.ok(plainStringProperties(texts.join("\n"), true).size > 0, "the parser finds the existing fields");
    });
});
