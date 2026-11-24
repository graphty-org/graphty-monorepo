/**
 * WebXR pointing, selection and drag on both render paths, in a real immersive session on an
 * emulated Meta Quest 3 (IWER).
 *
 * On the batched path a node row has no mesh: the element puts a stand-in under Babylon's laser
 * and picks rays against the rows. These checks hold that path to what the objects path does with
 * one mesh per node, on a graph that stays lazy (disjoint pairs and a triangle, directed and
 * undirected edges, loaded after the first frame), so the batched cases test rows and not object
 * rows built on the side.
 *
 * The laser is read after a counted number of drawn frames, never inside `vi.waitFor`, which would
 * wait until the hang guard when it lands on an edge or on nothing. XR has no hover on either path:
 * the checks assert that, and leave the feature to its own issue.
 *
 * Part of the `xr` project, which runs in the pull request browser shards (about a second a case):
 * `npx vitest run --project=xr test/interactions/xr/xr-batched-rows.test.ts` in graphty-element.
 * With it: `test/browser/node-batch-xr.test.ts` (whole frames across paths, with edges, the path set
 * before and after the load), and the batched cases of `xr-voice.test.ts` and `xr-menu.test.ts`.
 */
import "../../../src/graphty-element";

import { Vector3 } from "@babylonjs/core";
import { afterEach, assert, beforeEach, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { operationQueueOf } from "../../../src/Graph";
import { dataManagerInternals } from "../../../src/managers/DataManager";
import { drawnFrames } from "../../helpers/drawn-frames";
import { installIWER, type IWERHandle } from "../helpers/iwer-setup";
import {
    differing,
    frameNow,
    type Handedness,
    inEye,
    inkNear,
    laserHit,
    laserRay,
    offRay,
    wholeFrame,
    type XRFrame,
} from "../helpers/xr-frames";
import { createXRInputDriver, type XRInputDriver } from "../helpers/xr-input-driver";

type Path = "objects" | "batched";
const PATHS: readonly Path[] = ["objects", "batched"];

/** How far in front of the headset the rows stand, along the scene's +z. */
const DEPTH = 4;
/** The height of the controllers and of the row each points at. */
const EYE = 1.1;

/**
 * Where each controller stands; each points straight ahead, at the row in front of it. A hand's
 * length in front of the eyes: Babylon projects the controller onto the screen for its pointer
 * events, and one in the plane of the eyes projects to an infinite point that throws in the frame.
 */
const AIM: Record<Handedness, { x: number; y: number; z: number }> = {
    left: { x: -1, y: EYE, z: 0.3 },
    right: { x: 1, y: EYE, z: 0.3 },
};

/** Disjoint pairs and a triangle, so a built Node builds only its own component. */
const NODES: { id: string; x: number; y: number }[] = [
    { id: "l", x: -1, y: EYE },
    { id: "l2", x: -3, y: EYE },
    { id: "r", x: 1, y: EYE },
    { id: "r2", x: 3, y: EYE },
    { id: "t0", x: -1, y: EYE + 2 },
    { id: "t1", x: 1, y: EYE + 2 },
    { id: "t2", x: 0, y: EYE + 3 },
    { id: "b0", x: -1, y: EYE - 2 },
    { id: "b1", x: 1, y: EYE - 2 },
];
const EDGES: { source: string; target: string; directed?: false }[] = [
    { source: "l", target: "l2", directed: false },
    { source: "r", target: "r2" },
    { source: "t0", target: "t1" },
    { source: "t1", target: "t2", directed: false },
    { source: "t2", target: "t0", directed: false },
    { source: "b0", target: "b1", directed: false },
];

/** The edge ink, magenta, against blue nodes and the gray background. */
const EDGE_COLOR = "#ff00ff";
const isEdgeInk = (p: readonly number[]): boolean => (p[0] ?? 0) > 120 && (p[1] ?? 0) < 110 && (p[2] ?? 0) > 120;

let iwer: IWERHandle | undefined;
let element: Graphty | undefined;
let driver: XRInputDriver | undefined;

beforeEach(() => {
    iwer = undefined;
    element = undefined;
    driver = undefined;
});

afterEach(async () => {
    if (driver !== undefined) {
        await driver.dispose();
    } else {
        element?.remove();
        iwer?.uninstall();
    }
});

/** The element under test. */
function el(): Graphty {
    assert.exists(element, "no element");
    return element;
}

/** The emulated headset. */
function headset(): IWERHandle {
    assert.exists(iwer, "no IWER");
    return iwer;
}

/** Options for {@link mount}. */
interface MountOptions {
    /** `node.size` for every node; the default size when absent. */
    size?: number;
    /** More single nodes, each its own component. */
    extra?: { id: string; x: number; y: number; z: number }[];
    /** Whether to draw edges. */
    edges?: boolean;
}

/**
 * Open the element in VR on a render path set before load, the lazy graph in front of the headset,
 * each controller pointing straight ahead at its row.
 * @param path - The render path.
 * @param options - Sizes, extra nodes, edges.
 */
async function mount(path: Path, options: MountOptions = {}): Promise<void> {
    iwer = installIWER();
    const created = document.createElement("graphty-element");
    element = created;
    created.renderPath = path;
    created.style.cssText = "display:block;width:400px;height:300px";
    created.xr = { enabled: true, ui: { enabled: true, showAvailabilityWarning: false } };
    document.body.append(created);
    await created.updateComplete;
    await created.session.styles.add({
        name: "Ink",
        target: "node",
        selector: { match: "everything" },
        set: { "node.color": "#2040ff", ...(options.size === undefined ? {} : { "node.size": options.size }) },
    });
    await created.session.styles.add({
        name: "Edge ink",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": EDGE_COLOR, "edge.width": 4 },
    });
    await operationQueueOf(created.graph).waitForCompletion();
    // The data arrives after the first frame, as a file loads in the app.
    await drawnFrames(created.graph.getScene(), 2);
    await created.session.data.addNodes([
        ...NODES.map(({ id, x, y }) => ({ id, position: { x, y, z: DEPTH } })),
        ...(options.extra ?? []).map(({ id, x, y, z }) => ({ id, position: { x, y, z } })),
    ]);
    if (options.edges !== false) {
        await created.session.data.addEdges(EDGES);
    }

    // Where the data puts them: no spread to keep default-sized nodes apart.
    await created.graph.setLayout("fixed", { dim: 3, spacing: 0 });
    await operationQueueOf(created.graph).waitForCompletion();
    await created.setViewMode("vr");
    await drawnFrames(created.graph.getScene(), 10);
    assert.equal(created.graph.getScene().activeCamera?.rigCameras.length, 2, "two eyes are drawing");
    for (const hand of ["left", "right"] as const) {
        const { x, y, z } = AIM[hand];
        headset().device.controllers[hand]?.position.set(x, y, -z);
    }

    await drawnFrames(created.graph.getScene(), 6);
}

/**
 * On the batched path, the graph is still lazy: some node rows have no Node.
 * @param path - The render path.
 * @param when - What just happened, for the message.
 */
function assertLazy(path: Path, when: string): void {
    if (path === "batched") {
        const built = dataManagerInternals.nodesBuilt(el().graph.getDataManager());
        assert.isBelow(built, NODES.length, `every node row has a Node ${when}: the case tests object rows`);
    }
}

/**
 * Let the session draw frames.
 * @param count - How many.
 */
async function frames(count: number): Promise<void> {
    await drawnFrames(el().graph.getScene(), count);
}

/**
 * Press, then release, a controller's trigger where it points.
 * @param hand - Which controller.
 */
async function tap(hand: Handedness): Promise<void> {
    const controller = headset().device.controllers[hand];
    assert.exists(controller);
    controller.updateButtonValue("trigger", 1);
    await frames(4);
    controller.updateButtonValue("trigger", 0);
    await frames(4);
}

/**
 * Move a controller, still pointing straight ahead, so its ray passes through a point of the rows' plane.
 * @param hand - Which controller.
 * @param at - The point.
 */
async function pointAt(hand: Handedness, at: { x: number; y: number }): Promise<void> {
    const controller = headset().device.controllers[hand];
    assert.exists(controller);
    const from = AIM[hand];
    controller.position.set(at.x, at.y, -from.z);
    await frames(6);
}

/**
 * Run a case on each path in turn, each on a fresh element and headset.
 * @param run - The case; what it returns is compared across the paths.
 * @returns What it returned on each path.
 */
async function onEachPath<T>(run: (path: Path) => Promise<T>): Promise<Record<Path, T>> {
    const seen: Partial<Record<Path, T>> = {};
    for (const path of PATHS) {
        seen[path] = await run(path);
        el().remove();
        headset().uninstall();
        element = undefined;
        iwer = undefined;
    }

    return seen as Record<Path, T>;
}

// Babylon casts its laser from one controller at a time, the left one until another's trigger
// is pulled, so the laser checks point the left one; the trigger checks use both.
describe("the laser on node rows", () => {
    for (const size of [undefined, 0.3, 3]) {
        it(`lands on the same row on both paths, node.size ${String(size ?? "unset")}`, async () => {
            const seen = await onEachPath(async (path) => {
                await mount(path, { size });
                assertLazy(path, "after the load");
                await frames(4);
                const on = `left ${laserHit(el(), "left").on}, right ${laserHit(el(), "right").on}`;
                // XR has no hover on either path today.
                assert.isNull(el().session.selection.hovered ?? null, `${path}: the laser hovered a node`);
                assertLazy(path, "after pointing");
                return on;
            });
            assert.equal(seen.batched, seen.objects);
            assert.equal(seen.objects, "left node:l, right nothing");
        });
    }

    for (const path of PATHS) {
        it(`${path}: lands on the nearer of two rows on one ray`, async () => {
            await mount(path, { extra: [{ id: "near", x: AIM.left.x, y: EYE, z: 2 }] });
            await frames(4);
            assert.equal(laserHit(el(), "left").on, "node:near", "the laser passed the nearer row");
            assertLazy(path, "after pointing");
        });
    }

    it("lands where the objects path lands, and switches with the trigger, with two controllers on two rows", async () => {
        const seen = await onEachPath(async (path) => {
            await mount(path);
            await pointAt("left", { x: -1, y: EYE + 2 });
            await pointAt("right", { x: 1, y: EYE - 2 });
            const before = [laserHit(el(), "left").on, laserHit(el(), "right").on];
            await tap("right");
            const selected = el().session.selection.nodes.map(String);
            await frames(4);
            const after = [laserHit(el(), "left").on, laserHit(el(), "right").on];
            await tap("left");
            assertLazy(path, "after two controllers pointed");
            return { before, selected, after, last: el().session.selection.nodes.map(String) };
        });
        assert.deepEqual(seen.batched, seen.objects);
        assert.deepEqual(seen.objects.before, ["node:t0", "nothing"]);
        assert.deepEqual(seen.objects.selected, ["b1"], "the right trigger took the row under the right ray");
        assert.deepEqual(seen.objects.last, ["t0"], "the left trigger took the row under the left ray");
    });

    for (const [kind, x] of [
        ["undirected", -2],
        ["directed", 2],
    ] as const) {
        it(`lands on the same thing on both paths when it points at a ${kind} edge between rows`, async () => {
            const seen = await onEachPath(async (path) => {
                await mount(path);
                // Halfway between the pair's rows, clear of both.
                await pointAt("left", { x, y: EYE });
                const { on } = laserHit(el(), "left");
                await tap("left");
                return { on, selected: el().session.selection.nodes.map(String) };
            });
            assert.deepEqual(seen.batched, seen.objects);
            assert.deepEqual(seen.objects.selected, [], "a tap on an edge selected a node");
        });
    }
});

describe("the trigger on node rows", () => {
    for (const path of PATHS) {
        it(`${path}: a tap selects the row under the laser, with edges drawn`, async () => {
            await mount(path);
            assertLazy(path, "before the tap");
            await tap("right");
            assert.deepEqual(el().session.selection.nodes.map(String), ["r"]);
            el().session.selection.clear();
            await tap("left");
            assert.deepEqual(el().session.selection.nodes.map(String), ["l"]);
        });

        for (const [hand, id, partnerX] of [
            ["left", "l", -3],
            ["right", "r", 3],
        ] as const) {
            it(`${path}: a ${hand} trigger drag carries row ${id}, and its edge follows it in every frame the left eye draws`, async () => {
                await mount(path);
                assertLazy(path, "before the drag");
                const scene = el().graph.getScene();
                const controller = headset().device.controllers[hand];
                assert.exists(controller);
                controller.updateButtonValue("trigger", 1);
                await frames(4);
                // The press took the row, which built its Node; read where it is drawn from it.
                const node = el().graph.getDataManager().getNode(id);
                assert.exists(node);
                const partner = new Vector3(partnerX, EYE, DEPTH);
                const misses: string[] = [];
                let checked = 0;
                const record = (): void => {
                    const frame = frameNow(el());
                    const at = node.drawnWorldPosition;
                    // The canvas shows the left eye's view, at full size, under IWER; the right eye's is not on it.
                    for (const eye of [0] as const) {
                        const bg = background(frame, eye);
                        const isNodeInk = (p: readonly number[]): boolean =>
                            Math.abs((p[0] ?? 0) - bg[0]) +
                                Math.abs((p[1] ?? 0) - bg[1]) +
                                Math.abs((p[2] ?? 0) - bg[2]) >
                            60;
                        if (!inkNear(frame, inEye(el(), eye, at), 2, isNodeInk)) {
                            misses.push(`frame ${checked} eye ${eye}: no node ink where row ${id} is drawn`);
                        }

                        if (!inkNear(frame, inEye(el(), eye, Vector3.Center(at, partner)), 3, isEdgeInk)) {
                            misses.push(`frame ${checked} eye ${eye}: no edge ink between row ${id} and its partner`);
                        }
                    }

                    checked++;
                };

                const before = node.drawnWorldPosition.clone();
                const observer = scene.onAfterRenderObservable.add(record);
                for (let step = 0; step < 12; step++) {
                    controller.position.y += 0.06;
                    await frames(2);
                }

                controller.updateButtonValue("trigger", 0);
                await frames(4);
                scene.onAfterRenderObservable.remove(observer);
                assert.isAbove(node.drawnWorldPosition.y, before.y + 0.3, "the row did not follow the controller");
                assert.isAtLeast(checked, 24, "frames checked during the drag");
                assert.deepEqual(misses, [], "the row and its edge as drawn during the drag");
            });
        }
    }

    it("draws each eye's whole frame the same on both paths after the same drag", async () => {
        const pictures: Partial<Record<Path, XRFrame>> = {};
        for (const path of PATHS) {
            await mount(path);
            const controller = headset().device.controllers.right;
            assert.exists(controller);
            controller.updateButtonValue("trigger", 1);
            await frames(4);
            for (let step = 0; step < 8; step++) {
                controller.position.x += 0.05;
                await frames(2);
            }

            controller.updateButtonValue("trigger", 0);
            await frames(4);
            // The laser back where it started, so both pictures show it in one place.
            controller.position.set(AIM.right.x, AIM.right.y, -AIM.right.z);
            pictures[path] = await wholeFrame(el());
            el().remove();
            headset().uninstall();
            element = undefined;
            iwer = undefined;
        }

        assert.exists(pictures.objects);
        assert.exists(pictures.batched);
        assert.deepEqual(differing(pictures.objects, pictures.batched), { left: 0, right: 0 });
    });
});

/**
 * The background of an eye, read from its top corner.
 * @param frame - The frame.
 * @param eye - Which eye.
 * @returns Its red, green and blue.
 */
function background(frame: XRFrame, eye: 0 | 1): [number, number, number] {
    const i = (eye === 0 ? 0 : frame.width - 1) * 4;
    return [frame.pixels[i] ?? 0, frame.pixels[i + 1] ?? 0, frame.pixels[i + 2] ?? 0];
}

describe("the laser while a layout moves the rows", () => {
    for (const path of PATHS) {
        for (const mover of ["ngraph", "a glide held half way"] as const) {
            it(`${path}: while ${mover} moves the rows, lands only on a row its ray passes through where the row stood at the pick`, async () => {
                await mount(path);
                const frames$ = el().graph.getXRSessionManager()?.getXRHelper()?.baseExperience
                    .sessionManager.onXRFrameObservable;
                assert.exists(frames$);
                const misses: string[] = [];
                const landed = new Set<string>();
                // Babylon picks in the XR frame, before the layout steps the rows and the scene draws
                // them; read the hit there, against where the rows stood when it was picked.
                const observer = frames$.add(() => {
                    const { node } = laserHit(el(), "left");
                    if (node === undefined) {
                        return;
                    }

                    landed.add(String(node.id));
                    const off = offRay(laserRay(el(), "left"), node.drawnWorldPosition);
                    // A default node is drawn 1.5 units across.
                    if (off > 0.8) {
                        misses.push(`on ${String(node.id)} ${off.toFixed(3)} off the ray`);
                    }
                });
                if (mover === "ngraph") {
                    await el().setLayout("ngraph", { seed: 3 });
                } else {
                    await el().session.config.set({
                        layoutTransition: { transition: "glide", seconds: 30, hold: 0.5 },
                    });
                    // A circle about as wide as the rows, so the held pose stays in front of the laser.
                    await el().setLayout("circular", { scalingFactor: 3 });
                }

                // Sweep the left laser across the rows while they move or stand part way.
                const { left } = headset().device.controllers;
                assert.exists(left);
                for (let y = EYE - 3; y <= EYE + 3; y++) {
                    for (let x = -4; x <= 4; x++) {
                        left.position.set(x, y, -AIM.left.z);
                        await frames(2);
                    }
                }

                frames$.remove(observer);
                assert.isAbove(landed.size, 1, "the laser landed on too few rows to tell");
                assert.deepEqual(misses, []);
            });
        }

        it(`${path}: a tap selects the row the laser was on in the frame the press arrived`, async () => {
            await mount(path);
            const scene = el().graph.getScene();
            await el().setLayout("ngraph", { seed: 3 });
            await frames(2);
            const controller = headset().device.controllers.left;
            assert.exists(controller);
            let atPress: string | undefined;
            controller.updateButtonValue("trigger", 1);
            scene.onAfterRenderObservable.addOnce(() => {
                atPress = laserHit(el(), "left").on;
            });
            await frames(3);
            controller.updateButtonValue("trigger", 0);
            await frames(4);
            assert.exists(atPress);
            const selected = el().session.selection.nodes.map((id) => `node:${String(id)}`);
            assert.deepEqual(selected, atPress.startsWith("node:") ? [atPress] : [], "the tap's selection");
        });
    }
});

describe("a pinch of a tracked hand on node rows", () => {
    for (const path of PATHS) {
        it(`${path}: drags a row that has no Node`, async () => {
            driver = await createXRInputDriver("hand");
            const { element: mounted } = driver;
            element = mounted;
            if (path === "batched") {
                mounted.graph.setRenderPath("batched");
            }

            const at = new Vector3(0.2, 1, -0.3);
            driver.setHand("right", at, 0.1);
            await driver.frame();
            const on = driver.pointOnRay("right", 3);
            await mounted.session.data.addNodes([
                { id: "h", position: on },
                { id: "h2", position: { x: on.x + 2, y: on.y, z: on.z } },
                { id: "far", position: { x: on.x - 3, y: on.y + 3, z: on.z } },
            ]);
            await mounted.session.data.addEdges([{ source: "h", target: "h2", directed: false }]);
            await mounted.graph.setLayout("fixed", { dim: 3, spacing: 0 });
            await operationQueueOf(mounted.graph).waitForCompletion();
            await driver.frame();
            if (path === "batched") {
                assert.isBelow(dataManagerInternals.nodesBuilt(mounted.graph.getDataManager()), 3, "the rows are lazy");
            }

            const hand = async (offset: Vector3, pinch = 0.01): Promise<void> => {
                driver?.setHand("right", at.add(offset), pinch);
                await driver?.frame();
            };
            await hand(Vector3.Zero());
            await hand(new Vector3(0.1, 0, 0));
            assert.isTrue(driver.handler.isDragging(), "the pinch did not take the row");
            await hand(new Vector3(0.2, 0, 0));
            await hand(new Vector3(0.2, 0, 0), 0.1);
            const moved = mounted.graph.getDataManager().getNode("h")?.drawnPosition;
            assert.exists(moved);
            assert.isAbove(moved.x - on.x, 0.05, "the row did not follow the hand");
        });
    }
});
