/**
 * Every text row of Style panel v2 carries its Size and Color lines (ia-design.md section 2: "Common lines Size
 * and Color"), drawn whether set or not, on the REAL graphty-element and real input: on the node Label, External
 * label and Tooltip, on the edge Label, End caption, External label and Tooltip, and on the node Label's Glyph
 * kind (which writes `node.glyphSize` and `node.glyphColor`), a reader types a size and then a color into the
 * row's own lines, and each changes the picture.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/** One text row: where it is, what the layer holds for it to draw, and the channels its two lines write. */
interface TextKind {
    readonly name: string;
    readonly side: "node" | "edge";
    readonly thing: string;
    readonly set: Readonly<Record<string, unknown>>;
    /** The Size and Color lines' `data-line`. */
    readonly size: string;
    readonly color: string;
    /** Drawn only while the pointer is over its node or line. */
    readonly hovered?: true;
}

const KINDS: readonly TextKind[] = [
    {
        name: "node Label",
        side: "node",
        thing: "label",
        set: { "node.label": "Hello" },
        size: "node.labelStyle.size",
        color: "node.labelStyle.color",
    },
    {
        name: "node External label",
        side: "node",
        thing: "xlabel",
        set: { "node.xlabel": "Hello" },
        size: "node.xlabelStyle.size",
        color: "node.xlabelStyle.color",
    },
    {
        name: "node Tooltip",
        side: "node",
        thing: "tooltip",
        set: { "node.tooltip": "Hello" },
        size: "node.tooltipStyle.size",
        color: "node.tooltipStyle.color",
        hovered: true,
    },
    {
        name: "node Glyph",
        side: "node",
        thing: "label",
        set: { "node.glyph": "A" },
        size: "node.glyphSize",
        color: "node.glyphColor",
    },
    {
        name: "edge Label",
        side: "edge",
        thing: "label",
        set: { "edge.label": "Hello" },
        size: "edge.labelStyle.size",
        color: "edge.labelStyle.color",
    },
    {
        name: "edge End caption",
        side: "edge",
        thing: "endCaption",
        set: { "edge.arrowHead": "normal", "edge.arrowHeadText": "Hello" },
        size: "edge.arrowHeadTextStyle.size",
        color: "edge.arrowHeadTextStyle.color",
    },
    {
        name: "edge source End caption",
        side: "edge",
        thing: "endCaption",
        set: { "edge.arrowTail": "normal", "edge.arrowTailText": "Hello" },
        size: "edge.arrowTailTextStyle.size",
        color: "edge.arrowTailTextStyle.color",
    },
    {
        name: "edge External label",
        side: "edge",
        thing: "xlabel",
        set: { "edge.xlabel": "Hello" },
        size: "edge.xlabelStyle.size",
        color: "edge.xlabelStyle.color",
    },
    {
        name: "edge Tooltip",
        side: "edge",
        thing: "tooltip",
        set: { "edge.tooltip": "Hello" },
        size: "edge.tooltipStyle.size",
        color: "edge.tooltipStyle.color",
        hovered: true,
    },
];

/**
 * Waits for a line in a part of the page.
 * @param root - where it is.
 * @param line - its `data-line`.
 * @returns the line.
 */
async function lineOf(root: ParentNode, line: string): Promise<HTMLElement> {
    return waitFor(() => {
        const found = root.querySelector<HTMLElement>(`.ws-row[data-line="${line}"]`);
        assert.isNotNull(found, line);
        return found;
    });
}

/**
 * Types into a line's first field and commits it with Enter.
 * @param line - the line.
 * @param text - what to type.
 */
async function typeInto(line: HTMLElement, text: string): Promise<void> {
    const input = line.querySelector<HTMLInputElement>("input");
    assert.isNotNull(input);
    await userEvent.click(input);
    await userEvent.keyboard("{Control>}a{/Control}");
    await userEvent.keyboard(`${text}{Enter}`);
}

describe("Style panel v2's text rows carry Size and Color", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const kind of KINDS) {
        it(`the ${kind.name} row's Size and Color lines each change the picture`, async () => {
            const { session, element, nodes, edges } = await openGraph();
            const layer = kind.side === "node" ? nodes : edges;
            await session.styles.update(layer, { set: { ...session.styles.get(layer)?.set, ...kind.set } });
            await session.styles.settled();
            const tab = await openStyle(kind.side === "node" ? "Key people" : "Links");
            await showKind(kind.side);
            const section = sectionOf(tab, `${kind.side}-text`);
            const row = await waitFor(() => {
                const found = section.querySelector<HTMLElement>(`[data-thing="${kind.thing}"]`);
                assert.isNotNull(found);
                return found;
            });
            const shot = async (): Promise<ImageData> => {
                await session.styles.settled();
                if (kind.hovered === true) {
                    const [a, b] = ["a", "b"].map((id) => element.nodeScreenPosition(id));
                    assert.isDefined(a);
                    assert.isDefined(b);
                    await userEvent.hover(element, { position: { x: 4, y: 4 } });
                    await userEvent.hover(element, {
                        position: kind.side === "node" ? a : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                    });
                }
                return picture(element);
            };

            // Both lines are on the row before either is set.
            const size = await lineOf(row, kind.size);
            await lineOf(row, kind.color);
            assert.isFalse(size.hasAttribute("data-set"), "Size is drawn unset");

            const before = await shot();
            await typeInto(size, "2");
            await waitFor(() => {
                const value = written(session, layer, kind.size.split(".").slice(0, 2).join("."));
                const held = kind.size.split(".").length === 3 ? (value as Record<string, unknown>).size : value;
                assert.equal(held, 2, "Size is written");
            });
            const sized = await shot();
            assert.isAbove(pixelsApart(before, sized), 0, "Size changes the picture");

            await typeInto(await lineOf(row, kind.color), "FF0000");
            await waitFor(() => {
                const value = written(session, layer, kind.color.split(".").slice(0, 2).join("."));
                const held = kind.color.split(".").length === 3 ? (value as Record<string, unknown>).color : value;
                assert.equal(String(held).toUpperCase(), "#FF0000", "Color is written");
            });
            assert.isAbove(pixelsApart(sized, await shot()), 0, "Color changes the picture");
        });
    }
});
