/**
 * The talking half of the Assistant, on the REAL graphty-element with its mock provider, by real
 * clicks and keys: setting up a provider, a conversation, stopping, failing, a fresh element per
 * project, a reload and forgetting the key. The mock stands in for the network and nothing else:
 * the key store, the saved conversations and every status are the element's own.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { cleanup, render, screen, waitFor, within } from "../../../test/test-utils";
import { readAssistantChoice, writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { link } from "../connection";

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;
const KEY = "AIza-a-key-of-the-right-shape";
const COMPOSER = { name: "Message the assistant" };

type Generate = MockLlmProvider["generate"];

/** A model that says what each test scripts, turn by turn, and can hold a turn until released. */
class ScriptedModel extends MockLlmProvider {
    /** Each turn's answer, in order; the last repeats. */
    turns: Awaited<ReturnType<Generate>>[] = [{ text: "The reply.", toolCalls: [] }];
    /** A turn to hold (from 0) until `release` or the message's end. */
    holdTurn: number | null = null;
    asked = 0;
    held = false;
    private free: () => void = () => undefined;

    /** Lets a held turn answer. */
    release(): void {
        this.free();
    }

    /**
     * One turn.
     * @param _messages - the conversation.
     * @param _tools - the tools.
     * @param options - what ends the message.
     * @returns the scripted answer.
     */
    override async generate(...[_messages, _tools, options]: Parameters<Generate>): ReturnType<Generate> {
        const turn = this.asked++;
        const answer = this.turns[Math.min(turn, this.turns.length - 1)];
        if (turn === this.holdTurn) {
            this.held = true;
            await new Promise<void>((resolve, reject) => {
                this.free = resolve;
                options?.signal?.addEventListener("abort", () => {
                    reject(new Error("aborted"));
                });
            });
        }
        return super.generate(_messages, _tools, options).then(() => answer);
    }
}

let model = new ScriptedModel();

/**
 * Every enable reaches the scripted model instead of the network, with the rest of the app's own
 * configuration as it is. A provider instance skips the element's key handling, so a given key is
 * handed to its key store here.
 */
function scriptEnable(): void {
    const tag = customElements.get("graphty-element") as unknown as {
        prototype: HTMLElementTagNameMap["graphty-element"];
    };
    const real = tag.prototype.enableAiControl;
    vi.spyOn(tag.prototype, "enableAiControl").mockImplementation(async function enable(
        this: HTMLElementTagNameMap["graphty-element"],
        config: AiManagerConfig,
    ) {
        await real.call(this, { ...config, providerInstance: model });
        if (config.apiKey !== undefined) {
            this.getApiKeyManager()?.setKey(config.provider, config.apiKey);
        }
    });
}

/**
 * The workspace, once its element has reported the experiment on.
 * @param store - the store to mount with.
 * @returns the store.
 */
async function open(store = createWorkspaceStore({ project: { name: "Talk", id: 1 } })): Promise<WorkspaceStore> {
    render(<Workspace store={store} />);
    await screen.findByRole("button", { name: "Assistant" });
    return store;
}

/** Opens the panel by its rail button. */
async function openPanel(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await screen.findByRole("region", { name: "Assistant" });
}

/**
 * The composer, with the assistant up.
 * @returns the field.
 */
async function composer(): Promise<HTMLTextAreaElement> {
    return screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
}

/**
 * Types a message and sends it with Enter.
 * @param text - the message.
 */
async function say(text: string): Promise<void> {
    await userEvent.click(await composer());
    await userEvent.keyboard(`${text}{Enter}`);
}

/** Sets up Google through the panel's own door, ending in the composer. */
async function setUpGoogle(): Promise<void> {
    await openPanel();
    await userEvent.click(await screen.findByRole("button", { name: "AI provider..." }));
    const dialog = await screen.findByRole("dialog", { name: "Settings" });
    await userEvent.click(await within(dialog).findByLabelText("API key"));
    await userEvent.keyboard(KEY);
    await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
    await composer();
}

