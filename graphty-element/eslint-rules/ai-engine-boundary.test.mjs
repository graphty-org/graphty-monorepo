// Tests of the AI engine boundary (ai-engine-boundary.mjs): each kind of violation is planted in
// the kind of file it is refused in and must be reported, what is allowed must pass, and the
// package's own ESLint config must carry the boundary unchanged.
//
//   node eslint-rules/ai-engine-boundary.test.mjs
import assert from "node:assert/strict";
import { join } from "node:path";
import { describe, it } from "node:test";

import { Linter } from "eslint";
import tseslint from "typescript-eslint";

import rootConfig from "../../eslint.config.js";
import packageConfig from "../eslint.config.js";
import { aiEngineBoundary } from "./ai-engine-boundary.mjs";

const PACKAGE = join(import.meta.dirname, "..");
const LAYERS = { selector: "Identifier[name='__layersGuard__']", message: "layers guard" };
const linter = new Linter({ cwd: PACKAGE });
const config = [
    { files: ["**/*.ts"], languageOptions: { parser: tseslint.parser, ecmaVersion: 2024, sourceType: "module" } },
    ...aiEngineBoundary(rootConfig, [LAYERS]),
];

/**
 * The boundary rules a file breaks.
 * @param file - the file, relative to graphty-element
 * @param code - its source
 * @returns the rule id of each message
 */
function broken(file, code) {
    const messages = linter.verify(code, config, { filename: join(PACKAGE, file) });
    const fatal = messages.filter((m) => m.fatal);
    assert.deepEqual(fatal, [], `${file} parses`);
    return messages.map((m) => m.ruleId);
}

describe("refused", () => {
    const cases = [
        ["a TanStack import outside the adapter", "src/ai/AiController.ts", 'import { chat } from "@tanstack/ai";'],
        ["the AI SDK", "src/ai/AiManager.ts", 'import { generateText } from "ai";'],
        [
            "the AI SDK in the provider that once ran on it",
            "src/ai/providers/VercelAiProvider.ts",
            'import { generateText } from "ai";',
        ],
        ["the AI SDK beside WebLLM", "src/ai/providers/WebLlmProvider.ts", 'import { asSchema } from "ai";'],
        ["the AI SDK mocked in a test", "test/ai/providers/VercelAiProvider.test.ts", 'vi.mock("ai");'],
        ["an AI SDK subpath", "src/Graph.ts", 'import { x } from "ai/rsc";'],
        ["a vendor SDK by import()", "src/ai/runConversation.ts", 'const m = await import("openai");'],
        ["a vendor SDK type", "src/ai/engine/types.ts", 'type T = import("@google/genai").GoogleGenAI;'],
        ["a vendor SDK mocked in a test", "test/ai/x.test.ts", 'vi.mock("@anthropic-ai/sdk", () => ({}));'],
        ["a framework doMocked in a test", "test/ai/x.test.ts", 'vi.doMock("@ai-sdk/openai");'],
        ["AG-UI types", "test/ai/x.test.ts", 'import type { RunAgentInput } from "@ag-ui/core";'],
        ["WebLLM outside its provider", "src/ai/AiManager.ts", 'await import("@mlc-ai/web-llm");'],
        ["a computed import() under src/ai", "src/ai/AiManager.ts", 'const name = "x"; await import(name);'],
        ["the adapter outside load.ts", "src/ai/AiManager.ts", 'import { x } from "./engine/tanstack/index.js";'],
        [
            "the adapter by import() outside load.ts",
            "src/ai/engine/LlmProviderEngine.ts",
            'await import("./tanstack/index.js");',
        ],
        [
            "a TanStack helper that is not on the list",
            "src/ai/engine/tanstack/openai.ts",
            'import { createChatOptions } from "@tanstack/ai";',
        ],
        ["a TanStack agent", "src/ai/engine/tanstack/openai.ts", 'import { defineAgent } from "@tanstack/ai";'],
        [
            "a TanStack namespace import",
            "src/ai/engine/tanstack/openai.ts",
            'import * as tanstack from "@tanstack/ai";',
        ],
        [
            "another TanStack package",
            "src/ai/engine/tanstack/openai.ts",
            'import { x } from "@tanstack/ai-persistence";',
        ],
        ["the AI SDK in the adapter", "src/ai/engine/tanstack/openai.ts", 'import { generateText } from "ai";'],
        ["a vendor SDK outside the adapter", "src/ai/providers/VercelAiProvider.ts", 'import OpenAI from "openai";'],
        ["a zod subpath (the root's rule, kept)", "src/ai/engine/types.ts", 'import { z } from "zod/v4";'],
        ["the package's own restricted syntax (kept)", "src/ai/AiController.ts", "__layersGuard__;"],
    ];
    for (const [what, file, code] of cases) {
        it(`${what}: ${file}`, () => {
            assert.ok(broken(file, code).length > 0, `${code} passed in ${file}`);
        });
    }
});

describe("allowed", () => {
    const cases = [
        [
            "load.ts loading the adapter",
            "src/ai/engine/load.ts",
            'const adapter = await import("./tanstack/index.js");',
        ],
        [
            "the adapter's named TanStack imports and a vendor SDK",
            "src/ai/engine/tanstack/openai.ts",
            [
                'import { chat, EventType, generateSpeech, generateTranscription, type ModelMessage, type StreamChunk } from "@tanstack/ai";',
                'import { createOpenaiChat, type OpenAITextConfig } from "@tanstack/ai-openai";',
                'import OpenAI from "openai";',
                'import { other } from "./mapping.js";',
            ].join("\n"),
        ],
        [
            "the adapter's tests",
            "test/ai/engine/tanstack/openai.test.ts",
            'import { chat } from "@tanstack/ai"; vi.mock("openai");',
        ],
        ["WebLLM in WebLlmProvider", "src/ai/providers/WebLlmProvider.ts", 'await import("@mlc-ai/web-llm");'],
        [
            "WebLLM mocked in its test",
            "test/ai/providers/loadWebLlmProvider.test.ts",
            'vi.mock("@mlc-ai/web-llm", () => ({}));',
        ],
        [
            "a package that only starts like a framework",
            "src/ai/AiManager.ts",
            'import x from "aim"; import y from "openai-like";',
        ],
        ["a computed import() outside src/ai", "test/helpers/x.ts", "const name = 'x'; await import(name);"],
    ];
    for (const [what, file, code] of cases) {
        it(`${what}: ${file}`, () => {
            assert.deepEqual(broken(file, code), [], code);
        });
    }
});

describe("the package config", () => {
    it("carries every boundary block, after the root config, with the layers guard in each", () => {
        const expected = aiEngineBoundary(rootConfig, []);
        for (const block of expected) {
            const found = packageConfig.find((b) => b.name === block.name);
            assert.ok(found, `${block.name} is in eslint.config.js`);
            assert.deepEqual(found.files, block.files);
            assert.deepEqual(found.rules["no-restricted-imports"], block.rules["no-restricted-imports"]);
            const syntax = found.rules["no-restricted-syntax"];
            assert.ok(
                syntax.some((s) => s.message?.startsWith("Do not mutate layers directly")),
                block.name,
            );
            assert.ok(packageConfig.indexOf(found) > packageConfig.indexOf(rootConfig.at(-1)), "after the root config");
        }
    });
});
