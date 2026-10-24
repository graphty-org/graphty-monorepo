/**
 * An open inspector of several layers shows what Undo put back, on the REAL graphty-element with
 * real clicks and keys: a shape picked for a folder (or for several picked layers) and then undone
 * reads as not set again, and picking the same shape once more writes it again.
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

/**
 * Les Miserables with Louvain's groups as layers in a "Louvain" folder.
 * @returns The session.
 */
async function openScene(): Promise<GraphSession> {
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
    return session;
}

/**
 * The Louvain folder's rows, top first.
 * @param session - The session.
 * @returns The rows.
 */
function folderRows(session: GraphSession): StyleRow[] {
    return [...(session.styles.tree().find((each) => each.name === "Louvain")?.children ?? [])].reverse();
}

/**
 * A row of the style tree by its name.
 * @param name - The row's name.
 * @returns The row.
 */
async function row(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { name: new RegExp(`^${name}, `) });
}

/**
 * How many of the rows set a box shape.
 * @param session - The session.
 * @param rows - The rows.
 * @returns The count.
 */
function boxes(session: GraphSession, rows: readonly StyleRow[]): number {
    return rows.filter((each) => {
        const parts = session.styles.parts(each.id);
        return parts?.node !== undefined && session.styles.get(parts.node)?.set?.["node.shape"] === "box";
    }).length;
}

/**
 * Picks Box in the Style tab's shape field.
 */
async function pickBox(): Promise<void> {
    const tab = await screen.findByTestId("style-tab");
    const field = await within(tab).findByRole("combobox", { name: /^Node shape/ });
    await userEvent.click(field);
    const options = await screen.findAllByRole("option");
    const box = options.find((o) => /^box$/i.test((o.getAttribute("aria-label") ?? o.textContent ?? "").trim()));
    assert.isDefined(box, "the shape picker offers Box");
    if (box !== undefined) {
        await userEvent.click(box);
    }
}

/**
 * Adds Shape with "+", picks Box, undoes it, and checks the field reads as not set and a second
 * Box writes again.
 * @param session - The session.
 * @param rows - The rows the edit reaches.
 */
async function boxUndoBox(session: GraphSession, rows: readonly StyleRow[]): Promise<void> {
    const tab = await screen.findByTestId("style-tab");
    await userEvent.click(within(tab).getByRole("button", { name: "Add to node shape" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: "Shape" }));
    await pickBox();
    await waitFor(() => {
        assert.equal(boxes(session, rows), rows.length, "Box is written to every layer");
    });

    await userEvent.keyboard("{Control>}z{/Control}");
    await waitFor(() => {
        assert.equal(boxes(session, rows), 0, "Undo takes Box back");
        const field = within(tab).getByRole("combobox", { name: /^Node shape/ });
        assert.notMatch(field.getAttribute("aria-label") ?? "", /Box/i, "the field no longer says Box");
        assert.equal((field as HTMLInputElement).value, "", "the field holds no chosen value");
    });

    await pickBox();
    await waitFor(() => {
        assert.equal(boxes(session, rows), rows.length, "Box picked again is written again");
    });
}

describe("an open inspector after Undo", () => {
    it("a folder's Shape reads as not set after Undo, and Box picked again writes", async () => {
        const session = await openScene();
        await userEvent.click(await row("Louvain"));
        await boxUndoBox(session, folderRows(session));
    });

    it("several picked layers' Shape reads as not set after Undo, and Box picked again writes", async () => {
        const session = await openScene();
        const rows = folderRows(session).slice(0, 2);
        await userEvent.click(await row("Louvain"));
        await userEvent.keyboard("{ArrowRight}");
        await userEvent.click(await row(rows[0].name));
        await userEvent.click(await row(rows[1].name), { modifiers: ["Control"] });
        await boxUndoBox(session, rows);
    });
});
