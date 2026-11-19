/**
 * The owner's tour, made and played through the Views place on the REAL graphty-element
 * (design/ui/camera-views-tours-and-capture.md, section 7, "The owner's tour, through the UI"):
 * New tour, + Camera > Top, + Camera > Isometric, + Camera > Side, Play. The reported defect: the
 * camera showed Top, then jumped to a front view before it flew to Isometric.
 *
 * Every frame that moves the camera is recorded from the element's `overview-changed` event (fired
 * after a drawn frame whose view changed), with the latest `tour-progress`. Each flight is judged
 * on counted frames and poses, never the wall clock: its first frame is not the front view, its
 * turn never goes back, every hold frame sits on its stop's pose and the flight ends there. How
 * closely a flight follows the eased time is graphty-element's own tour-continuity test, on the
 * animation-step clock. The table is written to tmp/views-navbar/app-tour-top-iso-side.json
 * (repository root) on every run.
 */

// Registers the real <graphty-element>, as main.tsx does.
import "@graphty/graphty-element";

import { assert, describe, it } from "vitest";
import { commands, page, userEvent } from "vitest/browser";

import { render, screen, waitFor, within } from "../../../test/test-utils";
import { createWorkspaceStore } from "../../state/store";
import { Workspace } from "../../Workspace";

type GraphElement = HTMLElementTagNameMap["graphty-element"];
type CameraState = ReturnType<GraphElement["getCameraState"]>;
type Quat = [number, number, number, number];
type Vec = [number, number, number];

/** One frame that moved the camera. */
interface Frame {
    i: number;
    /** The latest tour-progress stop, or -1 before the first. */
    stop: number;
    phase: string;
    state: CameraState;
    /** The orientation, from pivotRotation. */
    q: Quat;
    /** normalize(target - position). */
    direction: Vec;
    /** The camera's up. */
    up: Vec;
    /** Filled by the checks: the angle from the flight's start pose, radians. */
    turned?: number;
}

/** The front view's orientation: no pitch, yaw or roll (the pose the reported jump showed). */
const FRONT: Quat = [0, 0, 0, 1];

/**
 * The quaternion of a yaw, pitch, roll rotation (yaw about y, then pitch about x, then roll about z).
 * @param r - pivotRotation: x pitch, y yaw, z roll.
 * @param r.x - pitch.
 * @param r.y - yaw.
 * @param r.z - roll.
 * @returns [x, y, z, w].
 */
function quaternion({ x, y, z }: { x: number; y: number; z: number }): Quat {
    const [sp, cp] = [Math.sin(x / 2), Math.cos(x / 2)];
    const [sy, cy] = [Math.sin(y / 2), Math.cos(y / 2)];
    const [sr, cr] = [Math.sin(z / 2), Math.cos(z / 2)];
    return [
        cy * sp * cr + sy * cp * sr,
        sy * cp * cr - cy * sp * sr,
        cy * cp * sr - sy * sp * cr,
        cy * cp * cr + sy * sp * sr,
    ];
}

/**
 * Rotates the y axis by a quaternion.
 * @param q - [x, y, z, w].
 * @returns the rotated axis.
 */
function upOf([x, y, z, w]: Quat): Vec {
    return [2 * (x * y - w * z), 1 - 2 * (x * x + z * z), 2 * (y * z + w * x)];
}

/**
 * The rotation angle between two orientations.
 * @param a - one.
 * @param b - the other.
 * @returns radians, in [0, pi].
 */
function angle(a: Quat, b: Quat): number {
    const dot = Math.abs(a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3]);
    return 2 * Math.acos(Math.min(1, dot));
}

/**
 * The orientation and view of a 3D camera state.
 * @param state - the state.
 * @returns q, direction and up.
 */
function pose(state: CameraState): Pick<Frame, "q" | "direction" | "up"> {
    const { position, target, pivotRotation } = state;
    if (!position || !target || !pivotRotation) {
        throw new Error(`not a 3D camera state: ${JSON.stringify(state)}`);
    }
    const d: Vec = [target.x - position.x, target.y - position.y, target.z - position.z];
    const length = Math.hypot(...d);
    const q = quaternion(pivotRotation);
    return { q, direction: d.map((each) => each / length) as Vec, up: upOf(q) };
}

