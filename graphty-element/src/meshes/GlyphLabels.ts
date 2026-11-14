/**
 * @file The one draw behind `layoutBehavior.labels.labelText: "glyphs"` (issue #3252,
 * design/rendering/row-renderer.md section 4.7): every glyph-drawn label of a scene is a set of
 * quads in one thin-instanced mesh over one {@link GlyphAtlas} page.
 *
 * A glyph-drawn label keeps its own plane, for placement, declutter and picking, but the plane
 * draws nothing (its layer mask is 0); each frame this draw puts the label's glyphs where its plane
 * is. What a label draws is recorded from the same canvas calls `RichTextLabel` makes to paint its
 * texture, so wraps, alignment and kerning come out where the canvas would put them; a label whose
 * painting makes any call but plain `fillText` is not glyph-drawn.
 */

// Installs Mesh.prototype.thinInstanceSetBuffer and its siblings. See EdgeLineBatch.
import "@babylonjs/core/Meshes/thinInstanceMesh.js";

import type { Matrix, Scene } from "@babylonjs/core";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { ShaderMaterial } from "@babylonjs/core/Materials/shaderMaterial.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";

import {
    fontLigatures,
    GLYPH_EDGE,
    GLYPH_TILE,
    GlyphAtlas,
    glyphKey,
    type PlacedGlyph,
    placeGlyphs,
    scriptFallback,
    SDF_FONT_PX,
    SDF_RADIUS,
} from "./GlyphAtlas";
import { readColor } from "./readColor";

/** The name of a scene's one glyph draw. */
export const GLYPH_DRAW_NAME = "glyphLabels";

/** Where a glyph's baseline sits in its tile, in texels from the top: room for ascenders above. */
const BASELINE = SDF_RADIUS + Math.round(SDF_FONT_PX * 0.8);
/** Floats per glyph quad: its box on the plane (x, y, width, height), its color (r, g, b, a), its tile (u0, v0, u1, v1). */
const QUAD = 12;

/** One `fillText` a label's painting made: the words, where, in which font and color. */
interface Run {
    text: string;
    x: number;
    y: number;
    font: string;
    color: string;
}

/** What a label hands the draw: its plane, and its glyph quads on it. */
export interface GlyphLabelEntry {
    readonly mesh: Mesh;
    quads: Float32Array;
}

// The canvas calls that put ink down, and the style each one inks with.
const INK_CALLS: Record<string, "fillStyle" | "strokeStyle" | "both"> = {
    fill: "fillStyle",
    fillRect: "fillStyle",
    stroke: "strokeStyle",
    strokeRect: "strokeStyle",
    strokeText: "strokeStyle",
    drawImage: "both",
    putImageData: "both",
};

/**
 * Whether a canvas style draws nothing.
 * @param style - A `fillStyle` or `strokeStyle`, as the canvas keeps it.
 * @returns True for a fully transparent color.
 */
function clear(style: unknown): boolean {
    return typeof style === "string" && readColor(style, "#000000").alpha === 0;
}

let scratch: CanvasRenderingContext2D | null = null;

/**
 * A small canvas to measure and draw single glyphs on, made once.
 * @param scene - Any scene: its engine makes the canvas.
 * @returns Its context.
 */
function scratchContext(scene: Scene): CanvasRenderingContext2D {
    if (scratch === null) {
        const canvas = scene.getEngine().createCanvas(GLYPH_TILE, GLYPH_TILE);
        scratch = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
    }
    return scratch;
}

/**
 * Record the runs one painting draws, on a context that measures for real and draws nothing.
 * @param scene - The label's scene.
 * @param paint - Paints the label on the context it is given.
 * @returns The runs, or null when the painting made a call a plain label never makes.
 */
export function recordRuns(scene: Scene, paint: (ctx: CanvasRenderingContext2D) => void): Run[] | null {
    const target = scratchContext(scene);
    const runs: Run[] = [];
    let plain = true;
    target.save();
    const recorder = new Proxy(target, {
        get(t, name: string) {
            const value: unknown = Reflect.get(t, name, t);
            if (typeof value !== "function") {
                return value;
            }
            const inks = INK_CALLS[name];
            if (inks !== undefined) {
                // A path filled or stroked with nothing (a transparent panel) is still plain.
                if (inks === "both" || !clear(t[inks]) || !clear(t.shadowColor)) {
                    plain = false;
                }
                return () => undefined;
            }
            if (name === "fillText") {
                return (text: string, x: number, y: number) => {
                    // A shadow or a see-through canvas would be drawn by canvas alone.
                    if (!clear(t.shadowColor) || t.globalAlpha !== 1 || t.globalCompositeOperation !== "source-over") {
                        plain = false;
                    }
                    // A gradient or pattern is not a color: the canvas draws that run.
                    if (typeof t.fillStyle !== "string") {
                        plain = false;
                    }
                    runs.push({ text, x, y, font: t.font, color: typeof t.fillStyle === "string" ? t.fillStyle : "" });
                };
            }
            return (value as (...args: unknown[]) => unknown).bind(t);
        },
        set(t, name: string, value: unknown) {
            return Reflect.set(t, name, value, t);
        },
    });
    paint(recorder);
    target.restore();
    return plain ? runs : null;
}

