// `window.__sandbox`, installed only with `?emulate=`: read-only state for the dry run, plus a driver
// that moves the emulated head, hands and controllers through IWER. The rule (plan section 1.4):
// arrange through the hook, act through emulated input, assert through the log and the hook. A
// press made here goes through IWER, Babylon, the arbiter and the technique exactly as on a headset.

import { type Scene, UtilityLayerRenderer, Vector3, type WebXRDefaultExperience } from "@babylonjs/core";
import { lookRotation, type XRDevice } from "iwer";

import type { Hand } from "../core/arbiter";
import type { FrameStats } from "../scene/frame-stats";
import type { GraphView } from "../scene/graph-view";
import { controlWorld, panels, uiStats } from "../scene/ui";
import type { GearPanel } from "./gear-panel";
import type { Framework } from "./runtime";
import { degrees, type FitIssue, fitProblems, HAND_M, measureText, MIN_CAP_DEG, NEAREST_M } from "./text-audit";

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

// Whether a mesh is drawn (the steadiness probe measures only those).
const isShown = (m: { isEnabled(): boolean; isVisible: boolean }): boolean => m.isEnabled() && m.isVisible;

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
              quaternion: {
                  set(x: number, y: number, z: number, w: number): unknown;
                  x: number;
                  y: number;
                  z: number;
                  w: number;
              };
          }
        | undefined => (device.primaryInputMode === "hand" ? device.hands[hand] : device.controllers[hand]);

    const lastControl = new Map<string, Vector3>();
    const shownControl = (name: string, hiddenToo = false): Vector3 | null => {
        for (const p of panels) {
            const c = p.adt.getControlByName(name);
            if (c && (hiddenToo || p.mesh.isEnabled())) {
                return controlWorld(p.mesh, p.adt, c);
            }
        }
        return null;
    };

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
            // GUI 3D controls live in the default utility layer's scene.
            const mesh =
                scene.getMeshByName(what) ??
                UtilityLayerRenderer.DefaultUtilityLayer.utilityLayerScene.getMeshByName(what);
            if (mesh) {
                // The middle of what is drawn: a panel that fits its content is not centered on its origin.
                // (Computing the world matrix also updates the bounds of a mesh that is not drawn.)
                mesh.computeWorldMatrix(true);
                return mesh.getBoundingInfo().boundingBox.centerWorld.clone();
            }
            // A GUI control on a shown panel, or where it last was (to press where a closed menu was),
            // or where its hidden panel is.
            const at = shownControl(what) ?? lastControl.get(what) ?? shownControl(what, true);
            if (at) {
                lastControl.set(what, at);
                return at.clone();
            }
            throw new Error(`no node, mesh or control named ${what}`);
        }
        return graph.nodeWorld(i, new Vector3());
    };

    // The text fit audit (dryrun/fit.mjs): from fitStart on, every 10 rendered frames, measure every
    // line of text shown; keep each overflow, the closest view of each line, and a capture of each
    // surface the first few times its text changes.
    const fit = {
        on: false,
        issues: new Map<string, FitIssue>(),
        views: new Map<
            string,
            { surface: string; control: string; text: string; capMm: number; distM: number; deg: number }
        >(),
        sigs: new Map<string, Set<string>>(),
        captures: [] as { surface: string; n: number; png: string; texts: string[] }[],
    };
    let fitTick = 0;
    // A problem counts, and a surface is captured, only when the next measurement 10 frames later
    // sees the same: a panel that fits its content resizes a frame after its text changes.
    let lastProblems = new Set<string>();
    const lastSig = new Map<string, string>();
    scene.onAfterRenderObservable.add(() => {
        if (!fit.on || ++fitTick % 10 !== 0) {
            return;
        }
        const canvases = new Map<string, unknown>();
        const ms = measureText(scene, camera.globalPosition, canvases);
        const bySurface = new Map<string, string[]>();
        const problems = new Set<string>();
        for (const m of ms) {
            for (const p of fitProblems(m)) {
                const k = `${p.surface}|${p.control}|${p.text}|${p.problem}`;
                problems.add(k);
                if (lastProblems.has(k)) {
                    fit.issues.set(k, p);
                }
            }
            const key = `${m.surface}|${m.control}|${m.text}`;
            const deg = degrees(m.capM, Math.max(m.distM, NEAREST_M));
            const best = fit.views.get(key);
            if (!best || deg > best.deg) {
                fit.views.set(key, {
                    surface: m.surface,
                    control: m.control,
                    text: m.text,
                    capMm: Math.round(m.capM * 10000) / 10,
                    distM: Math.round(m.distM * 100) / 100,
                    deg: Math.round(deg * 100) / 100,
                });
            }
            bySurface.set(m.surface, [...(bySurface.get(m.surface) ?? []), m.text]);
        }
        lastProblems = problems;
        for (const [surface, texts] of bySurface) {
            const sig = texts.join("\n");
            const steady = lastSig.get(surface) === sig;
            lastSig.set(surface, sig);
            if (!steady) {
                continue;
            }
            const seen = fit.sigs.get(surface) ?? new Set<string>();
            fit.sigs.set(surface, seen);
            const c = canvases.get(surface) as HTMLCanvasElement | undefined;
            if (seen.has(sig) || seen.size >= 6 || typeof c?.toDataURL !== "function") {
                continue;
            }
            seen.add(sig);
            fit.captures.push({ surface, n: seen.size, png: c.toDataURL("image/png"), texts });
        }
    });

    const api = {
        ready: true,
        /** Start the text fit audit (see `fit` above). */
        fitStart() {
            fit.on = true;
        },
        /**
         * The text fit audit so far: every overflow, and every line whose cap height at the closest
         * view the run had (never nearer than NEAREST_M) is under MIN_CAP_DEG.
         * @returns the problems, and how many lines and surfaces were seen
         */
        fitReport() {
            const small = [...fit.views.values()]
                .filter((v) => v.deg < MIN_CAP_DEG)
                .map((v) => ({
                    surface: v.surface,
                    control: v.control,
                    text: v.text,
                    problem: "too-small" as const,
                    detail: `cap ${v.capMm} mm at ${v.distM} m = ${v.deg} deg (needs ${MIN_CAP_DEG})`,
                }));
            return {
                rule: `cap height at least ${MIN_CAP_DEG} deg at the closest view, never nearer than ${NEAREST_M} m (hand-borne text: never farther than ${HAND_M} m)`,
                issues: [...fit.issues.values(), ...small],
                lines: fit.views.size,
                surfaces: [...fit.sigs.keys()],
            };
        },
        /**
         * The surface captures taken since the last call (PNG data URLs).
         * @returns the captures
         */
        fitCaptures() {
            return fit.captures.splice(0);
        },
        preset: d.preset,
        presets: d.presets,
        // The node with the highest PageRank, a target on either graph.
        topNode: () => graph.data.names[graph.data.order.pagerank[0]],
        /**
         * The node ranked `k`th by PageRank, for the journey's "Which family ranks #k?".
         * @param k - the rank, 1 for the top
         * @returns its name
         */
        byRank: (k: number) => graph.data.names[graph.data.order.pagerank[k - 1]],
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
            // The open preview (the graph's tint), or null: a cancelled pull or sieve must leave none.
            preview: fw.commands.preview && { owner: fw.commands.preview.owner, keep: fw.commands.preview.keep.size },
        }),
        gearOpen: () => d.gear.panel.visible,
        debug: () => {
            const left = fw.input?.hands.left;
            return {
                gear: d.gear.button.mesh.getAbsolutePosition().asArray(),
                gearEnabled: d.gear.button.mesh.isEnabled(),
                origin: left?.origin.asArray(),
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
        /**
         * The world center of a GUI control on any shown framework panel (the steps panel's Done,
         * a canned chip), for `aimAt` or a poke.
         * @param name - the control's name
         * @returns its center in world meters, or null when no shown panel has it
         */
        control(name: string): number[] | null {
            return shownControl(name)?.asArray() ?? null;
        },

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
         * Turn a hand or controller about an axis through itself, on top of its orientation now
         * (XR space: +y up, +z toward the viewer). Rolling the off hand palm up needs this; aim never rolls.
         * @param hand - which hand
         * @param axis - the axis, XR space
         * @param deg - degrees, right-handed about the axis
         */
        turn(hand: Hand, axis: [number, number, number], deg: number) {
            const q = input(hand)?.quaternion;
            if (!q) {
                return;
            }
            const l = Math.hypot(...axis) || 1;
            const s = Math.sin((deg * Math.PI) / 360) / l;
            const [ax, ay, az, aw] = [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos((deg * Math.PI) / 360)];
            // r * q (Hamilton product): the turn is applied in world (XR) axes.
            q.set(
                aw * q.x + ax * q.w + ay * q.z - az * q.y,
                aw * q.y - ax * q.z + ay * q.w + az * q.x,
                aw * q.z + ax * q.y - ay * q.x + az * q.w,
                aw * q.w - ax * q.x - ay * q.y - az * q.z,
            );
        },
        /**
         * Press or release: trigger, squeeze, pinch, or a button (a, b, x, y, stick).
         * @param hand - which hand
         * @param kind - trigger, squeeze, pinch, fist, a, b, x, y or stick
         * @param down - press or release
         */
        press(hand: Hand, kind: string, down: boolean) {
            if (kind === "pinch" || kind === "fist") {
                const h = device.hands[hand];
                if (!h) {
                    throw new Error(`no hand ${hand}`);
                }
                // The fist pose is added by emulate.ts; the pose layer turns it into the hand's squeeze.
                h.poseId = down ? kind : "default";
                if (kind === "pinch") {
                    h.updatePinchValue(down ? 1 : 0);
                }
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
                    const nodes = [graph.root, ...scene.meshes.filter(isShown)];
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
    (globalThis as unknown as { __sandbox: typeof api }).__sandbox = api;
}
