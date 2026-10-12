// The sieve (design section 9.7): a hand-held frame you look through. While it is held, a filter
// preview dims the nodes it would remove (opaque: color and scale, never alpha) and the frame reads
// "PageRank 0.070: keeps 5 of 15". The threshold is set on a slider under the frame (Babylon GUI,
// ray or poke with the other hand) or, when the setting is on, by rolling the holding wrist.
// "Keep" (or the holding hand's pinch or trigger) commits `filter`; "Put back" (or a fist or the
// grip) cancels.

import { Color3, MeshBuilder, Quaternion, StandardMaterial, TransformNode, Vector3 } from "@babylonjs/core";
import { Slider } from "@babylonjs/gui";

import type { Hand } from "../../core/arbiter";
import type { Preview } from "../../core/commands";
import { type Filter, passes } from "../../core/state";
import type { TechniqueContext } from "../../framework/technique";
import type { Tool } from "./rack";

/** The sieve. */
export interface Sieve {
    tool: Tool;
    readonly value: number;
    readonly readout: string;
    readonly previewing: boolean;
    /** Commit the previewed filter; returns false when nothing was previewed. */
    commit(hand: Hand): boolean;
    /** The setting `result` changed. */
    retarget(): void;
    /** Per frame while held: the wrist roll, when on. */
    frame(): void;
    /** For the dry run: a hidden mesh on the slider where a press sets `value`; returns its name. */
    markFor(value: number): string;
}

const SLIDER_W = 0.13;

/**
 * The smallest 1, 2 or 5 times a power of ten that is at least x.
 * @param x - a positive number
 * @returns a round step
 */
function niceStep(x: number): number {
    const p = 10 ** Math.floor(Math.log10(x));
    return [1, 2, 5, 10].map((k) => k * p).find((s) => s >= x * (1 - 1e-9)) ?? 10 * p;
}

/**
 * Build the sieve, hidden on the rack.
 * @param ctx - the technique context
 * @param put - puts the sieve back on the rack
 * @returns the sieve
 */
