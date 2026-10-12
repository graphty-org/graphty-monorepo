// The dry run's text fit audit: every line of text the sandbox draws in 3D -- Babylon 2D GUI on any
// mesh (panels, buttons, the 3D buttons' faces) and the text drawn straight onto textures (chips,
// node labels, hint tags) -- measured against the box it is drawn in and against a legibility floor
// at its viewing distance. Read only: it measures with its own canvas and never redraws a texture.
//
// The legibility rule: a capital letter must subtend at least MIN_CAP_DEG degrees at the eye, at the
// nearest distance the run saw the text from (never nearer than NEAREST_M, closer than anyone reads;
// never farther than HAND_M for text that rides on a hand).

import { type AbstractMesh, type Scene, UtilityLayerRenderer, Vector3 } from "@babylonjs/core";
import { AdvancedDynamicTexture, type Control, TextBlock } from "@babylonjs/gui";

import { type TextItem, textSurfaces } from "../scene/ui";

/** Smallest cap height, degrees of visual angle. */
export const MIN_CAP_DEG = 1;
/** Nearest reading distance credited, meters. */
export const NEAREST_M = 0.3;
/**
 * Farthest a hand is read from, meters (arm's reach): text that rides on a hand is judged no farther
 * than this, since the emulated hands go where no arm reaches (a dry run parks one 1.6 m away).
 */
export const HAND_M = 0.6;

/**
 * Distance from the head to a mesh, for legibility: capped at HAND_M for text that rides on a hand.
 * @param mesh - the mesh
 * @param head - the head position
 * @returns meters
 */
const readingDistance = (mesh: AbstractMesh, head: Vector3): number => {
    const d = Vector3.Distance(head, mesh.getAbsolutePosition());
    for (let p = mesh.parent; p; p = p.parent) {
        if (p.name.startsWith("anchor-hand-")) {
            return Math.min(d, HAND_M);
        }
    }
    return d;
};

/** One line of text found in the scene, measured. */
interface Measured {
    /** Mesh (surface) name. */
    surface: string;
    /** Control name or role within the surface. */
    control: string;
    text: string;
    /** Widest line, texture pixels, and the width it has. */
    textW: number;
    boxW: number;
    /** Height of all its lines, texture pixels, and the height it has. */
    textH: number;
    boxH: number;
    /** Drawn outside an ancestor or the texture. */
    clippedBy: string | null;
    /** Ellipsis or clip wrapping cut the text short. */
    truncated: boolean;
    /** Cap height in meters, and the distance from the head, meters. */
    capM: number;
    distM: number;
}

let scratchCtx: CanvasRenderingContext2D | null = null;
/**
 * A 2D context for measuring text, made on first use (the module also loads in Node tests).
 * @returns the context
 */
const scratch = (): CanvasRenderingContext2D =>
    (scratchCtx ??= document.createElement("canvas").getContext("2d") as CanvasRenderingContext2D);
const capCache = new Map<string, { cap: number; line: number }>();
/**
 * Cap height and line height of a CSS font, pixels.
 * @param font - CSS font
 * @returns the metrics
 */
function fontMetrics(font: string): { cap: number; line: number } {
    let m = capCache.get(font);
    if (!m) {
        scratch().font = font;
        const h = scratch().measureText("H");
        const all = scratch().measureText("Hgjy");
        m = {
            cap: h.actualBoundingBoxAscent,
            line: all.fontBoundingBoxAscent + all.fontBoundingBoxDescent,
        };
        capCache.set(font, m);
    }
    return m;
}
/**
 * Width of a line of text in a CSS font, pixels.
 * @param font - CSS font
 * @param text - the text
 * @returns its width
 */
function textWidth(font: string, text: string): number {
    scratch().font = font;
    return scratch().measureText(text).width;
}

// Babylon GUI internals read here (test only): the measured box after padding, the broken lines
// and the effective font, which a control inherits from the nearest ancestor that sets one.
interface Measure {
    left: number;
    top: number;
    width: number;
    height: number;
}
interface Gui {
    name?: string;
    isVisible: boolean;
    alpha: number;
    clipChildren?: boolean;
    _currentMeasure: Measure;
    _lines?: { text: string; width: number }[];
    _font?: string;
    _fontOffset?: { height: number };
    parent: Gui | null;
    getClassName(): string;
}
const gui = (c: Control): Gui => c as unknown as Gui;

