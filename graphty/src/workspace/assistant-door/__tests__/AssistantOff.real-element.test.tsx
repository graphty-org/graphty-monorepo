/**
 * With the assistant experiment off, on the REAL graphty-element and by real keys, nothing of it
 * reaches the reader: no rail button, no Quick actions row, no shortcut, no downloaded code, and a
 * tab reloaded with the Assistant open lands on Graph. Off is stated here, so this file proves the
 * same thing in the "On" test configuration.
 */

import { assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { resetSiteConfig } from "../../../siteConfig";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore, keptPlace, type WorkspaceStore } from "../../state/store";

// The browser keeps 250 resource entries unless told otherwise, and a test page loads thousands of
// modules, so the app and the element load only after the limit is raised: the download check below
// sees every module. The element's import registers the real <graphty-element>, as main.tsx does.
performance.setResourceTimingBufferSize(100_000);
await import("@graphty/graphty-element");
const { Workspace } = await import("../../Workspace");

/**
 * The workspace, once its element has reported.
 * @param store - the store it starts from.
 * @returns the store.
 */
async function open(store = createWorkspaceStore({ project: { name: "Off", id: 1 } })): Promise<WorkspaceStore> {
    render(<Workspace store={store} />);
    const element = await waitFor(() => {
        const found = document.querySelector("graphty-element");
        assert.isNotNull(found);
        assert.isDefined(found.session);
        return found;
    });
    assert.deepEqual(element.enabledFeatures.enabled, []);
    await screen.findByRole("combobox", { name: "Find" });
    return store;
}

describe("the Assistant with its experiment off", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await page.viewport(1440, 900);
    });

    it("draws no rail button: the rail reads Graph, Data, Notes, then Settings", async () => {
        await open();
        const rail = screen.getByRole("toolbar", { name: "Places" });
        const names = within(rail)
            .getAllByRole("button")
            .map((button) => button.getAttribute("aria-label"));
        assert.deepEqual(names, ["Graph", "Data", "Notes", "Settings"]);
    });

    it("lists no Assistant in Quick actions or Keyboard shortcuts", async () => {
        await open();
        await userEvent.keyboard("{Control>}k{/Control}");
        await screen.findAllByRole("option", { name: /^Graph/ });
        assert.isNull(screen.queryByRole("option", { name: /^Assistant/ }));
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByPlaceholderText("Search commands"));
        });

        await userEvent.keyboard("?");
        const dialog = await screen.findByRole("dialog", { name: "Keyboard shortcuts" });
        assert.isNull(within(dialog).queryByText("Assistant"));
        assert.isNull(within(dialog).queryByText("Ctrl+I"));
    });

    it("leaves Mod+I to the browser and does nothing", async () => {
        const store = await open();
        const field = screen.getByRole("combobox", { name: "Find" });
        await userEvent.click(field);
        let handled: boolean | undefined;
        const note = (event: KeyboardEvent): void => {
            handled = event.defaultPrevented;
        };
        globalThis.addEventListener("keydown", note);
        await userEvent.keyboard("{Control>}i{/Control}");
        globalThis.removeEventListener("keydown", note);
        assert.isFalse(handled);
        assert.strictEqual(store.get().place, "graph");
        assert.strictEqual(document.activeElement, field);
        assert.isNull(screen.queryByRole("region", { name: "Assistant" }));
    });

    it("downloads no assistant panel, no assistant engine and no TanStack AI module", async () => {
        await open();
        const loaded = performance.getEntriesByType("resource").map((entry) => entry.name);
        // What the check reads does hold the frame and the element.
        assert.isNotEmpty(loaded.filter((name) => name.includes("/workspace/frame/Frame.tsx")));
        assert.isNotEmpty(loaded.filter((name) => name.includes("/graphty-element/src/Graph.ts")));
        // TanStack's AI packages; its Table and Virtual libraries are the app's data table.
        const assistant = loaded.filter((name) =>
            /\/workspace\/assistant\/|\/src\/ai\/engine\/|@tanstack[/_]ai/.test(name),
        );
        assert.deepEqual(assistant, []);
    });

    it("lands a tab reloaded with the Assistant open on Graph", async () => {
        sessionStorage.setItem("app.graphty.workspace.place", JSON.stringify({ page: "panels", place: "assistant" }));
        const kept = keptPlace();
        sessionStorage.removeItem("app.graphty.workspace.place");
        assert.strictEqual(kept.place, "assistant");
        const store = await open(createWorkspaceStore({ project: { name: "Off", id: 1 }, ...kept }));
        assert.strictEqual(store.get().place, "graph");
        assert.isNull(screen.queryByRole("region", { name: "Assistant" }));
    });
});
