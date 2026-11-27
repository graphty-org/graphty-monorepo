/**
 * Style panel v2's collapsed kinds on the REAL graphty-element and real input (implementation plan 6.2, owner
 * round 5: "review all other controls that can be collapsed down ... implement the candidate list"): an edge's
 * four arrows are one Arrow item (C6), its two end captions one End caption item (C1) and a node's underlay and
 * overlay one Plate item (C2), and every band along an edge's line one Outline item (C7). A layer holding the channels graph-io writes for two kinds shows one row per kind
 * with its value; a row's Kind select moves it to a free kind and one Undo takes that back; "+" adds the first
 * kind no row draws yet.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { findValuePicker, screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import {
    closeSettings,
    openGraph,
    openStyle,
    pickKind,
    picture,
    pixelsApart,
    sectionOf,
    switchView,
    written,
} from "./v2Harness";

/** A row's one "..." settings button, whatever its kind. */
const ROW_SETTINGS = /^.+ settings( |$)/;

/** One collapse: its section, its thing, two kinds' channels as graph-io writes them, and a free kind. */
interface Collapse {
    readonly name: string;
    readonly side: "node" | "edge";
    readonly section: string;
    readonly thing: string;
    /** The two kinds the layer starts with: their row names and what they write. */
    readonly kinds: readonly {
        readonly row: string;
        readonly set: Readonly<Record<string, unknown>>;
        /** What its row shows as its main value (an arrowhead's name, a caption's words, a plate's color). */
        readonly shows: string;
    }[];
    /** The kind the first row switches to when it is alone on the layer: its name and main channel. */
    readonly free: { readonly row: string; readonly head: string };
    /** The first kind's main channel. */
    readonly head: string;
    /** A further value of the first kind a switch carries, and what the free kind then holds there. */
    readonly carries: { readonly to: string; readonly value: unknown };
    /** The view its kinds are drawn in, when one is drawn only in 2D (hidden in 3D). */
    readonly view?: "2D";
}

const COLLAPSES: readonly Collapse[] = [
    {
        name: "Arrow (C6)",
        side: "edge",
        section: "edge-arrows",
        thing: "arrow",
        kinds: [
            { row: "Target", set: { "edge.arrowHead": "vee", "edge.arrowHeadSize": 1.5 }, shows: "vee" },
            { row: "Source", set: { "edge.arrowTail": "tee" }, shows: "tee" },
        ],
        free: { row: "Middle to target", head: "edge.arrowMiddleHead" },
        head: "edge.arrowHead",
        carries: { to: "edge.arrowMiddleHeadSize", value: 1.5 },
    },
    {
        name: "End caption (C1)",
        side: "edge",
        section: "edge-text",
        thing: "endCaption",
        kinds: [
            {
                row: "Target",
                set: { "edge.arrowHeadText": "inbound", "edge.arrowHeadTextColor": "#00ff00" },
                shows: "inbound",
            },
            { row: "Source", set: { "edge.arrowTailText": "outbound" }, shows: "outbound" },
        ],
        free: { row: "Source", head: "edge.arrowTailText" },
        head: "edge.arrowHeadText",
        carries: { to: "edge.arrowTailTextColor", value: "#00ff00" },
    },
    {
        name: "Plate (C2)",
        side: "node",
        section: "node-effects",
        thing: "plate",
        kinds: [
            {
                row: "Behind",
                set: {
                    "node.underlayColor": "#ff0000",
                    "node.underlayOpacity": 1,
                    "node.underlayPadding": 0.4,
                    "node.underlayShape": "hexagon",
                },
                shows: "ff0000",
            },
            { row: "Over", set: { "node.overlayColor": "#0000ff", "node.overlayOpacity": 0.3 }, shows: "0000ff" },
        ],
        free: { row: "Over", head: "node.overlayColor" },
        head: "node.underlayColor",
        // The shape is carried; the opacity and padding start as graphty-element starts a plate over the node.
        carries: { to: "node.overlayShape", value: "hexagon" },
        view: "2D",
    },
    {
        name: "Outline (C7)",
        side: "edge",
        section: "edge-line",
        thing: "outline",
        kinds: [
            { row: "Under line", set: { "edge.outlineColor": "#ff0000", "edge.outlineWidth": 3 }, shows: "ff0000" },
            {
                row: "Over line",
                set: { "edge.overlayColor": "#0000ff", "edge.overlayOpacity": 0.3, "edge.overlayPadding": 5 },
                shows: "0000ff",
            },
        ],
        free: { row: "Over line", head: "edge.overlayColor" },
        head: "edge.outlineColor",
        // The color moves; the wash over the line starts translucent (ia-design 2).
        carries: { to: "edge.overlayOpacity", value: 0.3 },
        view: "2D",
    },
];

/**
 * The thing's rows in the section.
 * @param section - the section.
 * @param thing - the thing's id.
 * @returns the rows.
 */
