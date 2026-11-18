/**
 * A file rule that sets one value outside its channel's range draws the rest of the rule: the bad
 * value is drawn at the nearest end of the range and the load's notes name it (#8422).
 */
import { gmlImporter } from "@graphty/graph-io/gml";
import { assert, describe, it } from "vitest";

import { DataSource, type FormatDescriptor } from "../../extend";
import { createGraphSession, FILE_STYLE_ISSUE } from "../../session";
import { fileStylesOn } from "../helpers/file-styles-on";

fileStylesOn();

const GML =
    "graph [ directed 1 node [ id 1 ] node [ id 2 ] node [ id 3 ] edge [ source 1 target 2 ] edge [ source 2 target 3 ] ]";

const format: FormatDescriptor = {
    id: "out-of-range",
    plainName: "Out of range",
    extensions: [".out-of-range"],
    mimeTypes: ["text/vnd.out-of-range"],
    canImport: true,
    canExport: false,
    options: [],
};

// A reader whose edge rule sets a color, a curve and an opacity of 7, above the 1 edge.opacity draws.
DataSource.register(
    DataSource.fromImporter(
        {
            ...gmlImporter,
            styles: () => ({
                canonical: true,
                edge: {
                    values: {},
                    rules: [
                        {
                            id: "edge.all",
                            target: "edge",
                            role: "defaults",
                            origin: "declared",
                            where: { all: true },
                            set: { color: "#ff0000", curved: true, opacity: 7 },
                        },
                    ],
                },
            }),
        },
        format,
    ),
);

describe("a file rule with one value out of its channel's range", () => {
    it("draws the rest of the rule and notes the value drawn at the nearest end of the range", async () => {
        const session = createGraphSession();
        await session.data.import({ type: format.id, config: { data: GML } }, { styles: "file" });

        const edges = session.data.edges();
        assert.lengthOf(edges, 2);
        for (const edge of edges) {
            const merged = session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>;
            assert.strictEqual((merged["edge.color"] as { hex: string }).hex.slice(0, 7).toLowerCase(), "#ff0000");
            assert.strictEqual(merged["edge.curvature"], true);
            assert.strictEqual(merged["edge.opacity"], 1);
        }

        const notes = session.data.lastImport()?.styles?.notes ?? [];
        assert.isFalse(notes.some((note) => note.code === FILE_STYLE_ISSUE.LAYER_REFUSED));
        const nearest = notes.find((note) => note.code === FILE_STYLE_ISSUE.DRAWN_NEAREST);
        assert.deepInclude(nearest?.params, { property: "edge.opacity", target: "edge", samples: ["7"] });
        session.dispose();
    });
});
