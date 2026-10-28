/**
 * The panels of the style tree's other row kinds on the REAL graphty-element, driven by real input
 * (tier3 design, section 2.2): a folder's Style tab says what an edit of it reaches; several rows
 * selected together show each row's value where the rows that set a property set it differently, and the
 * value they agree on where only some set it, saying who does not; the minus takes it off every
 * layer in one undo step,
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

    it("a folder's Style tab says what an edit of it reaches, with no panel of its own colors", async () => {
        const { session, key, ring } = await openProject();
        const folder = await session.styles.addFolder("Annotations");
        for (const id of [key, ring]) {
            await session.styles.moveRow(id, { parent: folder.id, index: 0 });
        }
        await userEvent.click(await row("Annotations"));

        // The tree lists the folder's rows; the panel says what an edit of the folder reaches.
        await screen.findByText("2 layers in Annotations. Layers added later are not changed.");
        assert.isNull(screen.queryByRole("list", { name: "In Annotations" }));
        assert.isNull(screen.queryByRole("heading", { name: "Selection colors" }));
    });

    it("two rows of different sizes show each one; the minus takes it off both in one Undo; a locked row is counted and left out", async () => {
        const { session, key, degree, ring } = await openProject();
        // The line shows what each layer paints now, and Degree over every node would paint over
        // all of Key people's size: on the other two nodes, each row's size is drawn somewhere.
        await session.styles.update(degree, { selector: { match: "ids", nodes: [3, 4] } });
        await session.styles.lockRow(ring, true);
        await session.styles.settled();

        await userEvent.click(await row("Key people"));
        await userEvent.keyboard("{Control>}");
        await userEvent.click(await row("Degree"));
        await userEvent.click(await row("Ring"));
        await userEvent.keyboard("{/Control}");
        await screen.findByRole("heading", { level: 2, name: "3 layers" });
        await screen.findByText("3 layers: 1 locked and skipped.");

        const tab = await screen.findByTestId("style-tab");
        const kinds = within(tab).getByRole("tablist", { name: "Style for" });
        assert.include(
            within(kinds).getByRole("tab", { name: /^Edge/ }).textContent ?? "",
            "not styled",
            "Ring is left out, so no layer styles edges",
        );
        const size = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.size"]');
            assert.isNotNull(found);
            return found;
        });
        const values = (size.querySelector("[data-varied-line]")?.textContent ?? "").split(", ");
        assert.sameMembers(values, ["3", "1"], "each row's own size, none borrowed");

        await userEvent.click(within(size).getByRole("button", { name: "Remove node size from every layer" }));
        await waitFor(() => {
            assert.isUndefined(written(session, key, "node.size"));
            assert.isUndefined(written(session, degree, "node.size"));
        });
        assert.equal(written(session, ring, "edge.color"), "#FF0000", "the locked row is unwritten");

        await userEvent.click(screen.getByRole("button", { name: /^Undo( |$)/ }));
        await waitFor(() => {
            assert.equal(written(session, key, "node.size"), 3, "one Undo restores both");
            assert.equal(written(session, degree, "node.size"), 1);
        });
    });

    it("a label and a glow only one of two rows writes read as that row's, saying who does not set them; the minus takes them off", async () => {
        const { session, key, degree } = await openProject();
        await session.styles.update(key, {
            set: { "node.color": "#ff0000", "node.size": 3, "node.label": "Key", "node.glow": "#00FF00" },
        });
        await session.styles.settled();

        await userEvent.click(await row("Key people"));
        await userEvent.keyboard("{Control>}");
        await userEvent.click(await row("Degree"));
        await userEvent.keyboard("{/Control}");
        await screen.findByRole("heading", { level: 2, name: "2 layers" });
        const tab = await screen.findByTestId("style-tab");

        const text = within(tab).getByRole("group", { name: "Text" });
        await waitFor(() => {
            assert.isNotNull(text.querySelector("input"), "the label the one setting row writes, to edit");
        });
        const effects = within(tab).getByRole("group", { name: "Effects" });
        const glow = effects.querySelector<HTMLElement>('.ws-row[data-line="node.glow"]');
        assert.equal(glow?.querySelector("[data-breakdown]")?.textContent, "1 layer sets glow; not set: Degree");

        await userEvent.click(within(effects).getByRole("button", { name: "Remove node glow from every layer" }));
        await waitFor(() => {
            assert.isUndefined(written(session, key, "node.glow"));
        });
        assert.isUndefined(written(session, degree, "node.glow"));
    });

    it("Layer from + paints nodes and edges, styles both kinds, and its first value goes on the layer it made", async () => {
        const { session } = await openProject();
        const before = session.styles.list().length;
        await userEvent.click(screen.getByRole("button", { name: "Add a layer or a folder" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
        await screen.findByRole("textbox", { name: "Layer name" });
        await userEvent.keyboard("{Escape}");
        const tab = await screen.findByTestId("style-tab");
        const kinds = within(tab).getByRole("tablist", { name: "Style for" });
        for (const tabName of ["Node", "Edge"]) {
            assert.notInclude(
                within(kinds).getByRole("tab", { name: new RegExp(`^${tabName}`) }).textContent ?? "",
                "not styled",
            );
        }
        // A new layer opens its picker on arrival.
        await within(tab).findByRole("group", { name: "Which nodes" });
        assert.equal(session.styles.list().length, before + 2, "one row, a node part and an edge part");

        await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Size" }));
        const size = await screen.findByRole("spinbutton", { name: /^Node size/ }, { timeout: TIMEOUT_MS });
        await userEvent.tripleClick(size);
        await userEvent.keyboard("4{Enter}");
        await waitFor(() => {
            const added = session.styles.list().find((layer) => layer.name === "Layer 1" && layer.target === "node");
            assert.equal((added?.set as Record<string, unknown> | undefined)?.["node.size"], 4);
        });
        assert.equal(session.styles.list().length, before + 2, "the value adds no other layer");
        await waitFor(() => {
            assert.deepEqual(
                within(tree())
                    .getAllByRole("treeitem")
                    .filter((item) => item.getAttribute("aria-selected") === "true")
                    .map((item) => item.getAttribute("aria-label")?.split(",")[0]),
                ["Layer 1"],
            );
        });
    });
});
