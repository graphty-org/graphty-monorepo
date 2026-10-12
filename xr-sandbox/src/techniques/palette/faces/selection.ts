// The Selection face: what is selected, and the verbs on it (grow one hop, hide, clear, show hidden).

import type { TechniqueContext } from "../../../framework/technique";
import type { Panel } from "../../../scene/ui";

/**
 * Fill the Selection card.
 * @param ctx - the technique context
 * @param p - the card's panel
 * @returns refresh, called when the state changes
 */
export function selectionFace(ctx: TechniqueContext, p: Panel): () => void {
    const { names, noun } = ctx.graph.data;
    const hand = (): ReturnType<TechniqueContext["dominant"]> => ctx.dominant();
    p.stack.addControl(p.text("Selection", "#f78c6c", true));
    const line = p.text("Nothing selected");
    p.stack.addControl(line);
    const grow = p.button("palette-selection-grow", "Grow 1 hop", () => {
        const [id] = ctx.state.selection;
        if (id !== undefined) {
            ctx.commands.run("neighbors", { id, hops: 1 }, hand());
        }
    });
    const hide = p.button("palette-selection-hide", "Hide selected", () => {
        ctx.commands.run("hide", { ids: [...ctx.state.selection] }, hand());
    });
    const clear = p.button("palette-selection-clear", "Clear selection", () => {
        ctx.commands.run("select", { ids: [] }, hand());
    });
    const show = p.button("palette-selection-show", "Show hidden", () => {
        ctx.commands.run("show", { ids: [...ctx.state.hidden] }, hand());
    });
    for (const b of [grow, hide, clear, show]) {
        p.stack.addControl(b);
    }
    return () => {
        const sel = [...ctx.state.selection];
        line.text = sel.length > 1 ? `${sel.length} ${noun[1]} selected` : "Nothing selected";
        if (sel.length === 1) {
            line.text = `Selected: ${names[sel[0]]}`;
        }
        grow.isEnabled = sel.length === 1;
        hide.isEnabled = sel.length > 0;
        clear.isEnabled = sel.length > 0;
        show.isEnabled = ctx.state.hidden.size > 0;
        if (show.textBlock) {
            show.textBlock.text = `Show hidden (${ctx.state.hidden.size})`;
        }
    };
}
