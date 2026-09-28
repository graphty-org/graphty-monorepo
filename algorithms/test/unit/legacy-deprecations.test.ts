/**
 * Every legacy entry point of the package barrel is tagged @deprecated and names its replacement,
 * read from the JSDoc of the declaration the barrel re-exports. The migration plan's deprecation
 * rule: the tag names an `indexed.*` function (which must exist) or gives a recipe, and a name the
 * algorithms 3.0.0 removal release reuses says its result type changes at 3.0.0.
 */
import { join } from "node:path";

import { GraphBuilder } from "@graphty/graph-format";
import ts from "typescript";
import { describe, expect, it } from "vitest";

import * as algorithms from "../../src/index.js";

// Barrel values that are not legacy entry points.
const CURRENT = new Set(["indexed", "accelerated", "ConvergenceError", "PathWalkError", "PriorityQueue", "UnionFind"]);

interface BarrelExport {
    /** The @deprecated text, or null when the declaration has none. */
    tag: string | null;
    /** True for a type-only export. */
    typeOnly: boolean;
    /** True when the declaration lives in `src/indexed`, the code that outlives 3.0.0. */
    indexed: boolean;
}

const REMOVED = "Removed in algorithms 3.0.0.";

/**
 * Reads the @deprecated text of every export of the package barrel, types included.
 * @returns Export name to what the test needs of its declaration
 */
function deprecationsOfBarrel(): Map<string, BarrelExport> {
    const entry = join(import.meta.dirname, "../../src/index.ts");
    const program = ts.createProgram([entry], {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        noEmit: true,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry);
    if (source === undefined) {
        throw new Error("src/index.ts not found");
    }
    const moduleSymbol = checker.getSymbolAtLocation(source);
    if (moduleSymbol === undefined) {
        throw new Error("src/index.ts has no module symbol");
    }
    const indexedDir = join(import.meta.dirname, "../../src/indexed/");
    const out = new Map<string, BarrelExport>();
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
        const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        const tag = symbol.getJsDocTags(checker).find((t) => t.name === "deprecated");
        const file = symbol.declarations?.[0]?.getSourceFile().fileName ?? "";
        out.set(exported.name, {
            tag: tag ? ts.displayPartsToString(tag.text).replace(/\s+/g, " ") : null,
            typeOnly: (symbol.flags & ts.SymbolFlags.Value) === 0,
            indexed: file.startsWith(indexedDir),
        });
    }
    return out;
}

/**
 * Lists what is wrong with one @deprecated text: it must name an `indexed.*` export that exists, or
 * give a recipe after the removal notice. The notice alone names nothing.
 * @param name - The deprecated export
 * @param text - Its @deprecated text
 * @param indexedNames - Every export of the `indexed` namespace, values and types
 * @returns One line per problem
 */
function tagProblems(name: string, text: string, indexedNames: ReadonlySet<string>): string[] {
    const problems: string[] = [];
    const named = [...text.matchAll(/`indexed\.([A-Za-z]+)`/g)].map((m) => m[1]);
    const recipe = text.startsWith(REMOVED) && text.slice(REMOVED.length).trim().length > 0;
    if (named.length === 0 && !recipe) {
        problems.push(`${name}: neither a replacement nor a recipe`);
    }
    for (const target of named) {
        if (!indexedNames.has(target)) {
            problems.push(`${name}: indexed.${target} does not exist`);
        }
    }
    return problems;
}

/**
 * Reads the names the `indexed` namespace exports, types included.
 * @returns Every export name of `src/indexed/index.ts`
 */
function indexedExports(): Set<string> {
    const entry = join(import.meta.dirname, "../../src/indexed/index.ts");
    const program = ts.createProgram([entry], { moduleResolution: ts.ModuleResolutionKind.Bundler, noEmit: true });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (moduleSymbol === undefined) {
        throw new Error("src/indexed/index.ts has no module symbol");
    }
    return new Set(checker.getExportsOfModule(moduleSymbol).map((s) => s.name));
}

