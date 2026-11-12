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
import { forgetAutosave, reload } from "../../../test/reload";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore, type WorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";
import { effectLine } from "../words";

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
 * @param sendSpoken - whether what Talk heard is sent when the press ends; absent, the default.
 * @returns the store and the session.
 */
async function openOn(
    count: number,
    sendSpoken?: boolean,
): Promise<{ store: WorkspaceStore; session: Awaited<ReturnType<typeof graph>> }> {
    writeAssistantChoice({
        provider: "mock",
        model: "mock",
        remember: false,
        ...(sendSpoken === undefined ? {} : { sendSpoken }),
    });
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
        assert.isNull(screen.queryByRole("button", { name: "Stop" }));
    });
}

const FIND = { action: "count", where: "data.group == 'even'" };
const COLOR = { action: "add", where: "all", values: { "node.color": "#ff0000" } };
const ids = (count: number): string[] => Array.from({ length: count }, (_, index) => `n${String(index)}`);

/**
 * A recognizer that hears one sentence, and a microphone the test browser does not have.
 * @param slow - true: a stopped recognizer ends only when the test calls the returned function,
 * as a real one waits on its speech service.
 * @returns ends every recognizer stopped so far.
 */
function fakeSpeech(slow = false): () => void {
    const stopped: (() => void)[] = [];
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
            const end = (): void => this.onend?.();
            if (slow) {
                stopped.push(end);
            } else {
                queueMicrotask(end);
            }
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
    return () => {
        for (const end of stopped.splice(0)) {
            end();
        }
    };
}

