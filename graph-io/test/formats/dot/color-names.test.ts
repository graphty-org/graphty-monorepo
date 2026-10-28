import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { graphvizColor } from "../../../src/styles/canon/graphviz.js";

// Every color Graphviz documents (X11, SVG and Brewer), as Graphviz 14.1.2 draws it: measured by
// test/fidelity/generators/specimens/graphviz_colors.py. The specimen sheets draw a few of each; this checks them all.
const measured = JSON.parse(
    readFileSync(new URL("../../fidelity/generators/specimens/graphviz-colors.json", import.meta.url), "utf8"),
) as Record<"x11" | "svg" | "brewer", Record<string, string>>;

/**
 * The colors graph-io reads differently from Graphviz.
 * @param scheme - x11, svg or brewer
 * @returns "name: graph-io -> Graphviz" for each difference
 */
function differences(scheme: "x11" | "svg" | "brewer"): string[] {
    return (
        Object.entries(measured[scheme])
            .map(([name, hex]) => {
                // A Brewer key is already "scheme/index".
                const value = scheme === "brewer" ? `/${name}` : `/${scheme}/${name}`;
                return [name, graphvizColor(value, null, "fill"), hex] as const;
            })
            // Graphviz writes a transparent color as #rrggbb00.
            .filter(
                ([, got, hex]) =>
                    got.unknown || got.hex !== hex.slice(0, 7) || (hex.length === 9) !== (got.alpha === 0),
            )
            .map(([name, got, hex]) => `${name}: ${got.unknown ? "unknown" : got.hex} -> ${hex}`)
    );
}

// Open import gaps, in graph-io/test/fidelity/oracles/ISSUES.md ("Specimen sheets: Graphviz DOT"): names Graphviz
// 14.1.2 knows and graph-io's X11 table (measured on Graphviz 2.43) does not, drawn black. Delete each line once
// graph-io reads it.
const OPEN: Record<"x11" | "svg" | "brewer", string[]> = {
    x11: [],
    svg: [],
    brewer: [],
};

describe("DOT color names: every documented color reads as Graphviz draws it", () => {
    for (const scheme of ["x11", "svg", "brewer"] as const) {
        it(`${scheme}: ${Object.keys(measured[scheme]).length} colors`, () => {
            expect(differences(scheme)).toEqual(OPEN[scheme]);
        });
    }
});
