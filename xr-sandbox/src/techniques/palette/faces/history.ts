// The History face: undo and redo, the undo button naming its step ("Undo: Color by PageRank").

import type { TechniqueContext } from "../../../framework/technique";
import type { Panel } from "../../../scene/ui";

/**
 * Fill the History card.
 * @param ctx - the technique context
 * @param p - the card's panel
 * @returns refresh, called when the state changes
 */
export function historyFace(ctx: TechniqueContext, p: Panel): () => void {
    p.stack.addControl(p.text("History", "#f78c6c", true));
    const undo = p.button("palette-history-undo", "Nothing to undo", () => {
        ctx.commands.undo(ctx.dominant());
    });
    const redo = p.button("palette-history-redo", "Redo", () => {
        ctx.commands.redo(ctx.dominant());
    });
    p.stack.addControl(undo);
    p.stack.addControl(redo);
    return () => {
        const label = ctx.commands.undoLabel();
        undo.isEnabled = label !== null;
        if (undo.textBlock) {
            undo.textBlock.text = label ?? "Nothing to undo";
        }
    };
}
