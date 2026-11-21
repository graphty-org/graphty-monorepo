/**
 * @file Several labels on one node or edge (`node.labels`, `edge.labels`): entries merge by id across
 * layers, field by field; `off` removes one; the label style and field channels are the base of every
 * entry; the entry "label" is `node.label`'s own; one field of one label varies by data through its
 * address; a list naming an id twice is refused; and `styles.newLabelId` gives an unused id.
 */

import { assert, describe, it } from "vitest";

import { MAIN_LABEL_ID } from "../../../src/catalog/label-style";
import type { DrawnLabel } from "../../../src/managers/StylePainter";
import { createGraphSession } from "../../../src/session";
import {
    LABEL_CAP,
    labelFieldAddress,
    mergeLabelEntries,
    parseLabelFieldAddress,
} from "../../../src/session/styles/channels";
import { painterHarness, type Row } from "../helpers";

const NODES: readonly Row[] = [
    { "data.id": "a", "data.name": "Alpha", "data.rank": 1 },
    { "data.id": "b", "data.name": "Beta", "data.rank": 2 },
];
const EDGES: readonly Row[] = [{ "data.id": "a->b" }];

/**
 * The further labels one node's paint draws, by id.
 * @param paint - The node's paint style.
 * @returns The blocks by id.
 */
function labelsOf(paint: { readonly style: object } | null): Map<string, DrawnLabel["block"]> {
    const labels = (paint?.style as { labels?: readonly DrawnLabel[] } | undefined)?.labels ?? [];
    return new Map(labels.map(({ id, block }) => [id, block]));
}

