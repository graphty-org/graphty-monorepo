/**
 * A reply's steps, on the REAL graphty-element with its mock provider, by real clicks and keys: one
 * group per reply that opens like a disclosure, each step the model's own words that opens to what
 * it asked for and what came of it, the working dots last while a reply runs, and Copy chat
 * carrying every call exactly as it ran.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { type AiManagerConfig, MockLlmProvider } from "@graphty/graphty-element/ai";
import type { GraphSession } from "@graphty/graphty-element/session";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { loadSiteConfig, resetSiteConfig } from "../../../siteConfig";
import { render, screen, waitFor, within } from "../../../test/test-utils";
import { writeAssistantChoice } from "../../assistant-door/provider";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

declare module "vitest/browser" {
    interface BrowserCommands {
        grantClipboard: () => Promise<void>;
    }
}

/** The experiment on, as a site.json that lists it. */
const SITE = `data:application/json,${encodeURIComponent(JSON.stringify({ features: ["assistant"] }))}`;

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

/** Every enable reaches the scripted model instead of the network. */
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
    });
}

/**
 * The workspace with three nodes and the panel open on the mock provider.
 * @returns the element's session.
 */
async function openWithNodes(): Promise<GraphSession> {
    writeAssistantChoice({ provider: "mock", model: "mock", remember: false });
    render(<Workspace store={createWorkspaceStore({ project: { name: "Steps", id: 1 } })} />);
    await screen.findByRole("button", { name: "Assistant" });
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
    await userEvent.click(screen.getByRole("button", { name: "Assistant" }));
    await screen.findByRole("region", { name: "Assistant" });
    return session;
}

/**
 * Types a message and sends it with Enter.
 * @param text - the message.
 */
async function say(text: string): Promise<void> {
    await userEvent.click(await screen.findByRole("textbox", { name: "Message the assistant" }));
    await userEvent.keyboard(`${text}{Enter}`);
}

/** A style call and a look-up, each with the model's own words, then the answer. */
const COLOR_EVEN: Awaited<ReturnType<Generate>>[] = [
    {
        text: "",
        toolCalls: [
            {
                id: "c1",
                name: "catalog",
                arguments: { action: "search", text: "color", intent: "Checking the color channels" },
            },
            {
                id: "c2",
                name: "style",
                arguments: {
                    action: "add",
                    name: "Even ones",
                    where: "data.group == 'even'",
                    values: { "node.color": "#ff0000" },
                    intent: "Coloring the even nodes",
                },
            },
        ],
    },
    { text: "Colored them.", toolCalls: [] },
];

describe("a reply's steps", () => {
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

    it("opens the group, then a step, to what it asked for and what came of it", async () => {
        await openWithNodes();
        model.turns = COLOR_EVEN;
        await say("Color the even ones");
        await screen.findByText("Colored them.");

        // One group, closed once the reply ends; the look-up is not counted.
        const group = await screen.findByRole("button", { name: "1 step" });
        assert.strictEqual(group.getAttribute("aria-expanded"), "false");
        assert.isNull(screen.queryByRole("button", { name: "Steps" }), "no separate Steps icon");
        await userEvent.click(group);
        assert.strictEqual(group.getAttribute("aria-expanded"), "true");

        // Each step is the model's own words, and opens by Enter and closes by Space.
        const lookup = await screen.findByRole("button", { name: "Checking the color channels" });
        const step = screen.getByRole("button", { name: "Coloring the even nodes" });
        assert.notStrictEqual(
            getComputedStyle(lookup.querySelector("span")!).color,
            getComputedStyle(step.querySelector("span")!).color,
            "a look-up is lighter",
        );
        assert.strictEqual(step.getAttribute("aria-expanded"), "false");
        step.focus();
        await userEvent.keyboard("{Enter}");
        assert.strictEqual(step.getAttribute("aria-expanded"), "true");
        const item = step.closest<HTMLElement>("li");
        assert.isNotNull(item);
        await within(item).findByText("Asked for");
        within(item).getByText("Name: Even ones");
        within(item).getByText(/^Which: group even$/i);
        within(item).getByText("Set: color red");
        within(item).getByText("Result");
        within(item).getByText(/^Colored 2 nodes with group even, in Even ones$/i);
        // No JSON, no internal ids, no hex, no timing, no zero counts.
        const said = item.textContent;
        for (const geeky of ["{", "#ff0000", "ms", "hidden 0", "data.group", "layer"]) {
            assert.notInclude(said.toLowerCase(), geeky, geeky);
        }
        // The step's words select for copying.
        assert.strictEqual(getComputedStyle(step).userSelect, "text");
        await userEvent.keyboard(" ");
        assert.strictEqual(step.getAttribute("aria-expanded"), "false");
        assert.isNull(within(item).queryByText("Asked for"));
    });

    it("puts the working dots last while a reply runs, with its steps open above them", async () => {
        await openWithNodes();
        model.turns = COLOR_EVEN;
        model.holdTurn = 1;
        await say("Color the even ones");
        await waitFor(() => {
            assert.isTrue(model.held);
        });
        const dots = await screen.findByRole("img", { name: "Sending to Mock" });
        const group = await screen.findByRole("button", { name: /step/ });
        assert.strictEqual(group.getAttribute("aria-expanded"), "true", "open while it runs");
        await screen.findByText("Coloring the even nodes");
        const log = screen.getByRole("region", { name: "Chat" });
        const all = [...log.querySelectorAll<HTMLElement>("*")];
        const after = all.slice(all.indexOf(dots) + 1).filter((each) => !dots.contains(each));
        assert.deepEqual(
            after.map((each) => each.outerHTML),
            [],
            "nothing after the dots",
        );
        assert.isBelow(group.getBoundingClientRect().bottom, dots.getBoundingClientRect().top + 1, "steps above");
        model.release();
        await screen.findByText("Colored them.");
        await screen.findByRole("button", { name: "Send" });
        assert.isNull(screen.queryByRole("img", { name: "Sending to Mock" }));
    });

    it("copies each step as the panel says it, and every call as it ran under For support", async () => {
        await commands.grantClipboard();
        await openWithNodes();
        model.turns = COLOR_EVEN;
        await say("Color the even ones");
        await screen.findByText("Colored them.");
        await userEvent.click(screen.getByRole("button", { name: "Copy chat" }));
        await screen.findAllByText("Chat copied");
        const text = await navigator.clipboard.readText();
        assert.match(text, /\nSteps:\n1\. Checking the color channels\n/);
        assert.match(
            text,
            /\n2\. Coloring the even nodes\n {3}- Asked for: Name: Even ones; Set: color red; Which: group even\n/i,
        );
        assert.match(text, /\n {3}- Result: Colored 2 nodes with group even, in Even ones\n/i);
        assert.include(text, "\nFor support:\n");
        assert.include(text, '\n2. style {"action":"add","intent":"Coloring the even nodes","name":"Even ones",');
        assert.match(text, /\n {3}-> AI_COMPLETED \{.*\} \[\{"code":"AI_EFFECT_STYLE"/);
        assert.match(text, /^[\n -~]*$/, "plain ASCII");
    });
});
