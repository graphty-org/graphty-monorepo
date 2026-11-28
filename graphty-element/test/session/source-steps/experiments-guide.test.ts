/**
 * @file The experiment guide's `source-steps` section names the reads every staged-source UI needs,
 * so a third party finds them without reading the source.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { assert, describe, it } from "vitest";

const GUIDE = fileURLToPath(new URL("../../../docs/guide/experiments.md", import.meta.url));

/**
 * The guide's `source-steps` section, up to the next experiment's heading.
 * @returns Its text.
 */
function section(): string {
    const text = readFileSync(GUIDE, "utf8");
    const start = text.indexOf("### `source-steps`");
    assert.isAtLeast(start, 0, "the guide has a source-steps section");
    const end = text.indexOf("\n### ", start + 1);
    return text.slice(start, end === -1 ? undefined : end);
}

describe("experiments guide: source-steps", () => {
    it("names each public member a staged-source UI reads", () => {
        const text = section();
        for (const member of [
            "data.staged()",
            "staged: true",
            "data.nodeRef(",
            "ownedBy",
            "data.sourceTable(",
            "data.setMapping(",
            "sameName",
            "draft.link(",
            "draft.extract(",
            "draft.columns(",
            "draft.sideFields(",
            "draft.joinRows(",
            "draft.joinOutcomes(",
        ]) {
            assert.include(text, member, member);
        }
    });
});
