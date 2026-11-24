/**
 * @file A node glyph and a file's text annotation whose web font is still loading when they are
 * drawn are drawn again in that font once it loads (issue #5140), as labels are (issue #3531, see
 * a-label-redraws-when-its-font-loads.test.ts).
 *
 * THE DEFECT. Both are measured and drawn on a canvas with whatever face their font has at that
 * moment, and nothing drew them again when the font arrived, so their width and texture kept the
 * fallback's. A glyph's mesh is shared by every node of its style through the mesh cache, so that
 * entry has to be forgotten too, or each node rebuilt finds the fallback glyph again.
 *
 * WHAT IS MEASURED. Each test registers a face of the committed Inter file under a family name of
 * its own, not loaded yet, so the drawing that names it is what starts the load. Once the picture
 * is final and the test's own load of the font has settled, the drawing must be as wide as one
 * made with the font already loaded.
 */
import "../../src/graphty-element";

import type { InstancedMesh } from "@babylonjs/core";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { Graph, operationQueueOf } from "../../src/Graph";
import type { AnnotationMeshMetadata } from "../../src/meshes/AnnotationMeshes";
import { PINNED_LABEL_FONT_URL } from "../helpers/pin-label-font";
import { asData, styleEveryNode } from "../helpers/testSetup";

/**
 * Register a face under a family name without loading it. The name has no digits, so it can be
 * written unquoted in a CSS font, as a file's annotation names it.
 * @param name - The family name.
 * @returns The family name.
 */
function unloadedFont(name: string): string {
    document.fonts.add(new FontFace(name, `url(${PINNED_LABEL_FONT_URL})`));
    return name;
}

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

describe("a node glyph built while its web font loads", () => {
    /**
     * Two nodes of one glyph style, drawn to a final picture.
     * @param font - The glyph's font family.
     * @returns The graph.
     */
    async function mount(font: string): Promise<Graph> {
        const container = document.createElement("div");
        container.style.cssText = "width:640px;height:480px";
        document.body.append(container);
        const graph = new Graph(container);
        cleanups.push(() => {
            graph.dispose();
            container.remove();
        });
        await graph.init();
        await graph.setLayout("fixed", { dim: 3 });
        await graph.addNode(asData({ id: "a", position: { x: 0, y: 0, z: 0 } }));
        await graph.addNode(asData({ id: "b", position: { x: 3, y: 0, z: 0 } }));
        await styleEveryNode(graph, {
            "node.glyph": "Mmmmmmmm",
            "node.glyphFont": `"${font}", serif`,
        });
        await operationQueueOf(graph).waitForCompletion();
        await graph.waitForStableFrame();
        return graph;
    }

    /**
     * How wide each node's glyph is drawn, from the box its mesh reports.
     * @param graph - The graph.
     * @returns The widths, by node.
     */
    function glyphWidths(graph: Graph): number[] {
        return graph.getNodes().map((node) => {
            const pieces = node.decorationPieces;
            assert.lengthOf(pieces, 1, "the node draws its glyph");
            return pieces[0].box.x1 - pieces[0].box.x0;
        });
    }

    it("is drawn as wide as one built after the font loaded, on every node that shares it", async () => {
        const font = unloadedFont("Slow Glyph Face");

        const late = await mount(font);
        await document.fonts.load(`128px "${font}"`);
        await late.waitForStableFrame();
        const lateWidths = glyphWidths(late);
        // every node's glyph is a live instance of one rebuilt source mesh
        const sources = new Set(
            late.getNodes().flatMap((node) => {
                const glyph = (node as unknown as { decorations: InstancedMesh[] }).decorations[0];
                assert.isFalse(glyph.isDisposed(), "the node's glyph is drawn");
                return [glyph.sourceMesh];
            }),
        );
        assert.strictEqual(sources.size, 1, "the nodes share one glyph");
        cleanups.splice(0).forEach((cleanup) => {
            cleanup();
        });

        const early = await mount(font);
        const earlyWidths = glyphWidths(early);

        assert.deepEqual(lateWidths, earlyWidths, "each glyph is as wide as one built with the font loaded");
    });
});

describe("a file's text annotation drawn while its web font loads", () => {
    const TYPE = "org.cytoscape.view.presentation.annotations.";

    /**
     * Mount an element and load a file with a text note in a font.
     * @param font - The note's font family.
     * @returns The element.
     */
    async function load(font: string): Promise<Graphty> {
        const note = `type=${TYPE}TextAnnotation|uuid=note|canvas=foreground|zoom=1|x=60|y=0|fontSize=20|fontFamily=${font}|fontStyle=0|color=-16777216|text=Mmmmmmmm note`;
        const xgmml = `<?xml version="1.0" encoding="UTF-8"?>
<graph id="1" label="annotated" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">
  <att name="__Annotations" type="list"><att type="string" value="${note}"/></att>
  <node id="a" label="a"><graphics x="100" y="100" w="20" h="20" fill="#ff0000" type="ELLIPSE"/></node>
  <node id="b" label="b"><graphics x="300" y="100" w="20" h="20" fill="#ff0000" type="ELLIPSE"/></node>
</graph>`;
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:800px;height:600px";
        element.viewMode = "2d";
        document.body.appendChild(element);
        cleanups.push(() => {
            element.remove();
        });
        await element.updateComplete;
        await element.session.data.import(
            { type: "xgmml", config: { data: xgmml } },
            { styles: "file", layout: "recommended" },
        );
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();
        return element;
    }

    /**
     * How wide the note is drawn, in world units, from its mesh.
     * @param element - The element.
     * @returns The width.
     */
    function noteWidth(element: Graphty): number {
        const notes = element.graph.scene.meshes.flatMap((mesh) => {
            const a = (mesh.metadata as Partial<AnnotationMeshMetadata> | null)?.annotation;
            return a?.kind === "text" && !mesh.isDisposed() ? [a.box.x1 - a.box.x0] : [];
        });
        assert.lengthOf(notes, 1, "the note is drawn once");
        return notes[0];
    }

    it("is drawn as wide as one drawn after the font loaded", async () => {
        const font = unloadedFont("Slow Note Face");

        const late = await load(font);
        await document.fonts.load(`20px "${font}"`);
        await late.waitForStableFrame();
        const lateWidth = noteWidth(late);
        cleanups.splice(0).forEach((cleanup) => {
            cleanup();
        });

        const early = await load(font);

        assert.strictEqual(lateWidth, noteWidth(early), "the note is as wide as one drawn with the font loaded");
    });
});
