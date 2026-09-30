#!/usr/bin/env node
/**
 * Fails when a workspace package's src uses the legacy graph API that the graph-format migration
 * replaces (design/graph-format/migration-plan.md, section 7).
 *
 * Rules, each reported as `<file> <rule> <name>`:
 *   legacy-import                 imports or re-exports a legacy name from @graphty/algorithms
 *                                 or @graphty/layout (named, `export *`, or a member of a namespace
 *                                 or dynamic import):
 *                                 anything tagged @deprecated, and every export declared outside the
 *                                 replacement code (algorithms: indexed/, data-structures/, types/,
 *                                 utils/ except graph-converters.ts, errors.ts; layout: everything but
 *                                 layouts/, generators/ and utils/rescale.ts)
 *   legacy-graph-bridge           calls toAlgorithmGraph or algorithmGraph
 *   legacy-graph-construction     constructs the legacy Graph class of @graphty/algorithms
 *   positional-layout-call        calls a positional layout function of @graphty/layout
 *   data-source-without-graph-io  a *DataSource.ts in graphty-element/src/data imports no value
 *                                 from graph-io (the package or one of its format subpaths); a
 *                                 type-only or side-effect-only import does not count
 *   parser-dependency             graphty-element src imports papaparse or fast-xml-parser
 *   hand-written-parser           graphty-element/src/data holds csv-variant-detection.ts, parsePajek
 *                                 or a tokeniser (tokenize, tokenizeLine, a *Tokenizer or *Lexer, ...)
 *
 * The legacy names are read from the algorithms and layout sources with the TypeScript compiler,
 * so a name that gains @deprecated is caught without editing this file.
 *
 * The migration is finished, so there is no allow-list: any use fails.
 *
 * Usage: node tools/check-legacy-use.mjs              (exit 1 on any use)
 *        node tools/check-legacy-use.mjs --self-test  (prove each rule fires on a seeded fixture)
 */
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const ALGORITHMS = "@graphty/algorithms";
const LAYOUT = "@graphty/layout";
const PARSER_DEPENDENCIES = new Set(["papaparse", "fast-xml-parser"]);
const BRIDGE_CALLS = new Set(["toAlgorithmGraph", "algorithmGraph"]);
const PARSER_NAME = /^(parsePajek|tokeni[sz]e\w*|\w*(Tokeni[sz]er|Lexer))$/;
const DATA_DIR = "graphty-element/src/data/";

/**
 * Whether a file of @graphty/algorithms (path relative to its src) holds legacy code.
 * @param path - the path, with forward slashes
 * @returns true for legacy code
 */
function algorithmsLegacyFile(path) {
    if (path === "utils/graph-converters.ts") {
        return true;
    }
    return !["indexed/", "data-structures/", "types/", "utils/", "errors.ts"].some((p) => path.startsWith(p));
}

/**
 * Whether a file of @graphty/layout (path relative to its src) holds legacy code.
 * @param path - the path, with forward slashes
 * @returns true for legacy code
 */
function layoutLegacyFile(path) {
    return path.startsWith("layouts/") || path.startsWith("generators/") || path === "utils/rescale.ts";
}

/**
 * Whether an export is tagged @deprecated. The tag of `export * as ns from ...` sits on the export
 * declaration, which neither the export symbol nor the module it names reports.
 * @param symbols - the export symbol and the symbol it resolves to
 * @returns true when either, or the export declaration of either, carries @deprecated
 */
export function isDeprecated(...symbols) {
    return symbols.some(
        (s) =>
            s.getJsDocTags().some((t) => t.name === "deprecated") ||
            (s.declarations ?? []).some(
                (d) => ts.isNamespaceExport(d) && ts.getJSDocDeprecatedTag(d.parent) !== undefined,
            ),
    );
}

/**
 * The legacy exports of algorithms and layout, read from their src/index.ts.
 * @param rootDir - the workspace root
 * @returns package name -> export name -> { positional, graphClass }
 */