/**
 * A Canvas font string with its size replaced: `"italic 700 14px Arial"` at 56 px.
 * @param font - The font, as the canvas keeps it.
 * @param px - The size wanted, in pixels.
 * @returns The font at that size and the size it had, or null when it names no pixel size.
 */
function atSize(font: string, px: number): { font: string; size: number } | null {
    // The canvas keeps its font with the size as the first word ending in "px", before the family.
    const words = font.split(" ");
    const at = words.findIndex((word) => word.endsWith("px") && Number.isFinite(Number(word.slice(0, -2))));
    if (at < 0) {
        return null;
    }
    const size = Number(words[at].slice(0, -2));
    words[at] = `${String(px)}px`;
    return { font: words.join(" "), size };
}

/**
 * The ink of runs drawn on the scratch canvas, for {@link fontLigatures}.
 * @param ctx - The scratch canvas, in the font to test.
 * @param runs - The runs.
 * @returns The alpha of every pixel.
 */
function inkOf(ctx: CanvasRenderingContext2D, runs: readonly PlacedGlyph[]): Uint8ClampedArray {
    const { width, height } = ctx.canvas;
    ctx.clearRect(0, 0, width, height);
    for (const run of runs) {
        ctx.fillText(run.glyph, SDF_RADIUS + run.x, BASELINE);
    }
    const rgba = ctx.getImageData(0, 0, width, height).data;
    const alpha = new Uint8ClampedArray(width * height);
    for (let i = 0; i < alpha.length; i++) {
        alpha[i] = rgba[i * 4 + 3];
    }
    return alpha;
}

/**
 * A scene's glyph draw: one atlas, one thin-instanced quad, and the labels it draws.
 */
export class GlyphLabels {
    private static readonly perScene = new WeakMap<Scene, GlyphLabels>();
    private readonly atlas = new GlyphAtlas();
    private readonly ligatures = new Map<string, string[]>();
    private readonly entries = new Set<GlyphLabelEntry>();
    private readonly mesh: Mesh;
    private texture: RawTexture | null = null;
    private uploaded = -1;
    private matrices = new Float32Array(16);
    private tiles = new Float32Array(4);
    private colors = new Float32Array(4);

    /**
     * The scene's glyph draw, made the first time a label asks.
     * @param scene - The scene.
     * @returns Its draw.
     */
    static of(scene: Scene): GlyphLabels {
        let draw = GlyphLabels.perScene.get(scene);
        if (draw === undefined) {
            draw = new GlyphLabels(scene);
            GlyphLabels.perScene.set(scene, draw);
        }
        return draw;
    }

    private constructor(private readonly scene: Scene) {
        this.mesh = MeshBuilder.CreatePlane(GLYPH_DRAW_NAME, { size: 1 }, scene);
        this.mesh.isPickable = false;
        this.mesh.alwaysSelectAsActiveMesh = true;
        this.mesh.renderingGroupId = 1;
        this.mesh.material = this.buildMaterial();
        this.mesh.thinInstanceSetBuffer("matrix", this.matrices, 16, false);
        this.mesh.thinInstanceSetBuffer("glyphTile", this.tiles, 4, false);
        this.mesh.thinInstanceSetBuffer("glyphColor", this.colors, 4, false);
        this.mesh.thinInstanceCount = 0;
        const frame = scene.onBeforeRenderObservable.add(() => {
            this.update();
        });
        scene.onDisposeObservable.addOnce(() => {
            scene.onBeforeRenderObservable.remove(frame);
            this.texture?.dispose();
            GlyphLabels.perScene.delete(scene);
        });
    }

