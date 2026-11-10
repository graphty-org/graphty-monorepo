/**
 * The recipe build of the join workspace (the `join-workspace` experiment), on the REAL
 * graphty-element, driven by real clicks, keys and a file pick: open from Join +, hold a table,
 * add a step from a tile, change a key in the column matcher, read the counts, filter the rows by
 * a fate, undo, Cancel and Done.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["selection-workspace", "join-workspace"]);

/** Four people. */
const PEOPLE = ["person_id,name,dept", "P1,Ann,Lab", "P2,Bo,Lab", "P3,Cy,Ops", "P4,Di,Ops"].join("\n");

/** Two buildings. */
const BUILDINGS = ["id,name", "b1,North", "b2,South"].join("\n");

/** Five door entries: P1 twice into b1, one unknown building, one unknown person. */
const ENTRIES = ["entry,person,building", "E1,P1,b1", "E2,P1,b1", "E3,P2,b2", "E4,P3,b9", "E5,P9,b1"].join("\n");

/**
 * The workspace on the Data place with the people and the buildings loaded, and the join
 * workspace open from Join +.
 * @returns the session and the workspace dialog.
 */
async function openRecipe(): Promise<{ session: GraphSession; dialog: HTMLElement }> {
    await page.viewport(1440, 1000);
    const store = createWorkspaceStore({ project: { name: "Join", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    const people = await session.data.prepare({ type: "csv", config: { data: PEOPLE }, name: "people.csv" });
    await people.load({ mapping: { rowsAre: "nodes", key: "person_id" } });
    const buildings = await session.data.prepare({ type: "csv", config: { data: BUILDINGS }, name: "buildings.csv" });
    await buildings.load({ mode: "merge", mapping: { rowsAre: "nodes", key: "id" } });
    const place = await screen.findByRole("region", { name: "Data place" });
    await userEvent.click(await within(place).findByRole("button", { name: "Join" }));
    const dialog = await screen.findByRole("dialog", { name: "Join" });
    return { session, dialog };
}

/**
 * Holds the door entries in the recipe through Table +, and adds an edges step from its tile.
 * @param dialog - the workspace.
 * @returns the step's card.
 */
async function addEntriesStep(dialog: HTMLElement): Promise<HTMLElement> {
    const input = dialog.querySelector<HTMLInputElement>('input[aria-label="Table file"]');
    assert.isNotNull(input);
    if (input === null) {
        throw new Error("no Table file input");
    }
    await userEvent.upload(input, new File([ENTRIES], "door_entries.csv", { type: "text/csv" }));
    const add = within(dialog).getByRole("button", { name: /^Step/ });
    await waitFor(() => {
        assert.isFalse((add as HTMLButtonElement).disabled);
    });
    await userEvent.click(add);
    await userEvent.click(await screen.findByRole("button", { name: /Turn rows into edges/ }));
    return waitFor(() => {
        const card = dialog.querySelector<HTMLElement>('[data-op="edges"]');
        assert.isNotNull(card);
        return card;
    });
}

describe("the recipe join workspace", () => {
    it("adds an edges step from a tile, counts it, and Done joins it as one undo step", async () => {
        const { session, dialog } = await openRecipe();
        const before = session.history.steps.length;
        const card = await addEntriesStep(dialog);
        // The element's counts: two rows join two known ends, one repeats a pair, two bring a new end.
        await waitFor(() => {
            assert.include(card.textContent, "2 matched");
            assert.include(card.textContent, "2 new end");
        });
        assert.lengthOf(session.data.edges(), 0, "nothing changes before Done");
        assert.include(within(dialog).getByRole("button", { name: /^Step/ }).textContent, "N");
        await userEvent.keyboard("{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        await waitFor(() => {
            assert.isAbove(session.data.edges().length, 0);
        });
        assert.strictEqual(session.history.steps.length, before + 1);
    });

    it("sets a key in the column matcher and the counts follow", async () => {
        const { dialog } = await openRecipe();
        const card = await addEntriesStep(dialog);
        await userEvent.click(within(card).getByRole("button", { name: "Target" }));
        const tableColumns = await screen.findByRole("group", { name: "Table columns" });
        await userEvent.click(within(tableColumns).getByRole("button", { name: /^entry/ }));
        const graphValues = screen.getByRole("group", { name: "Graph values" });
        await userEvent.click(within(graphValues).getByRole("button", { name: /^id,/ }));
        // No entry id names a node: every row now brings a new end.
        await waitFor(() => {
            assert.include(within(card).getByRole("button", { name: "Target" }).textContent, "entry = id");
            assert.include(card.textContent, "5 new end");
        });
    });

    it("shows only the rows of a fate when its chip is pressed", async () => {
        const { dialog } = await openRecipe();
        const card = await addEntriesStep(dialog);
        const chip = await waitFor(() => {
            const found = card.querySelector<HTMLElement>('[data-fate="new-end"]');
            assert.isNotNull(found);
            return found;
        });
        await userEvent.click(chip);
        await waitFor(() => {
            assert.include(dialog.querySelector(".jw-rows-range")?.textContent, "of 2");
        });
    });

    it("takes a step back with Undo, and Cancel leaves the graph as it was", async () => {
        const { session, dialog } = await openRecipe();
        const nodes = session.data.nodes().length;
        const before = session.history.steps.length;
        await addEntriesStep(dialog);
        await userEvent.click(within(dialog).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.isNull(dialog.querySelector('[data-op="edges"]'));
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Redo" }));
        await waitFor(() => {
            assert.isNotNull(dialog.querySelector('[data-op="edges"]'));
        });
        await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.strictEqual(session.data.nodes().length, nodes);
        assert.lengthOf(session.data.edges(), 0);
        assert.strictEqual(session.history.steps.length, before);
    });
});
