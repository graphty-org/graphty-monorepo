// The Analyze face: reveal a result ("Run PageRank"). A revealed result reads as shown.

import type { TechniqueContext } from "../../../framework/technique";
import type { Panel } from "../../../scene/ui";

/**
 * Fill the Analyze card.
 * @param ctx - the technique context
 * @param p - the card's panel
 * @returns refresh, called when the state changes
 */
export function analyzeFace(ctx: TechniqueContext, p: Panel): () => void {
    p.stack.addControl(p.text("Analyze", "#f78c6c", true));
    const names = ctx.graph.data.resultNames;
    const buttons = Object.keys(names).map((id) => {
        const b = p.button(`palette-analyze-${id}`, `Run ${names[id]}`, () => {
            ctx.commands.run("run", { result: id }, ctx.dominant());
        });
        p.stack.addControl(b);
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
