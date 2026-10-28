import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import type { Facts } from "../scripts/reference.js";

// Kept in step with REFERENCE_PAGES and OPTION_NAMES_FILE in scripts/reference.ts: this file imports only its types
// (below), and the first test fails when a page is added there and not here.
const REFERENCE_PAGES = ["layouts.md", "algorithms.md", "graphs.md"];
const OPTION_NAMES_FILE = "src/algorithm-options.ts";

/**
 * Runs the generator in a child process. It builds a TypeScript program over the package and formats every page with
 * prettier; in this worker, under the v8 coverage of the gate and CI, every function of the compiler and prettier is
 * instrumented, and the work grows with load and with the package's API (issue #2730). The child is not
 * instrumented, and the coverage report holds only src/ anyway. For the same reason this file imports nothing from
 * the generator but its types.
 * @returns every fact the tests check
 */
async function generate(): Promise<Facts> {
    const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--import", "tsx", "scripts/reference.ts", "--json"],
        {
            cwd: fileURLToPath(new URL("..", import.meta.url)),
            maxBuffer: 1 << 28,
        },
    );
    return JSON.parse(stdout) as Facts;
}

// The tables of the reference pages under docs/reference/ are generated from the source. A changed option, default,
// layout, algorithm, generator, dataset or format fails here until the pages are regenerated
// (`npm run docs:reference`). The hand-written text around the generated sections is kept.
describe("docs/reference", () => {
    // regenerating every page is the slow step: do it once for every test
    let generated: Promise<Facts> | undefined;
    const facts = (): Promise<Facts> => (generated ??= generate());

    it("lists every reference page the generator writes", async () => {
        expect(Object.keys((await facts()).pages)).toEqual(REFERENCE_PAGES);
    });

    it.each(REFERENCE_PAGES)("%s holds the reference generated from the current source", async (page) => {
        const result = (await facts()).pages[page];
        expect(result, `${page} is not a reference page`).toBeDefined();
        const { current, expected } = result;
        if (process.env.UPDATE_REFERENCE === "1") {
            writeFileSync(new URL(`../docs/reference/${page}`, import.meta.url), expected);
            return;
        }
        expect(current, `docs/reference/${page} is out of date: run \`npm run docs:reference\``).toBe(expected);
    });

    it("src/algorithm-options.ts lists the options of the current algorithm types", async () => {
        const { current, expected } = (await facts()).optionNames;
        if (process.env.UPDATE_REFERENCE === "1") {
            writeFileSync(new URL(`../${OPTION_NAMES_FILE}`, import.meta.url), expected);
            return;
        }
        expect(current, `${OPTION_NAMES_FILE} is out of date: run \`npm run docs:reference\``).toBe(expected);
    });

    it("gives every option a meaning", async () => {
        // an option row whose last cell is empty has no doc comment where it is declared: write one there
        const undocumented = (await facts()).reference
            .split("\n")
            .filter((line) => line.startsWith("| `") && line.endsWith("|  |"));
        expect(undocumented).toEqual([]);
    });
});
