// The toast: "Colored by PageRank -- Undo" beside the hand that acted, for a few seconds after each
// history command. A framework chip (its own small texture), drawn once per history entry and only
// hidden, never redrawn, when its time is up.

import type { Hand } from "../../core/arbiter";
import type { TechniqueContext } from "../../framework/technique";
import type { Chip } from "../../scene/ui";

// ponytail: past tense from the label's first word, so it follows the framework's one label
// formatter with no second table of commands. A port to graphty-element formats from { code, params }.
const PAST: Record<string, string> = {
    Color: "Colored",
    Size: "Sized",
    Run: "Ran",
    Keep: "Kept",
    Remove: "Removed",
    Hide: "Hid",
    Show: "Showed",
    Note: "Added note",
};

/**
 * The toast's words for a history step.
 * @param label - the step's label ("Color by PageRank")
 * @returns "Colored by PageRank -- Undo"
 */
const toastText = (label: string): string => {
    const [verb, ...rest] = label.split(" ");
    return `${[PAST[verb] ?? verb, ...rest].join(" ")} -- Undo`;
};

/** The toast beside a hand. */
export interface Toast {
    show(label: string, hand: Hand, now: number): void;
    /** Hide it once its time is up; call every frame. */
    tick(now: number): void;
    hide(): void;
    /** Texture redraws so far. */
    readonly redraws: number;
}

/**
 * Build the toast, hidden.
 * @param ctx - the technique context
 * @returns the toast
 */
export function createToast(ctx: TechniqueContext): Toast {
    const chip: Chip = ctx.ui.chip("toast", 0.08, "reach", true);
    let until = 0;
    let shownAt = 0;
    let redraws = 0;
    let text = "";
    return {
        show(label, hand, now) {
            text = toastText(label);
            chip.set(text, "#3d5a1e");
            redraws++;
            chip.mesh.parent = ctx.anchor(`hand-${hand}`);
            // Outside the hand, below the win badge, its inner edge 5 cm out however wide the text is.
            const x = 0.05 + chip.widthM / 2;
            chip.mesh.position.set(hand === "left" ? -x : x, 0.04, 0);
            chip.show();
            shownAt = now;
            until = now + Math.max(0.5, ctx.settings.num("toastSeconds") || 2) * 1000;
            ctx.log("toast", { text, hand, redraws });
        },
        tick(now) {
            if (until && now >= until) {
                until = 0;
                chip.hide();
                ctx.log("toast.hidden", { text, afterMs: Math.round(now - shownAt) });
            }
        },
        hide() {
            until = 0;
            chip.hide();
        },
        get redraws() {
            return redraws;
        },
    };
}