    /**
     * The glyph quads of a label's runs, adding any glyph not yet in the atlas.
     * @param runs - The label's runs, in its canvas's pixels.
     * @param width - The canvas's width, in its pixels.
     * @param height - Its height.
     * @param planeWidth - The plane's width, in scene units.
     * @param planeHeight - Its height.
     * @returns The quads, or null when a run needs `RichTextLabel`: a script, emoji, mark or
     *   ligature font the atlas cannot draw, a font still loading, or glyphs that do not fit.
     */
    quadsOf(
        runs: readonly Run[],
        width: number,
        height: number,
        planeWidth: number,
        planeHeight: number,
    ): Float32Array | null {
        const ctx = scratchContext(this.scene);
        const placed: { run: Run; atlasFont: string; size: number; glyphs: PlacedGlyph[] }[] = [];
        const keys: string[] = [];
        for (const run of runs) {
            const sized = atSize(run.font, SDF_FONT_PX);
            if (sized === null || scriptFallback(run.text) !== null || !this.fontReady(sized.font)) {
                return null;
            }
            ctx.font = run.font;
            const glyphs = placeGlyphs(run.text, (s) => ctx.measureText(s).width);
            if (this.ligaturesOf(ctx, sized.font).some((pair) => run.text.includes(pair))) {
                return null;
            }
            placed.push({ run, atlasFont: sized.font, size: sized.size, glyphs });
            keys.push(...glyphs.map((g) => glyphKey(g.glyph, sized.font)));
        }
        if (!this.atlas.fits(keys)) {
            return null;
        }
        const quads = new Float32Array(keys.length * QUAD);
        let at = 0;
        const sx = planeWidth / width;
        const sy = planeHeight / height;
        const page = this.atlas.size;
        for (const { run, atlasFont, size, glyphs } of placed) {
            const k = size / SDF_FONT_PX;
            const side = this.atlas.tile * k;
            const { rgb, alpha } = readColor(run.color, "#000000");
            for (const glyph of glyphs) {
                const tile = this.atlas.add(glyphKey(glyph.glyph, atlasFont), () =>
                    this.rasterize(glyph.glyph, atlasFont),
                );
                if (tile === null) {
                    return null;
                }
                // The tile's middle, on the plane: x right, y up, the plane's middle at 0.
                const left = run.x + glyph.x - SDF_RADIUS * k;
                const top = run.y - BASELINE * k;
                quads.set(
                    [
                        (left + side / 2) * sx - planeWidth / 2,
                        planeHeight / 2 - (top + side / 2) * sy,
                        side * sx,
                        side * sy,
                        rgb.r,
                        rgb.g,
                        rgb.b,
                        alpha,
                        tile.x / page,
                        (tile.y + this.atlas.tile) / page,
                        (tile.x + this.atlas.tile) / page,
                        tile.y / page,
                    ],
                    at,
                );
                at += QUAD;
            }
        }
        return quads;
    }

    /**
     * Start drawing a label's glyphs.
     * @param entry - The label's plane and quads.
     */
    add(entry: GlyphLabelEntry): void {
        this.entries.add(entry);
    }

    /**
     * Stop drawing a label's glyphs; nothing when the scene's draw is already gone.
     * @param scene - The label's scene.
     * @param entry - What {@link add} was given.
     */
    static remove(scene: Scene, entry: GlyphLabelEntry): void {
        GlyphLabels.perScene.get(scene)?.entries.delete(entry);
    }

    private fontReady(font: string): boolean {
        // A tile drawn in a fallback font would stay in the atlas: wait for the font, drawn by canvas meanwhile.
        return typeof document === "undefined" || document.fonts.check(font);
    }

    private ligaturesOf(ctx: CanvasRenderingContext2D, atlasFont: string): string[] {
        let known = this.ligatures.get(atlasFont);
        if (known === undefined) {
            ctx.save();
            ctx.font = atlasFont;
            ctx.fillStyle = "#ffffff";
            ctx.textBaseline = "alphabetic";
            known = fontLigatures(
                (s) => ctx.measureText(s).width,
                (runs) => inkOf(ctx, runs),
            );
            ctx.restore();
            this.ligatures.set(atlasFont, known);
        }
        return known;
    }

    private rasterize(glyph: string, atlasFont: string): Uint8ClampedArray {
        const ctx = scratchContext(this.scene);
        ctx.save();
        ctx.font = atlasFont;
        ctx.fillStyle = "#ffffff";
        ctx.textBaseline = "alphabetic";
        const ink = inkOf(ctx, [{ glyph, x: 0 }]);
        ctx.restore();
        return ink;
    }

