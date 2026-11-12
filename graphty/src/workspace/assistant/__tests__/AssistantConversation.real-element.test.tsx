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
import { commands, page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { openBy } from "../../../test/open";
import { forgetAutosave, openAutosaved, reload } from "../../../test/reload";
import { pickSample } from "../../../test/samples-dialog";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { readAssistantChoice, writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { link } from "../connection";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

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

/**
 * Opens Settings from the model's row in the composer's options.
 * @param model - the model's name.
 */
async function openModel(model: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "Options" }));
    await userEvent.click(await screen.findByRole("menuitem", { name: `${model}...` }));
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

/**
 * The open chat's log; the header also shows the chat's first words, so a reader's words are
 * looked for here.
 * @returns the log.
 */
async function chatLog(): Promise<HTMLElement> {
    return screen.findByRole("region", { name: "Chat" });
}

/**
 * Sends a message and waits for its reply to settle.
 * @param text - the message.
 */
async function chat(text: string): Promise<void> {
    await say(text);
    await within(await chatLog()).findByText(text);
    await screen.findByRole("button", { name: "Send" });
    await waitFor(() => {
        assert.isNotNull(screen.queryAllByText("The reply.").at(0));
    });
}

/** Starts a new chat by the header's "+". */
async function newChat(): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: "New chat" }));
    await screen.findByRole("button", { name: "Which nodes matter most?" });
}

/**
 * The header's chat switch.
 * @returns the button.
 */
function chatsButton(): HTMLElement {
    return screen.getByRole("button", { name: /^Chats/ });
}

/**
 * Opens the chat list and waits for its rows.
 * @param count - the rows it should show.
 * @returns the list.
 */
async function openList(count: number): Promise<HTMLElement> {
    await userEvent.click(chatsButton());
    const list = await screen.findByRole("list", { name: "Chats" });
    await waitFor(() => {
        assert.strictEqual(within(list).getAllByRole("listitem").length, count);
        assert.strictEqual(chatsButton().getAttribute("aria-label"), `Chats, ${String(count)}`);
        assert.strictEqual(chatsButton().textContent, "Chats", "the list open, the switch names it");
    });
    return list;
}

/**
 * Starts renaming a row by its "..." menu.
 * @param title - the row's title.
 */
async function renameByMenu(title: string): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: `${title} menu` }));
    await userEvent.click(await screen.findByRole("menuitem", { name: /^Rename/ }));
}

/**
 * Types into the rename field once it has focus with its text selected.
 * @param keys - what to type.
 */
async function typeName(keys: string): Promise<void> {
    const field = await screen.findByRole<HTMLInputElement>("textbox", { name: "Chat name" });
    await waitFor(() => {
        assert.strictEqual(document.activeElement, field);
        assert.strictEqual(field.selectionEnd, field.value.length);
        assert.strictEqual(field.selectionStart, 0);
    });
    await userEvent.keyboard(keys);
}

