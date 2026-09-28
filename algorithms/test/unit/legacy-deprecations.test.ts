/**
 * Every legacy entry point of the package barrel is tagged @deprecated and names its replacement,
 * read from the JSDoc of the declaration the barrel re-exports. The migration plan's deprecation
 * rule: the tag names an `indexed.*` function (which must exist) or gives a recipe, and a name the
 * algorithms 3.0.0 removal release reuses says its result type changes at 3.0.0.
 */
import { join } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import * as algorithms from "../../src/index.js";

// Barrel values that are not legacy entry points.
const CURRENT = new Set(["indexed", "accelerated", "ConvergenceError", "PathWalkError", "PriorityQueue", "UnionFind"]);

/**
 * Reads the @deprecated text of every export of the package barrel.
 * @returns Export name to its @deprecated text, or null when the declaration has none
 */
function deprecationsOfBarrel(): Map<string, string | null> {
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
    const out = new Map<string, string | null>();
    for (const exported of checker.getExportsOfModule(moduleSymbol)) {
        const symbol = exported.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exported) : exported;
        const tag = symbol.getJsDocTags(checker).find((t) => t.name === "deprecated");
        out.set(exported.name, tag ? ts.displayPartsToString(tag.text).replace(/\s+/g, " ") : null);
    }
    return out;
}

describe("legacy entry points are deprecated", () => {
    const tags = deprecationsOfBarrel();
    const legacy = Object.keys(algorithms).filter((name) => !CURRENT.has(name));
    const indexedNames = new Set(Object.keys(algorithms.indexed));

    it("covers every runtime export of the barrel", () => {
        expect(legacy.length).toBe(106);
        expect(legacy.filter((name) => !tags.has(name))).toEqual([]);
    });

    it("tags every legacy export and none of the current ones", () => {
        expect(legacy.filter((name) => tags.get(name) === null)).toEqual([]);
        expect([...CURRENT].filter((name) => (tags.get(name) ?? null) !== null)).toEqual([]);
    });

    it("names an indexed replacement that exists, or a recipe", () => {
        const broken: string[] = [];
        for (const name of legacy) {
            const text = tags.get(name) ?? "";
            const named = [...text.matchAll(/`indexed\.([A-Za-z]+)`/g)].map((m) => m[1]);
            if (named.length === 0 && !text.startsWith("Removed in algorithms 3.0.0.")) {
                broken.push(`${name}: neither a replacement nor a recipe`);
            }
            for (const target of named) {
                if (!indexedNames.has(target)) {
                    broken.push(`${name}: indexed.${target} does not exist`);
                }
            }
        }
        expect(broken).toEqual([]);
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

    it("tags the barrel's PageRankOptions, which no function reads", () => {
        expect(tags.get("PageRankOptions")).toContain("Removed in algorithms 3.0.0.");
    });
});
