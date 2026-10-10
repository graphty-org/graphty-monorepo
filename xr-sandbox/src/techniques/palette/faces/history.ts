// The History face: undo and redo, the undo button naming its step ("Undo: Color by PageRank").

import type { StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../../framework/technique";
import { guiButton, guiText } from "../../../scene/ui";

/**
 * Fill the History card.
 * @param ctx - the technique context
 * @param stack - the card's stack
 * @returns refresh, called when the state changes
 */
export function historyFace(ctx: TechniqueContext, stack: StackPanel): () => void {
    stack.addControl(guiText("History", 34, "#f78c6c"));
    const undo = guiButton(
        "palette-history-undo",
        "Nothing to undo",
        () => {
            ctx.commands.undo(ctx.dominant());
        },
        56,
    );
    const redo = guiButton(
        "palette-history-redo",
        "Redo",
        () => {
            ctx.commands.redo(ctx.dominant());
        },
        56,
    );
    stack.addControl(undo);
    stack.addControl(redo);
    return () => {
        const label = ctx.commands.undoLabel();
        undo.isEnabled = label !== null;
        if (undo.textBlock) {
            undo.textBlock.text = label ?? "Nothing to undo";
        }
    };
}
