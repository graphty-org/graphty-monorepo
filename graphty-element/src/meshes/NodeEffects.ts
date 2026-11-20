import type { EffectLayer } from "@babylonjs/core";
import { Constants } from "@babylonjs/core/Engines/constants.js";
import { HighlightLayer } from "@babylonjs/core/Layers/highlightLayer.js";
import { ThinGlowBlurPostProcess } from "@babylonjs/core/Layers/thinEffectLayer.js";
import { Vector2 } from "@babylonjs/core/Maths/math.vector.js";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { PostProcess } from "@babylonjs/core/PostProcesses/postProcess.js";
import { Scene } from "@babylonjs/core/scene.js";

import type { NodeStyleConfig } from "../config";
import { GraphtyLogger, type Logger } from "../logging";
import { DEFAULT_GLOW_COLOR } from "../session/styles/channels";
import { readColor } from "./readColor";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "meshes", "effects"]);

/** How far a glow reaches at strength 1: the blur width of the glow layer, in glow-map texels. */
const GLOW_SPREAD = 2;

/**
 * The narrowest and the widest a glow is spread, as multiples of {@link GLOW_SPREAD}. The blur
 * takes seven samples, so a wider spacing breaks the glow into blotches. A strength past the widest
 * reaches further through more blurs: see {@link GLOW_REACH_MAX}.
 */
const GLOW_SPREAD_LIMITS = [0.5, 1.25] as const;

/**
 * The first blur's sample spacing, in glow-map texels, once a strength passes the widest spread
 * and the blurs after it take over the reach. One texel, so the first blur alone draws no
 * blotches and the next one's samples land on a smooth glow, not on the first one's samples.
 */
const GLOW_SMOOTH_SPACING = 1;

/**
 * The widest sample spacing of each blur after the first, in glow-map texels, in order. Each is
 * about as wide as the smooth glow the blur before it leaves; wider, its samples fall apart into a
 * grid of blotches. Past their sum a stronger glow only gets brighter.
 */
const GLOW_REACH_MAX = [3.5, 10] as const;

/**
 * The rendering group glows are drawn at the end of: the graph's own. Babylon's default draws
 * them after every group, over the labels (`RichTextLabel` draws them in later groups), so a
 * glow was drawn across its node's name.
 */
const GRAPH_RENDERING_GROUP = 0;

/**
 * The glow: a highlight layer drawn around each glowing node and never over it, blended over what
 * is behind it, with a per-mesh opacity.
 *
 * NOT A GlowLayer. A GlowLayer ADDS a blur of the node over the whole frame, the node included:
 * over the node it replaced the node's own color with the glow's, and around it, added to the
 * light (#F5F5F5) canvas, it saturated to white and showed almost nothing. A highlight layer's
 * outer glow is masked by the stencil to outside the node and blended (not added), so the node
 * keeps its color and the glow shows on a light canvas.
 *
 * Babylon writes every highlighted mesh's opacity as 1; the per-mesh opacity is set just before
 * each mesh is drawn into the glow map, which is the one hook the layer offers for it.
 */
class NodeGlowLayer extends HighlightLayer {
    /** The opacity each glowing source mesh is drawn at, by uniqueId. */
    readonly alphas = new Map<number, number>();

    /**
     * The sample spacing of each blur after the first, in glow-map texels, in the order of
     * {@link GLOW_REACH_MAX}; 0 (every sample on the same texel) leaves the glow as it is.
     */
    readonly reach = GLOW_REACH_MAX.map(() => 0);

    /**
     * A glow layer that draws only outside the node, with a per-mesh opacity.
     * @param name - The layer name.
     * @param scene - The scene.
     */
    constructor(name: string, scene: Scene) {
        super(name, scene, {
            blurHorizontalSize: GLOW_SPREAD,
            blurVerticalSize: GLOW_SPREAD,
            renderingGroupId: GRAPH_RENDERING_GROUP,
            // Half-float, so a glow intensity above 1 (a strength above 1) is not clipped to 1.
            mainTextureType: Constants.TEXTURETYPE_HALF_FLOAT,
        });
        this.innerGlow = false;
        this.onBeforeRenderMeshToEffect.add((mesh) => {
            const alpha = this.alphas.get(mesh.uniqueId);
            if (alpha !== undefined) {
                this._emissiveTextureAndColor.color.a = alpha;
            }
        });
    }

