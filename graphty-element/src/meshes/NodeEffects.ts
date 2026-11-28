import type { EffectLayer } from "@babylonjs/core";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { HighlightLayer } from "@babylonjs/core/Layers/highlightLayer.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { Color3 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { InstancedMesh } from "@babylonjs/core/Meshes/instancedMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { VertexData } from "@babylonjs/core/Meshes/mesh.vertexData.js";
import { Scene } from "@babylonjs/core/scene.js";

import type { NodeStyleConfig } from "../config";
import { GraphtyLogger, type Logger } from "../logging";
import { DEFAULT_GLOW_COLOR, DEFAULT_OUTLINE_COLOR } from "../session/styles/channels";
import type { GraphSceneMetadata } from "../types/sceneMetadata";
import { readColor } from "./readColor";
import { convexHull, offsetOutline, type Point2, signedArea } from "./shapeOutlines";

const logger: Logger = GraphtyLogger.getLogger(["graphty", "meshes", "effects"]);

/** How far a glow reaches at strength 1: the blur width of the glow layer, in glow-map texels. */
const GLOW_SPREAD = 2;

/**
 * The name every outline ring's source mesh and instances start with; the color follows, then
 * {@link OUTLINE_WIDTH_MARK} and the width for a ring a style gives a width of its own.
 */
const OUTLINE_RING_PREFIX = "graphty-node-outline-";

/** What separates a ring's color from the width a style gave it, in the ring's name. */
const OUTLINE_WIDTH_MARK = "-w";

/**
 * The ring's inner radius, in radii of the node's outline as the camera sees it: a little inside
 * the node's edge, so it overlaps it.
 */
const OUTLINE_RING_INNER = 0.9;

/** The ring's outer radius, in radii of the node's outline as the camera sees it. */
const OUTLINE_RING_OUTER = 1.35;

/**
 * How far the ring sits in front of the node's center, toward the camera, in node radii: at the
 * node's front surface. Through the center, the node's own edges (which meet there) were drawn
 * over the ring wherever they crossed it; in front, they pass behind it.
 */
const OUTLINE_RING_LIFT = 1.05;

/** The ring's depth offset; see createOutlineRingMaterial. */
const OUTLINE_RING_DEPTH_OFFSET = 2;

/** The smallest node radius a ring is sized for, so a node with no bounds yet still gets one. */
const MIN_RING_RADIUS = 0.01;

/** How far, in world units, a point of a ring's outline may move before the ring is rebuilt round it. */
const RING_REBUILD_TOLERANCE = 1e-5;

/** Scratch vectors, so placing a ring every frame allocates little. */
const TO_CAMERA = new Vector3();
const RING_RIGHT = new Vector3();
const RING_UP = new Vector3();
const RING_POINT = new Vector3();

/**
 * What a ring goes round, from its node's mesh, in the mesh's own units: its distinct vertices, and for
 * a flat shape the convex hull of its front (x, y) and how deep its slab is.
 */
interface RingShape {
    points: Vector3[];
    front: Point2[];
    /** The slab's least and greatest z. */
    depth: readonly [number, number];
}

/** Each node source mesh's ring shape, worked out once from its vertices. */
const RING_SHAPES = new WeakMap<AbstractMesh, RingShape>();

/** Each scene's ring materials, one per color. */
const RING_MATERIALS = new WeakMap<Scene, Map<string, StandardMaterial>>();

/** What a ring keeps between frames. */
interface OutlineRingMetadata {
    shape: RingShape;
    /** Whether the node's shape is flat: its border lies in its own plane, not round the outline the camera sees. */
    flat: boolean;
    /** How far the node's border and outer border reach past its fill, in the fill's own units. */
    borderReach: () => number;
    /** The rings the node draws round its fill (its border, its outer border), innermost first. */
    rings: () => readonly (AbstractMesh | null)[];
    /** The width its style sets, if any. */
    width: number | undefined;
    world: Matrix;
    /** The outline the ring was last built round, in its own plane, in world units; empty before the first. */
    drawn: Point2[];
}

