/**
 * The Style panel on the layers a load added, on the REAL graphty-element with the file-styles
 * experiment on: every one of a yEd file's layers, chosen by a real click in the style tree, shows
 * its Style tab rather than "This panel could not be shown" (#6630), and a loaded layer is shown
 * and edited exactly like one a reader made: its own name in the tree, its Which nodes in the
 * ordinary selection editor (#8259).
 */
// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import GALAXY from "../../../../../graph-io/test/corpus/styles/graphml/fidelity/galaxy-lcms-workflow.graphml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["file-styles"]);

/**
 * Opens the workspace and loads the yEd file with its styles.
 * @returns the session and the layers the load added.
 */
async function openGalaxy(): Promise<{ session: GraphSession; added: Layer[] }> {
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
    const before = new Set(session.styles.list().map((layer) => layer.id));
    await session.data.import(
        { type: "graphml", name: "galaxy-lcms-workflow.graphml", config: { data: GALAXY } },
        { styles: "file" },
    );
    await session.styles.settled();
    return { session, added: session.styles.list().filter((layer) => !before.has(layer.id)) };
}

/**
 * A layer's tree item, found by the layer's own name.
 * @param name - the layer's name.
 * @returns the tree item.
 */
async function treeItemNamed(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    const items = await within(tree).findAllByRole("treeitem");
    const found = items.find((item) => (item.getAttribute("aria-label") ?? "").startsWith(`${name}, `));
    assert.isDefined(found, `${name} | ${items.map((item) => item.getAttribute("aria-label")).join(" | ")}`);
    if (found === undefined) {
        throw new Error(`no tree item named ${name}`);
    }
    return found;
}

/**
 * Waits until the panel shows what is asked for or its fallback, then says it is not the fallback.
 * @param shown - finds what the panel shows when it works.
 * @param name - the layer, for the message.
 */
async function shownOrFailed(shown: () => HTMLElement | null, name: string): Promise<void> {
    const failed = (): HTMLElement | null => screen.queryByText("This panel could not be shown");
    await waitFor(() => {
        assert.isTrue(shown() !== null || failed() !== null);
    });
    assert.isNull(failed(), name);
}

describe("the Style panel on a file's layers", () => {
    it("shows the Style tab of every layer the file made", async () => {
        const { added } = await openGalaxy();
        assert.isAbove(added.length, 0);

        const tree = await screen.findByRole("tree", { name: "Style layers" });
        const items = await within(tree).findAllByRole("treeitem");
        const names = items.map((item) => item.getAttribute("aria-label") ?? item.textContent ?? "");
        for (const [index, item] of items.entries()) {
            await userEvent.click(item);
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            await shownOrFailed(() => within(inspector).queryByRole("tab", { name: "Style" }), names[index]);
            const style = within(inspector).getByRole("tab", { name: "Style" });
            if (style.getAttribute("aria-selected") !== "true") {
                await userEvent.click(style);
            }
            await shownOrFailed(() => screen.queryByTestId("style-tab"), names[index]);
        }
    });

    it("a loaded layer keeps its own name and edits its Which nodes in the selection editor", async () => {
        const { session, added } = await openGalaxy();
        // A name no other layer has: a file's node and edge layers may share one ("Defaults").
        const named = (name: string): number => session.styles.list().filter((each) => each.name === name).length;
        const layer = added.find(
            (each) => each.target === "node" && each.selector.match !== "everything" && named(each.name) === 1,
        );
        assert.isDefined(layer, "the load added a node layer, named as no other, that selects some nodes");
        if (layer === undefined) {
            return;
        }
        // The tree names the layer by its own name, as it names a layer a reader made.
        await userEvent.click(await treeItemNamed(layer.name));
        // Its Which nodes is the ordinary selection editor, drawn at rest...
        await waitFor(() => {
            assert.isNotNull(document.querySelector(".sel-rest"), "the selection editor reads the layer");
        });
        // ...and edits the layer's selector as it edits any layer's.
        await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
        const ws = await waitFor(() => {
            const found = document.querySelector<HTMLElement>(".sel-ws");
            assert.isNotNull(found, "the selection editor is open");
            return found;
        });
        if (ws === null) {
            return;
        }
        await userEvent.click(await within(ws).findByRole("button", { name: "Or..." }));
        await screen.findByRole("combobox", { name: "Find attributes, results" });
        await userEvent.keyboard("Degree{Enter}");
        await waitFor(() => {
            const where = session.styles.get(layer.id)?.selector;
            assert.isTrue(
                where?.match === "rule" && where.where.kind === "union" && where.where.branches.length >= 2,
                JSON.stringify(where),
            );
        });
        await userEvent.click(within(ws).getByRole("button", { name: "Done" }));
        await waitFor(() => {
            assert.isNull(document.querySelector(".sel-ws"), "the selection editor closed");
        });
        // The layer keeps its own name in the Style tree.
        await treeItemNamed(layer.name);
    });
});
