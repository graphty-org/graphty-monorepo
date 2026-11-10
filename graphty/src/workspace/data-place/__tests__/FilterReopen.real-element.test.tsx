/**
 * Reopening a saved filter, on the REAL graphty-element and Les Miserables, driven by real clicks
 * and keys (the owner's review, 2026-11-07: "when I save a filter, then click edit, it comes up as
 * an empty filter"): the canvas toolbar's Filters opens the one saved filter with every card, never
 * a new empty one; with two or more it shows them in the Data place; Done folds the filter back to
 * its one-line row, and its row opens it again with every card.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

// The full-screen selection workspace is the `selection-workspace` experiment.
withFeatures(["selection-workspace"]);

/**
 * Les Miserables in the workspace, on the Data place.
 * @returns the session and the store.
 */
async function openData(): Promise<{ session: GraphSession; store: WorkspaceStore }> {
    await page.viewport(1440, 900);
    const store = createWorkspaceStore({ project: { name: "Untitled", id: 1 }, place: "data" });
    render(<Workspace store={store} registrations={REGISTRATIONS} />);
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    if (session === undefined) {
        throw new Error("the element never came up");
    }
    await session.data.import({ type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } });
    return { session, store };
}

/**
 * The open workspace, waited for.
 * @returns it.
 */
async function ws(): Promise<HTMLElement> {
    return waitFor(() => {
        const found = document.querySelector<HTMLElement>(".sel-ws");
        assert.isNotNull(found, "the workspace is open");
        return found;
    });
}

/**
 * The cards in the open workspace.
 * @returns them.
 */
const cards = (): HTMLElement[] => [...document.querySelectorAll<HTMLElement>(".sel-ws .sel-card")];

/**
 * Picks a value in the open value picker, opening the last empty card's Value first if it is shut.
 * @param name - what to type.
 */
async function pickValue(name: string): Promise<void> {
    if (screen.queryByRole("combobox", { name: "Find attributes, results" }) === null) {
        const empty = [...document.querySelectorAll<HTMLElement>(".sel-ws [data-new-step] [data-first-focus]")].at(-1);
        assert.isDefined(empty, "an empty card's Value");
        await userEvent.click(empty);
    }
    await screen.findByRole("combobox", { name: "Find attributes, results" });
    await userEvent.keyboard(name);
    await userEvent.keyboard("{Enter}");
}

/**
 * Types a Degree card's lower end.
 * @param at - the card's place.
 * @param value - the lower end.
 */
async function degreeFrom(at: number, value: string): Promise<void> {
    const from = await waitFor(() => {
        const found = within(cards()[at]).getByRole("textbox", { name: "Degree from, number" });
        return found;
    });
    await userEvent.clear(from);
    await userEvent.type(from, `${value}{Enter}`);
}

/**
 * Saves a two-card filter from "Add filter": Degree 5 or more, then a second card, Degree 10 or more.
 * @param session - the session.
 * @param id - the filter's id, once written.
 */
async function saveTwoCardFilter(session: GraphSession): Promise<string> {
    const before = session.visibility.conditions.length;
    await userEvent.click(await screen.findByRole("button", { name: "Add filter" }));
    const modal = await ws();
    await pickValue("Degree");
    await degreeFrom(0, "5");
    await userEvent.click(within(modal).getByRole("button", { name: /^Card$/ }));
    await pickValue("Degree");
    await waitFor(() => {
        assert.lengthOf(cards(), 2);
    });
    await degreeFrom(1, "10");
    await waitFor(() => {
        const rule = session.visibility.conditions[before]?.rule;
        assert.strictEqual(rule?.kind === "union" ? rule.branches.length : 0, 2, "both cards written");
    });
    await userEvent.click(within(modal).getByRole("button", { name: /^Done/ }));
    await waitFor(() => {
        assert.isNull(document.querySelector(".sel-ws"), "Done closes it");
    });
    return session.visibility.conditions[before]?.id ?? "";
}

/**
 * Asserts the open workspace edits the saved two-card filter, not a new one.
 * @param modal - the workspace.
 */
async function assertSavedFilter(modal: HTMLElement): Promise<void> {
    await waitFor(() => {
        assert.lengthOf(cards(), 2, "both saved cards");
    });
    const head = modal.querySelector(".sel-ws-head")?.textContent ?? "";
    assert.notInclude(head, "New filter");
    assert.notMatch(head, /\b0 of 77\b/u, "not an empty filter's count");
}

describe("a saved filter opens with its cards", () => {
    it("the toolbar's Filters opens the one saved filter with both cards, not a new empty one", async () => {
        const { session, store } = await openData();
        await saveTwoCardFilter(session);
        store.set({ place: "graph" });
        await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
        await assertSavedFilter(await ws());
        assert.lengthOf(session.visibility.conditions, 1, "no second filter");
    });

    it("with two filters, the toolbar's Filters shows them in the Data place and opens neither", async () => {
        const { session, store } = await openData();
        await saveTwoCardFilter(session);
        await saveTwoCardFilter(session);
        store.set({ place: "graph" });
        await userEvent.click(await screen.findByRole("button", { name: "Filters" }));
        await waitFor(() => {
            assert.strictEqual(store.get().place, "data");
        });
        await screen.findByRole("list", { name: "Filters" });
        assert.isNull(document.querySelector(".sel-ws"), "no workspace opens");
        assert.lengthOf(session.visibility.conditions, 2);
    });

    it("Done folds the filter to its row, and Edit in its menu opens it again with both cards", async () => {
        const { session } = await openData();
        await saveTwoCardFilter(session);
        const list = await screen.findByRole("list", { name: "Filters" });
        await waitFor(() => {
            assert.isNull(list.querySelector(".sel-rest"), "no expanded summary after Done");
        });
        await userEvent.click(within(list).getByRole("button", { name: "More" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Edit/ }));
        await assertSavedFilter(await ws());
    });

    it("a click on the filter's row opens it with both cards", async () => {
        const { session } = await openData();
        await saveTwoCardFilter(session);
        const list = await screen.findByRole("list", { name: "Filters" });
        await userEvent.click(list.querySelector<HTMLElement>(".dp-filter-name") ?? document.body);
        await assertSavedFilter(await ws());
    });
});
