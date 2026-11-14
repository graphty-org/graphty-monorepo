import { describe, expect, it } from "vitest";

import { generateGraph } from "../../src/generators/index.js";
import { GENERATOR_CATALOG } from "../../src/index.js";
import { graphHash } from "../helpers/graph.js";

describe("the generator catalogue", () => {
    it("is plain data with unique names", () => {
        const names = GENERATOR_CATALOG.map((each) => each.name);
        expect(new Set(names).size).toBe(names.length);
        expect(JSON.parse(JSON.stringify(GENERATOR_CATALOG))).toEqual(GENERATOR_CATALOG);
    });

    it.each(GENERATOR_CATALOG.map((each) => [each.name]))("%s builds a small graph from its defaults", (name) => {
        const graph = generateGraph(name);
        expect(graph.nodeCount).toBeGreaterThan(0);
        expect(graph.nodeCount).toBeLessThanOrEqual(300);
        expect(graphHash(generateGraph(name))).toBe(graphHash(graph));
    });

    const bounds = GENERATOR_CATALOG.flatMap((each) =>
        each.params.flatMap((param) =>
            param.type === "integer" || param.type === "number"
                ? [param.min, param.max]
                      .filter((value): value is number => value !== undefined)
                      .map((value) => [each.name, param.name, value] as const)
                : [],
        ),
    );

    // A bound may also depend on another parameter (n above m), so when the defaults do not fit, the
    // others go to their own minimum, one at a time and then all together; what must never fail is
    // the bound itself.
    it.each(bounds)("%s takes %s at its declared bound %d", (name, param, value) => {
        const others = (GENERATOR_CATALOG.find((each) => each.name === name)?.params ?? []).flatMap((each) =>
            each.name !== param && each.name !== "seed" && each.min !== undefined
                ? [[each.name, each.min] as const]
                : [],
        );
        const tries: Record<string, number>[] = [
            {},
            ...others.map(([other, min]) => ({ [other]: min })),
            Object.fromEntries(others),
        ];
        let error: unknown;
        for (const params of tries.map((each) => ({ ...each, [param]: value }))) {
            try {
                generateGraph(name, params);
                return;
            } catch (thrown) {
                error = thrown;
            }
        }
        expect((error as Error).message).not.toMatch(new RegExp(`^${param} must be`));
    });

    it("builds the smallest graph each classic family has", () => {
        expect(generateGraph("cycle", { n: 3 }).nodeCount).toBe(3);
        expect(generateGraph("wheel", { n: 4 }).nodeCount).toBe(4);
        expect(generateGraph("mobius-ladder", { n: 3 }).nodeCount).toBe(6);
        expect(generateGraph("lollipop", { cliqueSize: 2, pathLength: 0 }).nodeCount).toBe(2);
    });

    it("takes a parameter and changes the graph with the seed", () => {
        const graph = generateGraph("erdos-renyi", { n: 40, p: 0.1 });
        expect(graph.nodeCount).toBe(40);
        expect(graphHash(generateGraph("erdos-renyi", { n: 40, p: 0.1, seed: 1 }))).not.toBe(graphHash(graph));
        expect(generateGraph("named", { name: "heawood" }).nodeCount).toBe(14);
    });

    it("refuses an unknown generator, an unknown parameter and a value out of range", () => {
        expect(() => generateGraph("erdos-reny")).toThrow(/unknown generator "erdos-reny"/);
        expect(() => generateGraph("cycle", { seed: 1 })).toThrow(/unknown parameter seed; the parameters are n/);
        expect(() => generateGraph("erdos-renyi", { p: 2 })).toThrow(/p must be a number in \[0, 1\], not 2/);
        expect(() => generateGraph("cycle", { n: 2.5 })).toThrow(/n must be an integer/);
        expect(() => generateGraph("grid", { periodic: 1 })).toThrow(/periodic must be true or false/);
        expect(() => generateGraph("named", { name: "nope" })).toThrow(/name must be one of bull/);
        expect(() => generateGraph("petersen", { n: 3 })).toThrow(/the parameters are none/);
    });
});
