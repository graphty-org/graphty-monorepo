/**
 * @file `camera.pivotOnSelectionCauses`: with the pivot on the selection, a selection made by a
 * cause the consumer leaves out -- a filter condition whose effect is `select`, turned on, off and
 * back -- keeps the camera, so no drawn node moves on screen; a click on a node still moves it.
 */

import "../../src/graphty-element";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { drawnFrames } from "../helpers/drawn-frames";
import { click, rightClick } from "../helpers/real-input";

const WIDTH = 600;
const HEIGHT = 400;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/** A row of nodes; the three "staff" ones sit at one end, far from the middle. */
const NODES = Array.from({ length: 9 }, (_, i) => ({
    id: `n${String(i)}`,
    role: i < 3 ? "staff" : "volunteer",
    position: { x: (i - 4) * 3, y: 0, z: 0 },
}));
const STAFF = ["n0", "n1", "n2"];
const ALL = NODES.map((n) => n.id);
const RULE = { kind: "categories", attribute: "data.role", values: ["staff"] } as const;

/**
 * A mounted element with the pivot on the selection, holding the row at fixed places, drawn.
 * @param causes - `camera.pivotOnSelectionCauses`, or undefined to leave it unset.
 * @returns The element.
 */
async function mounted(causes?: ("user" | "api" | "command" | "history")[]): Promise<Graphty> {
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
    element.layoutBehavior = {
        camera: { pivotOnSelection: true, ...(causes === undefined ? {} : { pivotOnSelectionCauses: causes }) },
    };
    await element.session.data.addNodes(NODES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await drawn(element);
    return element;
}

/**
 * Lets a change reach the screen: queued work, then frames until the picture is still.
 * @param element - The element.
 */
async function drawn(element: Graphty): Promise<void> {
    await operationQueueOf(element.graph).waitForCompletion();
    await drawnFrames(element.graph.getScene(), 2);
    await element.waitForStableFrame();
}

/**
 * Where each listed node is drawn, in CSS pixels.
 * @param element - The element.
 * @param ids - The nodes.
 * @returns One point per node.
 */
function screen(element: Graphty, ids: readonly string[]): { x: number; y: number }[] {
    return ids.map((id) => {
        const at = element.nodeScreenPosition(id);
        assert.isDefined(at, `${id} is drawn`);
        return { x: at.x, y: at.y };
    });
}

/**
 * The farthest any node moved on screen between two readings.
 * @param a - The first reading.
 * @param b - The second.
 * @returns CSS pixels.
 */
function moved(a: readonly { x: number; y: number }[], b: readonly { x: number; y: number }[]): number {
    return Math.max(...a.map((p, i) => Math.hypot(p.x - b[i].x, p.y - b[i].y)));
}

describe("camera.pivotOnSelectionCauses", () => {
    it("a filter's Select, switched to Hide, off and on, twice, never moves a drawn node", async () => {
        const element = await mounted(["user", "api"]);
        const start = screen(element, ALL);
        await element.session.visibility.addCondition({ id: "f", effect: "keep", rule: RULE });
        await drawn(element);

        for (const round of [1, 2]) {
            await element.session.visibility.updateCondition("f", { effect: "select" });
            await drawn(element);
            assert.strictEqual(element.session.selection.nodes.length, 3, "the filter selected the staff");
            assert.isBelow(moved(screen(element, ALL), start), 1, `round ${String(round)}: Select`);

            await element.session.visibility.updateCondition("f", { effect: "keep" });
            await drawn(element);
            assert.isBelow(moved(screen(element, STAFF), start.slice(0, 3)), 1, `round ${String(round)}: Hide`);

            await element.session.visibility.updateCondition("f", { on: false });
            await drawn(element);
            assert.isBelow(moved(screen(element, ALL), start), 1, `round ${String(round)}: off`);

            await element.session.visibility.updateCondition("f", { on: true });
            await drawn(element);
            assert.isBelow(moved(screen(element, STAFF), start.slice(0, 3)), 1, `round ${String(round)}: on`);
        }
    });

    it("a Hide card turned on, off and on, twice, with a node picked, never moves a node it leaves drawn", async () => {
        const element = await mounted(["user", "api"]);
        const shown = ALL.slice(3);
        await element.session.selection.apply({ nodes: ["n6"], edges: [] });
        await drawn(element);
        assert.deepStrictEqual(element.session.selection.nodes, ["n6"]);
        const start = screen(element, shown);
        await element.session.visibility.addCondition({ id: "f", effect: "keep", rule: RULE });
        await drawn(element);
        assert.isBelow(moved(screen(element, shown), start), 1, "first hide");

        for (const round of [1, 2]) {
            await element.session.visibility.updateCondition("f", { on: false });
            await drawn(element);
            assert.isBelow(moved(screen(element, shown), start), 1, `round ${String(round)}: off`);

            await element.session.visibility.updateCondition("f", { on: true });
            await drawn(element);
            assert.isBelow(moved(screen(element, shown), start), 1, `round ${String(round)}: on`);
        }
    });

    it("a click on a node still glides the camera to it", async () => {
        const element = await mounted(["user", "api"]);
        const [edge] = screen(element, ["n0"]);

        await click(element, edge);
        await drawn(element);

        assert.deepStrictEqual(element.session.selection.nodes, ["n0"]);
        const [after] = screen(element, ["n0"]);
        assert.isBelow(Math.abs(after.x - WIDTH / 2), 2, "the clicked node is centered");
    });

    for (const dimension of ["2d", "3d"] as const) {
        it(`${dimension}: a right-click selects the node and moves no drawn node, so a menu at the pointer stays beside it`, async () => {
            const element = await mounted(["user", "api"]);
            await element.session.layout.setDimension(dimension);
            await drawn(element);
            const start = screen(element, ALL);

            await rightClick(element, start[0]);
            await drawn(element);

            assert.deepStrictEqual(element.session.selection.nodes, ["n0"], "the right-click selected n0");
            assert.isBelow(moved(screen(element, ALL), start), 1);
        });
    }

    it("a selection a page makes from its own contextmenu handler keeps the camera too", async () => {
        const element = await mounted();
        const start = screen(element, ALL);
        // As a page that opens its own menu does: select what is under the pointer, by a reader's
        // cause, from the contextmenu event, which Chromium on Linux raises on the press.
        const select = (): void => {
            void element.session.selection.apply({ nodes: ["n0"] }, "replace", { cause: "user" });
        };
        element.parentElement?.addEventListener("contextmenu", select);
        cleanups.push(() => {
            element.parentElement?.removeEventListener("contextmenu", select);
        });

        await rightClick(element, start[0]);
        await drawn(element);

        assert.deepStrictEqual(element.session.selection.nodes, ["n0"], "n0 is selected");
        assert.isBelow(moved(screen(element, ALL), start), 1);

        // A left click afterwards still moves the pivot.
        await click(element, start[8]);
        await drawn(element);
        assert.deepStrictEqual(element.session.selection.nodes, ["n8"]);
        assert.isAbove(moved(screen(element, ALL), start), 10);
    });

    it("a held selection leaves the camera where the selections put it, whichever frame the hold lands on", async () => {
        /**
         * Picks n0 by script (a cause that moves the pivot), lets `frames` frames of the glide run,
         * then lets a filter select the staff (a cause that does not) and draws until still.
         * @param frames - Frames drawn between the pick and the filter.
         * @returns Where the camera ends, and where it was when the filter arrived.
         */
        async function endsAt(frames: number): Promise<{ end: string; held: string }> {
            const element = await mounted(["api"]);
            const { graph } = element;
            // Frames drawn by hand, so the test chooses the frame the hold lands on.
            const pass = (graph as unknown as { updateManager: { update: (ms: number) => void } }).updateManager;
            graph.engine.stopRenderLoop();
            const state = (): string =>
                JSON.stringify(graph.getCameraState(), (_, v: unknown) =>
                    typeof v === "number" ? Math.round(v * 1000) / 1000 : v,
                );

            await element.session.selection.apply({ nodes: ["n0"], edges: [] });
            for (let frame = 0; frame < frames; frame++) {
                pass.update(16);
            }

            const held = state();
            await element.session.visibility.addCondition({ id: "f", effect: "select", rule: RULE });
            assert.deepStrictEqual(element.session.selection.nodes, STAFF, "the filter selected the staff");
            for (let frame = 0; frame < 120; frame++) {
                pass.update(16);
            }

            return { end: state(), held };
        }

        const none = await endsAt(0);
        const start = none.held;
        const one = await endsAt(1);
        const many = await endsAt(240);

        assert.notStrictEqual(one.held, start, "the hold landed after the glide had started");
        assert.notStrictEqual(one.held, many.held, "and before it had finished");
        assert.strictEqual(one.end, many.end, "held on frame 1 or after the glide, the camera ends in one place");
        assert.strictEqual(none.end, many.end, "held before any frame, too");
        assert.notStrictEqual(many.end, start, "and that place is the picked node's, not the start");
    });

    it("unset, a filter's Select moves the pivot as it always has", async () => {
        const element = await mounted();
        const start = screen(element, ALL);
        await element.session.visibility.addCondition({ id: "f", effect: "select", rule: RULE });
        await drawn(element);

        assert.isAbove(moved(screen(element, ALL), start), 10);
    });
});
