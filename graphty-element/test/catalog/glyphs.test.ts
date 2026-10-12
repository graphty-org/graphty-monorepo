/**
 * @file Glyph descriptors for node shapes, arrow kinds and line patterns, and named label looks.
 */

import Color from "colorjs.io";
import { assert, describe, it } from "vitest";

import {
    EDGE_ARROW_DESCRIPTORS,
    EDGE_LINE_DESCRIPTORS,
    type GlyphDescriptor,
    LABEL_LOOKS,
    labelLookChanges,
    NODE_SHAPE_DESCRIPTORS,
} from "../../src/catalog/index";
import { EdgeArrowTypes, EdgeLineTypes } from "../../src/config/EdgeStyle";
import { NodeShapes } from "../../src/config/NodeStyle";
import { isGraphtyError } from "../../src/errors";
import { createGraphSession } from "../../src/session";
import type { ElementSession } from "../../src/session/types";

/** The element's default canvas color, which a look with no background sits on. */
const CANVAS = "whitesmoke";

/**
 * Check a table covers a vocabulary exactly, in its order, with a name and a whole SVG each.
 * @param table - The descriptors.
 * @param values - The vocabulary the renderer draws.
 */
function assertCovers(table: readonly GlyphDescriptor[], values: readonly string[]): void {
    assert.deepStrictEqual(
        table.map((entry) => entry.id),
        [...values],
    );

    for (const entry of table) {
        assert.isAbove(entry.plainName.length, 0, entry.id);
        assert.match(entry.glyph, /^<svg [^>]*viewBox="0 0 24 24"[^>]*>.+<\/svg>$/, entry.id);
        assert.include(entry.glyph, "currentColor", entry.id);
    }

    assert.strictEqual(new Set(table.map((entry) => entry.plainName)).size, table.length, "names are distinct");
}

describe("glyph descriptors", () => {
    it("names and draws every node shape", () => {
        assertCovers(NODE_SHAPE_DESCRIPTORS, NodeShapes.options);
    });

    it("names and draws every arrow kind", () => {
        assertCovers(EDGE_ARROW_DESCRIPTORS, EdgeArrowTypes.options);
    });

    it("names and draws every line pattern", () => {
        assertCovers(EDGE_LINE_DESCRIPTORS, EdgeLineTypes.options);
    });
});

describe("label looks", () => {
    it("measures every look's text at 4.5:1 or more against its background", () => {
        for (const look of LABEL_LOOKS) {
            const text = new Color(look.style.color ?? "#000000");
            const background = new Color(look.style.background ?? CANVAS);
            const ratio = text.contrast(background, "WCAG21");
            assert.isAtLeast(ratio, 4.5, `${look.id} measures ${ratio.toFixed(2)}:1`);
        }
    });

    it("reports exactly the one field a layer changed from its look", () => {
        assert.deepStrictEqual(labelLookChanges({ look: "card", color: "#000000" }), ["color"]);
        assert.deepStrictEqual(labelLookChanges({ look: "card", background: "#ffffff", sizePx: 30 }), ["sizePx"]);
        assert.deepStrictEqual(labelLookChanges({ look: "pill", enabled: false }), [], "the eye is not an edit");
        assert.deepStrictEqual(labelLookChanges({ weight: "bold" }), ["weight"], "no look reads as the default look");
    });

    it("does not count where a label sits or how it behaves as a change from its look", () => {
        assert.deepStrictEqual(
            labelLookChanges({ look: "card", location: "bottom", onTop: true, pickable: true }),
            [],
            "placement and behavior sit beside the look, not in it",
        );
        assert.deepStrictEqual(labelLookChanges({ look: "card", location: "bottom", font: "serif" }), ["font"]);
    });

    it("paints a look's fields beneath the layer's own, over the layers beneath", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.styles.add({
            name: "Big red",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { sizePx: 40, background: "#ff0000" } },
        });
        await session.styles.add({
            name: "Dark",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { look: "dark", padding: 2 } },
        });

        const element = session as ElementSession;
        await element.paint.repaintAll(element.styles.compiled(), {
            signal: new AbortController().signal,
            report: () => undefined,
        });
        const label = element.paint.styleOf("node", 0)["node.labelStyle"] as Record<string, unknown>;

        assert.strictEqual(label.background, "#222222", "the look covers the background beneath");
        assert.strictEqual(label.color, "#ffffff");
        assert.strictEqual(label.padding, 2, "the layer's own field wins over its look");
        assert.strictEqual(label.sizePx, 40, "a field the look leaves alone keeps what lies beneath");
    });

    it("refuses a look the catalog does not have", async () => {
        const session = createGraphSession();
        await session.data.addNodes([{ id: "a" }]);

        const refused = await session.styles
            .add({
                name: "Typo",
                target: "node",
                selector: { match: "everything" },
                set: { "node.labelStyle": { look: "cards" as "card" } },
            })
            .then(
                () => null,
                (error: unknown) => error,
            );

        assert.isTrue(isGraphtyError(refused), "a typo is an error, not a silent default");
    });
});
