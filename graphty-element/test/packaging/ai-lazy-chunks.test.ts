/**
 * What an entry point loads up front holds no AI framework or provider SDK: the assistant's
 * frameworks are loaded with `import()` on first use, one chunk per provider
 * (design/ai/tanstack-ai-harness-design.md, section 7, rule 6). Reads `build/chunks.json`, which
 * the library build writes (vite.config.ts, `chunkMeta`): build first.
 * @module test/packaging/ai-lazy-chunks.test
 */

import { existsSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

import { type FrameworkFamily, frameworkFamily, packageName } from "../../../tools/ai-framework-packages.mjs";

const PACKAGE_ROOT = fileURLToPath(new URL("../..", import.meta.url));
const META = resolve(PACKAGE_ROOT, "build/chunks.json");

/** One chunk of the library build, as build/chunks.json lists it. */
interface Chunk {
    fileName: string;
    isEntry: boolean;
    modules: string[];
    imports: string[];
    dynamicImports: string[];
}

/** The entry points whose static imports are walked: the element, the AI entry and every Node-safe one. */
const ENTRIES = [
    "graphty.js",
    "ai.js",
    "session.js",
    "schema.js",
    "catalog.js",
    "commands.js",
    "extend.js",
    "format.js",
    "logging.js",
    "react.js",
];

/**
 * Framework families a chunk an entry reaches may still import as an external package, by entry,
 * with the reason. The TanStack engine (milestone 2) loads every framework with import() and
 * empties this.
 */
const STATIC_EXTERNAL_ALLOWED: Readonly<Record<string, Partial<Record<FrameworkFamily, string>>>> = {
    "ai.js": {
        "ai-sdk": "VercelAiProvider imports the AI SDK 5 (an optional peer) until the TanStack engine replaces it",
    },
};

/** The provider each provider package serves: one chunk may hold one provider's code. */
const PROVIDER_OF: readonly [RegExp, string][] = [
    [/^(?:openai|@tanstack\/ai-openai|@ai-sdk\/openai)$/, "openai"],
    [/^(?:@anthropic-ai\/.+|@tanstack\/ai-anthropic|@ai-sdk\/anthropic)$/, "anthropic"],
    [/^(?:@google\/genai|@tanstack\/ai-gemini|@ai-sdk\/google)$/, "google"],
];

const BUILTINS = new Set(builtinModules);

/**
 * The package a bundled module came from.
 * @param id - The module id, relative to the package.
 * @returns The package, or undefined for graphty-element's own module.
 */
function moduleOwner(id: string): string | undefined {
    const at = id.lastIndexOf("node_modules/");
    return at === -1 ? undefined : packageName(id.slice(at + "node_modules/".length));
}

/**
 * Everything wrong with a build's chunks.
 * @param chunks - The chunks.
 * @returns One message per problem.
 */
function lazyChunkProblems(chunks: readonly Chunk[]): string[] {
    const byFile = new Map(chunks.map((c) => [c.fileName, c]));
    const problems: string[] = [];
    for (const entry of ENTRIES) {
        const reached = new Set<string>();
        const queue = byFile.has(entry) ? [entry] : [];
        for (let file = queue.pop(); file !== undefined; file = queue.pop()) {
            if (reached.has(file)) {
                continue;
            }
            reached.add(file);
            queue.push(...(byFile.get(file)?.imports ?? []).filter((i) => byFile.has(i)));
        }

        for (const file of reached) {
            const chunk = byFile.get(file) as Chunk;
            for (const owner of new Set(chunk.modules.map(moduleOwner))) {
                if (owner !== undefined && frameworkFamily(owner) !== undefined) {
                    problems.push(`${entry} loads ${file} up front, which holds ${owner}`);
                }
            }

            for (const spec of chunk.imports.filter((i) => !byFile.has(i))) {
                const family = frameworkFamily(spec);
                if (family !== undefined && STATIC_EXTERNAL_ALLOWED[entry]?.[family] === undefined) {
                    problems.push(`${entry} loads ${file} up front, which imports ${spec}`);
                }
            }
        }
    }

    for (const chunk of chunks) {
        const providers = new Set(
            chunk.modules.flatMap((id) => {
                const owner = moduleOwner(id);
                return PROVIDER_OF.flatMap(([re, provider]) =>
                    owner !== undefined && re.test(owner) ? [provider] : [],
                );
            }),
        );
        if (providers.size > 1) {
            problems.push(`${chunk.fileName} holds the code of several providers: ${[...providers].sort().join(", ")}`);
        }

        if (chunk.modules.some((id) => id.startsWith("src/ai/"))) {
            for (const spec of [...chunk.imports, ...chunk.dynamicImports]) {
                if (spec.startsWith("node:") || BUILTINS.has(spec)) {
                    problems.push(`${chunk.fileName} is an AI chunk and imports ${spec}, which no browser has`);
                }
            }
        }
    }

    return problems;
}

describe("AI chunks load lazily", () => {
    it("the build's chunks: no framework up front, one provider per chunk, no Node module in an AI chunk", () => {
        assert.ok(existsSync(META), `${META} is missing: run npm run build first`);
        const { chunks } = JSON.parse(readFileSync(META, "utf8")) as { chunks: Chunk[] };
        assert.ok(
            chunks.some((c) => c.fileName === "ai.js" && c.isEntry),
            "the metadata lists the ai entry",
        );
        assert.ok(
            chunks.some((c) => c.modules.some((id) => id.startsWith("src/ai/"))),
            "the metadata names modules, so the walk can see them",
        );
        assert.deepEqual(lazyChunkProblems(chunks), []);
    });

    it("refuses each planted violation", () => {
        const chunk = (fileName: string, over: Partial<Chunk>): Chunk => ({
            fileName,
            isEntry: false,
            modules: [],
            imports: [],
            dynamicImports: [],
            ...over,
        });
        const planted = [
            chunk("ai.js", { isEntry: true, modules: ["ai.ts"], imports: ["chunks/loop.js", "@tanstack/ai"] }),
            chunk("chunks/loop.js", {
                modules: [
                    "src/ai/runConversation.ts",
                    "../node_modules/.pnpm/x/node_modules/@tanstack/ai/dist/index.js",
                ],
                imports: ["node:fs"],
                dynamicImports: ["chunks/both.js"],
            }),
            chunk("chunks/both.js", {
                modules: [
                    "../node_modules/.pnpm/a/node_modules/@tanstack/ai-openai/dist/index.js",
                    "../node_modules/.pnpm/b/node_modules/@anthropic-ai/sdk/index.mjs",
                ],
            }),
            chunk("catalog.js", { isEntry: true, imports: ["ai"] }),
        ];
        assert.deepEqual(lazyChunkProblems(planted).sort(), [
            "ai.js loads ai.js up front, which imports @tanstack/ai",
            "ai.js loads chunks/loop.js up front, which holds @tanstack/ai",
            "catalog.js loads catalog.js up front, which imports ai",
            "chunks/both.js holds the code of several providers: anthropic, openai",
            "chunks/loop.js is an AI chunk and imports node:fs, which no browser has",
        ]);
    });
});
