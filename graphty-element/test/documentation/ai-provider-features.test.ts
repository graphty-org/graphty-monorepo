/**
 * @file `docs/guide/ai-provider-features.md` is generated from the catalog's provider-by-tool table
 * (`scripts/generate-ai-feature-matrix.mjs`); this test fails while the committed page differs from
 * what the source table renders, so a table change cannot ship without its page.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { renderAiFeatureMatrix } from "../../scripts/generate-ai-feature-matrix.mjs";
import { AI_HOSTED_TOOL_CAPABILITIES, AI_HOSTED_TOOL_IDS, AI_PROVIDER_DESCRIPTORS } from "../../src/catalog/ai";

const PAGE = join(__dirname, "../../docs/guide/ai-provider-features.md");

describe("the AI provider features page", () => {
    it("is what the catalog's table renders (regenerate with scripts/generate-ai-feature-matrix.mjs)", () => {
        const rendered = renderAiFeatureMatrix(
            AI_HOSTED_TOOL_CAPABILITIES,
            AI_PROVIDER_DESCRIPTORS,
            AI_HOSTED_TOOL_IDS,
        );
        assert.strictEqual(readFileSync(PAGE, "utf8"), rendered);
    });

    it("shows every provider's status of every tool", () => {
        const page = readFileSync(PAGE, "utf8");
        for (const provider of AI_PROVIDER_DESCRIPTORS) {
            const row = page.split("\n").find((line) => line.startsWith(`| ${provider.plainName} (`));
            assert.exists(row, `no row for ${provider.id}`);
            const cells = (row ?? "")
                .split("|")
                .slice(2, -1)
                .map((cell) => cell.trim());
            assert.deepStrictEqual(
                cells,
                AI_HOSTED_TOOL_IDS.map((tool) => `\`${AI_HOSTED_TOOL_CAPABILITIES[provider.id][tool]}\``),
            );
        }
    });

    it("differs from the committed page when one catalog entry changes", () => {
        const changed = {
            ...AI_HOSTED_TOOL_CAPABILITIES,
            openai: { ...AI_HOSTED_TOOL_CAPABILITIES.openai, "web-fetch": "available" as const },
        };
        const rendered = renderAiFeatureMatrix(changed, AI_PROVIDER_DESCRIPTORS, AI_HOSTED_TOOL_IDS);
        assert.notStrictEqual(readFileSync(PAGE, "utf8"), rendered);
    });
});
