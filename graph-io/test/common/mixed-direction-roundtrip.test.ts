/**
 * Mixed-direction files read into graph-format's per-edge direction (issue #309): the snapshot
 * answers `directedness() === "mixed"`, each source edge keeps its own direction, and the file
 * written back reads the same way.
 */
import { directedness, edgeIsDirected, GraphBuilder, type GraphSnapshot } from "@graphty/graph-format";
import { describe, expect, it } from "vitest";

import { gexfExporter } from "../../src/formats/gexf/exporter.js";
import { gexfImporter } from "../../src/formats/gexf/importer.js";
import { graphmlExporter } from "../../src/formats/graphml/exporter.js";
import { graphmlImporter } from "../../src/formats/graphml/importer.js";
import { compareSnapshots, describeDiffs, roundTrip } from "../helpers/roundtrip.js";

const GRAPHML = `<graphml><graph edgedefault="directed">
<node id="a"/><node id="b"/><node id="c"/>
<edge source="a" target="b"/>
<edge source="b" target="c" directed="false"/>
</graph></graphml>`;

const GEXF = `<gexf xmlns="http://gexf.net/1.3" version="1.3"><graph defaultedgetype="undirected">
<nodes><node id="a"/><node id="b"/><node id="c"/></nodes>
<edges><edge id="u" source="a" target="b"/><edge id="d" source="b" target="c" type="directed"/></edges>
</graph></gexf>`;

/**
 * The direction of each source edge, the mirror halves of expanded undirected edges skipped.
 * @param snapshot - the imported graph
 * @returns one entry per source edge, in order
 */
function sourceDirections(snapshot: GraphSnapshot): boolean[] {
    const pair = snapshot.edges.byRole("pair");
    const out: boolean[] = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        if (!(pair?.isSet(e) && (pair.value(e) as number) < e)) {
            out.push(edgeIsDirected(snapshot, e));
        }
    }

    return out;
}

describe("mixed-direction files keep per-edge direction (issue #309)", () => {
    const cases = [
        {
            name: "GraphML",
            text: GRAPHML,
            importer: graphmlImporter,
            exporter: graphmlExporter,
            expected: [true, false],
        },
        { name: "GEXF", text: GEXF, importer: gexfImporter, exporter: gexfExporter, expected: [false, true] },
    ] as const;

    for (const { name, text, importer, exporter, expected } of cases) {
        it(`${name}: imports as mixed and round-trips`, async () => {
            const builder = new GraphBuilder({ directed: false, weightDtype: "f64" });
            await importer.import(text, builder);
            const snapshot = builder.freeze();
            expect(directedness(snapshot)).toBe("mixed");
            expect(sourceDirections(snapshot)).toEqual(expected);

            const back = await roundTrip(snapshot, exporter, importer);
            expect(directedness(back.snapshot)).toBe("mixed");
            expect(sourceDirections(back.snapshot)).toEqual(expected);
            const diffs = compareSnapshots(snapshot, back.snapshot, { allowExtraColumns: false });
            expect(diffs, describeDiffs(diffs)).toEqual([]);
        });
    }
});
