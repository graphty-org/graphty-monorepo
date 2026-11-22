/**
 * The Assistant keeps graphty-element's error codes: a setup, an effort change, a send, a chat
 * opened or deleted that the element refuses is worded from the element's code and facts, never
 * as one fixed cause, and never dropped. Driven by real clicks and keys on the REAL element; the
 * element's refusals are its own `GraphtyError`s, thrown where the network or storage would.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { GraphtyError } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { readAssistantChoice, writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const KEY = "AIza-a-key-of-the-right-shape";
const ENGLISH = "English for people debugging";
const MISSING = "Google needs the package @mlc-ai/web-llm, which is not installed.";

/** Whether the next enables refuse, as a missing optional package does. */
let refuse: (config: AiManagerConfig) => boolean = () => false;

/** The refusal the element throws for an optional package that is not installed. */
const missingPackage = (): GraphtyError =>
    new GraphtyError({
        code: "E_MISSING_PACKAGE",
        message: ENGLISH,
        source: "config",
        details: { package: "@mlc-ai/web-llm", feature: "the assistant" },
    });

beforeEach(async () => {
    resetSiteConfig();
    await loadSiteConfig(SITE);
    localStorage.clear();
    sessionStorage.clear();
    await new Promise((resolve) => {
        indexedDB.deleteDatabase("graphty-ai").onsuccess = resolve;
    });
    refuse = () => false;
    const tag = customElements.get("graphty-element") as unknown as {
        prototype: HTMLElementTagNameMap["graphty-element"];
    };
    const realEnable = tag.prototype.enableAiControl;
    vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
        this: HTMLElementTagNameMap["graphty-element"],
        config: AiManagerConfig,
    ) {
        if (refuse(config)) {
            throw missingPackage();
        }
        await realEnable.call(this, { ...config, apiKey: "stand-in-key", providerInstance: new MockLlmProvider() });
    });
});

afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    writeAssistantChoice(null);
    resetSiteConfig();
});

/**
 * The workspace, with the Assistant panel open.
 */
async function openPanel(): Promise<void> {
    render(<Workspace store={createWorkspaceStore({ project: { name: "Codes", id: 1 } })} />);
    await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
    await screen.findByRole("region", { name: "Assistant" });
}

/**
 * The notice slot.
 * @returns it.
 */
function notice(): HTMLElement {
    const slot = document.querySelector<HTMLElement>(".ws-notice-slot");
    assert.isNotNull(slot);
    return slot;
}

/**
 * The live element.
 * @returns it.
 */
function element(): HTMLElementTagNameMap["graphty-element"] {
    const found = document.querySelector("graphty-element");
    assert.isNotNull(found);
    return found;
}

/**
 * Sends a message and waits for the mock's reply.
 * @param text - the message.
 */
async function chat(text: string): Promise<void> {
    await userEvent.click(await screen.findByRole("textbox", { name: "Message the assistant" }));
    await userEvent.keyboard(`${text}{Enter}`);
    await within(await screen.findByRole("region", { name: "Chat" })).findByText(text);
    await screen.findByRole("button", { name: "Send" });
}

/**
 * Two chats, then the chat list open on them.
 * @returns the list.
 */
async function twoChats(): Promise<HTMLElement> {
    writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    await openPanel();
    await chat("First talk");
    await userEvent.click(screen.getByRole("button", { name: "New chat" }));
    await screen.findByRole("button", { name: "Which nodes matter most?" });
    await chat("Second talk");
    await userEvent.click(screen.getByRole("button", { name: /^Chats/ }));
    const list = await screen.findByRole("list", { name: "Chats" });
    await waitFor(() => {
        assert.lengthOf(within(list).getAllByRole("listitem"), 2);
    });
    return list;
}

describe("the Assistant keeps graphty-element's error codes", () => {
    it("a refused effort change is a notice in the element's words, and the stored choice stays", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        await openPanel();
        await screen.findByRole("textbox", { name: "Message the assistant" });
        refuse = (config) => config.reasoningEffort === "high";

        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
        await userEvent.click(
            await within(await screen.findByRole("menu")).findByRole("menuitemradio", { name: "High" }),
        );

        await within(notice()).findByText(MISSING);
        assert.notInclude(notice().textContent, ENGLISH);
        assert.isUndefined(readAssistantChoice()?.effort, "the choice is kept only once the assistant took it");
    });

    it("Save words a refused setup from the element's code, not as unusable settings", async () => {
        refuse = () => true;
        await openPanel();
        await userEvent.click(await screen.findByRole("button", { name: "AI provider..." }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(await within(dialog).findByLabelText("API key"));
        await userEvent.keyboard(KEY);
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));

        await within(dialog).findByText(MISSING);
        assert.isNull(within(dialog).queryByText("The AI provider settings cannot be used."));
        assert.isNull(readAssistantChoice());
    });

    it("the provider section says why the saved choice could not be set up when it opens", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        refuse = () => true;
        await openPanel();
        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: /^Gemini.*\.\.\.$/ }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });

        await within(dialog).findByText(MISSING);
    });

    it("a message whose setup the element refused ends in the element's words, not as not connected", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        refuse = () => true;
        await openPanel();
        await userEvent.click(await screen.findByRole("textbox", { name: "Message the assistant" }));
        await userEvent.keyboard("Please answer{Enter}");

        // No chat holds the turn yet, so a notice says it, and the words go back to the composer.
        await within(notice()).findByText(MISSING);
        assert.notInclude(notice().textContent, "The assistant is not connected.");
        assert.notInclude(notice().textContent, ENGLISH);
        assert.strictEqual(
            screen.getByRole<HTMLTextAreaElement>("textbox", { name: "Message the assistant" }).value,
            "Please answer",
        );
    });

    it("a chat the element could not delete is a notice with its code, and stays listed", async () => {
        const list = await twoChats();
        vi.spyOn(element(), "deleteAiConversation").mockRejectedValue(
            new GraphtyError({ code: "E_INTERNAL", message: ENGLISH, source: "config" }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "Second talk menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        await screen.findByText("Delete this chat?");
        await userEvent.click(screen.getByRole("button", { name: "Delete" }));

        await within(notice()).findByText("Not deleted (E_INTERNAL).");
        assert.lengthOf(within(list).getAllByRole("listitem"), 2);
    });

    it("a chat the element could not open is a notice with its code, and the list stays open", async () => {
        await twoChats();
        vi.spyOn(element(), "openAiConversation").mockRejectedValue(
            new GraphtyError({ code: "E_INTERNAL", message: ENGLISH, source: "config" }),
        );
        await userEvent.click(await screen.findByRole("button", { name: "First talk" }));

        await within(notice()).findByText("Not opened (E_INTERNAL).");
        assert.isNotNull(screen.queryByRole("list", { name: "Chats" }));
    });
});
