/**
 * Bulk editing on the REAL graphty-element, with real clicks and keys: selecting the Louvain folder
 * opens the Style panel acting on every layer in it (through a nested folder), headed by a scope
 * line; Fill shows each group's color, "One value for all" gives them one, and a typed color is
 * written only to the layers that set a color, in one undo step; the receipt offers "Also set
 * those" and Undo.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession, StyleRow } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** What a scene holds: the session, the Louvain folder, and the rows set up in it. */
interface Scene {
    readonly session: GraphSession;
    readonly folder: StyleRow;
    /** The group layers, largest first. */
    readonly groups: readonly string[];
    /** A layer in the folder that sets a size and no color. */
    readonly sized: string;
    /** A sub-folder holding two group layers. */
    readonly inner: string;
}

/**
 * Les Miserables with Louvain's groups as layers in a "Louvain" folder; the largest group locked,
 * the second hidden, the last two in a sub-folder "Fantine's", and a size-only layer "Big ones".
 * @returns The scene.
 */
async function openScene(): Promise<Scene> {
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
    await session.runs.start("louvain", {}, { seed: 1, style: { groups: "layers", name: "Louvain" } });
    await session.styles.settled();
    const folder = session.styles.tree().find((row) => row.name === "Louvain");
    if (folder === undefined) {
        throw new Error("no Louvain folder");
    }
    const groups = [...folder.children].reverse().map((row) => row.id);
    await session.styles.lockRow(groups[0], true);
    await session.styles.hideRow(groups[1], true);
    const inner = await session.styles.addFolder("Fantine's", { parent: folder.id, index: 0 });
    for (const id of groups.slice(-2)) {
        await session.styles.moveRow(id, { parent: inner.id });
    }
    const sized = await session.styles.add({
        name: "Big ones",
        target: "node",
        selector: { match: "ids", nodes: [String(session.data.nodes().find((n) => n.name === "Valjean")?.id)] },
        set: { "node.size": 2 },
    });
    await session.styles.moveRow(sized.id, { parent: folder.id });
    await session.styles.settled();
    return { session, folder, groups, sized: sized.id, inner: inner.id };
}

/**
 * The color a layer sets.
 * @param session - The session.
 * @param id - The layer.
 * @returns The color.
 */
function colorOf(session: GraphSession, id: string): unknown {
    return session.styles.get(id)?.set?.["node.color"];
}

/**
 * Select a row of the style tree by clicking it.
 * @param name - The row's name.
 */
async function clickRow(name: string): Promise<void> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    await userEvent.click(within(tree).getByRole("treeitem", { name: new RegExp(`^${name}, `) }));
}

/**
 * Give every layer that sets a property one value: the field's "One value for all" detach.
 * @param row - The property row, showing each layer's value.
 */
async function oneValueForAll(row: HTMLElement): Promise<void> {
    within(row).getByRole("button", { name: /: from each layer, / });
    await userEvent.hover(row);
    await userEvent.click(within(row).getByRole("button", { name: /^Give all \d+ layers one / }));
}

describe("bulk editing a folder", () => {
    it("says what an edit reaches; a typed Fill goes to the layers that set a color, one Undo restores them", async () => {
        const { session, folder, groups, sized } = await openScene();
        const before = new Map(groups.map((id) => [id, colorOf(session, id)]));
        await clickRow("Louvain");

        const total = groups.length + 1;
        await screen.findByText(
            `${String(total)} layers in Louvain: 2 in Fantine's, 1 hidden, 1 locked and skipped. Layers added later are not changed.`,
        );
        const tab = await screen.findByTestId("style-tab");
        const fill = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
            assert.isNotNull(found);
            return found;
        });
        assert.match(
            fill.querySelector("[data-breakdown]")?.textContent ?? "",
            /(^N|; n)ot set: Big ones; locked, left alone: /,
        );

        await oneValueForAll(fill);
        // "One value for all" leaves focus in the color's text box, its value selected: typing replaces it.
        const field = await within(fill).findByRole("textbox", { name: /^Node color/ });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("0072B2{Enter}");

        await waitFor(() => {
            for (const id of groups.slice(1)) {
                assert.equal(colorOf(session, id), "#0072B2", "a color-setting layer, hidden or nested, is written");
            }
        });
        assert.equal(colorOf(session, groups[0]), before.get(groups[0]), "the locked layer is skipped");
        assert.isUndefined(colorOf(session, sized), "a layer that sets no color is left unset");
        const receipt = await waitFor(() => {
            const found = fill.querySelector<HTMLElement>("[data-receipt]");
            assert.isNotNull(found, "the receipt is drawn");
            return found;
        });
        assert.match(
            receipt.textContent ?? "",
            new RegExp(`${String(groups.length - 1)} changed, 1 left unset, 1 locked skipped`),
        );

        await userEvent.click(within(receipt).getByRole("button", { name: "Also set those 1" }));
        await waitFor(() => {
            assert.equal(colorOf(session, sized), "#0072B2");
        });

        // Three writes, three undo steps: Undo, then Control+Z twice.
        await userEvent.click(within(receipt).getByRole("button", { name: "Undo the color change" }));
        await waitFor(() => {
            assert.isUndefined(colorOf(session, sized));
        });
        await userEvent.click(within(fill).getByRole("textbox", { name: /^Node color/ }));
        await userEvent.keyboard("{Escape}{Control>}z{/Control}{Control>}z{/Control}");
        await waitFor(() => {
            for (const id of groups) {
                assert.equal(colorOf(session, id), before.get(id), "one step restores every layer");
            }
        });
        assert.isDefined(folder);
    });

    it("reaches a nested folder's layers from the outer folder, and none outside it", async () => {
        const { session, groups, inner } = await openScene();
        // Open the Louvain folder from the keyboard, then pick its sub-folder.
        await clickRow("Louvain");
        await userEvent.keyboard("{ArrowRight}");
        await clickRow("Fantine's");

        await screen.findByText("2 layers in Fantine's.", { exact: false });
        const tab = await screen.findByTestId("style-tab");
        const size = await waitFor(() => {
            const found = tab.querySelector<HTMLElement>('.ws-row[data-line="node.color"]');
            assert.isNotNull(found);
            return found;
        });
        await oneValueForAll(size);
        const box = await within(size).findByRole("textbox", { name: /^Node color/ });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, box);
        });
        await userEvent.keyboard("D55E00{Enter}");
        await waitFor(() => {
            for (const id of groups.slice(-2)) {
                assert.equal(colorOf(session, id), "#D55E00");
            }
        });
        assert.notEqual(colorOf(session, groups[2]), "#D55E00", "a layer outside the sub-folder is untouched");
        assert.isDefined(inner);
    });
});
