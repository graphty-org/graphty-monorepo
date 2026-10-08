import { describe, expect, it } from "vitest";

import { ALGORITHM_NAMES, LAYOUT_NAMES } from "../src/index.js";
import { GENERATORS } from "../src/samples.js";
import { ALGORITHM_GROUPS, GENERATOR_PRESETS, SIMULATION_LAYOUTS, STATIC_LAYOUTS } from "../stories/catalog.js";

// The Storybook demo offers what its catalog lists; these keep the catalog in step with what the extension registers,
// so a new layout, algorithm or generator cannot ship without a way to run it in the demo.
describe("the demo catalog", () => {
    it("lists every layout once", () => {
        expect([...SIMULATION_LAYOUTS, ...STATIC_LAYOUTS].sort()).toEqual([...LAYOUT_NAMES].sort());
    });

    it("lists every algorithm in exactly one group", () => {
        const listed = Object.values(ALGORITHM_GROUPS).flatMap((g) =>
            g.algorithms.map((a) => `graphty${a.charAt(0).toUpperCase()}${a.slice(1)}`),
        );
        expect(listed.sort()).toEqual([...ALGORITHM_NAMES].sort());
    });

    it("has a preset for every generator", () => {
        expect(Object.keys(GENERATOR_PRESETS).sort()).toEqual(Object.keys(GENERATORS).sort());
    });
});
