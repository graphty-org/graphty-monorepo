/**
 * The oracle association frames graphty's drawing into the program's, then refits that frame on the bodies it found.
 * The refit is a least-squares fit of body centers, which bodies drawn off their node's center (a shadow, an event
 * ring) turn and shift: on yed-graphml-specimen-node-shapes-p3 it lost the 6 px anchor in the top right corner the
 * first frame had found, and the anchor was judged a stray and graphty's anchor an extra node. Only draw.io's
 * never-drawn "Text is not SVG" fallback, read as ink that widened the first frame's extent, had hidden it.
 */
import { assert, describe, it } from "vitest";

import svg from "../../../graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p3.svg?raw";
import { associate } from "../fidelity/oracle/associate";
import type { PNode, PScene } from "../fidelity/oracle/primitives";
import { readSvgPrimitives } from "../fidelity/oracle/svg-primitives";

describe("the oracle association's frame", () => {
    it("keeps every body the first frame found when the refit would lose one", () => {
        // graphty's drawing of the sheet: id, center, size and shape of each node
        const rows: [string, number, number, number, number, PNode["shape"]][] = [
            ["anchor-ne", 1142.18, 48.04, 4.67, 4.67, "rect"],
            ["anchor-nw", 57.82, 48.04, 4.67, 4.67, "rect"],
            ["anchor-se", 1142.18, 851.96, 4.67, 4.67, "rect"],
            ["anchor-sw", 57.82, 851.96, 4.67, 4.67, "rect"],
            ["default", 181.21, 108.4, 32.72, 32.72, "rect"],
            ["generic-bpmn-activity", 390.61, 108.4, 51.41, 32.72, "roundrect"],
            ["generic-bpmn-activity-withshadow", 600.0, 108.4, 51.41, 32.72, "roundrect"],
            ["generic-bpmn-artifact", 1018.79, 217.9, 51.41, 32.72, "rect"],
            ["generic-bpmn-artifact-withshadow", 181.21, 327.41, 51.41, 32.72, "rect"],
            ["generic-bpmn-conversation", 600.0, 217.9, 51.41, 32.72, "hexagon"],
            ["generic-bpmn-conversation-withshadow", 809.39, 217.9, 51.41, 32.72, "hexagon"],
            ["generic-bpmn-event", 809.39, 108.4, 51.41, 32.72, "ellipse"],
            ["generic-bpmn-event-withshadow", 1018.79, 108.4, 51.41, 32.72, "ellipse"],
            ["generic-bpmn-gateway", 181.21, 217.9, 51.41, 32.72, "diamond"],
            ["generic-bpmn-gateway-withshadow", 390.61, 217.9, 51.41, 32.72, "diamond"],
            ["generic-sbgn-emptyset", 600.0, 436.91, 51.41, 32.72, "ellipse"],
            ["generic-sbgn-macromolecule", 809.39, 327.41, 51.41, 32.72, "roundrect"],
            ["generic-sbgn-nucleicacidfeature", 1018.79, 327.41, 51.41, 32.72, "rect"],
            ["generic-sbgn-operator", 809.39, 546.42, 51.41, 32.72, "ellipse"],
            ["generic-sbgn-perturbingagent", 181.21, 436.91, 51.41, 32.72, "rect"],
            ["generic-sbgn-phenotype", 390.61, 436.91, 51.41, 32.72, "hexagon"],
            ["generic-sbgn-process", 600.0, 546.42, 51.41, 32.72, "rect"],
            ["generic-sbgn-simplechemical", 600.0, 327.41, 51.41, 32.72, "ellipse"],
            ["generic-sbgn-statevariable", 181.21, 546.42, 51.41, 32.72, "other"],
            ["generic-sbgn-submap", 809.39, 436.91, 51.41, 32.72, "rect"],
            ["generic-sbgn-tag", 390.61, 546.42, 51.41, 32.72, "other"],
            ["generic-sbgn-unitofinformation", 1018.79, 436.91, 51.41, 32.72, "rect"],
            ["generic-sbgn-unspecifiedentity", 390.61, 327.41, 51.41, 32.72, "ellipse"],
            ["sbgn-style-inverse-true", 390.61, 765.43, 51.41, 32.72, "roundrect"],
            ["sbgn-style-mcount-2", 600.0, 765.43, 51.41, 32.72, "roundrect"],
            ["sbgn-style-radius-20", 181.21, 765.43, 51.41, 32.72, "roundrect"],
            ["uml-class", 1018.79, 546.42, 70.11, 51.41, "rect"],
            ["uml-constraint", 600.0, 655.92, 70.11, 51.41, "rect"],
            ["uml-note", 1018.79, 655.92, 51.41, 32.72, "rect"],
            ["uml-omitdetails", 809.39, 655.92, 70.11, 51.41, "rect"],
            ["uml-stereotype", 390.61, 655.92, 70.11, 51.41, "rect"],
            ["uml-use3deffect-false", 181.21, 655.92, 70.11, 51.41, "rect"],
        ];
        const guide: PScene = {
            side: "graphty",
            width: 1200,
            height: 900,
            background: "#ffffff",
            nodes: rows.map(([id, cx, cy, w, h, shape]) => ({
                id,
                cx,
                cy,
                w,
                h,
                shape,
                fill: null,
                stroke: null,
                label: null,
            })),
            edges: [],
            groups: [],
            texts: [],
            strays: [],
        };
        const { width, height, prims } = readSvgPrimitives(svg);
        const oracle = associate(prims, width, height, guide).scene;
        assert.includeMembers(
            oracle.nodes.map((n) => n.id),
            ["anchor-ne", "anchor-nw", "anchor-se", "anchor-sw"],
        );
        assert.deepEqual(
            oracle.strays.filter((s) => s.box.x0 > 1190 && s.box.y1 < 10),
            [],
        );
    });
});
