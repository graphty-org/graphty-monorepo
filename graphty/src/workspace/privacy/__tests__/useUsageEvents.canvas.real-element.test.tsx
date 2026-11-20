/**
 * Usage counts from the reader's own hands on the REAL graphty-element (design/graphty/usage-analytics.md,
 * section 4.2): a click and a box on the canvas, a node drag, an orbit drag and a run of wheel
 * events, Fit from the Camera menu, a command run from Quick actions by keys, and a note typed with
 * keys. PostHog is on with a recording stand-in whose captures pass through `cleanPostHogEvent`;
 * each case waits on the event that proves its work finished and checks that nothing the reader
 * wrote or the graph holds was sent.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { afterEach, assert, beforeEach, describe, it } from "vitest";
import { cdp, page, userEvent } from "vitest/browser";

import {
    onUsageEvent,
    resetAnalyticsForTests,
    setAnalyticsCallsForTests,
    setPostHogClientForTests,
    startPageCounts,
} from "../../../lib/analytics";
import { withFeatures } from "../../../test/features";
import { openSampleFromStart } from "../../../test/open";
import { dragAcross } from "../../../test/real-pointer";
import { screen, waitFor } from "../../../test/test-utils";
import { TEST_ANALYTICS } from "../../../test/usage-recorders";
import { clearRecent } from "../../project/recent";

/** What reached the PostHog stand-in, after cleaning. */
const posthog: { event: string; properties: Record<string, unknown> }[] = [];
let undoPostHog: () => void = () => undefined;

/**
 * The properties of every PostHog event of a name.
 * @param name - the event name.
 * @returns them, in order.
 */
function captured(name: string): Record<string, unknown>[] {
    return posthog.filter((each) => each.event === name).map((each) => each.properties);
}

/**
 * Only the event's own keys of each capture, without the super properties every event carries.
 * @param name - the event name.
 * @param keys - its own keys.
 * @returns them, in order.
 */
function own(name: string, ...keys: string[]): Record<string, unknown>[] {
    return captured(name).map((props) => Object.fromEntries(keys.map((key) => [key, props[key]])));
}

/**
 * Settles at the next usage event of a name, with its properties. No deadline of its own.
 * @param name - the event name.
 * @returns its properties.
 */
function next(name: string): Promise<Readonly<Record<string, unknown>>> {
    return new Promise((resolve) => {
        const off = onUsageEvent((each, props) => {
            if (each === name) {
                off();
                resolve(props);
            }
        });
    });
}

/** The project's element. */
type Element = HTMLElementTagNameMap["graphty-element"];

/**
 * Les Miserables opened from the start screen, its layout at rest and its frame drawn.
 * @returns the project's element.
 */
