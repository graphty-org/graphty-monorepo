// The probe's card: a few lines of text beside the node it reads, or beside the probe for a
// result summary. A framework panel made unpickable (a card in front of a node must never steal
// the ray from it), redrawn only when its text changes.

import { TransformNode, Vector3 } from "@babylonjs/core";

import type { TechniqueContext } from "../../framework/technique";

/** The probe card. */
export interface Card {
    readonly text: string;
    readonly visible: boolean;
    set(text: string): void;
    /** Put the card's bottom center at a world position (it grows up to hold its text). */
    place(at: Vector3): void;
    show(): void;
    hide(): void;
}

/** Half the card's first height: where its top edge stays. */
const TOP = 0.04;

/**
 * Build the card, hidden.
 * @param ctx - the technique context
 * @returns the card
 */
export function createCard(ctx: TechniqueContext): Card {
    const panel = ctx.ui.panel("probe-card", 0.2, TOP * 2, 512, { fit: true });
    const want = new Vector3();
    panel.mesh.metadata = { ui: false };
    panel.mesh.isPickable = false;
    panel.mesh.isNearPickable = false;
    panel.mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    panel.mesh.renderingGroupId = 1;
    const block = panel.text("");
    block.name = "probe-card-text";
    panel.stack.addControl(block);
    let text = "";
    return {
        get text() {
            return text;
        },
        get visible() {
            return panel.visible;
        },
        set(t) {
            if (t !== text) {
                text = t;
                block.text = t;
            }
        },
        place(at) {
            // The plane's top edge is fixed at +TOP and it grows down, so lift it by its height.
            const bb = panel.mesh.getBoundingInfo().boundingBox;
            want.copyFrom(at);
            want.y += bb.maximum.y - bb.minimum.y - TOP;
            if (!panel.mesh.position.equalsWithEpsilon(want, 1e-4)) {
                panel.mesh.position.copyFrom(want);
            }
        },
        show: () => {
            panel.show();
        },
        hide: () => {
            panel.hide();
        },
    };
}
