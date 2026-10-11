// The Filter face: hands the owner the sieve (physical tools) through the framework's tool seam,
// grayed with the reason when no technique offers it; shows and removes the current filter.

import type { StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../../framework/technique";
import { guiButton, guiText } from "../../../scene/ui";

/** The sieve as the palette sees it: why it cannot be taken (null when it can), and take it. */
interface SieveHandle {
    reason(): string | null;
    take(): void;
}

/**
 * Fill the Filter card.
 * @param ctx - the technique context
 * @param stack - the card's stack
 * @param sieve - the sieve through the tool seam
 * @returns refresh, called when the state changes
 */
export function filterFace(ctx: TechniqueContext, stack: StackPanel, sieve: SieveHandle): () => void {
    stack.addControl(guiText("Filter", 34, "#f78c6c"));
    const line = guiText("No filter", 34);
    stack.addControl(line);
    const take = guiButton("palette-filter-sieve", "Take the sieve", () => {
        if (sieve.reason() === null) {
            sieve.take();
        }
    });
    stack.addControl(take);
    const clear = guiButton("palette-filter-clear", "Remove filter", () => {
        ctx.commands.run("clearFilter", {}, ctx.dominant());
    });
    stack.addControl(clear);
    return () => {
        const f = ctx.state.filter;
        const name = f ? (ctx.graph.data.resultNames[f.result] ?? f.result) : "";
        line.text = f ? `Keeps ${name} ${f.op} ${f.value.toFixed(3)}` : "No filter";
        const why = sieve.reason();
        take.isEnabled = why === null;
        if (take.textBlock) {
            take.textBlock.text = why === null ? "Take the sieve" : `Sieve: ${why}`;
        }
        clear.isEnabled = f !== null;
    };
}