const fontOf = (c: Gui): string => {
    for (let x: Gui | null = c; x; x = x.parent) {
        if (x._font) {
            return x._font;
        }
    }
    return "18px Arial";
};

const shownChain = (c: Gui): boolean => {
    for (let x: Gui | null = c; x; x = x.parent) {
        if (!x.isVisible || x.alpha === 0) {
            return false;
        }
    }
    return true;
};

/**
 * Where text of a size starts in a box, by its alignment (0 start, 1 end, else centered).
 * @param start - the box start
 * @param size - the box size
 * @param text - the text size
 * @param align - 0, 1 or 2
 * @returns the text start
 */
const alignAt = (start: number, size: number, text: number, align: number): number => {
    if (align === 0) {
        return start;
    }
    return align === 1 ? start + size - text : start + (size - text) / 2;
};

/**
 * World scale of a mesh across its local x.
 * @param mesh - the mesh
 * @returns the scale
 */
const scaleX = (mesh: AbstractMesh): number => {
    const w = mesh.computeWorldMatrix(true).m;
    return Math.hypot(w[0], w[1], w[2]);
};
/**
 * Meters per texture pixel across the mesh, from its local width and its world scale.
 * @param mesh - the mesh
 * @param texW - the texture width, pixels
 * @returns meters per pixel
 */
const metersPerPx = (mesh: AbstractMesh, texW: number): number =>
    (mesh.getBoundingInfo().boundingBox.extendSize.x * 2 * scaleX(mesh)) / texW;

const isDrawn = (m: AbstractMesh): boolean => m.isEnabled() && m.isVisible && m.visibility > 0;

/**
 * Every mesh showing a GUI texture, in the scene and in the utility layers' scenes.
 * @param scenes - the scenes to search
 * @returns each mesh with its texture
 */
const guiMeshes = (scenes: Scene[]): { mesh: AbstractMesh; adt: AdvancedDynamicTexture }[] => {
    const out: { mesh: AbstractMesh; adt: AdvancedDynamicTexture }[] = [];
    for (const s of scenes) {
        for (const mesh of s.meshes) {
            if (!isDrawn(mesh) || !mesh.material) {
                continue;
            }
            const adt = mesh.material.getActiveTextures().find((t) => t instanceof AdvancedDynamicTexture);
            if (adt instanceof AdvancedDynamicTexture) {
                out.push({ mesh, adt });
            }
        }
    }
    return out;
};

const measureGui = (mesh: AbstractMesh, adt: AdvancedDynamicTexture, head: Vector3, out: Measured[]): void => {
    const { width: W, height: H } = adt.getSize();
    const mpp = metersPerPx(mesh, W);
    const dist = readingDistance(mesh, head);
    for (const c of adt.getDescendants(false)) {
        if (!(c instanceof TextBlock) || !c.text || !shownChain(gui(c))) {
            continue;
        }
        const g = gui(c);
        const lines = g._lines;
        if (!lines) {
            continue;
        }
        const m = g._currentMeasure;
        const font = fontOf(g);
        const lineH = g._fontOffset?.height ?? fontMetrics(font).line;
        const textW = Math.max(0, ...lines.map((l) => l.width));
        const textH = lines.length * lineH;
        // Where the text is drawn: aligned in its box, which may be smaller than the text. Babylon's
        // alignments: left/top 0, right/bottom 1, center 2.
        const x0 = alignAt(m.left, m.width, textW, c.textHorizontalAlignment);
        const y0 = alignAt(m.top, m.height, textH, c.textVerticalAlignment);
        let clippedBy: string | null = null;
        const inside = (b: Measure): boolean =>
            x0 >= b.left - 1 &&
            x0 + textW <= b.left + b.width + 1 &&
            y0 >= b.top - 1 &&
            y0 + textH <= b.top + b.height + 1;
        for (let p = g.parent; p; p = p.parent) {
            if (p.clipChildren !== false && !inside(p._currentMeasure)) {
                clippedBy = p.name || p.getClassName();
                break;
            }
        }
        if (!clippedBy && !inside({ left: 0, top: 0, width: W, height: H })) {
            clippedBy = "texture";
        }
        const joined = lines.map((l) => l.text).join(" ");
        const truncated = joined.replaceAll(/\s+/g, " ").trim() !== c.text.replaceAll(/\s+/g, " ").trim();
        out.push({
            surface: mesh.name,
            control: c.name || g.parent?.name || "",
            text: c.text,
            textW,
            boxW: m.width,
            textH,
            boxH: m.height,
            clippedBy,
            truncated,
            capM: fontMetrics(font).cap * mpp,
            distM: dist,
        });
    }
};

