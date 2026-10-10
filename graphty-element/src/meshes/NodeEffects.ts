import { AbstractMesh, Color3, type EffectLayer, HighlightLayer, InstancedMesh, Mesh, Scene } from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import { DEFAULT_GLOW_COLOR, DEFAULT_OUTLINE_COLOR, toColorValue } from "../session/styles/channels";

/** How far a glow reaches at strength 1: the blur width of the glow layer, in glow-map texels. */
const GLOW_SPREAD = 2;

/**
 * The narrowest and the widest a glow is spread, as multiples of {@link GLOW_SPREAD}. The blur
 * takes seven samples, so a wider spacing breaks the glow into blotches.
 */
const GLOW_SPREAD_LIMITS = [0.5, 1.25] as const;

/**
 * A color as Babylon reads it, and its opacity.
 * @param color - Any color the element accepts: `#rrggbb`, `#rrggbbaa`, a CSS name.
 * @param fallback - The color to use when `color` is missing or unreadable.
 * @returns The color and its opacity in `[0, 1]`.
 */
function babylonColor(color: string | undefined, fallback: string): { color: Color3; alpha: number } {
    // NOT Color3.FromHexString, which answers BLACK for anything but `#rrggbb`: a glow or an
    // outline given an opacity (`#rrggbbaa`) was drawn black.
    const value = toColorValue(color ?? fallback) ?? toColorValue(fallback);
    if (value === null) {
        return { color: Color3.White(), alpha: 1 };
    }

    return { color: new Color3(value.r / 255, value.g / 255, value.b / 255), alpha: value.a };
}

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
     * A glow layer that draws only outside the node, with a per-mesh opacity.
     * @param name - The layer name.
     * @param scene - The scene.
     */
    constructor(name: string, scene: Scene) {
        super(name, scene, { blurHorizontalSize: GLOW_SPREAD, blurVerticalSize: GLOW_SPREAD });
        this.innerGlow = false;
        this.onBeforeRenderMeshToEffect.add((mesh) => {
            const alpha = this.alphas.get(mesh.uniqueId);
            if (alpha !== undefined) {
                this._emissiveTextureAndColor.color.a = alpha;
            }
        });
    }
}

