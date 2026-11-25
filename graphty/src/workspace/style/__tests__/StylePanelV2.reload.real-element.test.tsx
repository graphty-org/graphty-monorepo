/**
 * Style panel v2 across a reload (owner, 2026-11-24: our checks must catch a component that does not
 * save its state; he named the data selection workspace and the picked layer). The reader adds a layer,
 * names it "test", picks it, and opens its data selection workspace from the v2 "Select nodes..." line;
 * after a reload, with this tab's session storage kept and emptied (as Safari empties it), the "test"
 * row is still picked and its workspace is open again. Real element, real autosave, real clicks and
 * typing. The fixes live on master (issue #9973); this branch fails here until it merges them.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { withFeatures } from "../../../test/features";
import { forgetAutosave, openAutosaved, reload, type ReloadOptions } from "../../../test/reload";
import { screen, waitFor, within } from "../../../test/test-utils";
import { showKind } from "./kindTab";

/** Starts with nothing kept: no autosaved work and nothing in this tab's session storage. */
async function forget(): Promise<void> {
    await forgetAutosave();
    sessionStorage.clear();
}

/**
 * The style tree's picked row, waited for.
 * @param name - the start of the row's name.
 * @returns the row.
 */
async function picked(name: string): Promise<HTMLElement> {
    const tree = await screen.findByRole("tree", { name: "Style layers" });
    return within(tree).findByRole("treeitem", { selected: true, name: new RegExp(`^${name}, `) });
}

/** Waits until the selection workspace is open, fully drawn, on the layer "test". */
async function workspaceOnTest(): Promise<void> {
    await waitFor(() => {
        const head = document.querySelector(".sel-ws .sel-ws-head");
        assert.include(head?.textContent ?? "", "test", "the selection workspace is open on test");
        assert.isNull(head?.querySelector("[data-drawing]") ?? null, "the workspace is still opening");
    });
}

describe.each<ReloadOptions>([{ lostSession: false }, { lostSession: true }])(
    "the v2 Style panel across a reload (%o)",
    (how) => {
        withFeatures(["file-styles", "style-panel-v2"]);
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("a renamed layer stays picked and its Select nodes workspace comes back", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: "Add a layer or a folder" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
            const name = await screen.findByRole("textbox", { name: "Layer name" });
            await userEvent.clear(name);
            await userEvent.type(name, "test{Enter}");
            await picked("test");
            const inspector = screen.getByRole("complementary", { name: "Inspector" });
            const style = await within(inspector).findByRole("tab", { name: "Style" });
            if (style.getAttribute("aria-selected") !== "true") {
                await userEvent.click(style);
            }
            const tab = await screen.findByTestId("style-tab");
            await showKind("node");
            await userEvent.click(await within(tab).findByRole("button", { name: /^Select nodes\.\.\./ }));
            await workspaceOnTest();

            const after = await reload(before, how);
            await picked("test");
            await workspaceOnTest();
            after.view.unmount();
        });
    },
);
