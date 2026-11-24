/**
 * The Which picker's less traveled paths on the REAL graphty-element and Les Miserables, driven by
 * real clicks and keys: a rule the cards cannot draw that keeps no node says so on Done's tooltip,
 * as do two conditions that keep some each but none together, or name the one that keeps none alone,
 * and Delete on its Remove button takes it off; the last finished card removed beside an unfinished
 * one is said with an Undo that puts it back where it was; Done drops two unfinished cards with one
 * word for both; a card added to two layers that leaves one of them with nothing names that one;
 * the Ends card on the Edge tab switches between both ends and either end; nodes picked by hand name
 * the first five on Remove; and a node attribute searched on the Edge tab points to the Node tab.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { selectWithTwin } from "../../../test/twin-layer";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { tooltipOf } from "./tooltip";

/**
 * Les Miserables in the workspace, with the starting rows.
 * @returns the session.
 */
async function openMiserables(): Promise<GraphSession> {
    await page.viewport(1440, 900);
    render(<Workspace store={createWorkspaceStore({ project: { name: "Untitled", id: 1 } })} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    return session;
}

/**
 * Adds a colored node layer.
 * @param session - the session.
 * @param name - its name.
 * @param selector - what it picks.
 * @returns the layer.
 */
async function addLayer(session: GraphSession, name: string, selector: Layer["selector"]): Promise<Layer> {
    const layer = await session.styles.add({ name, target: "node", selector, set: { "node.color": "#cc79a7" } });
    await session.styles.settled();
    return layer;
}

/**
 * Clicks a style tree row, with Control held to add it to the selection.
 * @param name - the row's name.
 * @param more - hold Control.
 */
async function pickRow(name: string, more = false): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const row = await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
    if (more) {
        await userEvent.keyboard("{Control>}");
    }
    await userEvent.click(row);
    if (more) {
        await userEvent.keyboard("{/Control}");
    }
}

/**
 * Opens the folded Which row of a kind.
 * @param kind - nodes or edges.
 * @returns the open cards.
 */
async function openWhich(kind: "nodes" | "edges" = "nodes"): Promise<HTMLElement> {
    await userEvent.click(await screen.findByRole("button", { name: new RegExp(`^Which ${kind}, `) }));
    return screen.findByRole("group", { name: `Which ${kind}` });
}

/**
 * Adds a card on a field from the open cards' Add a condition.
 * @param region - the open cards.
 * @param field - the field's name in the list.
 * @returns the card.
 */
async function addField(region: HTMLElement, field: string): Promise<HTMLElement> {
    await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
    // The list shows its first fields; typing finds the rest.
    const search = await screen.findByRole("combobox", { name: "Find an attribute" });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, search);
    });
    await userEvent.keyboard(field);
    await userEvent.click(await screen.findByRole("option", { name: new RegExp(`^${field}(,|$)`) }));
    return within(region).findByRole("group", { name: new RegExp(`^${field}(,|$)`) });
}

/**
 * Waits for the notice to say some words.
 * @param words - the words.
 * @returns the notice.
 */
function noticeSaying(words: RegExp): Promise<HTMLElement> {
    return waitFor(() => {
        const slot = document.querySelector<HTMLElement>(".ws-notice-slot");
        assert.match(slot?.textContent ?? "", words);
        return slot ?? document.body;
    });
}