describe("talking to the Assistant", () => {
    beforeEach(async () => {
        resetSiteConfig();
        await loadSiteConfig(SITE);
        await page.viewport(1440, 900);
        localStorage.clear();
        sessionStorage.clear();
        await forgetAutosave();
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
        await userEvent.click(screen.getByRole("button", { name: "Options" }));
        await screen.findByRole("menuitem", { name: "Gemini 3.8 Flash..." });
        await userEvent.keyboard("{Escape}");
        await screen.findByRole("button", { name: "Sends to Google" });
        assert.deepInclude(readAssistantChoice(), { provider: "google", model: "gemini-3.8-flash", remember: false });
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

    it("lines the starters up at the left, under the caution", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        const caution = (await screen.findByText("Answers can be wrong.")).getBoundingClientRect();
        for (const name of ["Which nodes matter most?", "What stands out in this graph?"]) {
            const starter = screen.getByRole("button", { name });
            const words = within(starter).getByText(name).getBoundingClientRect();
            assert.isAtMost(Math.abs(starter.getBoundingClientRect().left - caution.left), 12, `${name}: at the left`);
            assert.isAtMost(words.left - caution.left, 16, `${name}: its words start at the left`);
        }
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

    it("streams a reply as it comes, then shows its steps closed, in plain words with no arguments", async () => {
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
        await screen.findByRole("button", { name: "Stop" });
        assert.strictEqual(document.activeElement, field);
        // Three dots, named with what they stand for, in place of a working line.
        await screen.findByRole("img", { name: "Sending to Mock" });
        assert.isNull(screen.queryByText("Sending to Mock"));
        await userEvent.keyboard("next thing");
        assert.strictEqual(field.value, "next thing");

        model.release();
        await screen.findByRole("button", { name: "Send" });
        await screen.findByText(/It is empty\./);
        // The speakers are headings for screen readers only: nothing on screen says You or Assistant.
        const you = await screen.findByRole("heading", { name: "You" });
        const assistant = await screen.findByRole("heading", { name: "Assistant" });
        assert.isAtMost(you.getBoundingClientRect().width, 1);
        assert.isAtMost(assistant.getBoundingClientRect().width, 1);
        assert.strictEqual(field.value, "next thing");

        // A reply that only looked something up says so, and counts no step.
        const steps = await screen.findByRole("button", { name: "Looked something up" });
        assert.strictEqual(steps.getAttribute("aria-expanded"), "false");
        await userEvent.click(steps);
        // The graph is empty: the summary read says so, in the line and in its Result.
        const step = await screen.findByRole("button", { name: "Read the whole graph: nothing" });
        await userEvent.click(step);
        const item = step.closest<HTMLElement>("li");
        assert.isNotNull(item);
        await within(item).findByText("Result");
        assert.lengthOf(within(item).getAllByText("Read the whole graph: nothing"), 2);
        const log = screen.getByRole("region", { name: "Chat" });
        assert.notMatch(log.textContent, /\d+ ms/, "no timing");
        assert.notInclude(log.textContent, "overview");
        assert.notInclude(log.textContent, "{");
        assert.isNull(log.closest("[aria-live]"));
    });

    it("says what each step did: what it counted, what it colored, what it searched for", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes([
            { id: "a", group: "even" },
            { id: "b", group: "odd" },
            { id: "c", group: "even" },
        ]);
        await openPanel();
        model.turns = [
            {
                text: "",
                toolCalls: [
                    { id: "c1", name: "query", arguments: { action: "count", where: "data.group == 'even'" } },
                    {
                        id: "c2",
                        name: "style",
                        arguments: { action: "add", where: "all", values: { "node.color": "#ff0000" } },
                    },
                    { id: "c3", name: "catalog", arguments: { action: "search", text: "export" } },
                ],
            },
            { text: "Done.", toolCalls: [] },
        ];
        await say("Count and color");
        await screen.findByText("Done.");
        // Two look-ups and one change: only the change counts.
        await userEvent.click(await screen.findByRole("button", { name: "1 step" }));
        const turn = screen.getByText("Done.").closest<HTMLElement>(".ws-assistant-turn");
        assert.isNotNull(turn);
        const lines = await waitFor(() => {
            const said = [...turn.querySelectorAll(".ws-assistant-step-item .ws-assistant-step")].map(
                (each) => each.textContent,
            );
            assert.lengthOf(said, 3);
            return said;
        });
        // With no words of the model's own, each step is what it came to.
        assert.match(lines[0] ?? "", /^Found 2 nodes with \S.*even/);
        assert.strictEqual(lines[1], "Colored 3 nodes, in assistant node style");
        assert.strictEqual(lines[2], "Used Catalog");
        // The colored step opens to what it asked for and what came of it, in words.
        const colored = within(turn).getByRole("button", { name: "Colored 3 nodes, in assistant node style" });
        await userEvent.click(colored);
        const item = colored.closest<HTMLElement>("li");
        assert.isNotNull(item);
        await within(item).findByText("Asked for");
        within(item).getByText("Set: color red");
        within(item).getByText("Result");
        assert.lengthOf(
            within(item).getAllByText("Colored 3 nodes, in assistant node style"),
            2,
            "the line and its result",
        );
        assert.notInclude(item.textContent, "#ff0000");
    });

    it("opens a step's details by click and Enter, and Copy chat copies the whole chat with them", async () => {
        await commands.grantClipboard();
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        const session = await waitFor(() => {
            const found = document.querySelector("graphty-element")?.session;
            assert.isDefined(found);
            return found;
        });
        await session.data.addNodes([
            { id: "a", group: "even" },
            { id: "b", group: "odd" },
            { id: "c", group: "even" },
        ]);
        await openPanel();
        model.turns = [
            {
                text: "",
                toolCalls: [{ id: "c1", name: "query", arguments: { action: "count", where: "data.group == 'even'" } }],
            },
            { text: "Two are even.", toolCalls: [] },
        ];
        await say("How many are even?");
        await screen.findByText("Two are even.");
        await userEvent.click(await screen.findByRole("button", { name: "Looked something up" }));
        const step = await screen.findByRole("button", { name: /^Found 2 nodes/ });
        assert.strictEqual(step.getAttribute("aria-expanded"), "false");
        await userEvent.click(step);
        const item = step.closest<HTMLElement>("li");
        assert.isNotNull(item);
        await within(item).findByText("Asked for");
        within(item).getByText(/^Which: \S.*even$/);
        within(item).getByText("Result");
        assert.lengthOf(within(item).getAllByText(/^Found 2 nodes with \S.*even$/), 2, "the line and its result");
        assert.strictEqual(step.getAttribute("aria-expanded"), "true");
        // Enter on the focused step closes it again.
        await userEvent.keyboard("{Enter}");
        await waitFor(() => {
            assert.strictEqual(step.getAttribute("aria-expanded"), "false");
        });
        await userEvent.click(screen.getByRole("button", { name: "Copy chat" }));
        // The notice shows it, and the status line says it.
        await screen.findAllByText("Chat copied");
        const text = await navigator.clipboard.readText();
        assert.match(text, /^# How many are even\?\nGraph: Talk -- 3 nodes, 0 edges\nAssistant: Mock/);
        assert.include(text, "## You\nHow many are even?\n");
        assert.include(text, "## Assistant\nTwo are even.\n");
        assert.match(text, /\nSteps:\n1\. Found 2 nodes with \S.*even.*\n {3}- Asked for: Which: \S.*even/);
        assert.match(text, /\n- Found 2 nodes with \S.*even.* -- nodes a, c\n/);
        assert.match(text, /\nFor support:\n1\. query \{"action":"count","where":"data\.group == 'even'"\}\n/);
    });

    it("lets the reader select what was said and its reply, by real clicks", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("Hubs please");
        const log = await chatLog();
        const reply = within(log).getByText("The reply.");
        assert.strictEqual(getComputedStyle(reply).userSelect, "text");
        await userEvent.tripleClick(reply);
        assert.strictEqual(window.getSelection()?.toString().trim(), "The reply.");
        // The reader's own words select too: a double click takes one word of them.
        await userEvent.dblClick(within(log).getByText("Hubs please"), { position: { x: 4, y: 4 } });
        assert.strictEqual(window.getSelection()?.toString().trim(), "Hubs");
    });

    it("opens a running reply's steps above the working dots, growing as each step starts", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        const store = await open();
        const said: string[] = [];
        store.subscribe(() => {
            said.push(store.get().announcement);
        });
        await openPanel();
        const query = (id: string): Awaited<ReturnType<Generate>> => ({
            text: "",
            toolCalls: [{ id, name: "query", arguments: { action: "overview", intent: `Reading ${id}` } }],
        });
        model.turns = [query("c1"), query("c2"), { text: "Done.", toolCalls: [] }];
        model.holdTurn = 1;
        await say("What is here?");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        const group = await screen.findByRole("button", { name: "1 step" });
        const turn = group.closest<HTMLElement>(".ws-assistant-turn");
        assert.isNotNull(turn);
        assert.strictEqual(group.getAttribute("aria-expanded"), "true", "open while it runs");
        await within(turn).findByText("Reading c1");
        assert.include(said, "Running Query data", "the step was announced as it ran");
        const dots = screen.getByRole("img", { name: "Sending to Mock" });
        assert.isBelow(group.getBoundingClientRect().top, dots.getBoundingClientRect().top, "the steps above the dots");

        // A second step arrives: it joins the open group, still above the dots.
        model.held = false;
        model.holdTurn = 2;
        model.release();
        await within(turn).findByText("Reading c2");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        assert.strictEqual(group.getAttribute("aria-label") ?? group.textContent, "2 steps");

        model.release();
        await within(turn).findByText("Done.");
        await screen.findByRole("button", { name: "Send" });
        assert.isNull(screen.queryByRole("img", { name: /^Sending|^Writing|^Running/ }));
        // Ended, its look-ups are not counted, and it closes: the answer is what the reader reads.
        const ended = within(turn).getByRole("button", { name: "Looked up 2 things" });
        assert.strictEqual(ended.getAttribute("aria-expanded"), "false");
    });

    it("sets the reader's message on a gray fill and the reply plain, with the caution on an empty chat", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await screen.findByText("Answers can be wrong.");
        assert.isNull(screen.queryByText(/It can be wrong/));
        await chat("Hubs please");
        const log = await chatLog();
        const mine = within(log).getByText("Hubs please");
        const reply = within(log).getByText("The reply.");
        const fill = getComputedStyle(mine).backgroundColor;
        assert.notInclude(["rgba(0, 0, 0, 0)", "transparent"], fill, "the reader's message has a fill");
        assert.strictEqual(getComputedStyle(mine).borderTopStyle, "solid", "a border forced colors can draw");
        assert.strictEqual(getComputedStyle(reply).backgroundColor, "rgba(0, 0, 0, 0)", "the reply is plain");
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
        assert.isNull(screen.getByRole("region", { name: "Chat" }).querySelector("b"));
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
        await userEvent.click(await screen.findByRole("button", { name: "Stop" }));
        // A stop glyph ends the reply in place of the word.
        await within(screen.getByRole("region", { name: "Chat" })).findByRole("img", { name: "Stopped" });
        assert.notInclude(screen.getByRole("region", { name: "Chat" }).textContent, "Stopped");
        const field = await composer();
        assert.strictEqual(field.value, "Slow question");
        assert.strictEqual(document.activeElement, field);
        await screen.findByRole("button", { name: "Send" });
        await waitFor(() => {
            const said = [...document.querySelectorAll('[role="status"]')].map((region) => region.textContent);
            assert.include(said, "Stopped.");
        });
        const log = screen.getByRole("region", { name: "Chat" });
        assert.notInclude(log.textContent, "Changes taken back", "nothing had changed");
        await userEvent.click(within(log).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
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
        await within(screen.getByRole("region", { name: "Chat" })).findByRole("img", { name: "Stopped" });
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
        // The warning glyph and the words in the error color, with no box around them.
        const line = within(row).getByText(/^Could not reach Google/);
        const glyph = row.querySelector("svg");
        assert.isNotNull(glyph);
        assert.strictEqual(getComputedStyle(line).color, getComputedStyle(row).color);
        assert.notStrictEqual(
            getComputedStyle(line).color,
            getComputedStyle(screen.getByRole("region", { name: "Chat" })).color,
            "the error color",
        );
        assert.include(["rgba(0, 0, 0, 0)", "transparent"], getComputedStyle(row).backgroundColor);
        assert.strictEqual(getComputedStyle(row).borderTopWidth, "0px");
        const log = screen.getByRole("region", { name: "Chat" });
        // The buttons sit under the words, so the words get the log's width.
        const words = row.getBoundingClientRect();
        assert.isAtLeast(
            within(log).getByRole("button", { name: "Send again" }).getBoundingClientRect().top,
            words.bottom,
        );
        assert.notInclude(log.textContent, "exploded");
        assert.strictEqual((await composer()).value, "Please answer");

        model.clearError();
        await userEvent.click(within(row.parentElement ?? row).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
    });

    it("leaves a failure behind on New chat, with the starters back", async () => {
        await open();
        await setUpGoogle();
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("upstream exploded in English"), { statusCode: 503 }));
        await say("Please answer");
        await screen.findByRole("alert");
        model.clearError();

        await userEvent.click(screen.getByRole("button", { name: "New chat" }));
        await screen.findByRole("button", { name: "Which nodes matter most?" });
        assert.isNull(screen.queryByRole("alert"));
        assert.strictEqual((await composer()).value, "", "the failed words stay with the chat they failed in");
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
        const before = await openAutosaved("Florentine families");
        await openPanel();
        await say("Remember this");
        await screen.findByText("The reply.");

        await reload(before);
        if (screen.queryByRole("region", { name: "Assistant" }) === null) {
            await openPanel();
        }
        await within(await chatLog()).findByText("Remember this");
        await screen.findByText("The reply.");
    });

    it("starts an empty chat when the same sample opens again after Back to start", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        const store = createWorkspaceStore();
        render(<Workspace store={store} />);
        await openBy(store, () => pickSample("Florentine families"));
        await openPanel();
        await chat("Remember this");
        const first = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        const old = first?.getAiConversation()?.id;
        assert.isDefined(old);

        await userEvent.click(screen.getByRole("button", { name: "Main menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Back to start" }));
        await openBy(store, () => pickSample("Florentine families"));
        if (screen.queryByRole("region", { name: "Assistant" }) === null) {
            await openPanel();
        }

        // The new project's element has its own chat open: a new, empty one.
        await waitFor(() => {
            const next = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
                "graphty-element:not([data-start-page])",
            );
            assert.notStrictEqual(next, first);
            const open = next?.getAiConversation();
            assert.isDefined(open?.id);
            assert.notStrictEqual(open?.id, old);
            assert.deepStrictEqual(open?.messages, []);
        });
        await screen.findByRole("button", { name: "Which nodes matter most?" });
        assert.isNull(screen.queryByText("Remember this"), "neither the log nor the header shows the old chat");

        const next = document.querySelector<HTMLElementTagNameMap["graphty-element"]>(
            "graphty-element:not([data-start-page])",
        );
        assert.deepStrictEqual(await next?.listAiConversations(), []);
        // The header counts the open chat once the panel has heard of it. A click is found by the
        // switch's name, so it waits for the name a reader sees settled (#6661).
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 1: New chat");
        });
        await userEvent.click(chatsButton());
        const list = await screen.findByRole("list", { name: "Chats" });
        // Only the open, empty chat is listed.
        const rows = within(list).getAllByRole("listitem");
        assert.deepStrictEqual(
            rows.map((row) => row.dataset.chat),
            [next?.getAiConversation()?.id],
        );
        assert.isNull(within(list).queryByText("Remember this"));
    });

    it("lists chats newest first, opens one, deletes one on a confirm, and Esc returns", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("First talk");
        await newChat();
        await chat("Second talk");

        const list = await openList(2);
        const rows = within(list).getAllByRole("listitem");
        assert.include(rows[0].textContent, "Second talk");
        assert.include(rows[1].textContent, "First talk");

        await userEvent.keyboard("{Escape}");
        await screen.findByRole("region", { name: "Chat" });

        await openList(2);
        await userEvent.click(await screen.findByRole("button", { name: "First talk" }));
        await within(await chatLog()).findByText("First talk");
        assert.isNull(within(await chatLog()).queryByText("Second talk"));

        await openList(2);
        await userEvent.click(await screen.findByRole("button", { name: "Second talk menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        await screen.findByText("Delete this chat?");
        await userEvent.click(screen.getByRole("button", { name: "Delete" }));
        await waitFor(() => {
            assert.isNull(screen.queryByText("Second talk"));
        });
    });

    it("shows only the open chat's title while closed, counts chats in its name, and marks the open one", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("Color by department");
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 1: Color by department");
        });
        await newChat();
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 2: New chat");
        });
        // An untitled chat shows the history glyph, not "New chat".
        assert.strictEqual(chatsButton().textContent, "");
        assert.isNotNull(chatsButton().querySelector("svg"));
        await chat("Hubs please");
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 2: Hubs please");
        });
        // Seen without opening anything: only the title; the count is in the spoken name.
        const closed = chatsButton();
        assert.strictEqual(closed.getAttribute("aria-expanded"), "false");
        assert.strictEqual(closed.textContent, "Hubs please");

        const list = await openList(2);
        const hubs = within(list).getByRole("button", { name: "Hubs please" });
        assert.strictEqual(hubs.getAttribute("aria-current"), "true");
        assert.isNull(within(list).getByRole("button", { name: "Color by department" }).getAttribute("aria-current"));
        await waitFor(() => {
            assert.strictEqual(document.activeElement, hubs, "opening the list focuses the open chat");
        });

        await userEvent.keyboard("{Escape}");
        const field = await composer();
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
    });

    it("shows the log again when a message is sent from under the chat list", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("Color by department");
        await openList(1);
        await say("Hubs please");
        await within(await chatLog()).findByText("Hubs please");
        assert.isNull(screen.queryByRole("list", { name: "Chats" }));
    });

    it("cuts a long chat title short inside the header and its list row, clear of the buttons beside it", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        const long =
            "How many nodes does this graph have, and which node is the most connected? Give its id and its number of connections.";
        await chat(long);
        const panel = screen.getByRole("region", { name: "Assistant" }).getBoundingClientRect();
        const add = screen.getByRole("button", { name: "New chat" }).getBoundingClientRect();
        await waitFor(() => {
            const title = chatsButton().querySelector(".ws-chat-title")?.getBoundingClientRect();
            assert.exists(title);
            assert.isAtLeast(title.left, panel.left, "the title starts inside the panel");
            assert.isAtMost(title.right, add.left, "the title ends before New chat");
        });

        const list = await openList(1);
        const row = within(list).getAllByRole("listitem")[0];
        const date = row.querySelector(".ws-chat-date")?.getBoundingClientRect();
        const title = row.querySelector(".ws-chat-title")?.getBoundingClientRect();
        assert.exists(date);
        assert.exists(title);
        assert.isAtLeast(title.left, row.getBoundingClientRect().left, "the row's title starts inside the row");
        assert.isAtMost(title.right, date.left, "the row's title ends before its date");
    });

    it("starts every row's title at the same left edge, short or long, checked or not", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("Hi");
        await newChat();
        await chat("Which node has the most connections, and how many does it have?");
        await newChat();
        await chat("Count");

        const list = await openList(3);
        const lefts = within(list)
            .getAllByRole("listitem")
            .map((row) => row.querySelector(".ws-chat-title")?.getBoundingClientRect().left);
        assert.lengthOf(lefts, 3);
        for (const left of lefts) {
            assert.exists(left);
            assert.closeTo(left, lefts[0] ?? 0, 0.5, "titles start in one column, not centered in their rows");
        }
    });

    it("keeps the options, Talk and Send in one row inside the composer, at the narrowest panel", async () => {
        await open(createWorkspaceStore({ project: { name: "Talk", id: 1 }, assistantWidth: 240 }));
        await setUpGoogle();
        const box = (await composer()).closest(".ws-assistant-box")?.getBoundingClientRect();
        const options = screen.getByRole("button", { name: "Options" }).getBoundingClientRect();
        const send = screen.getByRole("button", { name: "Send" }).getBoundingClientRect();
        assert.exists(box);
        assert.isAtMost(send.right, box.right, "Send ends inside the composer");
        assert.isAtLeast(options.left, box.left, "the options start inside the composer");
        assert.closeTo(options.top, send.top + (send.height - options.height) / 2, 1, "one row");
        assert.isNull(screen.queryByRole("combobox", { name: "Effort" }), "effort sits behind the options");
    });

    it("dims Send while the box is empty, names Send and Stop, and keeps their keys", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await composer();
        const send = screen.getByRole("button", { name: "Send" });
        assert.strictEqual(send.getAttribute("aria-disabled"), "true");
        assert.strictEqual(send.getAttribute("aria-keyshortcuts"), "Enter");
        assert.isBelow(Number(getComputedStyle(send).opacity), 1, "dimmed, not removed");
        const accent = getComputedStyle(send).backgroundColor;
        await userEvent.hover(send);
        const tip = await screen.findByRole("tooltip");
        assert.include(tip.textContent, "Send");
        assert.include(tip.textContent, "Enter");
        await userEvent.unhover(send);

        model.holdTurn = 0;
        await say("Slow question");
        const stop = await screen.findByRole("button", { name: "Stop" });
        assert.strictEqual(stop, send, "one button, so focus survives the change");
        // A gray fill, neither the accent nor the white of a plain button, around a filled square.
        const fill = getComputedStyle(stop).backgroundColor;
        assert.notInclude(["rgba(0, 0, 0, 0)", "transparent", "rgb(255, 255, 255)", accent], fill);
        const square = stop.querySelector("svg");
        assert.strictEqual(square?.getAttribute("fill"), "currentColor");
        assert.strictEqual(stop.getAttribute("aria-keyshortcuts"), "Escape");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        model.release();
        await screen.findByRole("button", { name: "Send" });
    });

    it("lists a new chat before its first message as a checked New chat row, and counts it", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("Color by department");
        await newChat();

        const list = await openList(2);
        const rows = within(list).getAllByRole("listitem");
        const fresh = within(rows[0]).getByRole("button", { name: "New chat" });
        assert.strictEqual(fresh.getAttribute("aria-current"), "true");
        assert.include(rows[1].textContent, "Color by department");
    });

    it("renames a chat by F2 and Enter, and the name survives a reload", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        const before = await openAutosaved("Florentine families");
        await openPanel();
        await chat("First talk");

        const list = await openList(1);
        const row = within(list).getByRole("button", { name: "First talk" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, row);
        });
        await userEvent.keyboard("{F2}");
        await typeName("Departments{Enter}");
        const renamed = await within(list).findByRole("button", { name: "Departments" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, renamed, "focus returns to the row");
        });
        within(list).getByRole("button", { name: "Departments menu" });

        await userEvent.keyboard("{Escape}");
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 1: Departments");
        });

        await reload(before);
        if (screen.queryByRole("region", { name: "Assistant" }) === null) {
            await openPanel();
        }
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 1: Departments");
        });
        const again = await openList(1);
        within(again).getByRole("button", { name: "Departments" });
    });

    it("renames by the menu and a click elsewhere; Esc cancels; an empty name brings the first words back", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("First talk");
        const list = await openList(1);

        await renameByMenu("First talk");
        await typeName("Named");
        await userEvent.click(await composer());
        await within(list).findByRole("button", { name: "Named" });

        await renameByMenu("Named");
        await typeName("Not this");
        await userEvent.keyboard("{Escape}");
        await within(list).findByRole("button", { name: "Named" });
        screen.getByRole("region", { name: "Chats" });
        assert.isNull(screen.queryByRole("textbox", { name: "Chat name" }));

        await renameByMenu("Named");
        await typeName("{Backspace}{Enter}");
        await within(list).findByRole("button", { name: "First talk" });
        await waitFor(() => {
            assert.strictEqual(chatsButton().getAttribute("aria-label"), "Chats, 1");
        });
    });

    it("confirms a delete with focus on Keep it, then moves focus to the next row", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        await chat("First talk");
        await newChat();
        await chat("Second talk");
        const list = await openList(2);

        await userEvent.click(within(list).getByRole("button", { name: "Second talk menu" }));
        await userEvent.click(await screen.findByRole("menuitem", { name: "Delete" }));
        const keep = await within(list).findByRole("button", { name: "Keep it" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, keep);
        });
        await userEvent.click(within(list).getByRole("button", { name: "Delete" }));
        const next = await within(list).findByRole("button", { name: "First talk" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, next);
        });
    });

    it("goes back to the prompt on Forget key, with the key gone from both stores", async () => {
        await open();
        await setUpGoogle();
        const element = document.querySelector("graphty-element");
        assert.isNotNull(element);
        await openModel("Gemini 3.8 Flash");
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

    it("Delete all reaches saved chats with no assistant up", async () => {
        await open();
        await setUpGoogle();
        await say("Keep this in mind");
        await screen.findByText("The reply.");
        await waitFor(() => {
            assert.isNotNull(document.querySelector("graphty-element")?.getAiConversation());
        });
        await openModel("Gemini 3.8 Flash");
        const dialog = await screen.findByRole("dialog", { name: "Settings" });
        await userEvent.click(await within(dialog).findByRole("button", { name: "Forget key" }));
        await waitFor(() => {
            assert.isNull(readAssistantChoice());
        });
        await userEvent.click(within(dialog).getByRole("button", { name: "Delete all chats" }));
        await userEvent.click(await within(dialog).findByRole("button", { name: "Delete all" }));
        await within(dialog).findByRole("button", { name: "Delete all chats" });

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

    it("Mod+I back into a composer holding a failed message puts the caret after its words", async () => {
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        await open();
        await openPanel();
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("Please answer");
        await screen.findByRole("alert");
        const field = await composer();
        assert.strictEqual(field.value, "Please answer");
        // Mod+I in the composer closes the panel; again, it opens on a composer drawn with the words in it.
        await userEvent.click(field);
        await userEvent.keyboard("{Control>}i{/Control}");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("textbox", COMPOSER));
        });
        await userEvent.keyboard("{Control>}i{/Control}");
        const again = await composer();
        await waitFor(() => {
            assert.strictEqual(document.activeElement, again);
        });
        await userEvent.keyboard(" now");
        assert.strictEqual(again.value, "Please answer now");
        // The reopened log shows the failure, but says it only once: it is no alert now.
        await within(screen.getByRole("region", { name: "Chat" })).findByText("Nothing changed.");
        assert.isNull(screen.queryByRole("alert"));
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
        const log = screen.getByRole("region", { name: "Chat" });
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
        const log = screen.getByRole("region", { name: "Chat" });
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
                assert.lengthOf(screen.getAllByText("Nothing changed."), sent + 1);
                // Only the newest failure is news.
                assert.lengthOf(screen.getAllByRole("alert"), 1);
            });
            await screen.findByRole("button", { name: "Send" });
            await waitFor(() => {
                const log = screen.getByRole("region", { name: "Chat" });
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
        const log = screen.getByRole("region", { name: "Chat" });
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
