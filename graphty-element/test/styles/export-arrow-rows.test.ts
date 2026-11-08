/**
 * yEd's arrows of several pieces are drawn as an end cap and a stack behind it, and several share an end cap (#5908):
 * an export through the layers reads the whole stack, so each is written as the arrow it came from.
 */
import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../session";
import { exportSession } from "../../src/data/export";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

/** yEd's arrows of several pieces, and the ones that share an end cap with them. */
const YED_ARROWS = [
    "skewed_dash",
    "dash",
    "crows_foot_one",
    "crows_foot_one_mandatory",
    "crows_foot_one_optional",
    "crows_foot_optional",
    "crows_foot_many",
    "crows_foot_many_mandatory",
    "crows_foot_many_optional",
    "white_delta",
    "white_delta_bar",
];

/**
 * A yEd file of one edge per arrow, the arrow at its target and, on the edge after it, at its source.
 * @param arrows - The arrows.
 * @param width - The lines' width.
 * @returns The file.
 */
function yedFile(arrows: readonly string[], width = 1): string {
    const edges = arrows.map((arrow, i) => {
        const source = arrows[(i + 1) % arrows.length];
        return `<edge id="e${String(i)}" source="a" target="b"><data key="d1"><y:PolyLineEdge><y:LineStyle color="#000000" type="line" width="${String(width)}"/><y:Arrows source="${source}" target="${arrow}"/></y:PolyLineEdge></data></edge>`;
    });
    return `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns" xmlns:y="http://www.yworks.com/xml/graphml">
  <key for="node" id="d0" yfiles.type="nodegraphics"/>
  <key for="edge" id="d1" yfiles.type="edgegraphics"/>
  <graph edgedefault="directed" id="G">
    <node id="a"><data key="d0"><y:ShapeNode><y:Geometry height="30" width="30" x="0" y="0"/><y:Shape type="ellipse"/></y:ShapeNode></data></node>
    <node id="b"><data key="d0"><y:ShapeNode><y:Geometry height="30" width="30" x="200" y="0"/><y:Shape type="ellipse"/></y:ShapeNode></data></node>
    ${edges.join("\n    ")}
  </graph>
</graphml>`;
}

/**
 * A file read with its styles and written again through the layers.
 * @param file - The file.
 * @param type - Its format.
 * @param format - The format written.
 * @param options - The writer's options.
 * @returns What is written.
 */
async function rewritten(
    file: string,
    type = "graphml",
    format = "graphml",
    options: Readonly<Record<string, unknown>> = {},
): Promise<string> {
    const session = createGraphSession();
    await session.data.import({ type, config: { data: file } }, { styles: "file" });
    const text = await exportSession(session, format, { ...options, styles: true }).text();
    session.dispose();
    return text;
}

/**
 * The arrows of a yEd file written through the layers.
 * @param file - The file.
 * @returns Each `y:Arrows` element's source and target.
 */
async function arrowsOf(file: string): Promise<string[][]> {
    const text = await rewritten(file);
    return [...text.matchAll(/<y:Arrows source="([^"]*)" target="([^"]*)"/g)].map((m) => [m[1], m[2]]);
}

