// `window.__sandbox`, installed only with `?emulate=`: read-only state for the dry run, plus a driver
// that moves the emulated head, hands and controllers through IWER. The rule (plan section 1.4):
// arrange through the hook, act through emulated input, assert through the log and the hook. A
// press made here goes through IWER, Babylon, the arbiter and the technique exactly as on a headset.

import { type Scene, Vector3, type WebXRDefaultExperience } from "@babylonjs/core";
import { lookRotation, type XRDevice } from "iwer";

import type { Hand } from "../core/arbiter";
import type { FrameStats } from "../scene/frame-stats";
import type { GraphView } from "../scene/graph-view";
import { uiStats } from "../scene/ui";
import type { GearPanel } from "./gear-panel";
import type { Framework } from "./runtime";

interface HookDeps {
    device: XRDevice;
    scene: Scene;
    xr: WebXRDefaultExperience;
    fw: Framework;
    graph: GraphView;
    stats: FrameStats;
    gear: GearPanel;
    preset: string;
    presets: string[];
}

const BUTTON_IDS: Record<string, string> = {
    trigger: "trigger",
    squeeze: "squeeze",
    a: "a-button",
    b: "b-button",
    x: "x-button",
    y: "y-button",
    stick: "thumbstick",
};

/**
 * Install `window.__sandbox`.
 * @param d - what the hooks read and drive
 */
