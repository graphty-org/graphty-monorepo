// The layer list (design section 9.4): a slate to the left of the graph listing what is applied to
// the graph, in order -- the selection highlight, color by, size by, the filter, hidden nodes --
// each with a remove button that issues the command undoing just that layer.

import { Control, StackPanel } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { guiButton, guiText } from "../../scene/ui";
import { createSlate, type Slate } from "./inspector";

/** The layer list. */
export interface LayerList {
    slate: Slate;
    /** Rebuild the rows from the state. */
    refresh(): void;
    /** The row labels shown, for the dry run. */
    rows(): string[];
}

/** One layer: its label, and the command that removes it (or none). */
interface Row {
    id: string;
    label: string;
    remove?: () => void;
}

const ROW_PX = 60;

/**
 * Build the layer list, hidden.
 * @param ctx - the technique context
 * @returns the layer list
 */
export function createLayerList(ctx: TechniqueContext): LayerList {
    const slate = createSlate(ctx, "layers", "Layers", 0.28, 0.26, 640);
    const { data } = ctx.graph;
    const s = ctx.state;
    const count = (n: number): string => `${n} ${n === 1 ? data.noun[0] : data.noun[1]}`;
    const names = (ids: number[]): string => (ids.length === 1 ? data.names[ids[0]] : count(ids.length));

    const current = (): Row[] => {
        const out: Row[] = [];
        if (s.selection.size) {
            out.push({
                id: "selection",
                label: `Selection: ${names([...s.selection])}`,
                remove: () => ctx.commands.run("select", { ids: [] }),
            });
        }
        if (s.colorBy) {
            out.push({
                id: "color",
                label: `Color by ${data.resultNames[s.colorBy]}`,
                remove: () => ctx.commands.run("colorBy", { result: null }),
            });
        }
        if (s.sizeBy) {
            out.push({
                id: "size",
                label: `Size by ${data.resultNames[s.sizeBy]}`,
                remove: () => ctx.commands.run("sizeBy", { result: null }),
            });
        }
        if (s.filter) {
            const word = s.filter.op === ">=" ? "at least" : "at most";
            out.push({
                id: "filter",
                label: `Keep ${data.resultNames[s.filter.result]} ${word} ${s.filter.value.toFixed(3)}`,
                remove: () => ctx.commands.run("clearFilter", {}),
            });
        }
        if (s.hidden.size) {
            const ids = [...s.hidden];
            out.push({
                id: "hidden",
                label: `Hidden: ${names(ids)}`,
                remove: () => ctx.commands.run("show", { ids }),
            });
        }
        if (s.notes.length) {
            out.push({ id: "notes", label: `Notes: ${s.notes.length}` });
        }
        return out;
    };

    let shown: Row[] = [];
    return {
        slate,
        rows: () => shown.map((r) => r.label),
        refresh() {
            shown = current();
            for (const c of slate.body.stack.children.slice()) {
                slate.body.stack.removeControl(c);
                c.dispose();
            }
            if (shown.length === 0) {
                slate.body.stack.addControl(guiText("No layers yet: use the toolbar", ROW_PX, "#9fb3d9"));
                return;
            }
            for (const r of shown) {
                const row = new StackPanel(`figma-layer-row-${r.id}`);
                row.isVertical = false;
                row.height = `${ROW_PX}px`;
                row.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
                const text = guiText(r.label, ROW_PX);
                text.width = "520px";
                row.addControl(text);
                const { remove } = r;
                if (remove) {
                    row.addControl(
                        guiButton(
                            `figma-layer-x-${r.id}`,
                            "x",
                            () => {
                                ctx.log("click", { item: `remove ${r.id}` });
                                remove();
                            },
                            ROW_PX - 6,
                            100,
                        ),
                    );
                }
                slate.body.stack.addControl(row);
            }
        },
    };
}
