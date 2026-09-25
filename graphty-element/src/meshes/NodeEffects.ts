import {
    AbstractMesh,
    Color3,
    type Color4,
    type EffectLayer,
    GlowLayer,
    HighlightLayer,
    InstancedMesh,
    type Material,
    Mesh,
    Scene,
    type SubMesh,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";

/**
 * Default outline configuration for selection highlight.
 */
const DEFAULT_OUTLINE_COLOR = "#FFFF00";

/**
 * Default glow colour, used when a style asks for `effect.glow` without naming a colour.
 * White reads as a neutral bloom over any node colour.
 */
const DEFAULT_GLOW_COLOR = "#FFFFFF";

/**
 * Manages visual effects for node meshes.
 * Currently supports:
 * - Outline effect using Babylon.js HighlightLayer
 * - Glow effect using Babylon.js GlowLayer
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
            const colorValue = this.extractColorValue(effect.outline.color);
            const color = Color3.FromHexString(colorValue ?? DEFAULT_OUTLINE_COLOR);

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
     * Including the source is not a compromise, it is exactly the right granularity: glow colour
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
     * Get or create the GlowLayer for node glow effects.
     *
     * CREATED LAZILY, ON THE FIRST MESH THAT ASKS FOR GLOW, and never from scene setup. A
     * GlowLayer is a full-screen post-process: it costs a render target plus a blur pass every
     * frame for the WHOLE scene whether one node glows or a thousand. A graph that uses no glow
     * must not pay for it, so the only call site is the `effect.glow` branch of
     * {@link NodeEffects.applyGlowEffect}; the removal branch deliberately does NOT create one.
     *
     * `excludeByDefault: true` is a safety catch, not a tuning knob. Babylon's inclusion list
     * means "only these" when it is non-empty and "no opinion" -- i.e. EVERY mesh in the scene --
     * when it is empty (ThinGlowLayer.hasMesh). An empty list is not reachable today, because the
     * layer is only created at the moment a mesh is added to it and membership is keyed by the
     * shared source mesh (see resolveRenderedMesh), but "the whole graph blooms" is a bad enough
     * failure to be worth one option: with this set, `_internalShouldRender` returns false while
     * the list is empty, so an emptied layer renders nothing at all.
     * @param scene - The Babylon.js scene
     * @returns The glow layer for the scene
     */
    private static getOrCreateGlowLayer(scene: Scene): GlowLayer {
        const existingLayer = scene.metadata?.glowLayer as GlowLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            return existingLayer;
        }

        const glowLayer = new GlowLayer(this.GLOW_LAYER_NAME, scene, {
            excludeByDefault: true,
        });

        // Per-source-mesh colour. The layer has ONE customEmissiveColorSelector, called with the
        // mesh being rendered, so the colour has to be looked up rather than closed over.
        const glowColors = new Map<number, Color3>();
        glowLayer.customEmissiveColorSelector = (
            mesh: Mesh,
            _subMesh: SubMesh,
            _material: Material,
            result: Color4,
        ): void => {
            const color = glowColors.get(mesh.uniqueId) ?? Color3.FromHexString(DEFAULT_GLOW_COLOR);
            result.set(color.r, color.g, color.b, 1);
        };

        scene.metadata = scene.metadata ?? {};
        scene.metadata.glowLayer = glowLayer;
        scene.metadata.glowColors = glowColors;

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
     * `mat.freeze()` immediately after building it. `customEmissiveColorSelector` is the right
     * mechanism precisely because it feeds the glow pass a colour without mutating the frozen
     * material. Unfreezing to set `emissiveColor` would make every glowing style pay a material
     * re-bind per frame and would change the node's lit appearance as a side effect.
     *
     * KNOWN LIMIT, stated rather than hidden: `intensity` is a property of the LAYER, not of a
     * mesh, so with two glowing styles on screen the last one applied sets the strength for both.
     * Colour is per style (see {@link NodeEffects.resolveRenderedMesh}). Per-style strength needs
     * one layer per strength, which costs a full-screen pass each and was not worth it here.
     * @param mesh - The mesh to apply the effect to
     * @param effect - The effect configuration from the node style
     */
    static applyGlowEffect(mesh: AbstractMesh, effect: NodeStyleConfig["effect"] | undefined): void {
        const scene = mesh.getScene();
        const renderedMesh = this.resolveRenderedMesh(mesh);

        if (effect?.glow) {
            const glowLayer = this.getOrCreateGlowLayer(scene);
            const colorValue = this.extractColorValue(effect.glow.color);
            const glowColors = scene.metadata?.glowColors as Map<number, Color3> | undefined;
            glowColors?.set(renderedMesh.uniqueId, Color3.FromHexString(colorValue ?? DEFAULT_GLOW_COLOR));
            glowLayer.intensity = effect.glow.strength ?? 1;

            // Same defence as the outline path: the inclusion list is keyed by uniqueId and the
            // call is cheap, but a mesh in an unexpected state must not take down a repaint.
            try {
                glowLayer.addIncludedOnlyMesh(renderedMesh);
            } catch {
                // Silently fail -- a node that does not bloom is better than a broken repaint.
            }
        } else {
            // NO LAYER IS CREATED HERE. Asking a node not to glow must not cost a full-screen
            // post-process, which is what calling getOrCreateGlowLayer in this branch would do --
            // and it would do it for every node of every graph, since most nodes have no glow.
            const existingLayer = scene.metadata?.glowLayer as GlowLayer | undefined;
            if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
                const glowColors = scene.metadata?.glowColors as Map<number, Color3> | undefined;
                glowColors?.delete(renderedMesh.uniqueId);
                try {
                    existingLayer.removeIncludedOnlyMesh(renderedMesh);
                } catch {
                    // Silently fail - mesh may not be in the layer
                }
            }
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
     * Dispose the glow layer for a scene, and forget the per-style colours with it.
     *
     * The colour map is keyed by mesh uniqueId, so it MUST die with the layer: leaving it behind
     * would let a later mesh that happens to reuse a uniqueId inherit a dead style's glow colour.
     *
     * Sibling of {@link NodeEffects.disposeHighlightLayer} and, like it, currently called from
     * nowhere in this package -- the scene outlives every dataset, so the layers are reused rather
     * than rebuilt. It exists so that whoever tears a scene down has one call for each layer this
     * class can create, instead of discovering the glow layer only by leaking it.
     * @param scene - The Babylon.js scene
     */
    static disposeGlowLayer(scene: Scene): void {
        const existingLayer = scene.metadata?.glowLayer as GlowLayer | undefined;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.dispose();
        }

        if (scene.metadata) {
            scene.metadata.glowLayer = undefined;
            scene.metadata.glowColors = undefined;
        }
    }
}
