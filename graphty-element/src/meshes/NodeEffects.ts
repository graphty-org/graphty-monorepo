import {
    AbstractMesh,
    Camera,
    Color3,
    type EffectLayer,
    HighlightLayer,
    InstancedMesh,
    Mesh,
    Scene,
    StandardMaterial,
    TransformNode,
    Vector3,
    VertexData,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import { DEFAULT_GLOW_COLOR, DEFAULT_OUTLINE_COLOR } from "../session/styles/channels";
import type { MeshCache } from "./MeshCache";
import { readColor } from "./readColor";

/** How far a glow reaches at strength 1: the blur width of the glow layer, in glow-map texels. */
const GLOW_SPREAD = 2;

/** The name every outline ring's source mesh and instances start with; the color follows. */
const OUTLINE_RING_PREFIX = "graphty-node-outline-";

/**
 * The ring's inner radius, in radii of the node's outline as the camera sees it: a little inside
 * the node's edge, so it overlaps it.
 */
const OUTLINE_RING_INNER = 0.9;

/** The ring's outer radius, in radii of the node's outline as the camera sees it. */
const OUTLINE_RING_OUTER = 1.35;

/**
 * How far the ring sits in front of the node's centre, toward the camera, in node radii: at the
 * node's front surface. Through the centre, the node's own edges (which meet there) were drawn
 * over the ring wherever they crossed it; in front, they pass behind it.
 */
const OUTLINE_RING_LIFT = 1.05;

/** How many straight pieces the ring is drawn in. */
const OUTLINE_RING_SEGMENTS = 48;

/** The ring's depth offset; see createOutlineRingSource. */
const OUTLINE_RING_DEPTH_OFFSET = 2;

/** The smallest node radius a ring is sized for, so a node with no bounds yet still gets one. */
const MIN_RING_RADIUS = 0.01;

/** Scratch vector, so placing a ring every frame allocates nothing. */
const TO_CAMERA = new Vector3();

/**
 * The narrowest and the widest a glow is spread, as multiples of {@link GLOW_SPREAD}. The blur
 * takes seven samples, so a wider spacing breaks the glow into blotches.
 */
const GLOW_SPREAD_LIMITS = [0.5, 1.25] as const;

/**
 * The rendering group outlines and glows are drawn at the end of: the graph's own. Babylon's
 * default draws them after every group, over the labels (`RichTextLabel` draws them in later
 * groups), so a selected node's ring was drawn across its name.
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
     * A glow layer that draws only outside the node, with a per-mesh opacity.
     * @param name - The layer name.
     * @param scene - The scene.
     */
    constructor(name: string, scene: Scene) {
        super(name, scene, {
            blurHorizontalSize: GLOW_SPREAD,
            blurVerticalSize: GLOW_SPREAD,
            renderingGroupId: GRAPH_RENDERING_GROUP,
        });
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
 * - Outline effect: a ring mesh around the node
 * - Glow effect using a second HighlightLayer that draws only outside the node (NodeGlowLayer)
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class NodeEffects {
    private static readonly GLOW_LAYER_NAME = "graphty-node-glow";

    /** The source meshes that write the stencil, each once: those an outline or a glow was put on. */
    private static readonly stencilWriters = new WeakSet<Mesh>();

    /**
     * Lets only outlined and glowing nodes write the stencil an outline and a glow are masked by.
     *
     * WHAT WAS BROKEN: Babylon's highlight layer draws its ring wherever the stencil does not hold
     * the node's mark, and every mesh drawn in the main pass writes the stencil -- so an edge (or a
     * label, or an arrowhead) drawn in front of an outlined node overwrote the node's mark along
     * its line, and the ring was drawn there too: streaks of outline color across the node. Now the
     * main pass writes no stencil except while an outlined or glowing node draws, so the mark is
     * the node's whole silhouette and the ring stays outside it.
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
     * Set how wide every outline in a scene is drawn (`layoutBehavior.node.outlineWidth`): the
     * ring's band, as a multiple of its own width, on every ring now drawn and every ring made
     * later.
     * @param scene - The Babylon.js scene.
     * @param width - The width as a multiple of the ring's own, or undefined for that.
     */
    static setOutlineWidth(scene: Scene, width: number | undefined): void {
        scene.metadata = scene.metadata ?? {};
        scene.metadata.outlineWidth = width;
        for (const mesh of scene.meshes) {
            if (mesh instanceof Mesh && mesh.name.startsWith(OUTLINE_RING_PREFIX)) {
                this.ringVertexData(scene).applyToMesh(mesh, true);
            }
        }
    }

    /**
     * The outer radius of a scene's rings: the inner radius plus the band, widened by the scene's
     * outline width.
     * @param scene - The Babylon.js scene.
     * @returns The outer radius.
     */
    private static ringOuterOf(scene: Scene): number {
        const width: unknown = scene.metadata?.outlineWidth;
        return OUTLINE_RING_INNER + (OUTLINE_RING_OUTER - OUTLINE_RING_INNER) * (typeof width === "number" ? width : 1);
    }

    /**
     * Draw (or take away) a node's outline: a flat ring around the node, facing the camera.
     *
     * THE RING IS GEOMETRY IN THE SCENE, drawn in the opaque pass and depth-tested like the node
     * it rings. It used to be a Babylon highlight layer, a full-screen pass composited after the
     * whole frame with the depth test off and kept off only the outlined node's own pixels by the
     * stencil. So the ring of a node behind another was painted across the nearer node, and every
     * ring was painted over every label (`test/browser/node-outline-depth.test.ts`). As geometry
     * at the node's front surface, a nearer node or label covers the ring, a label beside it is
     * drawn over it, and the node's own edges pass behind it.
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
            ring.parent = mesh;
            const scene = mesh.getScene();
            const observer = scene.onBeforeCameraRenderObservable.add((camera) => {
                this.followCamera(ring, camera);
            });
            ring.onDisposeObservable.addOnce(() => {
                scene.onBeforeCameraRenderObservable.remove(observer);
            });
        }

        const extent = mesh.getBoundingInfo().boundingBox.extendSize;
        ring.metadata = { outlineRadius: Math.max(extent.x, extent.y, extent.z, MIN_RING_RADIUS) };
        const camera = mesh.getScene().activeCamera;
        if (camera) {
            this.followCamera(ring, camera);
        }
    }

    /**
     * Place a node's ring for one camera, before that camera draws: on the line from the node's
     * centre to the camera, {@link OUTLINE_RING_LIFT} node radii toward it, and sized to the cone
     * of sight lines that graze the node, so its inner edge lies on the node's visible edge.
     *
     * WHY EVERY FRAME. Under perspective a node's visible edge is where that cone meets it, and the
     * cone depends on how far away and in which direction the camera is. The ring used to be a
     * billboard turned with the camera's rotation, lifted along the view axis and sized once for a
     * node straight ahead: for a node off to the side the lift carried the ring further out than
     * the node, and as the graph turned a node toward the side of the view a gap opened between
     * the node and its ring (`test/browser/node-outline-perspective.test.ts`). An orthographic
     * camera has no cone: the ring is the node's own radius, lifted along the view axis, as before.
     *
     * Cost: a few vector operations per outlined node per camera, no scene search.
     * @param ring - The node's ring, a child of the node's mesh.
     * @param camera - The camera about to draw.
     */
    private static followCamera(ring: AbstractMesh, camera: Camera): void {
        const node = ring.parent;
        const radius = (ring.metadata as { outlineRadius?: number } | null)?.outlineRadius;
        if (!(node instanceof AbstractMesh) || radius === undefined) {
            return;
        }

        const { m } = node.computeWorldMatrix();
        // The node's world scale; a node is scaled the same along every axis.
        const scale = Math.hypot(m[0], m[1], m[2]) || 1;
        const r = radius * scale;
        const lift = OUTLINE_RING_LIFT * r;
        const toCamera = TO_CAMERA;
        let seen = r;

        if (camera.mode === Camera.ORTHOGRAPHIC_CAMERA) {
            ring.billboardMode = TransformNode.BILLBOARDMODE_ALL;
            camera.getDirectionToRef(Vector3.Forward(camera.getScene().useRightHandedSystem), toCamera);
            toCamera.scaleInPlace(-1);
        } else {
            // Turned toward the camera's POSITION, not its rotation, so the ring is square to the
            // line of sight to this node wherever it is in the view.
            ring.billboardMode = TransformNode.BILLBOARDMODE_ALL | TransformNode.BILLBOARDMODE_USE_POSITION;
            camera.globalPosition.subtractToRef(node.getAbsolutePosition(), toCamera);
            const distance = toCamera.length();
            toCamera.scaleInPlace(1 / (distance || 1));
            // The cone's radius at the ring's distance from the camera.
            seen = (Math.max(distance - lift, 0) * r) / Math.sqrt(Math.max(distance * distance - r * r, r * r * 1e-6));
        }

        // The billboard keeps the parent's scale and position but not its rotation, so the
        // position is a world direction in the parent's units.
        toCamera.scaleToRef(lift / scale, ring.position);
        ring.scaling.setAll(seen / scale);
    }

    /**
     * A ring's geometry: a flat band from {@link OUTLINE_RING_INNER} to the scene's outer radius
     * in the XY plane, facing +z.
     * @param scene - The scene whose outline width sets the outer radius.
     * @returns The vertex data.
     */
    private static ringVertexData(scene: Scene): VertexData {
        const outer = this.ringOuterOf(scene);
        const positions: number[] = [];
        const indices: number[] = [];
        for (let i = 0; i <= OUTLINE_RING_SEGMENTS; i++) {
            const angle = (i / OUTLINE_RING_SEGMENTS) * Math.PI * 2;
            const x = Math.cos(angle);
            const y = Math.sin(angle);
            positions.push(x * OUTLINE_RING_INNER, y * OUTLINE_RING_INNER, 0, x * outer, y * outer, 0);
            if (i < OUTLINE_RING_SEGMENTS) {
                const at = i * 2;
                indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
            }
        }

        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        // +z faces the camera: the ring is a billboard turned toward the camera's position.
        data.normals = positions.map((_, i) => (i % 3 === 2 ? 1 : 0));
        return data;
    }

    /**
     * Build the source mesh of one outline color: a flat ring of inner radius
     * {@link OUTLINE_RING_INNER} and the scene's outer radius in the XY plane;
     * followCamera places and sizes it.
     * @param name - The mesh name, which is also its cache key.
     * @param color - The ring's color.
     * @param scene - The scene to build it in.
     * @returns The source mesh.
     */
    private static createOutlineRingSource(name: string, color: Color3, scene: Scene): Mesh {
        const source = new Mesh(name, scene);
        this.ringVertexData(scene).applyToMesh(source, true);

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
     * try/catch -- so the two effects cannot drift apart. Unlike the outline, glow is on only
     * when the merged style names a glow colour: a strength on its own draws nothing.
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

            // Same defence as the outline path: a mesh in an unexpected state must not take down
            // a repaint.
            try {
                glowLayer.addMesh(renderedMesh, color);
                this.writeStencilOnlyFor(renderedMesh);
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