describe("the Which picker's side paths", () => {
    it("a rule that keeps no node says so on Done, and Delete on its Remove button takes it off", async () => {
        const session = await openMiserables();
        // One layer with a rule the cards cannot draw opens its cards, not the selection editor.
        const layer = await addLayer(session, "Nobody", { match: "expression", where: "data.name == 'Nobody'" });
        await pickRow("Nobody");
        const region = await openWhich();
        const done = within(region).getByRole("button", { name: "Done" });
        await waitFor(async () => {
            assert.match(await tooltipOf(done), /^0 of 77 nodes, The rule leaves none$/);
        });
        // The rule's card has no value control, so the open cards start on its Remove button.
        const remove = within(region).getByRole("button", { name: /^Remove / });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, remove);
        });
        await userEvent.keyboard("{Delete}");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.selector.match, "everything");
        });
        await noticeSaying(/^Nobody now styles all 77 nodes: no condition is left/);
        assert.isNull(within(region).queryByRole("button", { name: /^Remove / }), "the card is gone");
    });

    it("two conditions that each keep some but together none say so on Done", async () => {
        const session = await openMiserables();
        await session.data.updateNodes(
            session.data.nodes().map((node) => ({
                id: node.id,
                values: { madame: String(session.data.name(node.id)).includes("Mme") },
            })),
        );
        // A rule the cards cannot draw keeps Valjean alone; a new true/false card keeps the madames.
        await addLayer(session, "Valjean", { match: "expression", where: "data.name == 'Valjean'" });
        await pickRow("Valjean");
        const region = await openWhich();
        const done = within(region).getByRole("button", { name: "Done" });
        await waitFor(async () => {
            assert.match(await tooltipOf(done), /^1 of 77 nodes$/);
        });
        await addField(region, "madame");
        await waitFor(async () => {
            assert.match(await tooltipOf(done), /^0 of 77 nodes, Each condition leaves some; together none$/);
        });
    });

    it("of two conditions that together keep no node, Done names the one that keeps none alone", async () => {
        const session = await openMiserables();
        await session.data.updateNodes(
            session.data.nodes().map((node) => ({
                id: node.id,
                values: { madame: String(session.data.name(node.id)).includes("Mme") },
            })),
        );
        await addLayer(session, "Nobody", { match: "expression", where: "data.name == 'Nobody'" });
        await pickRow("Nobody");
        const region = await openWhich();
        const done = within(region).getByRole("button", { name: "Done" });
        await addField(region, "madame");
        await waitFor(async () => {
            assert.match(await tooltipOf(done), /^0 of 77 nodes, The rule leaves none$/);
        });
    });

    it("Undo after the last finished card goes puts it back beside the unfinished one", async () => {
        const session = await openMiserables();
        const cosette = session.data.nodes().find((node) => node.name === "Cosette")?.id;
        assert.isDefined(cosette);
        // Nodes picked by hand: one layer of them edits its cards.
        const selector: Layer["selector"] = { match: "ids", nodes: [String(cosette)], edges: [] };
        const layer = await addLayer(session, "Picked", selector);
        await pickRow("Picked");
        const region = await openWhich();
        await addField(region, "name");
        await userEvent.click(within(region).getByRole("button", { name: /^Remove Picked by hand/ }));
        const notice = await noticeSaying(/^Picked now styles all 77 nodes: no condition is left/);
        await waitFor(() => {
            assert.strictEqual(session.styles.get(layer.id)?.selector.match, "everything");
        });
        await userEvent.click(within(notice).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.notStrictEqual(session.styles.get(layer.id)?.selector.match, "everything", "a condition is back");
            assert.strictEqual(session.styles.counts(layer.id).matched, 1, "Cosette alone again");
        });
        // Back in its place, before the unfinished name card.
        const cards = within(region).getAllByRole("group");
        assert.match(cards[0]?.getAttribute("aria-label") ?? "", /^Picked by hand/);
        assert.match(cards[1]?.getAttribute("aria-label") ?? "", /^name$/);
    });

    it("Done drops two unfinished cards with one word for both", async () => {
        const session = await openMiserables();
        // A category column: its new card waits for a value ticked, as a new text card waits for words.
        await session.data.updateNodes(
            session.data.nodes().map((node) => ({
                id: node.id,
                values: { camp: String(session.data.name(node.id)).includes("Mme") ? "madame" : "other" },
            })),
        );
        await addLayer(session, "Plain", { match: "everything" });
        await selectWithTwin(session, "Plain");
        const region = await openWhich();
        await addField(region, "name");
        await addField(region, "camp");
        await userEvent.click(within(region).getByRole("button", { name: "Done" }));
        await noticeSaying(/^Dropped 2 conditions that were not finished/);
        assert.deepEqual(session.styles.list().find((each) => each.name === "Plain")?.selector, {
            match: "everything",
        });
    });

    it("a card added to two layers that leaves one with nothing names that one", async () => {
        const session = await openMiserables();
        await session.data.updateNodes(
            session.data.nodes().map((node) => ({
                id: node.id,
                values: { main: !String(session.data.name(node.id)).includes("Mme") },
            })),
        );
        await addLayer(session, "Madames", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Mme" },
        });
        await addLayer(session, "Valjeans", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Valjean" },
        });
        await pickRow("Madames");
        await pickRow("Valjeans", true);
        const said: string[] = [];
        const watch = new MutationObserver(() => {
            for (const each of document.querySelectorAll('[role="status"][aria-live="polite"]')) {
                said.push(each.textContent ?? "");
            }
        });
        watch.observe(document.body, { childList: true, characterData: true, subtree: true });
        await addField(await openWhich(), "main");
        await waitFor(() => {
            assert.include(said, "1 layer now matches nothing: Madames");
        });
        watch.disconnect();
    });

    it("the Ends card switches the edges between both ends and either end in the layer's nodes", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, "Thenardiers", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Thenardier" },
        });
        await selectWithTwin(session, "Thenardiers");
        await userEvent.click(
            within(await screen.findByRole("tablist", { name: "Style for" })).getByRole("tab", { name: /^Edge/ }),
        );
        await userEvent.click(screen.getByRole("checkbox", { name: "Style edges" }));
        const edgePart = await waitFor(() => {
            const id = session.styles.parts(layer.id)?.edge;
            assert.isDefined(id, "an edge part");
            return id ?? "";
        });
        const matched = async (): Promise<number> => {
            await session.styles.settled();
            return session.styles.counts(edgePart).matched ?? -1;
        };
        const both = await matched();
        const region = await openWhich("edges");
        const ends = within(region).getByRole("combobox", { name: "Ends" });
        await userEvent.click(ends);
        await userEvent.click(await screen.findByRole("option", { name: "Either end in this layer's nodes" }));
        await waitFor(async () => {
            assert.isAbove(await matched(), both, "either end keeps more edges than both ends");
        });
        await userEvent.click(ends);
        await userEvent.click(await screen.findByRole("option", { name: "Both ends in this layer's nodes" }));
        await waitFor(async () => {
            assert.strictEqual(await matched(), both);
        });
    });

    it("nodes picked by hand say the first five by name and how many more on Remove", async () => {
        const session = await openMiserables();
        const ids = session.data
            .nodes()
            .slice(0, 7)
            .map((node) => String(node.id));
        await addLayer(session, "Seven", { match: "ids", nodes: ids, edges: [] });
        await pickRow("Seven");
        const region = await openWhich();
        const names = ids.slice(0, 5).map((id) => session.data.nodeName(id).name);
        const remove = within(region).getByRole("button", { name: /^Remove Picked by hand/ });
        assert.include(await tooltipOf(remove), `${names.join(", ")}, +2`);
    });

    it("a node attribute searched on the Edge tab points to the Node tab", async () => {
        const session = await openMiserables();
        const layer = await addLayer(session, "Thenardiers", {
            match: "rule",
            where: { kind: "text", reads: "data.name", mode: "substring", text: "Thenardier" },
        });
        await selectWithTwin(session, "Thenardiers");
        await userEvent.click(
            within(await screen.findByRole("tablist", { name: "Style for" })).getByRole("tab", { name: /^Edge/ }),
        );
        await userEvent.click(screen.getByRole("checkbox", { name: "Style edges" }));
        await waitFor(() => {
            assert.isDefined(session.styles.parts(layer.id)?.edge, "an edge part");
        });
        const region = await openWhich("edges");
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await screen.findByRole("combobox", { name: "Find an attribute" });
        await userEvent.keyboard("name");
        await screen.findByText("name is a node attribute; it is on the Node tab");
    });
});
