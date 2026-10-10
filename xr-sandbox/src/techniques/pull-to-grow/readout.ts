// The live readout beside the pulling hand: "1 hop: 6", then "2 hops: +5". A framework chip (its own
// small texture), redrawn only when its text changes; it counts its real redraws so the dry run
// can check they equal the hop changes.

import type { TechniqueContext } from "../../framework/technique";
import { type Chip, uiStats } from "../../scene/ui";

/** The readout. */
export interface Readout {
    /** Show `text` beside `hand`; redraws only if the text differs from the last drawn. */
    show(hand: "left" | "right", text: string): void;
    hide(): void;
    /** Hide and forget the text, so the next press always draws its first value. */
    reset(): void;
    /** Real texture redraws since the last reset. */
    readonly redraws: number;
    readonly text: string;
    readonly visible: boolean;
}

/**
 * Build the readout, hidden.
 * @param ctx - the technique context
 * @returns the readout
 */
export function createReadout(ctx: TechniqueContext): Readout {
    const chip: Chip = ctx.ui.chip("readout", 0.12, 0.026, true);
    let last = "";
    let redraws = 0;
    const draw = (text: string): void => {
        const before = uiStats.chipRedraws;
        chip.set(text, "#5c4a1c");
        redraws += uiStats.chipRedraws - before;
        last = text;
    };
    return {
        show(hand, text) {
            const anchor = ctx.anchor(`hand-${hand}`);
            if (chip.mesh.parent !== anchor) {
                chip.mesh.parent = anchor;
                // Below the owner badge (0.07) and the hover hint (0.1).
                chip.mesh.position.set(0, 0.04, 0);
            }
            if (text !== last) {
                draw(text);
            }
            chip.show();
        },
        hide() {
            chip.hide();
        },
        reset() {
            chip.hide();
            if (last !== "") {
                // One redraw while hidden, so the chip's own cache never swallows the next press's first draw.
                draw("");
            }
            redraws = 0;
        },
        get redraws() {
            return redraws;
        },
        get text() {
            return last;
        },
        get visible() {
            return chip.mesh.isEnabled(false);
        },
    };
}
