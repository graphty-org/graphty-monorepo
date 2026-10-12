// UI factories every panel, chip and button in the sandbox is built from: Babylon 2D GUI on a
// near-pickable plane (so both a ray and a fingertip poke reach it), and small single-texture chips
// for text that changes. Rule 18 of design section 10.2: changing text lives on its own small
// texture, redrawn only when the text changes.
//
// Text size comes from one scale, in degrees: every font is sized so a capital letter subtends
// TEXT_DEG at the distance the text is read from (READ: on a hand, at arm's reach, beside the
// graph). The dry run's fit check fails any capital under 1.0 degree, the usual XR legibility floor.
// Containers fit their text: buttons and text lines wrap and grow taller, panels made with `fit`
// grow or shrink to their content, and chips grow wider, then wrap.

import {
    type AbstractMesh,
    Color3,
    DynamicTexture,
    type Mesh,
    MeshBuilder,
    type Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
    VertexBuffer,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, Button, Control, StackPanel, TextBlock } from "@babylonjs/gui";

/** Counters the dry run reads to check that idle UI does not redraw. */
export const uiStats = { panelRenders: 0, chipRedraws: 0 };

/** Cap height of every text the sandbox draws, degrees of visual angle at its reading distance. */
export const TEXT_DEG = 1.2;
/** Cap height per em of Arial, the font every panel and chip draws in. */
const CAP_EM = 0.716;
/** The font family (Babylon GUI's default, used for chips too so both measure alike). */
const FAMILY = "Arial";
/** Where text is read from, meters: on or beside a hand, at arm's reach (the body zones), beside the graph. */
export const READ = { hand: 0.45, reach: 0.6, graph: 0.9 } as const;
/** A reading distance. */
export type Reach = keyof typeof READ;

/**
 * The font size (em), meters, that makes a capital subtend `deg` at `distM`.
 * @param distM - reading distance, meters
 * @param deg - cap height, degrees
 * @returns the font size in meters
 */
export const fontM = (distM: number, deg = TEXT_DEG): number => (2 * distM * Math.tan((deg * Math.PI) / 360)) / CAP_EM;

/** Every panel built, so the dry run can find a GUI control on any of them by name. */
export const panels: Panel[] = [];

/** One block of text drawn straight onto a texture (not through the 2D GUI), for the fit audit. */
export interface TextItem {
    /** Its role on the surface. */
    control: string;
    /** The lines as drawn. */
    lines: string[];
    /** CSS font it is drawn in. */
    font: string;
    /** The box it is drawn in, texture pixels. */
    boxW: number;
    boxH: number;
    /** Meters per texture pixel before the surface mesh's own scaling (world meters when it has no mesh). */
    metersPerPx: number;
    /** World position, for the viewing distance. */
    at: Vector3;
    /** Cut short to fit. */
    truncated?: boolean;
}

/** A texture with text drawn straight onto it: chips, hint tags. */
export interface TextSurface {
    name: string;
    /** The mesh showing it (its world scale applies), or null for sprites. */
    mesh: AbstractMesh | null;
    /** The text shown now. */
    items(): TextItem[];
    /** The texture's canvas, for the dry run's captures. */
    canvas?(): unknown;
}

/** Every text surface built, so the dry run can measure what they show. */
export const textSurfaces: TextSurface[] = [];

/** How a panel is built. */
export interface PanelOptions {
    /** Where it is read from (sets its font size); default "reach". */
    read?: Reach;
    /**
     * Grow or shrink the panel's height to its content, keeping its top edge where it is (true) or
     * its bottom edge ("up").
     */
    fit?: boolean | "up";
}

