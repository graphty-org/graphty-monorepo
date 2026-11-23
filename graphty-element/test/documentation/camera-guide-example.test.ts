/**
 * @file The simple path of saved views and tours, as `docs/guide/camera.md` prints it, compiled
 * against the package's built declaration files (`dist/`, what npm ships), not its source. A reader
 * copies the page's first `ts` block as it stands, so a name the published types lack, or a call
 * whose shape they refuse, fails here. `test/browser/camera/guide-example.test.ts` runs the same
 * block against a real element, so a wrong view id fails there.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

const ROOT = join(__dirname, "../..");
const GUIDE = join(ROOT, "docs/guide/camera.md");
const PUBLISHED = join(ROOT, "dist/index.d.ts");

/**
 * The guide's first `ts` block.
 * @returns The block's code.
 */
function example(): string {
    const block = /```ts\n([\s\S]*?)```/.exec(readFileSync(GUIDE, "utf8"))?.[1];
    assert.isDefined(block, "camera.md has a ts block");

    return block;
}

/**
 * Compile the example against the published declaration files.
 * @returns One line per error.
 */
function compileAgainstPublishedTypes(): string[] {
    const file = join(ROOT, "tmp-guide", "camera.md.ts");
    const text = example();
    const options: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        moduleDetection: ts.ModuleDetectionKind.Force,
        lib: ["lib.es2023.d.ts", "lib.dom.d.ts", "lib.dom.iterable.d.ts"],
        strict: true,
        noEmit: true,
        skipLibCheck: true,
        types: [],
        paths: { "@graphty/graphty-element": [PUBLISHED] },
    };
    const host = ts.createCompilerHost(options);
    const readFile = host.readFile.bind(host);
    const fileExists = host.fileExists.bind(host);
    const getSourceFile = host.getSourceFile.bind(host);
    host.readFile = (name) => (name === file ? text : readFile(name));
    host.fileExists = (name) => name === file || fileExists(name);
    host.getSourceFile = (name, version, ...rest) =>
        name === file ? ts.createSourceFile(name, text, version) : getSourceFile(name, version, ...rest);
    const program = ts.createProgram([file], options, host);

    return ts.getPreEmitDiagnostics(program).map((diagnostic) => {
        const line =
            diagnostic.file && diagnostic.start !== undefined
                ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1
                : 0;

        return `camera.md:${String(line)} ${ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")}`;
    });
}

describe("the camera guide's saved views and tours example", () => {
    it("compiles against the published types", () => {
        assert.isTrue(existsSync(PUBLISHED), "build graphty-element first: the example compiles against dist/");
        assert.deepEqual(compileAgainstPublishedTypes(), []);
    });
});
