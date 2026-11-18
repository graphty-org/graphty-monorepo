import { describe, expect, it } from "vitest";

import * as generators from "../../src/generators/index.js";
import { GENERATOR_CATALOG } from "../../src/index.js";

/**
 * Exported functions that are not generators the catalogue lists: helpers that take or return
 * something other than a whole graph from a few numbers, and the catalogue runner itself.
 */
const NOT_IN_CATALOG = new Set([
    "generateGraph",
    "powerLawDegreeSequence",
    "addPathologicalEdges",
    "withWeights",
    "randomMultigraph",
    "edgeCaseGraph",
]);

/**
 * The catalogue name of a generator function: its name in kebab case, without "Graph".
 * @param fn - the function's name
 * @returns the catalogue name
 */
function catalogName(fn: string): string {
    return fn
        .replace(/Graph$/, "")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .replace(/([a-z])([0-9])/g, "$1-$2")
        .toLowerCase();
}

describe("the generator catalogue lists every exported generator", () => {
    const names = new Set(GENERATOR_CATALOG.map((each) => each.name));
    const exported = Object.entries(generators)
        .filter(([fn, value]) => typeof value === "function" && !NOT_IN_CATALOG.has(fn))
        .map(([fn]) => fn);

    it.each(exported.map((fn) => [fn, catalogName(fn)]))("%s is listed as %s", (_fn, name) => {
        expect(names.has(name)).toBe(true);
    });
});
