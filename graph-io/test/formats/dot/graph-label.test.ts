/**
 * The root graph's own label (a DOT diagram's title), read by the DOT importer's annotations() as text annotations placed where
 * Graphviz draws it. The expected places are read off Graphviz 14.1.2's drawings of the specimen sheets
 * (graph-io/test/fidelity/oracles/dot-specimen-groups-p4/-p5/-p7.svg), turned back into the file's coordinates:
 * every one of those SVGs moves the drawing by the bb's lower-left corner (17, 17).
 */

import { describe, expect, it } from "vitest";

import { dotImporter } from "../../../src/formats/dot/importer.js";
import { createRegistry } from "../../../src/registry.js";
import type { TextAnnotation } from "../../../src/styles/index.js";

async function texts(dot: string): Promise<TextAnnotation[]> {
    const { snapshot } = await createRegistry().importGraph(new TextEncoder().encode(dot), { format: "dot" });
    return (dotImporter.annotations?.(snapshot) ?? []).filter((a): a is TextAnnotation => a.kind === "text");
}

const BB = 'bb="17,17,1183,883"';

describe("DOT root graph label", () => {
    it("draws a laid-out graph's label centered below its bb by default (p5: Times 14 at x 583+17, region 24.5 tall)", async () => {
        const [t, ...rest] = await texts(`digraph { graph [${BB}, label="graph-label"]; a [pos="320,464!"]; }`);
        expect(rest).toEqual([]);
        expect(t).toMatchObject({ text: "graph-label", anchor: "center", fontSize: 14, color: "#000000" });
        expect(t.fontFamily).toMatch(/^Times/);
        expect(t.at.x).toBeCloseTo(600, 3);
        // the oracle's label region runs from y -24.5 to 0 in its moved frame: center 4.75 in the file's
        expect(Math.abs(t.at.y - 4.75)).toBeLessThan(0.5);
    });

    it("puts labeljust=r against the bb's right side (p7: centered at x 1127.25+17)", async () => {
        const [t] = await texts(`digraph { graph [${BB}, label="graph-label", labeljust="r"]; a [pos="320,464!"]; }`);
        expect(Math.abs(t.at.x - 1144.25)).toBeLessThan(1.5);
    });

    it("puts labelloc=t labeljust=l above the bb at its left side, in its own font (p4)", async () => {
        const [t] = await texts(
            `digraph { graph [${BB}, label="graph-label", labelloc="t", labeljust="l", fontsize="20", fontname="DejaVu Sans", fontcolor="#e41a1c"]; a [pos="320,464!"]; }`,
        );
        expect(t).toMatchObject({ fontSize: 20, color: "#e41a1c" });
        expect(t.fontFamily).toMatch(/^DejaVu Sans/);
        // drawn centered at x 64.62+17; the drawing grows 32 points above the bb (translate 915 against 883)
        expect(Math.abs(t.at.x - 81.62)).toBeLessThan(1.5);
        expect(Math.abs(t.at.y - (883 + 16))).toBeLessThan(0.5);
    });

    it("draws an HTML-like label's font runs side by side, each in its own font (p8)", async () => {
        const runs = await texts(
            `digraph { graph [${BB}, label=<<B>graph</B> <I>label</I> <FONT COLOR="#e41a1c">html</FONT>>, labelloc="t"]; a [pos="320,464!"]; }`,
        );
        expect(runs.map((r) => [r.text, r.bold, r.italic, r.color])).toEqual([
            ["graph", true, false, "#000000"],
            ["label", false, true, "#000000"],
            ["html", false, false, "#e41a1c"],
        ]);
        // Graphviz starts the runs at x 535.75, 574 and 604.75 (+17), the first two 34.5 and 27 wide
        const centers = [570, 604.5, 634.4];
        runs.forEach((r, i) => expect(Math.abs(r.at.x - centers[i])).toBeLessThan(3));
        expect(new Set(runs.map((r) => r.at.y)).size).toBe(1);
    });

    it("draws each line of a several-line label at its own height, around a stored lp", async () => {
        const all = await texts(
            String.raw`digraph { graph [bb="0,0,200,100", lp="100,50", label="one\n\nthree"]; a [pos="10,10"]; }`,
        );
        expect(all.map((t) => t.text)).toEqual(["one", "three"]);
        const line = 14 * 1.2;
        expect(all[0].at.y).toBeCloseTo(50 + line, 6);
        expect(all[1].at.y).toBeCloseTo(50 - line, 6);
        expect(all.every((t) => t.at.x === 100)).toBe(true);
    });

    it("places a graph that is not laid out yet against the side of its drawing that labelloc names", async () => {
        // no bb and no lp: the place is the drawing's, once it is laid out, as Graphviz's place_root_label puts it
        const [t, ...rest] = await texts(String.raw`digraph { graph [label="graph-label", labelloc="t"]; a; }`);
        expect(rest).toEqual([]);
        expect(t.at).toEqual({ x: 0, y: 0 });
        expect(t.beside).toMatchObject({ side: "top", align: "center", height: 14 * 1.2 + 8 });
        expect(t.beside?.width).toBeGreaterThan(16);
        const lines = await texts(String.raw`graph { graph [label="one\ntwo", labeljust="r"]; a; }`);
        expect(lines.map((l) => [l.text, Math.round(l.at.y * 1e6) / 1e6, l.beside?.side, l.beside?.align])).toEqual([
            ["one", 14 * 1.2 * 0.5, "bottom", "right"],
            ["two", -14 * 1.2 * 0.5, "bottom", "right"],
        ]);
    });

    it("draws nothing for a cluster's label or a graph without one", async () => {
        expect(await texts(`digraph { graph [${BB}]; subgraph cluster_x { label="c"; a [pos="320,464!"]; } }`)).toEqual(
            [],
        );
    });
});
