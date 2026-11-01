/**
 * A Pajek arc's part-way arrowhead (`ap`) is drawn where Pajek draws it: Pajek's `ap 0.5` puts the point it names at
 * the middle of the line and the head's tip 5 `s` px further on toward the target (`pajek-specimen-arrows` arc 27 28),
 * so the drawn tip lies past the middle, not on it (#4514). Read off the placed scene.
 */
import "../../src/graphty-element";

import { afterEach, assert, describe, test } from "vitest";

import type { Graphty } from "../../index.js";

/** Two vertices 200 Pajek px apart (0.4 of its 500 px square) on one level, joined by an arc with `ap 0.5`. */
const NET = "*Vertices 2\n1 a 0.1 0.5\n2 b 0.5 0.5\n*Arcs\n1 2 1 ap 0.5\n";

let mounted: Graphty | null = null;

afterEach(() => {
    mounted?.remove();
    mounted = null;
});

describe("a Pajek arc's part-way arrowhead", () => {
    test("has its tip 5 px of Pajek's 200 px line past the middle, toward the target", async () => {
        const element = document.createElement("graphty-element");
        element.style.cssText = "display:block;width:800px;height:600px";
        element.viewMode = "2d";
        document.body.appendChild(element);
        mounted = element;
        await element.updateComplete;
        await element.session.data.import(
            { type: "pajek", config: { data: NET } },
            { styles: "file", layout: "recommended" },
        );
        await element.waitForSettled();
        await element.session.styles.settled();
        await element.waitForStableFrame();

        const { graph } = element;
        const [edge] = graph.getDataManager().edges.values();
        const a = edge.srcNode.mesh.getAbsolutePosition();
        const b = edge.dstNode.mesh.getAbsolutePosition();
        const tip = edge.arrowCap?.position;
        assert(tip, "the arc's head is drawn");

        const run = b.subtract(a);
        const along = tip.subtract(a);
        // the share of the line between the centers at which the tip is drawn: Pajek's 0.5 + 5 / 200, less a little
        // because graphty measures its share along the line between the outlines
        const share = (along.x * run.x + along.y * run.y) / (run.x * run.x + run.y * run.y);
        assert.isAbove(share, 0.51, `the tip is past the middle (${String(share)})`);
        assert.isBelow(share, 0.526, `and no further than Pajek's tip (${String(share)})`);
    });
});
