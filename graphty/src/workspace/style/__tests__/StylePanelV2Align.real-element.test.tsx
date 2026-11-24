/**
 * Style panel v2's Align line on the REAL graphty-element and real input (E672: "changing alignment on labels didn't
 * have any visual effect on the screen"): on every text kind that shows Align, a reader opens the row's settings and
 * picks Left, Center and Right, and each draws a one-line text in a different place. The panel writes the box
 * graphty-element says alignment needs (`LabelStyleFieldDescriptor.needs`: a box as wide as the node, or for edge
 * text a band six of its own line heights wide), since a one-line text's own box is its words and lines nothing up.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, popoverLine, sectionOf, written } from "./v2Harness";

/** One text kind with an Align line: where its row is and what the layer holds for it to draw. */
interface AlignKind {
    readonly name: string;
    readonly side: "node" | "edge";
    readonly thing: string;
    readonly style: string;
    readonly set: Readonly<Record<string, unknown>>;
    /** Drawn only while the pointer is over its node or line. */
    readonly hovered?: true;
}

/** A small panel behind the words, so where they sit shows. */
const LOOK = { background: "#FFCC00" };

const KINDS: readonly AlignKind[] = [
    { name: "node Label", side: "node", thing: "label", style: "node.labelStyle", set: { "node.label": "ab" } },
    {
        name: "node External label",
        side: "node",
        thing: "xlabel",
        style: "node.xlabelStyle",
        set: { "node.xlabel": "ab" },
    },
    {
        name: "node Tooltip",
        side: "node",
        thing: "tooltip",
        style: "node.tooltipStyle",
        set: { "node.tooltip": "ab" },
        hovered: true,
    },
    { name: "edge Label", side: "edge", thing: "label", style: "edge.labelStyle", set: { "edge.label": "ab" } },
    {
        name: "edge End caption",
        side: "edge",
        thing: "endCaption",
        style: "edge.arrowHeadTextStyle",
        set: { "edge.arrowHead": "normal", "edge.arrowHeadText": "ab" },
    },
    {
        name: "edge Start caption",
        side: "edge",
        thing: "endCaption",
        style: "edge.arrowTailTextStyle",
        set: { "edge.arrowTail": "normal", "edge.arrowTailText": "ab" },
    },
    {
        name: "edge External label",
        side: "edge",
        thing: "xlabel",
        style: "edge.xlabelStyle",
        set: { "edge.xlabel": "ab" },
    },
    {
        name: "edge Tooltip",
        side: "edge",
        thing: "tooltip",
        style: "edge.tooltipStyle",
        set: { "edge.tooltip": "ab" },
        hovered: true,
    },
];

/**
 * The label style a layer writes for a kind.
 * @param session - the session.
 * @param id - the layer.
 * @param style - the kind's style channel.
 * @returns the style, or an empty one.
 */
function styleOf(session: GraphSession, id: string, style: string): Record<string, unknown> {
    const value = written(session, id, style);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

describe("Style panel v2's Align line", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const kind of KINDS) {
        it(`on the ${kind.name}, Left, Center and Right each draw the one-line text somewhere else`, async () => {
            const { session, element, nodes, edges } = await openGraph();
            const layer = kind.side === "node" ? nodes : edges;
            // Wide nodes, so a node's text has room across its node.
            await session.styles.update(nodes, { set: { ...session.styles.get(nodes)?.set, "node.size": 4 } });
            await session.styles.update(layer, {
                set: { ...session.styles.get(layer)?.set, ...kind.set, [kind.style]: LOOK },
            });
            await session.styles.settled();
            const tab = await openStyle(kind.side === "node" ? "Key people" : "Links");
            await showKind(kind.side);
            const section = sectionOf(tab, `${kind.side}-text`);
            const row = await waitFor(() => {
                const found = section.querySelector<HTMLElement>(`[data-thing="${kind.thing}"]`);
                assert.isNotNull(found);
                return found;
            });
            const owner = (): { x: number; y: number } => {
                const [a, b] = ["a", "b"].map((id) => element.nodeScreenPosition(id));
                assert.isDefined(a);
                assert.isDefined(b);
                return kind.side === "node" ? a : { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
            };

            const pictures: ImageData[] = [];
            for (const option of ["Left", "Center", "Right"] as const) {
                await userEvent.click(within(row).getByRole("button", { name: / settings/ }));
                const pop = await waitFor(() => {
                    const found = document.querySelector<HTMLElement>("[data-thing-popover]");
                    assert.isNotNull(found);
                    return found;
                });
                // Align is a rare setting, in the pop-over's Advanced dialog.
                const line = await popoverLine(pop, `.ws-row[data-line="${kind.style}.textAlign"]`);
                // The segment's picture is its label; its name is the radio it labels.
                const radio = within(line).getByRole("radio", { name: option });
                const segment = line.querySelector<HTMLElement>(`label[for="${radio.id}"]`);
                assert.isNotNull(segment);
                await userEvent.click(segment);
                await waitFor(() => {
                    const style = styleOf(session, layer, kind.style);
                    assert.equal(style.textAlign, option.toLowerCase(), `${option} is written`);
                    assert.equal(style.box, "words-in-target", "with the box alignment needs");
                });
                // The Advanced dialog closes first, then the pop-over.
                await userEvent.keyboard("{Escape}");
                if (document.querySelector("[data-thing-popover]") !== null) {
                    await userEvent.keyboard("{Escape}");
                }
                await waitFor(() => {
                    assert.isNull(document.querySelector("[data-thing-popover]"));
                });
                await session.styles.settled();
                if (kind.hovered === true) {
                    await userEvent.hover(element, { position: { x: 4, y: 4 } });
                    const at = owner();
                    await userEvent.hover(element, { position: at });
                }
                pictures.push(await picture(element));
            }
            const [left, center, right] = pictures;
            assert.isAbove(pixelsApart(left, center), 0, "Left and Center draw the same picture");
            assert.isAbove(pixelsApart(center, right), 0, "Center and Right draw the same picture");
            assert.isAbove(pixelsApart(left, right), 0, "Left and Right draw the same picture");
        });
    }
});
