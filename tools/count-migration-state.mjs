#!/usr/bin/env node
/**
 * Prints the counts that the Summary and "Migration state" tables of design/graph-format/STATUS.md
 * report, so each one can be checked against a commit instead of copied from an earlier edit.
 *
 * Needs a build of algorithms (`pnpm exec nx run algorithms:build`): the indexed namespace and
 * the dispatcher are read from algorithms/dist. Everything else is read from source.
 *
 * Usage: node tools/count-migration-state.mjs              (from the repository root)
 *        node tools/count-migration-state.mjs --self-test  (prove the import and run-callback readers; no build needed)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import { isDeprecated } from "./check-legacy-use.mjs";

const root = process.cwd();
const ALG_SRC = join(root, "algorithms/src");
// Exported from the algorithms barrel as functions but not algorithms: the optimisation settings and CSR helpers.
const CSR_HELPERS = new Set([
    "configureOptimizations",
    "getOptimizationConfig",
    "createOptimizedGraph",
    "isCSRGraph",
    "toCSRGraph",
]);

/**
 * Prints one count.
 * @param label - what is counted
 * @param value - a list (printed as its length and its members) or a single value
 */
function print(label, value) {
    console.log(`${label}: ${Array.isArray(value) ? `${value.length} -- ${value.join(", ")}` : value}`);
}

/**
 * Whether an algorithms source file (path relative to algorithms/src) holds legacy code; the same
 * rule as tools/check-legacy-use.mjs.
 * @param path - the path, with forward slashes
 * @returns true for legacy code
 */
function legacyFile(path) {
    if (path === "utils/graph-converters.ts") {
        return true;
    }
    return !["indexed/", "data-structures/", "types/", "utils/", "errors.ts"].some((p) => path.startsWith(p));
}

/**
 * The value names a source file imports from the modules a pattern matches, read from the syntax
 * tree so that the import's layout (one line or several, one name or many, a default name) does
 * not matter. Type-only imports and type-only specifiers are left out: they load no code.
 * @param text - the source text
 * @param moduleRe - matches the module specifiers to read
 * @returns the imported names, as the exporting module spells them
 */
function valueImports(text, moduleRe) {
    const names = [];
    const file = ts.createSourceFile("x.ts", text, ts.ScriptTarget.ESNext);
    for (const st of file.statements) {
        if (!ts.isImportDeclaration(st) || !moduleRe.test(st.moduleSpecifier.text)) {
            continue;
        }
        const clause = st.importClause;
        if (clause === undefined) {
            names.push("*side-effect*");
            continue;
        }
        if (clause.isTypeOnly) {
            continue;
        }
        if (clause.name !== undefined) {
            names.push("default");
        }
        const bindings = clause.namedBindings;
        if (bindings !== undefined && ts.isNamespaceImport(bindings)) {
            names.push("*");
        } else if (bindings !== undefined) {
            for (const el of bindings.elements) {
                if (!el.isTypeOnly) {
                    names.push((el.propertyName ?? el.name).text);
                }
            }
        }
    }
    return names;
}

/**
 * What the run callbacks of an algorithm adapter call. A run callback is a function handed to the
 * `run` that `accelerated()` returns: written inline (`run((dispatch, s) => ...)`) or bound to a
 * name first (`work = (dispatch, s) => ...; run(work)`). Only the callbacks are read, so a port
 * called before `run` (to check the input, say) is not counted as a port call inside one.
 * @param text - the adapter's source text
 * @returns whether a callback calls a member of its first parameter (the dispatcher), and the
 *   `@graphty/algorithms` imports (or `indexed.` members) a callback calls
 */
