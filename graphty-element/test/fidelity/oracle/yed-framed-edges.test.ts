/**
 * yEd's framed edges (`GenericEdge configuration="com.yworks.edge.framed"`) as its SVG export draws them: one closed
 * outline round a band as wide as the edge's line, its arrowheads part of the outline, read back as the line's route
 * through the band's middle, the band's width and each arrowhead's own outline. The outlines are the drawings' own.
 */
import { assert, describe, it } from "vitest";

import { framedBand, type Pt } from "./primitives";
import { straightPathVertices } from "./svg-primitives";

const outline = (d: string): Pt[] => straightPathVertices(d) ?? [];
const near = (p: Pt | undefined, q: Pt, slack = 0.1): boolean =>
    p !== undefined && Math.hypot(p[0] - q[0], p[1] - q[1]) <= slack;

describe("yEd's framed edges", () => {
    it("reads a band with no arrowheads as a line through its middle, as wide as the band", () => {
        // graphml-galaxy-lcms-workflow e0, LineStyle width 3.0, no arrows
        const band = framedBand(
            outline(
                "M-306.8672 708.4523 L-328.8975 708.6265 L-328.8737 711.6264 L-306.8434 711.4522 L-306.8672 708.4523 Z",
            ),
            16,
        );
        assert.isNotNull(band);
        assert.closeTo(band?.width ?? 0, 3, 0.05);
        assert.deepEqual(band?.heads, []);
        assert.isTrue(near(band?.route[0], [-306.8553, 709.9523]), String(band?.route[0]));
        assert.isTrue(near(band?.route.at(-1), [-328.8856, 710.1265]), String(band?.route.at(-1)));
    });

    it("cuts an arrowhead at each end out of the outline, the line running between their backs", () => {
        // graphml-galaxy-lcms-workflow, the edge with Arrows source="delta" target="delta"
        const band = framedBand(
            outline(
                "M-387.2928 642.0977 L-394.4788 657.2507 L-388.4801 657.1257 L-388.4801 657.1257 L-388.2516 668.0958 L-388.2516 668.0958 L-394.2503 668.2208 L-386.4395 683.0613 L-379.2535 667.9083 L-379.2535 667.9083 L-385.2522 668.0333 L-385.2522 668.0333 L-385.4808 657.0632 L-385.4808 657.0632 L-379.4821 656.9382 L-387.2928 642.0977 Z",
            ),
            16,
        );
        assert.isNotNull(band);
        assert.closeTo(band?.width ?? 0, 3, 0.05);
        assert.deepEqual(
            band?.heads.map((h) => h.end),
            ["source", "target"],
        );
        const source = band?.heads[0].outline ?? [];
        const target = band?.heads[1].outline ?? [];
        assert.isTrue(
            source.some((p) => near(p, [-387.2928, 642.0977])),
            "the source head holds its tip",
        );
        assert.isTrue(
            target.some((p) => near(p, [-386.4395, 683.0613])),
            "the target head holds its tip",
        );
        assert.isTrue(near(band?.route[0], [-386.9805, 657.0945]), String(band?.route[0]));
        assert.isTrue(near(band?.route.at(-1), [-386.7519, 668.0646]), String(band?.route.at(-1)));
    });

    it("follows a bend, and reads an arrowhead at the target only", () => {
        // graphml-synthetic-edges e71 (n27 -> n37), LineStyle width 2.0, one bend, Arrows target="white_delta"
        const band = framedBand(
            outline(
                "M648.1432 514.5073 L647.31 516.3254 L864.5834 615.9091 L864.6411 615.9355 L864.7017 615.9545 L983.6591 653.1286 L981.944 658.6169 L1001.1379 657.5432 L985.9707 645.7314 L984.2556 651.2197 L984.2556 651.2197 L865.3589 614.0645 L865.3589 614.0645 L648.1432 514.5073 Z",
            ),
            64,
        );
        assert.isNotNull(band);
        assert.closeTo(band?.width ?? 0, 2, 0.05);
        assert.deepEqual(
            band?.heads.map((h) => h.end),
            ["target"],
        );
        assert.isTrue(
            band?.heads[0].outline.some((p) => near(p, [1001.1379, 657.5432])),
            "the target head holds its tip",
        );
        assert.isTrue(near(band?.route[0], [647.7266, 515.4164]), String(band?.route[0]));
        assert.isTrue(near(band?.route.at(-1), [983.9574, 652.1742]), String(band?.route.at(-1)));
        // the route passes through the bend's point (865, 615), not across its corner
        const route = band?.route ?? [];
        const offBend = Math.min(
            ...route.slice(1).map((q, i) => {
                const p = route[i];
                const [dx, dy] = [q[0] - p[0], q[1] - p[1]];
                const t = Math.min(1, Math.max(0, ((865 - p[0]) * dx + (615 - p[1]) * dy) / (dx * dx + dy * dy)));
                return Math.hypot(865 - p[0] - t * dx, 615 - p[1] - t * dy);
            }),
        );
        assert.isBelow(offBend, 0.5);
    });

    it("reads an outline yEd starts at an arrowhead's wing, its tip the last corner", () => {
        // yed-graphml-specimen-edges-lines generic-framed, LineStyle width 6.0, Arrows target="standard": the outline
        // runs wing, the head's back, the band's far end (x 791), the other side, the other wing and the tip (857)
        const band = framedBand(
            outline(
                "M837.5 518.986 L840.575 524.111 L791 524.111 L791 530.111 L840.575 530.111 L837.5 535.236 L857 527.111 L837.5 518.986 Z",
            ),
            16,
        );
        assert.isNotNull(band);
        assert.closeTo(band?.width ?? 0, 6, 0.05);
        assert.deepEqual(
            band?.heads.map((h) => h.end),
            ["target"],
        );
        assert.isTrue(
            band?.heads[0].outline.some((p) => near(p, [857, 527.111])),
            "the target head holds its tip",
        );
        assert.isTrue(near(band?.route[0], [791, 527.111]), String(band?.route[0]));
        assert.isTrue(near(band?.route.at(-1), [840.575, 527.111]), String(band?.route.at(-1)));
    });

    it("reads no band in a node's outline, or in a closed shape no longer than it is wide", () => {
        assert.isNull(framedBand(outline("M992 691.333 L1048 691.333 L1048 727.333 L992 727.333 Z"), 16));
        assert.isNull(framedBand(outline("M376 600.222 L404 618.222 L376 636.222 L348 618.222 Z"), 16));
        assert.isNull(framedBand(outline("M409 149 L393 143 L393 155 Z"), 16));
    });
});
