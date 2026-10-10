// The history strip above the graph: an Undo button that names its step, Redo, and the last five
// steps oldest first, any of which can be poked (or pressed by ray) to undo back to and including
// it. Each button is its own small framework panel, so a ray or fingertip lands on exactly one
// mesh, and its text is set only when the history changes.

import type { Button } from "@babylonjs/gui";

import type { HistoryEntry } from "../../core/commands";
import type { TechniqueContext } from "../../framework/technique";
import { guiButton, type Panel } from "../../scene/ui";

/** How many steps the strip shows. */
export const STRIP = 5;

const W = 0.1;
const H = 0.03;
const PX = 320;

/** The strip: Undo, Redo and the last five steps. */
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
    const top = ctx.anchor("graph-top");
    const widths = new Map<Button, number>();
    const make = (name: string, w: number, x: number, y: number, onClick: () => void): [Panel, Button] => {
        const px = Math.round((PX * w) / W);
        const panel = ctx.ui.panel(name, w, H, px);
        panel.mesh.parent = top;
        panel.mesh.position.set(x, y, 0);
        const button = guiButton(`visible-undo-${name}-button`, "", onClick, Math.round((PX * H) / W));
        panel.stack.addControl(button);
        widths.set(button, px);
        return [panel, button];
    };
    const setText = (b: Button, text: string, enabled: boolean): void => {
        if (b.textBlock && b.textBlock.text !== text) {
            b.textBlock.text = text;
            // Long labels ("Keep PageRank at least 0.070 (5 of 15)") shrink to fit their button.
            b.fontSize = Math.round(Math.min(48, ((widths.get(b) ?? PX) * 1.7) / Math.max(1, text.length)));
        }
        if (b.isEnabled !== enabled) {
            b.isEnabled = enabled;
        }
    };

    // Above the example chip at graph-top: Undo and Redo, then the steps.
    const [undoPanel, undo] = make("undo", 0.24, -0.04, 0.05, () => {
        ctx.commands.undo();
    });
    const [redoPanel, redo] = make("redo", 0.07, 0.12, 0.05, () => {
        ctx.commands.redo();
    });
    let shown: readonly HistoryEntry[] = [];
    const items = Array.from({ length: STRIP }, (_, k) =>
        make(`strip-${k}`, W, (k - (STRIP - 1) / 2) * (W + 0.006), 0.088, () => {
            const entry = shown[k];
            const index = ctx.commands.history().indexOf(entry);
            if (index >= 0) {
                ctx.log("strip.press", { item: k, undoTo: index, step: entry.label });
                ctx.commands.undoTo(index);
            }
        }),
    );
    let visible = false;
    const showItems = (): void => {
        items.forEach(([p], k) => {
            const want = visible && k < shown.length;
            if (p.visible !== want) {
                if (want) {
                    p.show();
                } else {
                    p.hide();
                }
            }
        });
    };

    return {
        refresh(history, undoLabel, canRedo) {
            shown = history.slice(-STRIP);
            setText(undo, undoLabel ?? "Nothing to undo", !!undoLabel);
            setText(redo, "Redo", canRedo);
            items.forEach(([, b], k) => {
                if (k < shown.length) {
                    setText(b, shown[k].label, true);
                }
            });
            showItems();
        },
        show() {
            visible = true;
            undoPanel.show();
            redoPanel.show();
            showItems();
        },
        hide() {
            visible = false;
            undoPanel.hide();
            redoPanel.hide();
            showItems();
        },
    };
}