function runCallbackCalls(text) {
    const file = ts.createSourceFile("x.ts", text, ts.ScriptTarget.ESNext, true);
    const ports = new Set();
    for (const st of file.statements) {
        if (ts.isImportDeclaration(st) && st.moduleSpecifier.text === "@graphty/algorithms") {
            const b = st.importClause?.namedBindings;
            if (st.importClause?.isTypeOnly !== true && b !== undefined && ts.isNamedImports(b)) {
                b.elements.filter((el) => !el.isTypeOnly).forEach((el) => ports.add(el.name.text));
            }
        }
    }
    const isFn = (n) => n !== undefined && (ts.isArrowFunction(n) || ts.isFunctionExpression(n));
    const named = new Map();
    const callbacks = [];
    const collect = (n) => {
        if (ts.isBinaryExpression(n) && n.operatorToken.kind === ts.SyntaxKind.EqualsToken && isFn(n.right)) {
            named.set(n.left.getText(file), [...(named.get(n.left.getText(file)) ?? []), n.right]);
        }
        if (ts.isVariableDeclaration(n) && isFn(n.initializer)) {
            named.set(n.name.getText(file), [...(named.get(n.name.getText(file)) ?? []), n.initializer]);
        }
        if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === "run") {
            callbacks.push(n.arguments[0]);
        }
        ts.forEachChild(n, collect);
    };
    collect(file);
    const fns = callbacks.flatMap((a) =>
        isFn(a) ? [a] : a !== undefined && ts.isIdentifier(a) ? (named.get(a.text) ?? []) : [],
    );
    let dispatcher = false;
    const portCalls = [];
    for (const fn of fns) {
        const param = fn.parameters[0]?.name.getText(file);
        const visit = (n) => {
            if (ts.isCallExpression(n)) {
                const callee = n.expression;
                if (
                    (ts.isPropertyAccessExpression(callee) || ts.isElementAccessExpression(callee)) &&
                    callee.expression.getText(file) === param
                ) {
                    dispatcher = true;
                } else if (ts.isIdentifier(callee) && ports.has(callee.text)) {
                    portCalls.push(callee.text);
                } else if (ts.isPropertyAccessExpression(callee) && callee.expression.getText(file) === "indexed") {
                    portCalls.push(callee.getText(file));
                }
            }
            ts.forEachChild(n, visit);
        };
        visit(fn.body);
    }
    return { dispatcher, portCalls };
}

const LAYOUT_RE = /^@graphty\/layout$/;
const GRAPH_IO_RE = /^@graphty\/graph-io(\/[a-z0-9-]+)?$/;

