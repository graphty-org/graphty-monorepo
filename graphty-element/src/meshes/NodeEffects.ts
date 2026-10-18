import {
    AbstractMesh,
    Color3,
    type Color4,
    type EffectLayer,
    GlowLayer,
    InstancedMesh,
    type Material,
    Mesh,
    Scene,
    StandardMaterial,
    type SubMesh,
    VertexData,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import type { MeshCache } from "./MeshCache";
import { readColor } from "./readColor";

/**
 * The outline color drawn when a style names an outline whose color cannot be read.
 */
const DEFAULT_OUTLINE_COLOR = "#FFFF00";

/** The name every outline ring's source mesh and instances start with; the color follows. */
const OUTLINE_RING_PREFIX = "graphty-node-outline-";

/** The ring's inner radius, in node radii: it starts at the node's edge. */
const OUTLINE_RING_INNER = 1;

/** The ring's outer radius, in node radii. */
const OUTLINE_RING_OUTER = 1.3;

/** How many straight pieces the ring is drawn in. */
const OUTLINE_RING_SEGMENTS = 48;

/** The ring's depth offset; see createOutlineRingSource. */
const OUTLINE_RING_DEPTH_OFFSET = 2;

/** The smallest node radius a ring is sized for, so a node with no bounds yet still gets one. */
const MIN_RING_RADIUS = 0.01;

/**
 * Glow colour for a glowing mesh whose colour entry is missing from the selector's map. A style
 * with no glow colour does not glow at all, so this is a defensive default only.
 */
const DEFAULT_GLOW_COLOR = "#FFFFFF";

/**
 * Manages visual effects for node meshes.
 * Currently supports:
 * - Outline effect: a ring mesh around the node
 * - Glow effect using Babylon.js GlowLayer
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NodeEffects {
    private static readonly GLOW_LAYER_NAME = "graphty-node-glow";

    /**
     * Check if an effect layer has been disposed.
     * A GlowLayer has no isDisposed property, so we check whether the
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
     * Draw (or take away) a node's outline: a flat ring around the node, facing the camera.
     *
     * THE RING IS GEOMETRY IN THE SCENE, drawn in the opaque pass and depth-tested like the node
     * it rings. It used to be a Babylon highlight layer, a full-screen pass composited after the
     * whole frame with the depth test off and kept off only the outlined node's own pixels by the
     * stencil. So the ring of a node behind another was painted across the nearer node, and every
     * ring was painted over every label (`test/browser/node-outline-depth.test.ts`). As geometry
     * through the node's centre, the node's own front surface covers the ring's inner edge, a
     * nearer node or label covers the ring, and a label beside it is drawn over it.
     *
     * ONE SOURCE MESH PER OUTLINE COLOR, cached in the mesh cache, and one instance of it per
     * outlined node. The instance is a CHILD of the node's mesh, so it moves, hides and is
     * disposed with it (a restyle that rebuilds the mesh takes the old ring with it, and this is
     * called again for the new mesh). Its scaling is the node's own largest half-extent, and the
     * node mesh's scaling and the graph root's carry through the parent link.
     * @param mesh - The node's mesh, normally an InstancedMesh from MeshCache.
     * @param effect - The effect configuration from the node style.
     * @param cache - The mesh cache the ring's source mesh is kept in.
     */
    static applyOutlineEffect(
        mesh: AbstractMesh,
        effect: NodeStyleConfig["effect"] | undefined,
        cache: MeshCache,
    ): void {
        const existing = mesh.getChildMeshes(true).find((child) => child.name.startsWith(OUTLINE_RING_PREFIX));

        if (!effect?.outline) {
            existing?.dispose();

            return;
        }

        // THE ALPHA IS DROPPED: an outline is drawn opaque. The layer check reports it as
        // W_ALPHA_IGNORED, so the drop is said rather than silent.
        const { rgb } = readColor(this.extractColorValue(effect.outline.color), DEFAULT_OUTLINE_COLOR);
        const name = `${OUTLINE_RING_PREFIX}${rgb.toHexString()}`;
        const ring =
            existing?.name === name && !existing.isDisposed()
                ? existing
                : cache.get(name, () => this.createOutlineRingSource(name, rgb, mesh.getScene()));

        if (ring !== existing) {
            existing?.dispose();
            ring.isPickable = false;
            ring.billboardMode = Mesh.BILLBOARDMODE_ALL;
            ring.parent = mesh;
            ring.position.setAll(0);
        }

        const extent = mesh.getBoundingInfo().boundingBox.extendSize;
        ring.scaling.setAll(Math.max(extent.x, extent.y, extent.z, MIN_RING_RADIUS));
    }

    /**
     * Build the source mesh of one outline color: a flat ring of inner radius
     * {@link OUTLINE_RING_INNER} and outer radius {@link OUTLINE_RING_OUTER}, in the XY plane.
     * @param name - The mesh name, which is also its cache key.
     * @param color - The ring's color.
     * @param scene - The scene to build it in.
     * @returns The source mesh.
     */
    private static createOutlineRingSource(name: string, color: Color3, scene: Scene): Mesh {
        const positions: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i <= OUTLINE_RING_SEGMENTS; i++) {
            const angle = (i / OUTLINE_RING_SEGMENTS) * Math.PI * 2;
            const x = Math.cos(angle);
            const y = Math.sin(angle);
            positions.push(
                x * OUTLINE_RING_INNER,
                y * OUTLINE_RING_INNER,
                0,
                x * OUTLINE_RING_OUTER,
                y * OUTLINE_RING_OUTER,
                0,
            );
            if (i < OUTLINE_RING_SEGMENTS) {
                const at = i * 2;
                indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
            }
        }

        const source = new Mesh(name, scene);
        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        data.normals = positions.map((_, i) => (i % 3 === 2 ? -1 : 0));
        data.applyToMesh(source);

        const material = new StandardMaterial(`${name}-material`, scene);
        // Unlit: a ring is a mark on the node, the same color from every side.
        material.disableLighting = true;
        material.emissiveColor = color;
        material.diffuseColor = Color3.Black();
        material.specularColor = Color3.Black();
        material.backFaceCulling = false;
        // Pushed back a little in depth, so a label drawn in the same plane (a billboard through
        // the same node) is drawn over the ring rather than fighting it for the pixel.
        material.zOffset = OUTLINE_RING_DEPTH_OFFSET;
        material.freeze();
        source.material = material;

        return source;
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
            const color = glowColors.get(mesh.uniqueId) ?? readColor(DEFAULT_GLOW_COLOR, DEFAULT_GLOW_COLOR).rgb;
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
     * try/catch -- so the two effects cannot drift apart. Unlike the outline, glow is on only
     * when the merged style names a glow colour: a strength on its own draws nothing.
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
            const glowColors = scene.metadata?.glowColors as Map<number, Color3> | undefined;
            // A glow is added light, so its color's alpha fades it: `#ff000080` glows as
            // `#800000` does, and the strength scales that as it scales any color.
            const { rgb, alpha } = readColor(colorValue, DEFAULT_GLOW_COLOR);
            glowColors?.set(renderedMesh.uniqueId, rgb.scale(alpha));
            this.glowStrengths(scene).set(renderedMesh, strength);

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
