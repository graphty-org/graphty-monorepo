/**
 * The checking half of the Assistant, on the REAL graphty-element with its mock provider, by real
 * clicks and keys: chips, change lines, the waiting section, the scope line, what reaches a reader
 * away from the panel, and Talk with a fake speech source. The mock stands in for the network and
 * the fake recognizer for the microphone; the tools, the history and the requests are the element's.
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

/** A model that says what each test scripts, turn by turn, and can hold a turn until released. */
class ScriptedModel extends MockLlmProvider {
    turns: Answer[] = [{ text: "The reply.", toolCalls: [] }];
    asked = 0;
    holdTurn: number | null = null;
    held = false;
    private free: () => void = () => undefined;

    /** Lets a held turn answer. */
    release(): void {
        this.free();
    }

    /**
     * One turn.
     * @param args - what the base provider takes.
     * @returns the scripted answer.
     */
    override async generate(...args: Parameters<Generate>): ReturnType<Generate> {
        const turn = this.asked++;
        const answer = this.turns[Math.min(turn, this.turns.length - 1)];
        if (turn === this.holdTurn) {
            this.held = true;
            await new Promise<void>((resolve) => {
                this.free = resolve;
            });
        }
        return super.generate(...args).then(() => answer);
    }
}

let model = new ScriptedModel();
let calls = 0;
/** The options of every message the app sent. */
let sent: { scope?: string; via?: string }[] = [];

/** Every enable reaches the scripted model, and every message is noted with its options. */
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
    const realCommand = tag.prototype.aiCommand;
    vi.spyOn(tag.prototype, "aiCommand").mockImplementation(function command(
        this: HTMLElementTagNameMap["graphty-element"],
        ...args: Parameters<typeof realCommand>
    ) {
        sent.push(args[1] ?? {});
        return realCommand.apply(this, args);
    });
}

/**
 * One tool call of a scripted turn.
 * @param name - the tool.
 * @param args - its arguments.
 * @returns the turn.
 */
const calling = (name: string, args: Record<string, unknown>, text = ""): Answer => ({
    text,
    toolCalls: [{ id: `call-${String(++calls)}`, name, arguments: args }],
});

/**
 * The element's session, with a graph of `count` nodes in a chain.
 * @param count - how many nodes.
 * @returns the session.
 */
async function graph(count: number): Promise<NonNullable<HTMLElementTagNameMap["graphty-element"]["session"]>> {
    const session = await waitFor(() => {
        const found = document.querySelector("graphty-element")?.session;
        assert.isDefined(found);
        return found;
    });
    const ids = Array.from({ length: count }, (_, index) => `n${String(index)}`);
    await session.data.addNodes(ids.map((id, index) => ({ id, group: index % 2 === 0 ? "even" : "odd" })));
    return session;
}

/**
 * The workspace with the panel open on a graph.
 * @param count - how many nodes.
 * @returns the store and the session.
 */
async function openOn(count: number): Promise<{ store: WorkspaceStore; session: Awaited<ReturnType<typeof graph>> }> {
    writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    const store = createWorkspaceStore({ project: { name: "Check", id: 1 } });
    render(<Workspace store={store} />);
    await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
    await screen.findByRole("region", { name: "Assistant" });
    const session = await graph(count);
    await screen.findByRole("textbox", COMPOSER);
    return { store, session };
}

/**
 * Types a message and sends it with Enter.
 * @param text - the message.
 */
async function say(text: string): Promise<void> {
    await userEvent.click(await screen.findByRole("textbox", COMPOSER));
    await userEvent.keyboard(`${text}{Enter}`);
}

/** Waits for the run to end and Send to come back. */
async function finished(): Promise<void> {
    await waitFor(() => {
        assert.isNull(screen.queryByRole("button", { name: "Stop Esc" }));
    });
}

const FIND = { action: "count", where: "data.group == 'even'" };
const COLOR = { action: "add", where: "all", values: { "node.color": "#ff0000" } };
const ids = (count: number): string[] => Array.from({ length: count }, (_, index) => `n${String(index)}`);

