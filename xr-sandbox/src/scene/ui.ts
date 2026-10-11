// UI factories every panel, chip and button in the sandbox is built from: Babylon 2D GUI on a
// near-pickable plane (so both a ray and a fingertip poke reach it), and small single-texture chips
// for text that changes. Rule 18 of design section 10.2: changing text lives on its own small
// texture, redrawn only when the text changes.

import {
    Color3,
    DynamicTexture,
    type Mesh,
    MeshBuilder,
    type Scene,
    StandardMaterial,
    TransformNode,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, StackPanel, TextBlock } from "@babylonjs/gui";

/** Counters the dry run reads to check that idle UI does not redraw. */
export const uiStats = { panelRenders: 0, chipRedraws: 0 };

/** Every panel built, so the dry run can find a GUI control on any of them by name. */
export const panels: Panel[] = [];

/** A flat panel of 2D GUI on a plane. */
export interface Panel {
    mesh: Mesh;
    adt: AdvancedDynamicTexture;
    /** A vertical stack filling the panel. */
    stack: StackPanel;
    show(): void;
    hide(): void;
    readonly visible: boolean;
}

/**
 * Mark a mesh as UI: the pointer predicate accepts only these, and a press on one is never arbitrated.
 * @param mesh - the mesh
 */
const markUi = (mesh: Mesh): void => {
    mesh.metadata = { ...(mesh.metadata as object | null), ui: true };
    mesh.isPickable = true;
    mesh.isNearPickable = true;
};

/**
 * A panel of 2D GUI on a plane.
 * @param scene - the scene
 * @param name - mesh name
 * @param widthM - width in meters
 * @param heightM - height in meters
 * @param px - texture width in pixels (height follows the aspect); about 512 to 768 for 30 cm
 * @returns the panel, hidden
 */
export function createPanel(scene: Scene, name: string, widthM: number, heightM: number, px: number): Panel {
    const mesh = MeshBuilder.CreatePlane(name, { width: widthM, height: heightM }, scene);
    markUi(mesh);
    const adt = AdvancedDynamicTexture.CreateForMesh(mesh, px, Math.round((px * heightM) / widthM), true, false);
    adt.onBeginRenderObservable.add(() => {
        uiStats.panelRenders++;
    });
    const back = new StackPanel(`${name}-stack`);
    back.background = "#1c2230ee";
    back.width = 1;
    back.height = 1;
    back.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    adt.addControl(back);
    mesh.setEnabled(false);
    const panel: Panel = {
        mesh,
        adt,
        stack: back,
        show: () => {
            mesh.setEnabled(true);
        },
        hide: () => {
            mesh.setEnabled(false);
        },
        get visible() {
            return mesh.isEnabled(false);
        },
    };
    panels.push(panel);
    return panel;
}

/**
 * A GUI button.
 * @param name - control name (the dry run finds buttons by it)
 * @param text - its label
 * @param onClick - called on a click by ray or poke
 * @param heightPx - height in texture pixels
 * @param widthPx - width in texture pixels, or a fraction of the parent
 * @returns the button
 */
export function guiButton(
    name: string,
    text: string,
    onClick: () => void,
    heightPx = 44,
    widthPx: number | string = "100%",
): Button {
    const b = Button.CreateSimpleButton(name, text);
    b.height = `${heightPx}px`;
    b.width = typeof widthPx === "number" ? `${widthPx}px` : widthPx;
    b.color = "#e8ecf4";
    b.background = "#34405a";
    b.cornerRadius = 6;
    b.thickness = 1;
    b.fontSize = Math.round(heightPx * 0.5);
    b.paddingTop = "2px";
    b.paddingBottom = "2px";
    b.onPointerClickObservable.add(onClick);
    return b;
}

/**
 * A GUI line of text.
 * @param text - the text
 * @param heightPx - line height in texture pixels
 * @param color - CSS color
 * @returns the text block
 */
export function guiText(text: string, heightPx = 30, color = "#e8ecf4"): TextBlock {
    const t = new TextBlock(undefined, text);
    t.height = `${heightPx}px`;
    t.color = color;
    t.fontSize = Math.round(heightPx * 0.62);
    t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
    t.paddingLeft = "10px";
    return t;
}

/** A small plane of text on its own texture, redrawn only when its text changes. */
export interface Chip {
    mesh: Mesh;
    set(text: string, color?: string): void;
    show(): void;
    hide(): void;
}

/**
 * A chip: a small text plane on its own texture.
 * @param scene - the scene
 * @param name - mesh name
 * @param widthM - width in meters
 * @param heightM - height in meters
 * @param billboard - whether it always faces the viewer
 * @returns the chip, hidden
 */
export function createChip(scene: Scene, name: string, widthM: number, heightM: number, billboard = false): Chip {
    const mesh = MeshBuilder.CreatePlane(name, { width: widthM, height: heightM }, scene);
    const w = 512;
    const h = Math.max(32, Math.round((w * heightM) / widthM));
    const tex = new DynamicTexture(`${name}-tex`, { width: w, height: h }, scene, true);
    tex.hasAlpha = true;
    const mat = new StandardMaterial(`${name}-mat`, scene);
    mat.diffuseTexture = tex;
    mat.emissiveColor = Color3.White();
    mat.disableLighting = true;
    mat.useAlphaFromDiffuseTexture = true;
    mat.backFaceCulling = false;
    mesh.material = mat;
    mesh.isPickable = false;
    mesh.renderingGroupId = 1;
    if (billboard) {
        mesh.billboardMode = TransformNode.BILLBOARDMODE_ALL;
    }
    mesh.setEnabled(false);
    let last = "";
    return {
        mesh,
        set(text, color = "#20283a") {
            const key = `${text}|${color}`;
            if (key === last) {
                return;
            }
            last = key;
            uiStats.chipRedraws++;
            const ctx = tex.getContext();
            ctx.clearRect(0, 0, w, h);
            tex.drawText(
                text,
                null,
                Math.round(h * 0.68),
                `bold ${Math.round(h * 0.52)}px sans-serif`,
                "#ffffff",
                color,
                true,
                true,
            );
        },
        show: () => {
            mesh.setEnabled(true);
        },
        hide: () => {
            mesh.setEnabled(false);
        },
    };
}
