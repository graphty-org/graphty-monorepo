// Gestures (design section 9.1, plan section 3.7): static hand poses recognized with a fork of
// handy-work's matcher (recognizer.ts) and Quest thumb microgestures, each bound to a command in
// the gear panel. A pose fires once, after it has held for the minimum hold, and never while the
// hand pinches, makes a fist or holds something. Microgestures arrive through the arbiter on the
// `micro` channel (the framework's input layer reads them from the hand's gamepad, buttons 5 to 9,
// Babylon's oculus-hand profile); recognized poses are this technique's own `pose` channel, so they
// are bound here directly. See README.md beside this file for what it reuses and its gaps.

import type { Hand } from "../../core/arbiter";
import type { Technique, TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";
import { type Binding, bindingFor, COMMANDS, fromSettings, parseExtra, type Refusal, runCommand } from "./bindings";
import { BINDABLE, loadTemplates } from "./poses";
import {
    createTracker,
    distance,
    handOf,
    normalize,
    type PoseEvent,
    type Tracker,
    type TrackerOptions,
} from "./recognizer";
import { readJoints, record } from "./recorder";

const HANDS: readonly Hand[] = ["left", "right"];
/**
 * Microgestures are a Quest Browser feature (38.1+); Galaxy XR has none. Read when used, because
 * the emulator replaces the user agent after this module loads.
 * @returns whether this browser is Quest Browser
 */
const quest = (): boolean => typeof navigator !== "undefined" && /OculusBrowser/.test(navigator.userAgent);
const MICRO_UNAVAILABLE = "Galaxy XR and other browsers have no thumb microgestures (Quest Browser only)";
const micro = (label: string): string => `${label} (${quest() ? "Quest" : "Quest only: unavailable here"})`;
const RECORD_DELAY_MS = 3000;
const CHIP_MS = 1500;
const NAMES: Record<string, string> = {
    "thumbs-up": "Thumbs up",
    shaka: "Shaka",
    horns: "Horns",
    vulcan: "Vulcan salute",
    point: "Point",
};

let ctx: TechniqueContext;
let templates = new Map<string, Float32Array>();
let bindings: Binding[] = [];
let refused: Refusal[] = [];
const raw: Record<Hand, Float32Array> = { left: new Float32Array(400), right: new Float32Array(400) };
const live: Record<Hand, Float32Array> = { left: new Float32Array(400), right: new Float32Array(400) };
const tracked: Record<Hand, boolean> = { left: false, right: false };
const dist: Record<Hand, Record<string, number>> = { left: {}, right: {} };
const trackers = {} as Record<Hand, Tracker>;
const chips = {} as Record<Hand, Chip>;
const chipUntil: Record<Hand, number> = { left: 0, right: 0 };
let recordAt = 0;
let recordCount = -1;
/** What happened, for the dry run's hook. */
const events: { time: number; hand: Hand; type: string; gesture: string; command?: string; label?: string }[] = [];

const say = (hand: Hand, text: string, now: number): void => {
    chips[hand].set(text, "#4a3566");
    chips[hand].show();
    chipUntil[hand] = now + CHIP_MS;
};

const rebuild = (): void => {
    const extra = parseExtra(ctx.settings.str("extra") === "false" ? "" : ctx.settings.str("extra"), [
        ...templates.keys(),
    ]);
    bindings = [...extra.bindings, ...fromSettings((k) => ctx.settings.str(k), BINDABLE)];
    ({ refused } = extra);
};

const fires = (pose: string): boolean => bindings.some((b) => b.gesture === pose && b.command !== "none");

const onPose = (hand: Hand, ev: PoseEvent, now: number): void => {
    if (ev.type === "end") {
        ctx.log("release", { hand, pose: ev.pose, reason: ev.reason });
        events.push({ time: now, hand, type: "release", gesture: ev.pose });
        return;
    }
    const p = ctx.poses(hand);
    const b = bindingFor(bindings, ev.pose, { up: p.palmUp, face: p.palmFace });
    if (!b) {
        return;
    }
    const label = runCommand(ctx, b.command, hand);
    ctx.log("pose", {
        hand,
        pose: ev.pose,
        distance: Math.round((ev.distance ?? 0) * 1000) / 1000,
        command: b.command,
        label,
    });
    events.push({ time: now, hand, type: "pose", gesture: ev.pose, command: b.command, label });
    say(hand, `${NAMES[ev.pose] ?? ev.pose}: ${label}`, now);
};

const capture = (now: number): void => {
    recordAt = 0;
    const name = ctx.settings.str("recordAs");
    if (!tracked.left && !tracked.right) {
        ctx.log("recorded", { name, error: "no hand tracked" });
        say(ctx.dominant(), "Record: no hand tracked", now);
        return;
    }
    const { template, entry } = record(name, tracked.left ? raw.left : null, tracked.right ? raw.right : null);
    templates.set(name, template);
    ctx.log("recorded", { ...entry });
    events.push({ time: now, hand: ctx.dominant(), type: "recorded", gesture: name });
    say(ctx.dominant(), `Recorded ${NAMES[name] ?? name}`, now);
};

// Read both hands' joints for this frame; per hand, why it cannot pose ("" when it can).
const readHands = (): Record<Hand, string> => {
    const sm = ctx.xr()?.baseExperience.sessionManager;
    const f = sm?.currentFrame;
    const space = sm?.referenceSpace;
    tracked.left = false;
    tracked.right = false;
    const why: Record<Hand, string> = { left: "untracked", right: "untracked" };
    if (!f || !space) {
        return why;
    }
    for (const src of f.session.inputSources) {
        const hand = src.handedness;
        if (!src.hand || (hand !== "left" && hand !== "right") || !readJoints(f, src.hand, space, raw[hand])) {
            continue;
        }
        tracked[hand] = true;
        const p = ctx.poses(hand);
        // Suppressed while the hand pinches (the pose layer's pinch or the platform's select). Not on
        // the pose layer's fist: it counts any curled fingers, so a thumbs up is a fist to it (README).
        why[hand] = p.pinch || src.gamepad?.buttons[0]?.pressed ? "pinching" : "";
    }
    return why;
};

// Match one hand against the templates, step its tracker, and expire its chip.
const stepHand = (hand: Hand, why: string, now: number): void => {
    let d: Record<string, number> | string = why;
    if (!d) {
        live[hand].set(raw[hand]);
        normalize(live[hand]);
        for (const [name, t] of templates) {
            dist[hand][name] = distance(t, hand, live[hand]);
        }
        d = dist[hand];
    }
    const ev = trackers[hand].step(now, d);
    if (ev) {
        onPose(hand, ev, now);
    }
    if (chipUntil[hand] && now > chipUntil[hand]) {
        chipUntil[hand] = 0;
        chips[hand].hide();
    }
};

// The recording countdown: say each second, capture at zero.
const tickRecording = (now: number): void => {
    const left = Math.ceil((recordAt - now) / 1000);
    if (left <= 0) {
        capture(now);
    } else if (left !== recordCount) {
        recordCount = left;
        say(ctx.dominant(), `Hold ${NAMES[ctx.settings.str("recordAs")] ?? "the pose"}: ${left}`, now);
    }
};

const frame = (): void => {
    const now = performance.now();
    const why = readHands();
    for (const hand of HANDS) {
        stepHand(hand, why[hand], now);
    }
    if (recordAt) {
        tickRecording(now);
    }
};

const startRecording = (delayMs: number): void => {
    recordAt = performance.now() + delayMs;
    recordCount = -1;
    ctx.log("record", { name: ctx.settings.str("recordAs"), inMs: delayMs });
};

/** Read-only state and arrangement for the dry run, installed only with `?emulate=`. */
const installHooks = (): void => {
    const api = {
        events: () => events.slice(),
        active: (hand: Hand) => trackers[hand].active,
        distances: (hand: Hand) => ({ ...dist[hand] }),
        bindings: () => ({ bindings, refused, microAvailable: quest() }),
        // One hand of a template, normalized (wrist-relative), to build an emulated pose from.
        template: (name: string, side: Hand = "left") => {
            const t = templates.get(name);
            return t ? Array.from(handOf(t, side)) : null;
        },
        // What the gear panel's "Record pose" action does, with a shorter countdown.
        record: (delayMs = RECORD_DELAY_MS) => {
            startRecording(delayMs);
        },
    };
    (globalThis as unknown as { __gestures: typeof api }).__gestures = api;
};

const commandSetting = (key: string, label: string, def: string): Technique["settings"][number] => ({
    key,
    label,
    kind: "choice",
    choices: [...COMMANDS],
    default: def,
});

export const technique: Technique = {
    id: "gestures",
    name: "Gestures",
    color: "#c792ea",
    needs: ["hand-joints"],
    settings: [
        commandSetting("thumbs-up", "Thumbs up", "next color"),
        commandSetting("shaka", "Shaka (thumb and pinky out)", "undo"),
        commandSetting("horns", "Horns (index and pinky out)", "none"),
        commandSetting("vulcan", "Vulcan salute", "none"),
        commandSetting("point", "Point", "none"),
        {
            key: "swipesLR",
            label: micro("Swipe left / right"),
            kind: "choice",
            choices: ["previous / next color", "undo / redo", "none"],
            default: "previous / next color",
        },
        {
            key: "swipesFB",
            label: micro("Swipe forward / back"),
            kind: "choice",
            choices: ["redo / undo", "next / previous color", "none"],
            default: "redo / undo",
        },
        commandSetting("tap-thumb", micro("Thumb tap"), "clear selection"),
        { key: "match", label: "Match within (radians)", kind: "number", min: 0.1, max: 0.8, step: 0.05, default: 0.3 },
        { key: "holdMs", label: "Hold before firing (ms)", kind: "number", min: 50, max: 600, step: 50, default: 150 },
        {
            key: "recordAs",
            label: "Record into",
            kind: "choice",
            choices: [...BINDABLE],
            default: "thumbs-up",
        },
        { key: "record", label: "Record pose (both hands, in 3 s)", kind: "action" },
    ],
    claims: [
        { channel: "pose", contexts: "any", priority: 30, note: "take at start (poses are discrete events)" },
        { channel: "motion", contexts: "any", priority: 30, note: "take at start" },
        { channel: "micro", contexts: "any", priority: 30, hand: "dominant", note: "take at start" },
    ],
    prepare(c) {
        ctx = c;
        templates = loadTemplates();
        const opts = (): TrackerOptions => {
            const begin = c.settings.num("match") || 0.3;
            return { begin, end: begin * 1.5, holdMs: c.settings.num("holdMs") || 150, minFrames: 3 };
        };
        for (const hand of HANDS) {
            trackers[hand] = createTracker(opts, fires);
            chips[hand] = c.ui.chip(`feedback-${hand}`, 0.06, "reach", true);
            chips[hand].mesh.parent = c.anchor(`hand-${hand}`);
            chips[hand].mesh.position.set(0, 0.13, 0);
        }
        rebuild();
        // Refused at load, with the reason (design section 5.7).
        for (const r of refused) {
            c.log("refused", { ...r });
        }
        c.settings.onChange((key) => {
            if (key === "record") {
                startRecording(RECORD_DELAY_MS);
            } else {
                rebuild();
            }
        });
        c.onFrame(frame);
        if (/[?&]emulate=/.test(location.search)) {
            installHooks();
        }
    },
    activate() {
        ctx.log("bindings", {
            active: bindings.filter((b) => b.command !== "none" && (b.kind === "pose" || quest())).map(describe),
            unavailable: quest() ? [] : bindings.filter((b) => b.kind === "micro").map(describe),
            unavailableReason: quest() ? undefined : MICRO_UNAVAILABLE,
            refused,
        });
    },
    deactivate() {
        const now = performance.now();
        recordAt = 0;
        for (const hand of HANDS) {
            trackers[hand].step(now, "switched off");
            chips[hand].hide();
            chipUntil[hand] = 0;
        }
    },
    onPress(p, hand) {
        if (p.press.channel !== "micro" || !p.press.detail) {
            return undefined;
        }
        const gesture = p.press.detail;
        const now = performance.now();
        if (!quest()) {
            ctx.log("micro", { hand, gesture, ran: false, reason: MICRO_UNAVAILABLE });
            return undefined;
        }
        const b = bindingFor(bindings, gesture, { up: false, face: false });
        const label = b ? runCommand(ctx, b.command, hand) : "";
        ctx.log("micro", { hand, gesture, ran: !!b, command: b?.command ?? "none", label });
        events.push({ time: now, hand, type: "micro", gesture, command: b?.command ?? "none", label });
        if (b) {
            say(hand, `${gesture}: ${label}`, now);
        }
        return undefined;
    },
};

/**
 * One binding as a short string for the log.
 * @param b - the binding
 * @returns "thumbs-up: next color"
 */
function describe(b: Binding): string {
    const gesture = b.palm ? `${b.gesture}@palm-${b.palm}` : b.gesture;
    return `${gesture}: ${b.command}`;
}
