/**
 * @file `styles.layersUnder(...).writes`: every channel a row's layers write, with a label style's
 * fields reported as the field channels a style editor shows them under.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession } from "../../../src/session";

describe("the channels a layer row writes", () => {
    it("writes reports a label style's font as node.labelFont", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }]);
        const layer = await s.styles.add({
            name: "Text",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.color": "#ff0000",
                "node.labelStyle": { font: "Georgia", weight: "bold", location: "bottom" },
                "node.xlabelStyle": { sizePx: 10 },
                "node.tooltipStyle": { color: "#00ff00" },
            },
        });
        const edges = await s.styles.add({
            name: "Ends",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.arrowHeadTextStyle": { font: "Courier" } },
        });
        const [row] = s.styles.layersUnder([layer.id]);
        assert.sameMembers(
            [...row.writes],
            [
                "node.color",
                "node.labelStyle",
                "node.labelFont",
                "node.labelWeight",
                "node.labelLocation",
                "node.xlabelStyle",
                "node.tooltipStyle",
                "node.tooltipColor",
            ],
        );
        assert.sameMembers(
            [...s.styles.layersUnder([edges.id])[0].writes],
            ["edge.arrowHeadTextStyle", "edge.arrowHeadTextFont"],
        );
        s.dispose();
    });

    it("sets is unchanged", async () => {
        const s = createGraphSession();
        await s.data.addNodes([{ id: "a" }]);
        const layer = await s.styles.add({
            name: "Text",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { font: "Georgia" } },
            encode: { "node.size": { value: 2 } },
        });
        const [row] = s.styles.layersUnder([layer.id]);
        assert.sameMembers([...row.sets], ["node.labelStyle", "node.size"]);
        s.dispose();
    });
});
