/**
 * @file What the element says about a reader's own canvas input, under real input: how a
 * selection was made (`SelectionDelta.via`), when a camera gesture ended (`camera:gesture-end`,
 * once per gesture, ended by the input and never by a timer), and the `"suggestion"` trigger on
 * the style entries `applySuggestedStyles` writes.
 */

import "../../src/graphty-element";
import "../../src/algorithms";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { attachKeymap, type JournalEntry, type SelectionDelta, type SessionEventMap } from "../../session";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, drag, holdKey, nextFrame, type Point, releaseHeldKeys, releaseKey, wheel } from "../helpers/real-input";

const WIDTH = 400;
const HEIGHT = 300;

/** Three nodes at fixed places, so each one's spot on screen is known before any input. */
const NODES = [
    { id: "a", position: { x: -4, y: 0, z: 0 } },
    { id: "b", position: { x: 4, y: 0, z: 0 } },
    { id: "c", position: { x: 0, y: 3, z: 0 } },
];

/** A spot with no node under it. */
const EMPTY: Point = { x: 30, y: HEIGHT - 30 };

type GestureKind = SessionEventMap["camera:gesture-end"]["kind"];

const cleanups: (() => void)[] = [];

afterEach(async () => {
    await releaseHeldKeys();
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * A mounted element holding three nodes at fixed places, drawn.
 * @param viewMode - The view mode.
 * @returns The element.
 */
async function mounted(viewMode: "2d" | "3d"): Promise<Graphty> {
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
    await element.session.data.addNodes(NODES);
    await element.session.data.addEdges([
        { src: "a", dst: "b" },
        { src: "a", dst: "c" },
    ]);
    await element.graph.setLayout("fixed", { dim: 3 });
    await element.setViewMode(viewMode);
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    return element;
}

/**
 * Where a node is drawn, from the element's public API.
 * @param element - The element.
 * @param id - The node.
 * @returns Its center in CSS pixels from the element's top-left corner.
 */
function at(element: Graphty, id: string): Point {
    const position = element.nodeScreenPosition(id);
    assert.isDefined(position, `node ${id} is drawn`);
    return { x: position.x, y: position.y };
}

/**
 * Every selection change the session publishes from now on.
 * @param element - The element.
 * @returns The changes, as they arrive.
 */
function selectionChanges(element: Graphty): SelectionDelta[] {
    const heard: SelectionDelta[] = [];
    cleanups.push(element.session.on("selection:changed", (delta) => heard.push(delta)));
    return heard;
}

/**
 * Every camera gesture end the session publishes from now on, and the next one as a promise.
 * @param element - The element.
 * @returns The kinds heard, and a function that resolves with the next end.
 */
function gestureEnds(element: Graphty): { readonly heard: GestureKind[]; next: () => Promise<GestureKind> } {
    const heard: GestureKind[] = [];
    const waiting: ((kind: GestureKind) => void)[] = [];
    cleanups.push(
        element.session.on("camera:gesture-end", ({ kind }) => {
            heard.push(kind);
            waiting.shift()?.(kind);
        }),
    );
    return {
        heard,
        next: () =>
            new Promise((resolve) => {
                waiting.push(resolve);
            }),
    };
}

/**
 * Wait until the input just given has been read and the picture has come to rest.
 * @param element - The element.
 */
async function settled(element: Graphty): Promise<void> {
    await drawnFrames(element.graph.getScene(), 1);
    await element.waitForStableFrame();
}

describe("SelectionDelta.via", () => {
    it("is click for a click on a node and on empty canvas, and absent for an API call", async () => {
        const element = await mounted("3d");
        const heard = selectionChanges(element);

        await click(element, at(element, "a"));
        await settled(element);
        assert.lengthOf(heard, 1);
        assert.deepInclude(heard[0], { cause: "user", via: "click", nodes: 1 });

        await click(element, EMPTY);
        await settled(element);
        assert.lengthOf(heard, 2);
        assert.deepInclude(heard[1], { cause: "user", via: "click", nodes: 0 });

        await element.session.selection.apply({ nodes: ["b"] }, "replace", { cause: "user" });
        assert.lengthOf(heard, 3);
        assert.isFalse("via" in (heard[2] ?? {}), "an API call made as the reader's");
    });

    it("is keys for Escape through attachKeymap", async () => {
        const element = await mounted("3d");
        cleanups.push(attachKeymap(element.session, document));
        await click(element, at(element, "a"));
        await settled(element);
        const heard = selectionChanges(element);

        await holdKey("Escape");
        await releaseKey("Escape");

        assert.lengthOf(heard, 1);
        assert.deepInclude(heard[0], { cause: "user", via: "keys", nodes: 0 });
    });

    it("is box for a Shift-drag rectangle", async () => {
        const element = await mounted("2d");
        element.layoutBehavior = { selection: { region: "rectangle" } };
        const heard = selectionChanges(element);
        const a = at(element, "a");
        const c = at(element, "c");

        await drag(element, { x: a.x - 20, y: c.y - 20 }, { x: c.x + 20, y: a.y + 20 }, 8, undefined, { shift: true });
        await settled(element);

        assert.lengthOf(heard, 1);
        assert.deepInclude(heard[0], { cause: "user", via: "box" });
        assert.sameMembers(element.session.selection.nodes.map(String), ["a", "c"]);
    });
});

describe("camera:gesture-end", () => {
    it("ends a 3D drag once, at its pointer up, as an orbit", async () => {
        const element = await mounted("3d");
        const ends = gestureEnds(element);
        const ended = ends.next();

        await drag(element, EMPTY, { x: EMPTY.x + 120, y: EMPTY.y - 40 });

        assert.strictEqual(await ended, "orbit");
        await settled(element);
        assert.deepEqual(ends.heard, ["orbit"]);
    });

    it("ends a 2D drag once as a pan, and a click that moved nothing not at all", async () => {
        const element = await mounted("2d");
        const ends = gestureEnds(element);

        await click(element, EMPTY);
        await settled(element);
        assert.deepEqual(ends.heard, [], "a click is no gesture");

        const ended = ends.next();
        await drag(element, EMPTY, { x: EMPTY.x + 60, y: EMPTY.y - 30 });
        assert.strictEqual(await ended, "pan");
        await settled(element);
        assert.deepEqual(ends.heard, ["pan"]);
    });

    for (const viewMode of ["2d", "3d"] as const) {
        it(`ends five wheel events sent together in ${viewMode} as one zoom`, async () => {
            const element = await mounted(viewMode);
            const ends = gestureEnds(element);
            const ended = ends.next();
            const center = { x: WIDTH / 2, y: HEIGHT / 2 };

            await Promise.all(Array.from({ length: 5 }, () => wheel(element, center, -40)));

            assert.strictEqual(await ended, "zoom");
            await settled(element);
            assert.deepEqual(ends.heard, ["zoom"]);
        });
    }

    it("ends wheel runs a frame with no wheel apart as two gestures", async () => {
        const element = await mounted("3d");
        const ends = gestureEnds(element);
        const center = { x: WIDTH / 2, y: HEIGHT / 2 };

        let ended = ends.next();
        await wheel(element, center, -40);
        assert.strictEqual(await ended, "zoom");
        ended = ends.next();
        await nextFrame();
        await wheel(element, center, 40);
        assert.strictEqual(await ended, "zoom");
        await settled(element);
        assert.deepEqual(ends.heard, ["zoom", "zoom"]);
    });

    for (const viewMode of ["2d", "3d"] as const) {
        it(`ends a held camera key in ${viewMode} once, after the key up and the camera at rest`, async () => {
            const element = await mounted(viewMode);
            const ends = gestureEnds(element);
            await click(element, EMPTY);
            await settled(element);
            const ended = ends.next();

            await holdKey("ArrowLeft");
            await drawnFrames(element.graph.getScene(), 3);
            assert.deepEqual(ends.heard, [], "nothing while the key is held");
            await releaseKey("ArrowLeft");

            assert.strictEqual(await ended, viewMode === "3d" ? "orbit" : "pan");
            await settled(element);
            assert.lengthOf(ends.heard, 1);
        });
    }
});

describe("JournalEntry.trigger from applySuggestedStyles", () => {
    it("marks every entry the call writes, the layers and the moves stacking them, as suggestions", async () => {
        const element = await mounted("3d");
        await element.session.runs.start("degree", {}, { style: false });
        const heard: JournalEntry[] = [];
        cleanups.push(element.session.on("journal:appended", ({ entry }) => heard.push(entry)));

        assert.isTrue(element.graph.applySuggestedStyles("degree"));
        await element.waitForStableFrame();

        const styles = heard.filter((entry) => entry.kind === "style");
        assert.isNotEmpty(styles);
        assert.isTrue(styles.every((entry) => entry.trigger === "suggestion"));
    });
});
