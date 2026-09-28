/**
 * @file The guides' code samples compile and run.
 *
 * A ```typescript block marked `<!-- doc-check -->` on the line before it (a blank line between them is allowed) is written to
 * tmp/doc-samples/ with `@graphty/algorithms` pointed at src/, type-checked against the
 * package's compiler options (an unknown option name is otherwise silently ignored at run time)
 * and then imported, so a sample that throws fails here. In the getting-started guide every
 * block must be marked; in the README, only the marked ones run.
 */

import assert from "node:assert";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { basename, join, resolve } from "node:path";

import ts from "typescript";
import { describe, it, vi } from "vitest";

const PKG = resolve(__dirname, "../../..");
const OUT = join(PKG, "tmp/doc-samples");
const MARK = "<!-- doc-check -->";
const DOCS = [
    { path: "docs/guide/getting-started.md", everyBlock: true },
    { path: "README.md", everyBlock: false },
];

/**
 * Every typescript block of a markdown file, with whether it carries the marker.
 * @param markdown - the file's text
 * @returns the blocks in order
 */
function blocks(markdown: string): { code: string; checked: boolean }[] {
    const found: { code: string; checked: boolean }[] = [];
    for (const m of markdown.matchAll(/^(.*)\n\n?```(?:ts|typescript)\n([\s\S]*?)^```/gm)) {
        found.push({ code: m[2], checked: m[1].trim() === MARK });
    }
    return found;
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const docs = DOCS.map(({ path, everyBlock }) => {
    const all = blocks(readFileSync(join(PKG, path), "utf8"));
    const files = all.flatMap((b, i) => {
        if (!b.checked) {
            return [];
        }
        const file = join(OUT, `${basename(path, ".md")}-${String(i)}.ts`);
        const code = b.code.replaceAll('"@graphty/algorithms"', JSON.stringify(join(PKG, "src/index.js")));
        writeFileSync(file, `${code}\nexport {};\n`);
        return [file];
    });
    return { path, everyBlock, all, files };
});

describe("documentation code samples", () => {
    for (const { path, everyBlock, all, files } of docs) {
        it(`${path} has checked samples${everyBlock ? ", every block marked" : ""}`, () => {
            assert.ok(files.length > 0);
            if (everyBlock) {
                assert.deepEqual(
                    all.flatMap((b, i) => (b.checked ? [] : [i])),
                    [],
                    "unmarked blocks (0-based)",
                );
            }
        });
    }

    it("type-checks every checked sample", () => {
        const config = ts.getParsedCommandLineOfConfigFile(
            join(PKG, "tsconfig.json"),
            {},
            {
                ...ts.sys,
                onUnRecoverableConfigFileDiagnostic: () => undefined,
            },
        );
        assert.ok(config);
        const files = docs.flatMap((d) => d.files);
        const program = ts.createProgram(files, {
            ...config.options,
            noEmit: true,
            composite: false,
            incremental: false,
        });
        const errors = ts
            .getPreEmitDiagnostics(program)
            .filter((d) => d.file?.fileName.startsWith(OUT) === true)
            .map((d) => `${d.file?.fileName ?? ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
        assert.deepEqual(errors, []);
    });

    for (const file of docs.flatMap((d) => d.files)) {
        it(`runs ${basename(file)}`, async () => {
            const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
            try {
                await import(file);
            } finally {
                log.mockRestore();
            }
        });
    }
});