/** A flat panel of 2D GUI on a plane. */
export interface Panel {
    mesh: Mesh;
    adt: AdvancedDynamicTexture;
    /** A vertical stack filling the panel (with `fit`, as tall as its content). */
    stack: StackPanel;
    /** Font size of the panel's text, texture pixels. */
    readonly font: number;
    /** Height of one line of controls (a touch target), texture pixels. */
    readonly row: number;
    /**
     * A button in this panel's font; its label wraps and the button grows taller to hold it.
     * @param name - control name (the dry run finds buttons by it)
     * @param text - its label
     * @param onClick - called on a click by ray or poke
     * @param width - width in texture pixels, or a fraction of the parent (default all of it)
     * @param height - least height in texture pixels, for a bigger touch target (default one row)
     */
    button(name: string, text: string, onClick: () => void, width?: number | string, height?: number): Button;
    /**
     * A line of text in this panel's font, wrapping and growing taller to hold its text.
     * @param text - the text
     * @param color - CSS color
     * @param title - a heading: 1.2 times the size
     */
    text(text: string, color?: string, title?: boolean): TextBlock;
    /** A horizontal row of controls, as tall as its tallest control. */
    line(): StackPanel;
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

let scratchCtx: CanvasRenderingContext2D | null = null;
/**
 * A 2D context for measuring text, made on first use (the module also loads in Node tests).
 * @returns the context
 */
const scratch = (): CanvasRenderingContext2D =>
    (scratchCtx ??= document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D);
/**
 * Line height of a font, pixels.
 * @param font - CSS font
 * @returns ascent plus descent
 */
const lineOf = (font: string): number => {
    scratch().font = font;
    const m = scratch().measureText("Hgjy");
    return m.fontBoundingBoxAscent + m.fontBoundingBoxDescent;
};

/**
 * Give a plane new bounds: `width` wide, `height` tall, its top edge at `top` (local meters).
 * @param mesh - a plane from MeshBuilder.CreatePlane
 * @param width - meters
 * @param height - meters
 * @param top - local y of the top edge
 */
const reshapePlane = (mesh: Mesh, width: number, height: number, top: number): void => {
    const x = width / 2;
    const b = top - height;
    // CreatePlane's vertex order: bottom left, bottom right, top right, top left.
    mesh.setVerticesData(VertexBuffer.PositionKind, [-x, b, 0, x, b, 0, x, top, 0, -x, top, 0], false);
    mesh.refreshBoundingInfo();
};

/**
 * A panel of 2D GUI on a plane.
 * @param scene - the scene
 * @param name - mesh name
 * @param widthM - width in meters
 * @param heightM - height in meters (with `fit`, only until the first layout)
 * @param px - texture width in pixels (height follows the aspect); about 512 to 768 for 30 cm
 * @param options - reading distance and fitting
 * @returns the panel, hidden
 */
export function createPanel(
    scene: Scene,
    name: string,
    widthM: number,
    heightM: number,
    px: number,
    options: PanelOptions = {},
): Panel {
    const mesh = MeshBuilder.CreatePlane(name, { width: widthM, height: heightM }, scene);
    markUi(mesh);
    const adt = AdvancedDynamicTexture.CreateForMesh(mesh, px, Math.round((px * heightM) / widthM), true, false);
    adt.onBeginRenderObservable.add(() => {
        uiStats.panelRenders++;
    });
    const mPerPx = widthM / px;
    const font = Math.round(fontM(READ[options.read ?? "reach"]) / mPerPx);
    const row = Math.round(font * 1.6);
    const lineH = lineOf(`${font}px ${FAMILY}`);
    const back = new StackPanel(`${name}-stack`);
    back.background = "#1c2230ee";
    back.width = 1;
    back.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
    back.fontFamily = FAMILY;
    back.fontSize = font;
    if (options.fit) {
        back.paddingTop = `${Math.round(font * 0.3)}px`;
        back.paddingBottom = back.paddingTop;
        // Resize the texture and the plane to the stack, keeping the top edge in place.
        // Done after the frame: the texture clears its dirty flag once layout ends, so a resize made
        // during layout would never be drawn.
        adt.onEndLayoutObservable.add(() => {
            const h = Math.max(8, Math.ceil(back.heightInPixels));
            if (h !== adt.getSize().height) {
                scene.onAfterRenderObservable.addOnce(() => {
                    adt.scaleTo(px, h);
                    reshapePlane(
                        mesh,
                        widthM,
                        h * mPerPx,
                        options.fit === "up" ? h * mPerPx - heightM / 2 : heightM / 2,
                    );
                    adt.markAsDirty();
                });
            }
        });
    } else {
        back.height = 1;
    }
    adt.addControl(back);
    mesh.setEnabled(false);
    const panel: Panel = {
        mesh,
        adt,
        stack: back,
        font,
        row,
        button(n, text, onClick, width = "100%", height = row) {
            const b = Button.CreateSimpleButton(n, text);
            b.width = typeof width === "number" ? `${width}px` : width;
            // Pixel heights from the start (then fitted): a percentage height inside a stack that
            // fits its content would grow with it, frame after frame.
            b.adaptHeightToChildren = true; // (this sets the height to 100%, so it goes first)
            b.height = `${height}px`;
            b.color = "#e8ecf4";
            b.background = "#34405a";
            b.cornerRadius = 6;
            b.thickness = 1;
            b.paddingTop = "2px";
            b.paddingBottom = "2px";
            const t = b.textBlock as TextBlock;
            t.textWrapping = true; // word wrap (TextWrapping is a const enum)
            t.resizeToFit = true;
            t.height = `${height - 4}px`;
            // One line makes a button `height` tall; more lines make it taller.
            const pad = `${Math.max(2, Math.floor((Math.max(row, height) - 4 - lineH) / 2))}px`;
            t.paddingTop = pad;
            t.paddingBottom = pad;
            t.paddingLeft = `${Math.round(font * 0.3)}px`;
            t.paddingRight = t.paddingLeft;
            b.onPointerClickObservable.add(onClick);
            return b;
        },
        text(text, color = "#e8ecf4", title = false) {
            const t = new TextBlock(undefined, text);
            t.color = color;
            if (title) {
                t.fontSize = Math.round(font * 1.2);
            }
            t.textWrapping = true; // word wrap (TextWrapping is a const enum)
            t.resizeToFit = true;
            t.height = `${row}px`;
            t.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            t.paddingLeft = `${Math.round(font * 0.5)}px`;
            t.paddingRight = t.paddingLeft;
            t.paddingTop = `${Math.round(font * 0.25)}px`;
            t.paddingBottom = t.paddingTop;
            return t;
        },
        line() {
            const r = new StackPanel();
            r.isVertical = false;
            r.adaptHeightToChildren = true; // (this sets the height to 100%, so it goes first)
            r.height = `${row}px`;
            r.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
            return r;
        },
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
 * The world position of a GUI control's center on the plane its texture is drawn on. Reads the
 * plane's bounds, so it holds for a panel that fits its content (whose top edge stays put).
 * @param mesh - the plane
 * @param adt - its GUI texture
 * @param c - the control
 * @returns world meters
 */
export function controlWorld(mesh: AbstractMesh, adt: AdvancedDynamicTexture, c: Control): Vector3 {
    const { width, height } = adt.getSize();
    const { minimum: lo, maximum: hi } = mesh.getBoundingInfo().boundingBox;
    const local = new Vector3(
        lo.x + (c.centerX / width) * (hi.x - lo.x),
        hi.y - (c.centerY / height) * (hi.y - lo.y),
        0,
    );
    return Vector3.TransformCoordinates(local, mesh.computeWorldMatrix(true));
}

/** A small plane of text on its own texture, redrawn only when its text changes. */
export interface Chip {
    mesh: Mesh;
    /** Height of its capital letters, meters (before the mesh's own scaling). */
    readonly capM: number;
    /** Its size now, meters (it grows to its text). */
    readonly widthM: number;
    readonly heightM: number;
    set(text: string, color?: string): void;
    show(): void;
    hide(): void;
}

/** Chip font size, texture pixels. */
const CHIP_PX = 40;

/**
 * Break text into lines no wider than `max` pixels in the scratch context's font.
 * @param text - the text
 * @param max - the widest line, pixels
 * @returns the lines
 */
const wrap = (text: string, max: number): string[] => {
    const lines: string[] = [];
    let cur = "";
    for (const word of text.split(" ")) {
        const next = cur ? `${cur} ${word}` : word;
        if (cur && scratch().measureText(next).width > max) {
            lines.push(cur);
            cur = word;
        } else {
            cur = next;
        }
    }
    lines.push(cur);
    return lines;
};

/**
 * A chip: a small text plane on its own texture, at least `minWidthM` wide, as wide as its text up to
 * `maxWidthM`, then wrapped onto more lines.
 * @param scene - the scene
 * @param name - mesh name
 * @param minWidthM - narrowest width, meters
 * @param read - where it is read from (sets its font size)
 * @param billboard - whether it always faces the viewer
 * @param maxWidthM - widest width before it wraps, meters (default 22 letters' worth)
 * @returns the chip, hidden
 */
export function createChip(
    scene: Scene,
    name: string,
    minWidthM: number,
    read: Reach,
    billboard = false,
    maxWidthM?: number,
): Chip {
    const em = fontM(READ[read]);
    const pxPerM = CHIP_PX / em;
    const pad = Math.round(CHIP_PX * 0.45);
    const lineH = Math.round(CHIP_PX * 1.3);
    const font = `bold ${CHIP_PX}px ${FAMILY}`;
    const minW = Math.ceil(minWidthM * pxPerM);
    const maxW = Math.max(minW, Math.ceil((maxWidthM ?? em * 22) * pxPerM));
    let w = minW;
    let h = lineH + pad;
    const mesh = MeshBuilder.CreatePlane(name, { width: w / pxPerM, height: h / pxPerM }, scene);
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
    let lines: string[] = [];
    textSurfaces.push({
        name,
        mesh,
        canvas: () => tex.getContext().canvas,
        items: () =>
            lines.length
                ? [
                      {
                          control: "text",
                          lines,
                          font,
                          boxW: w - 2 * pad,
                          boxH: h - pad,
                          metersPerPx: 1 / pxPerM,
                          at: mesh.getAbsolutePosition(),
                      },
                  ]
                : [],
    });
    return {
        mesh,
        capM: em * CAP_EM,
        get widthM() {
            return w / pxPerM;
        },
        get heightM() {
            return h / pxPerM;
        },
        set(text, color = "#20283a") {
            const key = `${text}|${color}`;
            if (key === last) {
                return;
            }
            last = key;
            uiStats.chipRedraws++;
            scratch().font = font;
            lines = wrap(text, maxW - 2 * pad);
            const widest = Math.max(...lines.map((l) => scratch().measureText(l).width));
            const nw = Math.max(minW, Math.ceil(widest + 2 * pad));
            const nh = lines.length * lineH + pad;
            if (nw !== w || nh !== h) {
                w = nw;
                h = nh;
                tex.scaleTo(w, h);
                reshapePlane(mesh, w / pxPerM, h / pxPerM, h / pxPerM / 2);
            }
            const ctx = tex.getContext() as CanvasRenderingContext2D;
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, w, h);
            ctx.font = font;
            ctx.fillStyle = "#ffffff";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            lines.forEach((l, i) => {
                ctx.fillText(l, w / 2, pad / 2 + lineH * (i + 0.5));
            });
            tex.update(true);
        },
        show: () => {
            mesh.setEnabled(true);
        },
        hide: () => {
            mesh.setEnabled(false);
        },
    };
}
