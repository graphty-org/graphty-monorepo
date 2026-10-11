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
    FRAMEWORK_PACKAGES,
    frameworkImports,
    OPEN_OPTION_EXCEPTIONS,
    openOptionFieldAdditions,
    openOptionFields,
    optionReachable,
    parseReport,
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

describe("frameworkImports (no framework or provider type in a public entry point)", () => {
    const report = (imports) =>
        `## API Report File for "fixture"\n\n\`\`\`ts\n\n${imports}\nimport { z } from 'zod';\n`;

    it("fails a report that imports a framework or provider package, one message each", () => {
        const planted = [
            "import { chat } from '@tanstack/ai';",
            "import { ModelMessage } from 'ai';",
            "import { LanguageModel } from '@ai-sdk/openai';",
            "import OpenAI from 'openai';",
            "import { GoogleGenAI } from '@google/genai';",
            "import Anthropic from '@anthropic-ai/sdk';",
            "import { RunAgentInput } from '@ag-ui/core';",
            "import { MLCEngine } from '@mlc-ai/web-llm';",
        ];
        const messages = frameworkImports("api/ai.api.md", report(planted.join("\n")));
        assert.equal(messages.length, planted.length);
        assert.match(messages[0], /^api\/ai\.api\.md imports '@tanstack\/ai', an AI framework or provider package/);
    });

    it("passes the packages that are not frameworks, a name that only starts like one included", () => {
        const text = report(
            "import { LitElement } from 'lit';\nimport { aim } from 'aim';\nimport x from '@tanstackish/ai';",
        );
        assert.deepEqual(frameworkImports("api/index.api.md", text), []);
    });

    it("lists the design's packages: exact ai, openai, @google/genai and the five scopes", () => {
        for (const name of ["ai", "openai", "@google/genai"]) assert.ok(FRAMEWORK_PACKAGES.exact.includes(name), name);
        for (const scope of ["@tanstack/", "@ag-ui/", "@ai-sdk/", "@anthropic-ai/", "@mlc-ai/"]) {
            assert.ok(FRAMEWORK_PACKAGES.prefixes.includes(scope), scope);
        }
    });
});

describe("openOptionFieldAdditions (providers configured in graphty's terms)", () => {
    const report = (extra = {}) => `## API Report File for "fixture"

\`\`\`ts

// @public
export interface AiManagerConfig {
    apiKey?: string;
    keyPersistence?: KeyPersistenceConfig;
    providerInstance?: LlmProvider;${extra.config ?? ""}
}

// @public
export interface KeyPersistenceConfig {
    enabled: boolean;${extra.keys ?? ""}
}

// @public
export interface LlmProvider {
    configure(options: ProviderOptions): void;
}

// @public
export interface ProviderOptions {
    model?: string;${extra.provider ?? ""}
}

// @public
export interface Unrelated {
    anything: unknown;${extra.unrelated ?? ""}
}

\`\`\`
`;
    const check = (head) => openOptionFieldAdditions([report()], [report(head)]);

    it("fails each kind of open-ended member added to the configuration", () => {
        for (const [member, kind] of [
            ["providerOptions?: unknown;", "unknown"],
            ["raw: any;", "any"],
            ["extra?: object;", "object"],
            ["headers?: Record<string, unknown>;", "Record<string, unknown>"],
            ["readonly passthrough?: Readonly<Record<string, any>> | undefined;", "Readonly<Record<string, any>>"],
        ]) {
            const [message, ...rest] = check({ config: `\n    ${member}` });
            assert.equal(rest.length, 0, member);
            assert.match(
                message,
                new RegExp(
                    `^AiManagerConfig\\.\\w+ is a new open-ended member \\(${kind.replace(/[<>|()]/g, "\\$&")}\\)`,
                ),
            );
        }
    });

    it("fails an index signature, and a member of a type the configuration reaches", () => {
        assert.match(
            check({ provider: "\n    [key: string]: unknown;" })[0],
            /^ProviderOptions\.\[index\] is a new open-ended member/,
        );
        assert.match(check({ keys: "\n    store?: unknown;" })[0], /^KeyPersistenceConfig\.store /);
    });

    it("passes a named field, a member the base already had, and a type the configuration does not reach", () => {
        assert.deepEqual(check({ config: "\n    temperature?: number;" }), []);
        assert.deepEqual(check({ unrelated: "\n    more: unknown;" }), []);
        const before = report({ config: "\n    legacy?: unknown;" });
        assert.deepEqual(openOptionFieldAdditions([before], [before]), []);
    });

    it("reaches every type named in the configuration, through method parameters too", () => {
        const reached = optionReachable(parseReport(report()));
        assert.deepEqual([...reached].sort(), [
            "AiManagerConfig",
            "KeyPersistenceConfig",
            "LlmProvider",
            "ProviderOptions",
        ]);
        assert.equal(OPEN_OPTION_EXCEPTIONS.size, 0, "an exception names its reason; none is needed yet");
    });

    it("finds no open member the committed graphty-element reports do not already have", () => {
        const dir = join(import.meta.dirname, "..", "graphty-element", "api");
        const texts = readdirSync(dir).map((f) => readFileSync(join(dir, f), "utf8"));
        assert.deepEqual(openOptionFieldAdditions(texts, texts), []);
        assert.ok(
            openOptionFields(parseReport(texts.join("\n"))).size > 0,
            "the parser finds the existing open members",
        );
        assert.deepEqual(
            texts.flatMap((t) => frameworkImports("api", t)),
            [],
        );
    });
});