function legacyExports(rootDir) {
    const entries = { [ALGORITHMS]: "algorithms", [LAYOUT]: "layout" };
    const files = Object.values(entries).map((d) => join(rootDir, d, "src", "index.ts"));
    const program = ts.createProgram(files, {
        noEmit: true,
        skipLibCheck: true,
        noLib: true,
        types: [],
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
    });
    const checker = program.getTypeChecker();
    const result = new Map();
    for (const [pkg, dir] of Object.entries(entries)) {
        const srcDir = join(rootDir, dir, "src");
        const moduleSymbol = checker.getSymbolAtLocation(program.getSourceFile(join(srcDir, "index.ts")));
        const names = new Map();
        for (const exported of checker.getExportsOfModule(moduleSymbol)) {
            const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
            const decl = symbol.declarations?.[0];
            if (decl === undefined) {
                continue;
            }
            const path = relative(srcDir, decl.getSourceFile().fileName).split(sep).join("/");
            const deprecated = isDeprecated(exported, symbol);
            const legacy = pkg === ALGORITHMS ? algorithmsLegacyFile(path) : layoutLegacyFile(path);
            if (legacy || deprecated) {
                names.set(exported.name, {
                    positional: pkg === LAYOUT && path.startsWith("layouts/"),
                    graphClass:
                        pkg === ALGORITHMS && path === "core/graph.ts" && (symbol.flags & ts.SymbolFlags.Class) !== 0,
                });
            }
        }
        result.set(pkg, names);
    }
    return result;
}

/**
 * Every source file under a directory, skipping declaration files.
 * @param dir - the directory
 * @returns absolute paths
 */
function sourceFiles(dir) {
    if (!existsSync(dir)) {
        return [];
    }
    return readdirSync(dir, { recursive: true, withFileTypes: true })
        .filter((e) => e.isFile() && /\.(m?[jt]sx?)$/.test(e.name) && !e.name.endsWith(".d.ts"))
        .map((e) => join(e.parentPath, e.name));
}

/**
 * The name a call or `new` targets: `f(...)` -> f, `a.b.f(...)` -> f.
 * @param expr - the callee
 * @returns the name, or undefined
 */
function calleeName(expr) {
    if (ts.isIdentifier(expr)) {
        return expr.text;
    }
    if (ts.isPropertyAccessExpression(expr)) {
        return expr.name.text;
    }
    return undefined;
}

/**
 * Checks one source file.
 * @param file - the file's path relative to the root, with forward slashes
 * @param text - its contents
 * @param legacy - the result of legacyExports
 * @returns the findings
 */
