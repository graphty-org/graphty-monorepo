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