/**
 * Whether two outlines are the same to within {@link RING_REBUILD_TOLERANCE}.
 * @param a - One outline.
 * @param b - The other.
 * @returns True when they match point for point.
 */
function sameOutline(a: readonly Point2[], b: readonly Point2[]): boolean {
    return (
        a.length === b.length &&
        a.every(
            ([x, y], i) =>
                Math.abs(x - b[i][0]) < RING_REBUILD_TOLERANCE && Math.abs(y - b[i][1]) < RING_REBUILD_TOLERANCE,
        )
    );
}

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
export class NodeGlowLayer extends HighlightLayer {
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
 * The edges of a flat shape's face at one depth that only one of its triangles has, by their ends' (x, y).
 * @param positions - The mesh's vertex positions.
 * @param indices - Its triangles.
 * @param z - The face's depth.
 * @returns Each end's neighbors along those edges, and each end's point.
 */
function loneEdges(
    positions: ArrayLike<number>,
    indices: ArrayLike<number>,
    z: number,
): { next: Map<string, string[]>; at: Map<string, Point2> } {
    const at = new Map<string, Point2>();
    const edges = new Map<string, [string, string]>();
    const keyOf = (i: number): string => `${positions[3 * i].toFixed(5)},${positions[3 * i + 1].toFixed(5)}`;
    for (let t = 0; t + 2 < indices.length; t += 3) {
        const corners = [indices[t], indices[t + 1], indices[t + 2]];
        if (corners.some((i) => Math.abs(positions[3 * i + 2] - z) > 1e-5)) {
            continue;
        }
        const keys = corners.map((i) => keyOf(i));
        corners.forEach((i, k) => at.set(keys[k], [positions[3 * i], positions[3 * i + 1]]));
        keys.forEach((a, k) => {
            const b = keys[(k + 1) % 3];
            const key = a < b ? `${a}|${b}` : `${b}|${a}`;
            if (a !== b && !edges.delete(key)) {
                edges.set(key, [a, b]);
            }
        });
    }
    const next = new Map<string, string[]>();
    for (const [a, b] of edges.values()) {
        next.set(a, [...(next.get(a) ?? []), b]);
        next.set(b, [...(next.get(b) ?? []), a]);
    }
    return { next, at };
}

/**
 * The outline of a flat shape's face at one depth, notches and all: the edges of the face's triangles that only one
 * of them has, joined end to end. A star's or a vee's convex hull bridged its notches, and the outline ring built
 * round it left background between the node and its ring there.
 * @param positions - The mesh's vertex positions.
 * @param indices - Its triangles.
 * @param z - The face's depth.
 * @returns The outline, counter-clockwise; null when the face is not one closed loop (a solid, a shape with a hole).
 */
function frontOutline(positions: ArrayLike<number>, indices: ArrayLike<number>, z: number): Point2[] | null {
    const loops = faceLoops(positions, indices, z);
    return loops?.length === 1 ? loops[0] : null;
}

/**
 * The closed loops the edges of a flat face at one depth that only one of its triangles has make: one for a plain
 * face, the outer and the inner edge for a band (a flat shape's border).
 * @param positions - The mesh's vertex positions.
 * @param indices - Its triangles.
 * @param z - The face's depth.
 * @returns The loops, each counter-clockwise; null when the edges do not make closed loops.
 */
function faceLoops(positions: ArrayLike<number>, indices: ArrayLike<number>, z: number): Point2[][] | null {
    const { next, at } = loneEdges(positions, indices, z);
    if (next.size < 3 || [...next.values()].some((n) => n.length !== 2)) {
        return null;
    }
    const left = new Set(next.keys());
    const loops: Point2[][] = [];
    for (const start of next.keys()) {
        if (!left.has(start)) {
            continue;
        }
        const loop = [start];
        left.delete(start);
        let [previous, current] = [start, (next.get(start) ?? [])[0]];
        while (current !== start && left.has(current)) {
            loop.push(current);
            left.delete(current);
            const [a, b] = next.get(current) ?? [];
            [previous, current] = [current, a === previous ? b : a];
        }
        if (current !== start || loop.length < 3) {
            return null;
        }
        const outline = loop.map((k): Point2 => at.get(k) ?? [0, 0]);
        if (signedArea(outline) < 0) {
            outline.reverse();
        }
        loops.push(outline);
    }
    return loops;
}

/**
 * Whether a closed outline encloses a point.
 * @param outline - A closed outline.
 * @param x - The point, x.
 * @param y - The point, y.
 * @returns Whether the point lies inside it (even-odd).
 */
function encloses(outline: readonly Point2[], x: number, y: number): boolean {
    let inside = false;
    outline.forEach(([ax, ay], i) => {
        const [bx, by] = outline[(i + 1) % outline.length];
        if (ay > y !== by > y && x < ax + ((y - ay) * (bx - ax)) / (by - ay)) {
            inside = !inside;
        }
    });
    return inside;
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
        scene.metadata ??= {};
        // Only inside the main pass: a render target drawn before it (the layers' own glow maps)
        // and the next frame's clear keep the full write mask.
        let main = (scene.metadata as GraphSceneMetadata).stencilMainPass;
        if (main === undefined) {
            const state = { on: false };
            main = state;
            (scene.metadata as GraphSceneMetadata).stencilMainPass = state;
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
     * Set how wide an outline is drawn when its style sets no width
     * (`layoutBehavior.node.outlineWidth`): the ring's band, as a multiple of its own width, on
     * every such ring now drawn and every one made later. A ring whose style sets
     * `effect.outline.width` keeps its own.
     * @param scene - The Babylon.js scene.
     * @param width - The width as a multiple of the ring's own, or undefined for that.
     */
    static setOutlineWidth(scene: Scene, width: number | undefined): void {
        scene.metadata ??= {};
        (scene.metadata as GraphSceneMetadata).outlineWidth = width;
        for (const mesh of scene.meshes) {
            if (
                mesh instanceof Mesh &&
                mesh.name.startsWith(OUTLINE_RING_PREFIX) &&
                !mesh.name.includes(OUTLINE_WIDTH_MARK)
            ) {
                this.rebuildRing(mesh, (mesh.metadata as OutlineRingMetadata).drawn);
            }
        }
    }

    /**
     * How wide a node's outline is drawn: its style's width, else the scene's
     * (`layoutBehavior.node.outlineWidth`), else 1, the ring's own.
     * @param scene - The Babylon.js scene.
     * @param width - The width the node's style sets, if any.
     * @returns The width, as a multiple of the ring's own.
     */
    static outlineWidthOf(scene: Scene, width: number | undefined): number {
        const shared: unknown = (scene.metadata as GraphSceneMetadata | null)?.outlineWidth;
        return width ?? (typeof shared === "number" ? shared : 1);
    }

    /**
     * Whether a node's style draws an outline: it names one, and not a width alone (a width with
     * no color draws nothing, as a glow strength with no color draws nothing).
     * @param effect - The effect configuration from the node style.
     * @returns True when an outline is drawn.
     */
    static outlineDrawn(effect: NodeStyleConfig["effect"] | undefined): boolean {
        const outline = effect?.outline;
        return outline !== undefined && (outline.color !== undefined || outline.width === undefined);
    }

    /**
     * The outer radius of a ring: the inner radius plus the band, widened by the outline width.
     * @param width - The width, as a multiple of the ring's own.
     * @returns The outer radius.
     */
    private static ringOuterOf(width: number): number {
        return OUTLINE_RING_INNER + (OUTLINE_RING_OUTER - OUTLINE_RING_INNER) * width;
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
     * ONE RING MESH PER OUTLINED NODE, sharing one material per color. Each ring is built round the
     * outline its own node shows the camera (followCamera), which differs from node to node under
     * perspective, so rings are not instances of one source. The ring is a CHILD of the node's mesh,
     * so it hides and is disposed with it (a restyle that rebuilds the mesh takes the old ring with
     * it, and this is called again for the new mesh).
     *
     * ponytail: a mesh and a draw call per outlined node, and a rebuild whenever the outline it shows
     * changes (every frame while a perspective camera moves); the outline is usually on a few
     * selected or hovered nodes. Draw rings in one batch if many outlined nodes show it.
     * @param mesh - The node's mesh, normally an InstancedMesh from MeshCache.
     * @param effect - The effect configuration from the node style.
     * @param borderReach - How far the node's border and outer border reach past its fill, in the
     * fill's own units, read every frame (a screen-pixel border changes with the zoom); the ring
     * starts there, so it never covers them (#10426).
     * @param flat - Whether the node's shape is flat, so its border lies in its own plane.
     * @param rings - The rings the node draws round its fill (its border, its outer border), innermost first,
     * read every frame: the ring is built round them as they are drawn.
     */
    static applyOutlineEffect(
        mesh: AbstractMesh,
        effect: NodeStyleConfig["effect"] | undefined,
        borderReach: () => number = () => 0,
        flat = false,
        rings: () => readonly (AbstractMesh | null)[] = () => [],
    ): void {
        const existing = mesh.getChildMeshes(true).find((child) => child.name.startsWith(OUTLINE_RING_PREFIX));

        const outline = effect?.outline;
        if (outline === undefined || !this.outlineDrawn(effect)) {
            existing?.dispose();

            return;
        }

        // THE ALPHA IS DROPPED: an outline is drawn opaque. The layer check reports it as
        // W_ALPHA_IGNORED, so the drop is said rather than silent.
        const { rgb } = readColor(this.extractColorValue(outline.color), DEFAULT_OUTLINE_COLOR);
        // Named by color and the width its style sets: a ring with no width of its own is drawn at
        // the scene's width, which setOutlineWidth rewrites in place.
        const own = outline.width;
        const widthPart = own === undefined ? "" : OUTLINE_WIDTH_MARK + String(own);
        const name = `${OUTLINE_RING_PREFIX}${rgb.toHexString()}${widthPart}`;
        const scene = mesh.getScene();
        const kept = existing?.name === name && !existing.isDisposed() && existing instanceof Mesh ? existing : null;
        const ring = kept ?? new Mesh(name, scene);

        if (ring !== existing) {
            existing?.dispose();
            ring.isPickable = false;
            ring.parent = mesh;
            ring.material = this.ringMaterialOf(rgb, scene);
            const observer = scene.onBeforeCameraRenderObservable.add((camera) => {
                this.followCamera(ring, camera);
            });
            ring.onDisposeObservable.addOnce(() => {
                scene.onBeforeCameraRenderObservable.remove(observer);
            });
        }

        const before = ring.metadata as Partial<OutlineRingMetadata> | null;
        const metadata: OutlineRingMetadata = {
            shape: this.ringShapeOf(mesh),
            flat,
            borderReach,
            rings,
            width: own,
            world: before?.world ?? new Matrix(),
            // rebuilt on the next placement: the shape or the width may be new
            drawn: [],
        };
        ring.metadata = metadata;
        const camera = scene.activeCamera;
        if (camera) {
            this.followCamera(ring, camera);
        }
    }

    /**
     * What a node's ring goes round, worked out once per node source mesh from its vertices: its
     * distinct vertices, and the convex hull of its front (x, y) with its slab's depth, in its own units.
     * A mesh with no vertices yet is taken as a small box.
     * @param mesh - The node's mesh.
     * @returns The ring shape.
     */
    private static ringShapeOf(mesh: AbstractMesh): RingShape {
        const source = this.resolveRenderedMesh(mesh);
        const kept = RING_SHAPES.get(source);
        if (kept !== undefined) {
            return kept;
        }

        const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const distinct = new Map<string, Vector3>();
        for (let i = 0; i + 2 < positions.length; i += 3) {
            const [x, y, z] = [positions[i], positions[i + 1], positions[i + 2]];
            distinct.set(`${x.toFixed(5)},${y.toFixed(5)},${z.toFixed(5)}`, new Vector3(x, y, z));
        }
        if (distinct.size === 0) {
            const r = MIN_RING_RADIUS;
            for (const corner of [-r, r].flatMap((x) => [-r, r].flatMap((y) => [-r, r].map((z) => [x, y, z])))) {
                distinct.set(corner.join(","), Vector3.FromArray(corner));
            }
        }
        const points = [...distinct.values()];
        const zs = points.map((p) => p.z);
        const depth: [number, number] = [Math.min(...zs), Math.max(...zs)];
        const shape: RingShape = {
            points,
            front:
                frontOutline(positions, source.getIndices() ?? [], depth[1]) ??
                convexHull(points.map((p): Point2 => [p.x, p.y])),
            depth,
        };
        RING_SHAPES.set(source, shape);
        return shape;
    }

    /**
     * Place a node's ring for one camera, before that camera draws: square to the line of sight to the
     * node, in front of it, and built round the outline the node shows that camera, past its border.
     *
     * THE OUTLINE IS THE ONE THE CAMERA SEES (#10503). The node's vertices are carried through its world
     * matrix and projected, through the camera, onto the ring's plane, and the ring's inner edge is
     * their convex hull. It was the node's bounding ellipsoid (or its front outline) stretched to its
     * reach along the camera's right and up: on a rolled view that stood off a wide ellipse along its
     * short diagonal and cut into it along the long one, and a tetrahedron's, a box's or a cone's ring
     * cut across their slanted sides (`test/browser/node-outline-follows-view.test.ts`).
     *
     * THE RING STARTS PAST THE BORDER (#10426), ON THE RINGS AS DRAWN: their vertices are projected with the
     * node's, so the ring's inner edge is the outer edge of the outermost ring the camera sees. Growing the fill's
     * outline by the rings' reach found a different edge wherever the rings are not that: a sharp corner's rings
     * are cut square at three times their width (`mitredEdges`), so a wide tetrahedron's ring stood well off its
     * outer border's cut point, and a star's inside border that closes its points up draws the fill in past where
     * growing it back finds the star (`test/meshes/outline-ring-on-drawn-rings.test.ts`). A flat shape with a
     * notch is ringed round its outermost ring's own outer edge, in order, at its face toward the camera; a
     * dashed one, whose dashes make no such edge, round its fill's outline grown by the rings' reach.
     *
     * UNDER PERSPECTIVE the projection is through the camera's position, so the ring's edge lies on the
     * node's own edge on screen however far off to the side it is (`test/browser/node-outline-perspective.test.ts`).
     *
     * THE WORLD MATRIX IS SET DIRECTLY, not through a billboard: the ring's geometry is already in world
     * units in its plane.
     * @param ring - The node's ring, a child of the node's mesh.
     * @param camera - The camera about to draw.
     */
    private static followCamera(ring: Mesh, camera: Camera): void {
        const node = ring.parent;
        const metadata = ring.metadata as OutlineRingMetadata | null;
        if (!(node instanceof AbstractMesh) || metadata === null) {
            return;
        }

        const { shape, flat, world } = metadata;
        const border = metadata.borderReach();
        const m = node.computeWorldMatrix();
        const center = node.getAbsolutePosition();
        const perspective = this.faceCamera(camera, center);
        const [toCamera, right, up] = [TO_CAMERA, RING_RIGHT, RING_UP];
        const eye = camera.globalPosition;

        const rings = metadata.rings().filter((r): r is AbstractMesh => r !== null && !r.isDisposed() && r.isEnabled());
        const outermost = rings.at(-1);
        const loop = flat && outermost !== undefined ? this.outerLoop(outermost, toCamera) : null;
        let placed: Vector3[];
        let notched = false;
        if (loop !== null && convexHull(loop.flat).length < loop.flat.length) {
            [placed, notched] = [loop.placed, true];
        } else if (flat && (rings.length === 0 || loop === null)) {
            const { local, notched: ordered } = this.ringPoints(shape, flat, border, m, toCamera);
            placed = local.map((p) => Vector3.TransformCoordinates(p, m));
            notched = ordered;
        } else {
            placed = shape.points.map((p) => Vector3.TransformCoordinates(p, m));
            for (const mesh of rings) {
                placed.push(...this.worldVertices(mesh));
            }
        }
        let depth = 0;
        for (const p of placed) {
            depth = Math.max(depth, Vector3.Dot(p.subtractToRef(center, RING_POINT), toCamera));
        }
        // In front of the node's front surface: through its center, the node's own edges (which meet
        // there) were drawn over the ring wherever they crossed it.
        const lift = OUTLINE_RING_LIFT * Math.max(depth, MIN_RING_RADIUS);
        const plane = center.add(toCamera.scale(lift));
        // Along the line of sight, how far the ring's plane is in front of the camera.
        const ahead = perspective ? Vector3.Dot(eye.subtract(plane), toCamera) : 0;
        const outline = this.projectedHull(placed, plane, perspective ? { eye, ahead } : null, notched);
        // The band starts a little inside the node's edge, so it overlaps it, or with a border at the
        // border's outer edge, so nothing the node draws is under it.
        const fitted =
            rings.length > 0
                ? outline.map(([x, y]): Point2 => [x / OUTLINE_RING_INNER, y / OUTLINE_RING_INNER])
                : outline;
        if (!sameOutline(fitted, metadata.drawn)) {
            this.rebuildRing(ring, fitted);
        }

        Matrix.FromValuesToRef(
            right.x,
            right.y,
            right.z,
            0,
            up.x,
            up.y,
            up.z,
            0,
            toCamera.x,
            toCamera.y,
            toCamera.z,
            0,
            plane.x,
            plane.y,
            plane.z,
            1,
            world,
        );
        ring.freezeWorldMatrix(world);
    }

    /**
     * Point TO_CAMERA from a node toward a camera, and RING_RIGHT and RING_UP square to it, kept upright
     * with the camera.
     * @param camera - The camera.
     * @param center - The node's center.
     * @returns Whether the camera has perspective.
     */
    private static faceCamera(camera: Camera, center: Vector3): boolean {
        const [toCamera, right, up] = [TO_CAMERA, RING_RIGHT, RING_UP];
        camera.getDirectionToRef(Vector3.Up(), up);
        const perspective = camera.mode !== Camera.ORTHOGRAPHIC_CAMERA;
        if (perspective) {
            camera.globalPosition.subtractToRef(center, toCamera);
            toCamera.normalize();
        } else {
            camera.getDirectionToRef(Vector3.Forward(camera.getScene().useRightHandedSystem), toCamera);
            toCamera.scaleInPlace(-1);
        }
        Vector3.CrossToRef(up, toCamera, right);
        right.normalize();
        Vector3.CrossToRef(toCamera, right, up);
        return perspective;
    }

    /**
     * A mesh's vertices in world units.
     * ponytail: every vertex every frame; outlines are on a few selected or hovered nodes.
     * @param mesh - The mesh or instance.
     * @returns The vertices.
     */
    private static worldVertices(mesh: AbstractMesh): Vector3[] {
        const source = this.resolveRenderedMesh(mesh);
        const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
        const world = mesh.computeWorldMatrix();
        const out: Vector3[] = [];
        for (let i = 0; i + 2 < positions.length; i += 3) {
            out.push(
                Vector3.TransformCoordinatesFromFloatsToRef(
                    positions[i],
                    positions[i + 1],
                    positions[i + 2],
                    world,
                    new Vector3(),
                ),
            );
        }
        return out;
    }

    /**
     * A flat ring's outer edge, in order, at its face toward the camera: the largest loop of its face round the
     * node's middle.
     * @param mesh - The ring (a flat shape's border or outer border).
     * @param toCamera - Toward the camera.
     * @returns The edge in the ring's own (x, y) and in world units; null when its face makes no closed loops (a
     * dashed ring).
     */
    private static outerLoop(mesh: AbstractMesh, toCamera: Vector3): { flat: Point2[]; placed: Vector3[] } | null {
        const source = this.resolveRenderedMesh(mesh);
        const positions = source.getVerticesData(VertexBuffer.PositionKind) ?? [];
        let [low, high] = [Infinity, -Infinity];
        for (let i = 2; i < positions.length; i += 3) {
            [low, high] = [Math.min(low, positions[i]), Math.max(high, positions[i])];
        }
        const world = mesh.computeWorldMatrix();
        const { m } = world;
        const z = m[8] * toCamera.x + m[9] * toCamera.y + m[10] * toCamera.z >= 0 ? high : low;
        const loops = faceLoops(positions, source.getIndices() ?? [], z);
        const around = (loops ?? []).filter((l) => encloses(l, 0, 0));
        if (around.length === 0) {
            return null;
        }
        const outer = around.reduce((a, b) => (signedArea(b) > signedArea(a) ? b : a), around[0]);
        return {
            flat: outer,
            placed: outer.map(([x, y]) => Vector3.TransformCoordinatesFromFloatsToRef(x, y, z, world, new Vector3())),
        };
    }

    /**
     * What a ring goes round, in the mesh's own units: a flat shape's front, offset by its border in its own plane, at
     * its slab's two faces; else its vertices. A flat shape with a notch (a vee, a star) is ringed round its own
     * outline, in order, at its face toward the camera: the convex hull of both faces bridged the notch.
     * @param shape - The node's ring shape.
     * @param flat - Whether the node's shape is flat.
     * @param border - How far its border reaches past its fill, in its own units.
     * @param m - The node's world matrix.
     * @param toCamera - Toward the camera.
     * @returns The points, and whether they are a notched outline in order.
     */
    private static ringPoints(
        shape: RingShape,
        flat: boolean,
        border: number,
        m: Matrix,
        toCamera: Vector3,
    ): { local: Vector3[]; notched: boolean } {
        if (!flat) {
            return { local: shape.points, notched: false };
        }
        const notched = convexHull(shape.front).length < shape.front.length;
        const front = border > 0 ? offsetOutline(shape.front, border) : shape.front;
        if (notched) {
            // the face whose depth runs toward the camera along the mesh's own z
            const near = m.m[8] * toCamera.x + m.m[9] * toCamera.y + m.m[10] * toCamera.z >= 0 ? 1 : 0;
            return { local: front.map(([x, y]) => new Vector3(x, y, shape.depth[near])), notched };
        }
        return {
            local: border > 0 ? front.flatMap(([x, y]) => shape.depth.map((z) => new Vector3(x, y, z))) : shape.points,
            notched,
        };
    }

    /**
     * The convex hull of points carried onto a ring's plane, in the plane's right and up (RING_RIGHT,
     * RING_UP): through the camera under perspective, else straight along the line of sight. A node
     * with no area yet gets a small square.
     * @param placed - The points, in world units; moved in place.
     * @param plane - The ring's center.
     * @param through - Under perspective, the camera's position and how far in front of it the plane is.
     * @param through.eye - The camera's position.
     * @param through.ahead - How far in front of the camera the plane is, along the line of sight.
     * @param ordered - Whether the points are an outline already, in order, kept as it is (a notched flat shape's).
     * @returns The hull, in world units.
     */
    private static projectedHull(
        placed: Vector3[],
        plane: Vector3,
        through: { eye: Vector3; ahead: number } | null,
        ordered = false,
    ): Point2[] {
        const projected: Point2[] = [];
        for (const p of placed) {
            if (through !== null) {
                const along = Vector3.Dot(through.eye.subtract(p), TO_CAMERA);
                if (along <= through.ahead) {
                    continue;
                }
                p.subtractInPlace(through.eye)
                    .scaleInPlace(through.ahead / along)
                    .addInPlace(through.eye);
            }
            p.subtractInPlace(plane);
            projected.push([Vector3.Dot(p, RING_RIGHT), Vector3.Dot(p, RING_UP)]);
        }
        const hull = ordered ? projected : convexHull(projected);
        const r = MIN_RING_RADIUS;
        return hull.length < 3
            ? [
                  [-r, -r],
                  [r, -r],
                  [r, r],
                  [-r, r],
              ]
            : hull;
    }

    /**
     * Build a ring's band round an outline in its own plane, at the width its style or the scene sets.
     * @param ring - The ring.
     * @param outline - The outline, in world units; the band runs from {@link OUTLINE_RING_INNER} of it outward.
     */
    private static rebuildRing(ring: Mesh, outline: Point2[]): void {
        const metadata = ring.metadata as OutlineRingMetadata;
        metadata.drawn = outline;
        if (outline.length === 0) {
            return;
        }
        const scene = ring.getScene();
        this.ringVertexData(this.ringOuterOf(this.outlineWidthOf(scene, metadata.width)), outline).applyToMesh(
            ring,
            true,
        );
        ring.refreshBoundingInfo();
        // A new submesh: a frozen list of what is drawn holds the old one, whose counts overrun these buffers.
        (scene.metadata as GraphSceneMetadata | null)?.thawActiveMeshes?.();
    }

    /**
     * A ring's geometry: a flat band from {@link OUTLINE_RING_INNER} of an outline to an outer
     * multiple of it, in the XY plane, facing +z.
     * @param outer - The outer multiple.
     * @param outline - The outline the band follows.
     * @returns The vertex data.
     */
    private static ringVertexData(outer: number, outline: readonly Point2[]): VertexData {
        const positions: number[] = [];
        const indices: number[] = [];
        const segments = outline.length;
        for (let i = 0; i <= segments; i++) {
            const [x, y] = outline[i % segments];
            positions.push(x * OUTLINE_RING_INNER, y * OUTLINE_RING_INNER, 0, x * outer, y * outer, 0);
            if (i < segments) {
                const at = i * 2;
                indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
            }
        }

        const data = new VertexData();
        data.positions = positions;
        data.indices = indices;
        // +z faces the camera.
        data.normals = positions.map((_, i) => (i % 3 === 2 ? 1 : 0));
        return data;
    }

    /**
     * The material of every ring of one color in a scene.
     * @param color - The ring's color.
     * @param scene - The scene.
     * @returns The frozen material.
     */
    private static ringMaterialOf(color: Color3, scene: Scene): StandardMaterial {
        let materials = RING_MATERIALS.get(scene);
        if (materials === undefined) {
            materials = new Map();
            RING_MATERIALS.set(scene, materials);
        }
        const key = color.toHexString();
        const kept = materials.get(key);
        if (kept !== undefined && scene.materials.includes(kept)) {
            return kept;
        }

        const material = new StandardMaterial(`${OUTLINE_RING_PREFIX}${key}-material`, scene);
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
        materials.set(key, material);
        return material;
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
        const existingLayer = (scene.metadata as GraphSceneMetadata | null)?.glowLayer;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            return existingLayer;
        }

        const glowLayer = new NodeGlowLayer(this.GLOW_LAYER_NAME, scene);

        scene.metadata ??= {};
        (scene.metadata as GraphSceneMetadata).glowLayer = glowLayer;

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
     * when the merged style names a glow color: a strength on its own draws nothing.
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
        // an `effect.glow` with no color on every node it paints. Treated as "glow on", that drew
        // the white fallback on all of them (#2068). The strength only scales a color some layer set.
        // A STRENGTH OF 0 IS NO GLOW (#2067), so it takes the removal branch and never creates or
        // keeps alive the full-screen glow layer for a glow nobody can see.
        const colorValue = this.extractColorValue(effect?.glow?.color);
        const strength = effect?.glow?.strength ?? 1;
        if (effect?.glow && colorValue !== undefined && strength > 0) {
            const glowLayer = this.getOrCreateGlowLayer(scene);
            // The fallback only covers an unreadable color string; a missing one never gets here.
            const { rgb: color, alpha } = readColor(colorValue, DEFAULT_GLOW_COLOR);
            this.glowStrengths(scene).set(renderedMesh, { strength, alpha });

            // Same defense as the outline path: a mesh in an unexpected state must not take down
            // a repaint.
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
            const existingLayer = (scene.metadata as GraphSceneMetadata | null)?.glowLayer;
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
        scene.metadata ??= {};
        (scene.metadata as GraphSceneMetadata).glowStrengths ??= new Map<Mesh, { strength: number; alpha: number }>();

        return (scene.metadata as GraphSceneMetadata).glowStrengths as Map<Mesh, { strength: number; alpha: number }>;
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
        const existingLayer = (scene.metadata as GraphSceneMetadata | null)?.glowLayer;
        if (existingLayer && !this.isLayerDisposed(existingLayer, scene)) {
            existingLayer.dispose();
        }

        if (scene.metadata) {
            (scene.metadata as GraphSceneMetadata).glowLayer = undefined;
            (scene.metadata as GraphSceneMetadata).glowStrengths = undefined;
        }
    }
}
