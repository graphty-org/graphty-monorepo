/**
 * Settings' AI provider page on the REAL graphty-element, by real clicks and keys: Done keeps a
 * typed key as Save does, a bad key keeps the page open and takes focus, Esc cancels, Forget key
 * shows only with a key saved, and Tab reaches the field's eye.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { readAssistantChoice, writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { scriptEnable } from "./script-enable";

const KEY = "AIza-a-key-of-the-right-shape";

/**
 * The workspace with Settings open on the AI provider page.
 * @returns the dialog.
 */
async function openKeyPage(): Promise<HTMLElement> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Keys", id: 1 } })} />);
    await userEvent.click(page.getByRole("button", { name: "Assistant", exact: true }));
    await userEvent.click(page.getByRole("button", { name: "AI provider...", exact: true }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await within(dialog).findByLabelText("API key");
    return dialog;
}

describe("the AI provider page", () => {
    beforeEach(async () => {
        await page.viewport(1440, 900);
        localStorage.clear();
        sessionStorage.clear();
        scriptEnable((config) => ({ ...config, providerInstance: new MockLlmProvider() }));
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        writeAssistantChoice(null);
    });

    it("starts OpenAI at GPT-5.4 mini at Low, and still offers GPT-4o", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByRole("combobox", { name: "Provider", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "OpenAI", exact: true }));
        const model = within(dialog).getByRole("combobox", { name: "Model" });
        await waitFor(() => {
            assert.strictEqual((model as HTMLInputElement).value, "GPT-5.4 mini");
        });
        assert.strictEqual(within(dialog).getByRole<HTMLInputElement>("combobox", { name: "Effort" }).value, "Low");
        await userEvent.click(page.elementLocator(dialog).getByRole("combobox", { name: "Model", exact: true }));
        await screen.findByRole("option", { name: "GPT-4o" });
    });

    it("starts Anthropic at Claude Haiku 5.5, and still offers Claude Haiku 4.5", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByRole("combobox", { name: "Provider", exact: true }));
        await userEvent.click(page.getByRole("option", { name: "Anthropic", exact: true }));
        const model = within(dialog).getByRole("combobox", { name: "Model" });
        await waitFor(() => {
            assert.strictEqual((model as HTMLInputElement).value, "Claude Haiku 5.5");
        });
        await userEvent.click(page.elementLocator(dialog).getByRole("combobox", { name: "Model", exact: true }));
        await screen.findByRole("option", { name: "Claude Haiku 4.5" });
    });

    it("keeps a typed key on Done, and the panel is ready", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard(KEY);
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Done", exact: true }));
        await screen.findByRole("textbox", { name: "Message the assistant" });
        // Done saves the effort the page showed: the model's lowest, with none picked.
        assert.deepEqual(readAssistantChoice(), {
            provider: "google",
            model: "gemini-3.8-flash",
            remember: false,
            effort: "low",
        });
    });

    it("keeps the page open on a bad key at Done, with focus on the field", async () => {
        const dialog = await openKeyPage();
        const field = within(dialog).getByLabelText("API key");
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard("short");
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Done", exact: true }));
        await within(dialog).findByText("This key is too short.");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        assert.isNull(readAssistantChoice());
        assert.isNotNull(screen.queryByRole("dialog", { name: "Settings" }));
    });

    it("moves focus to the field when Save meets a bad key", async () => {
        const dialog = await openKeyPage();
        const field = within(dialog).getByLabelText("API key");
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard("short");
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Save", exact: true }));
        await within(dialog).findByText("This key is too short.");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
    });

    it("cancels on Esc: a typed key is not kept", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard(KEY);
        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
        });
        assert.isNull(readAssistantChoice());
    });

    it("shows Forget key only with a key saved", async () => {
        const dialog = await openKeyPage();
        assert.isNull(within(dialog).queryByRole("button", { name: "Forget key" }));
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.keyboard(KEY);
        assert.isNull(within(dialog).queryByRole("button", { name: "Forget key" }));
        await userEvent.click(page.elementLocator(dialog).getByRole("button", { name: "Save", exact: true }));
        await screen.findByRole("textbox", { name: "Message the assistant" });
        await userEvent.click(page.getByRole("button", { name: "Options", exact: true }));
        await userEvent.click(page.getByRole("menuitem", { name: "Gemini 3.8 Flash...", exact: true }));
        const again = await screen.findByRole("dialog", { name: "Settings" });
        await within(again).findByRole("button", { name: "Forget key" });
    });

    it("reaches the field's eye by Tab", async () => {
        const dialog = await openKeyPage();
        await userEvent.click(page.elementLocator(dialog).getByLabelText("API key", { exact: true }));
        await userEvent.tab();
        assert.strictEqual(document.activeElement, within(dialog).getByRole("button", { name: "Show the password" }));
    });
});
