/**
 * The layer panel on the REAL graphty-element and Les Miserables, driven by real clicks and keys:
 * a node's "+" makes no layer until a value is picked, and the pick makes one and says so; a "+"
 * with one thing to add adds it, and its value makes a layer named by default; removing a layer's
 * last condition is said, with Undo, and Done stays; a card with no value shows no count and is
 * dropped with a word; a layer named by default follows its rule; a bare column name reads as a
 * "Has a value" card; a new layer opens on its Node tab, and the Node tab starts with node lines;
 * the collapsed Which row of an empty layer opens its list in one click.
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

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

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
    const session = await waitFor(
        () => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        },
        { timeout: TIMEOUT_MS },
    );
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    await session.config.set({ startingRows: true, editableBase: true, runPlacement: "top" });
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    return { session, store, idOf };
}

/**
 * Clicks a row of the style tree.
 * @param name - The row's name, as its accessible name starts.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS });
    await userEvent.click(await within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * The notice's words, once one shows them.
 * @param words - what it should say.
 */
async function noticeSays(words: RegExp): Promise<void> {
    await waitFor(() => {
        const slot = document.querySelector(".ws-notice-slot");
        assert.match(slot?.textContent ?? "", words);
    });
}

/**
 * The reader's layers that name ids: the selections' own rows.
 * @param session - the element's session.
 * @returns the layers.
 */
function idLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((l) => l.source.by === "user" && l.selector.match === "ids");
}

/**
 * A layer on every node, colored, opened in the inspector.
 * @param session - the element's session.
 * @param spec - its name and selector.
 * @returns the layer.
 */
async function openLayer(
    session: GraphSession,
    spec: Pick<Layer, "name" | "selector"> & Partial<Pick<Layer, "userData">>,
): Promise<Layer> {
    const layer = await session.styles.add({ ...spec, target: "node", set: { "node.color": "#0072b2" } });
    await session.styles.settled();
    await clickRow(spec.name);
    return layer;
}

