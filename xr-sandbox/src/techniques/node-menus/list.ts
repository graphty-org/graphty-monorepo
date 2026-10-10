// The list style: a column of Babylon GUI 3D HolographicButtons on a CylinderPanel, opened beside
// the node (or at the pointed spot in space) and chosen by ray, like any other UI. Two fixed
// panels, one for node verbs and one for graph verbs, built hidden at prepare, so opening one only
// enables it and (for graph verbs) sets changed button texts.

import { type Scene, TransformNode, Vector3 } from "@babylonjs/core";
import { CylinderPanel, GUI3DManager, HolographicButton, TextBlock } from "@babylonjs/gui";

import type { Verb } from "./verbs";

/** The last item of every list: closes it, choosing nothing. */
export const CLOSE: Verb = { id: "close", label: "Close" };

/** Button size in meters (one GUI 3D unit). */
const UNIT_M = 0.045;
/** The cylinder's radius in GUI 3D units: the buttons sit on it, at the anchor. */
const RADIUS = 5;

/** A list menu. */
export interface ListMenu {
    /**
     * Show one of the lists at `at`, facing the head.
     * @param kind - node verbs or graph verbs
     * @param verbs - the verbs, in order (the graph list's words change with the state)
     * @param at - world position of the column's center
     * @param head - world position of the head
     */
    open(kind: "node" | "graph", verbs: readonly Verb[], at: Vector3, head: Vector3): void;
    close(): void;
    readonly isOpen: boolean;
}

/**
 * Build both lists, hidden.
 * @param scene - the scene
 * @param initial - each list's verbs, labeled now so opening a list redraws no button texture
 * @param initial.node - node verbs
 * @param initial.graph - graph verbs (their words change with the state)
 * @param onPick - called with the chosen verb's index (the Close item is index -1)
 * @returns the list menu
 */
export function createListMenu(
    scene: Scene,
    initial: { node: readonly Verb[]; graph: readonly Verb[] },
    onPick: (kind: "node" | "graph", index: number) => void,
): ListMenu {
    // Gap: each GUI3DManager makes its own utility layer the default one, and Babylon's XR pointer
    // selection sees only the default. A second technique with its own manager would hide these
    // buttons from the framework's "ui" context; the framework should own one shared manager.
    const manager = new GUI3DManager(scene);
    const anchor = new TransformNode("node-menus-list", scene);
    anchor.scaling.setAll(UNIT_M);
    const build = (kind: "node" | "graph", verbs: readonly Verb[]): { panel: CylinderPanel; labels: TextBlock[] } => {
        const n = verbs.length;
        const panel = new CylinderPanel(`node-menus-${kind}-list`);
        panel.radius = RADIUS;
        panel.margin = 0.08;
        panel.columns = 1;
        manager.addControl(panel);
        panel.linkToTransformNode(anchor);
        panel.position = new Vector3(0, 0, -RADIUS);
        panel.blockLayout = true;
        const buttons: HolographicButton[] = [];
        const labels: TextBlock[] = [];
        for (let i = 0; i <= n; i++) {
            // Named by kind and slot, so the dry run can aim at one: node-menus-node-2BackMesh.
            const b = new HolographicButton(`node-menus-${kind}-${i}`);
            b.onPointerClickObservable.add(() => {
                onPick(kind, i === n ? -1 : i);
            });
            buttons.push(b);
        }
        // The panel stacks its children bottom up; added last to first, the first verb is on top.
        for (const b of [...buttons].reverse()) {
            panel.addControl(b);
        }
        buttons.forEach((b, i) => {
            // Our own label instead of b.text: HolographicButton draws text at 24 px of 512 (too small
            // to read at arm's length) and rebuilds its texture on every text change.
            const t = new TextBlock(`node-menus-${kind}-${i}-label`, i === n ? CLOSE.label : verbs[i].label);
            t.color = "white";
            t.fontSize = 62;
            t.textWrapping = true;
            b.content = t;
            labels.push(t);
            // The framework's pointer predicate accepts only meshes marked as UI (scene/ui.ts).
            if (b.mesh) {
                b.mesh.metadata = { ui: true };
                b.mesh.isNearPickable = true;
            }
        });
        panel.blockLayout = false;
        // A container has no mesh of its own, so isVisible does nothing on it: enable its node.
        panel.node?.setEnabled(false);
        // Compile the buttons' shaders now (materials are shared between buttons), so the first
        // open does not stall a frame.
        for (const m of [buttons[0].mesh, ...(buttons[0].mesh?.getChildMeshes() ?? [])]) {
            m?.material?.forceCompilation(m);
        }
        return { panel, labels };
    };
    const lists = { node: build("node", initial.node), graph: build("graph", initial.graph) };
    let open: "node" | "graph" | null = null;

    const show = (kind: "node" | "graph", on: boolean): void => {
        lists[kind].panel.node?.setEnabled(on);
    };

    return {
        open(kind, verbs, at, head) {
            if (open && open !== kind) {
                show(open, false);
            }
            open = kind;
            verbs.forEach((v, i) => {
                const t = lists[kind].labels[i];
                // A changed label redraws that button's texture; the same words redraw nothing.
                if (t && t.text !== v.label) {
                    t.text = v.label;
                }
            });
            anchor.position.copyFrom(at);
            // Local +z points away from the head, so the buttons face it.
            anchor.lookAt(at.scale(2).subtract(head));
            anchor.computeWorldMatrix(true);
            show(kind, true);
        },
        close() {
            if (open) {
                show(open, false);
            }
            open = null;
        },
        get isOpen() {
            return open !== null;
        },
    };
}