if (process.argv.includes("--self-test")) {
    const cases = [
        ['import { circular } from "@graphty/layout";', LAYOUT_RE, ["circular"]],
        ['import { circular, toPositionMap } from "@graphty/layout";', LAYOUT_RE, ["circular", "toPositionMap"]],
        ['import {\n    circular,\n    shell,\n} from "@graphty/layout";', LAYOUT_RE, ["circular", "shell"]],
        ['import type { LayoutResult } from "@graphty/layout";', LAYOUT_RE, []],
        ['import { type LayoutResult, grid } from "@graphty/layout";', LAYOUT_RE, ["grid"]],
        ['import { circular } from "@graphty/layout-extra";', LAYOUT_RE, []],
        ['import gexf from "@graphty/graph-io/gexf";', GRAPH_IO_RE, ["default"]],
        ['import * as io from "@graphty/graph-io";', GRAPH_IO_RE, ["*"]],
        ['import { importGraphML as read } from "@graphty/graph-io/graphml";', GRAPH_IO_RE, ["importGraphML"]],
    ];
    for (const [text, re, want] of cases) {
        const got = valueImports(text, re);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
            console.error(
                `count-migration-state self-test: ${JSON.stringify(text)} gave ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
            );
            process.exit(1);
        }
    }
    const imp = 'import { primMST, isBipartite } from "@graphty/algorithms";\n';
    const runCases = [
        ["run((dispatch, s) => dispatch.primMST(s));", { dispatcher: true, portCalls: [] }],
        ["run((d, s) => d[member](s));", { dispatcher: true, portCalls: [] }],
        ["run((dispatch, s) => primMST(s));", { dispatcher: false, portCalls: ["primMST"] }],
        [
            "run((dispatch, s) => { dispatch.primMST(s); return primMST(s); });",
            { dispatcher: true, portCalls: ["primMST"] },
        ],
        ["isBipartite(x); run((dispatch, s) => dispatch.m(s));", { dispatcher: true, portCalls: [] }],
        ["let work; work = (dispatch, s) => primMST(s); run(work);", { dispatcher: false, portCalls: ["primMST"] }],
        ["run((dispatch, s) => indexed.primMST(s));", { dispatcher: false, portCalls: ["indexed.primMST"] }],
        ["// dispatch.primMST(s)\nrun((dispatch, s) => primMST(s));", { dispatcher: false, portCalls: ["primMST"] }],
    ];
    for (const [text, want] of runCases) {
        const got = runCallbackCalls(imp + text);
        if (JSON.stringify(got) !== JSON.stringify(want)) {
            console.error(
                `count-migration-state self-test: ${JSON.stringify(text)} gave ${JSON.stringify(got)}, want ${JSON.stringify(want)}`,
            );
            process.exit(1);
        }
    }
    console.log("count-migration-state self-test: passed");
    process.exit(0);
}

/**
 * Whether a value is a class rather than a plain function.
 * @param value - the value
 * @returns true for a class
 */
function isClass(value) {
    return typeof value === "function" && /^class\b/.test(Function.prototype.toString.call(value));
}

// The indexed namespace and the dispatcher, from the build.
const alg = await import(pathToFileURL(join(root, "algorithms/dist/algorithms.js")).href);
const indexed = Object.entries(alg.indexed);
print(
    "indexed functions",
    indexed.filter(([, v]) => typeof v === "function" && !isClass(v)).map(([k]) => k),
);
print(
    "indexed classes",
    indexed.filter(([, v]) => isClass(v)).map(([k]) => k),
);
const dispatcher = alg.accelerated(null);
print(
    "dispatcher methods",
    Object.keys(dispatcher).filter((k) => typeof dispatcher[k] === "function"),
);
const notPorts = new Set(["index.ts", "facade.ts", "accelerator.ts", "to-snapshot.ts"]);
print(
    "port files in algorithms/src/indexed",
    readdirSync(join(ALG_SRC, "indexed")).filter((f) => f.endsWith(".ts") && !notPorts.has(f)),
);

// The legacy functions and classes of the algorithms barrel, and which reach the indexed code.
const program = ts.createProgram([join(ALG_SRC, "index.ts"), join(root, "layout/src/index.ts")], {
    noEmit: true,
    skipLibCheck: true,
    noLib: true,
    types: [],
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
});
const checker = program.getTypeChecker();
const algPath = (sourceFile) => relative(ALG_SRC, sourceFile.fileName).split(sep).join("/");
const resolve = (symbol) => (symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol);
const exportsOf = (file) => checker.getExportsOfModule(checker.getSymbolAtLocation(program.getSourceFile(file)));

const reachesMemo = new Map();
/**
 * Whether a legacy function reaches the indexed code: its body names an export of
 * algorithms/src/indexed, or calls another legacy function that does (a wrapper such as
 * pageRankCentrality over pageRank).
 * @param symbol - the function's symbol
 * @returns true when it reaches a port
 */
function reachesIndexed(symbol) {
    if (reachesMemo.has(symbol)) {
        return reachesMemo.get(symbol);
    }
    reachesMemo.set(symbol, false);
    let reaches = false;
    const visit = (node) => {
        if (reaches) {
            return;
        }
        if (ts.isIdentifier(node)) {
            const target = checker.getSymbolAtLocation(node);
            const resolved = target === undefined ? undefined : resolve(target);
            const decl = resolved?.declarations?.[0];
            if (decl !== undefined) {
                const path = algPath(decl.getSourceFile());
                if (path.startsWith("indexed/")) {
                    reaches = true;
                } else if (
                    resolved !== symbol &&
                    legacyFile(path) &&
                    (resolved.flags & ts.SymbolFlags.Function) !== 0 &&
                    reachesIndexed(resolved)
                ) {
                    reaches = true;
                }
            }
        }
        ts.forEachChild(node, visit);
    };
    for (const decl of symbol.declarations ?? []) {
        visit(decl);
    }
    reachesMemo.set(symbol, reaches);
    return reaches;
}

const delegating = [];
const legacyOnly = [];
const legacyClasses = [];
const legacyClassesReaching = [];
for (const exported of exportsOf(join(ALG_SRC, "index.ts"))) {
    const symbol = resolve(exported);
    const decl = symbol.declarations?.[0];
    if (decl === undefined || !legacyFile(algPath(decl.getSourceFile())) || CSR_HELPERS.has(exported.name)) {
        continue;
    }
    if (symbol.flags & ts.SymbolFlags.Class) {
        legacyClasses.push(exported.name);
        if (reachesIndexed(symbol)) {
            legacyClassesReaching.push(exported.name);
        }
    } else if (symbol.flags & ts.SymbolFlags.Function) {
        (reachesIndexed(symbol) ? delegating : legacyOnly).push(exported.name);
    }
}
print("legacy functions reaching a port", delegating);
print("legacy functions not reaching a port", legacyOnly);
print("legacy classes", legacyClasses);
print("legacy classes reaching a port", legacyClassesReaching);

// @deprecated exports.
for (const [name, file] of [
    ["algorithms", join(ALG_SRC, "index.ts")],
    ["layout", join(root, "layout/src/index.ts")],
]) {
    const tagged = exportsOf(file).filter((e) => isDeprecated(e, resolve(e)));
    print(
        `${name} @deprecated exports`,
        tagged.map((e) => e.name),
    );
}

// graphty-element: algorithm adapters, static layout engines, data sources.
const adapterDir = join(root, "graphty-element/src/algorithms");
const adapters = readdirSync(adapterDir).filter((f) => /Algorithm\.ts$/.test(f) && f !== "Algorithm.ts");
const adapterText = (f) => readFileSync(join(adapterDir, f), "utf8");
const adapterName = (f) => f.replace("Algorithm.ts", "");
// On the dispatcher: enters accelerated(), a run callback calls a dispatcher member
// (dispatch.primMST(...), dispatch[member](...)), and no run callback calls a port it imported.
const onDispatcher = (f) => {
    const calls = runCallbackCalls(adapterText(f));
    return /\baccelerated\(/.test(adapterText(f)) && calls.dispatcher && calls.portCalls.length === 0;
};
print("algorithm adapters", adapters.length);
print("adapters on the dispatcher", adapters.filter(onDispatcher).map(adapterName));
print(
    "adapters calling a port inside a run callback",
    adapters
        .map((f) => ({ f, calls: runCallbackCalls(adapterText(f)).portCalls }))
        .filter(({ calls }) => calls.length > 0)
        .map(({ f, calls }) => `${adapterName(f)} (${calls.join(" ")})`),
);
// A port is a top-level @graphty/algorithms export since algorithms 3.0 (indexed.* before it).
const callsPort = (f) =>
    /\bindexed\./.test(adapterText(f)) || valueImports(adapterText(f), /^@graphty\/algorithms$/).length > 0;
print(
    "adapters calling a snapshot port directly",
    adapters.filter((f) => !onDispatcher(f) && callsPort(f)).map(adapterName),
);
print(
    "adapters on neither (compute over the snapshot themselves)",
    adapters.filter((f) => !onDispatcher(f) && !callsPort(f)).map(adapterName),
);
const buildsLegacy = adapters.filter((f) =>
    /\balgorithmGraph\(|new AlgorithmGraph\b|toAlgorithmGraph\(/.test(adapterText(f)),
);
print("adapters building a legacy Graph", buildsLegacy.map(adapterName));
const legacyOnlyAdapters = buildsLegacy.filter((f) => !onDispatcher(f));
print("adapters building a legacy Graph and not on the dispatcher", legacyOnlyAdapters.map(adapterName));
print(
    "of them calling algorithmGraph()",
    legacyOnlyAdapters.filter((f) => /\balgorithmGraph\(/.test(adapterText(f))).map(adapterName),
);
print(
    "of them constructing a legacy Graph by hand",
    legacyOnlyAdapters.filter((f) => /\bnew AlgorithmGraph\b/.test(adapterText(f))).map(adapterName),
);
const reachingNames = new Set(delegating);
print(
    "of them importing a legacy function that reaches a port",
    legacyOnlyAdapters
        .map((f) => {
            const used = valueImports(adapterText(f), /^@graphty\/algorithms$/).filter((n) => reachingNames.has(n));
            return used.length === 0 ? undefined : `${adapterName(f)} (${used.join(" ")})`;
        })
        .filter((x) => x !== undefined),
);
const layoutDir = join(root, "graphty-element/src/layout");
const layoutText = (f) => readFileSync(join(layoutDir, f), "utf8");
const engines = readdirSync(layoutDir).filter(
    (f) =>
        f.endsWith(".ts") &&
        /\bexport class \w+ extends (SimpleLayoutEngine|SnapshotLayoutEngine)\b/.test(layoutText(f)),
);
print("static layout engines (SimpleLayoutEngine or SnapshotLayoutEngine subclasses)", engines);
print(
    "of them on the snapshot layout contract (SnapshotLayoutEngine)",
    engines.filter((f) => /\bexport class \w+ extends SnapshotLayoutEngine\b/.test(layoutText(f))),
);
print(
    "of them calling a @graphty/layout layout",
    engines.filter((f) => valueImports(layoutText(f), LAYOUT_RE).length > 0),
);
const dataDir = join(root, "graphty-element/src/data");
const sources = readdirSync(dataDir).filter((f) => /DataSource\.ts$/.test(f) && f !== "DataSource.ts");
print("data sources", sources);
print(
    "data sources importing @graphty/graph-io",
    sources.filter((f) => valueImports(readFileSync(join(dataDir, f), "utf8"), GRAPH_IO_RE).length > 0),
);
