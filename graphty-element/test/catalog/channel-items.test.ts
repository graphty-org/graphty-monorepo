/**
 * @file The structured text channels' items: read by the renderer's own parsers, written back in
 * the form they read.
 */

import { assert, describe, it } from "vitest";

import { readChannelItems, writeChannelItems } from "../../catalog";

describe("structured channel items", () => {
    it("reads and writes a polygon's points, lengths included", () => {
        const points = readChannelItems("node.shapePoints", " 0,1 1,-1 -1+24,0-6 ");
        assert.deepEqual(
            [...points],
            [
                { x: 0, y: 1 },
                { x: 1, y: -1 },
                { x: -1, xLength: 24, y: 0, yLength: -6 },
            ],
        );
        assert.strictEqual(writeChannelItems("node.shapePoints", points), "0,1 1,-1 -1+24,0-6");
        assert.deepEqual([...readChannelItems("node.shapePoints", "0,1 nonsense")], []);
    });

    it("reads and writes lines and parts, dropping one that does not parse", () => {
        const lines = readChannelItems("node.shapeLines", "-1,0 1,0; 0,1 x,y; 0,-1 0,1");
        assert.deepEqual(
            lines.map((line) => [...line]),
            [
                [
                    { x: -1, y: 0 },
                    { x: 1, y: 0 },
                ],
                [
                    { x: 0, y: -1 },
                    { x: 0, y: 1 },
                ],
            ],
        );
        assert.strictEqual(writeChannelItems("node.shapeParts", lines), "-1,0 1,0; 0,-1 0,1");
    });

    it("reads and writes further texts, keeping an empty one and its look", () => {
        const value = '[[-0.5, 0, "a", {"size": 0.2, "bogus": 1}], [0.5, 0, ""], ["x", 0, "b"]]';
        const texts = readChannelItems("node.shapeTexts", value);
        assert.deepEqual(
            [...texts],
            [
                { x: -0.5, y: 0, text: "a", look: { size: 0.2 } },
                { x: 0.5, y: 0, text: "" },
            ],
        );
        assert.strictEqual(writeChannelItems("node.shapeTexts", texts), '[[-0.5,0,"a",{"size":0.2}],[0.5,0,""]]');
        assert.deepEqual([...readChannelItems("node.shapeTexts", "not json")], []);
    });

    it("reads and writes further texts with no point of their own", () => {
        const texts = readChannelItems("node.shapeTexts", '[["name"], ["age", {"color": "#ff0000"}], [0, 1, "top"]]');
        assert.deepEqual(
            [...texts],
            [{ text: "name" }, { text: "age", look: { color: "#ff0000" } }, { x: 0, y: 1, text: "top" }],
        );
        assert.strictEqual(
            writeChannelItems("node.shapeTexts", texts),
            '[["name"],["age",{"color":"#ff0000"}],[0,1,"top"]]',
        );
    });

    it("reads and writes bends and ports", () => {
        const bends = readChannelItems("edge.bends", "0.25,0.1 0.75,-0.1");
        assert.deepEqual(
            [...bends],
            [
                { x: 0.25, y: 0.1 },
                { x: 0.75, y: -0.1 },
            ],
        );
        assert.strictEqual(writeChannelItems("edge.bends", bends), "0.25,0.1 0.75,-0.1");
        assert.deepEqual([...readChannelItems("edge.bends", "0.25,0.1 bad")], []);
        assert.deepEqual([...readChannelItems("edge.sourcePort", "1,0")], [{ x: 1, y: 0 }]);
        assert.strictEqual(writeChannelItems("edge.targetPort", [{ x: 0, y: -1 }]), "0,-1");
    });

    it("reads and writes cap stacks", () => {
        const caps = readChannelItems("edge.arrowHeadStack", "tee:left*2x1.5o0.5 normal nonsense");
        assert.deepEqual(
            [...caps],
            [{ type: "tee", side: "left", size: 2, width: 1.5, outline: 0.5 }, { type: "normal" }],
        );
        assert.strictEqual(writeChannelItems("edge.arrowTailStack", caps), "tee:left*2x1.5o0.5 normal");
    });

    it("reads and writes a table's rows, keeping the table's own settings", () => {
        const value = JSON.stringify({ border: 1, rows: [{ cells: [{ lines: [{ text: "a" }], fill: "red" }] }] });
        const rows = readChannelItems("edge.labelTable", value);
        assert.strictEqual(rows[0]?.cells[0]?.lines?.[0]?.text, "a");
        const next = [...rows, { cells: [{ lines: [{ text: "b" }] }] }];
        assert.deepEqual(JSON.parse(writeChannelItems("node.labelTable", next, value)), {
            border: 1,
            rows: [{ cells: [{ lines: [{ text: "a" }], fill: "red" }] }, { cells: [{ lines: [{ text: "b" }] }] }],
        });
        assert.deepEqual([...readChannelItems("node.labelTable", '{"rows": 3}')], []);
    });

    it("reads nothing from an empty or missing value, and writes no items as empty text", () => {
        assert.deepEqual([...readChannelItems("edge.bends", undefined)], []);
        assert.deepEqual([...readChannelItems("node.shapeLines", "  ")], []);
        assert.strictEqual(writeChannelItems("edge.bends", []), "");
    });
});
