/**
 * The catalog's hosted tool table (`aiHostedToolStatus`, in `./catalog`, which may not import
 * TanStack) against each TanStack adapter's own model facts: a model the catalog says can use a
 * web tool must list that tool in its `supports.tools`. The facts are not exported at run time, so
 * the test reads each adapter's `model-meta.js` (plain data, no imports) in a VM context.
 * @module test/ai/engine/tanstack/capabilities.test
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { runInNewContext } from "node:vm";

import { assert, describe, it } from "vitest";

import { aiHostedToolStatus, type AiProviderId } from "../../../../src/catalog/ai";

/** One model, as an adapter's model-meta describes it. */
interface ModelMeta {
    readonly name: string;
    readonly supports?: { readonly tools?: readonly string[] };
}

/** Each provider: its adapter package, its chat model list, and TanStack's name of each web tool. */
const PROVIDERS = [
    {
        provider: "openai",
        pkg: "@tanstack/ai-openai",
        list: "OPENAI_CHAT_MODELS",
        tools: { "web-search": "web_search" },
    },
    {
        provider: "anthropic",
        pkg: "@tanstack/ai-anthropic",
        list: "ANTHROPIC_MODELS",
        tools: { "web-search": "web_search", "web-fetch": "web_fetch" },
    },
    {
        provider: "google",
        pkg: "@tanstack/ai-gemini",
        list: "GEMINI_MODELS",
        tools: { "web-search": "google_search", "web-fetch": "url_context" },
    },
] as const;

/**
 * An adapter's chat models with their facts.
 * @param pkg - The adapter package.
 * @param list - The name of its chat model list.
 * @returns Each chat model's facts.
 */
function chatModels(pkg: string, list: string): ModelMeta[] {
    const file = join(dirname(fileURLToPath(import.meta.resolve(pkg))), "model-meta.js");
    const source = readFileSync(file, "utf8").replace(/^export \{[^}]*\};?\s*$/m, "");
    const names = [...source.matchAll(/^var (\w+) = \{$/gm)].map((match) => match[1]);
    const { models, chat } = runInNewContext(`${source}\n({ models: [${names.join(", ")}], chat: ${list} });`) as {
        models: ModelMeta[];
        chat: string[];
    };
    return models.filter((model) => typeof model.name === "string" && chat.includes(model.name));
}

describe.each(PROVIDERS)("$provider: the catalog's web tools against TanStack's model facts", (entry) => {
    const models = chatModels(entry.pkg, entry.list);

    it("reads the adapter's chat models", () => {
        assert.isAbove(models.length, 3);
    });

    it("says available only for a model whose supports.tools lists the tool", () => {
        const wrong = models.flatMap((model) =>
            Object.entries(entry.tools).flatMap(([tool, name]) =>
                aiHostedToolStatus(entry.provider as AiProviderId, model.name, tool as "web-search") === "available" &&
                !(model.supports?.tools ?? []).includes(name)
                    ? [`${model.name} ${tool}`]
                    : [],
            ),
        );
        assert.deepEqual(wrong, []);
    });
});

it("is not vacuous: some chat model lacks web search, and the catalog says so", () => {
    const lacking = chatModels("@tanstack/ai-openai", "OPENAI_CHAT_MODELS").filter(
        (model) => !(model.supports?.tools ?? []).includes("web_search"),
    );
    assert.isNotEmpty(lacking);
    for (const model of lacking) {
        assert.strictEqual(aiHostedToolStatus("openai", model.name, "web-search"), "unsupported", model.name);
    }
});