    /**
     * Babylon's downsample, then its horizontal and vertical blur, then a horizontal and vertical
     * blur for each spacing in {@link reach}, every step into a half-float texture.
     *
     * Babylon blurs into 8-bit textures, so a glow intensity above 1 was clipped to 1 right after
     * the downsample and a strength above 1 drew no brighter. And its blur alone cannot reach past
     * seven samples at its widest spacing, so every strength past that drew the same picture; the
     * blurs after it widen the glow further, and smoothly.
     */
    protected override _createTextureAndPostProcesses(): void {
        super._createTextureAndPostProcesses();
        const [downsample, horizontal, vertical] = this._postProcesses;
        horizontal.dispose();
        vertical.dispose();
        const x = new Vector2(1, 0);
        const y = new Vector2(0, 1);
        this._postProcesses = [
            downsample,
            this.blurPass(x, () => this.blurHorizontalSize),
            this.blurPass(y, () => this.blurVerticalSize),
            ...GLOW_REACH_MAX.flatMap((_, i) => [
                this.blurPass(x, () => this.reach[i] ?? 0),
                this.blurPass(y, () => this.reach[i] ?? 0),
            ]),
        ];
    }

    /**
     * One blur step of the glow, into a half-float texture where the engine can render one.
     * @param direction - The direction it blurs in.
     * @param spacing - The spacing of its samples, in texels, read each time it draws.
     * @returns The post-process.
     */
    private blurPass(direction: Vector2, spacing: () => number): PostProcess {
        const engine = this._scene.getEngine();
        const blur = new ThinGlowBlurPostProcess("NodeGlowBlur", engine, direction, 0);
        const pass = new PostProcess("NodeGlowBlur", ThinGlowBlurPostProcess.FragmentUrl, {
            uniforms: ThinGlowBlurPostProcess.Uniforms,
            engine,
            effectWrapper: blur,
            textureType: engine.getCaps().textureHalfFloatRender
                ? Constants.TEXTURETYPE_HALF_FLOAT
                : Constants.TEXTURETYPE_UNSIGNED_BYTE,
        });
        pass.onApplyObservable.add(() => {
            blur.textureWidth = pass.width;
            blur.textureHeight = pass.height;
            blur.kernel = spacing();
        });
        pass.autoClear = false;

        return pass;
    }
}

