// The storybook-docs allowlist only shrinks: every entry must name a story file that exists and a
// check that story still fails. A fixed story's entry, or a moved file's, would otherwise stay and
// let the same mistake back in unnoticed.
//
//   node tools/eslint-rules/storybook-docs-allowlist.test.mjs
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { Linter } from "eslint";
import tseslint from "typescript-eslint";

process.env.STORYBOOK_DOCS_ALLOWLIST = "off";
const { default: rule } = await import("./storybook-docs.mjs");

const ROOT = fileURLToPath(new URL("../../", import.meta.url));
const { files } = JSON.parse(readFileSync(new URL("./storybook-docs-allowlist.json", import.meta.url), "utf8"));

/**
 * What the rule reports for one file with no allowlist, as "export check" pairs.
 * @param file - the file, relative to the repository root
 * @returns the violations
 */
export function violations(file) {
    const linter = new Linter({ configType: "flat" });
    const messages = linter.verify(
        readFileSync(join(ROOT, file), "utf8"),
        [
            {
                files: ["**/*.{ts,tsx,js,jsx,mjs}"],
                languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true } } },
                plugins: { local: { rules: { "storybook-docs": rule } } },
                rules: { "local/storybook-docs": "error" },
            },
        ],
        { filename: join(ROOT, file) },
    );
    // A parse error, or no configuration for the file, would otherwise read as "no violations".
    const broken = messages.find((m) => m.ruleId !== "local/storybook-docs");
    if (broken) throw new Error(`${file}: ${broken.message}`);
    return new Set(messages.map((m) => `${m.message.slice(0, m.message.indexOf(":"))} ${m.messageId}`));
}

describe("storybook-docs-allowlist.json", () => {
    it("names only story files that exist", () => {
        assert.deepEqual(
            Object.keys(files).filter((f) => !existsSync(join(ROOT, f))),
            [],
            "These files are gone (moved or deleted); remove their entries. A moved file starts with no entries.",
        );
    });

    it("names only checks the story still fails", () => {
        const stale = [];
        for (const [file, exports] of Object.entries(files).filter(([f]) => existsSync(join(ROOT, f)))) {
            const found = violations(file);
            for (const [where, checks] of Object.entries(exports)) {
                stale.push(...checks.filter((c) => !found.has(`${where} ${c}`)).map((c) => `${file} ${where} ${c}`));
            }
        }
        assert.deepEqual(stale, [], "These stories pass these checks now; remove the entries from the allowlist.");
    });
});
