// The Style face: color by and size by, each a grid of the results (and None); the current choice
// is highlighted.

import type { Button, StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../../framework/technique";
import type { Panel } from "../../../scene/ui";

const ON = "#8a4a32";
const OFF = "#34405a";
/** Buttons per row: two result names fit across a card. */
const PER_ROW = 2;

/**
 * Fill the Style card.
 * @param ctx - the technique context
 * @param p - the card's panel
 * @returns refresh, called when the state changes
 */
export function styleFace(ctx: TechniqueContext, p: Panel): () => void {
    const { resultNames: names, categorical } = ctx.graph.data;
    const width = Math.floor(p.adt.getSize().width / PER_ROW);
    const grid = (
        title: string,
        kind: "color" | "size",
        ids: (string | null)[],
    ): { id: string | null; b: Button }[] => {
        p.stack.addControl(p.text(title, "#f78c6c", true));
        let row: StackPanel | null = null;
        return ids.map((id, i) => {
            if (i % PER_ROW === 0) {
                row = p.line();
                p.stack.addControl(row);
            }
            const b = p.button(
                `palette-style-${kind}-${id ?? "none"}`,
                id ? names[id] : "None",
                () => {
                    ctx.commands.run(kind === "color" ? "colorBy" : "sizeBy", { result: id }, ctx.dominant());
                },
                width,
            );
            row?.addControl(b);
            return { id, b };
        });
    };
    const results = Object.keys(names);
    const color = grid("Color by", "color", [...results, null]);
    const size = grid("Size by", "size", [...results.filter((id) => !categorical[id]), null]);
    return () => {
        for (const { id, b } of color) {
            b.background = ctx.state.colorBy === id ? ON : OFF;
        }
        for (const { id, b } of size) {
            b.background = ctx.state.sizeBy === id ? ON : OFF;
        }
    };
}
