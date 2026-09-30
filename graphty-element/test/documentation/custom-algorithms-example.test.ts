/**
 * @file The custom-algorithms guide's main example is the code the browser suite runs.
 *
 * `test/browser/extensions/guide-example/tie-strength.ts` is registered and run on a multigraph by
 * `test/browser/extensions/algorithm-extension.test.ts`. This test holds the guide's code block to
 * that file, character for character, with the one difference a reader's copy has: it imports
 * `@graphty/graphty-element/extend` rather than the entry point's source file.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

const PACKAGE = join(__dirname, "../..");
const GUIDE = join(PACKAGE, "docs/guide/extending/custom-algorithms.md");
const EXAMPLE = join(PACKAGE, "test/browser/extensions/guide-example/tie-strength.ts");

describe("the custom-algorithms guide", () => {
    it("shows exactly the example the browser suite runs", () => {
        const guide = readFileSync(GUIDE, "utf8");
        const section = guide.slice(guide.indexOf("## The whole of it"));
        const block = /```ts\n([\s\S]*?)```/.exec(section)?.[1];
        const example = readFileSync(EXAMPLE, "utf8").replace(
            '"../../../../extend"',
            '"@graphty/graphty-element/extend"',
        );

        assert.isDefined(block, "the guide has a code block under 'The whole of it'");
        assert.strictEqual(block, example);
    });
});
