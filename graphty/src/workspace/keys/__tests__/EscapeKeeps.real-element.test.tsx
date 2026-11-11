/**
 * Esc and the Mod keys on the REAL graphty-element, by real keys: a dialog keeps its keys (an Esc
 * that closes it is spent, and a Mod key does not reach the page behind it), Esc on the Assistant
 * panel leaves the selection (it is the next message's scope), and Esc anywhere else clears it.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The Assistant experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;

type Session = NonNullable<HTMLElementTagNameMap["graphty-element"]["session"]>;

/**
 * The workspace on a graph of four nodes, all selected.
 * @returns the store and the session.
 */
async function selected(): Promise<{ store: WorkspaceStore; session: Session }> {
    const store = createWorkspaceStore({ project: { name: "Keys", id: 1 } });
    render(<Workspace store={store} />);
    await screen.findByRole("button", { name: "Assistant" });
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    await session.data.addNodes(["a", "b", "c", "d"].map((id) => ({ id })));
    await session.selection.apply({ scope: "visible" }, "replace", { cause: "user" });
    await waitFor(() => {
        assert.strictEqual(session.selection.size, 4);
    });
    return { store, session };
}

/** Opens Settings by its key and waits for it. */
async function openSettings(): Promise<HTMLElement> {
    await userEvent.keyboard("{Control>},{/Control}");
    return screen.findByRole("dialog", { name: "Settings" });
}

describe("keys a dialog or the Assistant panel keeps", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        localStorage.clear();
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    });

    afterEach(() => {
        cleanup();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("an Esc that closes Settings leaves the selection; the next Esc clears it", async () => {
        const { session } = await selected();
        await openSettings();
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
        });
        assert.strictEqual(session.selection.size, 4);

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(session.selection.size, 0);
        });
    });

    it("Mod+I with Settings open leaves Settings open and the focus in it", async () => {
        const { store } = await selected();
        const dialog = await openSettings();
        await userEvent.keyboard("{Control>}i{/Control}");
        assert.notStrictEqual(store.get().place, "assistant");
        assert.isTrue(dialog.contains(document.activeElement));
        assert.isNotNull(screen.queryByRole("dialog", { name: "Settings" }));
    });

    it("Esc on the Assistant panel, outside the composer, leaves the selection", async () => {
        const { session } = await selected();
        await userEvent.click(screen.getByRole("button", { name: "Assistant" }));
        const panel = await screen.findByRole("region", { name: "Assistant" });
        const button = panel.querySelector<HTMLElement>("header button");
        assert.isNotNull(button);
        button.focus();
        await userEvent.keyboard("{Escape}");
        await screen.findByRole("region", { name: "Assistant" });
        assert.strictEqual(session.selection.size, 4);
    });
});
