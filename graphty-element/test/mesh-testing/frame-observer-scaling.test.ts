/**
 * @file Counted-work scaling of the per-frame work of labels and edges (issue #2995).
 *
 * A depth-fading label, an animated label, an animated edge line and an edge batch's upload each
 * run something before every frame. Each used to add an observer of its own to the scene, and
 * Babylon's `remove` searches the whole observer list, so creating and disposing n of them cost
 * n x n. They now join a roster per scene (see `FrameRoster`) in constant time, and a frame calls
 * only what is in it. Counted, never timed.
 *
 * Creating and disposing is counted as the observer-list entries Babylon searches, plus one for
 * every observer added and every roster joined. Not every element visited: disposing a mesh, a
 * material or a texture on its own searches Babylon's scene-wide lists of them, a cost of
 * Babylon's that the element avoids by releasing labels and edges together (`LabelBatch`, the
 * edge batches), and which would hide the cost this test is about. One frame is counted as every
 * element visited (`visitsDuring`).
 *
 * Babylon defers the splice of a removed observer to a zero-delay timer, where it searches the
 * list again; the fake timers run those timers inside the counted work, so that search is counted
 * too.
 */
import { NullEngine, type Observable, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it, vi } from "vitest";

import { EdgeMesh } from "../../src/meshes/EdgeMesh";
import { FrameRoster } from "../../src/meshes/FrameRoster";
import { MeshCache } from "../../src/meshes/MeshCache";
import { RichTextLabel } from "../../src/meshes/RichTextLabel";
import { assertScalesLinearly, visitsDuring } from "../helpers/cost";

/** The two sizes: big enough that a quadratic path is 16x. */
const SIZES = [100, 400] as const;

/** The Observable methods that add to or search the observer list. */
const LIST_METHODS = ["add", "remove", "removeCallback", "_remove"] as const;

/**
 * A scene with a camera, so a depth fade has something to measure from.
 * @returns The scene.
 */
function cameraScene(): Scene {
    const scene = new Scene(new NullEngine());
    scene.activeCamera = new UniversalCamera("camera", new Vector3(0, 0, -10), scene);
    return scene;
}

/**
 * A label at a node's place, with or without per-frame work.
 * @param scene - The scene.
 * @param at - Its index, which places and names it.
 * @param busy - Whether it fades with depth and pulses.
 * @returns The label, its animation started.
 */
function label(scene: Scene, at: number, busy: boolean): RichTextLabel {
    const made = RichTextLabel.createLabel(scene, {
        text: `n${String(at)}`,
        position: { x: at, y: 0, z: 0 },
        depthFadeEnabled: busy,
        animation: busy ? "pulse" : "none",
    });
    made.startAnimation();
    return made;
}

/**
 * Count the work of registering and unregistering per-frame callbacks on a scene during `work`:
 * one for every observer added and every roster joined, and the length of the observer list at
 * every search of it.
 * @param scene - The scene.
 * @param work - The work.
 * @returns The count.
 */
function registrationWorkDuring(scene: Scene, work: () => void): number {
    let counted = 0;
    const observable = scene.onBeforeRenderObservable as unknown as Observable<Scene> &
        Record<(typeof LIST_METHODS)[number], (...args: unknown[]) => unknown>;
    for (const name of LIST_METHODS) {
        const original = observable[name];
        observable[name] = function (this: unknown, ...args: unknown[]) {
            counted += name === "add" ? 1 : observable.observers.length;
            return original.apply(this, args);
        };
    }

    const roster = FrameRoster.prototype as unknown as Record<"join", (...args: unknown[]) => unknown>;
    const { join } = roster;
    roster.join = function (this: unknown, ...args: unknown[]) {
        counted++;
        return join.apply(this, args);
    };
    try {
        work();
    } finally {
        roster.join = join;
        for (const name of LIST_METHODS) {
            // The instance's own wrapper goes; the prototype's method shows through again.
            Reflect.deleteProperty(observable, name);
        }
    }

    return counted;
}

describe("per-frame work of labels and edges grows no faster than the graph", () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("creating and disposing n depth-fading, animated labels and animated edge lines is linear", async () => {
        await assertScalesLinearly(
            (size) => {
                const scene = cameraScene();
                const cache = new MeshCache();
                const counted = registrationWorkDuring(scene, () => {
                    const labels = Array.from({ length: size }, (_, at) => label(scene, at, true));
                    const edges = Array.from({ length: size }, (_, at) =>
                        EdgeMesh.lineBatch(
                            cache,
                            { styleId: `animated-${String(at)}`, width: 0.25, color: "#ff0000" },
                            { line: { width: 0.25, color: "#ff0000", animationSpeed: 0.1 } },
                            scene,
                        ),
                    );
                    assert.strictEqual(edges.filter((batch) => batch !== null).length, size, "every edge drew a line");
                    for (const made of labels) {
                        made.dispose();
                    }

                    for (const batch of edges) {
                        batch?.dispose();
                    }

                    // Babylon's deferred splices of removed observers.
                    vi.runOnlyPendingTimers();
                });
                scene.dispose();
                return counted;
            },
            {
                sizes: SIZES,
                counter: "observers added, rosters joined and observer-list entries searched for n labels and n edges",
            },
        );
    });

    it("one frame does the same work however many labels have nothing to do each frame", async () => {
        await assertScalesLinearly(
            async (size) => {
                const scene = cameraScene();
                for (let at = 0; at < size; at++) {
                    label(scene, at, false);
                }

                // One label that does fade and pulse, so the frame has work to count. Its first
                // frame takes its material off full opacity, which Babylon answers by marking
                // every mesh in the scene; that happens once, so it is left out of the count.
                const busy = label(scene, 0, true);
                scene.onBeforeRenderObservable.notifyObservers(scene);
                const before = busy.labelMesh?.scaling.x;
                const visits = await visitsDuring(() => {
                    scene.onBeforeRenderObservable.notifyObservers(scene);
                });
                assert.notStrictEqual(busy.labelMesh?.scaling.x, before, "the frame pulsed the busy label");
                scene.dispose();
                return visits;
            },
            { sizes: SIZES, growth: "constant", counter: "elements visited by one frame" },
        );
    });
});
