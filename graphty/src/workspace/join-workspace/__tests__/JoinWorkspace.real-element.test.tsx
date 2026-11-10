/**
 * The join workspace's shell (the `join-workspace` experiment), on the REAL graphty-element, driven
 * by real clicks and keys: the Sources tab's Join + row with two loads, the empty workspace it opens
 * (title bar, Undo and Redo, Before and After, Cancel Esc and Done Ctrl+Enter, the preview drawn by
 * graphty-element, the paged rows), and the join screen's way into it holding the dropped table.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import type { GraphSession } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import football from "../../../../public/samples/football.gml?raw";
import lesMiserables from "../../../../public/samples/les-miserables.gml?raw";
import { withFeatures } from "../../../test/features";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { REGISTRATIONS } from "../../registrations";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

withFeatures(["selection-workspace", "join-workspace"]);

/**
 * The workspace on the Data place, College football loaded, and Les Miserables too when asked.
 * @param two - load the second source.
 * @returns the session and the store.
 */
async function open(two: boolean): Promise<{ session: GraphSession; store: WorkspaceStore }> {
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
    await session.data.import({ type: "gml", name: "football.gml", config: { data: football } });
    if (two) {
        await session.data.import(
            { type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } },
            { mode: "merge" },
        );
    }
    return { session, store };
}

/**
 * The Data place's Join + button, waited for.
 * @returns the button.
 */
async function joinButton(): Promise<HTMLElement> {
    const place = await screen.findByRole("region", { name: "Data place" });
    return within(place).findByRole("button", { name: "Join" });
}

describe("the join workspace shell", () => {
    it("draws Join + only with two or more sources", async () => {
        const { session } = await open(false);
        const place = await screen.findByRole("region", { name: "Data place" });
        await within(place).findByRole("list", { name: "Data sources" });
        assert.isNull(within(place).queryByRole("button", { name: "Join" }));
        await session.data.import(
            { type: "gml", name: "les-miserables.gml", config: { data: lesMiserables } },
            { mode: "merge" },
        );
        await joinButton();
    });

    it("opens an empty workspace drawing the graph, whose Escape cancels with nothing changed", async () => {
        const { session } = await open(true);
        const nodes = session.data.nodes().length;
        const before = session.history.steps.length;
        await userEvent.click(await joinButton());
        const dialog = await screen.findByRole("dialog", { name: "Join" });
        // Every key is on its button.
        const cancel = within(dialog).getByRole("button", { name: /^Cancel/ });
        assert.include(cancel.textContent, "Esc");
        assert.strictEqual(
            within(dialog).getByRole("button", { name: /^Done/ }).getAttribute("aria-keyshortcuts"),
            "Control+Enter",
        );
        assert.include(within(dialog).getByRole("button", { name: "Undo" }).textContent, "Ctrl+Z");
        assert.isTrue(within(dialog).getByRole<HTMLButtonElement>("button", { name: "Redo" }).disabled);
        // The preview is a graphty-element of its own, drawing the graph as it stands.
        const preview = dialog.querySelector<HTMLElement>(".jw-preview");
        assert.isNotNull(preview);
        await waitFor(() => {
            const drawn = preview?.querySelector("graphty-element")?.session;
            assert.strictEqual(drawn?.data.nodes().length, nodes);
        });
        await userEvent.click(within(dialog).getByText("Before"));
        await waitFor(() => {
            assert.strictEqual(preview?.dataset.side, "before");
        });
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.strictEqual(session.history.steps.length, before);
        assert.strictEqual(session.data.nodes().length, nodes);
    });

    it("closes on Ctrl+Enter, recording nothing for an empty recipe", async () => {
        const { session } = await open(true);
        const before = session.history.steps.length;
        await userEvent.click(await joinButton());
        await screen.findByRole("dialog", { name: "Join" });
        await userEvent.keyboard("{Control>}{Enter}{/Control}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.strictEqual(session.history.steps.length, before);
    });

    it("opens from the join screen holding the second file, as a table apart from the graph", async () => {
        const { session } = await open(false);
        const place = await screen.findByRole("region", { name: "Data place" });
        await userEvent.click(within(place).getByRole("button", { name: "Add source" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Samples/ }));
        const samples = await screen.findByRole("dialog");
        await userEvent.click(within(samples).getByRole("button", { name: /^Les Miserables: / }));
        await userEvent.click(await screen.findByRole("button", { name: "Join choices" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Join workspace" }));
        const dialog = await screen.findByRole("dialog", { name: "Join" });
        assert.isDefined(dialog);
        // Held apart: nothing was loaded.
        assert.lengthOf(session.data.sources(), 1);
        await userEvent.click(within(dialog).getByRole("button", { name: /^Cancel/ }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Join" }));
        });
        assert.lengthOf(session.data.sources(), 1);
    });
});