/**
 * Manages visual effects for node meshes.
 * Currently supports:
 * - Glow effect using a second HighlightLayer that draws only outside the node (NodeGlowLayer)
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NodeEffects {
    private static readonly GLOW_LAYER_NAME = "graphty-node-glow";

    /** The source meshes that write the stencil, each once: those a glow was put on. */
    private static readonly stencilWriters = new WeakSet<Mesh>();

    /**
     * Lets only glowing nodes write the stencil a glow is masked by.
     *
     * WHAT WAS BROKEN: Babylon's highlight layer draws its ring wherever the stencil does not hold
     * the node's mark, and every mesh drawn in the main pass writes the stencil -- so an edge (or a
     * label, or an arrowhead) drawn in front of a glowing node overwrote the node's mark along
     * its line, and the glow was drawn there too: streaks of glow color across the node. Now the
     * main pass writes no stencil except while a glowing node draws, so the mark is
     * the node's whole silhouette and the glow stays outside it.
     * @param mesh - The source mesh just put on a highlight layer.
     */
    private static writeStencilOnlyFor(mesh: Mesh): void {
        const scene = mesh.getScene();
        const engine = scene.getEngine();
        scene.metadata = scene.metadata ?? {};
        // Only inside the main pass: a render target drawn before it (the layers' own glow maps)
        // and the next frame's clear keep the full write mask.
        let main = scene.metadata.stencilMainPass as { on: boolean } | undefined;
        if (main === undefined) {
            const state = { on: false };
            main = state;
            scene.metadata.stencilMainPass = state;
            scene.onBeforeDrawPhaseObservable.add(() => {
                state.on = true;
                engine.setStencilMask(0x00);
            });
            scene.onAfterDrawPhaseObservable.add(() => {
                state.on = false;
                engine.setStencilMask(0xff);
            });
        }
        if (this.stencilWriters.has(mesh)) {
            return;
        }
        this.stencilWriters.add(mesh);
        const pass = main;
        mesh.onBeforeBindObservable.add(() => {
            if (pass.on) {
                engine.setStencilMask(0xff);
            }
        });
        mesh.onAfterRenderObservable.add(() => {
            if (pass.on) {
                engine.setStencilMask(0x00);
            }
        });
    }

    /**
     * Check if an effect layer has been disposed.
     * Neither HighlightLayer nor GlowLayer has an isDisposed property, so we check whether the
     * scene still lists it. A disposed layer that is still cached on `scene.metadata` would throw
     * on the next add/remove, which is why every accessor below runs this check first.
     * @param layer - The effect layer to check
     * @param scene - The Babylon.js scene
     * @returns True if the layer has been disposed
     */
    private static isLayerDisposed(layer: EffectLayer, scene: Scene): boolean {
        return !scene.effectLayers.includes(layer);
    }

    /**
     * Resolve the mesh that the effect layers actually render.
     *
     * WHY THIS EXISTS: every node mesh handed to this class is an `InstancedMesh` -- `MeshCache`
     * builds ONE source mesh per style id and hands out `createInstance()` clones (see
     * meshes/MeshCache.ts). Babylon renders an instance through its SOURCE mesh's sub-meshes, and
     * `ThinEffectLayer._renderSubMesh` asks `hasMesh(subMesh.getRenderingMesh())` -- the source --
     * when deciding whether a sub-mesh belongs in the effect. Putting the INSTANCE in the
     * inclusion list therefore includes a mesh Babylon never consults, and nothing glows.
     *
     * Including the source is not a compromise, it is exactly the right granularity: glow color
     * and strength are part of the node style, `Styles.styleToId` interns a style by deep value
     * equality, and `MeshCache` keys on that style id -- so one source mesh is precisely the set
     * of nodes sharing one glow configuration.
     * @param mesh - The node mesh, normally an InstancedMesh from MeshCache
     * @returns The mesh Babylon renders for it: the instance's source, or the mesh itself
     */
    private static resolveRenderedMesh(mesh: AbstractMesh): Mesh {
        if (mesh instanceof InstancedMesh) {
            return mesh.sourceMesh;
        }

        return mesh as Mesh;
    }

    /**
     * Get or create the glow layer for node glow effects.
     *
     * CREATED LAZILY, ON THE FIRST MESH THAT ASKS FOR GLOW, and never from scene setup. A
     * glow layer is a full-screen post-process: it costs a render target plus a blur pass every
     * frame for the WHOLE scene whether one node glows or a thousand. A graph that uses no glow
     * must not pay for it, so the only call site is the `effect.glow` branch of
     * {@link NodeEffects.applyGlowEffect}; the removal branch deliberately does NOT create one.
     *
     * DISPOSED AGAIN WHEN NOTHING GLOWS, by {@link NodeEffects.syncGlowStrengths}. The inclusion
     * list alone never says so: `node.glow` is a mesh channel, so a node that stops glowing moves
     * to another source mesh and the old glowing source stays listed with no instances. The next
     * glow recreates the layer through this method.
     *
     * A highlight layer draws only the meshes added to it, so an emptied layer draws nothing.
     * @param scene - The Babylon.js scene
     * @returns The glow layer for the scene
     */
    private static getOrCreateGlowLayer(scene: Scene): NodeGlowLayer {
        const existingLayer = scene.metadata?.glowLayer as NodeGlowLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            return existingLayer;
        }

        const glowLayer = new NodeGlowLayer(this.GLOW_LAYER_NAME, scene);

        scene.metadata = scene.metadata ?? {};
        scene.metadata.glowLayer = glowLayer;

        // Strengths are re-shared every frame, not only when a glow is applied: a node that
        // moves to another source mesh (a strength edit) leaves the old one with no instances,
        // and no call here tells the layer. The map holds one entry per glowing style.
        const syncObserver = scene.onBeforeRenderObservable.add(() => {
            this.syncGlowStrengths(glowLayer, scene);
        });
        glowLayer.onDisposeObservable.addOnce(() => {
            scene.onBeforeRenderObservable.remove(syncObserver);
        });

        return glowLayer;
    }

    /**
     * Apply (or remove) the glow effect for a mesh, based on the style configuration.
     *
     * WHAT WAS BROKEN: nothing. `effect.glow` was declared in the schema (config/NodeStyle.ts),
     * written correctly by the app's style bridge, interned into the style id by value equality --
     * so every glow edit minted a new style id and a whole new cached mesh, at real cost -- and
     * then read by no renderer at all. `grep -rn GlowLayer src/` returned nothing, and
     * `git log -S "new GlowLayer" -- graphty-element/` finds the string only in a 2024 demo page
     * under examples/, never in src: glow was never implemented here and never removed, it was
     * accepted, paid for, and dropped on the floor. That is the product owner's report "glow
     * doesn't work" exactly. This method is the missing renderer. Glow is on
     * only when the merged style names a glow colour: a strength on its own draws nothing.
     *
     * ORDERING TRAP, do not "fix" this by touching the material: `NodeMesh.createMaterial` calls
     * `mat.freeze()` immediately after building it. The highlight layer's per-mesh color is the
     * right mechanism precisely because it feeds the glow pass a color without mutating the
     * frozen material.
     *
     * THE GLOW IS DRAWN AROUND THE NODE, NEVER OVER IT, and its color's opacity fades it; see
     * {@link NodeGlowLayer} for why it is not a Babylon GlowLayer.
     *
     * STRENGTH IS PER SOURCE MESH, like color, through {@link NodeEffects.syncGlowStrengths}.
     * It used to be written to the layer, which the scene shares, so the last glowing style
     * applied set the strength of every glowing node.
     * @param mesh - The mesh to apply the effect to
     * @param effect - The effect configuration from the node style
     */
    static applyGlowEffect(mesh: AbstractMesh, effect: NodeStyleConfig["effect"] | undefined): void {
        const scene = mesh.getScene();
        const renderedMesh = this.resolveRenderedMesh(mesh);

        // A COLOUR SWITCHES GLOW ON; a strength alone does not. `node.glowStrength` writes
        // `effect.glow.strength`, so a layer that binds only a strength (to a metric, say) leaves
        // an `effect.glow` with no colour on every node it paints. Treated as "glow on", that drew
        // the white fallback on all of them (#2068). The strength only scales a colour some layer set.
        // A STRENGTH OF 0 IS NO GLOW (#2067), so it takes the removal branch and never creates or
        // keeps alive the full-screen glow layer for a glow nobody can see.
        const colorValue = this.extractColorValue(effect?.glow?.color);
        const strength = effect?.glow?.strength ?? 1;
        if (effect?.glow && colorValue !== undefined && strength > 0) {
            const glowLayer = this.getOrCreateGlowLayer(scene);
            // The fallback only covers an unreadable color string; a missing one never gets here.
            const { rgb: color, alpha } = readColor(colorValue, DEFAULT_GLOW_COLOR);
            this.glowStrengths(scene).set(renderedMesh, { strength, alpha });

            // A mesh in an unexpected state must not take down a repaint.
            try {
                glowLayer.addMesh(renderedMesh, color);
                this.writeStencilOnlyFor(renderedMesh);
            } catch (error) {
                // A node that does not glow is better than a broken repaint, but the failure is
                // reported and its strength is not left behind for a mesh the layer never took.
                this.glowStrengths(scene).delete(renderedMesh);
                logger.error("Glow not applied", error instanceof Error ? error : new Error(String(error)), {
                    mesh: renderedMesh.name,
                });
            }
        } else {
            // NO LAYER IS CREATED HERE. Asking a node not to glow must not cost a full-screen
            // post-process, which is what calling getOrCreateGlowLayer in this branch would do --
            // and it would do it for every node of every graph, since most nodes have no glow.
            const existingLayer = scene.metadata?.glowLayer as NodeGlowLayer | undefined;
            if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
                this.glowStrengths(scene).delete(renderedMesh);
                existingLayer.alphas.delete(renderedMesh.uniqueId);
                existingLayer.removeMesh(renderedMesh);
            }
        }
    }

    /**
     * The glow strength and the color's opacity each glowing source mesh asked for, kept on
     * scene.metadata beside the layer.
     * @param scene - The Babylon.js scene
     * @returns The per-source-mesh strengths and opacities
     */
    private static glowStrengths(scene: Scene): Map<Mesh, { strength: number; alpha: number }> {
        scene.metadata = scene.metadata ?? {};
        scene.metadata.glowStrengths =
            scene.metadata.glowStrengths ?? new Map<Mesh, { strength: number; alpha: number }>();

        return scene.metadata.glowStrengths as Map<Mesh, { strength: number; alpha: number }>;
    }

    /**
     * Draw every glowing source mesh at its own strength, with one layer.
     *
     * The layer's spread belongs to the layer, so it follows the LARGEST strength on screen, up to
     * its widest. Each mesh is drawn at an intensity of its own strength times its color's own
     * opacity, so a stronger glow is always brighter and reaches further.
     *
     * Only source meshes that still draw a node count toward the largest strength. MeshCache
     * never evicts a source mesh, so a strength that is no longer used (a slider dragged from 100
     * back to 0.1) leaves a mesh with no instances behind; counted, it would hold the layer at 100
     * and fade the live glow away. It keeps its entry, because a node that goes back to that
     * strength reuses the cached mesh. A disposed mesh is dropped.
     *
     * When no glowing source mesh draws a node any more, the layer is disposed: it is a
     * full-screen post-process that would otherwise render nothing every frame for the life of
     * the scene. Every node mesh is an instance, so a source with no instances draws nothing.
     * @param glowLayer - The scene's glow layer
     * @param scene - The Babylon.js scene
     */
    private static syncGlowStrengths(glowLayer: NodeGlowLayer, scene: Scene): void {
        const strengths = this.glowStrengths(scene);
        let max = 0;
        let anyDrawn = false;

        for (const [mesh, { strength }] of strengths) {
            if (mesh.isDisposed()) {
                strengths.delete(mesh);
                glowLayer.alphas.delete(mesh.uniqueId);
            } else if (mesh.instances.length > 0) {
                anyDrawn = true;
                max = Math.max(max, strength);
            }
        }

        if (!anyDrawn) {
            this.disposeGlowLayer(scene);

            return;
        }

        // Up to the widest spread, one blur spaced by strength. Past it the first blur closes up
        // and the blurs after it take the rest: blurs in a row spread as far as one blur whose
        // spacing is the root of the sum of their squares. Past the widest spread the width grows
        // with the root of the strength, so the glow's area grows as fast as its intensity does
        // and a stronger glow is never fainter beside its node.
        const [low, high] = GLOW_SPREAD_LIMITS;
        const past = max > high;
        const wanted = GLOW_SPREAD * (past ? high * Math.sqrt(max / high) : Math.max(low, max));
        const spread = past ? GLOW_SMOOTH_SPACING : wanted;
        if (glowLayer.blurHorizontalSize !== spread) {
            glowLayer.blurHorizontalSize = spread;
            glowLayer.blurVerticalSize = spread;
        }

        let left = past ? wanted ** 2 - spread ** 2 : 0;
        GLOW_REACH_MAX.forEach((widest, i) => {
            const spacing = Math.min(widest, Math.sqrt(left));
            glowLayer.reach[i] = spacing;
            left = Math.max(0, left - spacing ** 2);
        });

        // A GLOW'S INTENSITY IS ITS OWN STRENGTH, never divided by the strongest one on screen.
        // Divided, a lone glow was always drawn at 1, and as the spread is held at its widest
        // past 1.25 (see GLOW_SPREAD_LIMITS) every strength from 1.25 up drew the same picture.
        // The glow map and its blurs are half-float, so an intensity above 1 survives into the
        // blur, which the blurs after the first (reach) spread wider. Drawing the glow map
        // smaller to reach further was tried: a small node then fell between the map's texels
        // and drew no glow at all.
        for (const [mesh, { strength, alpha }] of strengths) {
            glowLayer.alphas.set(mesh.uniqueId, alpha * strength);
        }
    }

    /**
     * Extract a color string from a color configuration.
     * @param color - Color configuration object or string
     * @returns Extracted color string or undefined
     */
    static extractColorValue(color: unknown): string | undefined {
        if (typeof color === "string") {
            return color;
        }

        if (typeof color === "object" && color !== null) {
            const colorObj = color as { colorType?: string; value?: string };
            if (colorObj.colorType === "solid" && colorObj.value) {
                return colorObj.value;
            }
        }

        return undefined;
    }

    /**
     * Dispose the glow layer for a scene, and forget the per-style strengths with it.
     *
     * Called by {@link NodeEffects.syncGlowStrengths} once no node glows; the next glow
     * recreates the layer lazily.
     * @param scene - The Babylon.js scene
     */
    static disposeGlowLayer(scene: Scene): void {
        const existingLayer = scene.metadata?.glowLayer as NodeGlowLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.dispose();
        }

        if (scene.metadata) {
            scene.metadata.glowLayer = undefined;
            scene.metadata.glowStrengths = undefined;
        }
    }
}