function checkFile(file, text, legacy) {
    const findings = [];
    const report = (rule, name) => findings.push({ file, rule, name });
    const inElement = file.startsWith("graphty-element/src/");
    const inData = file.startsWith(DATA_DIR);
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
    // local identifier -> the legacy export it binds; namespace local -> its package
    const locals = new Map();
    const namespaces = new Map();
    let importsGraphIo = false;

    const isGraphIo = (spec) => spec === "@graphty/graph-io" || spec.startsWith("@graphty/graph-io/");
    const specifierUse = (spec) => {
        if (inElement && PARSER_DEPENDENCIES.has(spec)) {
            report("parser-dependency", spec);
        }
    };
    const namedLegacy = (spec, elements) => {
        const names = legacy.get(spec);
        for (const el of names === undefined ? [] : elements) {
            const imported = el.propertyName ?? el.name;
            if (!ts.isIdentifier(imported) || !ts.isIdentifier(el.name)) {
                continue;
            }
            const info = names.get(imported.text);
            if (info !== undefined) {
                report("legacy-import", imported.text);
                locals.set(el.name.text, info);
            }
        }
    };
    // `await import("x")` or `import("x")` -> "x"
    const dynamicSpecifier = (expr) => {
        let e = expr;
        while (e !== undefined && (ts.isAwaitExpression(e) || ts.isParenthesizedExpression(e))) {
            e = e.expression;
        }
        return e !== undefined &&
            ts.isCallExpression(e) &&
            e.expression.kind === ts.SyntaxKind.ImportKeyword &&
            e.arguments[0] !== undefined &&
            ts.isStringLiteral(e.arguments[0])
            ? e.arguments[0].text
            : undefined;
    };

    const visit = (node) => {
        if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
            const spec = node.moduleSpecifier.text;
            specifierUse(spec);
            const clause = node.importClause;
            if (
                isGraphIo(spec) &&
                clause !== undefined &&
                !clause.isTypeOnly &&
                (clause.name !== undefined ||
                    (clause.namedBindings !== undefined &&
                        (!ts.isNamedImports(clause.namedBindings) ||
                            clause.namedBindings.elements.some((el) => !el.isTypeOnly))))
            ) {
                importsGraphIo = true;
            }
            const bindings = clause?.namedBindings;
            if (bindings !== undefined && ts.isNamedImports(bindings)) {
                namedLegacy(spec, bindings.elements);
            } else if (bindings !== undefined && legacy.has(spec)) {
                namespaces.set(bindings.name.text, legacy.get(spec));
            }
        } else if (ts.isExportDeclaration(node) && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) {
            specifierUse(node.moduleSpecifier.text);
            if (node.exportClause !== undefined && ts.isNamedExports(node.exportClause)) {
                namedLegacy(node.moduleSpecifier.text, node.exportClause.elements);
            } else if (legacy.has(node.moduleSpecifier.text) && legacy.get(node.moduleSpecifier.text).size > 0) {
                // `export * from` and `export * as ns from` pass every legacy name on
                report("legacy-import", "*");
            }
        } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
            const [arg] = node.arguments;
            if (arg !== undefined && ts.isStringLiteral(arg)) {
                specifierUse(arg.text);
                if (isGraphIo(arg.text)) {
                    importsGraphIo = true;
                }
            }
        } else if (ts.isVariableDeclaration(node) && legacy.has(dynamicSpecifier(node.initializer))) {
            // `const { circularLayout } = await import(...)` or `const L = await import(...)`
            const spec = dynamicSpecifier(node.initializer);
            if (ts.isObjectBindingPattern(node.name)) {
                namedLegacy(spec, node.name.elements);
            } else if (ts.isIdentifier(node.name)) {
                namespaces.set(node.name.text, legacy.get(spec));
            }
        } else if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
            const name = calleeName(node.expression);
            // `ns.circularLayout()` on `import * as ns from "@graphty/layout"`
            const target = node.expression;
            const info = !ts.isPropertyAccessExpression(target)
                ? locals.get(name)
                : ts.isIdentifier(target.expression)
                  ? namespaces.get(target.expression.text)?.get(name)
                  : undefined;
            if (ts.isCallExpression(node) && BRIDGE_CALLS.has(name)) {
                report("legacy-graph-bridge", name);
            } else if (ts.isCallExpression(node) && info?.positional) {
                report("positional-layout-call", name);
            } else if (ts.isNewExpression(node) && info?.graphClass) {
                report("legacy-graph-construction", name);
            }
        }
        // `ns.dijkstra` or the type `ns.Graph` on a namespace import of a legacy package
        const member = ts.isPropertyAccessExpression(node)
            ? [node.expression, node.name]
            : ts.isQualifiedName(node)
              ? [node.left, node.right]
              : undefined;
        if (member !== undefined && ts.isIdentifier(member[0]) && namespaces.get(member[0].text)?.has(member[1].text)) {
            report("legacy-import", member[1].text);
        }
        if (
            inData &&
            (ts.isFunctionDeclaration(node) ||
                ts.isClassDeclaration(node) ||
                ts.isPropertyAssignment(node) ||
                ts.isShorthandPropertyAssignment(node) ||
                ts.isMethodDeclaration(node) ||
                ts.isPropertyDeclaration(node) ||
                ts.isVariableDeclaration(node)) &&
            node.name !== undefined &&
            ts.isIdentifier(node.name) &&
            PARSER_NAME.test(node.name.text)
        ) {
            report("hand-written-parser", node.name.text);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);

    const base = file.slice(file.lastIndexOf("/") + 1);
    if (inData && base === "csv-variant-detection.ts") {
        report("hand-written-parser", base);
    }
    if (inData && base.endsWith("DataSource.ts") && base !== "DataSource.ts" && !importsGraphIo) {
        report("data-source-without-graph-io", "@graphty/graph-io");
    }
    return findings;
}

/**
 * Checks the src of every workspace package.
 * @param rootDir - the workspace root (holds pnpm-workspace.yaml)
 * @returns the findings, sorted
 */
function check(rootDir) {
    const legacy = legacyExports(rootDir);
    const workspaceYaml = readFileSync(join(rootDir, "pnpm-workspace.yaml"), "utf8");
    const packagesBlock = workspaceYaml.split(/^packages:\s*$/m)[1]?.split(/^\S/m)[0] ?? "";
    const dirs = [...packagesBlock.matchAll(/^\s*-\s*["']?([^"'\s]+)["']?/gm)].map((m) => m[1]);
    const findings = [];
    for (const dir of dirs) {
        for (const abs of sourceFiles(join(rootDir, dir, "src"))) {
            const file = relative(rootDir, abs).split(sep).join("/");
            findings.push(...checkFile(file, readFileSync(abs, "utf8"), legacy));
        }
    }
    return findings.map((f) => `${f.file} ${f.rule} ${f.name}`).sort();
}

