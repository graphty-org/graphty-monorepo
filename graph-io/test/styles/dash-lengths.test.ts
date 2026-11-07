/**
 * Dash patterns as each program draws them: the writing program's own pattern per line style (`ToolDefaults.dashes`).
 */
import { describe, expect, it } from "vitest";

import { toolDefaults } from "../../src/styles/defaults.js";

describe("dash patterns", () => {
    it("draws each program's dashed and dotted lines in its own pattern", () => {
        const at = (tool: string, style: "dashed" | "dotted" | "long-dash", width: number): unknown =>
            toolDefaults(tool)?.dashes?.[style]?.value(width);
        expect(at("yed", "dashed", 2)).toEqual({ dash: 12, gap: 4 });
        expect(at("yed", "dotted", 3)).toEqual({ dash: 3, gap: 9 });
        // Graphviz's are the same at any width
        expect(at("graphviz", "dashed", 3)).toEqual({ dash: 5, gap: 2 });
        expect(at("graphviz", "dotted", 1.5)).toEqual({ dash: 1, gap: 5 });
        expect(at("cytoscape", "dashed", 3)).toEqual({ dash: 6, gap: 6 });
        expect(at("cytoscape", "long-dash", 3)).toEqual({ dash: 12, gap: 6 });
        expect(at("pajek", "dotted", 6)).toEqual({ dash: 5, gap: 5 });
        // a program whose files carry their own arrays has none yet
        expect(toolDefaults("vis-network")?.dashes).toBeUndefined();
        expect(toolDefaults("cytoscape-js")?.dashes).toBeUndefined();
    });
});
