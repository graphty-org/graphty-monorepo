/**
 * What the Assistant says aloud, on the REAL graphty-element with its mock provider, by real clicks
 * and keys: a failure is the alert as it arrives and never again when its row is drawn again, and a
 * message's own runs stay out of the status line, whose news is the turn's end line.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const COMPOSER = { name: "Message the assistant" };

type Generate = MockLlmProvider["generate"];
type Answer = Awaited<ReturnType<Generate>>;

/** A model that says what each test scripts, turn by turn. */
class ScriptedModel extends MockLlmProvider {
    turns: Answer[] = [{ text: "The reply.", toolCalls: [] }];
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
let stopWatching: () => void = () => undefined;

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

/**
 * Every alert as it is written: a new alert, or new words in one. A screen reader says each.
 * @returns the words, in order, as they were written.
 */
function watchAlerts(): string[] {
    const said: string[] = [];
    const last = new WeakMap<Element, string>();
    const observer = new MutationObserver(() => {
        for (const alert of document.querySelectorAll("[role=alert]")) {
            const text = alert.textContent;
            if (last.get(alert) !== text) {
                last.set(alert, text);
                said.push(text);
            }
        }
    });
    observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    stopWatching = () => {
        observer.disconnect();
    };
    return said;
}

/**
 * Every line written to the status line.
 * @param store - the store.
 * @returns the lines, in order.
 */
function watchStatus(store: WorkspaceStore): string[] {
    const lines: string[] = [];
    store.subscribe(() => {
        const { announcement } = store.get();
        if (announcement !== "" && lines.at(-1) !== announcement) {
            lines.push(announcement);
        }
    });
    return lines;
}

/**
 * The workspace with the Assistant open on a small chain.
 * @returns the store.
 */
async function openOn(): Promise<WorkspaceStore> {
    writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    const store = createWorkspaceStore({ project: { name: "Spoken", id: 1 } });
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    const ids = ["a", "b", "c", "d"];
    await session.data.addNodes(ids.map((id) => ({ id })));
    await session.data.addEdges([
        { source: "a", target: "b" },
        { source: "a", target: "c" },
        { source: "a", target: "d" },
    ]);
    await screen.findByRole("textbox", COMPOSER);
    return store;
}

/**
 * Types a message and sends it with Enter, then waits for its end.
 * @param text - the message.
 */
async function say(text: string): Promise<void> {
    await userEvent.click(await screen.findByRole("textbox", COMPOSER));
    await userEvent.keyboard(`${text}{Enter}`);
    await screen.findByRole("button", { name: "Send" });
}

describe("what the Assistant says aloud", () => {
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
        stopWatching();
        cleanup();
        vi.restoreAllMocks();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("says a failure once, as two sentences, and never again when its row is drawn again", async () => {
        await openOn();
        const said = watchAlerts();
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("Please answer");
        const row = await screen.findByRole("alert");
        assert.match(row.textContent, /unavailable\. Nothing changed\.$/);
        assert.isNull(within(row).queryByRole("button"), "its buttons are not part of what it says");
        await waitFor(() => {
            assert.lengthOf(said, 1);
        });
        const failure = said[0];

        // Closing the conversations list draws the log again.
        await userEvent.click(screen.getByRole("button", { name: "Assistant, Conversations" }));
        await userEvent.click(screen.getByRole("button", { name: "Assistant, Conversations" }));
        await screen.findByRole("region", { name: "Conversation" });
        // Closing and reopening the panel draws it again too.
        await userEvent.click(screen.getByRole("button", { name: "Close Assistant" }));
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        const log = await screen.findByRole("region", { name: "Conversation" });
        await within(log).findByText(failure.replace(/ Nothing changed\.$/, ""));
        assert.isNull(screen.queryByRole("alert"), "a failure read back is read, not said");

        // The next send takes Send again away and says nothing of the old failure.
        model.clearError();
        await say("Again please");
        await screen.findByText("The reply.");
        assert.deepEqual(said, [failure]);
    });

    it("keeps a message's runs out of the status line, which ends on the turn's own news", async () => {
        const store = await openOn();
        const lines = watchStatus(store);
        model.turns = [
            { text: "", toolCalls: [{ id: "c1", name: "run_algorithm", arguments: { name: "degree", style: false } }] },
            { text: "a ranks first.", toolCalls: [] },
        ];
        await say("Who has the most links?");
        await screen.findByText("a ranks first.");
        await waitFor(() => {
            assert.match(lines.at(-1) ?? "", /Answer ready$/);
        });
        assert.isEmpty(
            lines.filter((line) => /finished|ranks first|failed|stopped/.test(line)),
            `the status line said: ${lines.join(" | ")}`,
        );
    });
});