/**
 * Builds a small workspace with one seeded use per rule and checks each is reported and that the
 * replacement API is not.
 */
function selfTest() {
    const dir = mkdtempSync(join(tmpdir(), "legacy-use-"));
    const write = (file, body) => {
        mkdirSync(dirname(join(dir, file)), { recursive: true });
        writeFileSync(join(dir, file), body);
    };
    try {
        write(
            "pnpm-workspace.yaml",
            'packages:\n    - "algorithms"\n    - "layout"\n    - "graphty-element"\n    - "app"\n',
        );
        write(
            "algorithms/src/index.ts",
            [
                'export { Graph } from "./core/graph.js";',
                'export * from "./algorithms/index.js";',
                'export * from "./data-structures/index.js";',
                'export * as indexed from "./indexed/index.js";',
                "/** @deprecated use the top-level names */",
                'export * as oldIndexed from "./indexed/index.js";',
                'export { toSnapshot } from "./indexed/to-snapshot.js";',
                'export { graphToMap } from "./utils/graph-converters.js";',
            ].join("\n"),
        );
        write("algorithms/src/core/graph.ts", "export class Graph {}\n");
        write("algorithms/src/algorithms/index.ts", "export function dijkstra(): void {}\n");
        write(
            "algorithms/src/data-structures/index.ts",
            "export class PriorityQueue {}\n/** @deprecated use indexed.x */\nexport function oldQueue(): void {}\n",
        );
        write("algorithms/src/indexed/index.ts", "export function dijkstra(): void {}\n");
        write("algorithms/src/indexed/to-snapshot.ts", "export function toSnapshot(): void {}\n");
        write("algorithms/src/utils/graph-converters.ts", "export function graphToMap(): void {}\n");
        write(
            "layout/src/index.ts",
            'export * from "./layouts";\nexport * as indexed from "./indexed";\nexport * from "./simulation";\n',
        );
        write("layout/src/layouts/index.ts", "export function circularLayout(): void {}\n");
        write("layout/src/indexed/index.ts", "export function circular(): void {}\n");
        write("layout/src/simulation/index.ts", "export function createSimulation(): void {}\n");

        // Uses of the replacement API only: nothing may be reported for this file.
        write(
            "app/src/clean.ts",
            [
                'import { indexed, PriorityQueue, toSnapshot } from "@graphty/algorithms";',
                'import { createSimulation, indexed as layouts } from "@graphty/layout";',
                "new PriorityQueue();",
                "indexed.dijkstra(toSnapshot());",
                "layouts.circular();",
                "createSimulation();",
                // the parser dependencies are only barred from graphty-element
                'import Papa from "papaparse";',
                'await import("fast-xml-parser");',
            ].join("\n"),
        );
        write(
            "app/src/uses.ts",
            [
                'import { Graph as G, dijkstra, oldIndexed, oldQueue } from "@graphty/algorithms";',
                'import * as L from "@graphty/layout";',
                'export { graphToMap } from "@graphty/algorithms";',
                "new G();",
                "L.circularLayout();",
                "this.algorithmGraph();",
                "toAlgorithmGraph();",
            ].join("\n"),
        );
        write(
            "app/src/namespaces.ts",
            [
                'import * as A from "@graphty/algorithms";',
                'import type * as T from "@graphty/algorithms";',
                "A.dijkstra();",
                "A.indexed.dijkstra();",
                "let g: T.Graph;",
            ].join("\n"),
        );
        write(
            "app/src/dynamic.ts",
            [
                'const { circularLayout } = await import("@graphty/layout");',
                'const m = await import("@graphty/algorithms");',
                "circularLayout();",
                "new m.Graph();",
            ].join("\n"),
        );
        write(
            "app/src/reexports.ts",
            'export * from "@graphty/algorithms";\nexport * as lay from "@graphty/layout";\nexport * from "@graphty/graph-io";\n',
        );
        write(
            "graphty-element/src/data/TypesOnlyDataSource.ts",
            'import type { ImportResult } from "@graphty/graph-io";\nimport { type X } from "@graphty/graph-io/csv";\n',
        );
        write(
            "graphty-element/src/data/DOTDataSource.ts",
            'import { importDot } from "@graphty/graph-io/dot";\nconst p = { tokenize: (s) => s };\nclass DotLexer {}\n',
        );
        write(
            "graphty-element/src/data/CSVDataSource.ts",
            'import Papa from "papaparse";\nexport class CSVDataSource { private tokenize(): void {} }\n',
        );
        write(
            "graphty-element/src/data/GMLDataSource.ts",
            'import { importGml } from "@graphty/graph-io/gml";\nexport class GMLDataSource {}\n',
        );
        write("graphty-element/src/data/DataSource.ts", "export class DataSource {}\n");
        write("graphty-element/src/data/csv-variant-detection.ts", "export {};\n");
        write(
            "graphty-element/src/data/PajekDataSource.ts",
            'import "@graphty/graph-io";\nconst parsePajek = () => 0;\nfunction tokenizeLine() {}\nawait import("fast-xml-parser");\n',
        );

        const expected = [
            "app/src/uses.ts legacy-graph-bridge algorithmGraph",
            "app/src/uses.ts legacy-graph-bridge toAlgorithmGraph",
            "app/src/uses.ts legacy-graph-construction G",
            "app/src/uses.ts legacy-import Graph",
            "app/src/uses.ts legacy-import circularLayout",
            "app/src/uses.ts legacy-import dijkstra",
            "app/src/namespaces.ts legacy-import dijkstra",
            "app/src/namespaces.ts legacy-import Graph",
            "app/src/dynamic.ts legacy-import circularLayout",
            "app/src/dynamic.ts positional-layout-call circularLayout",
            "app/src/dynamic.ts legacy-import Graph",
            "app/src/dynamic.ts legacy-graph-construction Graph",
            "app/src/reexports.ts legacy-import *",
            "app/src/reexports.ts legacy-import *",
            "graphty-element/src/data/TypesOnlyDataSource.ts data-source-without-graph-io @graphty/graph-io",
            "graphty-element/src/data/PajekDataSource.ts data-source-without-graph-io @graphty/graph-io",
            "graphty-element/src/data/DOTDataSource.ts hand-written-parser tokenize",
            "graphty-element/src/data/DOTDataSource.ts hand-written-parser DotLexer",
            "app/src/uses.ts legacy-import graphToMap",
            "app/src/uses.ts legacy-import oldIndexed",
            "app/src/uses.ts legacy-import oldQueue",
            "app/src/uses.ts positional-layout-call circularLayout",
            "graphty-element/src/data/CSVDataSource.ts data-source-without-graph-io @graphty/graph-io",
            "graphty-element/src/data/CSVDataSource.ts hand-written-parser tokenize",
            "graphty-element/src/data/CSVDataSource.ts parser-dependency papaparse",
            "graphty-element/src/data/PajekDataSource.ts hand-written-parser parsePajek",
            "graphty-element/src/data/PajekDataSource.ts hand-written-parser tokenizeLine",
            "graphty-element/src/data/PajekDataSource.ts parser-dependency fast-xml-parser",
            "graphty-element/src/data/csv-variant-detection.ts hand-written-parser csv-variant-detection.ts",
        ].sort();
        const found = check(dir);
        if (JSON.stringify(found) !== JSON.stringify(expected)) {
            const missing = expected.filter((k) => !found.includes(k));
            const extra = found.filter((k) => !expected.includes(k));
            throw new Error(`self-test: missing ${JSON.stringify(missing)}, unexpected ${JSON.stringify(extra)}`);
        }
        console.log(`check-legacy-use self-test: passed (${expected.length} seeded uses, 7 rules)`);
    } finally {
        rmSync(dir, { recursive: true, force: true });
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    if (process.argv.includes("--self-test")) {
        selfTest();
        process.exit(0);
    }
    const keys = check(resolve(dirname(fileURLToPath(import.meta.url)), ".."));
    if (keys.length > 0) {
        for (const k of keys) {
            console.error(k);
        }
        console.error(
            `\n${keys.length} use(s) of the legacy graph API. Use the graph-format replacement ` +
                "(design/graph-format/migration-plan.md); see the rules at the top of tools/check-legacy-use.mjs.",
        );
        process.exit(1);
    }
    console.log("check-legacy-use: no use of the legacy graph API");
}
