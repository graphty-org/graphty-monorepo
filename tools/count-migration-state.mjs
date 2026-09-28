#!/usr/bin/env node
/**
 * Prints the counts that the Summary and "Migration state" tables of design/graph-format/STATUS.md
 * report, so each one can be checked against a commit instead of copied from an earlier edit.
 *
 * Needs a build of algorithms (`pnpm exec nx run algorithms:build`): the indexed namespace and
 * the dispatcher are read from algorithms/dist. Everything else is read from source.
 *
 * Usage: node tools/count-migration-state.mjs   (from the repository root)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

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
for (const exported of exportsOf(join(ALG_SRC, "index.ts"))) {
    const symbol = resolve(exported);
    const decl = symbol.declarations?.[0];
    if (decl === undefined || !legacyFile(algPath(decl.getSourceFile())) || CSR_HELPERS.has(exported.name)) {
        continue;
    }
    if (symbol.flags & ts.SymbolFlags.Class) {
        legacyClasses.push(exported.name);
    } else if (symbol.flags & ts.SymbolFlags.Function) {
        (reachesIndexed(symbol) ? delegating : legacyOnly).push(exported.name);
    }
}
print("legacy functions reaching a port", delegating);
print("legacy functions not reaching a port", legacyOnly);
print("legacy classes", legacyClasses);

// @deprecated exports.
for (const [name, file] of [
    ["algorithms", join(ALG_SRC, "index.ts")],
    ["layout", join(root, "layout/src/index.ts")],
]) {
    const tagged = exportsOf(file).filter((e) =>
        [e, resolve(e)].some((s) => s.getJsDocTags().some((t) => t.name === "deprecated")),
    );
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
const onDispatcher = (f) => /\baccelerated\(/.test(adapterText(f));
print("algorithm adapters", adapters.length);
print("adapters on the dispatcher", adapters.filter(onDispatcher).map(adapterName));
print(
    "adapters calling indexed.* directly",
    adapters.filter((f) => !onDispatcher(f) && /\bindexed\./.test(adapterText(f))).map(adapterName),
);
print(
    "adapters building a legacy Graph",
    adapters
        .filter((f) => /\balgorithmGraph\(|new AlgorithmGraph\b|toAlgorithmGraph\(/.test(adapterText(f)))
        .map(adapterName),
);
const layoutDir = join(root, "graphty-element/src/layout");
const layoutText = (f) => readFileSync(join(layoutDir, f), "utf8");
const engines = readdirSync(layoutDir).filter(
    (f) => f.endsWith(".ts") && /extends SimpleLayoutEngine\b/.test(layoutText(f)),
);
print("SimpleLayoutEngine subclasses", engines);
print(
    "of them calling a @graphty/layout layout",
    engines.filter((f) => /import \{ [a-zA-Z0-9]+ \} from "@graphty\/layout"/.test(layoutText(f))),
);
const dataDir = join(root, "graphty-element/src/data");
const sources = readdirSync(dataDir).filter((f) => /DataSource\.ts$/.test(f) && f !== "DataSource.ts");
print("data sources", sources);
print(
    "data sources importing @graphty/graph-io",
    sources.filter((f) =>
        /^import \{[^}]*\} from "@graphty\/graph-io(\/[a-z0-9-]+)?";/m.test(readFileSync(join(dataDir, f), "utf8")),
    ),
);

// The legacy-use baseline of tools/check-legacy-use.mjs.
const baseline = JSON.parse(readFileSync(join(root, "tools/legacy-use-baseline.json"), "utf8"));
const byRule = {};
for (const [key, count] of Object.entries(baseline)) {
    const rule = key.split(" ")[1];
    byRule[rule] = (byRule[rule] ?? 0) + count;
}
print("legacy-use baseline entries", Object.keys(baseline).length);
print(
    "legacy-use baseline uses",
    Object.values(baseline).reduce((a, c) => a + c, 0),
);
print("legacy-use baseline uses by rule", JSON.stringify(byRule));
