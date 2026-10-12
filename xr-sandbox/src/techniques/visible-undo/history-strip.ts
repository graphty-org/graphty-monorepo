// The history strip above the graph: the last five steps oldest first, any of which can be poked
// (or pressed by ray) to undo back to and including it, then an Undo button that names its step and
// Redo. One panel that grows upward from just above the graph to hold its labels; its text is set
// only when the history changes.

import type { Button } from "@babylonjs/gui";

import type { HistoryEntry } from "../../core/commands";
import type { TechniqueContext } from "../../framework/technique";

/** How many steps the strip shows. */
export const STRIP = 5;

const W = 0.4;
const PX = 1024;

/** The strip: the last five steps, Undo and Redo. */
export interface HistoryStrip {
    /** Redraw the labels that changed. */
    refresh(history: readonly HistoryEntry[], undoLabel: string | null, canRedo: boolean): void;
    show(): void;
    hide(): void;
}

/**
 * Build the strip, hidden, above the graph.
 * @param ctx - the technique context
 * @returns the strip
 */
export function createHistoryStrip(ctx: TechniqueContext): HistoryStrip {
    const panel = ctx.ui.panel("strip", W, 0.1, PX, { read: "graph", fit: "up" });
    panel.mesh.parent = ctx.anchor("graph-top");
    // The bottom edge 3 cm above the example chip at graph-top.
    panel.mesh.position.set(0, 0.03 + 0.05, 0);
    const setText = (b: Button, text: string, enabled: boolean): void => {
        if (b.textBlock && b.textBlock.text !== text) {
            b.textBlock.text = text;
        }
        if (b.isEnabled !== enabled) {
            b.isEnabled = enabled;
        }
    };

    let shown: readonly HistoryEntry[] = [];
    const items = Array.from({ length: STRIP }, (_, k) => {
        const b = panel.button(`visible-undo-strip-${k}-button`, "", () => {
            const entry = shown[k];
            const index = ctx.commands.history().indexOf(entry);
            if (index >= 0) {
                ctx.log("strip.press", { item: k, undoTo: index, step: entry.label });
                ctx.commands.undoTo(index);
            }
        });
        b.isVisible = false;
        panel.stack.addControl(b);
        return b;
    });
    const row = panel.line();
    const undo = panel.button(
        "visible-undo-undo-button",
        "",
        () => {
            ctx.commands.undo();
        },
        Math.round(PX * 0.72),
    );
    const redo = panel.button(
        "visible-undo-redo-button",
        "",
        () => {
            ctx.commands.redo();
        },
        Math.round(PX * 0.28),
    );
    row.addControl(undo);
    row.addControl(redo);
    panel.stack.addControl(row);

    return {
        refresh(history, undoLabel, canRedo) {
            shown = history.slice(-STRIP);
            setText(undo, undoLabel ?? "Nothing to undo", !!undoLabel);
            setText(redo, "Redo", canRedo);
            items.forEach((b, k) => {
                const want = k < shown.length;
                if (want) {
                    setText(b, shown[k].label, true);
                }
                if (b.isVisible !== want) {
                    b.isVisible = want;
                }
            });
        },
        show() {
            panel.show();
        },
        hide() {
            panel.hide();
        },
    };
}