export function createSieve(ctx: TechniqueContext, put: () => void): Sieve {
    const { scene, graph } = ctx;
    const { data } = graph;
    const mat = new StandardMaterial("physical-tools-sieve-mat", scene);
    mat.diffuseColor = new Color3(0.85, 0.35, 0.45);
    mat.emissiveColor = new Color3(0.25, 0.08, 0.1);

    // The root is the handle (the grab target); the frame sits above it, its hole along the ray.
    const root = MeshBuilder.CreateBox("physical-tools-sieve", { width: 0.022, height: 0.06, depth: 0.022 }, scene);
    root.material = mat;
    const frame = MeshBuilder.CreateTorus(
        "physical-tools-sieve-frame",
        { diameter: 0.11, thickness: 0.007, tessellation: 32 },
        scene,
    );
    frame.material = mat;
    frame.parent = root;
    frame.position.y = 0.085;
    frame.rotation.x = Math.PI / 2;
    frame.isPickable = false;

    const readoutChip = ctx.ui.chip("sieve-readout", 0.1, "reach", true);
    readoutChip.mesh.parent = root;
    // Beside the ring, clear of the framework's hint and badge chips above the hand.
    readoutChip.mesh.position.set(0.145, 0.085, 0);

    // Controls under the handle, tilted toward the eyes; shown only while held.
    const controls = new TransformNode("physical-tools-sieve-controls", scene);
    controls.parent = root;
    controls.position.set(0, -0.06, 0);
    controls.rotation.x = 0.5;
    const sliderPanel = ctx.ui.panel("sieve-slider", SLIDER_W, 0.026, 512);
    sliderPanel.mesh.parent = controls;
    const slider = new Slider("physical-tools-sieve-slider");
    slider.width = 1;
    slider.height = 1;
    slider.color = "#ff5370";
    slider.background = "#3a4660";
    slider.thumbWidth = "24px";
    slider.isThumbCircle = true;
    sliderPanel.adt.addControl(slider);
    // Their top edges 2 cm under the slider; they grow down to hold their labels.
    const keepPanel = ctx.ui.panel("sieve-keep", 0.08, 0.026, 320, { read: "hand", fit: true });
    keepPanel.mesh.parent = controls;
    keepPanel.mesh.position.set(-0.043, -0.032, 0);
    const backPanel = ctx.ui.panel("sieve-back", 0.08, 0.026, 320, { read: "hand", fit: true });
    backPanel.mesh.parent = controls;
    backPanel.mesh.position.set(0.043, -0.032, 0);
    const mark = MeshBuilder.CreateBox("physical-tools-slider-mark", { size: 0.001 }, scene);
    mark.parent = sliderPanel.mesh;
    mark.isVisible = false;
    mark.isPickable = false;

    let preview: Preview | null = null;
    let hand: Hand | null = null;
    let readout = "";
    let rollFrom: { q: Quaternion; v: number } | null = null;

    const result = (): string => {
        const r = ctx.settings.str("result");
        return data.results[r] ? r : "pagerank";
    };
    const filter = (): Filter => ({ result: result(), op: ">=", value: slider.value });
    const refresh = (): void => {
        const f = filter();
        let kept = 0;
        for (let i = 0; i < data.nodeCount; i++) {
            if (passes(ctx.state, f, i)) {
                kept++;
            }
        }
        readout = `${data.resultNames[f.result]} ${f.value.toFixed(3)}: keeps ${kept} of ${data.nodeCount}`;
        readoutChip.set(readout, "#5a2030");
        // Its left edge just outside the ring, however wide the text makes it.
        readoutChip.mesh.position.x = 0.065 + readoutChip.widthM / 2;
    };
    const range = (): void => {
        const v = data.results[result()];
        const o = data.order[result()];
        const lowest = v[o.at(-1) ?? 0];
        const step = niceStep((v[o[0]] - lowest) / 30 || 0.01);
        slider.step = step;
        slider.minimum = Math.floor(lowest / step) * step;
        slider.maximum = Math.ceil(v[o[0]] / step) * step;
        slider.value = slider.minimum;
    };
    slider.onValueChangedObservable.add(() => {
        if (!preview) {
            return;
        }
        preview.update(filter());
        refresh();
    });

    const sieve: Sieve = {
        tool: {
            id: "sieve",
            root,
            inHand: new Vector3(0, -0.085, 0.09),
            onTake(h) {
                hand = h;
                range();
                preview?.cancel();
                preview = ctx.commands.preview("filter", filter(), h);
                rollFrom = null;
                refresh();
                readoutChip.show();
                sliderPanel.show();
                keepPanel.show();
                backPanel.show();
            },
            onPut() {
                hand = null;
                // A put-back after a commit has nothing left to cancel.
                preview?.cancel();
                preview = null;
                readoutChip.hide();
                sliderPanel.hide();
                keepPanel.hide();
                backPanel.hide();
            },
        },
        get value() {
            return slider.value;
        },
        get readout() {
            return readout;
        },
        get previewing() {
            return preview !== null;
        },
        commit(h) {
            if (!preview) {
                return false;
            }
            ctx.log("commit", { tool: "sieve", hand: h, filter: { ...filter() } });
            preview.commit();
            preview = null;
            put();
            return true;
        },
        retarget() {
            if (preview && hand) {
                range();
                preview.update(filter());
                refresh();
            }
        },
        frame() {
            if (!hand || !ctx.settings.bool("roll")) {
                rollFrom = null;
                return;
            }
            const q = ctx.anchor(`hand-${hand}`).absoluteRotationQuaternion;
            if (!rollFrom) {
                rollFrom = { q: q.clone(), v: slider.value };
                return;
            }
            // Roll about the hand's forward axis: a quarter turn sweeps the whole range.
            const roll = Quaternion.Inverse(rollFrom.q).multiply(q).toEulerAngles().z;
            const span = slider.maximum - slider.minimum;
            const v = rollFrom.v - (roll / (Math.PI / 2)) * span;
            const snapped =
                Math.round(Math.min(slider.maximum, Math.max(slider.minimum, v)) / slider.step) * slider.step;
            if (Math.abs(snapped - slider.value) > slider.step / 2) {
                slider.value = snapped;
            }
        },
        markFor(value) {
            const u = (value - slider.minimum) / (slider.maximum - slider.minimum);
            mark.position.set((u - 0.5) * SLIDER_W, 0, 0);
            return mark.name;
        },
    };
    keepPanel.stack.addControl(
        keepPanel.button("physical-tools-sieve-keep", "Keep", () => {
            sieve.commit(hand ?? ctx.dominant());
        }),
    );
    backPanel.stack.addControl(backPanel.button("physical-tools-sieve-back", "Put back", put));
    return sieve;
}
