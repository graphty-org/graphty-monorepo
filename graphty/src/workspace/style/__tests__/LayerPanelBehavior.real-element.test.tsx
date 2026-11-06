/**
 * The layer panel's behavior on the REAL graphty-element and Les Miserables, driven by real clicks
 * and keys: removing the only "Picked by hand" card of an edge layer is said, with Undo, and the
 * layer's default name says what it covers now; a default name made from several cards is short
 * enough to read whole; an attribute of the other kind is one click from its card on the other
 * tab; a run's group opened from a node's Memberships is its layer row, with the tree's header;
 * every layer row shows its count; Why this look and a "Covered by" name open the layer on Style.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { DEFAULT_NAME_KEY } from "../cards";

/**
 * Les Miserables in the workspace with its starting rows.
 * @returns The session, the store and the node id of a character by name.
 */
async function openScene(): Promise<{
    session: GraphSession;
    store: WorkspaceStore;
    idOf: (name: string) => string;
}> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 } });
    render(<Workspace store={store} />);
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
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    return { session, store, idOf };
}

/**
 * The style tree's row of a name.
 * @param name - The row's name, as its accessible name starts.
 * @returns the row.
 */
async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * The notice's words, once one shows them.
 * @param words - what it should say.
 */
async function noticeSays(words: RegExp): Promise<void> {
    await waitFor(() => {
        assert.match(document.querySelector(".ws-notice-slot")?.textContent ?? "", words);
    });
}

describe("the layer panel's behavior", () => {
    it("says so, with Undo, when an edge layer's only hand-picked card goes, and renames it", async () => {
        const { session } = await openScene();
        const [edge] = session.data.edgePage({ limit: 1 }).records;
        const name = "Napoleon -> Myriel";
        const layer: Layer = await session.styles.add({
            name,
            target: "edge",
            selector: { match: "ids", edges: [edge.id] },
            set: { "edge.color": "#ff0000" },
            userData: { [DEFAULT_NAME_KEY]: name },
        });
        await session.styles.settled();
        await userEvent.click(await treeRow(name));
        await userEvent.click(await screen.findByRole("button", { name: /^Which edges, / }));
        const region = await screen.findByRole("group", { name: "Which edges" });
        await userEvent.click(within(region).getByRole("button", { name: /^Remove / }));
        await noticeSays(new RegExp(`^${name} now styles all 254 edges: no condition is left`));
        await waitFor(() => {
            assert.equal(session.styles.get(layer.id)?.selector.match, "everything");
            assert.equal(session.styles.get(layer.id)?.name, "All edges", "the name says what it covers now");
        });
        const notice = document.querySelector<HTMLElement>(".ws-notice-slot") ?? document.body;
        await userEvent.click(within(notice).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.equal(session.styles.get(layer.id)?.selector.match, "ids", "the tie is back");
            assert.equal(session.styles.get(layer.id)?.name, name, "and so is its name");
        });
    });

    it("keeps a default name made from several cards short enough to read whole", async () => {
        const { session, idOf } = await openScene();
        // A layer made from a selection: picked by hand, named by default.
        const made = await session.styles.add({
            name: "Cosette",
            target: "node",
            selector: { match: "ids", nodes: [idOf("Cosette")] },
            set: { "node.color": "#800080" },
            userData: { [DEFAULT_NAME_KEY]: "Cosette" },
        });
        await session.styles.settled();
        await userEvent.click(await treeRow("Cosette"));
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.keyboard("name");
        await userEvent.click(await screen.findByRole("option", { name: /^name/ }));
        await userEvent.type(await within(region).findByRole("combobox", { name: "name: text to match" }), "Co");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(made.id)?.name, "Picked and name");
        });
    });

    it("takes an attribute of the other kind to its card on the other kind's tab", async () => {
        await openScene();
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        if (screen.queryByRole("combobox", { name: "Find an attribute" }) === null) {
            const nodes = await screen.findByRole("group", { name: "Which nodes" });
            await userEvent.click(within(nodes).getByRole("button", { name: "Add a condition" }));
        }
        const search = await screen.findByRole("combobox", { name: "Find an attribute" });
        await userEvent.click(search);
        await userEvent.keyboard("shared");
        await screen.findByText(/^shared_chapters is an edge attribute; it is on the Edge tab/);
        await userEvent.click(screen.getByRole("button", { name: "Add shared_chapters on the Edge tab" }));
        const tab = await screen.findByTestId("style-tab");
        await waitFor(() => {
            assert.equal(within(tab).getByRole("tab", { name: /^Edge/ }).getAttribute("aria-selected"), "true");
        });
        const edges = await screen.findByRole("group", { name: "Which edges" });
        await within(edges).findByRole("group", { name: /^shared_chapters/ });
    });

    it("opens a run's group from Memberships as its layer row, under the tree's header", async () => {
        const { session, store, idOf } = await openScene();
        await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
        await session.styles.settled();
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Valjean")] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Values" }));
        const memberships = await screen.findByRole("heading", { name: "Memberships" });
        const section = memberships.closest("section") ?? document.body;
        await userEvent.click(within(section).getByRole("button", { name: /^Louvain/ }));
        await waitFor(() => {
            assert.equal(store.get().inspected?.kind, "layer-row", "the group is its layer row");
            assert.equal(document.querySelector("[data-inspected]")?.getAttribute("data-inspected"), "layer-row");
        });
    });

    it("shows a count on every layer row and opens a layer's look on its Style tab", async () => {
        const { session, store, idOf } = await openScene();
        const top = await session.styles.add({
            name: "Thanked",
            target: "node",
            selector: { match: "ids", nodes: [idOf("Valjean"), idOf("Cosette")] },
            set: { "node.color": "#009e73" },
        });
        await session.styles.settled();
        // Every layer row says how many it matches, not only a run's groups.
        await waitFor(async () => {
            assert.equal((await treeRow("Thanked")).querySelector(".ws-row-count")?.textContent, "2");
            assert.equal((await treeRow("Everything")).querySelector(".ws-row-count")?.textContent, "77");
        });

        // The reader last chose Values for a layer; a link to a layer's look still opens on Style.
        store.set({ tabs: { "layer-row": "values" } });
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Valjean")] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        await userEvent.click(await screen.findByRole("button", { name: "Open layer Thanked" }));
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: top.row ?? top.id, tab: "style" });
            assert.equal(screen.getByRole("tab", { name: "Style" }).getAttribute("aria-selected"), "true");
        });
        await screen.findByRole("button", { name: /^Which nodes, / });

        // Everything's color, covered by Thanked on two nodes: the name opens Thanked, on Style.
        store.set({ inspected: { kind: "everything-row" } });
        await act(async () => {
            await session.selection.apply({ nodes: [] });
        });
        await userEvent.click(await treeRow("Everything"));
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        const caption = await waitFor(() => {
            const found = document.querySelector<HTMLElement>("[data-covered-caption]");
            assert.isNotNull(found);
            return found;
        });
        if (caption === null) {
            return;
        }
        await userEvent.click(within(caption).getByRole("button", { name: "Open layer Thanked" }));
        await waitFor(() => {
            assert.equal(store.get().inspected?.id, top.row ?? top.id);
            assert.equal(screen.getByRole("tab", { name: "Style" }).getAttribute("aria-selected"), "true");
        });
    });
});
