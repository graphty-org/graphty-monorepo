// The technique module contract (design section 4.1). A technique is one module exporting one
// object of this shape. It touches the sandbox only through its TechniqueContext: input reaches it
// only through the arbiter (claims and onPress), hand poses only through the pose layer, and every
// mesh, panel and hook it creates is built hidden at prepare and only shown at activate.

import type { Scene, TransformNode, WebXRDefaultExperience } from "@babylonjs/core";

import type { Claim, Gesture, Hand, PressStart } from "../core/arbiter";
import type { CommandCode, CommandParams, CommandRecord, HistoryEntry, Preview } from "../core/commands";
import type { GraphState } from "../core/state";
import type { GraphView } from "../scene/graph-view";
import type { HandPoses } from "../scene/poses";
import type { Chip, Panel } from "../scene/ui";

/** What a technique needs from the session; unmet needs are shown in the gear panel. */
export type Need = "hand-joints" | "hand-select" | "hover" | "controllers" | "microphone" | "quest-microgestures";

/** One setting a technique declares; the gear panel is generated from these. */
export interface SettingSpec {
    key: string;
    label: string;
    kind: "bool" | "number" | "choice" | "action";
    default?: boolean | number | string;
    min?: number;
    max?: number;
    step?: number;
    choices?: string[];
}

/** A press this technique won. */
export interface OwnedPress {
    press: PressStart;
    claim: Claim;
}

/** What a technique does with a press it owns, frame by frame until it ends. */
export interface PressSession {
    move?(g: Gesture): void;
    end?(): void;
    /** The press was cancelled (blur, input removed, switched off): undo any preview or transform. */
    cancel?(reason: string): void;
}

/** The one press the dry run makes to exercise a technique. */
export interface SmokeStep {
    input: "trigger" | "pinch" | "squeeze" | `button:${string}`;
    hand?: "dominant" | "off";
    /** What to aim at first. */
    aim?: "node" | "space";
}

/** What the targeting layer says one hand is on. */
export interface HoverInfo {
    /** Node index, or -1. */
    node: number;
    context: "ui" | "tool" | "node" | "edge" | "graph" | "space";
    /** Whether the input is a tracked hand (not a controller). */
    isHand: boolean;
    connected: boolean;
}

/** Everything a technique may touch, and the only way to touch it. */
export interface TechniqueContext {
    scene: Scene;
    xr(): WebXRDefaultExperience | null;
    graph: GraphView;
    state: Readonly<GraphState>;
    hover(hand: Hand): Readonly<HoverInfo>;
    poses(hand: Hand): Readonly<HandPoses>;
    dominant(): Hand;
    commands: {
        run<C extends CommandCode>(code: C, params: CommandParams[C], hand?: Hand): CommandRecord;
        preview<C extends "neighbors" | "filter">(code: C, params: CommandParams[C], hand?: Hand): Preview;
        undo(hand?: Hand): void;
        redo(hand?: Hand): void;
        undoLabel(): string | null;
        /** The history, oldest first; selections are never in it. */
        history(): readonly HistoryEntry[];
        /** Undo back to and including history entry `index`. */
        undoTo(index: number, hand?: Hand): void;
    };
    /** Anchors maintained by the framework: a hand's grip, or the space above the graph. */
    anchor(name: "hand-left" | "hand-right" | "graph-top"): TransformNode;
    ui: {
        panel(name: string, widthM: number, heightM: number, px: number): Panel;
        chip(name: string, widthM: number, heightM: number, billboard?: boolean): Chip;
    };
    settings: {
        bool(key: string): boolean;
        num(key: string): number;
        str(key: string): string;
        onChange(fn: (key: string) => void): void;
    };
    log(message: string, data?: Record<string, unknown>): void;
    /** A per-frame hook, run only while the technique is on, timed for the frame budget. */
    onFrame(fn: (dtMs: number) => void): void;
}

/** A technique module. */
export interface Technique {
    id: string;
    name: string;
    /** Owner color of its badge and ray tint. */
    color: string;
    needs?: Need[];
    /** Must be armed on the landing page before entering XR. */
    arm?: "microphone";
    settings: SettingSpec[];
    claims: Claim[];
    /** Why it cannot be switched on at all (a stub reads "not built yet"). */
    unavailable?: string;
    /** At boot, for every registered technique: build everything hidden, compile materials. */
    prepare(ctx: TechniqueContext): void | Promise<void>;
    /** Show its UI; its claims become live. */
    activate(): void;
    /** Hide its UI. The framework has already cancelled its presses and previews. */
    deactivate(): void;
    /** Called when it wins a press; return how it follows the press. */
    onPress?(p: OwnedPress, hand: Hand): PressSession | undefined;
    smoke?: SmokeStep;
}

/**
 * A technique that is not built yet: its real id, name, color, needs and claims, so the registry,
 * presets, gear panel and input map are complete before it exists.
 * @param t - the technique's identity and claims
 * @returns the stub
 */
export function stub(
    t: Pick<Technique, "id" | "name" | "color" | "claims"> & Partial<Pick<Technique, "needs" | "arm">>,
): Technique {
    return {
        ...t,
        settings: [],
        unavailable: "not built yet",
        prepare: () => undefined,
        activate: () => undefined,
        deactivate: () => undefined,
    };
}
