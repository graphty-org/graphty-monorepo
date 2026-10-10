// The Style face: color by and size by, one row per result; the current choice is highlighted.

import { StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../../framework/technique";
import { guiButton, guiText } from "../../../scene/ui";

const ON = "#8a4a32";
const OFF = "#34405a";

/**
 * Fill the Style card.
 * @param ctx - the technique context
 * @param stack - the card's stack
 * @returns refresh, called when the state changes
 */
export function styleFace(ctx: TechniqueContext, stack: StackPanel): () => void {
    stack.addControl(guiText("Style", 34, "#f78c6c"));
    const { resultNames: names, categorical } = ctx.graph.data;
    const color: { id: string | null; b: ReturnType<typeof guiButton> }[] = [];
    const size: { id: string | null; b: ReturnType<typeof guiButton> }[] = [];
    const row = (): StackPanel => {
        const r = new StackPanel();
        r.isVertical = false;
        r.height = "44px";
        stack.addControl(r);
        return r;
    };
    for (const id of [...Object.keys(names), null]) {
        const r = row();
        const label = id ? names[id] : "nothing";
        const c = guiButton(
            `palette-style-color-${id ?? "none"}`,
            `Color by ${label}`,
            () => {
                ctx.commands.run("colorBy", { result: id }, ctx.dominant());
            },
            44,
            220,
        );
        r.addControl(c);
        color.push({ id, b: c });
        if (id === null || !categorical[id]) {
            const s = guiButton(
                `palette-style-size-${id ?? "none"}`,
                `Size by ${label}`,
                () => {
                    ctx.commands.run("sizeBy", { result: id }, ctx.dominant());
                },
                44,
                220,
            );
            r.addControl(s);
            size.push({ id, b: s });
        }
    }
    return () => {
        for (const { id, b } of color) {
            b.background = ctx.state.colorBy === id ? ON : OFF;
        }
        for (const { id, b } of size) {
            b.background = ctx.state.sizeBy === id ? ON : OFF;
        }
    };
}
