/**
 * The panels of the style tree's other row kinds on the REAL graphty-element, driven by real input
 * (tier3 design, section 2.2): a folder lists its rows in paint order and a click opens one; its
 * Selection colors rewrite a color in every row that wrote it, undone in one step; several rows
 * selected together read "Mixed" where they differ and take one typed value in one undo step,
 * leaving a locked row named and unwritten; a draft shows no groups until a kind is chosen. Every
 * assertion reads the element's own layers or the page.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, beforeAll, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** A hang guard for the element coming up, not a pass/fail timing. */
const TIMEOUT_MS = 90_000;

/** The three layers every test starts from, by name. */
interface Rows {
    readonly session: GraphSession;
    readonly key: string;
    readonly degree: string;
    readonly ring: string;
}

/**
 * A new project on a four-node path with three layers of the reader's own, bottom first: Key
 * people (nodes 1 and 2 red, size 3), Degree (every node size 1), Ring (every edge red).
 * @returns the session and the layers' ids.
 */
async function openProject(): Promise<Rows> {
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
    await session.data.addNodes([1, 2, 3, 4].map((id) => ({ id, name: `N${String(id)}` })));
    await session.data.addEdges([1, 2, 3].map((id) => ({ source: id, target: id + 1 })));
    const key = await session.styles.add({
        name: "Key people",
        target: "node",
        selector: { match: "ids", nodes: [1, 2] },
        set: { "node.color": "#ff0000", "node.size": 3 },
    });
    const degree = await session.styles.add({
        name: "Degree",
        target: "node",
        selector: { match: "everything" },
        set: { "node.size": 1 },
    });
    const ring = await session.styles.add({
        name: "Ring",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#FF0000" },
    });
    await session.styles.settled();
    await row("Ring");
    return { session, key: key.id, degree: degree.id, ring: ring.id };
}

/**
 * The tree.
 * @returns the tree element.
 */
function tree(): HTMLElement {
    return screen.getByRole("tree", { name: "Style layers" });
}

/**
 * A tree row by its name, waiting for it to draw.
 * @param name - the row's visible name.
 * @returns the row.
 */
async function row(name: string): Promise<HTMLElement> {
    return within(await screen.findByRole("tree", { name: "Style layers" }, { timeout: TIMEOUT_MS })).findByRole(
        "treeitem",
        { name: new RegExp(`^${name}, `) },
        { timeout: TIMEOUT_MS },
    );
}

/**
 * What one layer writes for a channel.
 * @param session - the session.
 * @param id - the layer.
 * @param channel - the channel.
 * @returns the value, or undefined.
 */
function written(session: GraphSession, id: string, channel: string): unknown {
    return (session.styles.get(id)?.set as Record<string, unknown> | undefined)?.[channel];
}

describe("folders, several rows and the draft on the real element", () => {
    beforeAll(async () => {
        await page.viewport(1440, 900);
    });

    it("a folder lists its rows in paint order, a click opens one, and its Selection colors repaint every row in one Undo", async () => {
        const { session, key, ring } = await openProject();
        const folder = await session.styles.addFolder("Annotations");
        for (const id of [key, ring]) {
            await session.styles.moveRow(id, { parent: folder.id, index: 0 });
        }
        // Moved to the bottom one after the other: Ring sits under Key people.
        await userEvent.click(await row("Annotations"));

        const list = await screen.findByRole("list", { name: "In Annotations" });
        const names = within(list)
            .getAllByRole("listitem")
            .map((item) => item.textContent.trim());
        assert.deepEqual(names, ["Key people", "Ring"], "top first, as the tree paints them");

        const colors = screen.getByRole("button", { name: "Show 1 selection color" });
        await userEvent.click(colors);
        const color = await screen.findByRole("group", { name: "#FF0000, from Key people, Ring" });
        const hex = within(color).getByRole("textbox", { name: /Replace #FF0000/ });
        await userEvent.tripleClick(hex);
        await userEvent.keyboard("00AA00{Enter}");
        await waitFor(() => {
            assert.equal(written(session, key, "node.color"), "#00AA00");
            assert.equal(written(session, ring, "edge.color"), "#00AA00");
        });
        assert.equal(
            session.styles.explain({ node: 1 }).merged["node.color"]?.hex.slice(0, 7).toLowerCase(),
            "#00aa00",
        );

        await userEvent.click(screen.getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.equal(written(session, key, "node.color"), "#ff0000", "one Undo restores both");
            assert.equal(written(session, ring, "edge.color"), "#FF0000");
        });

        await userEvent.click(within(await screen.findByRole("list", { name: "In Annotations" })).getByText("Ring"));
        await screen.findByRole("heading", { level: 2, name: "Ring" });
    });

    it("two rows of different sizes read Mixed; 2 writes to both in one Undo; a locked row is named and left out", async () => {
        const { session, key, degree, ring } = await openProject();
        await session.styles.lockRow(ring, true);
        await session.styles.settled();

        await userEvent.click(await row("Key people"));
        await userEvent.keyboard("{Control>}");
        await userEvent.click(await row("Degree"));
        await userEvent.click(await row("Ring"));
        await userEvent.keyboard("{/Control}");
        await screen.findByRole("heading", { level: 2, name: "3 layers" });
        await screen.findByText("Locked, left unchanged: Ring");

        const tab = await screen.findByTestId("style-tab");
        assert.isNull(within(tab).queryByRole("heading", { name: "Edges" }), "Ring is left out, so no Edges group");
        const size = await within(tab).findByRole("combobox", { name: /^Node size, mixed: / });
        assert.equal(size.getAttribute("placeholder"), "Mixed");
        assert.equal((size as HTMLInputElement).value, "");

        await userEvent.click(size);
        await userEvent.keyboard("2{Enter}");
        await waitFor(() => {
            assert.equal(written(session, key, "node.size"), 2);
            assert.equal(written(session, degree, "node.size"), 2);
        });
        assert.equal(written(session, ring, "edge.color"), "#FF0000", "the locked row is unwritten");
        await within(tab).findByRole("combobox", { name: "Node size, set here, 2" });

        await userEvent.click(screen.getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.equal(written(session, key, "node.size"), 3, "one Undo restores both");
            assert.equal(written(session, degree, "node.size"), 1);
        });
    });

    it("a draft with nothing selected opens on Nodes, showing only that kind's group", async () => {
        const { session } = await openProject();
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Add layer" }));
        await screen.findByText("Nothing is added until a property is set");
        const nodes = screen.getByRole<HTMLInputElement>("radio", { name: "Nodes" });
        assert.isTrue(nodes.checked, "Nodes is chosen for the reader");
        const tab = await screen.findByTestId("style-tab");
        assert.isNotNull(within(tab).getByRole("heading", { name: "Nodes" }));
        assert.isNull(within(tab).queryByRole("heading", { name: "Edges" }));

        const before = session.styles.list().length;
        const size = await within(tab).findByRole("combobox", { name: /^Node size, / });
        await userEvent.click(size);
        await userEvent.keyboard("4{Enter}");
        await waitFor(() => {
            const added = session.styles.list().find((layer) => layer.name === "New layer");
            assert.equal((added?.set as Record<string, unknown> | undefined)?.["node.size"], 4);
        });
        assert.equal(session.styles.list().length, before + 1, "the first value adds one layer");
        await waitFor(() => {
            assert.deepEqual(
                within(tree())
                    .getAllByRole("treeitem")
                    .filter((item) => item.getAttribute("aria-selected") === "true")
                    .map((item) => item.getAttribute("aria-label")?.split(",")[0]),
                ["New layer"],
            );
        });
    });
});
