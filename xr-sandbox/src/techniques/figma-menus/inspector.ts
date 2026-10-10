// The inspector (design section 9.4): a slate to the right of the graph showing the selected
// node's facts, every result's value and rank. Also the slate itself (a draggable title bar with a
// 2D GUI body hanging under it), which the layer list reuses.
//
// Built on Babylon's 2D GUI on a mesh (the framework's ctx.ui.panel, as in playgrounds #24DLJ4#7
// and #43YQHC#2) and core's PointerDragBehavior, which is what HolographicSlate itself drags its
// content with. HolographicSlate is not used directly; README.md in this folder says why.

import { PointerDragBehavior, Vector3 } from "@babylonjs/core";
import type { TextBlock } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { guiText, type Panel } from "../../scene/ui";

/** A title bar you drag by ray or hand, with a body panel hanging under it. */
export interface Slate {
    bar: Panel;
    body: Panel;
    show(): void;
    hide(): void;
}

const BAR_M = 0.035;

/**
 * A slate: the bar is the root (place and drag it); the body is its child.
 * @param ctx - the technique context
 * @param name - mesh name stem
 * @param title - the bar's text
 * @param widthM - width in meters
 * @param heightM - body height in meters
 * @param px - body texture width in pixels (at most 768)
 * @returns the slate, hidden
 */
export function createSlate(
    ctx: TechniqueContext,
    name: string,
    title: string,
    widthM: number,
    heightM: number,
    px: number,
): Slate {
    const bar = ctx.ui.panel(`${name}-bar`, widthM, BAR_M, 512);
    bar.stack.background = "#3a4a6aee";
    bar.stack.addControl(guiText(`${title}  (drag here)`, 64, "#e8ecf4"));
    const body = ctx.ui.panel(name, widthM, heightM, px);
    body.mesh.parent = bar.mesh;
    body.mesh.position.set(0, -(BAR_M / 2 + 0.004 + heightM / 2), 0);
    // Drag in the slate's own plane: a 20 cm sweep of the ray's hit point moves it 20 cm, with no
    // twist from the wrist and no push or pull in depth.
    const drag = new PointerDragBehavior({ dragPlaneNormal: new Vector3(0, 0, 1) });
    drag.useObjectOrientationForDragging = true;
    drag.updateDragPlane = false;
    drag.attach(bar.mesh, (m) => m === bar.mesh);
    let from = Vector3.Zero();
    drag.onDragStartObservable.add(() => {
        from = bar.mesh.getAbsolutePosition().clone();
    });
    drag.onDragEndObservable.add(() => {
        const d = bar.mesh.getAbsolutePosition().subtract(from);
        ctx.log("drag", { panel: name, movedCm: Math.round(d.length() * 1000) / 10 });
    });
    return {
        bar,
        body,
        show: () => {
            bar.show();
            body.show();
        },
        hide: () => {
            body.hide();
            bar.hide();
        },
    };
}

/** The inspector. */
export interface Inspector {
    slate: Slate;
    /** Redraw for the current selection. */
    refresh(): void;
    /** The lines shown, for the dry run. */
    lines(): string[];
}

const LINES = 8;

/**
 * Format a value: an integer as is, a category by number, anything else to three decimals.
 * @param v - the value
 * @returns its text
 */
const fmt = (v: number): string => (Number.isInteger(v) ? String(v) : v.toFixed(3));

/**
 * Build the inspector, hidden.
 * @param ctx - the technique context
 * @returns the inspector
 */
export function createInspector(ctx: TechniqueContext): Inspector {
    const slate = createSlate(ctx, "inspector", "Inspector", 0.28, 0.26, 640);
    const rows: TextBlock[] = [];
    for (let i = 0; i < LINES; i++) {
        const t = guiText("", 64, i === 0 ? "#ffd479" : "#e8ecf4");
        t.name = `figma-insp-line-${i}`;
        rows.push(t);
        slate.body.stack.addControl(t);
    }
    const { data } = ctx.graph;
    const factsOf = (i: number): string[] => {
        const out = [data.names[i]];
        for (const [id, label] of Object.entries(data.resultNames)) {
            const v = data.results[id][i];
            out.push(data.categorical[id] ? `${label}: group ${fmt(v)}` : `${label}: ${fmt(v)}  #${data.rank[id][i]}`);
        }
        if (ctx.state.hidden.has(i)) {
            out.push("hidden");
        }
        const notes = ctx.state.notes.filter((n) => n.target === i).length;
        if (notes) {
            out.push(`${notes} ${notes === 1 ? "note" : "notes"}`);
        }
        return out;
    };
    const lines = (): string[] => {
        const sel = [...ctx.state.selection];
        if (sel.length === 0) {
            return ["Nothing selected", "Tap a node to inspect it"];
        }
        const out = factsOf(sel[0]);
        if (sel.length > 1) {
            out[0] = `${data.names[sel[0]]} and ${sel.length - 1} more`;
        }
        return out;
    };
    return {
        slate,
        lines,
        refresh() {
            const l = lines();
            rows.forEach((t, i) => {
                t.text = l[i] ?? "";
            });
        },
    };
}
