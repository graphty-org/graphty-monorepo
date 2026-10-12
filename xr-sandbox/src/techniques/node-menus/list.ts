// The list style: a column of buttons on a framework panel, opened beside the node (or at the
// pointed spot in space) and chosen by ray, like any other UI. Two fixed panels, one for node verbs
// and one for graph verbs, built hidden at prepare, so opening one only enables it and (for graph
// verbs) sets changed button texts. Buttons are named by kind and slot ("node-menus-node-2"), so the
// dry run can aim at one; the last is Close.

import type { Vector3 } from "@babylonjs/core";
import type { Button } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import type { Panel } from "../../scene/ui";
import type { Verb } from "./verbs";

/** The last item of every list: closes it, choosing nothing. */
const CLOSE: Verb = { id: "close", label: "Close" };

/** A list menu. */
export interface ListMenu {
    /**
     * Show one of the lists at `at`, facing the head.
     * @param kind - node verbs or graph verbs
     * @param verbs - the verbs, in order (the graph list's words change with the state)
     * @param at - world position of the column's bottom center (it extends up from there)
     * @param head - world position of the head
     */
    open(kind: "node" | "graph", verbs: readonly Verb[], at: Vector3, head: Vector3): void;
    close(): void;
    readonly isOpen: boolean;
}

/**
 * Build both lists, hidden.
 * @param ctx - the technique context
 * @param initial - each list's verbs, labeled now so opening a list redraws no button texture
 * @param initial.node - node verbs
 * @param initial.graph - graph verbs (their words change with the state)
 * @param onPick - called with the chosen verb's index (the Close item is index -1)
 * @returns the list menu
 */
export function createListMenu(
    ctx: TechniqueContext,
    initial: { node: readonly Verb[]; graph: readonly Verb[] },
    onPick: (kind: "node" | "graph", index: number) => void,
): ListMenu {
    const build = (kind: "node" | "graph", verbs: readonly Verb[]): { panel: Panel; buttons: Button[] } => {
        // Read beside the node, or about as far along the ray.
        const panel = ctx.ui.panel(`${kind}-list`, 0.26, 0.02, 512, { read: "graph", fit: true });
        const n = verbs.length;
        const buttons = [...verbs, CLOSE].map((v, i) => {
            const b = panel.button(`node-menus-${kind}-${i}`, v.label, () => {
                onPick(kind, i === n ? -1 : i);
            });
            panel.stack.addControl(b);
            return b;
        });
        return { panel, buttons };
    };
    const lists = { node: build("node", initial.node), graph: build("graph", initial.graph) };
    let open: "node" | "graph" | null = null;

    return {
        open(kind, verbs, at, head) {
            if (open && open !== kind) {
                lists[open].panel.hide();
            }
            open = kind;
            verbs.forEach((v, i) => {
                const t = lists[kind].buttons[i]?.textBlock;
                // A changed label redraws the panel; the same words redraw nothing.
                if (t && t.text !== v.label) {
                    t.text = v.label;
                }
            });
            const { mesh } = lists[kind].panel;
            mesh.position.copyFrom(at);
            // Local +z points away from the head, so the panel faces it.
            mesh.lookAt(at.scale(2).subtract(head));
            // Lift it so its bottom edge is at `at`: the panel's top edge is fixed and it grows down.
            mesh.position.addInPlace(mesh.up.scale(-mesh.getBoundingInfo().boundingBox.minimum.y));
            mesh.computeWorldMatrix(true);
            lists[kind].panel.show();
        },
        close() {
            if (open) {
                lists[open].panel.hide();
            }
            open = null;
        },
        get isOpen() {
            return open !== null;
        },
    };
}
