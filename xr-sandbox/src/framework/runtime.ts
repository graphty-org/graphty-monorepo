// The framework runtime: the registry of techniques (prepared at boot, switched on and off in the
// headset), the technique context, the arbiter and the frame loop that feeds it (design sections
// 4 and 5). Techniques never touch Babylon input; this is where input becomes presses.

import { type Scene, TransformNode, Vector3, type WebXRDefaultExperience } from "@babylonjs/core";

import { type Arbiter, createArbiter, type Hand, type OwnedClaim, type PressStart, TAP_CLAIM } from "../core/arbiter";
import type { Commands } from "../core/commands";
import { click } from "../scene/audio";
import type { FrameStats } from "../scene/frame-stats";
import type { GraphView } from "../scene/graph-view";
import { createPoseLayer, type PoseLayer } from "../scene/poses";
import { type Chip, createChip, createPanel } from "../scene/ui";
import { handTracking } from "../scene/xr";
import { createInput, type Edge, type HandState, type InputLayer } from "./input";
import type { Logger } from "./logging";
import type { Settings } from "./settings";
import type { HoverInfo, PressSession, TargetProvider, Technique, TechniqueContext, ToolOffer } from "./technique";
import { createTextSeam } from "./text-seam";

/** Framework actions, filled in by the panels that implement them. */
export interface FrameworkActions {
    toggleGear(): void;
    toggleSteps(): void;
    recenter(): void;
    resetView(): void;
    flag(): void;
    saveAsPreset(): void;
    save(): void;
}

/** The framework runtime. */
export interface Framework {
    readonly techniques: readonly Technique[];
    readonly settings: Settings;
    readonly commands: Commands;
    readonly log: Logger;
    readonly arbiter: Arbiter;
    readonly poses: PoseLayer;
    readonly input: InputLayer | null;
    actions: FrameworkActions;
    /** Who won the last presses, newest last (for the dry run and the log panel). */
    readonly wins: { hand: Hand; owner: string; how: string; context: string; target: number }[];
    isOn(id: string): boolean;
    setOn(id: string, on: boolean): void;
    /** Why a technique cannot be used now, or null. */
    reason(id: string): string | null;
    /** The live claims: switched-on techniques plus the framework's tap. */
    claims(): OwnedClaim[];
    dominant(): Hand;
    /** Prepare every technique and switch on the preset's. */
    start(initial: readonly string[]): Promise<void>;
    /** Called when the XR experience exists (after IWER is installed when emulating). */
    attachXR(xr: WebXRDefaultExperience): void;
    /** Run once per XR frame. */
    frame(now: number): void;
    readonly armed: { microphone: boolean };
}

const IDLE: HoverInfo = { node: -1, context: "space", isHand: false, connected: false };

/**
 * Create the framework.
 * @param scene - the scene
 * @param graph - the graph view
 * @param commands - the command layer
 * @param settings - the settings store
 * @param log - the logger
 * @param stats - frame statistics, for hook time
 * @param techniques - the registry
 * @returns the framework
 */
