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
     * DISPOSED AGAIN WHEN NOTHING GLOWS, by {@link NodeEffects.syncGlowStrengths}. The inclusion
     * list alone never says so: `node.glow` is a mesh channel, so a node that stops glowing moves
     * to another source mesh and the old glowing source stays listed with no instances. The next
     * glow recreates the layer through this method.
     *
     * `excludeByDefault: true` is a safety catch, not a tuning knob. Babylon's inclusion list
     * means "only these" when it is non-empty and "no opinion" -- i.e. EVERY mesh in the scene --
     * when it is empty (ThinGlowLayer.hasMesh). With this set, `_internalShouldRender` returns
     * false while the list is empty, so an emptied layer renders nothing rather than blooming
     * the whole graph.
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
     * `mat.freeze()` immediately after building it. `customEmissiveColorSelector` is the right
     * mechanism precisely because it feeds the glow pass a colour without mutating the frozen
     * material. Unfreezing to set `emissiveColor` would make every glowing style pay a material
     * re-bind per frame and would change the node's lit appearance as a side effect.
     *
     * STRENGTH IS PER SOURCE MESH, like colour, through {@link NodeEffects.syncGlowStrengths}.
     * It used to be written to `glowLayer.intensity`, which belongs to the one layer the scene
     * shares, so the last glowing style applied set the strength of every glowing node.
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
            this.glowStrengths(scene).set(renderedMesh, effect.glow.strength ?? 1);

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
                this.glowStrengths(scene).delete(renderedMesh);
                try {
                    existingLayer.removeIncludedOnlyMesh(renderedMesh);
                } catch {
                    // Silently fail - mesh may not be in the layer
                }
            }
        }
    }

    /**
     * The glow strength each glowing source mesh asked for, kept on scene.metadata beside the
     * glow colours.
     * @param scene - The Babylon.js scene
     * @returns The per-source-mesh strengths
     */
    private static glowStrengths(scene: Scene): Map<Mesh, number> {
        scene.metadata = scene.metadata ?? {};
        scene.metadata.glowStrengths = scene.metadata.glowStrengths ?? new Map<Mesh, number>();

        return scene.metadata.glowStrengths as Map<Mesh, number>;
    }

    /**
     * Draw every glowing source mesh at its own strength, with one layer.
     *
     * Babylon multiplies a per-mesh `setEffectIntensity` into the glow colour as the glow map is
     * drawn, and the layer's `intensity` scales the blurred result. The glow map is an 8-bit
     * texture, so a per-mesh factor above 1 clamps and a strength of 3 would read the same as 1.
     * So the layer carries the LARGEST strength on screen and each mesh carries its share of it,
     * which is never above 1.
     *
     * Only source meshes that still draw a node count toward the largest strength. MeshCache
     * never evicts a source mesh, so a strength that is no longer used (a slider dragged from 100
     * back to 0.1) leaves a mesh with no instances behind; counted, it would hold the layer at 100
     * and round the live glow away in the 8-bit map. It keeps its entry, because a node that goes
     * back to that strength reuses the cached mesh. A disposed mesh is dropped.
     *
     * When no glowing source mesh draws a node any more, the layer is disposed: it is a
     * full-screen post-process that would otherwise render nothing every frame for the life of
     * the scene. Every node mesh is an instance, so a source with no instances draws nothing.
     * @param glowLayer - The scene's glow layer
     * @param scene - The Babylon.js scene
     */
    private static syncGlowStrengths(glowLayer: GlowLayer, scene: Scene): void {
        const strengths = this.glowStrengths(scene);
        let max = 0;
        let anyDrawn = false;

        for (const [mesh, strength] of strengths) {
            if (mesh.isDisposed()) {
                strengths.delete(mesh);
            } else if (mesh.instances.length > 0) {
                anyDrawn = true;
                max = Math.max(max, strength);
            }
        }

        if (!anyDrawn) {
            this.disposeGlowLayer(scene);

            return;
        }

        glowLayer.intensity = max;

        for (const [mesh, strength] of strengths) {
            glowLayer.setEffectIntensity(mesh, max > 0 ? strength / max : 0);
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
     * freed when `MeshCache` is cleared, and the layer's leftover uniqueId is inert because
     * Babylon's uniqueIds are monotonic per scene and never reused.
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
     * Dispose the glow layer for a scene, and forget the per-style colours and strengths with it.
     *
     * The colour map is keyed by mesh uniqueId, so it MUST die with the layer: leaving it behind
     * would let a later mesh that happens to reuse a uniqueId inherit a dead style's glow colour.
     *
     * Called by {@link NodeEffects.syncGlowStrengths} once no node glows; the next glow
     * recreates the layer lazily.
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
            scene.metadata.glowStrengths = undefined;
        }
    }
}
