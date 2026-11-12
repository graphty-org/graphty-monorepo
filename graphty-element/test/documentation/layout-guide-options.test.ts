/**
 * @file Every `setLayout(name, { ... })` example in the guides names a layout that exists and
 * passes it only options that layout takes, with values it accepts.
 *
 * The layouts guide once showed `d3-force` (no such layout), `circular` with `radius`, and
 * `hierarchical` with `direction` and no `start`: a consumer who copied them got an error instead
 * of the layout described (issue #3001). Each example is checked against the option schema of
 * the engine it runs, with unknown names refused.
 */

// Registers the built-in engines.
import "../../src/layout";

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { assert, describe, it } from "vitest";

import { layoutEntry } from "../../src/catalog/layouts";
import { toZodSchema } from "../../src/config/OptionsSchema";
import { LayoutEngine } from "../../src/layout/LayoutEngine";

const GUIDES = join(__dirname, "../../docs/guide");

interface Example {
    file: string;
    line: number;
    layout: string;
    source: string;
}

/**
 * Every `setLayout("name", { ... })` call in one guide, with its options object's source.
 * @param file - the guide's file name
 * @returns the examples
 */
function examplesIn(file: string): Example[] {
    const text = readFileSync(join(GUIDES, file), "utf8");
    const examples: Example[] = [];
    for (const match of text.matchAll(/setLayout\(\s*"([\w-]+)",\s*\{/g)) {
        const open = match.index + match[0].length - 1;
        let depth = 0;
        let end = open;
        do {
            if (text[end] === "{") {
                depth++;
            } else if (text[end] === "}") {
                depth--;
            }

            end++;
        } while (depth > 0);

        const line = text.slice(0, match.index).split("\n").length;
        examples.push({ file, line, layout: match[1], source: text.slice(open, end) });
    }

    return examples;
}

/**
 * The engine a layout name runs: a catalog id's default engine, or the engine named.
 * @param name - what the example passes to `setLayout`
 * @returns the engine's class, or null when nothing answers to the name
 */
function engineOf(name: string): ReturnType<typeof LayoutEngine.getClass> {
    return LayoutEngine.getClass(layoutEntry(name)?.descriptor.engine ?? name);
}

/**
 * Read an options object literal as the guides write one: comments, bare keys, trailing commas.
 * @param source - the literal's text
 * @returns its value
 */
function literal(source: string): unknown {
    const json = source
        .replaceAll(/\/\/.*$/gm, "")
        .replaceAll(/([{,]\s*)(\w+):/g, '$1"$2":')
        .replaceAll(/,(\s*})/g, "$1");
    return JSON.parse(json);
}

const examples = readdirSync(GUIDES)
    .filter((file) => file.endsWith(".md"))
    .flatMap(examplesIn);

describe("the guides' layout examples", () => {
    it("finds the layouts guide's examples", () => {
        assert.isAtLeast(examples.filter((e) => e.file === "layouts.md").length, 10);
    });

    for (const example of examples) {
        it(`${example.file}:${String(example.line)} setLayout("${example.layout}") takes its options`, () => {
            const engine = engineOf(example.layout);
            assert.isNotNull(engine, `"${example.layout}" is a layout id or an engine name`);

            const options = literal(example.source);
            const parsed = toZodSchema(engine.getZodOptionsSchema()).strict().safeParse(options);
            assert.isTrue(parsed.success, parsed.error?.message);
        });
    }
});
