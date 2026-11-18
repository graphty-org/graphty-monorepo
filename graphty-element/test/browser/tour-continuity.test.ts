/**
 * @file Tours fly the camera continuously: every frame of a playing tour is recorded, and each flight
 * is judged against what a slerp on the tour's clock guarantees -- it leaves the pose it held, never
 * snaps, never turns back, follows the eased time and ends on the stop's pose. A hold equals the pose
 * a cut to the same stop gives. The reported defect: Top, then Isometric, showed a front view for
 * one frame before turning, because the flight started from a stale Euler rotation.
 */

import { Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { afterEach, assert, beforeEach, describe, test } from "vitest";
import { commands } from "vitest/browser";

import type { CameraState } from "../../src/camera/types";
import type { TourProgressEvent } from "../../src/events";
import type { Graph } from "../../src/Graph.js";
import type { ViewWaypoint } from "../../src/video/VideoCapture";
import { drag } from "../helpers/real-input";
import { cleanupTestGraph, configureGraph, createTestGraph } from "../helpers/testSetup.js";

/** A tour stop, as `playTour` takes it inline. */
type Stop = ViewWaypoint;

/** One drawn frame. */
interface Frame {
    /** The frame's index in the recording. */
    i: number;
    /** When the frame's animations were stepped, ms (performance.now, the clock Babylon reads). */
    ts: number;
    /** The latest tour-progress stop, or -1 before the first. */
    stop: number;
    phase: TourProgressEvent["phase"] | "before";
    /** The pivot orientation, [x, y, z, w]; null in 2D. */
    q: [number, number, number, number] | null;
    state: CameraState;
    /** normalize(target - position). */
    direction: [number, number, number] | null;
    /** The camera's up, from pivotRotation. */
    up: [number, number, number] | null;
    /** Filled by the checks: the angle from the flight's start pose over the flight's whole angle. */
    progress?: number;
    /** Filled by the checks: the eased time. */
    expected?: number;
}

/** The tour's default easing, Babylon's cubic easeInOut. */
function ease(t: number): number {
    const c = Math.min(1, Math.max(0, t));
    return c < 0.5 ? 4 * c ** 3 : 1 - 4 * (1 - c) ** 3;
}

/**
 * The rotation angle between two orientations, radians.
 * @param a - One, [x, y, z, w].
 * @param b - The other.
 * @returns The angle in [0, pi].
 */
function angle(a: readonly number[], b: readonly number[]): number {
    const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    return 2 * Math.acos(Math.min(1, dot));
}

/**
 * The pivot's orientation now, or null in 2D.
 * @param graph - The graph.
 * @returns [x, y, z, w].
 */
function pivotQuaternion(graph: Graph): [number, number, number, number] | null {
    const controller = graph.camera.getActiveController() as unknown as {
        pivot?: { rotationQuaternion: Quaternion | null; rotation: Vector3 };
    };
    if (controller.pivot === undefined) {
        return null;
    }

    const q = controller.pivot.rotationQuaternion ?? Quaternion.FromEulerVector(controller.pivot.rotation);
    return [q.x, q.y, q.z, q.w];
}

/**
 * Record every frame drawn until `stop()`.
 * @param graph - The graph.
 * @returns The frames, and the function that ends the recording.
 */
function record(graph: Graph): { frames: Frame[]; stop: () => void } {
    const frames: Frame[] = [];
    let stop = -1;
    let phase: Frame["phase"] = "before";
    let stepped = performance.now();
    const off = graph.on("tour-progress", (event) => {
        ({ stop, phase } = event);
    });
    const before = graph.scene.onBeforeAnimationsObservable.add(() => {
        stepped = performance.now();
    });
    const after = graph.scene.onAfterRenderObservable.add(() => {
        const state = graph.getCameraState();
        let direction: Frame["direction"] = null;
        let up: Frame["up"] = null;
        if (state.position && state.target) {
            const d = new Vector3(
                state.target.x - state.position.x,
                state.target.y - state.position.y,
                state.target.z - state.position.z,
            ).normalize();
            direction = [d.x, d.y, d.z];
        }

        if (state.pivotRotation) {
            const r = state.pivotRotation;
            const u = Vector3.Up().rotateByQuaternionToRef(
                Quaternion.RotationYawPitchRoll(r.y, r.x, r.z),
                new Vector3(),
            );
            up = [u.x, u.y, u.z];
        }

        frames.push({
            i: frames.length,
            ts: stepped,
            stop,
            phase,
            q: pivotQuaternion(graph),
            state,
            direction,
            up,
        });
    });
    return {
        frames,
        stop: () => {
            off();
            graph.scene.onBeforeAnimationsObservable.remove(before);
            graph.scene.onAfterRenderObservable.remove(after);
        },
    };
}

/**
 * The frames around one, for a failure message.
 * @param frames - All frames.
 * @param at - The bad frame's index.
 * @returns JSON of it and its neighbors.
 */
function around(frames: readonly Frame[], at: number): string {
    return JSON.stringify(
        frames.slice(Math.max(0, at - 2), at + 3).map(({ state: _state, ...rest }) => rest),
        null,
        1,
    );
}

/**
 * A scalar for a 2D pose: where it is on the line from `a` to `b`, by pan and by visible size.
 * @param a - The start.
 * @param b - The end.
 * @param s - The pose now.
 * @returns The share of the way, or null when a and b are the same.
 */
function flatProgress(a: CameraState, b: CameraState, s: CameraState): number | null {
    const shares: number[] = [];
    const span = (from: number, to: number, now: number): void => {
        if (Math.abs(to - from) > 1e-6 * Math.max(1, Math.abs(from), Math.abs(to))) {
            shares.push((now - from) / (to - from));
        }
    };
    span(a.pan?.x ?? 0, b.pan?.x ?? 0, s.pan?.x ?? 0);
    span(a.pan?.y ?? 0, b.pan?.y ?? 0, s.pan?.y ?? 0);
    span(1 / (a.zoom ?? 1), 1 / (b.zoom ?? 1), 1 / (s.zoom ?? 1));
    return shares.length === 0 ? null : shares.reduce((x, y) => x + y) / shares.length;
}

/**
 * The pose a cut to one stop gives: one stop, no flight, no hold.
 * @param graph - The graph.
 * @param view - The stop's view.
 * @returns The camera state and the pivot orientation right after.
 */
async function cutPose(graph: Graph, view: Stop["view"]): Promise<{ state: CameraState; q: number[] | null }> {
    await graph.playTour([{ view }]);
    return { state: graph.getCameraState(), q: pivotQuaternion(graph) };
}

/**
 * Whether two states hold the same target and distance (3D) or pan and zoom (2D), to 1e-3 of scale.
 * @param a - One.
 * @param b - The other.
 * @returns The first difference, or null.
 */
function placeDifference(a: CameraState, b: CameraState): string | null {
    const scale = Math.max(1, a.cameraDistance ?? 1);
    const pairs: [string, number | undefined, number | undefined][] = [
        ["target.x", a.target?.x, b.target?.x],
        ["target.y", a.target?.y, b.target?.y],
        ["target.z", a.target?.z, b.target?.z],
        ["cameraDistance", a.cameraDistance, b.cameraDistance],
        ["pan.x", a.pan?.x, b.pan?.x],
        ["pan.y", a.pan?.y, b.pan?.y],
        ["zoom", a.zoom, b.zoom],
    ];
    for (const [name, x, y] of pairs) {
        if ((x === undefined) !== (y === undefined) || Math.abs((x ?? 0) - (y ?? 0)) > 1e-3 * scale) {
            return `${name} ${String(x)} vs ${String(y)}`;
        }
    }

    return null;
}

/**
 * Play a tour while recording every frame, then check every flight and hold.
 * @param graph - The graph.
 * @param name - The tour's name, for the log file and messages.
 * @param stops - The stops.
 * Every run writes the per-frame table to tmp/views-navbar/tour-continuity-<name>.json (repository root).
 * @returns The frames.
 */
async function playAndCheck(graph: Graph, name: string, stops: Stop[]): Promise<Frame[]> {
    const plan = graph.planTour(stops);
    assert.isTrue(plan.playable, `tour ${name} is playable: ${JSON.stringify(plan)}`);

    const recording = record(graph);
    // The frame drawn before the tour holds the pose the first stop leaves.
    await new Promise<void>((resolve) => {
        graph.scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
    const { reason } = await graph.playTour(stops);
    // One more frame, so the last hold is drawn.
    await new Promise<void>((resolve) => {
        graph.scene.onAfterRenderObservable.addOnce(() => {
            resolve();
        });
    });
    recording.stop();
    const { frames } = recording;
    assert.strictEqual(reason, "finished", `tour ${name} finished`);

    // The pose each stop must hold: a cut to the same stop.
    const poses = [];
    for (const stop of stops) {
        poses.push(await cutPose(graph, stop.view));
    }

    const problems: string[] = [];
    const fail = (message: string, at: number): void => {
        problems.push(`tour ${name}: ${message} at frame ${at}:\n${around(frames, at)}`);
    };

    for (const [index, stop] of stops.entries()) {
        const flight = frames.filter((f) => f.stop === index && f.phase === "flight");
        const holds = frames.filter((f) => f.stop === index && f.phase === "hold");
        const pose = poses[index];

        // Every hold equals the stop's pose.
        for (const f of holds) {
            if (pose.q && f.q && angle(f.q, pose.q) > 1e-3) {
                fail(`stop ${index} hold is ${angle(f.q, pose.q)} rad from its pose`, f.i);
            }

            const difference = placeDifference(f.state, pose.state);
            if (difference !== null) {
                fail(`stop ${index} hold differs from its pose: ${difference}`, f.i);
            }
        }

        if ((stop.duration ?? 0) === 0) {
            continue;
        }

        assert.isAbove(flight.length, 0, `tour ${name} stop ${index} has flight frames`);
        const first = flight[0];
        // The pose the flight leaves: the previous stop's, or for a first stop the frame before it.
        const start =
            index > 0
                ? { ...frames[first.i - 1], q: poses[index - 1].q as Frame["q"], state: poses[index - 1].state }
                : frames[first.i - 1];
        // The pose the flight reaches: its stop's.
        const end = { ...flight[flight.length - 1], q: pose.q as Frame["q"], state: pose.state, ts: Number.NaN };
        const t0 = first.ts;
        const duration = stop.duration ?? 0;
        const span = holds.length > 0 ? [...flight, holds[0]] : flight;

        // The flight ends on its stop: the next frame drawn (a hold, or the next flight's first frame,
        // which has not moved yet) shows the stop's pose.
        const next = frames[flight[flight.length - 1].i + 1] as Frame | undefined;
        if (next === undefined) {
            fail(`stop ${index} has no frame after its flight`, flight[flight.length - 1].i);
        } else if (next.q && pose.q && angle(next.q, pose.q) > 1e-3) {
            fail(`stop ${index} flight ended ${angle(next.q, pose.q)} rad from its pose`, next.i);
        } else if (!next.q && placeDifference(next.state, pose.state) !== null) {
            fail(`stop ${index} flight ended off its pose: ${String(placeDifference(next.state, pose.state))}`, next.i);
        }

        if (start.q && end.q) {
            const a = start.q;
            const total = angle(a, end.q);
            let previous = 0;
            for (const f of span) {
                const turned = angle(a, f.q ?? a);
                f.progress = total > 1e-9 ? turned / total : 0;
                f.expected = ease((f.ts - t0) / duration);
                if (total <= 1e-6) {
                    if (turned > 1e-3) {
                        fail(`stop ${index} turned ${turned} rad on a flight that needs no turn`, f.i);
                    }

                    continue;
                }

                if (turned < previous - 1e-6) {
                    fail(`stop ${index} turned back: ${turned} after ${previous}`, f.i);
                }

                previous = turned;
                if (Math.abs(f.progress - f.expected) > 0.05) {
                    fail(`stop ${index} progress ${f.progress} is not the eased time ${f.expected}`, f.i);
                }
            }

            if (total > 1e-6) {
                const dt = first.ts - start.ts;
                const allowed = ease(dt / duration) * total + 0.05 * total;
                if (angle(a, first.q ?? a) > allowed) {
                    fail(`stop ${index} snapped ${angle(a, first.q ?? a)} rad on its first frame`, first.i);
                }
            }
        } else {
            let previous = 0;
            for (const f of span) {
                const share = flatProgress(start.state, end.state, f.state);
                if (share === null) {
                    continue;
                }

                f.progress = share;
                f.expected = ease((f.ts - t0) / duration);
                if (share < previous - 1e-6) {
                    fail(`stop ${index} went back: ${share} after ${previous}`, f.i);
                }

                previous = share;
                if (Math.abs(share - f.expected) > 0.05) {
                    fail(`stop ${index} progress ${share} is not the eased time ${f.expected}`, f.i);
                }
            }
        }
    }

    await commands.writeFile(
        `../tmp/views-navbar/tour-continuity-${name}.json`,
        JSON.stringify(
            frames.map(({ i, ts, stop, phase, direction, up, q, progress, expected, state }) => ({
                i,
                target: state.target,
                distance: state.cameraDistance,
                pan: state.pan,
                zoom: state.zoom,
                ts,
                stop,
                phase,
                direction,
                up,
                q,
                progress,
                expected,
            })),
            null,
            1,
        ),
    );

    assert.deepStrictEqual(problems.slice(0, 3), [], problems[0]);
    return frames;
}

describe("a tour flies the camera continuously", () => {
    let graph: Graph;

    beforeEach(async () => {
        graph = await createTestGraph();
        await configureGraph(graph, { viewMode: "3d", layout: "random", layoutOptions: { seed: 7 } });
        await graph.addNodes([{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }]);
        await graph.addEdges([
            { src: "a", dst: "b" },
            { src: "c", dst: "d" },
        ]);
        await graph.waitForSettled();
        await graph.waitForStableFrame();
    });

    afterEach(() => {
        cleanupTestGraph(graph);
    });

    test("Top (cut), Isometric, Side: no front-view frame, and a drag after it turns a little", async () => {
        const frames = await playAndCheck(graph, "1", [
            { view: "topView" },
            { view: "isometric", duration: 1000 },
            { view: "sideView", duration: 1000 },
        ]);
        assert.isAbove(frames.length, 60, "the flights were drawn frame by frame");

        // A flight again, then the drag right after it.
        await graph.playTour([{ view: "isometric" }, { view: "sideView", duration: 300 }]);
        const controller = graph.camera.getActiveController() as unknown as { pivot: { rotationQuaternion: unknown } };
        assert.isNotNull(controller.pivot.rotationQuaternion, "the flight left the pivot a quaternion");

        const before = graph.getCameraState();
        await drag(graph.canvas, { x: 10, y: 10 }, { x: 15, y: 10 });
        const after = graph.getCameraState();
        const direction = (s: CameraState): Vector3 =>
            new Vector3(
                (s.target?.x ?? 0) - (s.position?.x ?? 0),
                (s.target?.y ?? 0) - (s.position?.y ?? 0),
                (s.target?.z ?? 0) - (s.position?.z ?? 0),
            ).normalize();
        const turned = Math.acos(Math.min(1, Vector3.Dot(direction(before), direction(after))));
        assert.isBelow(turned, (5 * Math.PI) / 180, "a 5 px drag turns the view less than 5 degrees");
    });

    test("Side, Top, Bottom, and a second view from straight above: pole to pole, and the poles agree", async () => {
        const top = await cutPose(graph, "topView");
        const target = top.state.target ?? { x: 0, y: 0, z: 0 };
        const height = (top.state.cameraDistance ?? 10) * 1.5;
        await graph.getSession().views.save([
            {
                name: "overhead",
                camera: {
                    mode: "3d",
                    position: { x: target.x, y: target.y + height, z: target.z },
                    target,
                },
            },
        ]);
        await playAndCheck(graph, "2", [
            { view: "sideView" },
            { view: "topView", duration: 1000 },
            { view: "bottomView", duration: 1000 },
            { view: "overhead", duration: 1000 },
        ]);
        // Top reached by a flight holds the pose a cut gives.
        const flown = pivotQuaternion(graph);
        assert.isNotNull(flown);
        assert.isBelow(angle(flown ?? [], (await cutPose(graph, "overhead")).q ?? []), 1e-3);
    });

    test("a fixed view, a camera view, then a fixed view", async () => {
        await graph.getSession().views.save([
            { name: "deep", camera: { mode: "3d", position: { x: 20, y: -8, z: 30 }, target: { x: 1, y: 2, z: 0 } } },
            {
                name: "corner",
                camera: { mode: "3d", position: { x: -25, y: 15, z: -10 }, target: { x: 0, y: 0, z: 0 } },
            },
        ]);
        await playAndCheck(graph, "3", [
            { view: "deep" },
            { view: "frontView", duration: 800 },
            { view: "corner", duration: 800 },
        ]);
    });

    test("a first stop that flies from wherever the camera is", async () => {
        await graph.setCameraState({ mode: "3d", position: { x: -12, y: 9, z: 17 }, target: { x: 0, y: 1, z: 0 } });
        await playAndCheck(graph, "4", [
            { view: "isometric", duration: 800 },
            { view: "topView", duration: 800 },
        ]);
    });

    test("a 2D tour: Top, Fit, Top", async () => {
        await graph.setViewMode("2d");
        await graph.waitForSettled();
        await graph.waitForStableFrame();
        await playAndCheck(graph, "6", [
            { view: "topView" },
            { view: "fitToGraph", duration: 800 },
            { view: "topView", duration: 800 },
        ]);
    });
});
