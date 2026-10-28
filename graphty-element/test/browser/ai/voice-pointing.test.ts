/**
 * @file Pointing while talking, for real: with talk held by Space on a talk button, or by the
 * element's own `voice.holdKey` on the focused graph, the real mouse moves over two nodes, and the
 * message the utterance sends is saved with both ids, in the order they were pointed at, in its
 * facts part. The recognizer is a fake that hears a fixed sentence; the
 * microphone is Chromium's fake device (vitest.config.ts).
 */

import "../../../src/graphty-element";

import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { FakeRecognition } from "../../helpers/fake-speech";
import { click, hover, type Point } from "../../helpers/real-input";

const HEARD = "color these red";

let element: Graphty;
let talk: HTMLButtonElement;
let recognizers: FakeRecognition[];
let finished: number;
let hovered: string[];

beforeEach(async () => {
    recognizers = [];
    vi.stubGlobal("SpeechRecognition", undefined);
    vi.stubGlobal(
        "webkitSpeechRecognition",
        class extends FakeRecognition {
            constructor() {
                super(false, recognizers);
            }

            override start(): void {
                super.start();
                queueMicrotask(() => {
                    this.hear(HEARD, true);
                });
            }
        },
    );

    element = document.createElement("graphty-element");
    element.style.cssText = "display:block;width:400px;height:300px";
    document.body.appendChild(element);
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.session.data.addNodes([
        { id: "a", position: { x: -4, y: 0, z: 0 } },
        { id: "b", position: { x: 4, y: 0, z: 0 } },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode("2d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.enableAiControl({ provider: "mock", voice: {}, history: "memory" });
    finished = 0;
    hovered = [];
    element.addEventListener("graphty-node-hover", (event) => {
        hovered.push(String(event.detail.nodeId));
    });
    for (const type of ["ai-command-complete", "ai-command-error"]) {
        element.addEventListener(type, () => {
            finished++;
        });
    }

    // The guide's talk button, held here by Space while the mouse points.
    talk = document.createElement("button");
    talk.textContent = "Talk";
    talk.onkeydown = (event) => {
        if (event.key === " " && !event.repeat) {
            element.aiTalk(true);
        }
    };
    talk.onkeyup = (event) => {
        if (event.key === " ") {
            element.aiTalk(false);
        }
    };
    document.body.appendChild(talk);
});

afterEach(() => {
    element.disableAiControl();
    element.remove();
    talk.remove();
    vi.unstubAllGlobals();
});

/**
 * Where a node is drawn, from the element's public API.
 * @param id - The node.
 * @returns Its centre in CSS pixels from the element's top-left corner.
 */
function at(id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    assert.isTrue(position.visible, `node ${id} is on screen`);
    return { x: position.x, y: position.y };
}

/**
 * Move the real mouse to a point and, on a node, wait until the element reports the pointer on it.
 * @param point - Where.
 * @param node - The node drawn there, if any.
 */
async function moveTo(point: Point, node?: string): Promise<void> {
    const seen = hovered.length;
    await hover(element, point);
    if (node !== undefined) {
        await vi.waitFor(() => {
            assert.include(hovered.slice(seen), node, `the pointer reached node ${node}`);
        });
    }
}

describe("pointing while talk is held", () => {
    it("saves the nodes the mouse moved over, in order, in the message's facts part", async () => {
        await moveTo({ x: 200, y: 280 });
        talk.focus();
        await userEvent.keyboard("[Space>]");
        await vi.waitFor(() => {
            assert.lengthOf(recognizers, 1, "a recognizer started");
        });
        await moveTo(at("b"), "b");
        await moveTo({ x: 200, y: 280 });
        await moveTo(at("a"), "a");
        await userEvent.keyboard("[/Space]");
        await vi.waitFor(() => {
            assert.strictEqual(finished, 1, "the spoken message ended");
        });

        const id = element.getAiConversation()?.id;
        assert.isDefined(id);
        const saved = await element.exportAiConversation(id);
        assert.isNotNull(saved);
        const facts = (JSON.parse(saved) as { messages: { parts?: { origin?: string; text?: string }[] }[] }).messages
            .flatMap((message) => message.parts ?? [])
            .filter((part) => part.origin === "graph-data")
            .map((part) => part.text ?? "");
        assert.lengthOf(facts, 1, "one facts part, on the spoken message");
        assert.include(facts[0].split("\n"), 'Pointed at, in order: "b", "a".');
    });

    it("voice.holdKey: a key held on the focused graph talks while the mouse points", async () => {
        await element.enableAiControl({ provider: "mock", voice: { holdKey: "v" }, history: "memory" });
        // One real click on empty canvas focuses the graph.
        await click(element, { x: 200, y: 280 });
        await userEvent.keyboard("{v>}");
        await vi.waitFor(() => {
            assert.lengthOf(recognizers, 1, "the key started a recognizer");
        });
        await moveTo(at("a"), "a");
        await moveTo({ x: 200, y: 280 });
        await moveTo(at("b"), "b");
        await userEvent.keyboard("{/v}");
        await vi.waitFor(() => {
            assert.strictEqual(finished, 1, "the spoken message ended");
        });

        assert.deepStrictEqual(await savedFacts(), ['Pointed at, in order: "a", "b".']);
    });
});

/**
 * The pointing lines saved with the open conversation.
 * @returns Each "Pointed at" line of its facts parts.
 */
async function savedFacts(): Promise<string[]> {
    const id = element.getAiConversation()?.id;
    assert.isDefined(id);
    const saved = await element.exportAiConversation(id);
    assert.isNotNull(saved);
    return (JSON.parse(saved) as { messages: { parts?: { origin?: string; text?: string }[] }[] }).messages
        .flatMap((message) => message.parts ?? [])
        .filter((part) => part.origin === "graph-data")
        .flatMap((part) => (part.text ?? "").split("\n"))
        .filter((line) => line.startsWith("Pointed at"));
}
