/**
 * @file `styles.sequence(binding, { channel, count })`: what a binding paints for items taken in
 * order, read without any data -- a palette, a shape list, a size ramp or a line pattern across a
 * folder's layers.
 */

import { assert, describe, it } from "vitest";

import { PALETTE_DESCRIPTORS } from "../../../src/catalog/palettes";
import type { NodeId } from "../../../src/catalog/types";
import { createGraphSession } from "../../../src/session";
import { OVERFLOW_SHAPES } from "../../../src/session/styles/encoding";

/**
 * A painted colour as a lower-case hex.
 * @param paint - What the sequence painted.
 * @returns The hex.
 */
function hex(paint: unknown): string {
    return String((paint as { hex?: string } | null)?.hex ?? paint)
        .slice(0, 7)
        .toLowerCase();
}

describe("styles.sequence", () => {
    it("gives item i the palette's i-th colour", () => {
        const s = createGraphSession();
        const palette = PALETTE_DESCRIPTORS.find((p) => p.id === "okabe-ito");
        assert.isDefined(palette);
        const seq = s.styles.sequence({ palette: "okabe-ito" }, { channel: "node.color", count: 5 });
        assert.strictEqual(seq.palette, "okabe-ito");
        assert.deepEqual(
            seq.values.map(hex),
            (palette?.colors ?? []).slice(0, 5).map((c) => c.slice(0, 7).toLowerCase()),
        );
        assert.isNull(seq.cue);
    });

    it("past the palette, repeats colours and steps a second cue with overflow shape", () => {
        const s = createGraphSession();
        const capacity = PALETTE_DESCRIPTORS.find((p) => p.id === "okabe-ito")?.colors.length ?? 0;
        const seq = s.styles.sequence(
            { palette: "okabe-ito", overflow: "shape" },
            { channel: "node.color", count: capacity + 2 },
        );
        assert.lengthOf(seq.values, capacity + 2);
        assert.strictEqual(hex(seq.values[capacity]), hex(seq.values[0]));
        assert.strictEqual(seq.cue?.channel, "node.shape");
        assert.strictEqual(seq.cue?.values[0], OVERFLOW_SHAPES[0]);
        assert.strictEqual(seq.cue?.values[capacity], OVERFLOW_SHAPES[1]);
    });

    it("gives every item a colour of its own with overflow extend", () => {
        const s = createGraphSession();
        const seq = s.styles.sequence(
            { palette: "okabe-ito", overflow: "extend" },
            { channel: "node.color", count: 12 },
        );
        assert.lengthOf(new Set(seq.values.map(hex)), 12);
    });

    it("gives a different shape per item from the channel's list, or from the choices given", () => {
        const s = createGraphSession();
        const shapes = s.styles.sequence({}, { channel: "node.shape", count: 4 }).values;
        assert.lengthOf(new Set(shapes), 4);
        const chosen = s.styles.sequence({ choices: ["box", "cone"] }, { channel: "node.shape", count: 2 }).values;
        assert.deepEqual(chosen, ["box", "cone"]);
    });

    it("spreads a size evenly over the range, first item at its first end", () => {
        const s = createGraphSession();
        assert.deepEqual(s.styles.sequence({ range: [1, 3] }, { channel: "node.size", count: 3 }).values, [1, 2, 3]);
        assert.deepEqual(s.styles.sequence({ range: [1, 3] }, { channel: "node.size", count: 1 }).values, [1]);
        assert.deepEqual(s.styles.sequence({ range: [1, 3] }, { channel: "node.size", count: 0 }).values, []);
    });

    it("gives a different line pattern per edge item", () => {
        const s = createGraphSession();
        const patterns = s.styles.sequence({}, { channel: "edge.style", count: 3 }).values;
        assert.lengthOf(new Set(patterns), 3);
    });

    it("refuses a palette the channel cannot take, as writing it would", () => {
        const s = createGraphSession();
        assert.throws(() => s.styles.sequence({ palette: "nope" }, { channel: "node.color", count: 2 }));
    });

    it("writes each of several layers its own value, as the guide shows", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        const layers: string[] = [];
        for (const id of ["a", "b", "c"]) {
            const layer = await session.styles.add({
                name: id,
                target: "node",
                selector: { match: "ids", nodes: [id] as NodeId[] },
                set: { "node.size": 1 },
            });
            layers.push(layer.id);
        }
        const { values } = session.styles.sequence(
            { palette: "okabe-ito" },
            { channel: "node.color", count: layers.length },
        );
        await session.styles.updateMany(layers.map((id, i) => ({ id, patch: { set: { "node.color": values[i] } } })));
        assert.lengthOf(new Set(layers.map((id) => hex(session.styles.get(id)?.set?.["node.color"]))), 3);
    });

    it("keeps a map entry for one item and the palette's order for the rest, past ten items", () => {
        const s = createGraphSession();
        const plain = s.styles.sequence(
            { palette: "okabe-ito", overflow: "extend" },
            { channel: "node.color", count: 12 },
        );
        const seq = s.styles.sequence(
            { palette: "okabe-ito", overflow: "extend", map: { "1": "#000000", "11": "#ffffff" } },
            { channel: "node.color", count: 12 },
        );
        assert.strictEqual(hex(seq.values[1]), "#000000");
        assert.strictEqual(hex(seq.values[11]), "#ffffff");
        assert.deepEqual(
            [0, 2, 3, 9, 10].map((at) => hex(seq.values[at])),
            [0, 2, 3, 9, 10].map((at) => hex(plain.values[at])),
            "the other items keep their colours, in item order",
        );
        const shapes = s.styles.sequence(
            { choices: [...OVERFLOW_SHAPES], map: { "2": "torus" } },
            { channel: "node.shape", count: 4 },
        );
        assert.deepEqual(shapes.values, [OVERFLOW_SHAPES[0], OVERFLOW_SHAPES[1], "torus", OVERFLOW_SHAPES[3]]);
    });
});
