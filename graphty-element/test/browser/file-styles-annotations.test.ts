/**
 * A file's annotations -- the shapes, text notes and arrows Cytoscape desktop keeps beside a
 * network -- are drawn where the file put them relative to its nodes when the file is loaded with
 * its styles, and not at all without them. Read off the drawn Babylon scene.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";
import { readDrawn } from "../fidelity/drawn-scene";

const TYPE = "org.cytoscape.view.presentation.annotations.";

/**
 * Two nodes in a background box, a note above the box and an arrow from the note to node b, in
 * Cytoscape's coordinates (y down).
 */
const ANNOTATIONS = [
    `type=${TYPE}ShapeAnnotation|uuid=box|canvas=background|zoom=1|x=50|y=50|width=300|height=100|shapeType=ROUNDEDRECTANGLE|fillColor=-3342388|fillOpacity=50|edgeColor=-16777216|edgeThickness=2`,
    `type=${TYPE}TextAnnotation|uuid=note|canvas=foreground|zoom=1|x=60|y=0|fontSize=20|fontFamily=Arial|fontStyle=0|color=-16777216|text=A note`,
    `type=${TYPE}ArrowAnnotation|uuid=arrow|canvas=foreground|zoom=1|x=60|y=20|sourceAnnotation=note|targetPoint=300,100|sourceType=5|targetType=7|lineThickness=2|lineColor=-16777216`,
];

const XGMML = `<?xml version="1.0" encoding="UTF-8"?>
<graph id="1" label="annotated" directed="1" xmlns:cy="http://www.cytoscape.org" xmlns="http://www.cs.rpi.edu/XGMML">
  <att name="__Annotations" type="list">${ANNOTATIONS.map((a) => `<att type="string" value="${a}"/>`).join("")}</att>
  <node id="a" label="a"><graphics x="100" y="100" w="20" h="20" fill="#ff0000" type="ELLIPSE"/></node>
  <node id="b" label="b"><graphics x="300" y="100" w="20" h="20" fill="#ff0000" type="ELLIPSE"/></node>
  <edge id="ab" source="a" target="b" label="ab"/>
</graph>`;

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

/**
 * Mount an element and load the file.
 * @param styles - Whether to load the file's styles.
 * @returns The element.
 */
async function load(styles: "file" | "none"): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:800px;height:600px";
    element.viewMode = "2d";
    document.body.appendChild(element);
    mounted = element;
    await element.updateComplete;
    await element.session.data.import({ type: "xgmml", config: { data: XGMML } }, { styles, layout: "recommended" });
    await element.waitForSettled();
    await element.session.styles.settled();
    await element.waitForStableFrame();
    return element;
}

describe("a file's annotations", () => {
    test("are drawn beside the nodes they annotate when the file's styles are loaded", async () => {
        const element = await load("file");
        const drawn = readDrawn(element.graph);
        assert.deepEqual(drawn.annotations.map((a) => a.kind).sort(), ["arrow", "shape", "text"]);

        const a = drawn.nodes.get("a");
        const b = drawn.nodes.get("b");
        assert.isDefined(a);
        assert.isDefined(b);
        if (a === undefined || b === undefined) {
            return;
        }

        const box = drawn.annotations.find((x) => x.kind === "shape")?.box;
        const note = drawn.annotations.find((x) => x.kind === "text");
        const arrow = drawn.annotations.find((x) => x.kind === "arrow")?.box;
        assert.isDefined(box);
        assert.isDefined(arrow);
        if (box === undefined || note === undefined || arrow === undefined) {
            return;
        }

        // the box holds both nodes, a fixed 50 file units from each side of them
        for (const n of [a, b]) {
            assert.isTrue(n.x > box.x0 && n.x < box.x1 && n.y > box.y0 && n.y < box.y1, "node inside the box");
        }

        const unit = (b.x - a.x) / 200;
        assert.closeTo(a.x - box.x0, 50 * unit, 2);
        assert.closeTo(box.x1 - b.x, 50 * unit, 2);
        // behind the nodes
        assert.isAbove(box.near, a.box.near);

        // the note sits above the box, and the arrow runs from it down to node b
        assert.equal(note.text, "A note");
        assert.isAtMost(note.box.y1, box.y0 + 1);
        assert.closeTo(arrow.x1, b.x, 2);
        assert.closeTo(arrow.y1, b.y, 2);
        assert.closeTo(arrow.x0, note.box.x0, 2);
        // its one head (a triangle at the target, none at the source) is read as a box of its own at the target end
        const heads = drawn.annotations.find((x) => x.kind === "arrow")?.heads ?? [];
        assert.lengthOf(heads, 1);
        const [head] = heads;
        assert.isTrue(
            head.x0 <= b.x + 1 && head.x1 >= b.x - 1 && head.y0 <= b.y + 1 && head.y1 >= b.y - 1,
            "at the tip",
        );
        assert.isBelow(head.x1 - head.x0, arrow.x1 - arrow.x0);
    });

    test("are not drawn when the file is loaded without its styles", async () => {
        const element = await load("none");
        const drawn = readDrawn(element.graph);
        assert.equal(drawn.nodes.size, 2);
        assert.deepEqual(drawn.annotations, []);
    });
});
