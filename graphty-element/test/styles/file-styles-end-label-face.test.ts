/**
 * @file An edge's head and tail labels drawn in a face of their own (Graphviz's `labelfontsize`, `labelfontcolor`
 * and `labelfontname`), loaded with `styles: "file"`: each end caption takes the end's own face, over the label's,
 * and the end without one keeps the label's (dot-specimen-edge-labels drew `H` at 10 where Graphviz draws 16, black
 * where it draws red, in the sans face where it draws the serif one).
 */
import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../session";

/**
 * What the styles resolve one channel of the edge between two nodes to.
 * @param session - The session.
 * @param ends - The edge's ends, `source->target`.
 * @param channel - The channel.
 * @returns The value, or undefined when nothing paints it.
 */
function resolved(session: GraphSession, ends: string, channel: string): unknown {
    const edge = session.data.edges().find((e) => `${String(e.source)}->${String(e.target)}` === ends);
    if (edge === undefined) {
        assert.fail(`no edge ${ends}`);
    }

    return (session.styles.explain({ edge: edge.id }).merged as Record<string, unknown>)[channel];
}

/**
 * A color value as lowercase `#rrggbb`.
 * @param value - The value.
 * @returns The hex.
 */
function hex(value: unknown): string {
    const text = typeof value === "object" && value !== null && "hex" in value ? (value as { hex: string }).hex : value;
    return String(text).slice(0, 7).toLowerCase();
}

describe("a DOT edge's end labels in a face of their own", () => {
    it("draws each end caption in the end's face, the label's where the end has none", async () => {
        const doc = `digraph {
            a -> b [headlabel="H", taillabel="T", labelfontsize=16, labelfontcolor="#e41a1c", labelfontname="DejaVu Serif",
                fontname="DejaVu Sans", fontsize=10, fontcolor="#000000"]
            c -> d [headlabel="H", fontname="DejaVu Sans", fontsize=10, fontcolor="#000000"]
        }`;
        const session = createGraphSession();
        try {
            await session.data.import(
                { type: "dot", config: { data: new TextEncoder().encode(doc) } },
                { styles: "file" },
            );
            const big = resolved(session, "a->b", "edge.arrowHeadTextLetterSize");
            const plain = resolved(session, "c->d", "edge.arrowHeadTextLetterSize");
            assert.isNumber(big);
            assert.isNumber(plain);
            assert.closeTo((big as number) / (plain as number), 1.6, 0.05, "16 against the label's 10");
            assert.strictEqual(resolved(session, "a->b", "edge.arrowTailTextLetterSize"), big);
            assert.strictEqual(hex(resolved(session, "a->b", "edge.arrowHeadTextColor")), "#e41a1c");
            assert.strictEqual(hex(resolved(session, "c->d", "edge.arrowHeadTextColor")), "#000000");
            assert.match(String(resolved(session, "a->b", "edge.arrowTailTextFont")), /^DejaVu Serif/);
            assert.match(String(resolved(session, "c->d", "edge.arrowHeadTextFont")), /^DejaVu Sans/);
        } finally {
            session.dispose();
        }
    });
});