export function createFramework(
    scene: Scene,
    graph: GraphView,
    commands: Commands,
    settings: Settings,
    log: Logger,
    stats: FrameStats,
    techniques: readonly Technique[],
): Framework {
    let xr: WebXRDefaultExperience | null = null;
    let input: InputLayer | null = null;
    const on = new Set<string>();
    const hooks = new Map<string, ((dt: number) => void)[]>();
    const sessions = new Map<number, PressSession | null>();
    const live = new Map<string, { press: PressStart; startOrigin: Vector3 }>();
    const wins: Framework["wins"] = [];
    const armed = { microphone: false };
    let pressId = 0;
    let lastFrame = 0;
    const dominant = (): Hand => (settings.get("framework.dominantHand") === "left" ? "left" : "right");
    const off = (h: Hand): Hand => (h === "left" ? "right" : "left");
    // The tools seam (plan section 1.3): offered tools by id, and which provider each hand holds.
    const toolOffers = new Map<string, { owner: string; tool: ToolOffer }>();
    const toolHeld: Record<Hand, string | null> = { left: null, right: null };
    const toolReason = (id: string): string | null => {
        const o = toolOffers.get(id);
        if (!o) {
            return `no tool ${id}`;
        }
        return on.has(o.owner) ? null : `${techniques.find((x) => x.id === o.owner)?.name ?? o.owner} is off`;
    };

    const anchors = {
        "hand-left": new TransformNode("anchor-hand-left", scene),
        "hand-right": new TransformNode("anchor-hand-right", scene),
        "graph-top": new TransformNode("anchor-graph-top", scene),
    };
    anchors["graph-top"].parent = graph.root;
    anchors["graph-top"].position.set(0, 0.32, 0);
    const providers: Record<Hand, TargetProvider | null> = { left: null, right: null };
    const textSeam = createTextSeam(scene, (m, d) => {
        log.log(m, d);
    });

    const badges: Record<Hand, Chip> = {
        left: createChip(scene, "badge-left", 0.1, 0.022, true),
        right: createChip(scene, "badge-right", 0.1, 0.022, true),
    };
    const hints: Record<Hand, Chip> = {
        left: createChip(scene, "hint-left", 0.16, 0.02, true),
        right: createChip(scene, "hint-right", 0.16, 0.02, true),
    };
    const badgeTimers: Record<Hand, ReturnType<typeof setTimeout> | undefined> = { left: undefined, right: undefined };
    for (const h of ["left", "right"] as const) {
        badges[h].mesh.parent = anchors[`hand-${h}`];
        badges[h].mesh.position.set(0, 0.07, 0);
        hints[h].mesh.parent = anchors[`hand-${h}`];
        hints[h].mesh.position.set(0, 0.1, 0);
    }
    const nameOf = (owner: string): string =>
        owner === "framework" ? "Select" : (techniques.find((t) => t.id === owner)?.name ?? owner);
    const colorOf = (owner: string): string =>
        owner === "framework" ? "#3a4660" : (techniques.find((t) => t.id === owner)?.color ?? "#3a4660");

    const claims = (): OwnedClaim[] => [
        ...techniques.filter((t) => on.has(t.id)).flatMap((t) => t.claims.map((claim) => ({ owner: t.id, claim }))),
        { owner: "framework", claim: TAP_CLAIM },
    ];

    const poses = createPoseLayer(() => (xr ? handTracking(xr) : null));

    const arbiter = createArbiter(
        claims,
        {
            win(w) {
                const h = w.press.hand;
                wins.push({ hand: h, owner: w.owner, how: w.how, context: w.press.context, target: w.press.target });
                if (wins.length > 50) {
                    wins.shift();
                }
                log.log("arbiter.win", {
                    hand: h,
                    channel: w.press.channel,
                    detail: w.press.detail,
                    context: w.press.context,
                    target: w.press.target >= 0 ? graph.data.names[w.press.target] : null,
                    technique: w.owner,
                    losers: w.losers,
                    how: w.how,
                    hoverHints: settings.get("framework.hoverHints"),
                    pose: poses.hands[h],
                });
                if (settings.get("framework.audioClicks")) {
                    click(1100);
                }
                badges[h].set(nameOf(w.owner), colorOf(w.owner));
                badges[h].show();
                clearTimeout(badgeTimers[h]);
                if (w.owner === "framework") {
                    sessions.set(w.press.id, null);
                    return;
                }
                const t = techniques.find((x) => x.id === w.owner);
                sessions.set(w.press.id, t?.onPress?.({ press: w.press, claim: w.claim }, h) ?? null);
            },
            end(press, owner) {
                const s = sessions.get(press.id);
                sessions.delete(press.id);
                if (owner === "framework") {
                    tap(press);
                } else {
                    s?.end?.();
                }
                badgeTimers[press.hand] = globalThis.setTimeout(() => {
                    badges[press.hand].hide();
                }, 1000);
            },
            cancel(press, owner, reason) {
                const s = sessions.get(press.id);
                sessions.delete(press.id);
                s?.cancel?.(reason);
                log.log("cancel", { hand: press.hand, channel: press.channel, technique: owner, reason });
                badges[press.hand].hide();
            },
            drop(press, reason) {
                if (reason !== "ui") {
                    log.log("arbiter.drop", {
                        hand: press.hand,
                        channel: press.channel,
                        detail: press.detail,
                        context: press.context,
                        reason,
                    });
                }
            },
        },
        dominant,
    );

    const tap = (p: PressStart): void => {
        if (p.target >= 0) {
            commands.run("select", { ids: [p.target] }, { technique: "framework", hand: p.hand });
        } else if (commands.state.selection.size > 0) {
            commands.run("select", { ids: [] }, { technique: "framework", hand: p.hand });
        }
    };

    const ctxFor = (t: Technique): TechniqueContext => {
        const list: ((dt: number) => void)[] = [];
        hooks.set(t.id, list);
        const source = (hand?: Hand): { technique: string; hand?: Hand } => ({ technique: t.id, hand });
        return {
            scene,
            xr: () => xr,
            graph,
            state: commands.state,
            hover: (h) => input?.hands[h] ?? IDLE,
            poses: (h) => poses.hands[h],
            dominant,
            commands: {
                run: (code, params, hand) => commands.run(code, params, source(hand)),
                preview: (code, params, hand) => commands.startPreview(code, params, source(hand)),
                undo: (hand) => {
                    commands.undo(source(hand));
                },
                redo: (hand) => {
                    commands.redo(source(hand));
                },
                undoLabel: () => commands.undoLabel(),
                history: () => commands.history,
                undoTo: (i, hand) => {
                    commands.undoTo(i, source(hand));
                },
            },
            anchor: (name) => anchors[name],
            ui: {
                panel: (name, w, h, px) => createPanel(scene, `${t.id}-${name}`, w, h, px),
                chip: (name, w, h, billboard) => createChip(scene, `${t.id}-${name}`, w, h, billboard),
            },
            settings: {
                bool: (k) => settings.get(`${t.id}.${k}`) === true,
                num: (k) => Number(settings.get(`${t.id}.${k}`)),
                str: (k) => String(settings.get(`${t.id}.${k}`)),
                framework: (k) => settings.get(`framework.${k}`),
                onChange: (fn) => {
                    settings.onChange(t.id, fn);
                },
            },
            log: (message, data) => {
                log.log(`${t.id}.${message}`, { technique: t.id, ...data });
            },
            onFrame: (fn) => list.push(fn),
            target: {
                provide: (hand, p) => {
                    providers[hand] = p;
                },
            },
            framework: {
                toggleGear: () => {
                    fw.actions.toggleGear();
                },
                toggleSteps: () => {
                    fw.actions.toggleSteps();
                },
                recenter: () => {
                    fw.actions.recenter();
                },
                flag: () => {
                    fw.actions.flag();
                },
                save: () => {
                    fw.actions.save();
                },
            },
            text: {
                request: (r) => textSeam.request(r),
                provide: (fn) => {
                    textSeam.provide(fn);
                },
            },
            tools: {
                offer: (tool) => {
                    toolOffers.set(tool.id, { owner: t.id, tool });
                },
                take: (id, hand) => {
                    const why = toolReason(id);
                    if (!why) {
                        toolOffers.get(id)?.tool.take(hand);
                    }
                    return why;
                },
                reason: toolReason,
                hold: (hand, id) => {
                    toolHeld[hand] = id === null ? null : t.id;
                },
            },
        };
    };

    // Why the session's current inputs cannot serve a technique's needs, or null.
    const inputReason = (needs: readonly string[]): string | null => {
        const inputs = xr?.input.controllers ?? [];
        if (!xr?.baseExperience.sessionManager.inXRSession || inputs.length === 0) {
            return null;
        }
        if (needs.includes("controllers") && !inputs.some((c) => !c.inputSource.hand && c.inputSource.gamepad)) {
            return "needs controllers (none connected)";
        }
        if (needs.includes("hand-joints") && !inputs.some((c) => c.inputSource.hand)) {
            return "needs hand tracking";
        }
        if (
            needs.includes("hover") &&
            inputs.every((c) => (c.inputSource.targetRayMode as string) === "transient-pointer")
        ) {
            return "needs hover (this input is a transient pointer)";
        }
        return null;
    };

    const reason = (id: string): string | null => {
        const t = techniques.find((x) => x.id === id);
        if (!t) {
            return "unknown technique";
        }
        if (t.unavailable) {
            return t.unavailable;
        }
        if (t.arm === "microphone" && !armed.microphone) {
            return "unarmed: tick the microphone on the landing page";
        }
        const needs = t.needs ?? [];
        const why = inputReason(needs);
        if (why) {
            return why;
        }
        if (needs.includes("quest-microgestures") && !/OculusBrowser/.test(navigator.userAgent)) {
            return "Quest only";
        }
        return null;
    };

    const setOn = (id: string, want: boolean): void => {
        const t = techniques.find((x) => x.id === id);
        if (!t || want === on.has(id) || (want && (t.unavailable || (t.arm && !armed.microphone)))) {
            return;
        }
        const t0 = performance.now();
        if (want) {
            on.add(id);
            t.activate();
        } else {
            // Design section 4.1: cancel its previews, release its presses as cancel, then hide.
            if (commands.preview?.owner === id) {
                commands.undo({ technique: "framework" });
            }
            arbiter.cancelOwner(id, "switched off");
            on.delete(id);
            t.deactivate();
        }
        log.log("toggle", { technique: id, on: want, ms: Math.round((performance.now() - t0) * 10) / 10 });
        log.context.enabled = [...on];
    };

    const handleEdge = (e: Edge, now: number): void => {
        const key = `${e.hand}.${e.channel}.${e.detail ?? ""}`;
        if (!e.down) {
            const l = live.get(key);
            if (l) {
                live.delete(key);
                arbiter.end(l.press.id, now);
            }
            return;
        }
        // Reserved for the framework, never arbitrated (design section 5.8).
        if (e.channel === "button" && e.detail === "stick") {
            const other = live.has(`${off(e.hand)}.button.stick`);
            if (other) {
                fw.actions.flag();
            } else if (e.hand === off(dominant())) {
                fw.actions.toggleGear();
            }
            live.set(key, {
                press: {
                    id: ++pressId,
                    hand: e.hand,
                    channel: e.channel,
                    detail: e.detail,
                    context: "space",
                    target: -1,
                    time: now,
                },
                startOrigin: Vector3.Zero(),
            });
            return;
        }
        const h = input?.hands[e.hand];
        const press: PressStart = {
            id: ++pressId,
            hand: e.hand,
            channel: e.channel,
            detail: e.detail,
            context: h?.context ?? "space",
            target: input ? input.stabilizedTarget(e.hand, now) : -1,
            time: now,
        };
        if (press.context === "node" && press.target < 0) {
            press.context = "graph";
        }
        // A hand holding a tool (design section 5.3): its select and squeeze go to the tool's provider.
        const holder = toolHeld[e.hand];
        if (holder && on.has(holder) && press.context !== "ui" && (e.channel === "select" || e.channel === "squeeze")) {
            press.context = "tool";
            press.detail = holder;
        }
        live.set(key, { press, startOrigin: (h?.origin ?? Vector3.Zero()).clone() });
        arbiter.start(press);
    };

    const movedOf = (id: number): number => {
        for (const l of live.values()) {
            if (l.press.id === id) {
                const h = input?.hands[l.press.hand];
                return h ? Vector3.Distance(h.origin, l.startOrigin) : 0;
            }
        }
        return 0;
    };

    const hintKeys: Record<Hand, string> = { left: "", right: "" };
    const updateHint = (hand: Hand): void => {
        const h = input?.hands[hand];
        const show = !!h?.connected && h.context !== "ui" && settings.get("framework.hoverHints") === true;
        const key = show && h ? `${h.context}.${h.isHand}.${on.size}` : "";
        if (key === hintKeys[hand]) {
            return;
        }
        hintKeys[hand] = key;
        if (!show || !h) {
            hints[hand].hide();
            return;
        }
        const sel = arbiter.candidates(hand, "select", h.context).map((c) => nameOf(c.owner));
        const sq = arbiter.candidates(hand, "squeeze", h.context).map((c) => nameOf(c.owner));
        const parts = [`${h.isHand ? "pinch" : "trigger"}: ${sel.join(" / ") || "-"}`];
        if (sq.length) {
            parts.push(`${h.isHand ? "fist" : "grip"}: ${sq.join(" / ")}`);
        }
        hints[hand].set(parts.join("; "), "#2a3346");
        hints[hand].show();
    };
    const updateHints = (): void => {
        updateHint("left");
        updateHint("right");
    };

    // Tell each press's session how long it has been held and how far its hand has moved.
    const moveSessions = (now: number): void => {
        for (const [id, s] of sessions) {
            if (!s?.move) {
                continue;
            }
            for (const l of live.values()) {
                if (l.press.id === id) {
                    s.move({ durationMs: now - l.press.time, movedM: movedOf(id) });
                }
            }
        }
    };

    // Point each hand's hover and anchor at its current input.
    const syncHands = (hands: Record<Hand, HandState>): void => {
        for (const hand of ["left", "right"] as const) {
            const h = hands[hand];
            graph.setHover(hand, h.context === "node" ? h.node : -1);
            const node = h.source?.grip ?? h.source?.pointer ?? null;
            if (anchors[`hand-${hand}`].parent !== node) {
                anchors[`hand-${hand}`].parent = node;
            }
        }
    };

    // Run the per-frame hooks of every technique that is on.
    const runHooks = (dt: number): void => {
        const t0 = performance.now();
        for (const t of techniques) {
            if (!on.has(t.id)) {
                continue;
            }
            for (const fn of hooks.get(t.id) ?? []) {
                fn(dt);
            }
        }
        stats.addHookMs(performance.now() - t0);
    };

    let palmsSince = 0;
    const fw: Framework = {
        techniques,
        settings,
        commands,
        log,
        arbiter,
        poses,
        get input() {
            return input;
        },
        actions: {
            toggleGear: () => undefined,
            toggleSteps: () => undefined,
            recenter: () => undefined,
            resetView: () => undefined,
            flag: () => undefined,
            saveAsPreset: () => undefined,
            save: () => undefined,
        },
        wins,
        armed,
        isOn: (id) => on.has(id),
        setOn,
        reason,
        claims,
        dominant,
        async start(initial) {
            for (const t of techniques) {
                const ctx = ctxFor(t);
                await t.prepare(ctx);
            }
            for (const id of initial) {
                setOn(id, true);
            }
        },
        attachXR(x) {
            xr = x;
            input = createInput(x, graph, providers);
            x.input.onControllerAddedObservable.add((c) => {
                const s = c.inputSource;
                log.log("input", {
                    event: "added",
                    handedness: s.handedness,
                    profiles: s.profiles,
                    targetRayMode: s.targetRayMode,
                    hand: !!s.hand,
                    buttons: s.gamepad?.buttons.length ?? 0,
                    axes: s.gamepad?.axes.length ?? 0,
                });
            });
            x.input.onControllerRemovedObservable.add((c) => {
                const hand = c.inputSource.handedness as Hand;
                log.log("input", { event: "removed", handedness: hand });
                for (const [key, l] of Array.from(live)) {
                    if (l.press.hand === hand) {
                        live.delete(key);
                        arbiter.cancel(l.press.id, "input removed");
                    }
                }
            });
            const sm = x.baseExperience.sessionManager;
            const edge = (channel: "select" | "squeeze", down: boolean) => (ev: XRInputSourceEvent) => {
                const s = ev.inputSource;
                if (s.handedness === "none" || (channel === "squeeze" && s.hand)) {
                    return;
                }
                input?.push({ hand: s.handedness, channel, down, time: performance.now() });
            };
            sm.onXRSessionInit.add((session) => {
                session.addEventListener("selectstart", edge("select", true));
                session.addEventListener("selectend", edge("select", false));
                session.addEventListener("squeezestart", edge("squeeze", true));
                session.addEventListener("squeezeend", edge("squeeze", false));
                session.addEventListener("visibilitychange", () => {
                    log.log("input", { event: "visibility", state: session.visibilityState });
                    if (session.visibilityState === "visible-blurred") {
                        // A system gesture blurs the session: presses that just started are cancelled, not ended.
                        const now = performance.now();
                        for (const [key, l] of Array.from(live)) {
                            if (now - l.press.time < 200) {
                                live.delete(key);
                                arbiter.cancel(l.press.id, "session blurred");
                            }
                        }
                    }
                });
            });
        },
        frame(now) {
            const dt = lastFrame ? now - lastFrame : 0;
            lastFrame = now;
            if (!input || !xr) {
                return;
            }
            const head = xr.baseExperience.camera.globalPosition;
            poses.update(now, head, (hand, pose, isOn) => {
                if (pose === "fist" && input?.hands[hand].isHand) {
                    input.push({ hand, channel: "squeeze", down: isOn, time: now });
                }
            });
            const deg = (isHand: boolean): number =>
                ((Number(settings.get(isHand ? "framework.pickHandsDeg" : "framework.pickControllersDeg")) || 1) *
                    Math.PI) /
                180;
            for (const e of input.update(now, deg)) {
                handleEdge(e, now);
            }
            arbiter.tick(now, movedOf);
            moveSessions(now);
            // Both palms up for 1 s opens the gear panel, even when every ray is broken.
            if (poses.hands.left.palmUp && poses.hands.right.palmUp) {
                palmsSince ||= now;
                if (palmsSince > 0 && now - palmsSince >= 1000) {
                    palmsSince = -1;
                    fw.actions.toggleGear();
                }
            } else {
                palmsSince = 0;
            }
            syncHands(input.hands);
            updateHints();
            runHooks(dt);
        },
    };
    return fw;
}
