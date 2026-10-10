// The probe's card: a few lines of text beside the node it reads, or beside the probe for a
// result summary. A framework panel made unpickable (a card in front of a node must never steal
// the ray from it), redrawn only when its text changes.

import { TransformNode, type Vector3 } from "@babylonjs/core";
import { Control, TextBlock } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";

/** The probe card. */
export interface Card {
    readonly text: string;
    readonly visible: boolean;
    set(text: string): void;
    /** Put the card's center at a world position. */
    place(at: Vector3): void;
    show(): void;
    hide(): void;
}

/**
 * Build the card, hidden.
 * @param ctx - the technique context
 * @returns the card
 */
export function createCard(ctx: TechniqueContext): Card {
    const panel = ctx.ui.panel("probe-card", 0.17, 0.085, 512);
    panel.mesh.metadata = { ui: false };
    panel.mesh.isPickable = false;
    panel.mesh.isNearPickable = false;
    panel.mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    panel.mesh.renderingGroupId = 1;
    const block = new TextBlock("probe-card-text", "");
    block.color = "#e8ecf4";
    block.fontSize = 36;
    block.textWrapping = true;
    block.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    block.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    block.paddingLeft = "16px";
    block.paddingTop = "10px";
    panel.adt.addControl(block);
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
            if (!panel.mesh.position.equalsWithEpsilon(at, 1e-4)) {
                panel.mesh.position.copyFrom(at);
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