describe("legacy entry points are deprecated", () => {
    const barrel = deprecationsOfBarrel();
    const tags = new Map([...barrel].map(([name, e]) => [name, e.tag]));
    const legacy = Object.keys(algorithms).filter((name) => !CURRENT.has(name));
    // Type exports declared outside `src/indexed` belong to the legacy modules, except `NodeId`, which the
    // current `UnionFind` takes.
    const legacyTypes = [...barrel]
        .filter(([name, e]) => e.typeOnly && !e.indexed && name !== "NodeId")
        .map(([name]) => name);
    const indexedNames = new Set(Object.keys(algorithms.indexed));
    const indexedAll = indexedExports();

    it("covers every runtime export of the barrel", () => {
        expect(legacy.length).toBe(106);
        expect(legacy.filter((name) => !tags.has(name))).toEqual([]);
    });

    it("tags every legacy export and none of the current ones", () => {
        expect(legacy.filter((name) => tags.get(name) === null)).toEqual([]);
        expect([...CURRENT].filter((name) => (tags.get(name) ?? null) !== null)).toEqual([]);
    });

    it("tags every legacy type export", () => {
        expect(legacyTypes.length).toBe(59);
        expect(legacyTypes.filter((name) => tags.get(name) === null)).toEqual([]);
    });

    it("names an indexed replacement that exists, or a recipe", () => {
        const broken = [...legacy, ...legacyTypes].flatMap((name) =>
            tagProblems(name, tags.get(name) ?? "", indexedAll),
        );
        expect(broken).toEqual([]);
    });

    it("rejects a tag that is only the removal notice", () => {
        expect(tagProblems("x", REMOVED, indexedAll)).toEqual(["x: neither a replacement nor a recipe"]);
        expect(tagProblems("x", `${REMOVED} Use a \`Uint8Array\`.`, indexedAll)).toEqual([]);
        expect(tagProblems("x", "Use `indexed.noSuchThing`.", indexedAll)).toEqual([
            "x: indexed.noSuchThing does not exist",
        ]);
    });

    it("says the result type changes at 3.0.0 for every name the removal release reuses", () => {
        const reused = legacy.filter((name) => indexedNames.has(name));
        expect(reused.length).toBeGreaterThanOrEqual(13);
        const silent = reused.filter((name) => {
            const text = tags.get(name) ?? "";
            const replacement: unknown = (algorithms.indexed as Record<string, unknown>)[name];
            const kind =
                typeof replacement === "function" && Function.prototype.toString.call(replacement).startsWith("class")
                    ? "class"
                    : "function";
            return (
                !text.includes(`At algorithms 3.0.0 the name \`${name}\` becomes that ${kind}`) ||
                !text.includes("its result type changes")
            );
        });
        expect(silent).toEqual([]);
    });

    it("warns where the replacement does not compute the same thing", () => {
        // The legacy value subtracts the null-model term once per edge and ignores weights, so the
        // standard modularity is a different number.
        expect(tags.get("calculateMCLModularity")).toContain("no drop-in replacement");
        // indexed.bellmanFord sees only the cycles reachable from its one source.
        expect(tags.get("hasNegativeCycle")).toContain("search again from every node no earlier search reached");
    });

    it("gives a transitiveClosure recipe that survives a negative cycle and more than 5792 nodes", () => {
        const text = tags.get("transitiveClosure") ?? "";
        expect(text).toContain("`weighted: false`");
        expect(text).toContain("`maxNodes: Infinity`");
        // a -> b (1), b -> a (-3), b -> c (1): a weighted search finds a negative cycle and reports no distances.
        const b = new GraphBuilder({ directed: true });
        b.addEdge("a", "b", 1);
        b.addEdge("b", "a", -3);
        b.addEdge("b", "c", 1);
        const s = b.freeze();
        const { dist, n } = algorithms.indexed.allPairsShortestPath(s, { weighted: false, maxNodes: Infinity });
        const a = s.ids.indexOf("a");
        const reachable = [...Array(n).keys()]
            .filter((j) => Number.isFinite(dist[a * n + j]))
            .map((j) => s.ids.idOf(j));
        expect(reachable.sort()).toEqual(["a", "b", "c"]);
    });

    it("tags the barrel's PageRankOptions, which no function reads", () => {
        expect(tags.get("PageRankOptions")).toContain("Removed in algorithms 3.0.0.");
    });
});
