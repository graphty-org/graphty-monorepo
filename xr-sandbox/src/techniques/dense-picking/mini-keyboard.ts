// The mini keyboard for hint tags: only the letters that can come next, plus Back and Clear, on a
// framework panel (so a ray or a fingertip poke reaches it, and a press on it is never arbitrated).
// The keys are built once for all 26 letters; a change only shows or hides them.

import { TransformNode, Vector3 } from "@babylonjs/core";
import { type Button, Control, StackPanel } from "@babylonjs/gui";

import { guiButton, type Panel } from "../../scene/ui";

/** The keyboard. */
export interface MiniKeyboard {
    readonly panel: Panel;
    /** Show these letters (in this order) as keys; Back only when something is typed. */
    setKeys(letters: readonly string[], typed: string): void;
    /** A key's center in world meters, for the dry run; null when the key is hidden. */
    keyWorld(key: string): Vector3 | null;
}

const PER_ROW = 7;
const KEY_PX = 76;

/**
 * Build the keyboard on a panel, hidden.
 * @param panel - a framework panel, about 0.28 m by 0.13 m at 560 px
 * @param widthM - the panel's width in meters
 * @param heightM - the panel's height in meters
 * @param onKey - a letter, "back" or "clear"
 * @returns the keyboard
 */
export function createMiniKeyboard(
    panel: Panel,
    widthM: number,
    heightM: number,
    onKey: (key: string) => void,
): MiniKeyboard {
    panel.mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    const rows: StackPanel[] = [];
    const row = (): StackPanel => {
        const r = new StackPanel();
        r.isVertical = false;
        r.height = `${KEY_PX - 8}px`;
        r.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        panel.stack.addControl(r);
        rows.push(r);
        return r;
    };
    for (let k = 0; k < 4; k++) {
        row();
    }
    const keys = new Map<string, Button>();
    for (const ch of "abcdefghijklmnopqrstuvwxyz") {
        const b = guiButton(
            `dense-picking-key-${ch}`,
            ch.toUpperCase(),
            () => {
                onKey(ch);
            },
            KEY_PX - 8,
            KEY_PX,
        );
        b.isVisible = false;
        keys.set(ch, b);
    }
    const back = guiButton(
        "dense-picking-key-back",
        "Back",
        () => {
            onKey("back");
        },
        KEY_PX - 8,
        150,
    );
    const clear = guiButton(
        "dense-picking-key-clear",
        "Clear",
        () => {
            onKey("clear");
        },
        KEY_PX - 8,
        150,
    );
    rows[3].addControl(back);
    rows[3].addControl(clear);

    return {
        panel,
        setKeys(letters, typed) {
            for (const r of rows.slice(0, 3)) {
                for (const c of [...r.children]) {
                    r.removeControl(c);
                }
            }
            for (const b of keys.values()) {
                b.isVisible = false;
            }
            letters.slice(0, PER_ROW * 3).forEach((ch, k) => {
                const b = keys.get(ch);
                if (b) {
                    b.isVisible = true;
                    rows[Math.floor(k / PER_ROW)].addControl(b);
                }
            });
            back.isVisible = typed.length > 0;
        },
        keyWorld(key) {
            const named: Record<string, Button | undefined> = { back, clear };
            const b = named[key] ?? keys.get(key);
            if (!b?.isVisible || !panel.visible) {
                return null;
            }
            const size = panel.adt.getSize();
            const local = new Vector3(
                (b.centerX / size.width - 0.5) * widthM,
                (0.5 - b.centerY / size.height) * heightM,
                0,
            );
            return Vector3.TransformCoordinates(local, panel.mesh.getWorldMatrix());
        },
    };
}
