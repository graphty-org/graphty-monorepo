/**
 * @file The README's code samples compile, run and print what their comments say.
 *
 * Every script block in README.md must be a plain ```typescript (or ```ts) fence at the start of a line, marked
 * `<!-- doc-check -->` on the line before it (a blank line between them is allowed). Each block is written to
 * tmp/doc-samples/ with `@graphty/layout` pointed at src/, type-checked against the package's compiler options (an
 * unknown option name is otherwise silently ignored at run time) and then imported, so a sample that throws fails
 * here. A `console.log(...)` line with a trailing `// comment` must print what the comment starts with.
 */

import assert from "node:assert";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

import ts from "typescript";
import { describe, it } from "vitest";

const PKG = resolve(__dirname, "../..");
const OUT = join(PKG, "tmp/doc-samples");
const MARK = "<!-- doc-check -->";
const SCRIPT = /^(?:ts|typescript|js|javascript|jsx|tsx|mts|cts|mjs|cjs)$/i;
const LOG = /^(\s*)console\.log\((.*)\);\s*\/\/ ?(.*)$/;

interface Block {
    /** 1-based line of the opening fence */
    line: number;
    code: string;
    checked: boolean;
    /** a ```typescript or ```ts fence at column 0 with nothing after the language */
    plain: boolean;
}

/**
 * Every script block of a markdown file, whatever its fence looks like, so an odd fence cannot hide a block.
 * @param markdown - the file's text
 * @returns the blocks in order
 */
function blocks(markdown: string): Block[] {
    const lines = markdown.split("\n");
    const found: Block[] = [];
    for (let i = 0; i < lines.length; i++) {
        const open = /^(\s*)(`{3,}|~{3,})\s*([\w-]*)(.*)$/.exec(lines[i]);
        if (open === null) {
            continue;
        }
        const close = new RegExp(`^\\s*${open[2]}\\s*$`);
        let end = i + 1;
        while (end < lines.length && !close.test(lines[end])) {
            end++;
        }
        if (SCRIPT.test(open[3])) {
            const prev = lines[i - 1]?.trim() === "" ? i - 2 : i - 1;
            found.push({
                line: i + 1,
                code: lines.slice(i + 1, end).join("\n"),
                checked: lines[prev]?.trim() === MARK,
                plain:
                    open[1] === "" && open[2] === "```" && /^(?:ts|typescript)$/.test(open[3]) && open[4].trim() === "",
            });
        }
        i = end;
    }
    return found;
}

/**
 * A logged value as a reader writes it in a comment: arrays as `[1, 2]`, strings inside them quoted.
 * @param value - the value
 * @param nested - whether it sits inside an array
 * @returns its text
 */
function show(value: unknown, nested = false): string {
    if (typeof value === "string") {
        return nested ? JSON.stringify(value) : value;
    }
    if (ArrayBuffer.isView(value) && !(value instanceof DataView)) {
        return show(Array.from(value as unknown as ArrayLike<number>), nested);
    }
    if (Array.isArray(value)) {
        return `[${value.map((v) => show(v, true)).join(", ")}]`;
    }
    if (typeof value === "number" || typeof value === "boolean" || value === undefined || value === null) {
        return String(value);
    }
    return JSON.stringify(value);
}

/**
 * Whether a comment starts with a printed value (a single string may also be quoted), followed by nothing or a
 * character that cannot continue it, so `1` does not match `10`.
 * @param comment - the trailing comment
 * @param values - the logged values
 * @returns true when they agree
 */
function agrees(comment: string, values: unknown[]): boolean {
    const printed = [values.map((v) => show(v)).join(" ")];
    if (values.length === 1 && typeof values[0] === "string") {
        printed.push(JSON.stringify(values[0]));
    }
    return printed.some((p) => comment.startsWith(p) && !/^[\w.]/.test(comment.slice(p.length)));
}

/**
 * The sample with each commented console.log turned into a check of its comment.
 * @param code - the sample
 * @returns the code to run
 */
function withLogChecks(code: string): string {
    const lines = code.split("\n").map((l) => {
        const m = LOG.exec(l);
        return m === null ? l : `${m[1]}__docLog(${JSON.stringify(m[3])}, ${m[2]});`;
    });
    return `declare function __docLog(comment: string, ...values: unknown[]): void;\n${lines.join("\n")}\nexport {};\n`;
}

const mismatches: string[] = [];
(globalThis as { __docLog?: (comment: string, ...values: unknown[]) => void }).__docLog = (comment, ...values) => {
    if (!agrees(comment, values)) {
        mismatches.push(`printed "${values.map((v) => show(v)).join(" ")}", comment says "${comment}"`);
    }
};

describe("the sample checker", () => {
    it("finds indented, labelled, tilde and first-line script fences, and reports them as unusual", () => {
        const md = [
            "```ts",
            "a();",
            "```",
            "- item",
            "",
            "    ```typescript",
            "    b();",
            "    ```",
            "",
            "```ts title=c.ts",
            "c();",
            "```",
            "",
            "~~~js",
            "d();",
            "~~~",
            "",
            "```bash",
            "e",
            "```",
            MARK,
            "",
            "```typescript",
            "f();",
            "```",
        ].join("\n");
        assert.deepEqual(
            blocks(md).map((b) => [b.line, b.checked, b.plain]),
            [
                [1, false, true],
                [6, false, false],
                [10, false, false],
                [14, false, false],
                [23, true, true],
            ],
        );
    });

    it("holds a logged value to its comment", () => {
        assert.ok(agrees("3", [3]));
        assert.ok(agrees("1: one hop", [1]));
        assert.ok(agrees('["a", "b"] in order', [["a", "b"]]));
        assert.ok(agrees("[1, 2]", [Uint32Array.of(1, 2)]));
        assert.ok(agrees('"G is not planar."', ["G is not planar."]));
        assert.ok(agrees("60 3 3", [60, 3, 3]));
        assert.ok(!agrees("10", [1]));
        assert.ok(!agrees("1.5", [1]));
        assert.ok(!agrees("Map of node id -> rank", [new Map()]));
        assert.equal(withLogChecks("console.log(x); // 3").split("\n")[1], '__docLog("3", x);');
        assert.equal(withLogChecks("console.log(x);").split("\n")[1], "console.log(x);");
    });
});

describe("README.md code samples", () => {
    const all = blocks(readFileSync(join(PKG, "README.md"), "utf8"));
    rmSync(OUT, { recursive: true, force: true });
    mkdirSync(OUT, { recursive: true });
    const files = all.map((b) => {
        const file = join(OUT, `readme-line-${String(b.line)}.ts`);
        writeFileSync(
            file,
            withLogChecks(b.code.replaceAll('"@graphty/layout"', JSON.stringify(join(PKG, "src/index")))),
        );
        return file;
    });

    it("marks every script block as checked, in a plain typescript fence", () => {
        assert.ok(all.length > 0);
        assert.deepEqual(
            all.flatMap((b) => (b.checked && b.plain ? [] : [b.line])),
            [],
            "unmarked or unusual fences (line numbers)",
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
            .filter((d) => d.file === undefined || d.file.fileName.startsWith(OUT))
            .map((d) => `${d.file?.fileName ?? "(options)"}: ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`);
        assert.deepEqual(errors, []);
    });

    all.forEach((b, i) => {
        it(`runs the sample at line ${String(b.line)} and prints what its comments say`, async () => {
            mismatches.length = 0;
            await import(files[i]);
            assert.deepEqual(mismatches, []);
        });
    });
});
