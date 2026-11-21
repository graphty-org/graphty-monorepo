/**
 * A label's look is a kind of its row (ledger E196: "the toggle between 'Plain' and 'Card' label must be removed
 * and replaced with `+` having label or card"), on the REAL graphty-element and real input: "+" Card writes the
 * look card; "+" Label always adds a Text label, a further one once a label is drawn; a Label switched to Card from
 * its Switch to writes only the look, on the node and the edge tab; a further label's Switch to writes only its own
 * look; an End caption's Switch to lists its ends, a divider and its looks; and no label pop-over has a Look line.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { LABEL_CAP, type LabelEntry } from "@graphty/graphty-element/catalog";
import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";
import { openGraph, openStyle, picture, pixelsApart, sectionOf, written } from "./v2Harness";

/**
 * Clicks a Text section's "+" and one of its items, then picks Node id from the source list that opens, or on the
 * edge tab types the words.
 * @param tab - the Style tab.
 * @param kind - nodes or edges.
 * @param item - the "+" item.
 * @param list - the source list's name.
 */
async function plus(tab: HTMLElement, kind: "node" | "edge", item: string, list: string): Promise<void> {
    await userEvent.click(within(sectionOf(tab, `${kind}-text`)).getByRole("button", { name: `Add to ${kind} text` }));
    await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
    const [options] = await screen.findAllByRole("group", { name: list });
    if (kind === "node") {
        await userEvent.click(await within(options).findByRole("option", { name: /^Node id/ }));
        return;
    }
    // An edge has no id column to read: its words are typed.
    await userEvent.click(await within(options).findByRole("option", { name: "Fixed text" }));
    await userEvent.click(await screen.findByRole("textbox", { name: `${list} text` }));
    await userEvent.keyboard("link{Enter}");
}

/**
 * Picks an item from a row's Switch to.
 * @param root - where the row is.
 * @param title - the row's title ("node label").
 * @param item - the item.
 */
async function switchTo(root: HTMLElement, title: string, item: string): Promise<void> {
    await userEvent.click(within(root).getByRole("button", { name: `Switch ${title} to` }));
    await userEvent.click(within(await screen.findByRole("menu")).getByRole("menuitem", { name: item }));
}

/**
 * A layer's label style channel as written.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the style channel.
 * @returns it, or an empty one.
 */
