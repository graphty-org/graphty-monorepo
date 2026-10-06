#!/usr/bin/env node
/**
 * Fails while a graphty-element data source still parses files itself instead of running an
 * importer from @graphty/graph-io.
 *
 * A problem is any of:
 *   - a *DataSource.ts under graphty-element/src/data (other than the DataSource.ts base class)
 *     with no value import from @graphty/graph-io (a type-only import does not count)
 *   - a graphty-element/src file that imports papaparse or fast-xml-parser
 *   - graphty-element/src/data/csv-variant-detection.ts existing
 *   - a file under graphty-element/src/data defining one of the hand-written parser functions:
 *     parsePajek, tokenizeLine (Pajek) or tokenize (the DOT and GML tokenisers), as a function,
 *     a method, a class property or a variable
 *
 * The move onto graph-io is finished, so there is no allow-list: any problem fails.
 *
 * Usage: node tools/check-data-source-migration.mjs              (exit 1 on a problem)
 *        node tools/check-data-source-migration.mjs --self-test  (prove each rule fires)
 */
import { existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { scratchWorkspace } from "./scratch-workspace.mjs";
import { sourceFiles } from "./workspace-files.mjs";

const DATA_DIR = "graphty-element/src/data";
const SRC_DIR = "graphty-element/src";
const PARSER_PACKAGES = ["papaparse", "fast-xml-parser"];
const PARSER_FUNCTIONS = ["parsePajek", "tokenizeLine", "tokenize"];

/**
 * The module specifiers a source file imports or re-exports, statically or dynamically.
 * @param source - the file's text
 * @param values - true to skip `import type` and `export type` statements
 * @returns the specifiers
 */
function importsOf(source, values = false) {
    const text = values ? source.replace(/^\s*(?:import|export)\s+type\b[^;]*;/gm, "") : source;
    const re = /(?:\bfrom\s*|\bimport\s*\(\s*|\brequire\s*\(\s*|^\s*import\s+)["'`]([^"'`$]+)["'`]/gm;
    return [...text.matchAll(re)].map((m) => m[1]);
}

/**
 * Whether a source file defines a function or method of a name.
 * @param source - the file's text
 * @param name - the function name
 * @returns true for `function name(`, a method `name(...) {` or `name(...): T` at the start of
 *          a line, a class property `name =` or `name: T` at the start of a line, or
 *          `const name =`; a call such as `name(x);` is not a definition
 */
function defines(source, name) {
    const mods = "(?:(?:private|public|protected|static|async|export|default|readonly|override|abstract|declare)\\s+)*";
    return new RegExp(
        [
            `\\bfunction\\s*\\*?\\s*${name}\\s*[(<]`,
            `^\\s*${mods}\\*?${name}\\s*(?:<[^>]*>)?\\([^)]*\\)\\s*[:{]`,
            `^\\s*${mods}${name}\\s*[?!]?\\s*(?::|=(?!=))`,
            `\\b(?:const|let|var)\\s+${name}\\s*[:=]`,
        ].join("|"),
        "m",
    ).test(source);
}

/**
 * Checks a repository tree.
 * @param rootDir - the repository root
 * @returns one line per problem, stable across edits that do not change the verdict
 */
function check(rootDir) {
    const problems = [];
    const rel = (file) => relative(rootDir, file).split("\\").join("/");
    for (const file of sourceFiles(join(rootDir, SRC_DIR))) {
        const imports = importsOf(readFileSync(file, "utf8"));
        for (const pkg of PARSER_PACKAGES) {
            if (imports.some((s) => s === pkg || s.startsWith(`${pkg}/`))) {
                problems.push(`${rel(file)}: imports ${pkg}`);
            }
        }
    }
    const dataDir = join(rootDir, DATA_DIR);
    for (const file of sourceFiles(dataDir)) {
        const source = readFileSync(file, "utf8");
        const name = file.split(/[\\/]/).pop();
        if (/^\w+DataSource\.ts$/.test(name)) {
            if (!importsOf(source, true).some((s) => s === "@graphty/graph-io" || s.startsWith("@graphty/graph-io/"))) {
                problems.push(`${rel(file)}: does not import its importer from @graphty/graph-io`);
            }
        }
        for (const fn of PARSER_FUNCTIONS) {
            if (defines(source, fn)) {
                problems.push(`${rel(file)}: defines the parser function ${fn}`);
            }
        }
    }
    if (existsSync(join(dataDir, "csv-variant-detection.ts"))) {
        problems.push(`${DATA_DIR}/csv-variant-detection.ts: exists`);
    }
    return problems.sort();
}

/**
 * Builds a migrated element tree, checks that it passes, then that each rule reports the file
 * that breaks it.
 */
function selfTest() {
    const { dir, write } = scratchWorkspace("data-source-migration-");
    const expect = (label, want) => {
        const got = check(dir);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
            throw new Error(`${label}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
        }
    };
    try {
        write(`${DATA_DIR}/DataSource.ts`, "export abstract class DataSource {}\n");
        write(
            `${DATA_DIR}/CSVDataSource.ts`,
            'import { importCsv } from "@graphty/graph-io/csv";\nimport { DataSource } from "./DataSource.js";\n',
        );
        write(
            `${DATA_DIR}/DOTDataSource.ts`,
            'import { importDot, tokenize } from "@graphty/graph-io/dot";\nexport function run(s) {\n    tokenize(s);\n}\n',
        );
        write(`${DATA_DIR}/JsonDataSource.ts`, 'import { importJson } from "@graphty/graph-io";\n');
        write(`${SRC_DIR}/Graph.ts`, 'import { Scene } from "@babylonjs/core";\n');
        expect("the migrated tree", []);

        write(`${SRC_DIR}/managers/Loader.ts`, 'import Papa from "papaparse";\n');
        expect("a papaparse import", [`${SRC_DIR}/managers/Loader.ts: imports papaparse`]);
        rmSync(join(dir, `${SRC_DIR}/managers/Loader.ts`));

        write(`${DATA_DIR}/GEXFDataSource.ts`, 'import { XMLParser } from "fast-xml-parser";\n');
        expect("a data source that parses XML itself", [
            `${DATA_DIR}/GEXFDataSource.ts: does not import its importer from @graphty/graph-io`,
            `${DATA_DIR}/GEXFDataSource.ts: imports fast-xml-parser`,
        ]);
        rmSync(join(dir, `${DATA_DIR}/GEXFDataSource.ts`));

        write(
            `${DATA_DIR}/PajekDataSource.ts`,
            [
                'import { importPajek } from "@graphty/graph-io/pajek";',
                "class PajekDataSource {",
                "    private parsePajek(content: string) {}",
                "    private tokenizeLine(line: string) {}",
                "}",
                "",
            ].join("\n"),
        );
        write(`${DATA_DIR}/gml.ts`, "export function tokenize(s: string): string[] { return []; }\n");
        write(`${DATA_DIR}/csv-variant-detection.ts`, "export const x = 1;\n");
        expect("hand-written parsers", [
            `${DATA_DIR}/PajekDataSource.ts: defines the parser function parsePajek`,
            `${DATA_DIR}/PajekDataSource.ts: defines the parser function tokenizeLine`,
            `${DATA_DIR}/csv-variant-detection.ts: exists`,
            `${DATA_DIR}/gml.ts: defines the parser function tokenize`,
        ]);

        rmSync(join(dir, `${DATA_DIR}/PajekDataSource.ts`));
        rmSync(join(dir, `${DATA_DIR}/gml.ts`));
        rmSync(join(dir, `${DATA_DIR}/csv-variant-detection.ts`));

        write(`${SRC_DIR}/a.ts`, 'const P = require("papaparse/papaparse.min.js");\n');
        write(`${SRC_DIR}/b.ts`, 'const X = await import("fast-xml-parser");\n');
        write(`${SRC_DIR}/c.ts`, "const P = await import(`papaparse`);\n");
        expect("required and dynamic imports", [
            `${SRC_DIR}/a.ts: imports papaparse`,
            `${SRC_DIR}/b.ts: imports fast-xml-parser`,
            `${SRC_DIR}/c.ts: imports papaparse`,
        ]);
        for (const f of ["a", "b", "c"]) {
            rmSync(join(dir, `${SRC_DIR}/${f}.ts`));
        }

        write(
            `${DATA_DIR}/sub/XDataSource.ts`,
            [
                'import type { ImportReport } from "@graphty/graph-io";',
                "class XDataSource {",
                "    private readonly tokenize = (s: string) => [];",
                "    override tokenizeLine(s: string): string[] {",
                "        return [];",
                "    }",
                "    parsePajek: (s: string) => void = () => {};",
                "}",
                "",
            ].join("\n"),
        );
        expect("a type-only graph-io import and parsers as properties", [
            `${DATA_DIR}/sub/XDataSource.ts: defines the parser function parsePajek`,
            `${DATA_DIR}/sub/XDataSource.ts: defines the parser function tokenize`,
            `${DATA_DIR}/sub/XDataSource.ts: defines the parser function tokenizeLine`,
            `${DATA_DIR}/sub/XDataSource.ts: does not import its importer from @graphty/graph-io`,
        ]);
        rmSync(join(dir, `${DATA_DIR}/sub`), { recursive: true });
        write(`${DATA_DIR}/dot.ts`, "export const tokenize = (s: string): string[] => [];\n");
        const line = `${DATA_DIR}/dot.ts: defines the parser function tokenize`;
        expect("a parser as a const", [line]);

        const { log, error } = console;
        console.log = console.error = () => {};
        const failing = run(dir);
        rmSync(join(dir, `${DATA_DIR}/dot.ts`));
        const passing = run(dir);
        Object.assign(console, { log, error });
        if (failing !== 1 || passing !== 0) {
            throw new Error(`exit codes with and without a problem: expected 1 and 0, got ${failing} and ${passing}`);
        }
        console.log("check-data-source-migration self-test: passed");
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

/**
 * Checks a tree and prints the verdict.
 * @param rootDir - the repository root
 * @returns the process exit code: 1 on any problem
 */
function run(rootDir) {
    const problems = check(rootDir);
    for (const p of problems) {
        console.error(p);
    }
    if (problems.length > 0) {
        console.error(
            `\n${problems.length} problem(s). graphty-element data sources read files through @graphty/graph-io importers.`,
        );
        return 1;
    }
    console.log("check-data-source-migration: every element data source reads files through @graphty/graph-io");
    return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.includes("--self-test")) {
        selfTest();
        process.exit(0);
    }
    process.exit(run(resolve(dirname(fileURLToPath(import.meta.url)), "..")));
}
