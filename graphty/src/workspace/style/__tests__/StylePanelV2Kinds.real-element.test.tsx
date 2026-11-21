/**
 * Style panel v2's collapsed kinds on the REAL graphty-element and real input (implementation plan 6.2, owner
 * round 5: "review all other controls that can be collapsed down ... implement the candidate list"): an edge's
 * four arrows are one Arrow item (C6), its two end captions one End caption item (C1) and a node's underlay and
 * overlay one Plate item (C2). A layer holding the channels graph-io writes for two kinds shows one row per kind
 * with its value; a row's Switch to moves it to a free kind and one Undo takes that back; "+" adds the first
 * kind no row draws yet.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, sectionOf, written } from "./v2Harness";

/** One collapse: its section, its thing, two kinds' channels as graph-io writes them, and a free kind. */
interface Collapse {
    readonly name: string;
    readonly side: "node" | "edge";
    readonly section: string;
    readonly thing: string;
    /** The two kinds the layer starts with: their row names and what they write. */
    readonly kinds: readonly { readonly row: string; readonly set: Readonly<Record<string, unknown>> }[];
    /** The kind the first row switches to when it is alone on the layer: its name and main channel. */
    readonly free: { readonly row: string; readonly head: string };
    /** The first kind's main channel. */
    readonly head: string;
}

const COLLAPSES: readonly Collapse[] = [
    {
        name: "Arrow (C6)",
        side: "edge",
        section: "edge-arrows",
        thing: "arrow",
        kinds: [
            { row: "Target", set: { "edge.arrowHead": "vee", "edge.arrowHeadSize": 1.5 } },
            { row: "Source", set: { "edge.arrowTail": "tee" } },
        ],
        free: { row: "Middle to target", head: "edge.arrowMiddleHead" },
        head: "edge.arrowHead",
    },
    {
        name: "End caption (C1)",
        side: "edge",
        section: "edge-text",
        thing: "endCaption",
        kinds: [
            { row: "Target", set: { "edge.arrowHeadText": "in" } },
            { row: "Source", set: { "edge.arrowTailText": "out" } },
        ],
        free: { row: "Source", head: "edge.arrowTailText" },
        head: "edge.arrowHeadText",
    },
    {
        name: "Plate (C2)",
        side: "node",
        section: "node-effects",
        thing: "plate",
        kinds: [
            { row: "Behind", set: { "node.underlayColor": "#ff0000", "node.underlayOpacity": 1 } },
            { row: "Over", set: { "node.overlayColor": "#0000ff", "node.overlayOpacity": 0.3 } },
        ],
        free: { row: "Over", head: "node.overlayColor" },
        head: "node.underlayColor",
    },
];

/**
 * The thing's rows in the section, each read by its Switch to button's name.
 * @param section - the section.
 * @param thing - the thing's id.
 * @returns the rows.
 */
function rowsOf(section: HTMLElement, thing: string): HTMLElement[] {
    return [...section.querySelectorAll<HTMLElement>(`[data-thing="${thing}"]`)];
}

describe("Style panel v2's collapsed kinds", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const collapse of COLLAPSES) {
        it(`${collapse.name}: one row per kind, Switch to moves a row and Undo takes it back, '+' adds a free kind`, async () => {
            const { session, nodes, edges } = await openGraph();
            const layer = collapse.side === "node" ? nodes : edges;
            await session.styles.update(layer, { set: Object.assign({}, ...collapse.kinds.map((kind) => kind.set)) });
            await session.styles.settled();
            const tab = await openStyle(collapse.side === "node" ? "Key people" : "Links");
            await showKind(collapse.side);
            const section = sectionOf(tab, collapse.section);
            await waitFor(() => {
                assert.lengthOf(rowsOf(section, collapse.thing), collapse.kinds.length, "one row per kind");
            });
            // With only the first kind on the layer, its row's Switch to moves it to a free kind; Undo takes it back.
            const [first] = collapse.kinds;
            await session.styles.update(layer, { set: { ...first?.set } });
            await session.styles.settled();
            await waitFor(() => {
                assert.lengthOf(rowsOf(section, collapse.thing), 1);
            });
            const before = written(session, layer, collapse.head);
            const [row] = rowsOf(section, collapse.thing);
            await userEvent.click(within(row).getByRole("button", { name: /^Switch .* to/ }));
            await userEvent.click(await screen.findByRole("menuitem", { name: collapse.free.row }));
            await waitFor(() => {
                assert.isUndefined(written(session, layer, collapse.head), "the old kind's value comes off");
                assert.equal(written(session, layer, collapse.free.head), before, "and moves to the new kind");
            });
            await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
            await waitFor(() => {
                assert.equal(written(session, layer, collapse.head), before, "Undo brings it back");
                assert.isUndefined(written(session, layer, collapse.free.head));
            });
        });
    }

    it("Arrow: '+' gives a Target arrow, '+' again a Source arrow, each its own row", async () => {
        const { session, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("edge");
        const section = sectionOf(tab, "edge-arrows");
        await userEvent.click(within(section).getByRole("button", { name: /^Add to edge arrows/ }));
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.arrowHead"), "the first '+' adds the target arrow");
            assert.lengthOf(rowsOf(section, "arrow"), 1);
        });
        await userEvent.click(within(section).getByRole("button", { name: /^Add to edge arrows/ }));
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.arrowTail"), "the second adds the source arrow");
            assert.lengthOf(rowsOf(section, "arrow"), 2);
        });
    });
});