function rowsOf(section: HTMLElement, thing: string): HTMLElement[] {
    return [...section.querySelectorAll<HTMLElement>(`[data-thing="${thing}"]`)];
}

/**
 * Everything a row shows a reader as its value: its text and its fields' values, lower case.
 * @param row - the row.
 * @returns the words.
 */
function shownIn(row: HTMLElement): string {
    const values = [...row.querySelectorAll<HTMLInputElement>("input")].map((input) => input.value);
    return [row.textContent, ...values].join(" ").toLowerCase();
}

/**
 * Opens a section's "+" and picks an item from its menu.
 * @param section - the section.
 * @param add - the "+" button's name.
 * @param item - the menu item.
 */
async function plus(section: HTMLElement, add: RegExp, item: string): Promise<void> {
    await userEvent.click(within(section).getByRole("button", { name: add }));
    await userEvent.click(await screen.findByRole("menuitem", { name: new RegExp(`^${item}`) }));
}

describe("Style panel v2's collapsed kinds", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    for (const collapse of COLLAPSES) {
        it(`${collapse.name}: one row per kind, Kind moves a row and Undo takes it back, '+' adds a free kind`, async () => {
            const { session, nodes, edges } = await openGraph();
            const layer = collapse.side === "node" ? nodes : edges;
            const set = collapse.kinds.reduce<Record<string, unknown>>((all, kind) => ({ ...all, ...kind.set }), {});
            await session.styles.update(layer, { set });
            await session.styles.settled();
            if (collapse.view !== undefined) {
                await switchView(collapse.view);
            }
            const tab = await openStyle(collapse.side === "node" ? "Key people" : "Links");
            await showKind(collapse.side);
            const section = sectionOf(tab, collapse.section);
            await waitFor(() => {
                const rows = rowsOf(section, collapse.thing);
                assert.lengthOf(rows, collapse.kinds.length, "one row per kind");
                collapse.kinds.forEach((kind, at) => {
                    const row = rows[at];
                    assert.include(shownIn(row), kind.shows, `the ${kind.row} row shows its value`);
                });
            });
            // With only the first kind on the layer, its row's Kind select moves it to a free kind; Undo takes it back.
            const [first] = collapse.kinds;
            await session.styles.update(layer, { set: { ...first?.set } });
            await session.styles.settled();
            await waitFor(() => {
                assert.lengthOf(rowsOf(section, collapse.thing), 1);
            });
            const before = written(session, layer, collapse.head);
            const [row] = rowsOf(section, collapse.thing);
            await pickKind(row, ROW_SETTINGS, collapse.free.row);
            await closeSettings();
            await waitFor(() => {
                assert.isUndefined(written(session, layer, collapse.head), "the old kind's value comes off");
                assert.equal(written(session, layer, collapse.free.head), before, "and moves to the new kind");
                assert.equal(written(session, layer, collapse.carries.to), collapse.carries.value, "with its settings");
            });
            await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
            await waitFor(() => {
                assert.equal(written(session, layer, collapse.head), before, "Undo brings it back");
                assert.isUndefined(written(session, layer, collapse.free.head));
            });
        });
    }

    it("a kind holding only a setting, not its main value, still has its row (a file colors an arrow it gives no shape)", async () => {
        const { session, edges } = await openGraph();
        await session.styles.update(edges, { set: { "edge.arrowHeadColor": "#ff0000", "edge.arrowTail": "tee" } });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const section = sectionOf(tab, "edge-arrows");
        await waitFor(() => {
            const rows = rowsOf(section, "arrow");
            assert.lengthOf(rows, 2, "a Target row for the color and a Source row");
            assert.isNotNull(rows[0].querySelector('[data-line="edge.arrowHeadColor"]'), "the color line is reachable");
        });
    });

    it("End caption: '+' gives a Target caption, '+' again a Source caption waiting for its words", async () => {
        const { session, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("edge");
        const section = sectionOf(tab, "edge-text");
        await plus(section, /^Add to edge text/, "End caption");
        // A caption's words come from its source list, open at once; Fixed text opens the words' own field.
        await userEvent.click(within(await findValuePicker()).getByRole("option", { name: "Fixed text" }));
        await userEvent.click(await screen.findByRole("textbox", { name: "Edge target text" }));
        await userEvent.keyboard("hi{Enter}");
        await waitFor(() => {
            assert.equal(written(session, edges, "edge.arrowHeadText"), "hi", "the first is the target end");
            assert.lengthOf(rowsOf(section, "endCaption"), 1);
        });
        await plus(section, /^Add to edge text/, "End caption");
        await findValuePicker();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            const rows = rowsOf(section, "endCaption");
            assert.lengthOf(rows, 2, "the second '+' adds a Source row");
            const source = within(rows[1]).getByRole("button", { name: /^Edge source source/ });
            assert.equal(source.textContent.trim(), "No words", "waiting for its words, never empty");
            assert.isUndefined(written(session, edges, "edge.arrowTailText"), "nothing written yet");
        });
    });

    it("Plate: '+' starts a card behind the node larger than it, '+' again a translucent plate over it", async () => {
        const { session, element, nodes } = await openGraph();
        // A plate draws in the 2D view only (E669).
        await switchView("2D");
        const tab = await openStyle("Key people");
        await showKind("node");
        const section = sectionOf(tab, "node-effects");
        const bare = await picture(element);
        await plus(section, /^Add to node effects/, "Plate");
        await waitFor(() => {
            assert.isDefined(written(session, nodes, "node.underlayColor"), "the first '+' is Behind");
            assert.equal(written(session, nodes, "node.underlayShape"), "round-rectangle", "a card's shape");
            assert.isAbove(Number(written(session, nodes, "node.underlayPadding")), 0, "larger than the node");
            assert.lengthOf(rowsOf(section, "plate"), 1);
        });
        await session.styles.settled();
        const card = await picture(element);
        assert.isAbove(pixelsApart(bare, card), 0, "the plate draws behind the node");
        // The card's corners reach past the round node: without the shape the plate is a ring the node's own shape.
        const { "node.underlayShape": _shape, ...rest } = session.styles.get(nodes)?.set ?? {};
        await session.styles.update(nodes, { set: rest });
        await session.styles.settled();
        assert.isAbove(pixelsApart(card, await picture(element)), 0, "a card, not the node's own shape");
        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, nodes, "node.underlayShape"), "round-rectangle");
        });
        await plus(section, /^Add to node effects/, "Plate");
        await waitFor(() => {
            assert.isDefined(written(session, nodes, "node.overlayColor"), "the second is Over");
            assert.equal(written(session, nodes, "node.overlayOpacity"), 0.3, "translucent");
            assert.equal(written(session, nodes, "node.overlayPadding"), 0.1, "a tenth of the node past it");
            assert.lengthOf(rowsOf(section, "plate"), 2);
        });
    });

    it("Plate: Kind Over starts at Opacity 30% and a padding of a tenth of the node (ia-design 2)", async () => {
        const { session, nodes } = await openGraph();
        await switchView("2D");
        const tab = await openStyle("Key people");
        await showKind("node");
        const section = sectionOf(tab, "node-effects");
        await plus(section, /^Add to node effects/, "Plate");
        await waitFor(() => {
            assert.lengthOf(rowsOf(section, "plate"), 1);
        });
        const [row] = rowsOf(section, "plate");
        await pickKind(row, ROW_SETTINGS, "Over");
        await waitFor(() => {
            assert.isUndefined(written(session, nodes, "node.underlayColor"));
            assert.equal(written(session, nodes, "node.overlayOpacity"), 0.3);
            assert.equal(written(session, nodes, "node.overlayPadding"), 0.1);
        });
    });

    for (const shape of [undefined, "hexagon"] as const) {
        it(`Plate: Kind Behind on an Over plate ${shape === undefined ? "with no shape starts a card" : "keeps its shape"}`, async () => {
            const { session, nodes } = await openGraph();
            // An Over plate the layer already holds, as a file writes one: no Behind values held from an earlier switch.
            await session.styles.update(nodes, {
                set: {
                    ...session.styles.get(nodes)?.set,
                    "node.overlayColor": "#000000",
                    "node.overlayOpacity": 0.3,
                    ...(shape === undefined ? {} : { "node.overlayShape": shape }),
                },
            });
            await session.styles.settled();
            await switchView("2D");
            const tab = await openStyle("Key people");
            await showKind("node");
            const section = sectionOf(tab, "node-effects");
            const [row] = await waitFor(() => {
                const rows = rowsOf(section, "plate");
                assert.lengthOf(rows, 1);
                return rows;
            });
            await pickKind(row, ROW_SETTINGS, "Behind");
            await waitFor(() => {
                assert.isUndefined(written(session, nodes, "node.overlayColor"));
                assert.equal(written(session, nodes, "node.underlayShape"), shape ?? "round-rectangle");
                assert.equal(written(session, nodes, "node.underlayOpacity"), 1, "opaque, as '+' starts it");
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
            assert.equal(written(session, edges, "edge.arrowHeadSize"), 1, "with its size, so its Size line shows");
            const [row] = rowsOf(section, "arrow");
            assert.isNotNull(row.querySelector('[data-line="edge.arrowHeadSize"]'), "a Size line under the row");
            assert.lengthOf(rowsOf(section, "arrow"), 1);
        });
        await userEvent.click(within(section).getByRole("button", { name: /^Add to edge arrows/ }));
        await waitFor(() => {
            assert.isDefined(written(session, edges, "edge.arrowTail"), "the second adds the source arrow");
            assert.lengthOf(rowsOf(section, "arrow"), 2);
        });
    });
});