/** A recognizer that hears one sentence, and a microphone the test browser does not have. */
function fakeSpeech(): void {
    const recognizers: { onresult: ((event: unknown) => void) | null }[] = [];
    class Heard {
        continuous = false;
        interimResults = false;
        lang = "";
        onresult: ((event: unknown) => void) | null = null;
        onerror: ((event: { error: string }) => void) | null = null;
        onend: (() => void) | null = null;
        onstart: (() => void) | null = null;
        constructor() {
            recognizers.push(this);
        }
        start(): void {
            queueMicrotask(() => {
                this.onstart?.();
                const result = Object.assign([{ transcript: "color these red", confidence: 1 }], { isFinal: true });
                this.onresult?.({ resultIndex: 0, results: Object.assign([result], { length: 1 }) });
            });
        }
        stop(): void {
            queueMicrotask(() => this.onend?.());
        }
        abort(): void {
            this.stop();
        }
    }
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal("webkitSpeechRecognition", Heard);
    // The test browser has no microphone to allow, as the recognizer has no speech to hear.
    vi.spyOn(navigator.permissions, "query").mockResolvedValue({ state: "granted" } as PermissionStatus);
    vi.spyOn(navigator.mediaDevices, "getUserMedia").mockResolvedValue(
        new AudioContext().createMediaStreamDestination().stream,
    );
}