describe("the layer panel", () => {
    it("a node's '+' makes no layer until a value is picked; the pick makes it and says so", async () => {
        const { session, store, idOf } = await openScene();
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Cosette")] });
        });
        const tab = await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS });
        await userEvent.click(tab);
        await userEvent.click(await screen.findByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[data-line="node.size"]'), "focus on the new line");
        });
        assert.lengthOf(idLayers(session), 0, "nothing is made before a value");
        await userEvent.keyboard("{Control>}a{/Control}3{Enter}");
        await waitFor(() => {
            assert.lengthOf(idLayers(session), 1);
        });
        const [made] = idLayers(session);
        assert.strictEqual(made.set?.["node.size"], 3);
        await noticeSays(new RegExp(`^Made layer ${made.name} for 1 node`));
        await waitFor(() => {
            assert.deepEqual(store.get().inspected, { kind: "layer-row", id: made.id });
        });
    });

    it("says so, with Undo, when a layer's last condition goes, and keeps Done", async () => {
        const { session } = await openScene();
        const where = { kind: "text" as const, reads: "data.name", mode: "substring" as const, text: "Co" };
        const layer = await openLayer(session, { name: "Group one", selector: { match: "rule", where } });
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: /^Remove / }));
        await noticeSays(/^Group one now styles all 77 nodes: no condition is left/);
        assert.isNotNull(within(region).queryByRole("button", { name: "Done" }), "Done stays");
        await waitFor(() => {
            assert.equal(session.styles.get(layer.id)?.selector.match, "everything");
        });
        const notice = document.querySelector<HTMLElement>(".ws-notice-slot");
        await userEvent.click(within(notice ?? document.body).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.notEqual(session.styles.get(layer.id)?.selector.match, "everything", "the condition is back");
        });
    });

    it("an unfinished card shows no count and, dropped by Done, is said", async () => {
        const { session } = await openScene();
        await openLayer(session, { name: "Plain", selector: { match: "everything" } });
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
        // A row with no card opens on Add a condition, whose list one more click opens.
        await userEvent.click(await screen.findByRole("button", { name: "Add a condition" }));
        const search = await screen.findByRole("combobox", { name: "Find an attribute" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, search);
        });
        await userEvent.keyboard("name");
        await userEvent.click(await screen.findByRole("option", { name: /^name/ }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = await within(region).findByRole("group", { name: /^name/ });
        assert.strictEqual(card.getAttribute("aria-label"), "name", "no count before a value");
        await userEvent.click(within(region).getByRole("button", { name: "Done" }));
        await noticeSays(/^Dropped the name condition: it was not finished/);
    });

    it("a node's Fill '+' adds its one property with no menu, and its value makes a layer named by default", async () => {
        const { session, idOf } = await openScene();
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Cosette")] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }, { timeout: TIMEOUT_MS }));
        // Fill holds one property: its "+" adds it, with no menu of one item.
        await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
        assert.isNull(screen.queryByRole("menu"), "no menu");
        await waitFor(() => {
            assert.isNotNull(document.activeElement?.closest('[data-line="node.color"]'), "focus in the new line");
        });
        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            assert.lengthOf(idLayers(session), 1);
        });
        const [made] = idLayers(session);
        assert.strictEqual(made.userData?.[DEFAULT_NAME_KEY], made.name, "its name is a default");
    });

    it("a layer named by default follows its rule until the reader renames it", async () => {
        const { session, idOf } = await openScene();
        // The layer a selection's first edit makes: picked by hand, named by default.
        const made = await openLayer(session, {
            name: "Cosette",
            selector: { match: "ids", nodes: [idOf("Cosette")] },
            userData: { [DEFAULT_NAME_KEY]: "Cosette" },
        });
        await userEvent.click(await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS }));
        const region = await screen.findByRole("group", { name: "Which nodes" });
        await userEvent.click(within(region).getByRole("button", { name: /^Remove / }));
        await userEvent.click(within(region).getByRole("button", { name: "Add a condition" }));
        await userEvent.keyboard("name");
        await userEvent.click(await screen.findByRole("option", { name: /^name/ }));
        await userEvent.type(await within(region).findByRole("combobox", { name: "name: text to match" }), "Co");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(made.id)?.name, "name contains Co");
        });
        await session.styles.update(made.id, { name: "My people" });
        await userEvent.type(within(region).getByRole("combobox", { name: "name: text to match" }), "s");
        await waitFor(() => {
            assert.strictEqual(session.styles.get(made.id)?.selector.match, "rule");
        });
        await session.styles.settled();
        assert.strictEqual(session.styles.get(made.id)?.name, "My people", "a reader's name stays");
    });

    it("reads a bare column name as an ordinary 'Has a value' card", async () => {
        const { session } = await openScene();
        await openLayer(session, { name: "Named", selector: { match: "expression", where: "name" } });
        const row = await screen.findByRole("button", { name: /^Which nodes, / }, { timeout: TIMEOUT_MS });
        assert.include(row.getAttribute("aria-label") ?? "", "name: has a value");
        await userEvent.click(row);
        const region = await screen.findByRole("group", { name: "Which nodes" });
        const card = await within(region).findByRole("group", { name: /^name, 77 nodes$/ });
        assert.strictEqual(card.querySelector<HTMLInputElement>("input:not([type=hidden])")?.value, "Has a value");
    });

    it("opens a new layer on its Node tab, and a Node tab starts with node lines", async () => {
        await openScene();
        await clickRow("Everything");
        await userEvent.click(await screen.findByRole("tab", { name: /^Edge/ }, { timeout: TIMEOUT_MS }));
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        const tab = await screen.findByTestId("style-tab");
        await waitFor(() => {
            assert.strictEqual(within(tab).getByRole("tab", { name: /^Node/ }).getAttribute("aria-selected"), "true");
        });
        await clickRow("Everything");
        await userEvent.click(await screen.findByRole("tab", { name: /^Node/ }));
        const panel = await within(screen.getByTestId("style-tab")).findByRole("tabpanel");
        const other = panel.querySelector(".ws-other-line");
        const sections = panel.querySelector(".ws-style-group");
        assert.isNotNull(other);
        assert.isNotNull(sections);
        if (other === null || sections === null) {
            return;
        }
        assert.isTrue(
            (sections.compareDocumentPosition(other) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
            "the Edges line comes after the node lines",
        );
    });
});
