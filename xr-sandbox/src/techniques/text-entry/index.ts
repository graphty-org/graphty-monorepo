// Text entry: an in-scene keyboard and a dictation key, opened at arm's reach below the line of
// sight whenever another technique asks for text through `ctx.text.request` (a note from a node
// menu, an inspector field). It claims no input: keys are GUI buttons, reached by a controller ray,
// a hand ray or a fingertip poke. See README.md beside this file for what it reuses and its gaps.

import { Mesh, type StandardMaterial, Vector3, WebXRHandJoint } from "@babylonjs/core";
import type { AdvancedDynamicTexture } from "@babylonjs/gui";

import type { Technique, TechniqueContext, TextRequest } from "../../framework/technique";
import { placeAtReach } from "../../framework/text-seam";
import { controlWorld } from "../../scene/ui";
import { handTracking } from "../../scene/xr";
import { createDictationKey, type DictationKey } from "./dictation-key";
import { createKeyboard, type Keyboard } from "./keyboard";

let ctx: TechniqueContext;
let kb: Keyboard;
let dictation: DictationKey;
let pending: { r: TextRequest; resolve: (v: string | null) => void; t0: number } | null = null;

const finish = (how: "done" | "cancel" | "replaced" | "switched off"): void => {
    const p = pending;
    if (!p) {
        return;
    }
    pending = null;
    dictation.close();
    kb.close();
    const text = how === "done" ? kb.text.trim() : "";
    ctx.log("close", {
        label: p.r.label,
        how,
        chars: text.length,
        ms: Math.round(performance.now() - p.t0),
        ...kb.stats,
    });
    p.resolve(text || null);
};

const request = (r: TextRequest): Promise<string | null> => {
    finish("replaced");
    kb.open(r.label, r.initial ?? "");
    placeAtReach(kb.mesh, ctx.scene, ctx.settings.num("reachM"), ctx.settings.num("dropM"));
    dictation.open();
    const route = dictation.route();
    ctx.log("open", { label: r.label, hand: r.hand ?? null, dictation: route.route, reason: route.reason });
    return new Promise((resolve) => {
        pending = { r, resolve, t0: performance.now() };
    });
};

/** Dry-run hooks, installed only on an emulated headset. */
const installHooks = (): void => {
    if (!new URLSearchParams(location.search).has("emulate")) {
        return;
    }
    // An empty, unpickable mesh the dry run aims a ray at (`__sandbox.aim(hand, "text-entry-aim")`).
    const aim = new Mesh("text-entry-aim", ctx.scene);
    aim.isPickable = false;
    (globalThis as unknown as { __textEntry: unknown }).__textEntry = {
        /**
         * Arrange: ask for a note on a node, as a node menu would, and log the note it returns.
         * @param name - the node's name
         */
        requestNote(name: string) {
            const i = ctx.graph.data.names.indexOf(name);
            void ctx.text.request({ label: `Note on ${name}`, hand: "right" }).then((text) => {
                if (text) {
                    ctx.commands.run("note", { target: i, text }, "right");
                }
            });
        },
        open: () => kb.panel.visible,
        field: () => kb.text,
        keys: () => kb.keys(),
        dictateKey: () => ({ name: dictation.panel.mesh.name, ...dictation.route() }),
        panel: () => ({
            center: kb.mesh.getAbsolutePosition().asArray(),
            /** World +z of the panel: away from the viewer, the direction of a poke. */
            normal: kb.mesh.forward.asArray(),
            name: kb.mesh.name,
            // The middle of the key as drawn: the panel fits its label, so it is not centered on its origin.
            dictate: dictation.panel.mesh.getBoundingInfo().boundingBox.centerWorld.asArray(),
        }),
        /**
         * The index fingertip's world position, where Babylon's near interaction pokes from.
         * @param hand - which hand
         * @returns the position, or null without a tracked hand
         */
        tip(hand: "left" | "right") {
            const xr = ctx.xr();
            const joint = xr
                ? handTracking(xr)?.getHandByHandedness(hand)?.getJointMesh(WebXRHandJoint.INDEX_FINGER_TIP)
                : undefined;
            return joint ? joint.getAbsolutePosition().asArray() : null;
        },
        /**
         * The framework's canned-chip fallback, shown when text entry is off.
         * @returns whether it is visible, its "check" chip's world center and its normal, or null
         */
        fallback() {
            const mesh = ctx.scene.getMeshByName("text-fallback");
            const adt = (mesh?.material as StandardMaterial | null)?.emissiveTexture as AdvancedDynamicTexture | null;
            const chip = adt?.getControlByName("text-fallback-check");
            if (!mesh || !adt || !chip) {
                return null;
            }
            return {
                visible: mesh.isEnabled(),
                check: controlWorld(mesh, adt, chip).asArray(),
                normal: mesh.forward.asArray(),
            };
        },
        /**
         * Move the aim mesh to a point.
         * @param p - world position
         */
        mark(p: number[]) {
            aim.position = Vector3.FromArray(p);
            aim.computeWorldMatrix(true);
        },
    };
};

export const technique: Technique = {
    id: "text-entry",
    name: "Text entry",
    color: "#7fdbca",
    settings: [
        {
            key: "dictation",
            label: "Dictation",
            kind: "choice",
            choices: ["auto", "web-speech", "system-keyboard", "off"],
            default: "auto",
        },
        {
            key: "reachM",
            label: "Keyboard distance (m)",
            kind: "number",
            default: 0.38,
            min: 0.25,
            max: 0.6,
            step: 0.02,
        },
        {
            key: "dropM",
            label: "Keyboard below eyes (m)",
            kind: "number",
            default: 0.28,
            min: 0.1,
            max: 0.5,
            step: 0.02,
        },
    ],
    claims: [],
    prepare(c) {
        ctx = c;
        kb = createKeyboard(c);
        kb.onFinish = finish;
        dictation = createDictationKey(c, kb);
        installHooks();
    },
    activate() {
        ctx.text.provide(request);
    },
    deactivate() {
        ctx.text.provide(null);
        finish("switched off");
    },
};