export function installTestHooks(d: HookDeps): void {
    const { device, scene, xr, fw, graph, stats } = d;
    const { camera } = xr.baseExperience;

    // Babylon's scene is left-handed: an XR pose (x, y, z) is drawn at (x, y, -z), offset by
    // nothing when the camera has no parent, which holds here (nothing ever moves the camera).
    const toXR = (v: Vector3): { x: number; y: number; z: number } => ({ x: v.x, y: v.y, z: -v.z });
    const fromXR = (p: { x: number; y: number; z: number }): Vector3 => new Vector3(p.x, p.y, -p.z);

    const input = (
        hand: Hand,
    ):
        | {
              position: { set(x: number, y: number, z: number): unknown; x: number; y: number; z: number };
              quaternion: { set(x: number, y: number, z: number, w: number): unknown };
          }
        | undefined => (device.primaryInputMode === "hand" ? device.hands[hand] : device.controllers[hand]);

    const targetOf = (what: string): Vector3 => {
        if (what === "gear") {
            return d.gear.button.mesh.getAbsolutePosition().clone();
        }
        if (what === "space") {
            return camera.globalPosition.add(new Vector3(0, 1.2, 0.3));
        }
        const i = graph.data.names.indexOf(what);
        if (i < 0) {
            // Any mesh by name, so a technique's check can aim at its own buttons.
            const mesh = scene.getMeshByName(what);
            if (mesh) {
                return mesh.getAbsolutePosition().clone();
            }
            throw new Error(`no node or mesh named ${what}`);
        }
        return graph.nodeWorld(i, new Vector3());
    };

    const api = {
        ready: true,
        preset: d.preset,
        presets: d.presets,
        // The node with the highest PageRank, a target on either graph.
        topNode: () => graph.data.names[graph.data.order.pagerank[0]],
        sessionId: fw.log.sessionId,
        inXR: () => xr.baseExperience.sessionManager.inXRSession,
        xrFrames: () => stats.count,
        frames: (n?: number) => stats.summary(n),
        techniques: () => fw.techniques.map((t) => ({ id: t.id, on: fw.isOn(t.id), reason: fw.reason(t.id) })),
        log: (n = 200) =>
            fw.log.tail.slice(-n).map((e) => ({ time: e.time, message: e.message, level: e.level, data: e.data })),
        wins: () => fw.wins.slice(),
        hover: (hand: Hand) => ({ ...fw.input?.hands[hand], origin: undefined, dir: undefined, source: undefined }),
        state: () => ({
            selection: [...fw.commands.state.selection].map((i) => graph.data.names[i]),
            colorBy: fw.commands.state.colorBy,
            history: fw.commands.history.map((h) => h.label),
            undoLabel: fw.commands.undoLabel(),
        }),
        gearOpen: () => d.gear.panel.visible,
        debug: () => {
            const left = fw.input?.hands.left;
            return {
                gear: d.gear.button.mesh.getAbsolutePosition().asArray(),
                gearEnabled: d.gear.button.mesh.isEnabled(),
                origin: left?.origin.asArray(),
            // The open preview (the graph's tint), or null: a cancelled pull or sieve must leave none.
            preview: fw.commands.preview && { owner: fw.commands.preview.owner, keep: fw.commands.preview.keep.size },
                dir: left?.dir.asArray(),
                camera: camera.globalPosition.asArray(),
                device: [device.position.x, device.position.y, device.position.z],
                controller: device.controllers.left
                    ? [
                          device.controllers.left.position.x,
                          device.controllers.left.position.y,
                          device.controllers.left.position.z,
                      ]
                    : null,
            };
        },
        uiStats: () => ({ ...uiStats }),
        counts: () => ({ meshes: scene.meshes.length, beforeRender: scene.onBeforeRenderObservable.observers.length }),
        /**
         * IWER's remote control (get_transform, look_at, animate_to, ...), for checks that move the
         * head or a hand over several frames. Poses are in XR coordinates (z is Babylon's -z).
         * @param method - the remote method
         * @param params - its params
         * @returns its result
         */
        dispatch: (method: string, params: Record<string, unknown>) => device.remote.dispatch(method, params),
        /**
         * Aim a hand or controller at a world point (Babylon meters).
         * @param hand - which hand
         * @param x - meters
         * @param y - meters
         * @param z - meters
         */
        aimAt(hand: Hand, x: number, y: number, z: number) {
            const src = input(hand);
            if (!src) {
                throw new Error(`no ${device.primaryInputMode} for ${hand}`);
            }
            const q = lookRotation(toXR(new Vector3(x, y, z).subtract(fromXR(src.position))));
            src.quaternion.set(q.x, q.y, q.z, q.w);
        },
        setOn: (id: string, on: boolean) => {
            fw.setOn(id, on);
        },
        /**
         * Aim a hand or controller at a node (by name), "gear" or "space".
         * @param hand - which hand
         * @param what - a node name, "gear" or "space"
         */
        aim(hand: Hand, what: string) {
            const src = input(hand);
            if (!src) {
                throw new Error(`no ${device.primaryInputMode} for ${hand}`);
            }
            const from = fromXR(src.position);
            const dir = targetOf(what).subtract(from);
            const q = lookRotation(toXR(dir));
            src.quaternion.set(q.x, q.y, q.z, q.w);
        },
        /**
         * Aim at a target with seeded tremor for `frames` frames: a per-frame angular offset that
         * follows a smoothed random walk whose spread is about `sdDeg` (the noisy-hands check).
         * @param hand - which hand
         * @param what - as for aim
         * @param sdDeg - spread of the offset, degrees
         * @param frames - rendered frames to keep it up
         * @param seed - the noise seed
         * @returns when done
         */
        noisyAim(hand: Hand, what: string, sdDeg: number, frames: number, seed = 1): Promise<void> {
            let s = seed >>> 0;
            const rnd = (): number => {
                s = (s + 0x6d2b79f5) >>> 0;
                let t = Math.imul(s ^ (s >>> 15), 1 | s);
                t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
            const gauss = (): number => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());
            // AR(1) with a = 0.8: a step of 0.6 sd keeps the stationary spread at sd.
            const off = [0, 0];
            let n = 0;
            return new Promise((resolve) => {
                const obs = scene.onAfterRenderObservable.add(() => {
                    const src = input(hand);
                    if (!src) {
                        return;
                    }
                    off[0] = 0.8 * off[0] + 0.6 * gauss() * sdDeg;
                    off[1] = 0.8 * off[1] + 0.6 * gauss() * sdDeg;
                    const from = fromXR(src.position);
                    const dir = targetOf(what).subtract(from);
                    const right = Vector3.Cross(dir, Vector3.Up()).normalize();
                    const up = Vector3.Cross(right, dir).normalize();
                    const len = dir.length();
                    dir.addInPlace(right.scale(len * Math.tan((off[0] * Math.PI) / 180)));
                    dir.addInPlace(up.scale(len * Math.tan((off[1] * Math.PI) / 180)));
                    const q = lookRotation(toXR(dir));
                    src.quaternion.set(q.x, q.y, q.z, q.w);
                    if (++n >= frames) {
                        scene.onAfterRenderObservable.remove(obs);
                        resolve();
                    }
                });
            });
        },
        /**
         * Put a hand or controller at a position (meters, Babylon world).
         * @param hand - which hand
         * @param x - meters
         * @param y - meters
         * @param z - meters
         */
        place(hand: Hand, x: number, y: number, z: number) {
            const p = toXR(new Vector3(x, y, z));
            input(hand)?.position.set(p.x, p.y, p.z);
        },
        /**
         * Press or release: trigger, squeeze, pinch, or a button (a, b, x, y, stick).
         * @param hand - which hand
         * @param kind - trigger, squeeze, pinch, a, b, x, y or stick
         * @param down - press or release
         */
        press(hand: Hand, kind: string, down: boolean) {
            if (kind === "pinch") {
                const h = device.hands[hand];
                if (!h) {
                    throw new Error(`no hand ${hand}`);
                }
                h.poseId = down ? "pinch" : "default";
                h.updatePinchValue(down ? 1 : 0);
                return;
            }
            const c = device.controllers[hand];
            if (!c) {
                throw new Error(`no controller ${hand}`);
            }
            c.updateButtonValue(BUTTON_IDS[kind] ?? kind, down ? 1 : 0);
        },
        /**
         * Run a command from "dryrun" (arrange only, never the act under test).
         * @param code - the command code
         * @param params - its params
         * @returns the command record
         */
        run: (code: string, params: unknown) =>
            fw.commands.run(code as "select", params as { ids: number[] }, { technique: "dryrun" }),
        /**
         * Watch `frames` rendered frames and report the largest per-frame movement of the graph root
         * and of every visible mesh, and how many GUI textures redrew.
         * @param frames - frames to watch
         * @returns the largest movement, in mm and degrees, and the mesh that made it
         */
        jitter(frames: number): Promise<{
            frames: number;
            maxMm: number;
            maxDeg: number;
            worst: string;
            panelRenders: number;
            chipRedraws: number;
            rebuilds: number;
        }> {
            // Rotation is measured as the change of each normalized basis column (small-angle radians),
            // not by acos of a quaternion dot, whose float32 floor alone reads about 0.02 degrees.
            const prev = new Map<string, Float64Array>();
            const ui0 = { ...uiStats };
            const rebuilds0 = graph.rebuilds;
            let n = 0;
            let maxMm = 0;
            let maxDeg = 0;
            let worst = "";
            const basis = (m: ArrayLike<number>, c: number): [number, number, number] => {
                const x = m[c * 4];
                const y = m[c * 4 + 1];
                const z = m[c * 4 + 2];
                const l = Math.hypot(x, y, z) || 1;
                return [x / l, y / l, z / l];
            };
            return new Promise((resolve) => {
                const obs = scene.onAfterRenderObservable.add(() => {
                    const nodes = [graph.root, ...scene.meshes.filter((m) => m.isEnabled() && m.isVisible)];
                    for (const m of nodes) {
                        const w = m.computeWorldMatrix(false).m;
                        const cur = new Float64Array([
                            ...basis(w, 0),
                            ...basis(w, 1),
                            ...basis(w, 2),
                            w[12],
                            w[13],
                            w[14],
                        ]);
                        const key = `${m.name}#${m.uniqueId}`;
                        const last = prev.get(key);
                        if (last && n > 0) {
                            const mm = Math.hypot(cur[9] - last[9], cur[10] - last[10], cur[11] - last[11]) * 1000;
                            let rad = 0;
                            for (let c = 0; c < 9; c += 3) {
                                rad = Math.max(
                                    rad,
                                    Math.hypot(cur[c] - last[c], cur[c + 1] - last[c + 1], cur[c + 2] - last[c + 2]),
                                );
                            }
                            const deg = (rad * 180) / Math.PI;
                            if (mm > maxMm || deg > maxDeg) {
                                worst = `${key} ${mm.toFixed(4)} mm ${deg.toFixed(5)} deg`;
                            }
                            maxMm = Math.max(maxMm, mm);
                            maxDeg = Math.max(maxDeg, deg);
                        }
                        prev.set(key, cur);
                    }
                    if (++n > frames) {
                        scene.onAfterRenderObservable.remove(obs);
                        resolve({
                            frames,
                            maxMm,
                            maxDeg,
                            worst,
                            panelRenders: uiStats.panelRenders - ui0.panelRenders,
                            chipRedraws: uiStats.chipRedraws - ui0.chipRedraws,
                            rebuilds: graph.rebuilds - rebuilds0,
                        });
                    }
                });
            });
        },
    };
    (window as unknown as { __sandbox: typeof api }).__sandbox = api;
}
