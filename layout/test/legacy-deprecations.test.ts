/**
 * The 16 positional layouts and the two PositionMap rescalers are tagged @deprecated, each naming
 * a replacement that exists, read from the JSDoc of the declaration the package barrel re-exports.
 */
import { join } from "node:path";

import ts from "typescript";
import { assert, describe, it } from "vitest";

import * as layout from "../src";

const POSITIONAL = [
    "arfLayout",
    "bfsLayout",
    "bipartiteLayout",
    "circularLayout",
    "forceatlas2Layout",
    "fruchtermanReingoldLayout",
    "gridLayout",
    "kamadaKawaiLayout",
    "multipartiteLayout",
    "planarLayout",
    "radialLayout",
    "randomLayout",
    "shellLayout",
    "spectralLayout",
    "spiralLayout",
    "springLayout",
];
const RESCALERS = ["rescaleLayout", "rescaleLayoutDict"];

/**
 * Reads the @deprecated text of every export of the package barrel.
 * @returns Export name to its @deprecated text, or null when the declaration has none
 */
function deprecationsOfBarrel(): Map<string, string | null> {
    const entry = join(import.meta.dirname, "../src/index.ts");
    const program = ts.createProgram([entry], {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        target: ts.ScriptTarget.ES2022,
        noEmit: true,
    });
    const checker = program.getTypeChecker();
    const source = program.getSourceFile(entry);
    const moduleSymbol = source && checker.getSymbolAtLocation(source);
    if (!moduleSymbol) {
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

describe("legacy layout entry points are deprecated", () => {
    const tags = deprecationsOfBarrel();

    it("tags each positional layout with an indexed layout that exists", () => {
        for (const name of POSITIONAL) {
            assert.isFunction((layout as Record<string, unknown>)[name], name);
            const text = tags.get(name) ?? "";
            const target = /`indexed\.([A-Za-z0-9]+)`/.exec(text)?.[1];
            assert.isDefined(target, `${name} names no replacement: "${text}"`);
            assert.isFunction(
                (layout.indexed as Record<string, unknown>)[target ?? ""],
                `${name} -> indexed.${target}`,
            );
            assert.include(text, "Removed in layout 2.0.0", name);
        }
    });

    it("tags the PositionMap rescalers with rescaleInPlace", () => {
        assert.isFunction(layout.rescaleInPlace);
        for (const name of RESCALERS) {
            assert.include(tags.get(name) ?? "", "`rescaleInPlace`", name);
        }
    });

    it("leaves the snapshot API and the position conversions untagged", () => {
        for (const name of [
            "indexed",
            "toPositionMap",
            "fromPositionMap",
            "toPositionColumn",
            "rescaleInPlace",
            "createSimulation",
        ]) {
            assert.isTrue(tags.has(name), name);
            assert.isNull(tags.get(name), name);
        }
    });
});