/**
 * Whether two states keep the same target and distance, to 1e-3 of the distance.
 * @param a - one.
 * @param b - the other.
 * @returns the first difference, or null.
 */
function placeDifference(a: CameraState, b: CameraState): string | null {
    const scale = Math.max(1, a.cameraDistance ?? 1);
    for (const [name, x, y] of [
        ["target.x", a.target?.x, b.target?.x],
        ["target.y", a.target?.y, b.target?.y],
        ["target.z", a.target?.z, b.target?.z],
        ["cameraDistance", a.cameraDistance, b.cameraDistance],
    ] as const) {
        if (Math.abs((x ?? Number.NaN) - (y ?? Number.NaN)) > 1e-3 * scale || x === undefined) {
            return `${name} ${String(x)} vs ${String(y)}`;
        }
    }
    return null;
}

/**
 * Clicks a button of the Views place.
 * @param name - its accessible name.
 */
async function press(name: string): Promise<void> {
    await userEvent.click(within(screen.getByRole("region", { name: "Views place" })).getByRole("button", { name }));
}

describe("the owner's tour, made and played in the Views place", () => {
    it("shows Top, flies to Isometric with no front view between, then to Side, and puts the camera back", async () => {
        await page.viewport(1440, 900);
        render(<Workspace store={createWorkspaceStore({ project: { name: "Owner's tour", id: 1 } })} />);
        const element = await waitFor(() => {
            const found = document.querySelector("graphty-element");
            assert.isTrue(found?.session.views.has("Isometric") === true);
            return found as GraphElement;
        });
        const { session } = element;
        const ids = ["n1", "n2", "n3", "n4", "n5", "n6", "n7"];
        await session.layout.set("circular");
        await session.data.addNodes(ids.map((id) => ({ id })));
        await session.data.addEdges(ids.map((id, i) => ({ source: id, target: ids[(i + 2) % ids.length] })));
        await element.waitForSettled();
        await element.waitForStableFrame();

        // The tour, through the Views place.
        await userEvent.click(
            within(screen.getByRole("toolbar", { name: "Places" })).getByRole("button", { name: "Views" }),
        );
        await screen.findByRole("region", { name: "Views place" });
        await userEvent.click(
            within(screen.getByRole("region", { name: "Views place" })).getAllByRole("button", { name: "New tour" })[0],
        );
        const name = await screen.findByRole("textbox", { name: "Rename Tour 1" });
        await userEvent.clear(name);
        await userEvent.type(name, "Owner{Enter}");
        await waitFor(() => {
            assert.isTrue(session.tours.has("Owner"));
        });
        const cameras = ["Top", "Isometric", "Side"];
        for (const camera of cameras) {
            await press("Add camera to Owner");
            await userEvent.click(await screen.findByRole("menuitem", { name: camera }));
        }
        await waitFor(() => {
            assert.deepEqual(
                session.tours.get("Owner")?.stops.map((stop) => ("view" in stop ? stop.view : "pause")),
                cameras,
            );
        });
        const stops = session.tours.get("Owner")?.stops ?? [];
        assert.strictEqual("view" in stops[0] ? stops[0].duration : -1, 0, "the first stop is a cut");

        // Record every frame that moves the camera, from Play to the tour's end.
        const frames: Frame[] = [];
        let progress = { stop: -1, phase: "before" };
        let ended: string | null = null;
        const onProgress = (event: CustomEvent<{ stop: number; phase: string }>): void => {
            progress = { stop: event.detail.stop, phase: event.detail.phase };
        };
        const onFrame = (): void => {
            if (ended !== null) {
                return;
            }
            const state = element.getCameraState();
            frames.push({ i: frames.length, ...progress, state, ...pose(state) });
        };
        const onEnded = (event: CustomEvent<{ reason: string }>): void => {
            ended = event.detail.reason;
        };
        element.addEventListener("tour-progress", onProgress);
        element.addEventListener("overview-changed", onFrame);
        element.addEventListener("tour-ended", onEnded);
        const before = element.getCameraState();
        await press("Play Owner");
        await waitFor(() => {
            assert.strictEqual(ended, "finished");
        });
        element.removeEventListener("tour-progress", onProgress);
        element.removeEventListener("overview-changed", onFrame);
        element.removeEventListener("tour-ended", onEnded);

        // The camera is put back where it was before Play.
        await element.waitForSettled();
        assert.isNull(placeDifference(element.getCameraState(), before), "the camera returns");
        assert.isBelow(angle(pose(element.getCameraState()).q, pose(before).q), 1e-3, "the camera turns back");
        // A frame that drew the camera put back is not part of the last hold.
        while (
            frames.length > 0 &&
            frames[frames.length - 1].stop === cameras.length - 1 &&
            angle(frames[frames.length - 1].q, pose(before).q) < 1e-3
        ) {
            frames.pop();
        }

        // The pose each stop holds: a cut to the same camera.
        const poses: { state: CameraState; q: Quat }[] = [];
        for (const camera of cameras) {
            await element.playTour([{ view: camera }]);
            const state = element.getCameraState();
            poses.push({ state, q: pose(state).q });
        }

        const problems: string[] = [];
        const fail = (message: string, at: number): void => {
            const near = frames.slice(Math.max(0, at - 2), at + 3).map(({ state: _state, ...rest }) => rest);
            problems.push(`${message} at frame ${at}: ${JSON.stringify(near)}`);
        };
        for (const [index, stop] of stops.entries()) {
            const flight = frames.filter((f) => f.stop === index && f.phase === "flight");
            const holds = frames.filter((f) => f.stop === index && f.phase === "hold");
            const end = poses[index];
            for (const f of holds) {
                if (angle(f.q, end.q) > 1e-3 || placeDifference(f.state, end.state) !== null) {
                    fail(`stop ${index} (${cameras[index]}) hold is off its pose`, f.i);
                }
            }
            const duration = "view" in stop ? (stop.duration ?? 0) : 0;
            if (duration === 0) {
                assert.lengthOf(flight, 0, `stop ${index} is a cut`);
                continue;
            }

            assert.isAbove(flight.length, 10, `stop ${index} (${cameras[index]}) flew frame by frame`);
            const start = poses[index - 1].q;
            let previous = 0;
            for (const f of flight) {
                f.turned = angle(start, f.q);
                if (f.turned < previous - 1e-6) {
                    fail(`stop ${index} turned back: ${f.turned} after ${previous}`, f.i);
                }
                previous = f.turned;
            }

            // No jump to the front view: the first flight frame is not the front pose (neither
            // stop of these flights is the front view, so a slerp between them never draws it).
            if (angle(flight[0].q, FRONT) < 1e-3) {
                fail(`stop ${index} drew the front view on its first frame`, flight[0].i);
            }
            // Nor any other jump: the first frame turns under a tenth of the flight's whole angle
            // from the previous stop's pose.
            const whole = angle(start, end.q);
            if ((flight[0].turned ?? 0) >= 0.1 * whole) {
                fail(
                    `stop ${index} jumped ${String(flight[0].turned)} of ${String(whole)} on its first frame`,
                    flight[0].i,
                );
            }

            // The flight ends on the stop: the last pose drawn before the hold is the stop's.
            const last = [...flight, ...holds].at(-1) ?? flight[0];
            if (angle(last.q, end.q) > 1e-3 || placeDifference(last.state, end.state) !== null) {
                fail(`stop ${index} flight ended off its pose`, last.i);
            }
        }

        await commands.writeFile(
            "../tmp/views-navbar/app-tour-top-iso-side.json",
            JSON.stringify(
                frames.map(({ i, stop, phase, direction, up, q, turned }) => ({
                    i,
                    stop,
                    phase,
                    direction,
                    up,
                    q,
                    angleFromA: turned,
                })),
                null,
                1,
            ),
        );
        assert.deepEqual(problems.slice(0, 3), [], problems[0]);
    });
});
