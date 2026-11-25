/**
 * A layer the reader added and named comes back after a reload still picked, with its selection
 * workspace open (issue #9973). "Add layer" opens the new layer's name field ready to type, so
 * nearly every layer a reader makes is renamed; graphty-element gave a renamed layer a new id on
 * the way back in, so the picked row showed as Everything and the workspace closed without a word.
 * Real element, real autosave, real clicks and typing; with this tab's session storage kept and
 * emptied (as Safari empties it), and with the workspace remounted without a reload (a Vite hot
 * swap in development, issue #9982), each reloaded while the workspace is still opening (#10017).
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeAll, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { forgetAutosave, openAutosaved, reload, type ReloadOptions } from "../../../test/reload";
import { screen, waitFor, within } from "../../../test/test-utils";

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

describe.each<ReloadOptions>([{ lostSession: false }, { lostSession: true }, { remount: true }])(
    "a renamed layer across a reload (%o)",
    (how) => {
        beforeAll(async () => {
            await page.viewport(1440, 900);
        });
        beforeEach(forget);
        afterEach(forget);

        it("stays picked, and its open Style Nodes workspace comes back on it", async () => {
            const before = await openAutosaved("Les Miserables");
            await userEvent.click(page.getByRole("button", { name: "Add a layer or a folder" }));
            await userEvent.click(await screen.findByRole("menuitem", { name: "Layer" }));
            const name = await screen.findByRole("textbox", { name: "Layer name" });
            await userEvent.clear(name);
            await userEvent.type(name, "test{Enter}");
            await picked("test");
            await userEvent.click(await screen.findByRole("button", { name: /^Style Nodes\.\.\./ }));
            // Reloaded at once, in the opening's first frames (its header drawn, its first frame
            // not yet painted): the workspace is recorded as open when the reader opens it (#10017).
            await waitFor(() => {
                assert.include(document.querySelector(".sel-ws .sel-ws-head")?.textContent ?? "", "test");
            });

            const after = await reload(before, how);
            await picked("test");
            await waitFor(() => {
                assert.include(document.querySelector(".sel-ws .sel-ws-head")?.textContent ?? "", "test");
            });
            after.view.unmount();
        });
    },
);
