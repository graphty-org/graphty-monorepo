// The chip row in the scene: a mic button (hold to talk), a Clear button, a status line, the
// sentence chips with Run at the end, and a grid of alternatives above them. Every chip is its own
// small GUI panel from a pool built hidden at prepare, so a ray or a fingertip reaches each one and
// the dry run can aim at it by mesh name ("voice-chip-3", "voice-alt-0"). A chip's texture redraws
// only when its text or style changes.

import { type Mesh, TransformNode } from "@babylonjs/core";
import type { Button } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { type Chip, guiButton, type Panel } from "../../scene/ui";

/** How a chip looks. */
export type ChipStyle = "solid" | "interim" | "unparsed" | "run" | "run-off" | "top" | "more";

/** What the row shows. */
export interface RowView {
    listening: boolean;
    status: string;
    chips: { text: string; style: ChipStyle }[];
    alts: { text: string; style: ChipStyle }[];
}

/** The row. */
export interface ChipRow {
    /** The mic chip's mesh (the system keyboard opens on a select there). */
    mic: Mesh;
    render(v: RowView): void;
    show(): void;
    hide(): void;
}

/** What the row reports. */
interface RowEvents {
    micDown(): void;
    micUp(): void;
    clear(): void;
    chip(i: number): void;
    alt(i: number): void;
}

const CHIPS = 10;
const ALTS = 20;
const ALT_COLUMNS = 5;
const W = 0.1;
const H = 0.032;
const GAP = 0.006;
const PER_ROW = 6;
const STYLE: Record<ChipStyle, { bg: string; fg: string }> = {
    solid: { bg: "#34405a", fg: "#ffffff" },
    interim: { bg: "#2a2f3a", fg: "#8c93a3" },
    unparsed: { bg: "#7a2630", fg: "#ffd6d6" },
    run: { bg: "#2f7a3a", fg: "#ffffff" },
    "run-off": { bg: "#2a3a2d", fg: "#6f8a73" },
    top: { bg: "#4a5f8f", fg: "#ffffff" },
    more: { bg: "#2a3346", fg: "#c8d2e6" },
};

interface Slot {
    panel: Panel;
    button: Button;
    key: string;
}

/**
 * Build the row hidden, above the graph and in front of it.
 * @param ctx - the technique context
 * @param on - where pokes go
 * @returns the row
 */
export function createChipRow(ctx: TechniqueContext, on: RowEvents): ChipRow {
    const root = new TransformNode("voice-row", ctx.scene);
    root.parent = ctx.anchor("graph-top");
    // 30 cm toward the viewer from the space above the graph, so it is in front of the nodes.
    root.position.set(0, -0.04, -0.3);
    root.setEnabled(false);

    const slot = (name: string, w: number, onClick: () => void): Slot => {
        const panel = ctx.ui.panel(name, w, H, Math.round(256 * (w / W)));
        panel.mesh.parent = root;
        const button = guiButton(`${name}-button`, "", onClick, 78, "100%");
        button.paddingTop = button.paddingBottom = "0px";
        panel.stack.addControl(button);
        return { panel, button, key: "" };
    };
    const paint = (s: Slot, text: string, style: ChipStyle): void => {
        const key = `${text}|${style}`;
        if (key === s.key) {
            return;
        }
        s.key = key;
        const { button } = s;
        if (button.textBlock) {
            button.textBlock.text = text;
            button.textBlock.color = STYLE[style].fg;
            button.textBlock.fontSize = Math.min(40, Math.floor(400 / Math.max(6, text.length)));
        }
        button.background = STYLE[style].bg;
        button.isEnabled = style !== "run-off";
    };

    // The top line, left to right: mic, Clear, status, over the width of the chip rows.
    const left = -(PER_ROW * (W + GAP) - GAP) / 2;
    const right = -left;
    const mic = slot("mic", W * 1.3, () => undefined);
    mic.button.onPointerDownObservable.add(() => {
        on.micDown();
    });
    mic.button.onPointerUpObservable.add(() => {
        on.micUp();
    });
    mic.panel.mesh.position.set(left + W * 0.65, H + GAP, 0);
    const clear = slot("clear", W * 0.8, () => {
        on.clear();
    });
    clear.panel.mesh.position.set(left + W * 1.3 + GAP + W * 0.4, H + GAP, 0);
    paint(clear, "Clear", "more");
    const statusLeft = left + W * 2.1 + 2 * GAP;
    const status: Chip = ctx.ui.chip("status", right - statusLeft, H * 0.8);
    status.mesh.parent = root;
    status.mesh.position.set((statusLeft + right) / 2, H + GAP, 0);

    const chips: Slot[] = [];
    for (let i = 0; i < CHIPS; i++) {
        const s = slot(`chip-${i}`, W, () => {
            on.chip(i);
        });
        const row = Math.floor(i / PER_ROW);
        s.panel.mesh.position.set((i % PER_ROW) * (W + GAP) - ((PER_ROW - 1) * (W + GAP)) / 2, -row * (H + GAP), 0);
        chips.push(s);
    }
    const alts: Slot[] = [];
    for (let i = 0; i < ALTS; i++) {
        const s = slot(`alt-${i}`, W, () => {
            on.alt(i);
        });
        const row = Math.floor(i / ALT_COLUMNS);
        s.panel.mesh.position.set(
            (i % ALT_COLUMNS) * (W + GAP) - ((ALT_COLUMNS - 1) * (W + GAP)) / 2,
            2 * (H + GAP) + row * (H + GAP),
            0,
        );
        alts.push(s);
    }
    mic.panel.show();
    clear.panel.show();

    let statusText = "";
    return {
        mic: mic.panel.mesh,
        render(v) {
            paint(mic, v.listening ? "Listening" : "Hold to talk", v.listening ? "unparsed" : "top");
            if (v.status !== statusText) {
                statusText = v.status;
                if (v.status) {
                    status.set(v.status, "#20283a");
                    status.show();
                } else {
                    status.hide();
                }
            }
            const fill = (pool: Slot[], items: RowView["chips"]): void => {
                pool.forEach((s, i) => {
                    const item = items[i];
                    if (item) {
                        paint(s, item.text, item.style);
                        s.panel.show();
                    } else {
                        s.panel.hide();
                    }
                });
            };
            fill(chips, v.chips.slice(0, CHIPS));
            fill(alts, v.alts.slice(0, ALTS));
        },
        show() {
            root.setEnabled(true);
        },
        hide() {
            root.setEnabled(false);
        },
    };
}

/** How many alternatives the grid can show. */
export const MAX_ALTS = ALTS;