    /** Put every shown label's glyphs where its plane is, and upload the atlas if it grew. */
    private update(): void {
        let count = 0;
        for (const entry of this.entries) {
            if (this.shown(entry.mesh)) {
                count += entry.quads.length / QUAD;
            }
        }
        if (count * 16 > this.matrices.length) {
            const room = Math.max(count, (this.matrices.length / 16) * 2);
            this.matrices = new Float32Array(room * 16);
            this.tiles = new Float32Array(room * 4);
            this.colors = new Float32Array(room * 4);
            this.mesh.thinInstanceSetBuffer("matrix", this.matrices, 16, false);
            this.mesh.thinInstanceSetBuffer("glyphTile", this.tiles, 4, false);
            this.mesh.thinInstanceSetBuffer("glyphColor", this.colors, 4, false);
        }
        let i = 0;
        for (const entry of this.entries) {
            if (!this.shown(entry.mesh)) {
                continue;
            }
            const fade = entry.mesh.visibility;
            const { m } = entry.mesh.computeWorldMatrix(true);
            const q = entry.quads;
            for (let at = 0; at < q.length; at += QUAD, i++) {
                writeGlyphMatrix(this.matrices, i * 16, m, q[at], q[at + 1], q[at + 2], q[at + 3]);
                this.colors.set([q[at + 4], q[at + 5], q[at + 6], q[at + 7] * fade], i * 4);
                this.tiles.set(q.subarray(at + 8, at + 12), i * 4);
            }
        }
        this.mesh.thinInstanceCount = count;
        this.mesh.thinInstanceBufferUpdated("matrix");
        this.mesh.thinInstanceBufferUpdated("glyphTile");
        this.mesh.thinInstanceBufferUpdated("glyphColor");
        this.mesh.setEnabled(count > 0);
        this.upload();
    }

    private shown(mesh: Mesh): boolean {
        return !mesh.isDisposed() && mesh.isEnabled() && mesh.isVisible && mesh.visibility > 0;
    }

    private upload(): void {
        const { pixels } = this.atlas;
        if (pixels === null || this.uploaded === this.atlas.version) {
            return;
        }
        if (this.texture === null) {
            // One byte a texel, no mipmaps: they cost thin stems ink (section 4.7).
            this.texture = new RawTexture(
                pixels,
                this.atlas.size,
                this.atlas.size,
                Constants.TEXTUREFORMAT_R,
                this.scene,
                false,
                false,
                Constants.TEXTURE_BILINEAR_SAMPLINGMODE,
                Constants.TEXTURETYPE_UNSIGNED_BYTE,
            );
            this.texture.name = "glyphAtlas";
            (this.mesh.material as ShaderMaterial).setTexture("atlas", this.texture);
        } else {
            this.texture.update(pixels);
        }
        this.uploaded = this.atlas.version;
    }

    private buildMaterial(): ShaderMaterial {
        const material = new ShaderMaterial(
            "glyphLabelsMaterial",
            this.scene,
            { vertexSource: VERTEX, fragmentSource: FRAGMENT },
            {
                attributes: ["position", "uv", "glyphTile", "glyphColor"],
                uniforms: ["viewProjection", "world"],
                samplers: ["atlas"],
                needAlphaBlending: true,
            },
        );
        material.backFaceCulling = false;
        material.disableDepthWrite = true;
        material.alphaMode = Constants.ALPHA_PREMULTIPLIED;
        return material;
    }
}

/**
 * One glyph quad's world matrix: the label plane's, with the unit quad scaled to the glyph's box
 * and moved to its middle on the plane.
 * @param out - Where to write it.
 * @param at - Its first float.
 * @param m - The plane's world matrix, column major.
 * @param x - The box's middle on the plane.
 * @param y - Its middle.
 * @param w - Its width.
 * @param h - Its height.
 */
function writeGlyphMatrix(
    out: Float32Array,
    at: number,
    m: Matrix["m"],
    x: number,
    y: number,
    w: number,
    h: number,
): void {
    for (let c = 0; c < 4; c++) {
        out[at + c] = m[c] * w;
        out[at + 4 + c] = m[4 + c] * h;
        out[at + 8 + c] = m[8 + c];
        out[at + 12 + c] = m[c] * x + m[4 + c] * y + m[12 + c];
    }
}

const VERTEX = `
precision highp float;
attribute vec3 position;
attribute vec2 uv;
attribute vec4 glyphTile;
attribute vec4 glyphColor;
uniform mat4 viewProjection;
#include<instancesDeclaration>
varying vec2 vUv;
varying vec4 vColor;
void main(void) {
    #include<instancesVertex>
    gl_Position = viewProjection * finalWorld * vec4(position, 1.0);
    vUv = mix(glyphTile.xy, glyphTile.zw, uv);
    vColor = glyphColor;
}
`;

const FRAGMENT = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform sampler2D atlas;
varying vec2 vUv;
varying vec4 vColor;
void main(void) {
    float d = texture2D(atlas, vUv).r;
    float w = max(fwidth(d) * 0.5, 0.0001);
    float a = smoothstep(${GLYPH_EDGE.toFixed(4)} - w, ${GLYPH_EDGE.toFixed(4)} + w, d) * vColor.a;
    if (a <= 0.0) {
        discard;
    }
    gl_FragColor = vec4(vColor.rgb * a, a);
}
`;