describe("talking to the Assistant", () => {
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
        scriptEnable();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("shows the prompt and no composer with no provider, focus on its one door", async () => {
        await open();
        await openPanel();
        const door = await screen.findByRole("button", { name: "AI provider..." });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, door);
        });
        await screen.findByText("Ask about this graph or change it. It can be wrong.");
        await screen.findByText("Needs a key from an AI provider. Nothing is sent until you add one.");
        assert.isNull(screen.queryByRole("textbox", COMPOSER));
    });

    it("starts the section on Google and its default model, offering neither the mock nor WebLLM", async () => {
        await open();
        await openPanel();
        await userEvent.click(await screen.findByRole("button", { name: "AI provider..." }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        const provider = await within(dialog).findByRole("combobox", { name: "Provider" });
        assert.strictEqual((provider as HTMLInputElement).value, "Google");
        const modelField = within(dialog).getByRole("combobox", { name: "Model" });
        assert.strictEqual((modelField as HTMLInputElement).value, "Gemini 3.8 Flash");
        await userEvent.click(provider);
        await screen.findByRole("option", { name: "OpenAI" });
        assert.isNull(screen.queryByRole("option", { name: "Mock" }));
        assert.isNull(screen.queryByRole("option", { name: "WebLLM" }));
    });

    it("words a key of the wrong shape, on blur and on Save, and does not save it", async () => {
        await open();
        await openPanel();
        await userEvent.click(await screen.findByRole("button", { name: "AI provider..." }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(await within(dialog).findByLabelText("API key"));
        await userEvent.keyboard("short");
        await userEvent.tab();
        await within(dialog).findByText("This key is too short.");
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await within(dialog).findByText("This key is too short.");
        assert.isNull(readAssistantChoice());
    });

    it("reaches the composer with focus once a provider is saved, and the chip says where messages go", async () => {
        await open();
        await setUpGoogle();
        const field = await composer();
        await waitFor(() => {
            assert.isNull(screen.queryByRole("dialog", { name: "Settings" }));
        });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await screen.findByRole("button", { name: "Gemini 3.8 Flash" });
        await screen.findByRole("button", { name: "Sends to Google" });
        assert.deepEqual(readAssistantChoice(), { provider: "google", model: "gemini-3.8-flash", remember: false });
    });

    it("lists AI provider... in Quick actions, opening the section", async () => {
        await open();
        await userEvent.keyboard("{Control>}k{/Control}");
        await userEvent.click(await screen.findByRole("option", { name: /^AI provider\.\.\./ }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await within(dialog).findByLabelText("API key");
    });

    it("fills the composer from a starter and sends nothing; the third reads the first category column", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        const store = await open();
        await openPanel();
        await userEvent.click(await screen.findByRole("button", { name: "Which nodes matter most?" }));
        const field = await composer();
        assert.strictEqual(field.value, "Which nodes matter most?");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        assert.strictEqual(model.asked, 0);
        assert.strictEqual(store.get().assistantDraft, "Which nodes matter most?");
        await screen.findByRole("button", { name: "What stands out in this graph?" });
    });

    it("asks the third starter about the graph's first category column", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes([
            { id: "a", size: 1, department: "red" },
            { id: "b", size: 2, department: "blue" },
        ]);
        await openPanel();
        await screen.findByRole("button", { name: "Does department line up with the groups?" });
    });

    it("streams a reply as it comes, then shows collapsed steps with plain names and no arguments", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        model.turns = [
            {
                text: "Looking at the graph.",
                toolCalls: [{ id: "c1", name: "query", arguments: { action: "overview" } }],
            },
            { text: "It is empty.", toolCalls: [] },
        ];
        model.holdTurn = 1;
        await say("What is here?");
        const field = await composer();
        assert.strictEqual(field.value, "");

        // Mid-run: the first words are on screen as text, and Send has become Stop in place.
        await screen.findByText("Looking at the graph.");
        await screen.findByRole("button", { name: "Stop Esc" });
        assert.strictEqual(document.activeElement, field);
        await screen.findByText("Sending to Mock");
        await userEvent.keyboard("next thing");
        assert.strictEqual(field.value, "next thing");

        model.release();
        await screen.findByRole("button", { name: "Send" });
        await screen.findByText(/It is empty\./);
        await screen.findByRole("heading", { name: "You" });
        await screen.findByRole("heading", { name: "Assistant" });
        assert.strictEqual(field.value, "next thing");

        const steps = await screen.findByRole("button", { name: "1 step" });
        assert.strictEqual(steps.getAttribute("aria-expanded"), "false");
        await userEvent.click(steps);
        await screen.findByText("Query data");
        await screen.findByText(/^\d+ ms$/);
        const log = screen.getByRole("region", { name: "Conversation" });
        assert.notInclude(log.textContent, "overview");
        assert.notInclude(log.textContent, "{");
        assert.isNull(log.closest("[aria-live]"));
    });

    it("saves what the assistant exports once, named from the project and the format", async () => {
        const choice = { provider: "mock", model: "mock", remember: false } as const;
        writeAssistantChoice(choice);
        const store = await open();
        await openPanel();
        await composer();
        // Setting the same element up again must not save each file twice.
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        await link(element, store, choice);

        const blobs: Blob[] = [];
        const names: string[] = [];
        const realUrl = URL.createObjectURL.bind(URL);
        vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
            blobs.push(blob as Blob);
            return realUrl(blob);
        });
        vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function save(this: HTMLAnchorElement) {
            names.push(this.download);
        });
        model.turns = [
            {
                text: "Exporting.",
                toolCalls: [{ id: "c1", name: "export_graph", arguments: { action: "export", format: "graphml" } }],
            },
            { text: "Exported.", toolCalls: [] },
        ];
        await say("Save this graph");
        await screen.findByText(/Exported\./);

        assert.deepEqual(names, ["talk_graphml.graphml"]);
        assert.include(await blobs[0].text(), "<graphml");
    });

    it("draws what the model wrote as text, never as HTML", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        model.turns = [{ text: "<b>bold</b> words", toolCalls: [] }];
        await say("Hello");
        await screen.findByText("<b>bold</b> words");
        assert.isNull(screen.getByRole("region", { name: "Conversation" }).querySelector("b"));
    });

    it("sends on Enter, makes a line on Shift+Enter, and keeps an empty message from going", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        const field = await composer();
        await userEvent.click(field);
        await userEvent.keyboard("{Enter}");
        const send = screen.getByRole("button", { name: "Send" });
        assert.strictEqual(send.getAttribute("aria-disabled"), "true");
        // A pointer can still press it: aria-disabled keeps it focusable and draws it dimmed.
        await userEvent.click(send, { force: true });
        assert.strictEqual(model.asked, 0);

        await userEvent.keyboard("one{Shift>}{Enter}{/Shift}two");
        assert.strictEqual(field.value, "one\ntwo");
        await userEvent.keyboard("{Enter}");
        await screen.findByText("The reply.");
    });

    it("Stop ends the run, says so and puts the sent text back", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        model.holdTurn = 0;
        await say("Slow question");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        await userEvent.click(await screen.findByRole("button", { name: "Stop Esc" }));
        await within(screen.getByRole("region", { name: "Conversation" })).findByText("Stopped.");
        const field = await composer();
        assert.strictEqual(field.value, "Slow question");
        assert.strictEqual(document.activeElement, field);
        await screen.findByRole("button", { name: "Send" });
        await waitFor(() => {
            const said = [...document.querySelectorAll('[role="status"]')].map((region) => region.textContent);
            assert.include(said, "Stopped.");
        });
    });

    it("Esc in the composer stops a run, and with nothing running keeps the text", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        const field = await composer();
        await userEvent.click(field);
        await userEvent.keyboard("kept{Escape}");
        assert.strictEqual(field.value, "kept");
        assert.strictEqual(model.asked, 0);

        model.holdTurn = 0;
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        await userEvent.keyboard("{Escape}");
        await within(screen.getByRole("region", { name: "Conversation" })).findByText("Stopped.");
        assert.strictEqual(field.value, "kept");
    });

    it("words a provider failure from its code, with Send again and none of the element's English", async () => {
        await open();
        await setUpGoogle();
        // The stand-in reports its own name; the real provider reports the one the reader chose.
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("upstream exploded in English"), { statusCode: 503 }));
        await say("Please answer");
        const row = await screen.findByRole("alert");
        assert.include(row.textContent, "Could not reach Google: the service is unavailable.");
        assert.include(row.textContent, "Nothing changed.");
        const log = screen.getByRole("region", { name: "Conversation" });
        assert.notInclude(log.textContent, "exploded");
        assert.strictEqual((await composer()).value, "Please answer");

        model.clearError();
        await userEvent.click(within(row.parentElement ?? row).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
    });

    it("leaves a failure behind on New conversation, with the starters back", async () => {
        await open();
        await setUpGoogle();
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("upstream exploded in English"), { statusCode: 503 }));
        await say("Please answer");
        await screen.findByRole("alert");
        model.clearError();

        await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
        await screen.findByRole("button", { name: "Which nodes matter most?" });
        assert.isNull(screen.queryByRole("alert"));
    });

    it("sends the reader to setup when the provider refuses the key", async () => {
        await open();
        await setUpGoogle();
        model.setError(Object.assign(new Error("bad key in English"), { statusCode: 401 }));
        await say("Please answer");
        const row = await screen.findByRole("alert");
        assert.notInclude(row.textContent, "bad key");
        await userEvent.click(within(row.parentElement ?? row).getByRole("button", { name: "AI provider..." }));
        await screen.findByRole("dialog", { name: "Settings" });
    });

    it("offers Send again and setup together when a failure has no status, since either cause could be it", async () => {
        await open();
        await setUpGoogle();
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(new Error("Failed to fetch"));
        await say("Please answer");
        const row = await screen.findByRole("alert");
        assert.include(row.textContent, "Could not reach Google: the connection failed or the key was refused.");
        within(row.parentElement ?? row).getByRole("button", { name: "Send again" });
        await userEvent.click(within(row.parentElement ?? row).getByRole("button", { name: "AI provider..." }));
        await screen.findByRole("dialog", { name: "Settings" });
    });

    it("reconnects on a new project's fresh element, with the key from storage and no retyping", async () => {
        const store = await open();
        await setUpGoogle();
        const first = document.querySelector("graphty-element");
        await userEvent.keyboard("a draft");

        store.set({ project: { name: "Other", id: 2 } });
        await waitFor(() => {
            const next = document.querySelector("graphty-element");
            assert.isNotNull(next);
            assert.notStrictEqual(next, first);
            assert.isTrue(next.isAiEnabled());
            assert.strictEqual(next.getApiKeyManager()?.getKey("google"), KEY);
        });
        assert.strictEqual((await composer()).value, "");
        await say("Hello again");
        await screen.findByText("The reply.");
    });

    it("reopens a saved conversation after a reload", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await say("Remember this");
        await screen.findByText("The reply.");
        cleanup();

        await open(createWorkspaceStore({ project: { name: "Talk", id: 1 } }));
        await openPanel();
        await screen.findByText("Remember this");
        await screen.findByText("The reply.");
    });

    it("lists conversations newest first, opens one, deletes one on a confirm, and Esc returns", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await say("First talk");
        await screen.findByText("The reply.");
        await userEvent.click(screen.getByRole("button", { name: "New conversation" }));
        await screen.findByRole("button", { name: "Which nodes matter most?" });
        await say("Second talk");
        await waitFor(() => {
            assert.isNotNull(screen.queryByText("Second talk"));
        });
        await screen.findByRole("button", { name: "Send" });

        await userEvent.click(screen.getByRole("button", { name: "Assistant, Conversations" }));
        const list = await screen.findByRole("region", { name: "Conversations" });
        await within(list).findByText("First talk");
        const rows = within(list).getAllByRole("listitem");
        assert.include(rows[0].textContent, "Second talk");
        assert.include(rows[1].textContent, "First talk");

        await userEvent.keyboard("{Escape}");
        await screen.findByRole("region", { name: "Conversation" });

        await userEvent.click(screen.getByRole("button", { name: "Assistant, Conversations" }));
        await userEvent.click(await screen.findByRole("button", { name: "Open: First talk" }));
        await screen.findByText("First talk");
        assert.isNull(screen.queryByText("Second talk"));

        await userEvent.click(screen.getByRole("button", { name: "Assistant, Conversations" }));
        await userEvent.click(await screen.findByRole("button", { name: "Delete: Second talk" }));
        await screen.findByText("Delete this conversation?");
        await userEvent.click(screen.getByRole("button", { name: "Delete" }));
        await waitFor(() => {
            assert.isNull(screen.queryByText("Second talk"));
        });
    });

    it("goes back to the prompt on Forget key, with the key gone from both stores", async () => {
        await open();
        await setUpGoogle();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        await userEvent.click(screen.getByRole("button", { name: "Gemini 3.8 Flash" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(await within(dialog).findByRole("button", { name: "Forget key" }));
        await waitFor(() => {
            assert.isNull(readAssistantChoice());
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Done" }));
        await screen.findByRole("button", { name: "AI provider..." });
        assert.isNull(screen.queryByRole("textbox", COMPOSER));
        await screen.findByRole("button", { name: "Local only" });
        assert.isNull(element.getApiKeyManager());
        const stores = [localStorage, sessionStorage];
        const stored = stores.flatMap((area) => Object.keys(area).map((name) => area.getItem(name) ?? ""));
        assert.isFalse(stored.some((value) => value.includes(KEY)));
    });

    it("Delete all reaches saved conversations with no assistant up", async () => {
        await open();
        await setUpGoogle();
        await say("Keep this in mind");
        await screen.findByText("The reply.");
        await waitFor(() => {
            assert.isNotNull(document.querySelector("graphty-element")?.getAiConversation());
        });
        await userEvent.click(screen.getByRole("button", { name: "Gemini 3.8 Flash" }));
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(await within(dialog).findByRole("button", { name: "Forget key" }));
        await waitFor(() => {
            assert.isNull(readAssistantChoice());
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Delete all conversations" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "Delete all" }));
        await within(dialog).findByRole("button", { name: "Delete all conversations" });

        await userEvent.click(within(dialog).getByLabelText("API key"));
        await userEvent.keyboard(KEY);
        await userEvent.click(within(dialog).getByRole("button", { name: "Save" }));
        await screen.findByRole("button", { name: "Which nodes matter most?" });
        const list = await document.querySelector("graphty-element")?.listAiConversations();
        assert.deepEqual(list, []);
    });

    it("drops a Talk press the setup screen has no Talk to take", async () => {
        writeAssistantChoice({ provider: "google", model: "gemini-3.8-flash", remember: false });
        const store = await open();
        await userEvent.keyboard("{Shift>}{Control>} {/Control}{/Shift}");
        await screen.findByRole("button", { name: "AI provider..." });
        await waitFor(() => {
            assert.isFalse(store.get().assistantTalkPress);
        });
    });

    it("follows a failure and its Send again to the foot of a long log", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await page.viewport(1440, 400);
        await open();
        await openPanel();
        model.turns = [{ text: "A long answer line.\n".repeat(60), toolCalls: [] }];
        await say("Tell me a lot");
        await screen.findByRole("button", { name: "Send" });
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("Please answer");
        const log = screen.getByRole("region", { name: "Conversation" });
        const atFoot = async (): Promise<void> => {
            await waitFor(() => {
                const alerts = screen.getAllByRole("alert");
                assert.isAtMost(log.scrollHeight - log.scrollTop - log.clientHeight, 1);
                assert.isAtMost(alerts.at(-1)?.getBoundingClientRect().bottom ?? 0, log.getBoundingClientRect().bottom);
            });
        };
        await atFoot();
        await userEvent.click(screen.getAllByRole("button", { name: "Send again" }).at(-1) as HTMLElement);
        await waitFor(() => {
            assert.strictEqual(model.asked, 3);
        });
        await screen.findByRole("button", { name: "Send" });
        await atFoot();
        assert.isNull(screen.queryByRole("button", { name: "Jump to newest" }));
    });

    it("stays at the foot when a taller composer shortens the log", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await page.viewport(1440, 400);
        await open();
        await openPanel();
        model.turns = [{ text: "A long answer line.\n".repeat(60), toolCalls: [] }];
        await say("Tell me a lot");
        await screen.findByRole("button", { name: "Send" });
        const log = screen.getByRole("region", { name: "Conversation" });
        const before = log.clientHeight;
        await userEvent.click(await composer());
        await userEvent.keyboard("one{Shift>}{Enter}{/Shift}two{Shift>}{Enter}{/Shift}three");
        await waitFor(() => {
            assert.isBelow(log.clientHeight, before);
        });
        await waitFor(() => {
            assert.isAtMost(log.scrollHeight - log.scrollTop - log.clientHeight, 1);
        });
    });

    it("follows failures sent again while the log first overflows", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await page.viewport(1440, 400);
        await open();
        await openPanel();
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("Please answer");
        for (let sent = 1; sent < 6; sent++) {
            await waitFor(() => {
                assert.lengthOf(screen.getAllByRole("button", { name: "Send again" }), 1);
            });
            await userEvent.click(screen.getByRole("button", { name: "Send again" }));
            await waitFor(() => {
                assert.strictEqual(model.asked, sent + 1);
                assert.lengthOf(screen.getAllByRole("alert"), sent + 1);
            });
            await screen.findByRole("button", { name: "Send" });
            await waitFor(() => {
                const log = screen.getByRole("region", { name: "Conversation" });
                const alert = screen.getAllByRole("alert").at(-1);
                assert.isAtMost(
                    alert?.getBoundingClientRect().bottom ?? Infinity,
                    log.getBoundingClientRect().bottom,
                    `the newest failure is in view after send ${String(sent)}`,
                );
            });
        }
    });

    it("offers Jump to newest to a reader who scrolled up, and leaves them where they are", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await page.viewport(1440, 400);
        await open();
        await openPanel();
        const long = "A long answer line.\n".repeat(60);
        model.turns = [{ text: long, toolCalls: [] }];
        await say("Tell me a lot");
        await screen.findByText(/A long answer line/);
        await screen.findByRole("button", { name: "Send" });
        const log = screen.getByRole("region", { name: "Conversation" });
        await waitFor(() => {
            assert.isAbove(log.scrollTop, 0);
        });
        assert.isNull(screen.queryByRole("button", { name: "Jump to newest" }));

        log.scrollTop = 0;
        await waitFor(() => {
            assert.strictEqual(log.scrollTop, 0);
        });
        await say("Tell me more");
        await userEvent.click(await screen.findByRole("button", { name: "Jump to newest" }));
        await waitFor(() => {
            assert.isAbove(log.scrollTop, 0);
        });
    });
});