describe("checking what the Assistant says", () => {
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

    it("Show in table opens the dock on them without selecting, with the chat still open", async () => {
        const { store, session } = await openOn(4);
        model.turns = [calling("query", FIND), { text: "Two.", toolCalls: [] }];
        await say("Which are even?");
        const table = await screen.findByRole("button", { name: "Show in table" });
        assert.strictEqual(table.textContent, "", "an icon, named for what it does");
        await userEvent.click(table);
        await waitFor(() => {
            assert.isTrue(store.get().dockOpen);
        });
        assert.strictEqual(session.selection.size, 0, "the selection stays the reader's");
        await screen.findByRole("region", { name: "Chat" });
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

    it("a selection of nothing draws no line and leaves the chips; the row is what was found", async () => {
        await openOn(6);
        model.turns = [
            calling("query", FIND),
            calling("query", { action: "count", where: "data.group == 'none'" }),
            calling("select", { action: "clear" }),
            { text: "Three are even.", toolCalls: [] },
        ];
        await say("Which are even?");
        await screen.findByRole("button", { name: "3 nodes, select" });
        screen.getByRole("button", { name: "Show in table" });
        assert.isNull(screen.queryByText(/^Selected/));
        assert.isNull(screen.queryByText(/^No matches/));
    });

    it("a selection keeps its line beside the turn's chips", async () => {
        await openOn(6);
        model.turns = [
            calling("select", { action: "set", where: "data.group == 'odd'" }),
            calling("query", FIND),
            { text: "Three are even.", toolCalls: [] },
        ];
        await say("Which are even?");
        await screen.findByText("Selected 3 nodes");
        await screen.findByRole("button", { name: "3 nodes, select" });
    });

    it("a selection of edges alone says so", () => {
        const effect = { code: "AI_EFFECT_SELECTION", params: { nodes: 0, edges: 1 } } as const;
        assert.strictEqual(effectLine(null, effect), "Selected 1 edge");
    });

    it("a turn that changed the graph keeps its change line alone", async () => {
        await openOn(4);
        model.turns = [calling("query", FIND), calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        await say("Color them");
        await screen.findByText("Colored 4 nodes");
        await finished();
        assert.isNull(screen.queryByRole("group", { name: "Results" }));
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
        await screen.findByRole("region", { name: "Chat" });
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
        assert.strictEqual(undos[0].textContent, "", "an icon; its key is in the tooltip");
        assert.strictEqual(undos[0].getAttribute("aria-keyshortcuts"), "Control+Z");

        await userEvent.click(undos[0]);
        await within(log()).findByText("Undone");
        // Undone is for screen readers; on screen the change line is struck through.
        assert.include(getComputedStyle(within(log()).getByText("Sized 3 nodes")).textDecorationLine, "line-through");
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
        await screen.findByRole("region", { name: "Chat" });
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

    it("a run the turn took away reads Removed and leaves no Open run", async () => {
        await openOn(3);
        model.turns = [
            calling("run_algorithm", { name: "degree", style: false }),
            calling("results", { action: "remove", run: "degree" }),
            { text: "Done.", toolCalls: [] },
        ];
        await say("How connected are they?");
        await screen.findByText("Removed Degree");
        await finished();
        assert.isNull(within(log()).queryByRole("button", { name: "Open run" }));
        assert.isNull(within(log()).queryByText("Changed the graph"));
        // The same run again takes the same id; the first turn's line still links to nothing.
        model.asked = 0;
        model.turns = [calling("run_algorithm", { name: "degree", style: false }), { text: "Ran.", toolCalls: [] }];
        await say("Again");
        await finished();
        await waitFor(() => {
            assert.lengthOf(within(log()).getAllByRole("button", { name: "Open run" }), 1);
        });
    });

    it("Open run lands on Values when the run painted nothing, and says what opened", async () => {
        const { store } = await openOn(3);
        model.turns = [calling("run_algorithm", { name: "degree", style: false }), { text: "Ran.", toolCalls: [] }];
        await say("How connected are they?");
        await userEvent.click(await screen.findByRole("button", { name: "Open run" }));
        const values = await screen.findByRole("tab", { name: "Values" });
        assert.strictEqual(values.getAttribute("aria-selected"), "true");
        assert.strictEqual(store.get().announcement, "Opened Degree");
    });

    it("a question answered from a run that painted nothing keeps the chip of the node it names", async () => {
        const { session } = await openOn(3);
        await session.data.addEdges([
            { source: "n1", target: "n0" },
            { source: "n1", target: "n2" },
        ]);
        model.turns = [
            calling("run_algorithm", { name: "degree" }),
            { text: "n1 is the most connected.", toolCalls: [] },
        ];
        await say("Which is the most connected?");
        await screen.findByRole("button", { name: "Open run" });
        await userEvent.click(await screen.findByRole("button", { name: "1 node, select" }));
        await waitFor(() => {
            assert.deepEqual([...session.selection.nodes], ["n1"]);
        });
    });

    it("Open run keeps Style when the run painted", async () => {
        await openOn(3);
        model.turns = [calling("run_algorithm", { name: "degree", style: true }), { text: "Ran.", toolCalls: [] }];
        await say("How connected are they?");
        await userEvent.click(await screen.findByRole("button", { name: "Open run" }));
        const style = await screen.findByRole("tab", { name: "Style" });
        assert.strictEqual(style.getAttribute("aria-selected"), "true");
    });

    it("Open layer says what opened, and goes once a later turn takes the layer away", async () => {
        const { store } = await openOn(3);
        model.turns = [calling("style", COLOR), { text: "Red.", toolCalls: [] }];
        await say("Color them");
        await userEvent.click(await screen.findByRole("button", { name: "Open layer" }));
        await waitFor(() => {
            assert.match(store.get().announcement, /^Opened ./);
        });
        model.asked = 0;
        model.turns = [calling("style", { action: "clear_mine" }), { text: "Cleared.", toolCalls: [] }];
        await say("Take that color off");
        await finished();
        await waitFor(() => {
            assert.isNull(within(log()).queryByRole("button", { name: "Open layer" }));
        });
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

        await within(log()).findByText("Declined. Nothing changed.");
        await finished();
        await say("Something else");
        await finished();
        await within(log()).findByText("Declined. Nothing changed.");
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

    it("a held delete of the whole graph reads as a removal, not a replace", async () => {
        const { session } = await openOn(12);
        model.turns = [calling("edit_data", { action: "delete_all" }), { text: "Gone.", toolCalls: [] }];
        await say("Delete the whole graph");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByText("Remove 12 nodes?");
        assert.isNull(within(section).queryByRole("button", { name: "Replace" }));
        within(section).getByRole("button", { name: "Keep them" });

        await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
        await within(log()).findByText(/^Removed 12 nodes/);
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

    it("a question answered by typing resolves it, in the choices' words or the reader's own", async () => {
        await openOn(3);
        model.turns = [
            calling("ask_reader", { question: "Which group?", choices: ["even", "odd"] }),
            { text: "Even it is.", toolCalls: [] },
            calling("ask_reader", { question: "Which color?", choices: ["red", "blue"] }),
            { text: "Purple it is.", toolCalls: [] },
        ];
        await say("Pick one");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByRole("radio", { name: "even" });
        const field = await screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        assert.strictEqual(field.placeholder, "Or type an answer");

        await say("Even");
        await screen.findByText(/Even it is\./);
        assert.isNull(screen.queryByRole("region", { name: "Waiting for you" }));

        await say("And a color");
        await screen.findByRole("radio", { name: "red" });
        await say("purple");
        await within(log()).findByText(/Purple it is\./);
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

    it("keeps an answered question's sentence in the log", async () => {
        await openOn(3);
        model.turns = [
            calling("ask_reader", { question: "Which group?", choices: ["even", "odd"] }),
            { text: "Odd it is.", toolCalls: [] },
        ];
        await say("Pick one");
        await userEvent.click(await screen.findByRole("radio", { name: "odd" }));
        await userEvent.click(screen.getByRole("button", { name: "Answer" }));
        await within(log()).findByText(/Which group\?/);
        await within(log()).findByText(/Odd it is\./);
    });

    it("shows the reply beside a request while it waits, and reads once after Remove", async () => {
        await openOn(12);
        model.turns = [
            calling("edit_data", { action: "remove_nodes", ids: ids(12) }),
            { text: "Removing them waits for your approval.", toolCalls: [] },
            { text: "Removed all twelve.", toolCalls: [] },
        ];
        model.holdTurn = 2;
        await say("Remove them");
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(log()).findByText("Removing them waits for your approval.");

        // The wait is over once the reader decides: its words go while the decision runs, and after it.
        await userEvent.click(within(section).getByRole("button", { name: "Remove" }));
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        assert.isNull(within(log()).queryByText(/waits for your approval/));

        model.release();
        await within(log()).findByText("Removed all twelve.");
        await within(log()).findByText("Removed 12 nodes");
        assert.isNull(within(log()).queryByText(/waits for your approval/));
    });

    it("asks about the whole graph with 42 selected until Selection is picked, which lasts", async () => {
        const { session } = await openOn(50);
        await session.selection.apply({ ids: ids(42) });
        await say("About everything");
        await screen.findByText("The reply.");
        await finished();

        await pickScope("Selection");
        const cog = screen.getByRole("button", { name: "Options, asking about the selection" });
        assert.isNotNull(cog.parentElement?.querySelector(".mantine-Indicator-indicator"));
        await say("About these");
        await finished();
        await say("Still these");
        await finished();
        await pickScope("Whole graph");
        await screen.findByRole("button", { name: "Options" });
        await say("Everything again");
        await waitFor(() => {
            assert.deepEqual(
                sent.map((options) => options.scope),
                ["graph", "selection", "selection", "graph"],
            );
        });
    });

    it("offers Selection with its count, grayed out while nothing is selected", async () => {
        const { session } = await openOn(50);
        await userEvent.click(await screen.findByRole("button", { name: "Options" }));
        const empty = await screen.findByRole("menuitemradio", { name: "Selection" });
        assert.isTrue(empty.hasAttribute("data-disabled") || empty.hasAttribute("disabled"));
        assert.strictEqual(
            screen.getByRole("menuitemradio", { name: "Whole graph" }).getAttribute("aria-checked"),
            "true",
        );
        await userEvent.keyboard("{Escape}");
        await session.selection.apply({ ids: ids(42) });
        await userEvent.click(screen.getByRole("button", { name: "Options" }));
        const item = await screen.findByRole("menuitemradio", { name: /^Selection/ });
        assert.include(item.textContent, "42");
        assert.isFalse(item.hasAttribute("data-disabled"));
    });

    it("Send again goes with the selection the reader picked", async () => {
        const { session } = await openOn(50);
        await session.selection.apply({ ids: ids(3) });
        await pickScope("Selection");
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("About these");
        await screen.findByRole("alert");
        model.clearError();

        await userEvent.click(within(log()).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
        await waitFor(() => {
            assert.deepEqual(
                sent.map((options) => options.scope),
                ["selection", "selection"],
            );
        });
    });

    it("Send again after Whole graph is picked goes with the graph", async () => {
        const { session } = await openOn(50);
        await session.selection.apply({ ids: ids(3) });
        await pickScope("Selection");
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("About these");
        await screen.findByRole("alert");
        model.clearError();

        await pickScope("Whole graph");
        await userEvent.click(within(log()).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
        await finished();
        assert.deepEqual(
            sent.map((options) => options.scope),
            ["selection", "graph"],
        );
    });

    it("an emptied selection takes the scope back to the whole graph, and a new one does not bring it back", async () => {
        const { session } = await openOn(50);
        await session.selection.apply({ ids: ids(3) });
        await pickScope("Selection");
        Object.defineProperty(model, "name", { value: "google" });
        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("About these");
        await screen.findByRole("alert");
        model.clearError();

        await session.selection.apply({ ids: [] });
        await screen.findByRole("button", { name: "Options" });
        await session.selection.apply({ ids: ids(2) });
        await userEvent.click(within(log()).getByRole("button", { name: "Send again" }));
        await screen.findByText("The reply.");
        await finished();
        assert.deepEqual(
            sent.map((options) => options.scope),
            ["selection", "graph"],
        );
        assert.strictEqual(screen.getByRole("textbox", COMPOSER).getAttribute("placeholder"), "Ask about this graph");
    });

    it("keeps the draft and the whole graph when the selection changes while typing", async () => {
        const { session } = await openOn(5);
        const field = await screen.findByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await userEvent.click(field);
        await userEvent.keyboard("color th");
        await session.selection.apply({ ids: ["n1", "n2"] }, "replace", { cause: "user" });
        await pickScope("Selection");
        await screen.findByRole("button", { name: "Options, asking about the selection" });
        assert.strictEqual(field.value, "color th");
        assert.strictEqual(field.placeholder, "Ask about this selection");
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
        // Only its own words are counted: the status line also says other things meanwhile (Working,
        // once the run has gone a second).
        // Each write is a reading, the same words twice included.
        const said: string[] = [];
        let counted = store.get().announced;
        store.subscribe(() => {
            const { announcement, announced } = store.get();
            if (announced !== counted) {
                counted = announced;
                said.push(announcement);
            }
        });
        model.release();
        const slot = await waitFor(notice);
        await within(slot).findByText("Colored 3 nodes");
        assert.lengthOf(
            said.filter((line) => line === "Colored 3 nodes"),
            1,
            "its words go through the status line once",
        );
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
        await screen.findByRole("region", { name: "Chat" });
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
        writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
        // Autosave on, as the application has it: the reload reopens the same project.
        const store = createWorkspaceStore({ project: { name: "Check", id: 1 }, autosave: true });
        const before = { store, view: render(<Workspace store={store} />) };
        await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        await graph(12);
        await screen.findByRole("textbox", COMPOSER);
        model.turns = [calling("edit_data", { action: "remove_nodes", ids: ids(12) })];
        await say("Remove them");
        await screen.findByRole("region", { name: "Waiting for you" });

        await reload(before);
        if (screen.queryByRole("region", { name: "Assistant" }) === null) {
            await userEvent.click(await screen.findByRole("button", { name: "Assistant" }));
        }
        const section = await screen.findByRole("region", { name: "Waiting for you" });
        await within(section).findByText("Remove 12 nodes?");
    });

    it("says Working on a slow run, then how it ended, and a failure as an alert", async () => {
        const { store } = await openOn(3);
        const said: string[] = [];
        store.subscribe(() => {
            const { announcement } = store.get();
            if (announcement !== "" && said.at(-1) !== announcement) {
                said.push(announcement);
            }
        });
        model.holdTurn = 0;
        await say("Take your time");
        await waitFor(() => {
            assert.include(said, "Working");
        });
        model.release();
        await finished();
        await waitFor(() => {
            assert.strictEqual(said.at(-1), "Answer ready");
        });

        model.setError(Object.assign(new Error("down"), { statusCode: 503 }));
        await say("Again");
        const alert = await screen.findByRole("alert");
        assert.include(alert.textContent, "Nothing changed.");
    });

    it("says a request waits on the reader once, and Working never talks over it", async () => {
        const { store } = await openOn(12);
        const said: string[] = [];
        store.subscribe(() => {
            const { announcement } = store.get();
            if (announcement !== "" && said.at(-1) !== announcement) {
                said.push(announcement);
            }
        });
        model.turns = [calling("edit_data", { action: "remove_nodes", ids: ids(12) }), { text: "Ok.", toolCalls: [] }];
        await say("Remove them");
        await screen.findByRole("region", { name: "Waiting for you" });
        await waitFor(() => {
            assert.strictEqual(said.at(-1), "Waiting for your approval: Remove 12 nodes?");
        });
        assert.lengthOf(
            said.filter((line) => line.startsWith("Waiting")),
            1,
        );
    });

    it("holds Talk's place until the element says speech is heard, so the composer row never moves", async () => {
        fakeSpeech();
        const tag = customElements.get("graphty-element") as unknown as {
            prototype: HTMLElementTagNameMap["graphty-element"];
        };
        const realSupport = tag.prototype.getAiVoiceSupport;
        // Every read waits until the test lets them answer, however early or often the panel asks.
        let answered = false;
        const asked: (() => void)[] = [];
        const answer = (): void => {
            answered = true;
            for (const resolve of asked.splice(0)) {
                resolve();
            }
        };
        vi.spyOn(tag.prototype, "getAiVoiceSupport").mockImplementation(function support(
            this: HTMLElementTagNameMap["graphty-element"],
        ) {
            const held = answered ? Promise.resolve() : new Promise<void>((resolve) => asked.push(resolve));
            return held.then(() => realSupport.call(this));
        });
        await openOn(3);
        const send = await screen.findByRole("button", { name: "Send" });
        const held = await waitFor(() => {
            const found = send.parentElement?.querySelector<HTMLButtonElement>("button[aria-hidden]") ?? null;
            if (found === null) {
                throw new Error("no held place yet");
            }
            return found;
        });
        assert.isNull(screen.queryByRole("button", { name: "Talk" }), "the held place is not a control yet");
        const before = { held: held.getBoundingClientRect(), send: send.getBoundingClientRect() };

        answer();
        const talk = await screen.findByRole("button", { name: "Talk" });
        assert.deepEqual(talk.getBoundingClientRect().toJSON(), before.held.toJSON());
        assert.deepEqual(
            screen.getByRole("button", { name: "Send" }).getBoundingClientRect().toJSON(),
            before.send.toJSON(),
        );
    });

    it("a click on Talk latches, and a click on Stop talking stops with the words in the composer", async () => {
        fakeSpeech();
        await openOn(3, false);
        const talk = await screen.findByRole("button", { name: "Talk" });
        assert.strictEqual(talk.getAttribute("aria-pressed"), "false");
        await userEvent.click(talk);
        const stop = await screen.findByRole("button", { name: "Stop talking" });
        assert.strictEqual(stop.getAttribute("aria-pressed"), "true");
        assert.strictEqual(stop, talk, "one button, so focus stays on it");
        // Its key still shows while it listens: the same key stops.
        await userEvent.unhover(stop);
        await userEvent.hover(stop);
        await waitFor(() => {
            const tips = screen.queryAllByRole("tooltip").map((tip) => tip.textContent);
            assert.isTrue(
                tips.some((tip) => tip.includes("Stop talking") && tip.includes("Space")),
                JSON.stringify(tips),
            );
        });
        await userEvent.unhover(stop);
        await userEvent.click(stop);
        await screen.findByRole("button", { name: "Talk" });
        const field = screen.getByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await waitFor(() => {
            assert.strictEqual(field.value, "color these red");
        });
        assert.strictEqual(model.asked, 0, "nothing was sent");
    });

    it("Stop talking goes back to Talk at once, while what was heard is still being written down", async () => {
        const finish = fakeSpeech(true);
        await openOn(3, false);
        await userEvent.click(await screen.findByRole("button", { name: "Talk" }));
        await userEvent.click(await screen.findByRole("button", { name: "Stop talking" }));
        await screen.findByRole("button", { name: "Talk" });
        finish();
        const field = screen.getByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await waitFor(() => {
            assert.strictEqual(field.value, "color these red");
        });
    });

    it("a press ending while a later one listens leaves Stop talking working", async () => {
        const finish = fakeSpeech(true);
        await openOn(3, false);
        await userEvent.click(await screen.findByRole("button", { name: "Talk" }));
        await userEvent.click(await screen.findByRole("button", { name: "Stop talking" }));
        await userEvent.click(await screen.findByRole("button", { name: "Talk" }));
        await screen.findByRole("button", { name: "Stop talking" });
        let ends = 0;
        document.querySelector("graphty-element")?.addEventListener("ai-voice-end", () => {
            ends++;
        });
        // The first press ends now, under the second.
        finish();
        await waitFor(() => {
            assert.strictEqual(ends, 1);
        });
        await userEvent.click(screen.getByRole("button", { name: "Stop talking" }));
        await screen.findByRole("button", { name: "Talk" });
        finish();
        assert.isTrue(screen.getByRole("button", { name: "Talk" }).isConnected);
    });

    it("a press that heard nothing says so", async () => {
        const finish = fakeSpeech(true);
        vi.stubGlobal(
            "webkitSpeechRecognition",
            class
                extends (globalThis as unknown as { webkitSpeechRecognition: new () => object }).webkitSpeechRecognition
            {
                start(): void {
                    // A recognizer that never hears anything, as headless Chromium's.
                }
            },
        );
        const { store } = await openOn(3);
        const said: string[] = [];
        store.subscribe(() => {
            said.push(store.get().announcement);
        });
        const rowAt = (): DOMRect => screen.getByRole("button", { name: "Send" }).getBoundingClientRect();
        await screen.findByRole("button", { name: "Talk" });
        const before = rowAt();
        await userEvent.click(screen.getByRole("button", { name: "Talk" }));
        await userEvent.click(await screen.findByRole("button", { name: "Stop talking" }));
        finish();
        // The status line says it too, so the drawn line is looked for in the panel.
        await within(screen.getByRole("region", { name: "Assistant" })).findByText("Heard nothing.");
        await screen.findByRole("button", { name: "Talk" });
        assert.deepEqual(rowAt().toJSON(), before.toJSON(), "the line leaves the composer row where it was");
        assert.include(said, "Heard nothing.");
    });

    it("keeps Send's place and width while it is Stop, so Talk never moves", async () => {
        fakeSpeech();
        await openOn(3);
        const talk = await screen.findByRole("button", { name: "Talk" });
        const send = screen.getByRole("button", { name: "Send" });
        const before = { talk: talk.getBoundingClientRect().toJSON(), send: send.getBoundingClientRect().toJSON() };
        model.holdTurn = 0;
        await say("Take your time");
        const stop = await screen.findByRole("button", { name: "Stop" });
        assert.strictEqual(stop, send, "one button, so focus survives the change");
        assert.deepEqual(stop.getBoundingClientRect().toJSON(), before.send);
        assert.deepEqual(screen.getByRole("button", { name: "Talk" }).getBoundingClientRect().toJSON(), before.talk);
        // A release before the model reaches its hold is lost.
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        model.release();
        await finished();
    });

    it("with Send when I stop talking off, Talk lands the words in the composer without sending, and the sent message reads You (spoken)", async () => {
        fakeSpeech();
        await openOn(3, false);
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
        // On screen, a microphone glyph starts the message in place of the words.
        const message = within(log()).getByText("color these red");
        assert.isNotNull(message.querySelector("svg"));
        assert.strictEqual(sent[0].via, "voice");
    });

    it("by default sends what Talk heard when talking ends, as spoken, and leaves the composer empty", async () => {
        fakeSpeech();
        await openOn(3);
        await userEvent.click(await screen.findByRole("button", { name: "Talk" }));
        await userEvent.click(await screen.findByRole("button", { name: "Stop talking" }));
        await screen.findByRole("heading", { name: "You (spoken)" });
        assert.isNotNull(within(log()).getByText("color these red"));
        await finished();
        assert.strictEqual(model.asked, 1, "one message was sent");
        assert.lengthOf(sent, 1);
        assert.strictEqual(sent[0].via, "voice");
        assert.strictEqual(screen.getByRole<HTMLTextAreaElement>("textbox", COMPOSER).value, "");
    });

    it("Send when I stop talking in the options takes effect on the next press, each way", async () => {
        fakeSpeech();
        await openOn(3);
        const toggle = async (checked: boolean): Promise<void> => {
            await userEvent.click(screen.getByRole("button", { name: /^Options/ }));
            const item = await screen.findByRole("menuitemcheckbox", { name: "Send when I stop talking" });
            assert.strictEqual(item.getAttribute("aria-checked"), String(checked));
            await userEvent.click(item);
            await waitFor(() => {
                assert.isNull(screen.queryByRole("menu"));
            });
        };
        const talkOnce = async (): Promise<void> => {
            await userEvent.click(await screen.findByRole("button", { name: "Talk" }));
            await userEvent.click(await screen.findByRole("button", { name: "Stop talking" }));
            await screen.findByRole("button", { name: "Talk" });
        };
        await screen.findByRole("button", { name: "Talk" });
        await toggle(true);
        await talkOnce();
        const field = screen.getByRole<HTMLTextAreaElement>("textbox", COMPOSER);
        await waitFor(() => {
            assert.strictEqual(field.value, "color these red");
        });
        assert.strictEqual(model.asked, 0, "off: the words wait in the composer");

        // Back on: the next press sends what the composer held with what it heard.
        await userEvent.clear(field);
        await toggle(false);
        await talkOnce();
        await screen.findByRole("heading", { name: "You (spoken)" });
        await finished();
        assert.strictEqual(model.asked, 1, "on: the press sent its words");
        assert.strictEqual(field.value, "");
    });
});

/**
 * The conversation.
 * @returns the log.
 */
const log = (): HTMLElement => screen.getByRole("region", { name: "Chat" });

/**
 * Picks what the next message is about in the composer's options.
 * @param name - Whole graph or Selection.
 */
async function pickScope(name: "Whole graph" | "Selection"): Promise<void> {
    await userEvent.click(screen.getByRole("button", { name: /^Options/ }));
    await userEvent.click(await screen.findByRole("menuitemradio", { name: new RegExp(`^${name}`) }));
    await waitFor(() => {
        assert.isNull(screen.queryByRole("menu"));
    });
}

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
