/**
 * The selected layer on the REAL graphty-element, driven by real clicks and keys (issue #3409): a
 * project opens with the row that paints every element selected, its Style tab showing; a node's
 * Fill "+" styles the selected layer -- the tree row last opened, else that row -- and never makes
 * a layer for the node.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, Layer } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withoutFeatures } from "../../../test/features";
import { sampleTile } from "../../../test/samples-dialog";
import { act, render, screen, waitFor, within } from "../../../test/test-utils";
import { nodeModelsOn } from "../../features";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { hexOf } from "../words";

// The Style panel the app shows with file styles off; the panel by part of the drawing is tested
// in PartsPanel.real-element.test.tsx.
withoutFeatures(["file-styles"]);

/**
 * Les Miserables in the workspace with its starting rows.
 * @returns The session and the node id of a character by name.
 */
async function openScene(): Promise<{ session: GraphSession; idOf: (name: string) => string }> {
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
    const idOf = (name: string): string => String(session.data.nodes().find((n) => n.name === name)?.id);
    return { session, idOf };
}

/**
 * A row of the style tree.
 * @param name - The row's name, as its accessible name starts.
 * @returns the row.
 */
async function treeRow(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * Selects a node, opens its Style tab and fills its nodes red with Fill "+".
 * @param session - the element's session.
 * @param node - the node's id.
 */
async function fillRedFrom(session: GraphSession, node: string): Promise<void> {
    await act(async () => {
        await session.selection.apply({ nodes: [node] });
    });
    await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
    await userEvent.click(await screen.findByRole("button", { name: "Add to node fill" }));
    if (nodeModelsOn(session)) {
        await userEvent.click(await screen.findByRole("menuitem", { name: "Color" }));
    }
    await waitFor(() => {
        assert.isNotNull(document.activeElement?.closest('[data-line="node.color"]'), "focus in the new line");
    });
    await userEvent.keyboard("red{Enter}");
}

/**
 * The reader's layers that name ids: what a node's own layer would be.
 * @param session - the element's session.
 * @returns the layers.
 */
function idLayers(session: GraphSession): Layer[] {
    return session.styles.list().filter((l) => l.source.by === "user" && l.selector.match === "ids");
}

/**
 * The style tree's node layer that selects every element: Everything's, never the defaults beneath
 * the tree.
 * @param session - the element's session.
 * @returns the layer.
 */
function paintsEverything(session: GraphSession): Layer | undefined {
    return session.styles
        .list()
        .find((l) => l.selector.match === "everything" && l.target === "node" && typeof l.row === "string");
}

describe("the selected layer", () => {
    it("a project opens with the row that paints every element selected, on its Style tab", async () => {
        await page.viewport(1440, 900);
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await userEvent.click(screen.getByRole("button", { name: sampleTile("Les Miserables") }));
        await store.get().opened;
        const session = document.querySelector("graphty-element")?.session;
        const whole = session === undefined ? undefined : paintsEverything(session);
        assert.isDefined(whole);
        const row = await treeRow(whole?.name ?? "");
        assert.strictEqual(row.getAttribute("aria-selected"), "true", "the row is selected in the tree");
        const style = await screen.findByRole("tab", { name: "Style" });
        assert.strictEqual(style.getAttribute("aria-selected"), "true", "the inspector shows its Style tab");
        assert.isNotNull(screen.getByTestId("style-tab").querySelector('[data-line="node.color"]'), "node color");
    });

    it("a node's Fill '+' styles the layer last opened, which stays selected, and makes no layer", async () => {
        const { session, idOf } = await openScene();
        const mine = await session.styles.add({
            name: "Mine",
            target: "node",
            selector: { match: "everything" },
            set: { "node.size": 2 },
        });
        await session.styles.settled();
        await userEvent.click(await treeRow("Mine"));
        await fillRedFrom(session, idOf("Cosette"));
        await waitFor(() => {
            assert.strictEqual(hexOf(session.styles.get(mine.id)?.set?.["node.color"]), "#FF0000");
        });
        assert.lengthOf(idLayers(session), 0, "no layer for the node");
        assert.strictEqual((await treeRow("Mine")).getAttribute("aria-selected"), "true");
    });

    it("with no layer opened, a node's Style tab edits the row that paints every element", async () => {
        const { session, idOf } = await openScene();
        const whole = paintsEverything(session);
        assert.isDefined(whole);
        await act(async () => {
            await session.selection.apply({ nodes: [idOf("Cosette")] });
        });
        await userEvent.click(await screen.findByRole("tab", { name: "Style" }));
        // The row already holds the base look: its Color line is there to change.
        const box = await waitFor(() => {
            const found = screen
                .getByTestId("style-tab")
                .querySelector<HTMLInputElement>(
                    '.ws-row[data-line="node.color"] [data-testid="compact-color-input-hex"]',
                );
            assert.isNotNull(found, "the row's Color line");
            return found;
        });
        await userEvent.click(box);
        await userEvent.keyboard("red{Enter}");
        await waitFor(() => {
            assert.strictEqual(hexOf(session.styles.get(whole?.id ?? "")?.set?.["node.color"]), "#FF0000");
        });
        assert.lengthOf(idLayers(session), 0, "no layer for the node");
    });
});