describe("a label list", () => {
    it("merges by id across layers, field by field, and a higher layer's off removes one", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Two",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.labels": [
                    { id: "top", text: "Top", style: { location: "top", color: "#ff0000" } },
                    { id: "bottom", text: "Bottom", style: { location: "bottom" } },
                ],
            },
        });
        const over = await held.styles.add({
            name: "Bigger top",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": [{ id: "top", style: { sizePx: 30 } }] },
        });
        await held.paintAll();
        let labels = labelsOf(held.painter.nodePaint(0));
        assert.deepStrictEqual([...labels.keys()], ["top", "bottom"]);
        const top = labels.get("top");
        assert.strictEqual(top?.text, "Top", "the words beneath are kept");
        assert.strictEqual(top?.location, "top");
        assert.strictEqual(top?.textColor, "#ff0000", "the color beneath is kept");
        assert.strictEqual(top?.fontSize, 30, "the size above wins");
        assert.strictEqual(labels.get("bottom")?.location, "bottom");

        await held.styles.update(over.id, { set: { "node.labels": [{ id: "bottom", off: true }] } });
        await held.paintAll();
        labels = labelsOf(held.painter.nodePaint(0));
        assert.deepStrictEqual([...labels.keys()], ["top"], "off removes only that label");
    });

    it("draws every entry in the base label style, its own fields over it", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Base",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.labelStyle": { font: "Courier", color: "#00ff00" },
                "node.labelSize": 21,
                "node.labels": [
                    { id: "x", text: "X" },
                    { id: "y", text: "Y", style: { color: "#0000ff" } },
                ],
            },
        });
        await held.paintAll();
        const labels = labelsOf(held.painter.nodePaint(0));
        for (const id of ["x", "y"]) {
            assert.strictEqual(labels.get(id)?.font, "Courier", `${id} takes the base font`);
            assert.strictEqual(labels.get(id)?.fontSize, 21, `${id} takes the base size`);
            assert.isTrue(labels.get(id)?.enabled, `${id} is drawn`);
        }

        assert.strictEqual(labels.get("x")?.textColor, "#00ff00");
        assert.strictEqual(labels.get("y")?.textColor, "#0000ff", "an entry's own field wins");
    });

    it('draws the entry "label" as node.label\'s own label, which it restyles or hides', async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Named",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "Named", "node.labels": [{ id: MAIN_LABEL_ID, style: { color: "#123456" } }] },
        });
        const hide = await held.styles.add({
            name: "Hide",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelSize": 12 },
        });
        await held.paintAll();
        let style = held.painter.nodePaint(0)?.style;
        assert.strictEqual(style?.label?.text, "Named");
        assert.strictEqual(style?.label?.textColor, "#123456");
        assert.isTrue(style?.label?.enabled);
        assert.strictEqual(labelsOf(held.painter.nodePaint(0)).size, 0, "it is no further label");

        await held.styles.update(hide.id, { set: { "node.labels": [{ id: MAIN_LABEL_ID, off: true }] } });
        await held.paintAll();
        style = held.painter.nodePaint(0)?.style;
        assert.isFalse(style?.label?.enabled, "off hides node.label's label");
        assert.strictEqual(style?.label?.text, "Named", "and leaves its words to the layers beneath");
    });

    it("draws node.label's words in an entry with no text of its own", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Echo",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "Main", "node.labels": [{ id: "top", style: { location: "top" } }] },
        });
        await held.paintAll();
        assert.strictEqual(labelsOf(held.painter.nodePaint(0)).get("top")?.text, "Main");
    });

    it("varies one field of one label by data through its address", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Two",
            target: "node",
            selector: { match: "everything" },
            set: {
                "node.labels": [
                    { id: "top", text: "Top" },
                    { id: "bottom", text: "Bottom" },
                ],
            },
        });
        await held.styles.add({
            name: "By rank",
            target: "node",
            selector: { match: "everything" },
            encode: {
                [labelFieldAddress("node", "top", "color")]: {
                    by: "data.name",
                    scale: "ordinal",
                    map: { Alpha: "#ff0000", Beta: "#0000ff" },
                },
                [labelFieldAddress("node", "bottom", "text")]: { by: "data.name", scale: "passthrough" },
            },
        });
        await held.paintAll();
        const a = labelsOf(held.painter.nodePaint(0));
        const b = labelsOf(held.painter.nodePaint(1));
        assert.strictEqual(a.get("top")?.textColor, "#ff0000");
        assert.strictEqual(b.get("top")?.textColor, "#0000ff");
        assert.strictEqual(a.get("top")?.text, "Top", "only that field changes");
        assert.strictEqual(a.get("bottom")?.text, "Alpha");
        assert.strictEqual(b.get("bottom")?.text, "Beta");
        assert.notStrictEqual(a.get("bottom")?.textColor, "#ff0000", "the other label keeps its color");
    });

    it("refuses a list that names one id twice, and a field address that names no field", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        let refused: unknown;
        try {
            await session.styles.add({
                name: "Twice",
                target: "node",
                selector: { match: "everything" },
                set: { "node.labels": [{ id: "top" }, { id: "top", text: "again" }] },
            });
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as { code?: string } | undefined)?.code, "E_BAD_LAYER");

        refused = undefined;
        try {
            await session.styles.add({
                name: "Nothing",
                target: "node",
                selector: { match: "everything" },
                encode: { "node.labels.top.notAField": { value: 1 } },
            });
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as { code?: string } | undefined)?.code, "E_BAD_LAYER");
        session.dispose();
    });

    it("gives a new label id no label on the stack uses", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);
        const layer = await session.styles.add({
            name: "Labels",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": [{ id: "label-2", text: "two" }] },
        });
        await session.styles.add({
            name: "By data",
            target: "node",
            selector: { match: "everything" },
            encode: { [labelFieldAddress("node", "label-3", "color")]: { value: "#ff0000" } },
        });
        const id = session.styles.newLabelId(layer.id);
        assert.notInclude(["label", "label-2", "label-3"], id);
        await session.styles.update(layer.id, {
            set: {
                "node.labels": [
                    { id: "label-2", text: "two" },
                    { id, text: "new" },
                ],
            },
        });
        assert.notStrictEqual(session.styles.newLabelId(layer.id), id, "and never the same one twice once it is used");
        const next = session.styles.newLabelId(layer.id);
        assert.notStrictEqual(
            session.styles.newLabelId(layer.id, [next]),
            next,
            "and skips the ids it is told are taken",
        );

        let refused: unknown;
        try {
            session.styles.newLabelId("no such layer");
        } catch (error) {
            refused = error;
        }

        assert.strictEqual((refused as { code?: string } | undefined)?.code, "E_UNKNOWN_LAYER");
        session.dispose();
    });

    it("merges without changing what it is given, and round-trips its address", () => {
        const beneath = [{ id: "top", text: "Top", style: { color: "#ff0000" } }] as const;
        const merged = mergeLabelEntries(beneath, [{ id: "top", style: { sizePx: 9 } }]);
        assert.deepStrictEqual(merged, [{ id: "top", text: "Top", style: { color: "#ff0000", sizePx: 9 } }]);
        assert.deepStrictEqual(beneath[0].style, { color: "#ff0000" });
        assert.deepStrictEqual(mergeLabelEntries(merged, { top: { text: "New" } })[0]?.text, "New");

        const address = labelFieldAddress("edge", "mid", "sizePx");
        assert.strictEqual(address, "edge.labels.mid.sizePx");
        assert.deepStrictEqual(parseLabelFieldAddress(address), { channel: "edge.labels", id: "mid", field: "sizePx" });
        assert.isNull(parseLabelFieldAddress("node.label"));
    });

    it("draws an entry's named look beneath its own fields", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Card",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": [{ id: "c", text: "C", style: { look: "card", color: "#ff0000" } }] },
        });
        await held.paintAll();
        const card = labelsOf(held.painter.nodePaint(0)).get("c");
        assert.strictEqual(card?.backgroundColor, "#ffffff", "the look's background");
        assert.strictEqual(card?.font, "Verdana, sans-serif", "the look's font");
        assert.strictEqual(card?.textColor, "#ff0000", "the entry's own color wins over the look's");
    });

    it("draws at most LABEL_CAP further labels, and says so for the layer that adds them", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        const ten = Array.from({ length: 10 }, (_, at) => ({ id: `l${String(at)}`, text: `L${String(at)}` }));
        const many = await session.styles.add({
            name: "Ten",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": ten },
        });
        const recolor = await session.styles.add({
            name: "Recolor",
            target: "node",
            selector: { match: "everything" },
            encode: { [labelFieldAddress("node", "l1", "color")]: { value: "#ff0000" } },
        });
        assert.strictEqual(LABEL_CAP, 8);
        assert.deepInclude(session.styles.counts(many.id).undrawn, {
            code: "label.cap",
            params: { left: 2, limit: 8, count: 2 },
        });
        assert.notInclude(
            session.styles.counts(recolor.id).undrawn.map((fact) => fact.code),
            "label.cap",
            "a field binding adds no label",
        );
        session.dispose();

        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Ten",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": ten },
        });
        await held.paintAll();
        assert.deepStrictEqual(
            [...labelsOf(held.painter.nodePaint(0)).keys()],
            ["l0", "l1", "l2", "l3", "l4", "l5", "l6", "l7"],
        );
    });

    it("never adds a label, nor brings back one switched off, through a field binding", async () => {
        assert.deepStrictEqual(mergeLabelEntries(undefined, { ghost: { style: { color: "#ff0000" } } }), []);
        assert.deepStrictEqual(
            mergeLabelEntries([{ id: "top", off: true }], { top: { style: { color: "#ff0000" } } }),
            [{ id: "top", off: true }],
        );
        assert.deepStrictEqual(mergeLabelEntries(undefined, { [MAIN_LABEL_ID]: { style: { sizePx: 9 } } }), [
            { id: MAIN_LABEL_ID, style: { sizePx: 9 } },
        ]);

        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Main",
            target: "node",
            selector: { match: "everything" },
            set: { "node.label": "Main", "node.labels": [{ id: "top", text: "Top" }] },
        });
        await held.styles.add({
            name: "Top off",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labels": [{ id: "top", off: true }] },
        });
        await held.styles.add({
            name: "Colors",
            target: "node",
            selector: { match: "everything" },
            encode: {
                [labelFieldAddress("node", "ghost", "color")]: { value: "#ff0000" },
                [labelFieldAddress("node", "top", "color")]: { value: "#ff0000" },
            },
        });
        await held.paintAll();
        assert.strictEqual(labelsOf(held.painter.nodePaint(0)).size, 0, "no duplicate of the main label");
    });

    it("proposes a binding for one field of one label from a column", async () => {
        const session = createGraphSession();
        await session.data.addNodes([
            { id: "a", rank: 1 },
            { id: "b", rank: 9 },
        ]);
        const channel = labelFieldAddress("node", "top", "sizePx");
        const proposal = session.styles.proposeEncoding({ column: { kind: "node", name: "rank" }, channel });
        assert.isTrue(proposal.ok);
        assert.strictEqual(proposal.ok ? proposal.binding.by : undefined, "data.rank");
        session.dispose();
    });

    it("draws an edge's further labels the same way", async () => {
        const held = painterHarness(NODES, EDGES);
        await held.styles.add({
            name: "Edge labels",
            target: "edge",
            selector: { match: "everything" },
            set: { "edge.labels": [{ id: "mid", text: "Mid", style: { location: "bottom" } }] },
        });
        await held.paintAll();
        const labels = (held.painter.edgePaint(0)?.style as { labels?: readonly DrawnLabel[] }).labels ?? [];
        assert.strictEqual(labels[0]?.id, "mid");
        assert.strictEqual(labels[0]?.block.text, "Mid");
        assert.strictEqual(labels[0]?.block.location, "bottom");
    });
});
