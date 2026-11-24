/**
 * @file While a simulation runs with auto-frame on, the camera follows the moving graph the same way on both render
 * paths.
 *
 * Eight nodes in disjoint parts, loaded into an element already drawn (so on `"batched"` most rows have no Node),
 * are switched to a seeded ngraph simulation. Inside the {@link MOVING_FRAMES}th frame that moves a node, the public
 * camera state is read. Two `"objects"` loads are compared first, so a difference is the path's.
 *
 * How to run, from graphty-element:
 *   npx vitest run --project=render-parity test/render-parity/reframe-in-motion.test.ts
 */

import "../../src/graphty-element";
import "../../src/layout/index";

import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../index.js";
import { operationQueueOf } from "../../src/Graph";
import { dataManagerInternals } from "../../src/managers/DataManager";

type Path = "objects" | "batched";
type CameraState = ReturnType<Graphty["getCameraState"]>;

const N = 8;
const IDS = Array.from({ length: N }, (_, i) => String(i));
const EDGES = [
    { source: "0", target: "1", directed: false },
    { source: "2", target: "3" },
    { source: "4", target: "5", directed: false },
    { source: "5", target: "6", directed: false },
    { source: "6", target: "4" },
];
/** How many moving frames into the simulation the camera is read: before it settles. */
const MOVING_FRAMES = 8;

const cleanups: (() => void)[] = [];

afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
        cleanup();
    }
});

/**
 * Load the fixture on a ring, run a seeded simulation, and read the camera inside its Nth moving frame.
 * @param path - The render path.
 * @returns The camera state.
 */
async function cameraInMotion(path: Path): Promise<CameraState> {
    const element = document.createElement("graphty-element");
    element.renderPath = path;
    element.style.display = "block";
    element.style.width = "400px";
    element.style.height = "400px";
    document.body.appendChild(element);
    cleanups.push(() => {
        element.remove();
    });
    await element.updateComplete;
    await element.setViewMode("3d");
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    await element.session.data.addNodes(
        IDS.map((id, i) => {
            const a = (2 * Math.PI * i) / N;
            return { id, position: { x: 4 * Math.cos(a), y: 4 * Math.sin(a), z: 0 } };
        }),
    );
    await element.session.data.addEdges(EDGES);
    await element.graph.setLayout("fixed", { dim: 3 });
    await operationQueueOf(element.graph).waitForCompletion();
    await element.waitForStableFrame();
    if (path === "batched") {
        assert.isBelow(dataManagerInternals.nodesBuilt(element.graph.getDataManager()), N, "some rows have no Node");
    }

    assert.isTrue(element.autoFrame, "auto-frame is on");
    const scene = element.graph.getScene();
    const read = new Promise<CameraState>((resolve) => {
        // Counted in frames that moved a node, not frames drawn.
        let moved = 0;
        let last = "";
        const observer = scene.onAfterRenderObservable.add(() => {
            const at = IDS.map((id) => {
                const p = element.nodeScreenPosition(id);
                return p === undefined ? "-" : `${p.x.toFixed(3)},${p.y.toFixed(3)}`;
            }).join(" ");
            if (at === last) {
                return;
            }

            const first = last === "";
            last = at;
            if (first || ++moved < MOVING_FRAMES) {
                return;
            }

            scene.onAfterRenderObservable.remove(observer);
            resolve(element.getCameraState());
        });
    });
    await element.graph.setLayout("ngraph", { seed: 42, dim: 3 });
    const state = await read;
    element.remove();
    return state;
}

/**
 * The camera state's numbers, flattened to one level.
 * @param state - The camera state.
 * @returns Each number by its key.
 */
function numbers(state: CameraState): Record<string, number> {
    const out: Record<string, number> = {};
    for (const [key, value] of Object.entries(state)) {
        if (typeof value === "number") {
            out[key] = value;
        } else if (typeof value === "object" && value !== null) {
            for (const [axis, v] of Object.entries(value as Record<string, unknown>)) {
                if (typeof v === "number") {
                    out[`${key}.${axis}`] = v;
                }
            }
        }
    }

    return out;
}

/**
 * The fields of two camera states that differ by more than a hundredth of the largest.
 * @param a - One state.
 * @param b - The other.
 * @returns The differing fields, described.
 */
function differences(a: CameraState, b: CameraState): string[] {
    const x = numbers(a);
    const y = numbers(b);
    assert.deepEqual(Object.keys(y).sort(), Object.keys(x).sort(), "the same camera fields");
    const scale = Math.max(1, ...Object.values(x).map(Math.abs));
    return Object.keys(x)
        .filter((key) => Math.abs(x[key] - y[key]) > 0.01 * scale)
        .map((key) => `${key} ${String(x[key])} vs ${String(y[key])}`);
}

describe("re-framing a moving simulation in 3D", () => {
    it("puts the camera in the same place on both paths", async () => {
        const objects = await cameraInMotion("objects");
        const again = await cameraInMotion("objects");
        assert.equal(differences(objects, again).join("; "), "", "two objects loads frame the moving graph alike");
        const batched = await cameraInMotion("batched");
        assert.equal(differences(objects, batched).join("; "), "", "objects and batched frame the moving graph alike");
    });
});