const measureItem = (name: string, it: TextItem, scale: number, distM: number, out: Measured[]): void => {
    const fm = fontMetrics(it.font);
    const textW = Math.max(0, ...it.lines.map((l) => textWidth(it.font, l)));
    out.push({
        surface: name,
        control: it.control,
        text: it.lines.join(" "),
        textW,
        boxW: it.boxW,
        textH: it.lines.length * fm.line,
        boxH: it.boxH,
        clippedBy: null,
        truncated: it.truncated ?? false,
        capM: fm.cap * it.metersPerPx * scale,
        distM,
    });
};

/**
 * Measure every line of text shown now.
 * @param scene - the scene
 * @param head - the head position
 * @param canvases - filled with each measured surface's texture canvas, by surface name
 * @returns one entry per text block or text item
 */
export function measureText(scene: Scene, head: Vector3, canvases?: Map<string, unknown>): Measured[] {
    const out: Measured[] = [];
    for (const { mesh, adt } of guiMeshes(allScenes(scene))) {
        const n = out.length;
        measureGui(mesh, adt, head, out);
        if (out.length > n) {
            canvases?.set(mesh.name, adt.getContext().canvas);
        }
    }
    for (const s of textSurfaces) {
        measureSurface(s, head, out, canvases);
    }
    return out;
}

/**
 * The scene, the utility layer's scene and every other scene of the engine, once each.
 * @param scene - the main scene
 * @returns the scenes
 */
function allScenes(scene: Scene): Scene[] {
    const scenes = [scene];
    const util = UtilityLayerRenderer.DefaultUtilityLayer?.utilityLayerScene;
    for (const s of [util, ...scene.getEngine().scenes]) {
        if (s && !scenes.includes(s)) {
            scenes.push(s);
        }
    }
    return scenes;
}

/**
 * Measure the items of one registered text surface, if it is drawn.
 * @param s - the surface
 * @param head - the head position
 * @param out - where the measurements go
 * @param canvases - filled with the surface's canvas when it has items
 */
function measureSurface(
    s: (typeof textSurfaces)[number],
    head: Vector3,
    out: Measured[],
    canvases?: Map<string, unknown>,
): void {
    if (s.mesh && !isDrawn(s.mesh)) {
        return;
    }
    const items = s.items();
    for (const it of items) {
        const d = s.mesh ? readingDistance(s.mesh, head) : Vector3.Distance(head, it.at);
        measureItem(s.name, it, s.mesh ? scaleX(s.mesh) : 1, d, out);
    }
    if (items.length && s.canvas) {
        canvases?.set(s.name, s.canvas());
    }
}

/**
 * Degrees subtended by a size at a distance.
 * @param size - meters
 * @param dist - meters
 * @returns degrees
 */
export const degrees = (size: number, dist: number): number => (2 * Math.atan(size / 2 / dist) * 180) / Math.PI;

/** A text fit problem. */
export interface FitIssue {
    surface: string;
    control: string;
    text: string;
    problem: "overflows-width" | "overflows-height" | "clipped" | "truncated" | "too-small";
    detail: string;
}

/**
 * The problems in one measurement, apart from legibility (judged over a whole run).
 * @param m - the measurement
 * @returns its problems
 */
export function fitProblems(m: Measured): FitIssue[] {
    const out: FitIssue[] = [];
    const base = { surface: m.surface, control: m.control, text: m.text };
    if (m.textW > m.boxW + 1) {
        out.push({
            ...base,
            problem: "overflows-width",
            detail: `${Math.round(m.textW)} px in ${Math.round(m.boxW)} px`,
        });
    }
    if (m.textH > m.boxH + 1) {
        out.push({
            ...base,
            problem: "overflows-height",
            detail: `${Math.round(m.textH)} px in ${Math.round(m.boxH)} px`,
        });
    }
    if (m.clippedBy) {
        out.push({ ...base, problem: "clipped", detail: `outside ${m.clippedBy}` });
    }
    if (m.truncated) {
        out.push({ ...base, problem: "truncated", detail: "cut short by its wrapping" });
    }
    return out;
}
