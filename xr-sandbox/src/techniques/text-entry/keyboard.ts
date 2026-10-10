// The in-scene keyboard: Babylon GUI's VirtualKeyboard and an InputText on one near-pickable panel,
// so a controller ray, a hand ray and a fingertip poke all reach the keys (Babylon's near
// interaction picks with a sphere and fills in the texture coordinates the GUI needs).
//
// Reused as is: VirtualKeyboard's key buttons, its rows and shift display, and InputText as the
// field (with `disableMobilePrompt`, or a touch focus calls window.prompt() and freezes the
// session). Not reused: `VirtualKeyboard.connect(inputText)`. It types only while the field holds
// the GUI focus, and a pointer up anywhere off this panel (the other hand, a ray on the graph)
// blurs the field and hides the keyboard, so keys are applied here from `onKeyPressObservable`.

import { type Mesh, PointerEventTypes, Vector3 } from "@babylonjs/core";
import { Control, InputText, StackPanel, VirtualKeyboard } from "@babylonjs/gui";

import type { TechniqueContext } from "../../framework/technique";
import { guiButton, guiText, type Panel } from "../../scene/ui";

const BACK = "←";
const ENTER = "↵";
const SHIFT = "⇧";

/** Panel size: 2000 texture pixels per meter, so a 48 px key pitch is 2.4 cm. */
const WIDTH_M = 0.34;
const HEIGHT_M = 0.2;
const PX = 680;
const PX_PER_M = PX / WIDTH_M;
const KEY_PX = 48;
const KEY_PAD_PX = 2;

/** What happened while the keyboard was open, for the log. */
export interface KeyStats {
    keys: number;
    backspaces: number;
    /** Key presses by pointer type: "xr-near" is a poke, "xr" a ray. */
    by: Record<string, number>;
}

/** The keyboard panel. */
export interface Keyboard {
    readonly panel: Panel;
    readonly mesh: Mesh;
    /** The field's text. */
    text: string;
    open(label: string, initial: string): void;
    close(): void;
    readonly stats: KeyStats;
    /** Called with "done" (Enter or Done) or "cancel". */
    onFinish: (how: "done" | "cancel") => void;
    /** For the dry run: each key's world center and visible size in meters. */
    keys(): Record<string, { center: number[]; widthM: number; heightM: number }>;
}

/**
 * Build the keyboard, hidden.
 * @param ctx - the technique context
 * @returns the keyboard
 */
export function createKeyboard(ctx: TechniqueContext): Keyboard {
    const panel = ctx.ui.panel("keyboard", WIDTH_M, HEIGHT_M, PX);
    const { mesh } = panel;
    const label = guiText("", 36, "#9aa6bf");
    panel.stack.addControl(label);

    const field = new InputText("text-entry-field", "");
    field.disableMobilePrompt = true;
    field.height = "56px";
    field.width = "640px";
    field.fontSize = 30;
    field.color = "#e8ecf4";
    field.background = "#0e1320";
    field.focusedBackground = "#0e1320";
    field.thickness = 1;
    field.maxWidth = "640px";
    field.paddingBottom = "4px";
    panel.stack.addControl(field);

    const kb = new VirtualKeyboard("text-entry-keys");
    kb.defaultButtonWidth = `${KEY_PX}px`;
    kb.defaultButtonHeight = `${KEY_PX}px`;
    for (const side of ["Left", "Right", "Top", "Bottom"] as const) {
        kb[`defaultButtonPadding${side}`] = `${KEY_PAD_PX}px`;
    }
    kb.defaultButtonBackground = "#34405a";
    kb.defaultButtonColor = "#e8ecf4";
    // VirtualKeyboard.CreateDefaultLayout's rows, with bigger keys and a wider space bar.
    kb.addKeysRow(["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", BACK]);
    kb.addKeysRow(["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"]);
    kb.addKeysRow(["a", "s", "d", "f", "g", "h", "j", "k", "l", ";", "'", ENTER]);
    kb.addKeysRow([SHIFT, "z", "x", "c", "v", "b", "n", "m", ",", ".", "/"]);
    kb.addKeysRow([" "], [{ width: `${KEY_PX * 6}px` }]);
    kb.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    panel.stack.addControl(kb);

    const row = new StackPanel("text-entry-actions");
    row.isVertical = false;
    row.height = "60px";
    panel.stack.addControl(row);

    let shift = 0;
    let lastPointer = "";
    const stats: KeyStats = { keys: 0, backspaces: 0, by: {} };
    const k: Keyboard = {
        panel,
        mesh,
        get text() {
            return field.text;
        },
        set text(v) {
            field.text = v;
        },
        open(text, initial) {
            label.text = text;
            field.text = initial;
            shift = 0;
            kb.applyShiftState(0);
            stats.keys = 0;
            stats.backspaces = 0;
            stats.by = {};
            panel.show();
        },
        close() {
            panel.hide();
        },
        stats,
        onFinish: () => undefined,
        keys() {
            const out: Record<string, { center: number[]; widthM: number; heightM: number }> = {};
            const h = Math.round((PX * HEIGHT_M) / WIDTH_M);
            const world = mesh.computeWorldMatrix(true);
            for (const r of kb.children as StackPanel[]) {
                for (const key of r.children) {
                    // Texture pixels to the plane's local meters (u right, v down), then to the world.
                    const local = new Vector3(
                        (key.centerX / PX - 0.5) * WIDTH_M,
                        (0.5 - key.centerY / h) * HEIGHT_M,
                        0,
                    );
                    out[key.name ?? ""] = {
                        center: Vector3.TransformCoordinates(local, world).asArray(),
                        widthM: (key.widthInPixels - 2 * KEY_PAD_PX) / PX_PER_M,
                        heightM: (key.heightInPixels - 2 * KEY_PAD_PX) / PX_PER_M,
                    };
                }
            }
            return out;
        },
    };
    row.addControl(
        guiButton(
            "text-entry-cancel",
            "Cancel",
            () => {
                k.onFinish("cancel");
            },
            56,
            200,
        ),
    );
    row.addControl(
        guiButton(
            "text-entry-done",
            "Done",
            () => {
                k.onFinish("done");
            },
            56,
            200,
        ),
    );

    // Which pointer pressed the panel last: a poke ("xr-near") or a ray ("xr").
    ctx.scene.onPointerObservable.add((pi) => {
        if (pi.type === PointerEventTypes.POINTERDOWN && pi.pickInfo?.pickedMesh === mesh) {
            lastPointer = (pi.event as PointerEvent).pointerType;
        }
    });

    kb.onKeyPressObservable.add((key) => {
        stats.keys++;
        stats.by[lastPointer] = (stats.by[lastPointer] ?? 0) + 1;
        switch (key) {
            case SHIFT:
                shift = (shift + 1) % 3;
                kb.applyShiftState(shift);
                return;
            case BACK:
                stats.backspaces++;
                field.text = field.text.slice(0, -1);
                return;
            case ENTER:
                k.onFinish("done");
                return;
            default:
                break;
        }
        field.text += shift ? key.toUpperCase() : key;
        if (shift === 1) {
            shift = 0;
            kb.applyShiftState(0);
        }
    });
    return k;
}
