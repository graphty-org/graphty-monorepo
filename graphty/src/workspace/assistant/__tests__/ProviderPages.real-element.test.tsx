/**
 * The provider pages the Assistant links to, on the REAL graphty-element, by real clicks and keys:
 * the key field's (?) opens the steps to make a key and the key page by click or keyboard and Esc
 * closes it, and a provider out of credit warns with an Add credit link, in the chat and in
 * Settings, until a new key clears it. The provider is the element's real Google path; only the
 * network answers, with what Gemini sends for a key out of quota.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { PROVIDER_PAGES } from "../providerPages";

const KEY = "AIza-a-key-of-the-right-shape";
const GOOGLE = PROVIDER_PAGES.google;

/** Gemini's answer for a key out of quota (graphty-element's provider tests, checked 2026-11-06). */
function outOfQuota(): void {
    const real = globalThis.fetch;
    vi.stubGlobal("fetch", (input: RequestInfo | URL, init?: RequestInit) => {
        const url = input instanceof Request ? input.url : String(input);
        if (new URL(url, location.href).hostname !== "generativelanguage.googleapis.com") {
            return real(input, init);
        }
        const body = {
            error: {
                code: 429,
                message: "You exceeded your current quota, please check your plan and billing details.",
                status: "RESOURCE_EXHAUSTED",
            },
        };
        return Promise.resolve(
            new Response(JSON.stringify(body), { status: 429, headers: { "content-type": "application/json" } }),
        );
    });
}

/**
 * The workspace with Settings open on the AI provider page.
 * @returns the dialog.
 */
async function openKeyPage(): Promise<HTMLElement> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Pages", id: 1 } })} />);
    await userEvent.click(page.getByRole("button", { name: "Assistant", exact: true }));
    await userEvent.click(page.getByRole("button", { name: "AI provider...", exact: true }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await within(dialog).findByLabelText("API key");
    return dialog;
}

describe("the provider pages the Assistant links to", () => {
    beforeEach(async () => {
        await page.viewport(1440, 900);
        localStorage.clear();
        sessionStorage.clear();
        await new Promise((resolve) => {
            indexedDB.deleteDatabase("graphty-ai").onsuccess = resolve;
        });
    });

    afterEach(() => {
        cleanup();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
        writeAssistantChoice(null);
    });

    it("opens the key steps and the key page from the field's (?) by click, and Esc closes them", async () => {
        const dialog = await openKeyPage();
        const help = page
            .elementLocator(dialog)
            .getByRole("button", { name: "How to get a key from Google", exact: true });
        await userEvent.click(help);
        const steps = await screen.findByRole("dialog", { name: "How to get a key from Google" });
        assert.strictEqual(within(steps).getAllByRole("listitem").length, 4);
        within(steps).getByText("Choose Create API key.");
        const link = within(steps).getByRole("link", { name: "Open the key page" });
        assert.strictEqual(link.getAttribute("href"), GOOGLE?.key);
        assert.strictEqual(link.getAttribute("target"), "_blank");
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "How to get a key from Google" }));
        });
        // Esc closed the steps, not Settings.
        assert.isNotNull(screen.queryByRole("dialog", { name: "Settings" }));
        // The field keeps its own name, beside the button rather than around it.
        assert.strictEqual(within(dialog).getByLabelText("API key").tagName, "INPUT");
    });

    it("opens the key steps by keyboard, with the key page's link reachable by Tab", async () => {
        const dialog = await openKeyPage();
        within(dialog).getByRole("button", { name: "How to get a key from Google" }).focus();
        await userEvent.keyboard("{Enter}");
        const steps = await screen.findByRole("dialog", { name: "How to get a key from Google" });
        const link = within(steps).getByRole("link", { name: "Open the key page" });
        await waitFor(() => {
            assert.isTrue(steps.contains(document.activeElement));
        });
        // A few stops at most: the panel's close button, then its link.
        for (let stop = 0; stop < 3 && document.activeElement !== link; stop++) {
            await userEvent.tab();
        }
        assert.strictEqual(document.activeElement, link);
    });

    it("names each provider's own steps, and says OpenAI needs credit", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByRole("combobox", { name: "Provider", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "OpenAI", exact: true }));
        await userEvent.click(
            page.elementLocator(dialog).getByRole("button", { name: "How to get a key from OpenAI", exact: true }),
        );
        const steps = await screen.findByRole("dialog", { name: "How to get a key from OpenAI" });
        within(steps).getByText("OpenAI needs credit on the account before a key answers.");
        assert.strictEqual(
            within(steps).getByRole("link", { name: "Open the key page" }).getAttribute("href"),
            PROVIDER_PAGES.openai?.key,
        );
    });

    it("warns a provider is out of credit with Add credit, in the chat and in Settings, until a new key", async () => {
        outOfQuota();
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard(KEY);
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Save", exact: true }));
        await userEvent.click(page.getByRole("textbox", { name: "Message the assistant", exact: true }));
        await userEvent.keyboard("Please answer{Enter}");

        const row = await screen.findByRole("alert");
        assert.include(row.textContent, "Google has no credit left on this key.");
        const log = screen.getByRole("region", { name: "Chat" });
        const add = within(log).getByRole("link", { name: "Add credit" });
        assert.strictEqual(add.getAttribute("href"), GOOGLE?.billing);
        assert.strictEqual(add.getAttribute("target"), "_blank");

        await userEvent.click(page.elementLocator(log).getByRole("button", { name: "AI provider...", exact: true }));
        const settings = await screen.findByRole("dialog", { name: "Settings" });
        const note = await within(settings).findByRole("note");
        assert.include(note.textContent, "Google has no credit left on this key.");
        assert.strictEqual(
            within(note).getByRole("link", { name: "Add credit" }).getAttribute("href"),
            GOOGLE?.billing,
        );

        // A new key may have credit: the warning goes with the old one.
        await userEvent.click(page.elementLocator(settings).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard(`${KEY}-new`);
        await userEvent.click(page.elementLocator(settings).getByRole("button", { name: "Save", exact: true }));
        await screen.findByRole("textbox", { name: "Message the assistant" });
        await userEvent.click(page.getByRole("button", { name: "Options", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Gemini 3.8 Flash...", exact: true }));
        const again = await screen.findByRole("dialog", { name: "Settings" });
        await within(again).findByLabelText("API key");
        assert.isNull(within(again).queryByRole("note"));
    });
});