function styleOf(session: GraphSession, id: string, channel: string): Record<string, unknown> {
    const value = written(session, id, channel);
    return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/**
 * Everything one layer writes but one channel, to tell that a switch wrote nothing else.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the channel left out.
 * @returns the rest, as text.
 */
function restOf(session: GraphSession, id: string, channel: string): string {
    const layer = session.styles.get(id);
    const set = { ...layer?.set } as Record<string, unknown>;
    Reflect.deleteProperty(set, channel);
    return JSON.stringify({ set, encode: layer?.encode });
}

describe("a label's look is a kind of its row", () => {
    withFeatures(["file-styles", "style-panel-v2"]);

    it("'+' Card writes the look card; '+' Label then adds a further Text label; its Switch to writes only its look", async () => {
        const { session, element, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await plus(tab, "node", "Card", "Node card");
        await waitFor(() => {
            assert.equal(styleOf(session, nodes, "node.labelStyle").look, "card", "'+' Card writes look card");
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"], "its words read Node id");
        });
        // No Look line in its pop-over: the look is its kind.
        const text = sectionOf(tab, "node-text");
        await userEvent.click(within(text).getByRole("button", { name: /^Node card settings/ }));
        const pop = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-thing-popover]");
            assert.isNotNull(found);
            return found;
        });
        assert.isNull(pop.querySelector('.ws-row[data-line$=".look"]'), "no Look line");
        await userEvent.keyboard("{Escape}");

        // "+" Label always adds a Text label: here a further one beside a Card, so it names the plain look, which
        // graphty-element draws plain (a further label naming no look draws in the main label's).
        const id = session.styles.newLabelId(nodes);
        await plus(tab, "node", "Label", "Node label 2");
        await waitFor(() => {
            const value = written(session, nodes, "node.labels") as readonly LabelEntry[] | undefined;
            assert.deepEqual(
                value?.map((entry) => entry.id),
                [id],
            );
            assert.equal(value?.[0]?.style?.look, "default", "a Text label");
        });
        const entry = await waitFor(() => {
            const found = text.querySelector<HTMLElement>(`[data-label-entry="${id}"]`);
            assert.isNotNull(found);
            assert.isNotNull(within(found).queryByRole("button", { name: "Switch node label 2 to" }), "named Label");
            return found;
        });
        // Below the card, so its look shows apart from the card's.
        await session.styles.update(nodes, {
            set: {
                ...session.styles.get(nodes)?.set,
                "node.labels": [{ id, style: { look: "default", location: "bottom" } }],
            },
        });
        await session.styles.settled();
        const plain = await picture(element);
        const before = restOf(session, nodes, "node.labels");
        await switchTo(entry, "node label 2", "Card");
        await waitFor(() => {
            const value = written(session, nodes, "node.labels") as readonly LabelEntry[] | undefined;
            assert.deepEqual(
                value,
                [{ id, style: { look: "card", location: "bottom" } }],
                "only the further label's look",
            );
        });
        assert.equal(restOf(session, nodes, "node.labels"), before, "and nothing else");
        await session.styles.settled();
        // Had the Text label been drawn in the main label's Card, switching it to Card would change nothing.
        assert.isAbove(pixelsApart(plain, await picture(element)), 0, "the Text label was drawn plain, not as a card");
        await switchTo(entry, "node card 2", "Label");
        await waitFor(() => {
            const value = written(session, nodes, "node.labels") as readonly LabelEntry[] | undefined;
            assert.deepEqual(
                value,
                [{ id, style: { look: "default", location: "bottom" } }],
                "Label names the plain look",
            );
        });
        await session.styles.settled();
        assert.equal(pixelsApart(plain, await picture(element)), 0, "and draws plain again");
    });

    it("a row over a Card beneath shows the Card, and its Switch to Label draws it plain", async () => {
        const { session, element, nodes } = await openGraph();
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, "node.label": "x", "node.labelStyle": { look: "card" } },
        });
        await session.styles.add({
            name: "Hubs",
            target: "node",
            selector: { match: "everything" },
            set: { "node.labelStyle": { size: 2 } },
        });
        await session.styles.settled();
        const card = await picture(element);
        const tab = await openStyle("Hubs");
        const text = sectionOf(tab, "node-text");
        await waitFor(() => {
            assert.isNotNull(within(text).queryByRole("button", { name: "Switch node card to" }), "the Card it draws");
        });
        await switchTo(text, "node card", "Label");
        const hubs = session.styles.list().find((layer) => layer.name === "Hubs")?.id ?? "";
        await waitFor(() => {
            assert.deepEqual(styleOf(session, hubs, "node.labelStyle"), { size: 2, look: "default" });
        });
        await session.styles.settled();
        assert.isAbove(pixelsApart(card, await picture(element)), 0, "the card is gone from the picture");
    });

    it("'+' stops offering a further Label at graphty-element's cap", async () => {
        const { session, nodes } = await openGraph();
        const eight = Array.from({ length: LABEL_CAP }, (_, at) => ({ id: `l${String(at)}`, text: "x" }));
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, "node.label": "x", "node.labels": eight.slice(1) },
        });
        await session.styles.settled();
        const tab = await openStyle("Key people");
        const open = async (): Promise<HTMLElement | null> => {
            await userEvent.click(
                within(sectionOf(tab, "node-text")).getByRole("button", { name: "Add to node text" }),
            );
            const menu = await screen.findByRole("menu");
            const item = within(menu).queryByRole("menuitem", { name: "Label" });
            await userEvent.keyboard("{Escape}");
            return item;
        };
        const room = await open();
        assert.isNotNull(room, "room for one more");
        assert.notEqual(room.getAttribute("data-disabled"), "true");
        await session.styles.update(nodes, { set: { ...session.styles.get(nodes)?.set, "node.labels": eight } });
        await session.styles.settled();
        // At the cap Label is still listed, but not pickable, and so is every look it adds.
        const disabled = (item: HTMLElement | null): boolean =>
            item !== null && (item.getAttribute("data-disabled") === "true" || item.hasAttribute("disabled"));
        await waitFor(async () => {
            const full = await open();
            assert.isNotNull(full, "Label is still listed");
            assert.isTrue(disabled(full), "but not pickable");
        });
        await userEvent.click(within(sectionOf(tab, "node-text")).getByRole("button", { name: "Add to node text" }));
        const menu = await screen.findByRole("menu");
        assert.isTrue(disabled(within(menu).queryByRole("menuitem", { name: "Card" })), "nor is a Card");
        assert.isFalse(disabled(within(menu).queryByRole("menuitem", { name: "Tooltip" })), "Tooltip still is");
        await userEvent.keyboard("{Escape}");
    });

    it("a further Text label stays Text when the main label later becomes a Card", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await plus(tab, "node", "Label", "Node label");
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"]);
        });
        const id = session.styles.newLabelId(nodes);
        await plus(tab, "node", "Label", "Node label 2");
        await waitFor(() => {
            const value = written(session, nodes, "node.labels") as readonly LabelEntry[] | undefined;
            assert.equal(value?.find((entry) => entry.id === id)?.style?.look, "default", "it names the plain look");
        });
        await switchTo(sectionOf(tab, "node-text"), "node label", "Card");
        await waitFor(() => {
            assert.equal(styleOf(session, nodes, "node.labelStyle").look, "card");
        });
        await waitFor(() => {
            const text = sectionOf(tab, "node-text");
            assert.isNotNull(within(text).queryByRole("button", { name: "Switch node card to" }), "the main is a Card");
            assert.isNotNull(
                within(text).queryByRole("button", { name: "Switch node label 2 to" }),
                "the further label is still named Label",
            );
        });
    });

    it("a node Tooltip's Switch to Card writes only the look", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await plus(tab, "node", "Tooltip", "Node tooltip");
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.tooltip"]);
        });
        const before = restOf(session, nodes, "node.tooltipStyle");
        const was = styleOf(session, nodes, "node.tooltipStyle");
        await switchTo(sectionOf(tab, "node-text"), "node tooltip", "Card");
        await waitFor(() => {
            assert.deepEqual(styleOf(session, nodes, "node.tooltipStyle"), { ...was, look: "card" });
        });
        assert.equal(restOf(session, nodes, "node.tooltipStyle"), before, "the switch writes only the look");
    });

    it("'+' Label on an empty Text adds a Text label, and its Switch to Card writes only the look", async () => {
        const { session, nodes } = await openGraph();
        const tab = await openStyle("Key people");
        await plus(tab, "node", "Label", "Node label");
        await waitFor(() => {
            assert.isDefined(session.styles.get(nodes)?.encode?.["node.label"]);
        });
        assert.isUndefined(styleOf(session, nodes, "node.labelStyle").look, "a Text label");
        await session.styles.update(nodes, {
            set: { ...session.styles.get(nodes)?.set, "node.labelStyle": { color: "#1971C2", size: 2 } },
        });
        await session.styles.settled();
        const before = restOf(session, nodes, "node.labelStyle");
        await switchTo(sectionOf(tab, "node-text"), "node label", "Card");
        await waitFor(() => {
            assert.deepEqual(styleOf(session, nodes, "node.labelStyle"), { color: "#1971C2", size: 2, look: "card" });
        });
        assert.equal(restOf(session, nodes, "node.labelStyle"), before, "the switch writes only the look");
        await waitFor(() => {
            assert.isNotNull(
                within(sectionOf(tab, "node-text")).queryByRole("button", { name: "Switch node card to" }),
                "the row is the Card now",
            );
        });
        // Back to Label takes the look off and keeps the rest.
        await switchTo(sectionOf(tab, "node-text"), "node card", "Label");
        await waitFor(() => {
            assert.deepEqual(styleOf(session, nodes, "node.labelStyle"), { color: "#1971C2", size: 2 });
        });
    });

    it("on the edge tab: '+' Card writes the look; Label switched to Card writes only the look", async () => {
        const { session, edges } = await openGraph();
        const tab = await openStyle("Links");
        await showKind("edge");
        await plus(tab, "edge", "Label", "Edge label");
        await waitFor(() => {
            assert.equal(written(session, edges, "edge.label"), "link");
        });
        assert.isUndefined(styleOf(session, edges, "edge.labelStyle").look, "'+' Label adds a Text label");
        const before = restOf(session, edges, "edge.labelStyle");
        await switchTo(sectionOf(tab, "edge-text"), "edge label", "Callout");
        await waitFor(() => {
            assert.deepEqual(styleOf(session, edges, "edge.labelStyle"), { look: "callout" });
        });
        assert.equal(restOf(session, edges, "edge.labelStyle"), before, "the switch writes only the look");

        // A further edge label in a look, from "+".
        const id = session.styles.newLabelId(edges);
        await plus(tab, "edge", "Card", "Edge card 2");
        await waitFor(() => {
            const value = written(session, edges, "edge.labels") as readonly LabelEntry[] | undefined;
            assert.equal(value?.find((entry) => entry.id === id)?.style?.look, "card", "'+' Card writes look card");
        });
    });

    it("an End caption's Switch to lists its ends, a divider and its looks; a look writes only the caption's look", async () => {
        const { session, edges } = await openGraph();
        await session.styles.update(edges, {
            set: { "edge.color": "#E8590C", "edge.arrowHeadText": "to", "edge.arrowHeadTextStyle": { size: 2 } },
        });
        await session.styles.settled();
        const tab = await openStyle("Links");
        await showKind("edge");
        const text = sectionOf(tab, "edge-text");
        await userEvent.click(within(text).getByRole("button", { name: "Switch edge target to" }));
        const menu = await screen.findByRole("menu");
        const items = [...menu.querySelectorAll('[role="menuitem"], .mantine-Menu-divider')].map((element) =>
            element.getAttribute("role") === "menuitem" ? element.textContent : "|",
        );
        assert.deepEqual(items, ["Target", "Source", "|", "End caption", "Card", "Dark", "Pill", "Callout"]);
        const before = restOf(session, edges, "edge.arrowHeadTextStyle");
        await userEvent.click(within(menu).getByRole("menuitem", { name: "Dark" }));
        await waitFor(() => {
            assert.deepEqual(styleOf(session, edges, "edge.arrowHeadTextStyle"), { size: 2, look: "dark" });
        });
        assert.equal(restOf(session, edges, "edge.arrowHeadTextStyle"), before, "only the caption's look");
    });
});
