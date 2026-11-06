/**
 * Every control in the Assistant panel names its object, on the REAL graphty-element with its mock
 * provider: a count, then a held removal, then the removal done, as a keyboard reader meets them.
 * No two buttons in the panel share a name, and each keeps its visible word first.
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

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const COMPOSER = { name: "Message the assistant" };

type Generate = MockLlmProvider["generate"];
type Answer = Awaited<ReturnType<Generate>>;

/** A model that says what each test scripts, turn by turn. */
class ScriptedModel extends MockLlmProvider {
    turns: Answer[] = [];
    asked = 0;

    /**
     * One turn.
     * @param args - what the base provider takes.
     * @returns the scripted answer.
     */
    override async generate(...args: Parameters<Generate>): ReturnType<Generate> {
        const answer = this.turns[Math.min(this.asked++, this.turns.length - 1)];
        return super.generate(...args).then(() => answer);
    }
}

let model = new ScriptedModel();

/** Every enable reaches the scripted model. */
function scriptElement(): void {
    const tag = customElements.get("graphty-element") as unknown as {
        prototype: HTMLElementTagNameMap["graphty-element"];
    };
    const realEnable = tag.prototype.enableAiControl;
    vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
        this: HTMLElementTagNameMap["graphty-element"],
        config: AiManagerConfig,
    ) {
        await realEnable.call(this, { ...config, providerInstance: model });
    });
}

const ids = Array.from({ length: 12 }, (_, index) => `n${String(index)}`);
const MESSAGE = "Delete every node that is not in the largest connected component, permanently, so only that one stays";

/**
 * The accessible name of every button in the panel, the chips' arrow stops included.
 * @returns the names.
 */
function panelNames(): string[] {
    const panel = screen.getByRole("region", { name: "Assistant" });
    return within(panel)
        .getAllByRole("button")
        .map((button) => button.getAttribute("aria-label") ?? button.textContent ?? "");
}

/**
 * The names that more than one button holds.
 * @returns them.
 */
function shared(): string[] {
    const names = panelNames();
    return [...new Set(names.filter((name, at) => names.indexOf(name) !== at))];
}

describe("the Assistant panel's names", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        localStorage.clear();
        sessionStorage.clear();
        await new Promise((resolve) => {
            indexedDB.deleteDatabase("graphty-ai").onsuccess = resolve;
        });
        model = new ScriptedModel();
        scriptElement();
    });

    afterEach(() => {
        cleanup();
        vi.restoreAllMocks();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("no two buttons share a name through a count, a held removal and the removal done", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        render(<Workspace store={createWorkspaceStore({ project: { name: "Check", id: 1 } })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes(ids.map((id) => ({ id })));
        await screen.findByRole("textbox", COMPOSER);
        // An empty conversation's title reads New conversation; the button beside it starts one.
        await screen.findByRole("button", { name: "New conversation, Conversations" });
        screen.getByRole("button", { name: "Start new conversation" });
        screen.getByRole("button", { name: "Close Assistant" });
        screen.getByRole("button", { name: "Mock, Change provider or model" });
        assert.deepEqual(shared(), []);

        model.turns = [
            { text: "", toolCalls: [{ id: "c1", name: "query", arguments: { action: "count", where: "all" } }] },
            { text: "", toolCalls: [{ id: "c2", name: "edit_data", arguments: { action: "remove_nodes", ids } }] },
            { text: "Gone.", toolCalls: [] },
        ];
        await userEvent.click(screen.getByRole("textbox", COMPOSER));
        await userEvent.keyboard(`${MESSAGE}{Enter}`);
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        const title = await within(section).findByText("Remove 12 nodes?");
        for (const name of ["Remove", "Change this", "Keep them"]) {
            const button = within(section).getByRole("button", { name });
            assert.strictEqual(button.getAttribute("aria-describedby"), title.id, `${name} is described by the title`);
        }
        await within(section).findByRole("button", { name: "12 nodes, select, Remove 12 nodes?" });
        // The steps open, so the count's own chip shows beside the held one.
        await userEvent.click(await screen.findByRole("button", { name: /^\d+ steps?$/ }));
        await screen.findByRole("button", { name: /^12 nodes, select, .+/ });
        assert.deepEqual(shared(), []);

        await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("button", { name: "Stop Esc" }));
        });
        await screen.findByRole("button", { name: "Undo: Removed 12 nodes" });
        assert.deepEqual(shared(), []);

        // The top bar's Undo names the step by its message, cut short.
        const top = screen.getAllByRole("button", { name: /^Undo / }).find((button) => button.closest("header"));
        assert.isDefined(top);
        const name = top.getAttribute("aria-label") ?? "";
        assert.isAtMost(name.length, "Undo ".length + 60 + "...".length);
        assert.match(name, /^Undo Delete every node .*\.\.\.$/);
    });
});