describe("checking what the Assistant says", () => {
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
        sent = [];
        scriptElement();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        resetSiteConfig();
        writeAssistantChoice(null);
    });

    it("hovering a chip peeks with no change to selection or history; a click selects those nodes", async () => {
        const { session } = await openOn(6);
        model.turns = [calling("query", FIND), { text: "Three are even.", toolCalls: [] }];
        await say("Which are even?");
        const chip = await screen.findByRole("button", { name: "3 nodes, select" });
        const { version } = session.history;

        await userEvent.hover(chip);
        await waitFor(() => {
            assert.deepEqual(session.selection.peeked, { nodes: 3, edges: 0 });
        });
        assert.strictEqual(session.selection.size, 0);
        assert.strictEqual(session.history.version, version);

        await userEvent.click(chip);
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes].sort(), ["n0", "n2", "n4"]);
        });
        assert.strictEqual(session.history.version, version);
    });

    it("a chip whose elements left the graph reads Not in this graph as plain text", async () => {
        const { session } = await openOn(4);
        model.turns = [calling("query", FIND), { text: "Two.", toolCalls: [] }];
        await say("Which are even?");
        await screen.findByRole("button", { name: "2 nodes, select" });
        await session.data.removeNodes(["n0", "n2"]);
        await screen.findByText("Not in this graph");
        assert.isNull(screen.queryByRole("button", { name: /select$/ }));
    });

    it("Show in table selects them and opens the dock, with the chat still open", async () => {
        const { store, session } = await openOn(4);
        model.turns = [calling("query", FIND), { text: "Two.", toolCalls: [] }];
        await say("Which are even?");
        await userEvent.click(await screen.findByRole("button", { name: "Show in table" }));
        await waitFor(() => {
            assert.isTrue(store.get().dockOpen);
        });
        assert.strictEqual(session.selection.size, 2);
        await screen.findByRole("region", { name: "Conversation" });
    });

    it("words an empty result as a row naming what was searched", async () => {
        await openOn(4);
        model.turns = [
            calling("query", { action: "count", where: "data.group == 'none'" }),
            { text: "None.", toolCalls: [] },
        ];
        await say("Any none?");
        await screen.findByText("No matches for data.group == 'none'.");
    });

    it("makes each turn's chips one Tab stop, with arrows inside", async () => {
        const { session } = await openOn(4);
        await session.data.addEdges([{ source: "n0", target: "n1" }]);
        model.turns = [calling("query", { action: "count", where: "all" }), { text: "All.", toolCalls: [] }];
        await say("Everything?");
        const group = await screen.findByRole("group", { name: "Results" });
        const [nodes, edges] = await waitFor(() => {
            const chips = within(group).getAllByRole("button");
            assert.lengthOf(chips, 2);
            return chips;
        });
        assert.strictEqual(nodes.tabIndex, 0);
        assert.strictEqual(edges.tabIndex, -1);
        nodes.focus();
        await userEvent.keyboard("{ArrowRight}");
        assert.strictEqual(document.activeElement, edges);
        await waitFor(() => {
            assert.strictEqual(edges.tabIndex, 0);
            assert.strictEqual(nodes.tabIndex, -1);
        });
    });

    it("shows Undo on the newest change only, restores the drawing and reads Undone", async () => {
        const { session } = await openOn(3);
        const layers = session.styles.list().length;
        model.turns = [calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        await say("Color them");
        await screen.findByRole("region", { name: "Conversation" });
        await within(log()).findByText("Colored 3 nodes");
        assert.lengthOf(screen.getAllByRole("button", { name: "Undo" }).filter(inLog), 1);

        await finished();
        model.asked = 0;
        model.turns = [
            calling("style", { action: "add", where: "all", values: { "node.size": 3 } }),
            { text: "Bigger.", toolCalls: [] },
        ];
        await say("Size them");
        await within(log()).findByText("Sized 3 nodes");
        await finished();
        const undos = screen.getAllByRole("button", { name: "Undo" }).filter(inLog);
        assert.lengthOf(undos, 1, "only the newest step offers it");

        await userEvent.click(undos[0]);
        await within(log()).findByText("Undone");
        assert.strictEqual(session.styles.list().length, layers + 1);
        await waitFor(() => {
            assert.lengthOf(screen.getAllByRole("button", { name: "Undo" }).filter(inLog), 1);
        });
        await userEvent.click(screen.getAllByRole("button", { name: "Undo" }).filter(inLog)[0]);
        await waitFor(() => {
            assert.lengthOf(within(log()).getAllByText("Undone"), 2);
        });
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("Mod+Z in a composer with no edit of its own undoes the newest step", async () => {
        const { session } = await openOn(3);
        const layers = session.styles.list().length;
        model.turns = [calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        await say("Color them");
        await screen.findByRole("region", { name: "Conversation" });
        await within(log()).findByText("Colored 3 nodes");
        await finished();
        await userEvent.keyboard("{Control>}z{/Control}");
        await within(log()).findByText("Undone");
        assert.strictEqual(session.styles.list().length, layers);
    });

    it("Open layer shows the real editor and keeps the chat open", async () => {
        const { store } = await openOn(3);
        model.turns = [calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        await say("Color them");
        await userEvent.click(await screen.findByRole("button", { name: "Open layer" }));
        await waitFor(() => {
            assert.strictEqual(store.get().inspected?.kind, "layer-row");
        });
        assert.strictEqual(store.get().place, "assistant");
    });

    it("holds a large removal in the waiting section: Keep them declines", async () => {
        const { session } = await openOn(12);
        model.turns = [
            calling("edit_data", { action: "remove_nodes", ids: ids(12) }),
            { text: "Kept.", toolCalls: [] },
        ];
        await say("Remove them");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByText("Remove 12 nodes?");
        await within(section).findByText("Undo can bring them back.");
        await waitFor(() => {
            assert.isTrue(document.activeElement?.tagName === "TEXTAREA", "focus stays in the composer");
        });
        const composerSend = await screen.findByRole("button", { name: "Send" });
        assert.notStrictEqual(composerSend.getAttribute("data-variant"), "filled", "Send is quiet");
        assert.strictEqual(
            within(section).getByRole("button", { name: "Remove" }).getAttribute("data-variant"),
            "filled",
        );

        await userEvent.click(within(section).getByRole("button", { name: "Keep them" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Waiting for you" }));
        });
        await screen.findByText(/Kept\./);
        assert.strictEqual(session.data.statistics().nodeCount, 12);
    });

    it("Remove applies a held removal; Shift+Tab from the composer reaches the section", async () => {
        const { session } = await openOn(12);
        model.turns = [
            calling("edit_data", { action: "remove_nodes", ids: ids(12) }),
            { text: "Gone.", toolCalls: [] },
        ];
        await say("Remove them");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        const field = await screen.findByRole("textbox", COMPOSER);
        field.focus();
        await userEvent.keyboard("{Shift>}{Tab}{/Shift}");
        assert.isTrue(section.contains(document.activeElement));

        await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
        await within(log()).findByText("Removed 12 nodes");
        assert.strictEqual(session.data.statistics().nodeCount, 0);
    });

    it("Change this declines and focuses the composer; a sent message supersedes and the turn says so", async () => {
        await openOn(12);
        model.turns = [
            calling("edit_data", { action: "remove_nodes", ids: ids(12) }),
            { text: "Fine.", toolCalls: [] },
        ];
        await say("Remove them");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await userEvent.click(within(section).getByRole("button", { name: "Change this" }));
        const field = await screen.findByRole("textbox", COMPOSER);
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await finished();

        model.asked = 0;
        await say("Remove them again");
        await screen.findByRole("region", { name: "Waiting for you" });
        await say("Something else");
        await within(log()).findByText("Not run: you sent a new message.");
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Waiting for you" }));
        });
    });

    it("a question answered by typing resolves it; a wrong answer keeps it open with one line", async () => {
        await openOn(3);
        model.turns = [
            calling("ask_reader", { question: "Which group?", choices: ["even", "odd"] }),
            { text: "Even it is.", toolCalls: [] },
        ];
        await say("Pick one");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByRole("radio", { name: "even" });
        const field = await screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        assert.strictEqual(field.placeholder, "Or type an answer");

        await say("purple");
        await within(section).findByText("That is not one of the choices.");
        await userEvent.clear(field);
        await say("Even");
        await screen.findByText(/Even it is\./);
        assert.isNull(screen.queryByRole("region", { name: "Waiting for you" }));
    });

    it("answers a question with its radios and Answer", async () => {
        await openOn(3);
        model.turns = [
            calling("ask_reader", { question: "Which group?", choices: ["even", "odd"] }),
            { text: "Odd it is.", toolCalls: [] },
        ];
        await say("Pick one");
        await userEvent.click(await screen.findByRole("radio", { name: "odd" }));
        await userEvent.click(screen.getByRole("button", { name: "Answer" }));
        await screen.findByText(/Odd it is\./);
    });

    it("reads Selection with 42 selected, and x sends scope graph for one message", async () => {
        const { session } = await openOn(50);
        await session.selection.apply({ ids: ids(42) });
        const line = await within(panel()).findByText("Selection");
        assert.include(line.parentElement?.textContent, "42");

        await userEvent.click(screen.getByRole("button", { name: "Ask about the whole graph" }));
        await within(panel()).findByText("Whole graph");
        await screen.findByRole("button", { name: "Use selection" });
        await say("About everything");
        await screen.findByText("The reply.");
        await finished();
        await within(panel()).findByText("Selection");
        await say("About these");
        await waitFor(() => {
            assert.deepEqual(
                sent.map((options) => options.scope),
                ["graph", "selection"],
            );
        });
    });

    it("updates the line while typing and keeps the draft when the selection changes", async () => {
        const { session } = await openOn(5);
        const field = await screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await userEvent.click(field);
        await userEvent.keyboard("color th");
        await session.selection.apply({ ids: ["n1", "n2"] }, "replace", { cause: "user" });
        const line = await within(panel()).findByText("Selection");
        assert.include(line.parentElement?.textContent, "2");
        assert.strictEqual(field.value, "color th");
    });

    it("closing the panel leaves a run running; its request shows the rail dot and a lasting notice", async () => {
        const { store, session } = await openOn(12);
        model.turns = [
            calling("edit_data", { action: "remove_nodes", ids: ids(12) }),
            { text: "Kept.", toolCalls: [] },
        ];
        model.holdTurn = 0;
        await say("Remove them");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        assert.isNull(screen.queryByRole("region", { name: "Assistant" }));
        model.release();

        const door = screen.getByRole("button", { name: "Assistant" });
        await waitFor(() => {
            assert.strictEqual(door.getAttribute("aria-description"), "Waiting for you");
        });
        assert.isNotNull(door.querySelector(".mantine-Indicator-indicator"));
        await within(notice()).findByText("Waiting: remove 12 nodes");
        assert.isTrue(store.get().notice?.lasting);
        assert.strictEqual(session.data.statistics().nodeCount, 12);

        await userEvent.click(within(notice()).getByRole("button", { name: "Open" }));
        await screen.findByRole("region", { name: "Waiting for you" });
        await waitFor(() => {
            assert.isNull(store.get().notice);
        });
        assert.isNull(door.getAttribute("aria-description"));
    });

    it("a change landing with the panel closed gives one notice with Undo", async () => {
        const { store, session } = await openOn(3);
        const layers = session.styles.list().length;
        model.turns = [calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        model.holdTurn = 0;
        await say("Color them");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        const counted = store.get().announced;
        model.release();
        const slot = await waitFor(notice);
        await within(slot).findByText("Colored 3 nodes");
        assert.strictEqual(store.get().announced, counted + 1, "its words go through the status line once");
        await userEvent.click(within(slot).getByRole("button", { name: "Undo" }));
        await waitFor(() => {
            assert.strictEqual(session.styles.list().length, layers);
        });
    });

    it("an answer landing with the panel closed gives a notice with Open", async () => {
        await openOn(3);
        model.holdTurn = 0;
        await say("Hello");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        model.release();
        const slot = await waitFor(notice);
        await within(slot).findByText("The assistant answered");
        await userEvent.click(within(slot).getByRole("button", { name: "Open" }));
        await screen.findByRole("region", { name: "Conversation" });
    });

    it("Shift+Mod+Space opens the panel from anywhere and starts listening", async () => {
        fakeSpeech();
        await openOn(3);
        await screen.findByRole("button", { name: "Talk" });
        await userEvent.click(screen.getByRole("button", { name: "Close" }));
        await waitFor(() => {
            assert.isNull(screen.queryByRole("region", { name: "Assistant" }));
        });
        await userEvent.keyboard("{Control>}{Shift>} {/Shift}{/Control}");
        await screen.findByRole("button", { name: "Stop talking" });
    });

    it("F6 entering the panel lands in the composer, whatever had focus there last", async () => {
        await openOn(3);
        const field = await screen.findByRole("textbox", COMPOSER);
        screen.getByRole("button", { name: "Close" }).focus();
        await userEvent.keyboard("{F6}");
        await waitFor(() => {
            assert.notStrictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("{Shift>}{F6}{/Shift}");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
    });

    it("brings a waiting request back after a reload", async () => {
        const { store } = await openOn(12);
        model.turns = [calling("edit_data", { action: "remove_nodes", ids: ids(12) })];
        await say("Remove them");
        await screen.findByRole("region", { name: "Waiting for you" });
        cleanup();

        render(<Workspace store={createWorkspaceStore({ project: store.get().project })} />);
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        await graph(12);
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByText("Remove 12 nodes?");
    });

    it("Talk lands the words in the composer without sending, and the sent message reads You (spoken)", async () => {
        fakeSpeech();
        await openOn(3);
        const talk = await screen.findByRole("button", { name: "Talk" });
        talk.focus();
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("button", { name: "Stop talking" });
        await userEvent.keyboard("{Enter}");

        const field = await screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await waitFor(() => {
            assert.strictEqual(field.value, "color these red");
        });
        assert.strictEqual(model.asked, 0, "nothing was sent");
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        await userEvent.keyboard("{Enter}");
        await screen.findByRole("heading", { name: "You (spoken)" });
        assert.strictEqual(sent[0].via, "voice");
    });
});

/**
 * The conversation.
 * @returns the log.
 */
const log = (): HTMLElement => screen.getByRole("region", { name: "Conversation" });

/**
 * The panel.
 * @returns the panel.
 */
const panel = (): HTMLElement => screen.getByRole("region", { name: "Assistant" });

/**
 * The notice slot.
 * @returns the slot.
 */
function notice(): HTMLElement {
    const slot = document.querySelector<HTMLElement>(".ws-notice-slot");
    assert.isNotNull(slot);
    return slot;
}

/**
 * Whether a button is the log's, not the header's own Undo.
 * @param button - the button.
 * @returns true inside the log.
 */
function inLog(button: HTMLElement): boolean {
    return button.closest(".ws-assistant-log") !== null;
}