async function openedAtRest(): Promise<Element> {
    await openSampleFromStart("Les Miserables");
    const element = document.querySelector<Element>("graphty-element:not([data-start-page])");
    if (element === null) {
        throw new Error("no project element");
    }
    await element.waitForSettled();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn, from the element's top left corner.
 * @param element - the element.
 * @param index - which node, in the data's order.
 * @returns its id and its point.
 */
async function nodeAt(element: Element, index: number): Promise<{ id: string | number; x: number; y: number }> {
    const { id } = element.session.data.nodes()[index];
    return waitFor(() => {
        const position = element.nodeScreenPosition(id);
        assert.isTrue(position?.visible, "the node is drawn on screen");
        return { id, x: position?.x ?? 0, y: position?.y ?? 0 };
    });
}

/** A protocol command and its parameters. */
type Send = (method: string, params?: Record<string, unknown>) => Promise<unknown>;

/**
 * A point of an element in the top page's viewport, where the protocol's input lands (the test
 * page runs in an iframe, possibly scaled).
 * @param element - the element.
 * @param at - the point from its top left corner.
 * @param at.x - its x.
 * @param at.y - its y.
 * @returns the point.
 */
function topPoint(element: Element, at: { x: number; y: number }): { x: number; y: number } {
    const rect = element.getBoundingClientRect();
    const frame = globalThis.frameElement;
    const box = frame?.getBoundingClientRect();
    const scale = box === undefined ? 1 : box.width / window.innerWidth;
    return {
        x: (box?.left ?? 0) + ((frame?.clientLeft ?? 0) + rect.left + at.x) * scale,
        y: (box?.top ?? 0) + ((frame?.clientTop ?? 0) + rect.top + at.y) * scale,
    };
}

/** The protocol's modifier bit for Shift. */
const SHIFT = 8;

/**
 * Holds Shift and drags the mouse from one point of an element to another, as a reader draws a box.
 * @param element - the element.
 * @param from - the press, from its top left corner.
 * @param from.x - its x.
 * @param from.y - its y.
 * @param to - the release.
 * @param to.x - its x.
 * @param to.y - its y.
 */
async function shiftDrag(
    element: Element,
    from: { x: number; y: number },
    to: { x: number; y: number },
): Promise<void> {
    const send = (cdp() as unknown as { send: Send }).send.bind(cdp());
    const start = topPoint(element, from);
    const end = topPoint(element, to);
    await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Shift", code: "ShiftLeft", modifiers: SHIFT });
    await send("Input.dispatchMouseEvent", { type: "mouseMoved", ...start, modifiers: SHIFT });
    await send("Input.dispatchMouseEvent", {
        type: "mousePressed",
        ...start,
        button: "left",
        buttons: 1,
        clickCount: 1,
        modifiers: SHIFT,
    });
    const steps = 10;
    for (let step = 1; step <= steps; step++) {
        await send("Input.dispatchMouseEvent", {
            type: "mouseMoved",
            x: start.x + ((end.x - start.x) * step) / steps,
            y: start.y + ((end.y - start.y) * step) / steps,
            button: "left",
            buttons: 1,
            modifiers: SHIFT,
        });
    }
    await send("Input.dispatchMouseEvent", {
        type: "mouseReleased",
        ...end,
        button: "left",
        buttons: 0,
        clickCount: 1,
        modifiers: SHIFT,
    });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Shift", code: "ShiftLeft" });
}

/**
 * Turns the wheel several notches over the middle of an element in one burst, as a reader's
 * flick does: every notch is handed to the browser before any is answered.
 * @param element - what the pointer is over.
 * @param notches - how many wheel events.
 */
async function wheelRun(element: Element, notches: number): Promise<void> {
    const session = cdp() as unknown as { send: Send };
    const rect = element.getBoundingClientRect();
    const at = topPoint(element, { x: rect.width / 2, y: rect.height / 2 });
    await Promise.all(
        Array.from({ length: notches }, () =>
            session.send("Input.dispatchMouseEvent", { type: "mouseWheel", ...at, deltaX: 0, deltaY: -60 }),
        ),
    );
}

// The usage-analytics experiment on, in both test configurations: these counts are its own.
withFeatures(["usage-analytics"]);

describe("usage counts from the reader's hands on the canvas", () => {
    beforeEach(async () => {
        await page.viewport(1440, 900);
        resetAnalyticsForTests();
        posthog.length = 0;
        setAnalyticsCallsForTests({
            hostname: () => "graphty.app",
            privacySignals: () => ({ dnt: false, gpc: false }),
        });
        startPageCounts({
            site: "production",
            features: [],
            analytics: TEST_ANALYTICS,
        });
        undoPostHog = setPostHogClientForTests({
            capture: (event, properties) => {
                posthog.push({ event, properties: { ...properties } });
                return undefined;
            },
        });
    });

    afterEach(async () => {
        await clearRecent();
        undoPostHog();
        resetAnalyticsForTests();
        setAnalyticsCallsForTests();
        localStorage.removeItem("graphty.visits.v1");
    });

    it("counts a click and a box on the canvas, one node drag, one orbit, one zoom per zoom gesture and Fit", async () => {
        const element = await openedAtRest();
        const node = await nodeAt(element, 0);

        const clicked = next("canvas_selected");
        await userEvent.click(element, { position: { x: node.x, y: node.y } });
        assert.deepEqual({ ...(await clicked) }, { target: "node", count: "1", via: "click" });

        // A box: Shift and a drag from an empty corner past another node, which it adds to the
        // selection, once the element's view preference turns the rectangle on. The app has no
        // control for selection.region yet, so no reader reaches box select today; the rest of
        // the app's layoutBehavior is kept.
        // eslint-disable-next-line graphty/no-element-mutation -- selection.region is a view preference the element never journals, not a project change
        element.layoutBehavior = { ...element.layoutBehavior, selection: { region: "rectangle" } };
        // Measured once the camera has finished gliding to the clicked node (Follow selection).
        await element.waitForStableFrame();
        const other = await nodeAt(element, 1);
        const boxed = next("canvas_selected");
        await shiftDrag(element, { x: 8, y: 8 }, { x: other.x + 10, y: other.y + 10 });
        const box = await boxed;
        assert.strictEqual(box.via, "box");
        assert.strictEqual(box.target, "node");

        // Where the node is once the camera has glided to the new selection.
        await element.waitForStableFrame();
        const held = await nodeAt(element, 0);
        const dragged = next("nodes_dragged");
        await dragAcross(element, 60, { x: held.x, y: held.y });
        await dragged;

        const orbited = next("camera_used");
        await dragAcross(element, 80, { x: 8, y: 8 });
        assert.deepEqual({ ...(await orbited) }, { kind: "orbit" });

        // How many zoom gestures the element saw in the wheel run: a frame falling between two
        // notches can make it two, so the count is checked per gesture, not as exactly one. The
        // listener stays on to the end: a stable frame says nothing about a reader's gesture, so a
        // second run's end can come after it, and this listener and the app's hear it together.
        let zooms = 0;
        const offZoom = element.session.on("camera:gesture-end", ({ kind }) => {
            if (kind === "zoom") {
                zooms++;
            }
        });
        const zoomed = next("camera_used");
        await wheelRun(element, 5);
        assert.deepEqual({ ...(await zoomed) }, { kind: "zoom" });
        await element.waitForStableFrame();

        // The Camera button is a command of its own (view.camera); Fit is the row it opens.
        await userEvent.click(screen.getByRole("button", { name: /^Camera/ }));
        const row = await screen.findByRole("menuitem", { name: /^Fit(?! selection)/ });
        const fit = next("command_run");
        await userEvent.click(row);
        assert.strictEqual((await fit).command, "view.fit");
        // Fit's own animation is not the reader's gesture: it sends no camera_used at all.
        await element.waitForStableFrame();
        offZoom();
        assert.isAtMost(zooms, 5, "no more zoom gestures than notches");

        assert.deepEqual(
            own("command_run", "command").map((each) => each.command),
            ["view.camera", "view.fit"],
        );
        assert.lengthOf(captured("nodes_dragged"), 1, "one drag, one event");
        assert.deepEqual(own("camera_used", "kind"), [
            { kind: "orbit" },
            ...Array.from({ length: zooms }, () => ({ kind: "zoom" })),
        ]);
        assert.deepEqual(own("canvas_selected", "via"), [{ via: "click" }, { via: "box" }]);
        for (const { id } of [node, other]) {
            assert.notInclude(JSON.stringify(posthog), String(id));
        }
    });

    it("counts a command run from Quick actions by keys by its id, never its label", async () => {
        await openedAtRest();
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("{Control>}k{/Control}");
        const field = await screen.findByPlaceholderText("Search commands");
        await userEvent.type(field, "Legend");
        await screen.findByRole("option", { name: /^Legend\b/ });
        const ran = next("command_run");
        await userEvent.keyboard("{Enter}");
        assert.deepEqual({ ...(await ran) }, { command: "view.legend" });
        const commands = own("command_run", "command").map((each) => each.command);
        assert.deepEqual(commands, ["quick-actions.open", "view.legend"]);
        // The label the reader typed and chose is in no capture.
        assert.notInclude(JSON.stringify(posthog), "Legend");
    });

    it("counts a note typed with keys as note.add, and its text nowhere", async () => {
        await openedAtRest();
        (document.activeElement as HTMLElement | null)?.blur();
        await userEvent.keyboard("n");
        const field = await screen.findByRole("textbox", { name: "Note" });
        await waitFor(() => {
            assert.strictEqual(document.activeElement, field);
        });
        const added = next("graph_action");
        await userEvent.keyboard("SECRET_NOTE_WORDS about Valjean{Control>}{Enter}{/Control}");
        const action = await added;
        assert.strictEqual(action.op, "note.add");
        await screen.findByRole("list", { name: "Notes" });
        assert.deepEqual(
            own("graph_action", "op").filter((each) => each.op === "note.add"),
            [{ op: "note.add" }],
        );
        const all = JSON.stringify(posthog);
        assert.notInclude(all, "SECRET_NOTE_WORDS");
        assert.notInclude(all, "Valjean");
    });
});
