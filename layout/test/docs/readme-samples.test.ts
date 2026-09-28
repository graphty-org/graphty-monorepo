/**
 * @file The README's code samples compile and run.
 *
 * Every ```typescript block in README.md must be marked `<!-- doc-check -->` on the line before
 * it. Each marked block is written to tmp/doc-samples/ with `@graphty/layout` pointed at src/,
 * type-checked against the package's compiler options (an unknown option name is otherwise
 * silently ignored at run time) and then imported, so a sample that throws fails here.
 */

import assert from "node:assert";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import ts from "typescript";
import { describe, it, vi } from "vitest";

const PKG = resolve(__dirname, "../..");
const OUT = join(PKG, "tmp/doc-samples");
const MARK = "<!-- doc-check -->";

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

describe("README.md code samples", () => {
    const all = blocks(readFileSync(join(PKG, "README.md"), "utf8"));
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const files = all.map((b, i) => {
        const file = join(OUT, `readme-${String(i)}.ts`);
        writeFileSync(
            file,
            `${b.code.replaceAll('"@graphty/layout"', JSON.stringify(join(PKG, "src/index")))}\nexport {};\n`,
        );
        return file;
    });

    it("marks every typescript block as checked", () => {
        assert.ok(all.length > 0);
        assert.deepEqual(
            all.flatMap((b, i) => (b.checked ? [] : [i])),
            [],
            "unmarked blocks (0-based)",
        );
    });

    it("type-checks every sample", () => {
        const config = ts.getParsedCommandLineOfConfigFile(
            join(PKG, "tsconfig.json"),
            {},
            {
                ...ts.sys,
                onUnRecoverableConfigFileDiagnostic: () => undefined,
            },
        );
        assert.ok(config);
        const program = ts.createProgram(files, {
            ...config.options,
            noEmit: true,
            composite: false,
            incremental: false,
        });
        const errors = ts
            .getPreEmitDiagnostics(program)
            .filter((d) => d.file !== undefined && d.file.fileName.startsWith(OUT))
            .map((d) => `${d.file?.fileName ?? ""}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
        assert.deepEqual(errors, []);
    });

    files.forEach((file, i) => {
        it(`runs sample ${String(i)}`, async () => {
            const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
            try {
                await import(file);
            } finally {
                log.mockRestore();
            }
        });
    });
});
