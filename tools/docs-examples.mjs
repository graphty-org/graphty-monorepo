// Runs a package's documentation examples (<package>/docs/examples/*.ts) as a reader would. A guide page includes
// each example verbatim (`<<< ../examples/<name>.ts`), and the comment after each `console.log(...);` says what that
// line prints; a package's test/docs-examples.test.ts calls describeDocsExamples() to run every example and check
// that it printed exactly those comments, so the pages cannot drift from the code.

import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { format } from "node:util";

import { describe, expect, it, vi } from "vitest";

/**
 * What each `console.log(...); // <text>` line of an example says it prints, in order.
 * @param source - the example's source
 * @returns the promised lines
 */
export function promisedOutput(source) {
    return [...source.matchAll(/console\.log\(.*\); \/\/ (.+)$/gm)].map((m) => m[1]);
}

/**
 * One test per example in `dir`: import it with console.log captured and compare what it printed with its comments.
 * @param dir - the absolute path of the examples directory
 * @param [options] - setup to run before each example (a stubbed fetch, say)
 */
export function describeDocsExamples(dir, options = {}) {
    describe("documentation examples", () => {
        for (const file of readdirSync(dir).filter((f) => f.endsWith(".ts"))) {
            it(`${file} prints what its comments say`, async () => {
                options.beforeEach?.();
                const printed = [];
                const log = vi.spyOn(console, "log").mockImplementation((...args) => {
                    printed.push(format(...args));
                });
                try {
                    await import(join(dir, file));
                } finally {
                    log.mockRestore();
                }
                const expected = promisedOutput(readFileSync(join(dir, file), "utf8"));
                expect(expected.length).toBeGreaterThan(0);
                expect(printed).toEqual(expected);
            });
        }
    });
}
