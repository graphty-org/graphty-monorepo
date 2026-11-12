/**
 * The composer's placeholder says what the next message is about, picked in the options cog,
 * on the REAL graphty-element with its mock provider, by real clicks and keys.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const COMPOSER = { name: "Message the assistant" };

type Answer = Awaited<ReturnType<MockLlmProvider["generate"]>>;

/** A model that asks the reader a question, then answers. */
class AskingModel extends MockLlmProvider {
    private turn = 0;
    /**
     * One turn.
     * @param args - what the base provider takes.
     * @returns a question first, then a reply.
     */
    override async generate(...args: Parameters<MockLlmProvider["generate"]>): Promise<Answer> {
        await super.generate(...args);
        return this.turn++ === 0
            ? {
                  text: "",
                  toolCalls: [
                      { id: "ask-1", name: "ask_reader", arguments: { question: "Which?", choices: ["a", "b"] } },
                  ],
              }
            : { text: "Done.", toolCalls: [] };
    }
}

/**
 * Waits for the composer's placeholder to read `words`.
 * @param words - the expected placeholder.
 */
async function placeholder(words: string): Promise<void> {
    await waitFor(() => {
        const field = screen.getByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        assert.strictEqual(field.placeholder, words);
        assert.strictEqual(field.getAttribute("aria-description"), words);
    });
}

describe("the composer's placeholder", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        localStorage.clear();
        const tag = customElements.get("graphty-element") as unknown as {
            prototype: HTMLElementTagNameMap["graphty-element"];
        };
        const realEnable = tag.prototype.enableAiControl;
        const model = new AskingModel();
        vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
            this: HTMLElementTagNameMap["graphty-element"],
            config: AiManagerConfig,
        ) {
            await realEnable.call(this, { ...config, providerInstance: model });
        });
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("stays on the whole graph with nodes selected, follows the pick, and a waiting question wins", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        render(<Workspace store={createWorkspaceStore({ project: { name: "Check", id: 1 } })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }]);
        await placeholder("Ask about this graph");

        await session.selection.apply({ ids: ["a", "b"] });
        await placeholder("Ask about this graph");

        await userEvent.click(screen.getByRole("button", { name: "Options" }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: /^Selection/ }));
        await placeholder("Ask about this selection");

        await userEvent.click(screen.getByRole("button", { name: "Options, asking about the selection" }));
        await userEvent.click(await screen.findByRole("menuitemradio", { name: "Whole graph" }));
        await placeholder("Ask about this graph");

        await userEvent.click(screen.getByRole("textbox", COMPOSER));
        await userEvent.keyboard("Pick one{Enter}");
        await screen.findByRole("radio", { name: "a" });
        await placeholder("Or type an answer");
    });

    it("opens every chat asking about the whole graph, and groups each set of options under its label", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        render(<Workspace store={createWorkspaceStore({ project: { name: "Check", id: 1 } })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes([{ id: "a" }, { id: "b" }]);
        await session.selection.apply({ ids: ["a", "b"] });
        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
        const about = await screen.findByRole("group", { name: "Ask about" });
        assert.lengthOf(within(about).getAllByRole("menuitemradio"), 2);
        await userEvent.click(within(about).getByRole("menuitemradio", { name: /^Selection/ }));
        await placeholder("Ask about this selection");

        await userEvent.click(screen.getByRole("button", { name: "New chat" }));
        await placeholder("Ask about this graph");
        screen.getByRole("button", { name: "Options" });
    });
});