/**
 * Manages visual effects for node meshes.
 * Currently supports:
 * - Outline effect using Babylon.js HighlightLayer
 * - Glow effect using a second HighlightLayer that draws only outside the node (NodeGlowLayer)
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NodeEffects {
    private static readonly HIGHLIGHT_LAYER_NAME = "graphty-selection-highlight";

    private static readonly GLOW_LAYER_NAME = "graphty-node-glow";

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
     * Get or create the HighlightLayer for selection outlines.
     *
     * CREATED LAZILY, ON THE FIRST MESH THAT ASKS FOR AN OUTLINE, for the reason spelled out on
     * {@link NodeEffects.getOrCreateGlowLayer}: a highlight layer is a full-screen post-process
     * with a render target and two blur passes, and until this was lazy every graph paid for one
     * on its first node paint whether anything was ever outlined or not. The removal branch of
     * {@link NodeEffects.applyOutlineEffect} deliberately does NOT create one.
     *
     * The layer is stored on scene.metadata for reuse.
     * @param scene - The Babylon.js scene
     * @returns The highlight layer for the scene
     */
    private static getOrCreateHighlightLayer(scene: Scene): HighlightLayer {
        // Check if layer already exists on scene metadata
        const existingLayer = scene.metadata?.highlightLayer as HighlightLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            return existingLayer;
        }

        // Create new highlight layer
        const highlightLayer = new HighlightLayer(this.HIGHLIGHT_LAYER_NAME, scene, {
            isStroke: true,
            blurHorizontalSize: 0.5,
            blurVerticalSize: 0.5,
        });

        // Store on scene metadata
        scene.metadata = scene.metadata ?? {};
        scene.metadata.highlightLayer = highlightLayer;

        return highlightLayer;
    }

    /**
     * Apply (or remove) the outline effect for a mesh, based on the style configuration.
     *
     * WHAT WAS BROKEN, and it drew nothing at all in any circumstance: this method used to hand
     * `HighlightLayer.addMesh` the node's own mesh, which is always an `InstancedMesh` -- see
     * {@link NodeEffects.resolveRenderedMesh}. Babylon renders an instance through its SOURCE
     * mesh, so the inclusion list was given a mesh the layer never consults; and before it could
     * even fail quietly it failed loudly, because `addMesh` subscribes to
     * `mesh.onBeforeBindObservable`, which `Mesh` declares and `InstancedMesh` does not. The
     * resulting TypeError went into a `try/catch` whose comment said the failure "is expected for
     * instanced meshes", so an outline was accepted, validated, interned and silently dropped for
     * the whole life of the channel. `test/browser/channel-paints.test.ts` measured it at zero
     * pixels changed and `node.outline` sat in `UNPAINTED_CHANNELS` because of it.
     *
     * THE FIX IS THE ONE THE GLOW PATH ALREADY USED: resolve the rendered mesh first. The call no
     * longer throws, so there is no catch here -- an outline that cannot be applied is a defect
     * that must be seen rather than a frame that must be saved.
     * @param mesh The mesh to apply the effect to
     * @param effect The effect configuration from the node style
     */
    static applyOutlineEffect(mesh: AbstractMesh, effect: NodeStyleConfig["effect"] | undefined): void {
        const scene = mesh.getScene();
        const renderedMesh = this.resolveRenderedMesh(mesh);

        if (effect?.outline) {
            // The layer draws an outline opaque, so an outline color's opacity is not drawn.
            const { color } = babylonColor(this.extractColorValue(effect.outline.color), DEFAULT_OUTLINE_COLOR);

            this.getOrCreateHighlightLayer(scene).addMesh(renderedMesh, color);

            return;
        }

        // NO LAYER IS CREATED HERE, for the reason on getOrCreateHighlightLayer: asking a node
        // not to be outlined must not cost the scene a full-screen post-process.
        const existingLayer = scene.metadata?.highlightLayer as HighlightLayer | undefined;

        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.removeMesh(renderedMesh);
        }
    }

    /**
     * Resolve the mesh that the effect layers actually render.
     *
     * WHY THIS EXISTS: every node mesh handed to this class is an `InstancedMesh` -- `MeshCache`
     * builds ONE source mesh per style id and hands out `createInstance()` clones (see
     * meshes/MeshCache.ts). Babylon renders an instance through its SOURCE mesh's sub-meshes, and
     * `ThinEffectLayer._renderSubMesh` asks `hasMesh(subMesh.getRenderingMesh())` -- the source --
     * when deciding whether a sub-mesh belongs in the effect. Putting the INSTANCE in the
     * inclusion list therefore includes a mesh Babylon never consults, and nothing glows: that is
     * the same class of failure as the "HighlightLayer has issues with InstancedMesh" note on
     * `applyOutlineEffect`.
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
     *
     * TWO HIGHLIGHT LAYERS, ONE STENCIL. A node with both an outline and a glow is in both, and
     * each layer marks its nodes with its own stencil value, so one of the two may draw over that
     * node. ponytail: accepted for the rare node that has both; give the layers disjoint stencil
     * bits (`numStencilBits`) if it shows.
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
     * doesn't work" exactly. This method is the missing renderer, and it is
     * deliberately shaped like `applyOutlineEffect` -- same call site in `Node.updateStyle`, same
     * presence-means-enabled model, same try/catch -- so the two effects cannot drift apart.
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

        if (effect?.glow) {
            const glowLayer = this.getOrCreateGlowLayer(scene);
            const { color, alpha } = babylonColor(this.extractColorValue(effect.glow.color), DEFAULT_GLOW_COLOR);
            this.glowStrengths(scene).set(renderedMesh, { strength: effect.glow.strength ?? 1, alpha });

            // Same defence as the outline path: a mesh in an unexpected state must not take down
            // a repaint.
            try {
                glowLayer.addMesh(renderedMesh, color);
            } catch {
                // Silently fail -- a node that does not glow is better than a broken repaint.
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
     * The layer's spread belongs to the layer, so it follows the LARGEST strength on screen, and
     * each mesh is drawn at its share of that strength as an opacity, times its color's own
     * opacity -- never above 1. One glowing style alone is drawn opaque and as wide as its
     * strength; two at different strengths differ in opacity.
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

        const [low, high] = GLOW_SPREAD_LIMITS;
        const spread = GLOW_SPREAD * Math.min(high, Math.max(low, max));
        if (glowLayer.blurHorizontalSize !== spread) {
            glowLayer.blurHorizontalSize = spread;
            glowLayer.blurVerticalSize = spread;
        }

        for (const [mesh, { strength, alpha }] of strengths) {
            glowLayer.alphas.set(mesh.uniqueId, max > 0 ? (alpha * strength) / max : 0);
        }
    }

    /**
     * Remove a mesh from the highlight layer.
     *
     * EXACTLY THE MESH IT IS HANDED, AND NOT THAT MESH'S SOURCE, which is what makes it safe to
     * call while a node is being disposed. An outline is applied to the shared source mesh (see
     * {@link NodeEffects.applyOutlineEffect}), so one source is precisely the set of nodes drawn
     * with one outline configuration -- and resolving to it here would take the outline away from
     * every sibling still on screen. That is the same reasoning `Node.dispose` records for glow,
     * and it has the same consequence: for an instanced node this removes nothing, the source is
     * freed when `MeshCache` prunes or clears it, and the layer's leftover uniqueId is inert
     * because Babylon's uniqueIds are monotonic per scene and never reused.
     * @param mesh - The mesh to remove from highlighting
     */
    static removeFromHighlight(mesh: AbstractMesh): void {
        const scene = mesh.getScene();
        const existingLayer = scene.metadata?.highlightLayer as HighlightLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.removeMesh(mesh as Mesh);
        }
    }

    /**
     * Extract a color string from a color configuration.
     * @param color - Color configuration object or string
     * @returns Extracted color string or undefined
     */
    private static extractColorValue(color: unknown): string | undefined {
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
     * Dispose the highlight layer for a scene.
     * Should be called when the graph is disposed.
     * @param scene - The Babylon.js scene
     */
    static disposeHighlightLayer(scene: Scene): void {
        const existingLayer = scene.metadata?.highlightLayer as HighlightLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.dispose();
            scene.metadata.highlightLayer = undefined;
        }
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
