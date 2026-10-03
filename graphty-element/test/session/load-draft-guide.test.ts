/**
 * @file The canonical example of `docs/guide/load-preview.md`, run as the page prints it.
 *
 * The first code block of the page is read, its import line dropped and its TypeScript
 * transpiled and imported as a module, then run against a headless session standing in for the
 * element and a stand-in file input, so a change to the page that breaks the example breaks this
 * test.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../src/session";

const PAGE = join(import.meta.dirname, "../../docs/guide/load-preview.md");

/**
 * The page's first TypeScript block, as JavaScript, without its import.
 * @returns the code
 */
function canonicalExample(): string {
    const markdown = readFileSync(PAGE, "utf8");
    const block = /```ts\n([\s\S]*?)```/.exec(markdown)?.[1];
    assert.isDefined(block, "the page has no ts block");
    const lines = block.split("\n");
    assert.isAtMost(lines.filter((line) => line.trim() !== "").length, 17, "the canonical example grew");
    const source = lines.filter((line) => !line.startsWith("import ")).join("\n");
    return ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
}

describe("the load preview guide's canonical example", () => {
    it("shows the first rows and the counts, then loads the file", async () => {
        const session = createGraphSession();
        const file = new File(["source,target,weight\na,b,2\nb,c,5\n"], "ties.csv");
        let onChange: (() => Promise<void>) | undefined;
        const input = {
            files: [file],
            addEventListener: (_type: string, listener: () => Promise<void>) => {
                onChange = listener;
            },
        };
        const document = {
            querySelector: (selector: string) => (selector === "graphty-element" ? { session } : input),
        };
        const tables: unknown[] = [];
        const logs: unknown[][] = [];
        const console = {
            table: (rows: unknown) => tables.push(rows),
            log: (...values: unknown[]) => logs.push(values),
        };

        const module = `export default (document, console) => {\n${canonicalExample()}\n};`;
        const run = (await import(/* @vite-ignore */ `data:text/javascript,${encodeURIComponent(module)}`)) as {
            default: (doc: typeof document, out: typeof console) => void;
        };
        run.default(document, console);
        assert.isDefined(onChange);
        await onChange?.();

        assert.deepEqual(tables, [
            [
                { source: "a", target: "b", weight: 2 },
                { source: "b", target: "c", weight: 5 },
            ],
        ]);
        assert.deepEqual(logs, [[3, 2, 0]]);
        assert.strictEqual(session.data.statistics().nodeCount, 3);
        assert.strictEqual(session.data.statistics().edgeCount, 2);
        session.dispose();
    });
});
