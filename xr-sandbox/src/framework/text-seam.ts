// The `ctx.text` seam (plan section 1.3): a technique that needs a line of text (a note, an
// inspector field, a step-list note) asks the framework, never the text entry technique. When text
// entry is on it answers with its keyboard; when it is off, a row of canned chips ("check",
// "interesting", "?") still lets a note be made.

import { type Scene, type TransformNode, Vector3 } from "@babylonjs/core";
import { Control } from "@babylonjs/gui";

import { createPanel } from "../scene/ui";
import type { TextProvider, TextRequest } from "./technique";

const CANNED = ["check", "interesting", "?"];

/**
 * Put a panel at arm's reach below the line of sight, facing the head and tilted up toward it:
 * `forward` meters ahead of the head (horizontally) and `drop` meters below it. It stays where it is
 * put (world-locked), so it never swims with the head.
 * @param node - the panel's mesh (unparented)
 * @param scene - the scene; its active camera is the head
 * @param forward - meters ahead of the head
 * @param drop - meters below the head
 */
export function placeAtReach(node: TransformNode, scene: Scene, forward = 0.4, drop = 0.3): void {
    const cam = scene.activeCamera;
    if (!cam) {
        return;
    }
    const head = cam.globalPosition;
    const dir = cam.getDirection(Vector3.Forward());
    const yaw = Math.atan2(dir.x, dir.z);
    node.position.set(head.x + Math.sin(yaw) * forward, head.y - drop, head.z + Math.cos(yaw) * forward);
    // Local +z points away from the head, so a plane shows its front face to it.
    node.lookAt(node.position.scale(2).subtract(head));
    node.computeWorldMatrix(true);
}

/** The seam. */
interface TextSeam {
    request(r: TextRequest): Promise<string | null>;
    provide(fn: TextProvider | null): void;
}

/**
 * Create the seam and its canned-chip fallback (built hidden).
 * @param scene - the scene
 * @param log - the framework log
 * @returns the seam
 */
export function createTextSeam(scene: Scene, log: (message: string, data: Record<string, unknown>) => void): TextSeam {
    let provider: TextProvider | null = null;
    let pending: ((v: string | null) => void) | null = null;
    const panel = createPanel(scene, "text-fallback", 0.4, 0.1, 800, { fit: true });
    const title = panel.text("", "#e8ecf4", true);
    panel.stack.addControl(title);
    const row = panel.line();
    row.name = "text-fallback-row";
    row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.stack.addControl(row);
    const WIDTHS: Record<string, number> = { check: 160, interesting: 250, "?": 100, Cancel: 190 };
    const finish = (v: string | null): void => {
        panel.hide();
        const p = pending;
        pending = null;
        p?.(v);
    };
    for (const t of [...CANNED, "Cancel"]) {
        row.addControl(
            panel.button(
                `text-fallback-${t}`,
                t,
                () => {
                    finish(t === "Cancel" ? null : t);
                },
                WIDTHS[t],
            ),
        );
    }
    return {
        request(r) {
            log("text.request", { label: r.label, by: provider ? "text-entry" : "canned chips" });
            finish(null); // a new request replaces an open one
            if (provider) {
                return provider(r);
            }
            title.text = r.label;
            // A little higher than the default spot, so its row of chips clears the gear button below.
            placeAtReach(panel.mesh, scene, 0.4, 0.22);
            panel.show();
            return new Promise((resolve) => {
                pending = resolve;
            });
        },
        provide(fn) {
            provider = fn;
        },
    };
}
