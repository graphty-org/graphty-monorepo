// The Analyze face: reveal a result ("Run PageRank"). A revealed result reads as shown.

import type { StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../../framework/technique";
import { guiButton, guiText } from "../../../scene/ui";

/**
 * Fill the Analyze card.
 * @param ctx - the technique context
 * @param stack - the card's stack
 * @returns refresh, called when the state changes
 */
export function analyzeFace(ctx: TechniqueContext, stack: StackPanel): () => void {
    stack.addControl(guiText("Analyze", 34, "#f78c6c"));
    const names = ctx.graph.data.resultNames;
    const buttons = Object.keys(names).map((id) => {
        const b = guiButton(`palette-analyze-${id}`, `Run ${names[id]}`, () => {
            ctx.commands.run("run", { result: id }, ctx.dominant());
        });
        stack.addControl(b);
        return { id, b };
    });
    return () => {
        for (const { id, b } of buttons) {
            const shown = ctx.state.shown.has(id);
            if (b.textBlock) {
                b.textBlock.text = shown ? `${names[id]}: shown` : `Run ${names[id]}`;
            }
            b.isEnabled = !shown;
        }
    };
}