describe("an export through the layers", () => {
    for (const width of [1, 3]) {
        it(`writes each of yEd's arrows as the arrow it came from, at both ends, on a line ${String(width)} wide`, async () => {
            const written = await arrowsOf(yedFile(YED_ARROWS, width));
            assert.deepEqual(
                written.map(([, target]) => target),
                YED_ARROWS,
            );
            assert.deepEqual(
                written.map(([source]) => source),
                [...YED_ARROWS.slice(1), YED_ARROWS[0]],
            );
        });
    }

    it("writes the same arrows again from the file it wrote", async () => {
        const first = await rewritten(yedFile(YED_ARROWS));
        assert.strictEqual(await rewritten(first), first);
    });

    it("keeps a file of one such arrow's every edge as that arrow", async () => {
        const written = await arrowsOf(yedFile(["skewed_dash", "skewed_dash"]));
        assert.deepEqual(written, [
            ["skewed_dash", "skewed_dash"],
            ["skewed_dash", "skewed_dash"],
        ]);
    });

    it("keeps Graphviz's crow with a ring behind it a crow, which draws the same caps as yEd's row", async () => {
        const text = await rewritten("digraph { a -> b [arrowhead=crowodot]; }", "dot");
        assert.include(text, 'target="crows_foot_many"');
    });

    it("writes yEd's arrows into GML, which spells them too", async () => {
        const text = await rewritten(yedFile(["crows_foot_many_optional"]), "graphml", "gml", {
            sanitizeIds: "mangle",
            sanitizeKeys: "mangle",
        });
        assert.include(text, 'targetArrow "crows_foot_many_optional"');
    });

    it("writes the end cap into a format that has no name for yEd's arrow", async () => {
        const rows = ["crows_foot_many_optional", "crows_foot_many_mandatory", "white_delta_bar"];
        const text = await rewritten(yedFile(rows), "graphml", "dot");
        assert.deepEqual(
            [...text.matchAll(/arrowhead="?(\w+)/g)].map((m) => m[1]),
            ["crow", "crow", "onormal"],
        );
    });

    it("keeps a stem with no row behind it as it was written", async () => {
        const session = createGraphSession();
        await session.data.import({ type: "graphml", config: { data: yedFile(["none"]) } }, { styles: "file" });
        await session.styles.add({
            name: "stem",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHead": "stem" },
        });
        const text = await exportSession(session, "graphml", { styles: true }).text();
        session.dispose();
        assert.include(text, 'target="crows_foot_one"');
    });
});

describe("an export of Graphviz's arrows of several shapes through the layers (#5925)", () => {
    const NAMES = ["crowodot", "dotodot", "lteeoldiamond", "boxdotnormal", "normalnormal", "crowobox", "doticurve"];
    const file = `digraph { ${NAMES.map((name, i) => `n${String(i)} -> n${String(i + 1)} [arrowhead=${name}];`).join(" ")} z -> y [dir=both, arrowtail=crowodot]; }`;

    /**
     * Each arrow name a DOT file holds.
     * @param text - The file.
     * @param attribute - `arrowhead` or `arrowtail`.
     * @returns The names.
     */
    const namesIn = (text: string, attribute: string): string[] =>
        [...text.matchAll(new RegExp(`\\b${attribute}="?(\\w+)`, "g"))].map((m) => m[1]);

    it("writes each one's whole name", async () => {
        const text = await rewritten(file, "dot", "dot");
        // the last edge draws both ends
        assert.deepEqual(namesIn(text, "arrowhead"), [...NAMES, "normal"]);
        assert.deepEqual(namesIn(text, "arrowtail"), ["crowodot"]);
    });

    it("writes the same file again from the file it wrote", async () => {
        const first = await rewritten(file, "dot", "dot");
        assert.strictEqual(await rewritten(first, "dot", "dot"), first);
    });

    it("keeps the whole name when another program strips the style block", async () => {
        const first = await rewritten(file, "dot", "dot");
        const plain = first.replace(/"graphty\.styles"="(?:[^"\\]|\\.)*",?\s*/, "");
        assert.deepEqual(namesIn(await rewritten(plain, "dot", "dot"), "arrowhead"), [...NAMES, "normal"]);
    });

    it("writes a lone arrow as its name alone", async () => {
        const text = await rewritten("digraph { a -> b [arrowhead=crow]; b -> c [arrowhead=odot]; }", "dot", "dot");
        assert.deepEqual(namesIn(text, "arrowhead"), ["crow", "odot"]);
        assert.notInclude(text, "ArrowParts");
    });

    it("writes a lone arrow's side, and keeps it when another program strips the style block (#5947)", async () => {
        const lone = ["lbox", "rbox", "olbox", "lnormal", "rcrow", "licurve", "icurve"];
        const doc = `digraph { ${lone.map((name, i) => `n${String(i)} -> n${String(i + 1)} [arrowhead=${name}];`).join(" ")} y -> z [dir=both, arrowtail=lbox]; }`;
        const first = await rewritten(doc, "dot", "dot");
        assert.deepEqual(namesIn(first, "arrowhead"), [...lone, "normal"]);
        assert.deepEqual(namesIn(first, "arrowtail"), ["lbox"]);
        assert.strictEqual(await rewritten(first, "dot", "dot"), first);
        const plain = first.replace(/"graphty\.styles"="(?:[^"\\]|\\.)*",?\s*/, "");
        assert.deepEqual(namesIn(await rewritten(plain, "dot", "dot"), "arrowhead"), [...lone, "normal"]);
    });
});
