/**
 * @file Input recording and playback under real input: a recording made from the browser's own
 * mouse, wheel, keyboard and touch events (test/helpers/real-input.ts) replays as the same input,
 * read through the element's public API -- the `input:*` events and `isPointerDown`.
 *
 * Issue #3002: the recording stored each event's `input:*` detail, which gives a pointer as its
 * position alone, so a recorded right or middle click replayed as a left click, and a touch lost
 * its id.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";
import { userEvent } from "vitest/browser";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { MouseButton } from "../../src/input/types";
import { type Button, click, type Point, touchDrag, wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;
const SPOT: Point = { x: 120, y: 90 };

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted, empty element.
 * @returns The element.
 */
async function mounted(): Promise<Graphty> {
    const element = document.createElement("graphty-element");
    element.style.display = "block";
    element.style.width = `${String(WIDTH)}px`;
    element.style.height = `${String(HEIGHT)}px`;
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Collect every `input:*` event the element emits while `body` runs.
 * @param element - The element.
 * @param body - What to run.
 * @returns Each event's type and detail, in order.
 */
async function inputEvents(element: Graphty, body: () => Promise<unknown>): Promise<unknown[]> {
    const types = [
        "input:pointer-move",
        "input:pointer-down",
        "input:pointer-up",
        "input:wheel",
        "input:touch-start",
        "input:touch-move",
        "input:touch-end",
        "input:key-down",
        "input:key-up",
    ] as const;
    const seen: unknown[] = [];
    const ids = types.map((type) =>
        element.graph.addListener(type, (event) => {
            seen.push(JSON.parse(JSON.stringify(event)));
        }),
    );
    try {
        await body();
    } finally {
        for (const id of ids) {
            element.graph.removeListener(id);
        }
    }
    return seen;
}

describe("input recording", () => {
    it.each([
        ["right", MouseButton.Right],
        ["middle", MouseButton.Middle],
    ] as const)("a recorded %s click replays with the same button", async (name: Button, button) => {
        const element = await mounted();
        const { input } = element.graph;

        element.graph.startInputRecording();
        await click(element, SPOT, undefined, name);
        const recording = element.graph.stopInputRecording();

        const down = recording.find((event) => event.type === "input:pointer-down");
        assert.isDefined(down, "the press was recorded");
        assert.strictEqual(down.data.button, button, "the recording keeps the button");

        const held: boolean[] = [];
        const id = element.graph.addListener("input:pointer-down", () => {
            held.push(input.isPointerDown(button));
        });
        try {
            await input.startPlayback(recording);
        } finally {
            element.graph.removeListener(id);
        }

        assert.deepEqual(held, [true], `the replayed press is the ${name} button`);
    });

    it("a recorded wheel, key and touch sequence replays as the same events", async () => {
        const element = await mounted();
        // A click gives the canvas the keyboard.
        await click(element, SPOT);

        let recording: ReturnType<typeof element.graph.stopInputRecording> = [];
        const live = await inputEvents(element, async () => {
            element.graph.startInputRecording();
            await wheel(element, SPOT, 120, 30);
            await userEvent.keyboard("{Shift>}A{/Shift}b");
            await touchDrag(element, SPOT, { x: SPOT.x + 40, y: SPOT.y + 20 }, 2);
            recording = element.graph.stopInputRecording();
        });
        assert.includeMembers(
            live.map((event) => (event as { type: string }).type),
            ["input:wheel", "input:key-down", "input:key-up", "input:touch-start", "input:touch-end"],
            "the real input reached the element",
        );

        const replayed = await inputEvents(element, () => element.graph.input.startPlayback(recording));

        assert.deepEqual(replayed, live, "playback emits what the real input emitted");
    });
});
