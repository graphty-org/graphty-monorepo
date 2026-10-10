// The context popover (design section 9.4): a small slate beside the selected node with four verbs,
// following the node, gone when the selection clears.

import { Vector3 } from "@babylonjs/core";
import type { TextBlock } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { guiButton, guiText, type Panel } from "../../scene/ui";

/** The popover. */
export interface Popover {
    panel: Panel;
    /** Show it for a node, or hide it (-1). */
    setNode(i: number): void;
    /** Keep it beside its node, facing the head; moves the mesh only when the spot changed. */
    follow(head: Vector3): void;
    verbs(): string[];
}

const VERBS = ["1 hop", "Hide", "Note", "Probe"];
/** Meters to the right of the node, as the head sees it. */
const BESIDE_M = 0.085;

/**
 * Build the popover, hidden.
 * @param ctx - the technique context
 * @returns the popover
 */
export function createPopover(ctx: TechniqueContext): Popover {
    const panel = ctx.ui.panel("popover", 0.11, 0.14, 384);
    const { data } = ctx.graph;
    let node = -1;
    const title: TextBlock = guiText("", 64, "#ffd479");
    panel.stack.addControl(title);
    const ids = (): number[] => [...ctx.state.selection];
    const act: Record<string, () => void> = {
        "1 hop": () => ctx.commands.run("neighbors", { id: node, hops: 1 }),
        Hide: () => ctx.commands.run("hide", { ids: ids() }),
        Note: () => {
            const target = node;
            void ctx.text.request({ label: `Note on ${data.names[target]}` }).then((text) => {
                if (text) {
                    ctx.commands.run("note", { target, text });
                }
            });
        },
        Probe: () => ctx.commands.run("probe", { id: node }),
    };
    for (const v of VERBS) {
        panel.stack.addControl(
            guiButton(
                `figma-pop-${v.replace(" ", "")}`,
                v,
                () => {
                    ctx.log("click", { item: `popover ${v}`, node: data.names[node] });
                    act[v]();
                },
                72,
            ),
        );
    }
    const at = new Vector3();
    const want = new Vector3();
    const right = new Vector3();
    return {
        panel,
        verbs: () => (panel.visible ? VERBS.slice() : []),
        setNode(i) {
            node = i;
            if (i < 0) {
                panel.hide();
                return;
            }
            title.text = data.names[i];
            panel.show();
        },
        follow(head) {
            if (node < 0) {
                return;
            }
            ctx.graph.nodeWorld(node, at);
            // Right of the node as seen from the head, level with it.
            at.subtractToRef(head, right);
            right.set(right.z, 0, -right.x).normalize();
            want.copyFrom(at).addInPlace(right.scaleInPlace(BESIDE_M));
            const m = panel.mesh;
            if (Vector3.DistanceSquared(m.position, want) < 1e-8) {
                return;
            }
            m.position.copyFrom(want);
            m.lookAt(want.scale(2).subtract(head));
        },
    };
}
