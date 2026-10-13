import { execFile } from "node:child_process";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { describe, expect, it } from "vitest";

import type { Facts } from "../scripts/docs-reference.js";
import { importGraph, registry } from "../src/registry.js";

/**
 * Runs the generator in a child process. It builds a TypeScript program over the package and formats every page with
 * prettier; in this worker, under the v8 coverage of the gate and CI, every function of the compiler and prettier is
 * instrumented, which doubled its work and took it over the 30 s test timeout with the rest of the suite beside it
 * (issue #2131). The child is not instrumented, and the coverage report holds only src/ anyway. For the same reason
 * this file imports nothing from the generator but its types.
 * @returns every fact the tests check
 */
async function generate(): Promise<Facts> {
    const { stdout } = await promisify(execFile)(
        process.execPath,
        ["--import", "tsx", "scripts/docs-reference.ts", "--json"],
        {
            cwd: fileURLToPath(new URL("..", import.meta.url)),
            maxBuffer: 1 << 28,
        },
    );
    return JSON.parse(stdout) as Facts;
}

// The format tables, options and codes in docs/ are generated from the source by scripts/docs-reference.ts. A new
// format, exporter, option or code fails here until the pages are regenerated (`npm run docs:reference`, which
// also creates the page of a new format).
describe("generated documentation", () => {
    // regenerating every page is the slow step: do it once for every test
    let generated: Promise<Facts> | undefined;
    const facts = (): Promise<Facts> => (generated ??= generate());

    it("matches the current source", async () => {
        const results = (await facts()).pages;
        if (process.env.UPDATE_REFERENCE === "1") {
            for (const r of results) {
                writeFileSync(new URL(`../docs/${r.page}`, import.meta.url), r.expected);
            }
            return;
        }
        const stale = results.filter((r) => r.current !== r.expected).map((r) => r.page);
        expect(stale, "docs are out of date: run `npm run docs:reference` in graph-io").toEqual([]);
    });

    it("gives every option, code and capability a description", async () => {
        // a row without a meaning has no doc comment where it is declared: write one there
        expect((await facts()).undocumented).toEqual([]);
    });

    it("never sends a reader to the internal design documents", async () => {
        // the published doc comments and the generated pages are read by users, who have neither
        const { internalReferences, leakingPages } = await facts();
        expect(internalReferences).toEqual([]);
        expect(leakingPages).toEqual([]);
    });

    it("lists in each built-in importer and exporter exactly the options its type declares", async () => {
        // W_UNKNOWN_OPTION trusts these lists; a new option without its name here would be reported as a misspelling
        const names = (await facts()).optionNames;
        for (const [format, own] of Object.entries(names.formats)) {
            expect([...(registry.importer(format).options ?? [])].sort(), `${format} import`).toEqual(own.import);
            expect([...(registry.exporter(format).options ?? [])].sort(), `${format} export`).toEqual(own.export);
        }
        // and every option the load and save functions take themselves is known: none is reported
        const all = Object.fromEntries(names.common.map((n) => [n, undefined]));
        const { report } = await importGraph("graph { a -- b }", { ...all, format: "dot" });
        expect(report.issues).toEqual([]);
    });
});
