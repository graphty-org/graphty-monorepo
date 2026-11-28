// Installs Mesh.prototype.createInstance, which createModelInstance calls.
import "@babylonjs/core/Meshes/instancedMesh.js";

import type { BaseTexture, ICanvasGradient, ICanvasRenderingContext, InstancedMesh } from "@babylonjs/core";
import { VertexBuffer } from "@babylonjs/core/Buffers/buffer.js";
import { Camera } from "@babylonjs/core/Cameras/camera.js";
import { Material } from "@babylonjs/core/Materials/material.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import { DynamicTexture } from "@babylonjs/core/Materials/Textures/dynamicTexture.js";
import { Color3, Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Matrix, Quaternion, Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh.js";
import { Mesh } from "@babylonjs/core/Meshes/mesh.js";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder.js";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode.js";
import { Scene } from "@babylonjs/core/scene.js";

import { SharedImplementationMap } from "../catalog/pluginRegistry";
import type { NodeStyleConfig } from "../config";
import { PolyhedronType, SHAPE_CONSTANTS } from "../constants/meshConstants";
import type { ModelTemplate } from "../models/ModelCache";
import type { GraphSceneMetadata } from "../types/sceneMetadata";
import { addGradientStops } from "./edgeGradient";
import { shadeInstanceColors } from "./InstanceColorShading";
import { setUpQuietly } from "./LabelBatch";
import type { MeshCache } from "./MeshCache";
import { moveInstance } from "./moveInstance";
import { isNodeMaterial, lightNodeMaterial, outlineNodeMesh, sceneLighting } from "./NodeLighting";
import {
    bodilessSlab,
    fitNodeMesh,
    type NodeExtents,
    outlineSlab,
    projectedVertices,
    ringSlab,
    ringVertexData,
    setLabelBox,
} from "./NodeShapeGeometry";
import { prepareOverlayShader } from "./overlayMaterial";
import { ON_TOP_RENDERING_GROUP } from "./RichTextLabel";
import {
    borderRing,
    convexHull,
    drawnAgainstBox,
    flatShapeOutline,
    inUnitBox,
    isFlatShape,
    mitredEdges,
    offsetOutline,
    type Point2,
    type RingPiece,
    sharpTwinOf,
    silhouetteOutline,
    type WaveShape,
} from "./shapeOutlines";

interface NodeMeshOptions {
    styleId: string;
    is2D: boolean;
    size: number;
    /**
     * The shortest one width of a dashed, dotted or dash-dot border's pattern is drawn, in scene units (a screen pixel
     * at the node's zoom, `borderRing`); unset, the pattern is measured in the border's own width. The style id
     * names it, since the ring is cached under that id.
     */
    dashUnit?: number;
}

interface NodeMeshCreateOptions {
    shape?: NodeStyleConfig["shape"];
    texture?: NodeStyleConfig["texture"];
    /** `node.texture`'s picture, loaded: the shape's surface. */
    picture?: BaseTexture | null;
    effect?: NodeStyleConfig["effect"];
    border?: NodeStyleConfig["border"];
    outerBorder?: NodeStyleConfig["outerBorder"];
}

/**
 * How far across the view a fitted node of size 1 is drawn (`NodeMesh.isFitted`: any node under
 * `sizeMode: "uniform"`, and under the default "scale" a flat shape, or one with a width, height,
 * depth or `planar`): the default icosphere's diameter. Width, height, depth and a border's width are in the same units, so a node
 * 4 wide is as wide as a node of size 4.
 */
export const NODE_EXTENT_PER_SIZE = 1.5;

/** The flat shapes an edge ends on without their outline: their box is it, or the ellipse in it is (`surfaceReach`). */
const BOX_OR_ELLIPSE: ReadonlySet<string> = new Set(["rectangle", "none", "ellipse"]);

/**
 * The opacity a node's style draws its body at (`node.opacity`), as its source mesh's visibility.
 * @param texture - The style's texture.
 * @returns The opacity, 1 when the style names none.
 */
function styleOpacity(texture: NodeStyleConfig["texture"]): number {
    const color = texture?.color;
    return typeof color === "object" && "opacity" in color ? (color.opacity ?? 1) : 1;
}

/**
 * The opacity a style paints a node's body at, as a line's end reads it: `node.opacity`, or 0 for a wireframe body,
 * which hides nothing between its lines, so a plain line stops at its outline as at a translucent one (issue #10374).
 * @param style - The resolved style.
 * @returns The opacity.
 */
export function paintedBodyOpacity(style: Pick<NodeStyleConfig, "texture" | "effect"> | null | undefined): number {
    return style?.effect?.wireframe === true ? 0 : styleOpacity(style?.texture);
}

/**
 * Where a node body's source draws in the blended pass (Babylon draws a lower `alphaIndex` first),
 * plus its look's place ({@link lookPlace}): after the node surfaces (`NodeBillboardBatch`, 1e8) and the edges with an
 * index (about 1e9), before every mesh that keeps the default, as the sources' distance once put
 * them. The place orders translucent looks among themselves by when each was first made, on both render
 * paths and after any history of instances: a source parks at one place whose distance its
 * geometry's bounds shift, and ties fell to whichever look's instance `scene.meshes` met first,
 * so removing and adding back a node could reorder whole looks (issues #10029, #10030).
 */
const NODE_BODY_ALPHA_INDEX = 1e12;

/** The `uniqueId` each look's first source had, by what the look draws, per scene. */
const lookPlaces = new WeakMap<Scene, Map<string, number>>();

/**
 * A look's place among translucent looks: the `uniqueId` of the first source made for it. A source
 * no node wears is pruned and made again with a higher id (and often under another cache key, as
 * the style interner numbers a look again), which would move the look over every look made in
 * between; it takes its first place back instead.
 * @param mesh - The new source.
 * @param key - What the look draws: its view, picture and style.
 * @returns The place.
 */
function lookPlace(mesh: Mesh, key: string): number {
    const scene = mesh.getScene();
    let places = lookPlaces.get(scene);
    if (places === undefined) {
        places = new Map();
        lookPlaces.set(scene, places);
    }

    // ponytail: one entry per distinct look the scene ever drew, never dropped; drop entries with the
    // scene's sources if a graph cycles through unbounded looks.
    let place = places.get(key);
    if (place === undefined) {
        place = mesh.uniqueId;
        places.set(key, place);
    }

    return place;
}

/** How deep a node drawn flat is, as a fraction of its smaller side: thin, but never zero. */
const THIN_DEPTH_RATIO = 0.02;

/** The copies of its outline a node's soft shadow is drawn in, from its blur in to its blur out. */
const SHADOW_LAYERS = 4;

/**
 * How far apart along the 2D camera's view, in scene units, the front faces of two neighboring
 * `zIndex` levels are drawn. Far above the depth buffer's resolution at the 2D camera's range,
 * and far below anything a reader could see in an orthographic view.
 */
const Z_INDEX_STEP = 0.05;

/**
 * The nearest node in front of the camera that draws an instance of a ring.
 * @param ring - The ring's source mesh.
 * @param view - The camera's view matrix.
 * @param ahead - 1 where the camera looks along +z in its view, -1 where along -z.
 * @param at - Set to that node's middle in the camera's view.
 * @returns The node, or null when none is in front of the camera.
 */
function nearestDrawing(ring: Mesh, view: Matrix, ahead: number, at: Vector3): TransformNode | null {
    let nearest: TransformNode | null = null;
    let distance = Infinity;
    forEachDrawn(ring, view, (_instance, node, middle) => {
        if (middle.z * ahead > 0 && middle.z * ahead < distance) {
            [nearest, distance] = [node, middle.z * ahead];
            at.copyFrom(middle);
        }
    });

    return nearest;
}

/**
 * Visit every enabled instance of a ring that has a node, with that node's middle in the camera's view.
 * @param ring - The ring's source mesh.
 * @param view - The camera's view matrix.
 * @param visit - Called with the instance, its node and the node's middle (reused between calls).
 */
function forEachDrawn(
    ring: Mesh,
    view: Matrix,
    visit: (instance: InstancedMesh, node: TransformNode, middle: Vector3) => void,
): void {
    const middle = new Vector3();
    for (const instance of ring.instances) {
        const node = instance.parent as TransformNode | null;
        if (node === null || !instance.isEnabled()) {
            continue;
        }
        Vector3.TransformCoordinatesToRef(node.getAbsolutePosition(), view, middle);
        visit(instance, node, middle);
    }
}

/**
 * How much larger than its own outline a solid seen from `distance` looks on the plane through its middle, square to
 * the line from the camera: a sphere of `radius` is seen inside the cone that touches it, whose circle on that plane is
 * `distance / sqrt(distance^2 - radius^2)` times the sphere's; and a ring whose far face is `back` behind that plane is
 * built larger by as much as that face is further away, so the face's inner edge is seen on the outline.
 * @param distance - How far the solid's middle is from the camera.
 * @param radius - The solid's radius, in the same units.
 * @param back - How far behind the middle the ring's far face is, in the same units.
 * @returns The factor.
 */
function seenGrowth(distance: number, radius: number, back: number): number {
    const square = Math.max(distance * distance - radius * radius, 1e-6 * distance * distance);

    return (distance / Math.sqrt(square)) * ((distance + back) / distance);
}

/**
 * Turn every node's instance of a solid's ring to face the camera along the line to that node's own middle, and size
 * it for that node's distance, so each node gets the ring the nearest one was built for, seen as it would see it.
 * A ring turned only with the camera, square to the middle of the view, is round on a node in the middle of the view
 * and stretched toward the edge of it; one ring shared by a style was built for the nearest node, so every other node
 * of the style drew that node's stretch (issue #10373).
 * @param ring - The ring's source mesh, every instance billboarded to the camera.
 * @param view - The camera's view matrix.
 * @param ahead - 1 where the camera looks along +z in its view, -1 where along -z.
 * @param size - The solid's size in its own units.
 * @param size.radius - Its radius.
 * @param size.back - How far the ring's far face is behind the node's middle along the view.
 * @param nearest - The nearest node's middle in the camera's view; its instance is the unit the others are sized by.
 * @param nearestScale - The nearest node's scale.
 * @param turned - Set to the turn the nearest node's instance was given, in the camera's view.
 */
function faceEachNode(
    ring: Mesh,
    view: Matrix,
    ahead: number,
    size: { radius: number; back: number },
    nearest: Vector3,
    nearestScale: number,
    turned: Quaternion,
): void {
    const { radius, back } = size;
    const forward = new Vector3(0, 0, ahead);
    const unit = seenGrowth(nearest.length(), radius * nearestScale, back * nearestScale);
    Quaternion.FromUnitVectorsToRef(forward, nearest.normalizeToNew(), turned);
    forEachDrawn(ring, view, (instance, node, middle) => {
        const distance = middle.length();
        if (middle.z * ahead <= 0) {
            return;
        }
        // applied before the billboard's turn to the camera, so a turn in the camera's view
        instance.rotationQuaternion ??= new Quaternion();
        Quaternion.FromUnitVectorsToRef(forward, middle.scaleInPlace(1 / distance), instance.rotationQuaternion);
        const scale = node.absoluteScaling.x;
        instance.scaling.setAll(seenGrowth(distance, radius * scale, back * scale) / unit);
    });
}

/**
 * Move a node mesh's geometry back so its front face sits `-zIndex` steps behind the plane every
 * edge and every node at `zIndex` 0 is drawn on (both views look along +z). Its position stays the
 * node's own, so edges, picking and the layout see no difference; only the depth test does. In a
 * 3D view only a flat shape moves: a group from a file drawn flat around its members at their own
 * depth would otherwise be thicker than they are and hide them, while moving a solid back by its
 * depth would shift it visibly. A node at 0 or with no `zIndex` is left exactly as it was.
 * @param mesh - The source mesh, before any instance is made of it.
 * @param shape - The node's shape block.
 * @param is2D - Whether the graph is drawn in 2D.
 */
function placeByZIndex(mesh: Mesh, shape: NodeStyleConfig["shape"], is2D: boolean): void {
    // `node.onTop`: drawn after the graph with the depth cleared, so no edge or other node covers it in any view.
    if (shape?.onTop === true) {
        mesh.renderingGroupId = ON_TOP_RENDERING_GROUP;
    }

    const zIndex = shape?.zIndex ?? 0;
    if (zIndex >= 0) {
        if (is2D) {
            placeByDrawOrder(mesh, shape?.drawOrder);
        }

        return;
    }

    mesh.refreshBoundingInfo();
    if (!is2D) {
        const { extendSize } = mesh.getBoundingInfo().boundingBox;
        // a flat shape is THIN_DEPTH_RATIO of its smaller side deep; twice that leaves room for rounding
        if (extendSize.z > 2 * THIN_DEPTH_RATIO * Math.min(extendSize.x, extendSize.y)) {
            return;
        }
    }

    const front = mesh.getBoundingInfo().boundingBox.minimum.z;
    mesh.bakeTransformIntoVertices(Matrix.Translation(0, 0, -zIndex * Z_INDEX_STEP - front));
    mesh.refreshBoundingInfo();
}

/**
 * How far apart along the 2D camera's view the front faces of two neighboring `drawOrder`
 * levels are drawn: about ten times the depth buffer's resolution at the 2D camera's range, so
 * the 101 levels together stay well under a unit deep.
 */
const DRAW_ORDER_STEP = Z_INDEX_STEP / 8;

/**
 * In a 2D view, flatten the camera-facing half of a node mesh onto one plane `drawOrder + 1`
 * steps in front of the plane the edges are drawn on, leaving the other half where it is.
 *
 * WHY FLAT. A node drawn in 2D can still be a solid (the default sphere), and two solids that
 * overlap cut through each other: each shows where its own surface is nearer, so neither is on
 * top, and a large node pokes through a small one in front of it. A flat face per order level
 * means that wherever two ordered nodes overlap, the higher order is nearer everywhere. The
 * vertices keep their normals, so the shading seen head-on is unchanged, and the half behind the
 * edges' plane keeps the outline an edge's end is found on. No `drawOrder` leaves the mesh exactly
 * as it was.
 * @param mesh - The source mesh, before any instance is made of it.
 * @param drawOrder - The node's draw order, 0 to 100.
 */
function placeByDrawOrder(mesh: Mesh, drawOrder: number | undefined): void {
    const positions = drawOrder === undefined ? null : mesh.getVerticesData(VertexBuffer.PositionKind);
    if (drawOrder === undefined || positions === null) {
        return;
    }

    const front = -(drawOrder + 1) * DRAW_ORDER_STEP;
    for (let z = 2; z < positions.length; z += 3) {
        if (positions[z] < 0) {
            positions[z] = front;
        }
    }

    mesh.setVerticesData(VertexBuffer.PositionKind, positions);
    mesh.refreshBoundingInfo();
}

/** How finely a round shape is tessellated: the shape's own mesh, the low-detail one, or a count. */
type MeshDetail = NonNullable<NonNullable<NodeStyleConfig["shape"]>["detail"]>;

type ShapeCreator = (size: number, scene?: Scene, detail?: MeshDetail) => Mesh;

/** How many segments "low" draws around a round shape that is not a sphere. */
const LOW_DETAIL_SEGMENTS = 8;

/**
 * The segment count a detail asks for, or undefined for the shape's own.
 * @param detail - The node's `shape.detail`.
 * @param low - The count "low" stands for.
 * @returns The count, or undefined for "full" or unset.
 */
function segmentsOf(detail: MeshDetail | undefined, low = LOW_DETAIL_SEGMENTS): number | undefined {
    if (detail === "low") {
        return low;
    }

    return typeof detail === "number" ? detail : undefined;
}

/**
 * Width and height in pixels of the square canvas a gradient ramp is painted into.
 *
 * Square rather than a 1-pixel strip because a strip cannot carry a vertical ramp -- see
 * `NodeMesh.createGradientTexture`. 128 costs roughly 64 KB of GPU memory per distinct gradient
 * and is ample for a node-sized mesh; raising it multiplies the ceiling described on
 * MAX_GRADIENT_TEXTURES_PER_SCENE by the square of the change.
 */
const GRADIENT_TEXTURE_SIZE = 128;

/** The smallest size a node mesh is built at; a size of 0 draws this, never hidden. */
const MIN_NODE_SIZE = 1e-3;

/**
 * Hard ceiling on how many distinct gradient ramps may be allocated for one scene.
 *
 * This is the guard against the calculated-style hazard documented on
 * `NodeMesh.getGradientTexture`: a `calculatedStyle` expression produces a distinct style value,
 * and therefore a distinct material, per node, so a gradient computed per node would otherwise
 * allocate a texture per node. At 32 the worst case is about 2 MB, which is affordable; past the
 * ceiling the material falls back to the gradient's first stop as a flat color rather than
 * allocating without bound. It counts gradients some material still draws: a texture is disposed
 * and its slot freed when the last material using it is disposed.
 */
const MAX_GRADIENT_TEXTURES_PER_SCENE = 32;

/**
 * Gradient ramps interned per scene, keyed by the gradient VALUE rather than by style id.
 *
 * A WeakMap so the whole table is collected with the scene it belongs to -- textures never leak
 * between scenes, and a test that builds and drops a scene leaves nothing behind. `users` counts
 * the live materials drawing the texture.
 */
const gradientTextureCache = new WeakMap<Scene, Map<string, { texture: DynamicTexture; users: number }>>();

/** A gradient color with an alpha under full: `#rgba` or `#rrggbbaa`. */
const SEE_THROUGH = /^#(?:[0-9a-f]{3}[0-9a-e]|[0-9a-f]{6}(?!ff)[0-9a-f]{2})$/i;

interface ColorObject {
    colorType: string;
    value?: string;
    colors?: string[];
    stops?: number[];
    direction?: number;
    centerX?: number;
    centerY?: number;
    radius?: number;
    opacity?: number;
}

/**
 * A gradient color normalized out of the `AdvancedColorStyle` discriminated union.
 *
 * `radial` distinguishes the two gradient members of that union. `direction` is meaningless for
 * the radial form and is pinned to 0 there so the cache key below stays canonical -- two radial
 * gradients that differ only in a stray direction must not intern as two textures.
 */
interface GradientColor {
    radial: boolean;
    colors: string[];
    /** Where each color sits, one per color; undefined, evenly spaced. */
    stops: number[] | undefined;
    direction: number;
    /** A radial gradient's middle, as fractions of the node's box (0.5, 0.5 is its middle), and its reach in halves of the node's side. */
    circle: { x: number; y: number; r: number };
}

/**
 * Factory class for creating node meshes with various shapes
 *
 * Supports multiple 3D shapes including primitives (box, sphere, cylinder),
 * polyhedra (tetrahedron, octahedron, etc.), and custom shapes. Handles
 * material creation, caching, and 2D/3D rendering modes.
 */
// eslint-disable-next-line @typescript-eslint/no-extraneous-class -- Static factory class for node mesh creation
export class NodeMesh {
    // Shared with every other copy of graphty-element on the page, so a shape registered through
    // one reaches them all; each copy still builds its own built-ins with its own Babylon.js.
    private static readonly shapeCreators = new SharedImplementationMap<ShapeCreator>("shape");

    static {
        // Every creator passes the scene on. Without it Babylon builds the mesh in the scene created
        // last on the page, so with several graphs every graph's mesh lands in one of them (#2257).
        NodeMesh.registerShapeCreator("box", (size, scene) => NodeMesh.createBox(size, scene));
        NodeMesh.registerShapeCreator("sphere", (size, scene, detail) => NodeMesh.createSphere(size, scene, detail));
        NodeMesh.registerShapeCreator("cylinder", (size, scene, detail) =>
            NodeMesh.createCylinder(size, scene, detail),
        );
        NodeMesh.registerShapeCreator("cone", (size, scene, detail) => NodeMesh.createCone(size, scene, detail));
        NodeMesh.registerShapeCreator("capsule", (size, scene, detail) => NodeMesh.createCapsule(size, scene, detail));
        NodeMesh.registerShapeCreator("torus", (size, scene, detail) => NodeMesh.createTorus(size, scene, detail));
        NodeMesh.registerShapeCreator("torus-knot", (size, scene, detail) =>
            NodeMesh.createTorusKnot(size, scene, detail),
        );

        NodeMesh.registerShapeCreator("tetrahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TETRAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("octahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.OCTAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("dodecahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.DODECAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("icosahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ICOSAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("rhombicuboctahedron", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.RHOMBICUBOCTAHEDRON, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("hexagonal-prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.HEXAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("square-pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.SQUARE_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-square-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_SQUARE_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-pentagonal-dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated-pentagonal-cupola", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_CUPOLA, size, scene),
        );

        NodeMesh.registerShapeCreator("goldberg", (size, scene) => NodeMesh.createGoldberg(size, scene));
        NodeMesh.registerShapeCreator("icosphere", (size, scene, detail) =>
            NodeMesh.createIcoSphere(size, scene, detail),
        );
        NodeMesh.registerShapeCreator("geodesic", (size, scene) => NodeMesh.createGeodesic(size, scene));

        // Also register underscore versions for backward compatibility
        NodeMesh.registerShapeCreator("triangular_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("hexagonal_prism", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.HEXAGONAL_PRISM, size, scene),
        );
        NodeMesh.registerShapeCreator("square_pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.SQUARE_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_pyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_PYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("triangular_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.TRIANGULAR_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("pentagonal_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_square_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_SQUARE_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_pentagonal_dipyramid", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_DIPYRAMID, size, scene),
        );
        NodeMesh.registerShapeCreator("elongated_pentagonal_cupola", (size, scene) =>
            NodeMesh.createPolyhedron(PolyhedronType.ELONGATED_PENTAGONAL_CUPOLA, size, scene),
        );
    }

    /**
     * Create a node mesh with caching
     * @param cache - Mesh cache for reusing geometry
     * @param options - Node mesh options including styleId and size
     * @param createOptions - Creation options for shape, texture, and effects
     * @param scene - Babylon.js scene
     * @returns Created or cached node mesh
     */
    static create(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        scene?: Scene,
    ): AbstractMesh {
        return cache.get(this.cacheKeyOf(options), () => this.createSource(options, createOptions, scene));
    }

    /**
     * Draw an instance {@link NodeMesh.create} built from the source it would build now, as a new
     * instance of it starts: the 2D/3D switch keeps every node's instance (`keepNodeMeshForDimension`)
     * rather than dispose it and build another. Only the instance's own transform and buffers are
     * reset; the caller builds everything that hangs from it again.
     * @param instance - The instance, off every source.
     * @param cache - As for {@link NodeMesh.create}.
     * @param options - As for {@link NodeMesh.create}.
     * @param createOptions - As for {@link NodeMesh.create}.
     * @param scene - As for {@link NodeMesh.create}.
     * @returns The instance.
     */
    static reuse(
        instance: InstancedMesh,
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        scene?: Scene,
    ): InstancedMesh {
        const name = this.cacheKeyOf(options);
        const source = cache.sourceFor(name, () => this.createSource(options, createOptions, scene));
        instance.name = name;
        // What Babylon's constructor and instance factory take from the source.
        instance.position.copyFrom(source.position);
        instance.rotation.copyFrom(source.rotation);
        instance.scaling.copyFrom(source.scaling);
        instance.rotationQuaternion = source.rotationQuaternion?.clone() ?? null;
        instance.infiniteDistance = source.infiniteDistance;
        instance.setPivotMatrix(source.getPivotMatrix());
        if (source.instancedBuffers) {
            instance.instancedBuffers = { ...source.instancedBuffers };
        }

        moveInstance(instance, source);
        return instance;
    }

    /**
     * The source mesh {@link NodeMesh.create} instances, with no instance of it: what a row with
     * no `Node` is drawn from by its batch.
     * @param cache - The mesh cache.
     * @param options - As for {@link NodeMesh.create}.
     * @param createOptions - As for {@link NodeMesh.create}.
     * @param scene - The scene.
     * @returns The source mesh.
     */
    static source(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        scene?: Scene,
    ): Mesh {
        return cache.sourceFor(this.cacheKeyOf(options), () => this.createSource(options, createOptions, scene));
    }

    /**
     * The cache key of a node's source mesh.
     * @param options - Its style id and view.
     * @returns The key.
     */
    private static cacheKeyOf(options: NodeMeshOptions): string {
        return `node-style-${options.styleId}-${options.is2D ? "2d" : "3d"}`;
    }

    /**
     * Build a node's source mesh and its material.
     * @param options - As for {@link NodeMesh.create}.
     * @param createOptions - As for {@link NodeMesh.create}.
     * @param scene - The scene.
     * @returns The mesh.
     */
    private static createSource(options: NodeMeshOptions, createOptions: NodeMeshCreateOptions, scene?: Scene): Mesh {
        const mesh = this.createMeshWithoutCache(options, createOptions, scene);
        placeByZIndex(mesh, createOptions.shape, options.is2D);
        // The file's draw order, which the row scan reads off a row's source to honor it in 3D (PickService).
        if (createOptions.shape?.drawOrder !== undefined) {
            mesh.metadata = { drawOrder: createOptions.shape.drawOrder };
        }

        // `node.flat`: one normal per triangle, so every face is lit as one plane and a sphere
        // reads as a faceted ball. Done on the SOURCE mesh before the cache instances it, so
        // every node sharing this style id shares the faceted geometry; `node.flat` is a mesh
        // column in the style interner, so flat and smooth nodes never share a source mesh.
        // An unindexed mesh (only a registered shape can be one) has no faces to split.
        if (createOptions.effect?.flatShaded && !mesh.isUnIndexed && mesh.getTotalIndices() > 0) {
            mesh.convertToFlatShadedMesh();
        }

        const material = this.createMaterial(createOptions, options.is2D, scene);
        mesh.material = material;
        // A node drawn now may be selected next: have its halo's shader ready before it is.
        prepareOverlayShader(mesh.getScene());
        if (isNodeMaterial(material)) {
            outlineNodeMesh(mesh, sceneLighting(scene));
        }

        if (
            createOptions.texture?.color &&
            typeof createOptions.texture.color === "object" &&
            "opacity" in createOptions.texture.color
        ) {
            mesh.visibility = styleOpacity(createOptions.texture);
        }

        const { picture, ...look } = createOptions;
        mesh.alphaIndex =
            NODE_BODY_ALPHA_INDEX + lookPlace(mesh, JSON.stringify([options.is2D, picture?.name ?? null, look]));
        return mesh;
    }

    /**
     * Draw one node as a model: an instance of the template's first group, which is what the
     * node's position, picking, labels and visibility act on, with one instance of every other
     * group as its children. It is picked by the whole model's bounding box, never by its
     * triangles. Scaled so the model's largest extent is the extent a built-in shape of the same
     * `size` and `sizeMode` is drawn at; `modelFit: "stretch"` fills width, height and depth
     * separately.
     * @param template - The model's template.
     * @param shape - The node's shape block.
     * @param name - A name for the instances.
     * @returns The node's mesh.
     */
    static createModelInstance(template: ModelTemplate, shape: NodeStyleConfig["shape"], name: string): InstancedMesh {
        const [first, ...rest] = template.groups;
        const root = modelInstance(first, name);
        root.isPickable = true;
        root.instancedBuffers.color = new Color4(1, 1, 1, 1);
        // The box only: a pointer move tests no model triangle (design section 3.8).
        const intersects = root.intersects.bind(root);
        root.intersects = (ray, fastCheck, trianglePredicate, _onlyBoundingInfo, worldToUse, skipBoundingInfo) =>
            intersects(ray, fastCheck, trianglePredicate, true, worldToUse, skipBoundingInfo);
        for (const group of rest) {
            const part = modelInstance(group, `${name}-part`);
            part.parent = root;
            part.isPickable = false;
            part.instancedBuffers.color = new Color4(1, 1, 1, 1);
        }

        root.scaling.set(...this.modelScaling(shape));

        return root;
    }

    /**
     * The scale a model node is built at ({@link NodeMesh.createModelInstance}): its largest extent the extent a
     * built-in shape of the same `size` and `sizeMode` is drawn at, or under `modelFit: "stretch"` its width, height
     * and depth.
     * @param shape - The node's shape block.
     * @returns The scale on x, y and z.
     */
    private static modelScaling(shape: NodeStyleConfig["shape"]): [number, number, number] {
        const perSize = this.extentPerSize(shape);
        const size = Math.max(shape?.size ?? 1, MIN_NODE_SIZE);
        if (shape?.modelFit !== "stretch") {
            return [size * perSize, size * perSize, size * perSize];
        }

        const axis = (value: number | undefined): number => Math.max(value ?? size, MIN_NODE_SIZE) * perSize;
        return [axis(shape.width), axis(shape.height), axis(shape.depth)];
    }

    /**
     * A ring's cache key: its kind, the node's style and view, and for a model node its first group, so a node of
     * one style drawn as its shape while its model loads, then as the model, gets a ring round each rather than the
     * shape's round the model.
     * @param kind - The ring's kind ("node-border", "node-outer-border").
     * @param options - The node's mesh options.
     * @param fill - The node's own mesh.
     * @returns The key.
     */
    private static ringKey(kind: string, options: NodeMeshOptions, fill: AbstractMesh): string {
        const groups = this.modelGroups(fill);
        const model = groups === null ? "" : `-model-${String(groups[0].uniqueId)}`;
        return `${kind}-${options.styleId}-${options.is2D ? "2d" : "3d"}${model}`;
    }

    /**
     * A model node's groups: the source meshes of its own instance and of every part instanced under it, which
     * together draw the model (issue #10376: a ring round the first alone missed the model's other parts). Null
     * for any other node.
     * @param fill - The node's own mesh.
     * @returns The groups, or null.
     */
    private static modelGroups(fill: AbstractMesh): Mesh[] | null {
        const isGroup = (mesh: AbstractMesh): mesh is Mesh =>
            mesh instanceof Mesh &&
            (mesh.metadata as { graphtyModelGroup?: string } | null)?.graphtyModelGroup !== undefined;
        const sourceOf = (mesh: AbstractMesh): AbstractMesh => (mesh as { sourceMesh?: Mesh }).sourceMesh ?? mesh;
        const own = sourceOf(fill);
        if (!isGroup(own)) {
            return null;
        }

        return [
            own,
            ...fill
                .getChildMeshes(true)
                .map((child) => sourceOf(child))
                .filter((mesh): mesh is Mesh => isGroup(mesh)),
        ];
    }

    /**
     * Create a node mesh without using cache
     * @param options - Node mesh options including styleId and size
     * @param createOptions - Creation options for shape, texture, and effects
     * @param scene - Babylon.js scene
     * @returns Created node mesh
     */
    static createMeshWithoutCache(options: NodeMeshOptions, createOptions: NodeMeshCreateOptions, scene?: Scene): Mesh {
        if (!createOptions.shape?.type) {
            throw new TypeError("shape with type required to create mesh");
        }

        if (isFlatShape(createOptions.shape.type)) {
            const size = Math.max(createOptions.shape.size ?? options.size, MIN_NODE_SIZE);
            const extents = this.extentsOf(createOptions.shape, size);

            return this.createFlatShape(
                createOptions.shape,
                this.fillExtents(extents, this.borderFit(createOptions.shape, createOptions.border, extents).inset),
                scene,
            );
        }

        const creator = this.shapeCreators.get(createOptions.shape.type);
        if (!creator) {
            throw new TypeError(`unknown shape: ${createOptions.shape.type}`);
        }

        // Babylon's MeshBuilder reads a size of 0 as "not set" and draws a 1-unit mesh, so a node
        // of size 0 used to draw larger than a node of size 0.01. Flooring here keeps size 0 the
        // smallest visible node for every shape creator, built-in or registered (#117).
        const size = Math.max(createOptions.shape.size ?? options.size, MIN_NODE_SIZE);
        const sized = this.extentsOf(createOptions.shape, size);
        const { inset } = this.borderFit(createOptions.shape, createOptions.border, sized);
        const extents = this.fillExtents(sized, inset);
        const mesh = creator(size, scene, createOptions.shape.detail);
        if (!this.isFitted(createOptions.shape)) {
            // keeping its own proportions, the solid still draws its fill in by the inset of a border centered on or
            // inside its outline, so the ring ends where the plain solid would (#10403)
            NodeMesh.insetOutline(mesh, inset);
            return mesh;
        }

        fitNodeMesh(mesh, extents);
        if (createOptions.shape.sizeMode === "diameter" && !this.hasExplicitExtent(createOptions.shape)) {
            NodeMesh.scaleToExtent(mesh, extents.across);
        }

        return mesh;
    }

    /**
     * How big a node is drawn along each axis, in world units.
     * @param shape - The node's shape block.
     * @param size - Its size, already floored.
     * @returns The extents to fit its mesh to. A flat shape, or any shape with `planar` set, is
     *   thin along z in every view: a plaque, so its border is a ring on its faces rather than a
     *   wall around a slab.
     */
    static extentsOf(shape: NonNullable<NodeStyleConfig["shape"]>, size: number): NodeExtents {
        const perSize = this.extentPerSize(shape);
        const world = (value: number | undefined): number | undefined =>
            value === undefined ? undefined : Math.max(value, MIN_NODE_SIZE) * perSize;
        const across = size * perSize;
        const x = world(shape.width);
        const y = world(shape.height);
        const thin = shape.planar === true || isFlatShape(shape.type ?? "");
        const z = world(shape.depth) ?? (thin ? THIN_DEPTH_RATIO * Math.min(x ?? across, y ?? across) : undefined);

        return { across, x, y, z };
    }

    /**
     * How a border's position fits it to the node's size: how far the fill is drawn in from the
     * size on every side, and how wide the ring outside the fill is, both in world units. Outside
     * (the default), the fill is the size and the ring is the border's width. Centered, the fill
     * comes in by half the width, and the ring reaches half the width past the size (on a node narrower than the
     * width, the fill is a point and the ring is narrower than the width). Inside, by the whole width, so the ring's
     * outer edge is the size;
     * a node no larger than twice its border is all ring, drawn half as wide as the node. A border
     * of opacity 0 is not drawn; the fill reaches the middle of the ring it would be.
     * @param shape - The node's shape block.
     * @param border - The node's border block.
     * @param extents - The node's extents at its size.
     * @returns The inset and the ring's width.
     * @internal
     */
    static borderFit(
        shape: NodeStyleConfig["shape"],
        border: NodeStyleConfig["border"],
        extents: NodeExtents,
    ): { inset: number; ring: number } {
        const width = (border?.width ?? 0) * this.extentPerSize(shape);
        const position = border?.position ?? "outside";
        if (width <= 0 || position === "outside") {
            return { inset: 0, ring: width };
        }

        const half = Math.min(extents.x ?? extents.across, extents.y ?? extents.across) / 2;
        const ring = position === "inside" ? Math.min(width, half) : width;
        // A stroke paints over the fill out to its middle. Under a border that is seen, graphty stops the fill at the
        // ring; under one of opacity 0 nothing covers that inner half, so the fill reaches the ring's middle, as
        // Cytoscape desktop draws a transparent border inside the node's size.
        if ((border?.opacity ?? 1) <= 0) {
            return { inset: position === "inside" ? ring / 2 : 0, ring };
        }

        const inset = Math.min(position === "inside" ? ring : width / 2, half);
        // A centered stroke reaches half its width past the size, however small the node: on a node narrower than
        // the stroke the fill shrinks to a point and the ring is what is left out to that edge (Pajek's x_fact 0
        // vertex, a zero-size ellipse stroked 1 wide, is a dot 1 across)
        return { inset, ring: position === "center" ? width / 2 + inset : ring };
    }

    /**
     * A wave border's swing and period in world units (`border.waveAmplitude`, `border.wavePeriod`), or undefined
     * when it has no swing of its own and is drawn within its ring.
     * @param border - The node's border block.
     * @param perSize - World units per unit of border width.
     * @returns The wave, or undefined.
     * @internal
     */
    static waveOf(border: NodeStyleConfig["border"], perSize: number): WaveShape | undefined {
        const amplitude = border?.waveAmplitude;
        if (amplitude === undefined) {
            return undefined;
        }

        const period = border?.wavePeriod || 4 * amplitude;
        return period > 0 ? { amplitude: amplitude * perSize, period: period * perSize } : undefined;
    }

    /**
     * A node's extents with its fill drawn in by an inset on every side, never below the smallest
     * size a node is drawn at.
     * @param extents - The extents at the node's size.
     * @param inset - How far in, on each side.
     * @returns The fill's extents.
     */
    private static fillExtents(extents: NodeExtents, inset: number): NodeExtents {
        if (inset <= 0) {
            return extents;
        }

        const shrink = (value: number | undefined): number | undefined =>
            value === undefined ? undefined : Math.max(value - 2 * inset, MIN_NODE_SIZE);

        return {
            ...extents,
            across: Math.max(extents.across - 2 * inset, MIN_NODE_SIZE),
            x: shrink(extents.x),
            y: shrink(extents.y),
        };
    }

    /**
     * How many world units one unit of size, width, height, depth or border width is drawn at:
     * the common node extent under "scale" and "uniform", one unit under "diameter".
     * @param shape - The node's shape block, or none.
     * @returns World units per unit of size.
     * @internal
     */
    static extentPerSize(shape: NodeStyleConfig["shape"]): number {
        return shape?.sizeMode === "diameter" ? 1 : NODE_EXTENT_PER_SIZE;
    }

    /**
     * Whether a solid node's mesh is fitted to its extents. Under the default `sizeMode: "scale"`,
     * a node that names no width, height or depth and is not `planar` keeps its shape's own
     * proportions at `size` (a sphere and a box of size 1 are 1 across, the default icosphere 1.5),
     * as it always has; `sizeMode: "diameter"` and `"uniform"` draw every shape at one extent instead.
     * @param shape - The node's shape block, or none.
     * @returns True when the mesh is scaled to the node's extents.
     * @internal
     */
    static isFitted(shape: NodeStyleConfig["shape"]): boolean {
        if (shape === undefined) {
            return false;
        }

        return (
            shape.sizeMode === "diameter" ||
            shape.sizeMode === "uniform" ||
            shape.planar === true ||
            isFlatShape(shape.type ?? "") ||
            this.hasExplicitExtent(shape)
        );
    }

    /**
     * Whether the node names its own width, height or depth, which then decide its extents.
     * @param shape - The node's shape block.
     * @returns True when any of the three is set.
     */
    private static hasExplicitExtent(shape: NonNullable<NodeStyleConfig["shape"]>): boolean {
        return shape.width !== undefined || shape.height !== undefined || shape.depth !== undefined;
    }

    /**
     * Build a flat shape at its final width and height, so a rounded corner stays round however
     * long and thin the node is.
     * @param shape - The node's shape block; its type is a flat shape.
     * @param extents - The node's extents.
     * @param scene - The scene.
     * @returns The mesh.
     */
    private static createFlatShape(
        shape: NonNullable<NodeStyleConfig["shape"]>,
        extents: NodeExtents,
        scene?: Scene,
    ): Mesh {
        const type = shape.type ?? "";

        const build = type === "none" ? bodilessSlab : outlineSlab;
        const mesh = build(type, this.flatOutline(shape, extents), extents.z ?? extents.across, scene);
        // a rounded polygon's label is placed against its sharp twin's box, the node's own width and height, as
        // Cytoscape.js places it: its rounded apex is lower than the box's top (json-cyjs-synth-nodes round-triangle)
        // the twins named in shapeOutlines' ROUNDED are node shapes too
        const sharp = sharpTwinOf(type) as NonNullable<NodeStyleConfig["shape"]>["type"];
        if (shape.stretchPoints === false) {
            // corners drawn where they say need not reach the box (yEd's star6 is 0.866 of its width): its label is
            // placed against the node's own box, as yEd places it (gml-synthetic-coverage star6 labels)
            const [w, h] = [(extents.x ?? extents.across) / 2, (extents.y ?? extents.across) / 2];
            setLabelBox(mesh, [
                [-w, -h],
                [w, h],
            ]);
        } else if ((shape.rotation ?? 0) % 360 !== 0 || sharp !== undefined) {
            setLabelBox(
                mesh,
                this.unturnedFlatOutline(sharp === undefined ? shape : { ...shape, type: sharp }, extents),
            );
        }

        return mesh;
    }

    /**
     * Build a node's border and hand back an instance of it, or null when the node has none.
     *
     * The border is its own source mesh, cached beside the node's under the same style key, so
     * every node of one style shares one border mesh and only a node that HAS a border pays for
     * an instance. It is a ring OUTSIDE the node's outline, so it never covers the fill: the flat
     * shape's own outline, or for a solid the outline it shows a camera looking along z, turned to
     * face the camera in a 3D view.
     * @param cache - The mesh cache the node's own mesh came from.
     * @param options - The node's mesh options.
     * @param createOptions - The node's shape and border.
     * @param fill - The node's own mesh, whose outline a solid's border follows.
     * @param scene - The scene.
     * @returns The border instance, or null.
     */
    static createBorder(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        fill: AbstractMesh,
        scene?: Scene,
    ): InstancedMesh | null {
        const { border, shape } = createOptions;
        const opacity = border?.opacity ?? 1;

        // A node with no body (shape "none") has no outline to ring either.
        if (shape?.type === undefined || shape.type === "none") {
            return null;
        }

        const sized = this.extentsOf(shape, Math.max(shape.size ?? options.size, MIN_NODE_SIZE));
        const { inset, ring: width } = this.borderFit(shape, border, sized);
        if (width <= 0 || opacity <= 0) {
            return null;
        }

        const flat = isFlatShape(shape.type);
        const instance = cache.get(this.ringKey("node-border", options, fill), () => {
            const extents = this.fillExtents(sized, inset);
            const outline = flat ? this.flatOutline(shape, extents) : this.solidOutline(fill);
            const depth = flat ? (extents.z ?? extents.across) : THIN_DEPTH_RATIO * extents.across;
            const wave = NodeMesh.waveOf(border, this.extentPerSize(shape));
            const piecesOf = (round: Point2[]): RingPiece[] =>
                borderRing(round, width, border?.style ?? "solid", wave, options.dashUnit);
            const color = border?.color ?? "#000000";

            const ring = { outline, depth, piecesOf, flat, color, opacity };

            return this.borderSlab("node-border", ring, shape, options, fill, scene);
        });

        instance.sourceMesh.isPickable = false;
        instance.isPickable = false;

        // A solid's outline is the one it shows from the front, so in a 3D view the ring turns
        // with the camera to stay round the node; a flat shape's ring is part of its slab.
        if (!flat && !options.is2D) {
            instance.billboardMode = TransformNode.BILLBOARDMODE_ALL;
        }

        return instance;
    }

    /**
     * Build a node's outer border (`outerBorder`, Cytoscape.js's outline) and hand back an instance of
     * it, or null when the node has none: a ring of its own width outside the border's outer edge, its
     * offset beyond it, cached beside the border under the node's style key and built the same way.
     * @param cache - The mesh cache the node's own mesh came from.
     * @param options - The node's mesh options.
     * @param createOptions - The node's shape, border and outer border.
     * @param fill - The node's own mesh, whose outline a solid's ring follows.
     * @param scene - The scene.
     * @returns The outer border instance, or null.
     */
    static createOuterBorder(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: NodeMeshCreateOptions,
        fill: AbstractMesh,
        scene?: Scene,
    ): InstancedMesh | null {
        const { border, outerBorder, shape } = createOptions;
        const perSize = this.extentPerSize(shape);
        const width = (outerBorder?.width ?? 0) * perSize;
        const opacity = outerBorder?.opacity ?? 1;
        if (shape?.type === undefined || shape.type === "none" || width <= 0 || opacity <= 0) {
            return null;
        }

        const sized = this.extentsOf(shape, Math.max(shape.size ?? options.size, MIN_NODE_SIZE));
        const { inset, ring } = this.borderFit(shape, border, sized);
        // out past the border's outer edge, wherever the border is drawn (a border at opacity 0 still takes its room)
        const gap = ring + (outerBorder?.offset ?? 0) * perSize;
        const flat = isFlatShape(shape.type);
        const instance = cache.get(this.ringKey("node-outer-border", options, fill), () => {
            const extents = this.fillExtents(sized, inset);
            const outline = flat ? this.flatOutline(shape, extents) : this.solidOutline(fill);
            const depth = flat ? (extents.z ?? extents.across) : THIN_DEPTH_RATIO * extents.across;
            // each further ring (`count`, Graphviz's peripheries) starts the offset beyond the one before
            const step = width + Math.max(0, (outerBorder?.offset ?? 0) * perSize);
            const piecesOf = (round: Point2[]): RingPiece[] =>
                Array.from({ length: Math.floor(outerBorder?.count ?? 1) }, (_, i) => {
                    const at = gap + i * step;
                    // offset as the main ring's edges are, its sharp corners cut square, so it starts on the ring's outer edge
                    const base = at > 0 ? mitredEdges(round, [at])[0] : round;
                    return borderRing(base, width, outerBorder?.style ?? "solid", undefined, options.dashUnit);
                }).flat();
            const color = outerBorder?.color ?? "#000000";
            const ring = { outline, depth, piecesOf, flat, color, opacity };

            return this.borderSlab("node-outer-border", ring, shape, options, fill, scene);
        });

        instance.sourceMesh.isPickable = false;
        instance.isPickable = false;
        if (!flat && !options.is2D) {
            instance.billboardMode = TransformNode.BILLBOARDMODE_ALL;
        }

        return instance;
    }

    /**
     * Build a node's underlay or overlay (Cytoscape.js `underlay-*`, `overlay-*`) and hand back an
     * instance of it, or null when the node has none: a filled shape `padding` beyond the node's box
     * on every side, drawn just behind the node's back (underlay) or just before its front (overlay),
     * cached under the node's style key as its outer border is.
     * @param cache - The mesh cache the node's own mesh came from.
     * @param options - The node's mesh options.
     * @param createOptions - The node's shape, and its border, whose inset a solid's fill is drawn in by.
     * @param halo - The underlay or overlay.
     * @param kind - Which of the two.
     * @param fill - The node's own mesh, whose outline and depth it follows.
     * @param scene - The scene.
     * @returns The instance, or null.
     */
    static createHalo(
        cache: MeshCache,
        options: NodeMeshOptions,
        createOptions: Pick<NodeMeshCreateOptions, "shape" | "border">,
        halo: NodeStyleConfig["underlay"],
        kind: "underlay" | "overlay",
        fill: AbstractMesh,
        scene?: Scene,
    ): InstancedMesh | null {
        const { shape, border } = createOptions;
        const opacity = halo?.opacity ?? 0;
        if (shape?.type === undefined || opacity <= 0) {
            return null;
        }

        const perSize = this.extentPerSize(shape);
        const pad = (halo?.padding ?? 0) * perSize;
        const sized = this.extentsOf(shape, Math.max(shape.size ?? options.size, MIN_NODE_SIZE));
        const flat = isFlatShape(shape.type);
        // a solid's fill, fitted or at its own proportions, is drawn in by a centered or inside border
        // (createMeshWithoutCache); grow its outline back out to the box first
        const reach = flat ? pad : pad + this.borderFit(shape, border, sized).inset;
        const instance = cache.get(`node-${kind}-${options.styleId}-${options.is2D ? "2d" : "3d"}`, () => {
            const own = halo?.shape;
            const corner = halo?.cornerRadius === undefined ? undefined : halo.cornerRadius * perSize;
            let outline: Point2[];
            const ownOutline = own !== undefined && isFlatShape(own);
            // drawn as a ring from the middle out, so it fills the whole shape
            const piecesOf = (round: Point2[]): RingPiece[] => [
                { inner: round.map((): Point2 => [0, 0]), outer: round, closed: true },
            ];
            if (ownOutline) {
                outline = flatShapeOutline(
                    own,
                    (sized.x ?? sized.across) + 2 * pad,
                    (sized.y ?? sized.across) + 2 * pad,
                    corner,
                );
            } else {
                const nodeOutline = flat ? this.flatOutline(shape, sized) : this.solidOutline(fill);
                outline = offsetOutline(nodeOutline, reach);
            }
            fill.computeWorldMatrix(true);
            const box = fill.getBoundingInfo().boundingBox;
            const depth = THIN_DEPTH_RATIO * Math.max(sized.across, MIN_NODE_SIZE);
            const mesh = ringSlab(`node-${kind}`, piecesOf(outline), depth, scene);
            // just behind the node's back, or just before its front (2D looks along +z)
            const gap = depth * 0.01;
            const at = kind === "underlay" ? box.maximum.z + gap + depth / 2 : box.minimum.z - gap - depth / 2;
            const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
            if (positions !== null) {
                for (let z = 2; z < positions.length; z += 3) {
                    positions[z] += at;
                }
                mesh.setVerticesData(VertexBuffer.PositionKind, positions);
                mesh.refreshBoundingInfo();
            }
            if (!ownOutline && !flat && !options.is2D) {
                this.followView(mesh, fill, depth, (round) => piecesOf(offsetOutline(round, reach)), undefined, true);
            }
            mesh.material = this.createBorderMaterial(halo?.color ?? "#000000", opacity, scene);

            return mesh;
        });

        instance.sourceMesh.isPickable = false;
        instance.isPickable = false;
        if (!flat && !options.is2D) {
            instance.billboardMode = TransformNode.BILLBOARDMODE_ALL;
        }

        return instance;
    }

    /**
     * Build a node's shadow (`shadow`, yEd's drop shadow) and hand back its instances, none when the
     * node draws no shadow: the node's outline moved `offsetX` right and `offsetY` down, behind the
     * node's back. A soft edge (`blur` above 0) is `SHADOW_LAYERS` copies of the outline grown from
     * `blur` in to `blur` out, each a share of the opacity, so where they all overlap the shadow is
     * `opacity` and it fades evenly to nothing across the edge. Each layer is cached under the node's
     * style key, as its underlay is.
     * @param cache - The mesh cache the node's own mesh came from.
     * @param options - The node's mesh options.
     * @param shape - The node's shape block.
     * @param shadow - The shadow.
     * @param fill - The node's own mesh, whose outline and depth it follows.
     * @param scene - The scene.
     * @returns The layers' instances, outermost first; empty for no shadow.
     */
    static createShadow(
        cache: MeshCache,
        options: NodeMeshOptions,
        shape: NodeStyleConfig["shape"],
        shadow: NodeStyleConfig["shadow"],
        fill: AbstractMesh,
        scene?: Scene,
    ): InstancedMesh[] {
        const opacity = shadow?.opacity ?? 0;
        if (shape?.type === undefined || opacity <= 0) {
            return [];
        }

        const perSize = this.extentPerSize(shape);
        const blur = (shadow?.blur ?? 0) * perSize;
        const [dx, dy] = [(shadow?.offsetX ?? 0) * perSize, -(shadow?.offsetY ?? 0) * perSize];
        const sized = this.extentsOf(shape, Math.max(shape.size ?? options.size, MIN_NODE_SIZE));
        const flat = isFlatShape(shape.type);
        const count = blur > 0 ? SHADOW_LAYERS : 1;
        // a layer drawn alone at `share` and `count` of them over one another make `opacity`
        const share = 1 - (1 - opacity) ** (1 / count);
        // a layer grown inward never passes the node's middle
        const deepest = 0.45 * Math.min(sized.x ?? sized.across, sized.y ?? sized.across);
        const instances: InstancedMesh[] = [];
        for (let layer = 0; layer < count; layer++) {
            // outermost first; layers at the middles of `count` equal steps across the edge
            const pad = count === 1 ? 0 : Math.max(blur * (1 - (2 * layer + 1) / count), -deepest);
            const key = `node-shadow-${String(layer)}-${options.styleId}-${options.is2D ? "2d" : "3d"}`;
            const instance = cache.get(key, () => {
                const nodeOutline = flat ? this.flatOutline(shape, sized) : this.solidOutline(fill);
                const piecesOf = (round: Point2[]): RingPiece[] => {
                    const outline = offsetOutline(round, pad).map(([x, y]): Point2 => [x + dx, y + dy]);
                    return [{ inner: outline.map((): Point2 => [dx, dy]), outer: outline, closed: true }];
                };
                fill.computeWorldMatrix(true);
                const box = fill.getBoundingInfo().boundingBox;
                const depth = THIN_DEPTH_RATIO * Math.max(sized.across, MIN_NODE_SIZE);
                const mesh = ringSlab("node-shadow", piecesOf(nodeOutline), depth, scene);
                // behind the node's back and its underlay (2D looks along +z), the outermost layer furthest
                const gap = depth * 0.01;
                const at = box.maximum.z + (depth + gap) * (1 + count - layer) + depth / 2;
                const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
                if (positions !== null) {
                    for (let z = 2; z < positions.length; z += 3) {
                        positions[z] += at;
                    }
                    mesh.setVerticesData(VertexBuffer.PositionKind, positions);
                    mesh.refreshBoundingInfo();
                }
                if (!flat && !options.is2D) {
                    this.followView(mesh, fill, depth, piecesOf, undefined, true);
                }
                mesh.material = this.createBorderMaterial(shadow?.color ?? "#000000", share, scene);

                return mesh;
            });
            instance.sourceMesh.isPickable = false;
            instance.isPickable = false;
            if (!flat && !options.is2D) {
                instance.billboardMode = TransformNode.BILLBOARDMODE_ALL;
            }
            instances.push(instance);
        }

        return instances;
    }

    /**
     * The border of a group drawn over its members' box: a ring built at the box's own width and
     * height, so its line is the style's width however far the box is stretched. Not cached, since
     * every box has its own size; the caller gives it the cached border's material.
     * @param createOptions - The group's flat shape and border.
     * @param extents - The box's size, in the units the ring is drawn in.
     * @param extents.x - Its width.
     * @param extents.y - Its height.
     * @param extents.z - Its depth.
     * @param is2D - Whether the view is 2D.
     * @param scene - The scene.
     * @param dashUnit - The shortest one width of a patterned border is drawn, in scene units ({@link borderRing}).
     * @returns The ring, or null when the style draws no border.
     */
    static createGroupBorder(
        createOptions: NodeMeshCreateOptions,
        extents: { x: number; y: number; z: number },
        is2D: boolean,
        scene?: Scene,
        dashUnit?: number,
    ): Mesh | null {
        const { border, shape } = createOptions;
        const width = (border?.width ?? 0) * this.extentPerSize(shape);
        if (width <= 0 || shape?.type === undefined || !isFlatShape(shape.type)) {
            return null;
        }

        const outline = this.flatOutline(shape, { across: Math.max(extents.x, extents.y), ...extents });
        const mesh = ringSlab(
            "node-border",
            borderRing(outline, width, border?.style ?? "solid", undefined, dashUnit),
            extents.z,
            scene,
        );
        placeByZIndex(mesh, shape, is2D);
        mesh.isPickable = false;

        return mesh;
    }

    /**
     * The fill of a group drawn over its members' box, as a source mesh of its own: the shape built at the box's own
     * width and height, as its border is ({@link NodeMesh.createGroupBorder}), then shrunk by the stretch the group's
     * mesh is drawn under, so the stretched instance draws it at the box's size. Stretching the shared fill instead
     * stretched a rounded rectangle's corners into long ellipses (issue #8194). Drawn with the shared source's
     * material, opacity and draw settings; the caller disposes it (never its material).
     * @param from - The shared source the group's instance is drawn from now.
     * @param shape - The group's flat shape.
     * @param extents - The box's drawn size.
     * @param extents.x - Its width.
     * @param extents.y - Its height.
     * @param extents.z - Its depth.
     * @param stretch - The scaling the group's instance is drawn under.
     * @param stretch.x - Across its width.
     * @param stretch.y - Across its height.
     * @param stretch.z - Across its depth.
     * @param is2D - Whether the view is 2D.
     * @returns The source, or null for a shape that is not flat.
     */
    static createGroupFill(
        from: Mesh,
        shape: NodeStyleConfig["shape"],
        extents: { x: number; y: number; z: number },
        stretch: { x: number; y: number; z: number },
        is2D: boolean,
    ): Mesh | null {
        if (shape?.type === undefined || !isFlatShape(shape.type)) {
            return null;
        }

        const scene = from.getScene();
        const mesh = this.createFlatShape(shape, { across: Math.max(extents.x, extents.y), ...extents }, scene);
        mesh.bakeTransformIntoVertices(Matrix.Scaling(1 / stretch.x, 1 / stretch.y, 1 / stretch.z));
        // placed along z in the source's own units, as the shared source was, so it is drawn at the same depth
        placeByZIndex(mesh, shape, is2D);
        mesh.name = `${from.name}-group`;
        mesh.material = from.material;
        mesh.visibility = from.visibility;
        mesh.renderingGroupId = from.renderingGroupId;
        mesh.alphaIndex = from.alphaIndex;
        mesh.renderOutline = from.renderOutline;
        mesh.outlineWidth = from.outlineWidth;
        mesh.outlineColor = from.outlineColor;
        mesh.isPickable = from.isPickable;
        mesh.isVisible = false;
        for (const kind of Object.keys(from.instancedBuffers ?? {})) {
            mesh.registerInstancedBuffer(kind, from.getVertexBuffer(kind)?.getSize() ?? 4);
            mesh.instancedBuffers[kind] = from.instancedBuffers[kind] as unknown;
        }
        mesh.position.copyFrom(from.position);
        mesh.freezeWorldMatrix();

        return mesh;
    }

    /**
     * A hidden instance of a shared source, keeping it alive while nothing drawn instances it: the mesh cache
     * disposes a source with no instance left, and its material with it.
     * @param source - The shared source.
     * @returns The instance; dispose it to let the source go.
     */
    static keepSource(source: Mesh): InstancedMesh {
        const kept = source.createInstance(`${source.name}-kept`);
        kept.setEnabled(false);
        return kept;
    }

    /**
     * The outline a line ends on for a flat shape whose outline is neither its box nor the ellipse in it (a star, a
     * diamond, a cross, Pajek's man and woman): its fill's outline in units of its box's half size.
     * @param createOptions - The node's shape and border.
     * @param size - The node's size, when its shape gives none.
     * @param fill - The node's own mesh, whose outline a solid's face is.
     * @returns The outline, counter-clockwise, or null for a shape whose box or ellipse is its outline, or that is not
     *     flat.
     * @internal
     */
    static reachOutlineOf(createOptions: NodeMeshCreateOptions, size: number, fill: AbstractMesh): Point2[] | null {
        const { shape } = createOptions;
        const type = shape?.type;
        const outlined =
            type !== undefined &&
            isFlatShape(type) &&
            !BOX_OR_ELLIPSE.has(type) &&
            !(type === "polygon" && drawnAgainstBox(shape?.points));
        return outlined ? inUnitBox(this.faceOf(createOptions, size, fill).outline) : null;
    }

    /**
     * The outline of a node's fill as it is drawn, with the fill's width and height: what is drawn
     * over the node's face (`pie`, `stripes`, `image`) is cut to it and sized by it.
     * @param createOptions - The node's shape and border.
     * @param size - The node's size, when its shape gives none.
     * @param fill - The node's own mesh, whose outline a solid's face is.
     * @returns The outline, counter-clockwise, and the fill's width and height, in world units.
     * @internal
     */
    static faceOf(
        createOptions: NodeMeshCreateOptions,
        size: number,
        fill: AbstractMesh,
    ): { outline: Point2[]; width: number; height: number } {
        const shape = createOptions.shape ?? {};
        const sized = this.extentsOf(shape, Math.max(shape.size ?? size, MIN_NODE_SIZE));
        const extents = this.fillExtents(sized, this.borderFit(shape, createOptions.border, sized).inset);
        const width = extents.x ?? extents.across;
        const height = extents.y ?? extents.across;
        // a node with no body has its box for a face
        const flat = shape.type !== undefined && isFlatShape(shape.type);
        let outline = flat ? this.flatOutline(shape, extents) : this.solidOutline(fill);
        if (shape.type === "none") {
            outline = flatShapeOutline("rectangle", width, height);
        }

        return { outline, width, height };
    }

    private static flatOutline(shape: NonNullable<NodeStyleConfig["shape"]>, extents: NodeExtents): Point2[] {
        // turned clockwise (y up) last, once drawn at its width and height (`shape.rotation`)
        const turn = ((shape.rotation ?? 0) * Math.PI) / 180;
        const outline = this.unturnedFlatOutline(shape, extents);
        if (turn === 0) {
            return outline;
        }

        const [c, s] = [Math.cos(turn), Math.sin(turn)];

        return outline.map(([x, y]): Point2 => [x * c + y * s, y * c - x * s]);
    }

    private static unturnedFlatOutline(shape: NonNullable<NodeStyleConfig["shape"]>, extents: NodeExtents): Point2[] {
        // drawn in units of size, where a polygon's lengths (`-1+24`) and the corner radius are, then in world units
        const perSize = this.extentPerSize(shape);
        const outline = flatShapeOutline(
            shape.type ?? "",
            (extents.x ?? extents.across) / perSize,
            (extents.y ?? extents.across) / perSize,
            shape.cornerRadius,
            shape.points,
            shape.stretchPoints !== false,
            { exact: shape.exactCornerRadius === true, fraction: shape.cornerFraction },
        ).map(([x, y]): Point2 => [x * perSize, y * perSize]);
        if (shape.sizeMode !== "diameter" || this.hasExplicitExtent(shape) || outline.length === 0) {
            return outline;
        }

        // "diameter" promises the drawn shape is `size` at its widest, the same for every shape. A
        // rounded polygon is drawn inside its sharp twin's box, as Cytoscape.js draws it, so it is
        // grown back out to the extent here, the one place its fill and its border both read.
        const xs = outline.map(([x]) => x);
        const ys = outline.map(([, y]) => y);
        const drawn = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
        const grow = drawn > 0 ? extents.across / drawn : 1;

        return grow === 1 ? outline : outline.map(([x, y]): Point2 => [x * grow, y * grow]);
    }

    /**
     * A border or outer border ring's source mesh: built round its outline, placed by the node's z-index, in its
     * color, and for a solid in a 3D view kept on the outline the camera sees.
     * @param name - The mesh's name.
     * @param ring - The ring.
     * @param ring.outline - The node's outline the ring is built round first.
     * @param ring.depth - How deep the ring is along z.
     * @param ring.piecesOf - The ring's pieces round an outline.
     * @param ring.flat - Whether the node's shape is flat.
     * @param ring.color - The ring's color.
     * @param ring.opacity - The ring's opacity, 0..1.
     * @param shape - The node's shape block.
     * @param options - The node's mesh options.
     * @param fill - The node's own mesh.
     * @param scene - The scene.
     * @returns The mesh.
     */
    private static borderSlab(
        name: string,
        ring: {
            outline: Point2[];
            depth: number;
            piecesOf: (outline: Point2[]) => RingPiece[];
            flat: boolean;
            color: string;
            opacity: number;
        },
        shape: NodeStyleConfig["shape"],
        options: NodeMeshOptions,
        fill: AbstractMesh,
        scene?: Scene,
    ): Mesh {
        // A model is drawn scaled from its own unit box (createModelInstance), and its ring with it, so the ring is
        // built round the outline at the model's drawn size, in world units like its width, then scaled back.
        const unit = this.modelGroups(fill) === null ? undefined : this.modelScaling(shape);
        const outline =
            unit === undefined ? ring.outline : ring.outline.map(([x, y]): Point2 => [x * unit[0], y * unit[1]]);
        const mesh = ringSlab(name, ring.piecesOf(outline), ring.depth, scene);
        if (unit !== undefined) {
            mesh.bakeTransformIntoVertices(Matrix.Scaling(1 / unit[0], 1 / unit[1], 1 / unit[2]));
        }
        placeByZIndex(mesh, shape, options.is2D);
        if (!ring.flat && !options.is2D) {
            this.followView(mesh, fill, ring.depth, ring.piecesOf, unit);
        }
        mesh.material = this.createBorderMaterial(ring.color, ring.opacity, scene);

        return mesh;
    }

    private static solidOutline(
        fill: AbstractMesh,
        view?: Matrix,
        at?: Vector3,
        groups = this.modelGroups(fill),
    ): Point2[] {
        if (groups !== null) {
            // a model is seldom convex (a person's arms and legs): its outline is its triangles' own, every part's
            const points: Point2[] = [];
            const triangles: number[] = [];
            for (const group of groups) {
                const base = points.length;
                points.push(...projectedVertices(group, view, at));
                const indices = group.getIndices() ?? [];
                for (const index of indices) {
                    triangles.push(base + index);
                }
            }

            return silhouetteOutline(points, triangles);
        }

        const source = fill instanceof Mesh ? fill : (fill as InstancedMesh).sourceMesh;

        return convexHull(projectedVertices(source, view, at));
    }

    /**
     * Keep a solid's ring (its border, outer border, underlay, overlay or shadow) on the outline the solid shows the
     * camera. The ring turns to face the camera in a 3D view, but a solid's outline changes shape as the camera goes
     * round it (an icosahedron's is a decagon from one side and a hexagon from another), and with perspective the
     * near half of it is drawn larger than the far half, so a ring built once from the outline seen along z was drawn
     * turned against the solid (issue #9272). The ring is rebuilt, at the depth it was placed at, whenever the
     * outline the camera sees changes.
     *
     * ponytail: one ring per style, drawn round the outline the nearest node drawing it shows; a node of the style
     * much further away or across the view shows a slightly different one. A ring per node if that shows.
     * @param mesh - The ring's source mesh, which every node of the style instances.
     * @param fill - The node's mesh, whose source's vertices the outline is the hull of.
     * @param depth - How deep the ring is along z.
     * @param piecesOf - The ring's pieces round an outline of the solid.
     * @param unit - A model's scale (see borderSlab): the ring is built at it and scaled back.
     * @param plate - A plate filled from its middle (an underlay, overlay or shadow), whose outer edge shows at its face
     * toward the camera, so that face is put on the outline; a ring's inner edge shows at its face away from it.
     */
    private static followView(
        mesh: Mesh,
        fill: AbstractMesh,
        depth: number,
        piecesOf: (outline: Point2[]) => RingPiece[],
        unit?: readonly [number, number, number],
        plate = false,
    ): void {
        const scene = mesh.getScene();
        const source = fill instanceof Mesh ? fill : (fill as InstancedMesh).sourceMesh;
        // a model's parts, found once: the node they were found under may go while others still draw the ring
        const groups = this.modelGroups(fill);
        const [toView, turn, unturn, alongLine] = [new Matrix(), new Matrix(), new Matrix(), new Matrix()];
        const [scale, at] = [new Vector3(), new Vector3()];
        const [quaternion, facing] = [new Quaternion(), new Quaternion()];
        let seen = "";
        let drawn: Point2[] = [];
        let drawnBack = 1;
        const observer = scene.onBeforeRenderObservable.add(() => {
            const camera = scene.activeCamera;
            if (camera === null || source.isDisposed()) {
                return;
            }

            const view = camera.getViewMatrix();
            const ahead = scene.useRightHandedSystem ? -1 : 1;
            const nearest = nearestDrawing(mesh, view, ahead, at);
            if (nearest === null) {
                return;
            }

            const world = nearest.getWorldMatrix();
            const box = mesh.getBoundingInfo().boundingBox;
            const perspective = camera.mode === Camera.PERSPECTIVE_CAMERA;
            const backZ = ahead > 0 ? box.maximum.z : box.minimum.z;
            const frontZ = ahead > 0 ? box.minimum.z : box.maximum.z;
            if (perspective) {
                const { radius } = source.getBoundingInfo().boundingSphere;
                faceEachNode(mesh, view, ahead, { radius, back: backZ * ahead }, at, nearest.absoluteScaling.x, facing);
            }
            const key = `${String(view.updateFlag)}|${String(nearest.uniqueId)}|${String(world.updateFlag)}`;
            if (key === seen) {
                return;
            }

            seen = key;
            world.decompose(scale, quaternion);
            Matrix.FromQuaternionToRef(quaternion, turn);
            turn.multiplyToRef(view, toView);
            toView.setTranslationFromFloats(0, 0, 0);
            let outline: Point2[];
            let back = 1;
            if (perspective) {
                // seen along the line to the nearest node's middle, the way its instance was turned to face
                Matrix.FromQuaternionToRef(Quaternion.Inverse(facing), unturn);
                toView.multiplyToRef(unturn, alongLine);
                at.set(0, 0, (ahead * at.length()) / scale.x);
                // looking into the ring, its inner wall is seen down to the face away from the camera, drawn smaller
                // than the node's middle by as much: that face's inner edge is put on the solid's outline (a plate's
                // outer edge shows at its face toward the camera, which is put there instead). The whole ring is drawn
                // smaller with it, its width, padding and offset too, so they read true in the node's middle, where the
                // outline was seen (issue #10505: a plate's padding read off by the ratio of the depths)
                back = (at.z + (plate ? frontZ : backZ)) / at.z;
                outline = this.solidOutline(fill, alongLine, at, groups);
            } else {
                outline = this.solidOutline(fill, toView, undefined, groups);
            }
            const same =
                back === drawnBack &&
                outline.length === drawn.length &&
                outline.every(([x, y], i) => Math.abs(x - drawn[i][0]) < 1e-6 && Math.abs(y - drawn[i][1]) < 1e-6);
            if (same) {
                return;
            }

            drawn = outline;
            drawnBack = back;
            // kept at the depth it was placed at (behind the node, by z-index)
            const [ux, uy, uz] = unit ?? [1, 1, 1];
            const shift = box.minimum.z + depth / uz / 2;
            const data = ringVertexData(piecesOf(outline.map(([x, y]): Point2 => [x * ux, y * uy])), depth);
            const positions = data.positions ?? [];
            for (let i = 0; i + 2 < positions.length; i += 3) {
                positions[i] *= back / ux;
                positions[i + 1] *= back / uy;
                positions[i + 2] = positions[i + 2] / uz + shift;
            }
            data.applyToMesh(mesh, true);
            mesh.refreshBoundingInfo();
            // A new submesh: a frozen list of what is drawn holds the old one, whose counts overrun these buffers.
            (scene.metadata as GraphSceneMetadata | null)?.thawActiveMeshes?.();
        });
        mesh.onDisposeObservable.addOnce(() => {
            scene.onBeforeRenderObservable.remove(observer);
        });
    }

    /**
     * The border's material: its color, unlit, so a border reads as the color a file gave it in
     * 2D and 3D alike, the way an edge's line does.
     * @param color - The border color.
     * @param opacity - The border's opacity, 0..1.
     * @param scene - The scene.
     * @returns The frozen material.
     */
    private static createBorderMaterial(color: string, opacity: number, scene?: Scene): StandardMaterial {
        const mat = new StandardMaterial("node-border", scene);
        mat.disableLighting = true;
        mat.emissiveColor = Color3.FromHexString(color);
        mat.alpha = opacity;
        mat.freeze();

        return mat;
    }

    /**
     * Shrinks a mesh drawn at its own proportions so its outline across the view comes in by `inset` on every
     * side: the fill of a solid whose border sits centered on or inside its size.
     * @param mesh - The mesh a shape creator returned.
     * @param inset - How far in, on each side, in world units.
     */
    private static insetOutline(mesh: Mesh, inset: number): void {
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        const across = Math.max(max.x - min.x, max.y - min.y);
        if (inset > 0 && across > 0) {
            mesh.scaling.scaleInPlace(Math.max(across - 2 * inset, MIN_NODE_SIZE) / across);
            mesh.bakeCurrentTransformIntoVertices();
        }
    }

    /**
     * Rescales a fitted mesh so its largest width, height or depth is `extent`: what
     * `sizeMode: "diameter"` means. `fitNodeMesh` sets the extent across the view; a shape that is
     * deepest front to back (the dodecahedron, the icosahedron) is then scaled down so its depth
     * is `extent` too. Every other shape is already `extent` at its widest and is left as it was.
     * @param mesh - The mesh a shape creator returned
     * @param extent - The largest width, height or depth it should be drawn at, in scene units
     */
    private static scaleToExtent(mesh: Mesh, extent: number): void {
        mesh.computeWorldMatrix(true);
        const { minimumWorld: min, maximumWorld: max } = mesh.getBoundingInfo().boundingBox;
        const drawn = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
        if (drawn > 0) {
            mesh.scaling.scaleInPlace(extent / drawn);
            mesh.bakeCurrentTransformIntoVertices();
        }
    }

    /**
     * Builds the StandardMaterial for a node mesh.
     *
     * THE DEFECT THIS FIXES: `extractColor` answers only two of the three color forms the zod
     * schema accepts -- a bare hex string and `{colorType: "solid"}`. For `"gradient"` and
     * `"radial-gradient"` it returns undefined, and this function used to read
     * `if (color3) { ... }` with NO else branch. The consequence was not a wrong gradient: the
     * StandardMaterial kept its stock color, so a gradient node rendered flat white/gray with no
     * color applied at all. That is the product owner's report, "gradient color strips don't
     * currently work", and it was made more galling by the fact that the schema accepted the
     * value (see config/common.ts `AdvancedColorStyle`), so `Styles.getNodeIdForStyle` interned a
     * fresh style id and `NodeMesh.create` allocated a whole cached mesh for it. The user paid the
     * full interning cost and got no pixels back. Every color form the schema accepts must now
     * produce a visible color, or the schema and the renderer have drifted again.
     *
     * HOW A GRADIENT IS PAINTED: a canvas-drawn ramp in a `DynamicTexture`, assigned to
     * `diffuseTexture` in 3D and to `emissiveTexture` in 2D (2D sets `disableLighting`, so only
     * the emissive channel is visible there -- the same reason the solid path assigns
     * `emissiveColor` rather than `diffuseColor` when `is2D`).
     *
     * THE TEXTURE IS ASSIGNED BEFORE THE FREEZE (`checkReadyOnlyOnce`). A frozen material ignores later mutation, so
     * assigning a texture after the freeze is a silent no-op. Do not move the freeze up.
     *
     * KNOWN VISUAL DIFFERENCE, deliberately not papered over: the solid 3D path adds
     * `emissiveColor = color * 0.2` as a minimum-brightness floor for shadowed surfaces. The
     * gradient path cannot reuse that trick, because `emissiveTexture` and `diffuseTexture` would
     * be the same shared texture object and `Texture.level` is a property of the texture rather
     * than of the material -- dimming one would dim the other for every material sharing it. A
     * gradient node therefore reads darker on its unlit side than a solid node of the same hue.
     * That is a real difference in appearance, it needs a screenshot review rather than a unit
     * test, and the alternative (a second, pre-dimmed texture per gradient) doubles the GPU memory
     * discussed on `getGradientTexture`.
     * @param createOptions - Creation options carrying the texture color and effects
     * @param is2D - Whether the scene is rendering in 2D mode
     * @param scene - Babylon.js scene, required to allocate a gradient texture
     * @returns The material to attach to the cached node mesh
     */
    private static createMaterial(
        createOptions: NodeMeshCreateOptions,
        is2D: boolean,
        scene?: Scene,
    ): StandardMaterial {
        const mat = new StandardMaterial("defaultMaterial", scene);
        // A material no mesh draws yet: its setters and its freeze mark nothing dirty, so they do
        // not walk every mesh in the scene looking for its users (issue #2894).
        setUpQuietly(mat, () => {
            NodeMesh.setUpMaterial(mat, createOptions, is2D, scene);
        });
        return mat;
    }

    /**
     * Write a new node material's properties; see {@link NodeMesh.createMaterial}.
     * @param mat - The material, which no mesh draws yet.
     * @param createOptions - Creation options carrying the texture color and effects
     * @param is2D - Whether the scene is rendering in 2D mode
     * @param scene - Babylon.js scene, required to allocate a gradient texture
     */
    private static setUpMaterial(
        mat: StandardMaterial,
        createOptions: NodeMeshCreateOptions,
        is2D: boolean,
        scene?: Scene,
    ): void {
        const styleColor = createOptions.texture?.color;
        let color3 = this.extractColor(styleColor);
        const { picture } = createOptions;
        const hasPicture = picture !== undefined && picture !== null;
        const gradient = color3 || hasPicture ? undefined : this.extractGradient(styleColor);
        const gradientTexture = gradient ? this.getGradientTexture(gradient, mat, scene) : undefined;

        if (gradient && !gradientTexture) {
            // The ramp could not be allocated -- no scene, no 2D canvas in this environment, or
            // the per-scene texture budget is spent. Fall back to the first stop so the node still
            // carries a color. This mirrors what Node.ts already does for rich-text label
            // backgrounds, and it is strictly better than the old behavior of drawing nothing:
            // a flat approximation of a gradient is legible, an unstyled default is not.
            const [firstStop] = gradient.colors;
            if (firstStop) {
                // its color, without an alpha Color3 cannot hold
                color3 = Color3.FromHexString(firstStop.length === 9 ? firstStop.slice(0, 7) : firstStop);
            }
        }

        // `node.unlit` draws a 3D node the way 2D draws every node: its own color, no light.
        const unlit = is2D || createOptions.effect?.unlit === true;

        if (hasPicture) {
            this.setUpPictureMaterial(mat, createOptions, picture, is2D, unlit);
        } else {
            this.setUpColorMaterial(mat, gradientTexture, color3, unlit, scene);
        }

        mat.wireframe = createOptions.effect?.wireframe ?? false;

        // What `freeze()` does, less its `markDirty`, which walks every mesh in the scene for the
        // submeshes drawn with this material -- of which a new material has none.
        mat.checkReadyOnlyOnce = true;
    }

    /**
     * Write a node material that draws a picture; see {@link NodeMesh.setUpMaterial}.
     * @param mat - The material, which no mesh draws yet.
     * @param createOptions - Creation options carrying the shape
     * @param picture - The picture the node draws
     * @param is2D - Whether the scene is rendering in 2D mode
     * @param unlit - Whether the node draws its own color with no light
     */
    private static setUpPictureMaterial(
        mat: StandardMaterial,
        createOptions: NodeMeshCreateOptions,
        picture: BaseTexture,
        is2D: boolean,
        unlit: boolean,
    ): void {
        // `node.texture` is the surface: white underneath, so the picture keeps its colors, and
        // its transparent pixels are stored white (TextureCache). A flat node is the picture
        // itself, an icon: its transparent pixels are cut out (alpha test, so instanced nodes
        // need no sorting). A solid keeps its surface whole, white where the picture is clear,
        // so a box never turns into six loose cut-outs.
        mat.diffuseTexture = picture;
        mat.diffuseColor = Color3.White();
        const { shape } = createOptions;
        if (is2D || shape?.planar === true || isFlatShape(shape?.type ?? "")) {
            mat.opacityTexture = picture;
            mat.transparencyMode = Material.MATERIAL_ALPHATEST;
        }
        if (unlit) {
            mat.disableLighting = true;
            mat.emissiveTexture = picture;
        } else {
            mat.emissiveColor = new Color3(0.2, 0.2, 0.2);
        }
    }

    /**
     * Write a node material's gradient or flat color; see {@link NodeMesh.setUpMaterial}.
     * @param mat - The material, which no mesh draws yet.
     * @param gradientTexture - The gradient ramp, when the style has one that could be allocated
     * @param color3 - The flat color, when the style has one
     * @param unlit - Whether the node draws its own color with no light
     * @param scene - Babylon.js scene, whose lighting a lit node material follows
     */
    private static setUpColorMaterial(
        mat: StandardMaterial,
        gradientTexture: DynamicTexture | undefined,
        color3: Color3 | undefined,
        unlit: boolean,
        scene: Scene | undefined,
    ): void {
        if (gradientTexture) {
            if (gradientTexture.hasAlpha) {
                // blended, not alpha-tested: a diffuse texture with an alpha is otherwise cut where it fades
                mat.opacityTexture = gradientTexture;
                mat.transparencyMode = Material.MATERIAL_ALPHABLEND;
            }
            if (unlit) {
                // EMISSIVE ONLY. With lighting off the shader draws the emissive term times the
                // diffuse texture, so the ramp in both drew it squared: a #E8EEF7 to #B7C9E3 fill
                // came out #CAD8EC to #8BA6CF, darker than either end.
                mat.disableLighting = true;
                mat.emissiveTexture = gradientTexture;
            } else {
                mat.diffuseTexture = gradientTexture;
                lightNodeMaterial(mat, sceneLighting(scene));
            }
        } else if (color3) {
            if (unlit) {
                mat.disableLighting = true;
                mat.emissiveColor = color3;
            } else {
                mat.diffuseColor = color3;
                // The emissive floor (minimum brightness on shadowed surfaces), the studio rim, or
                // flat: whatever the scene's lighting asks of a node material.
                lightNodeMaterial(mat, sceneLighting(scene));

                // THE COLOUR ABOVE IS USUALLY NEUTRAL WHITE, because nodes that differ only in
                // color share this material and carry their own color in a per-instance buffer
                // instead. Babylon multiplies that buffer in after it clamps the light term, which
                // flattens every surface lit past four fifths into one patch of unshaded color --
                // so the plugin moves the multiply inside the clamp and the node looks round
                // again. On a material whose instances carry no color it changes nothing.
                //
                // BEFORE freeze(): a frozen material stops re-evaluating its shader defines, and a
                // plugin is a define.
                shadeInstanceColors(mat);
            }
        }
    }

    private static extractColor(color: unknown): Color3 | undefined {
        if (typeof color === "string") {
            return Color3.FromHexString(color === "##FFFFFF" ? "#FFFFFF" : color);
        }

        if (typeof color === "object" && color !== null) {
            const colorObj = color as ColorObject;
            if (colorObj.colorType === "solid" && colorObj.value) {
                return Color3.FromHexString(colorObj.value);
            }
        }

        return undefined;
    }

    /**
     * Normalizes the two gradient members of `AdvancedColorStyle` into one shape.
     *
     * Kept separate from `extractColor` on purpose: `extractColor` answers "is there a single flat
     * color here", and several callers rely on it returning undefined for a gradient. Widening it
     * to also mean "or a gradient" would change what undefined means at every call site.
     *
     * A gradient with a single stop is still returned. It cannot be PAINTED -- the stop offsets are
     * `i / (colors.length - 1)`, which is a division by zero for one stop, and a one-stop ramp is a
     * flat color anyway -- so `getGradientTexture` refuses it and `createMaterial` falls back to
     * that one stop. Returning undefined here instead would send the node back to the unstyled
     * default, which is the exact defect this whole change removes.
     * @param color - The `texture.color` value taken straight off the parsed style
     * @returns The normalized gradient, or undefined if this is not a paintable gradient
     */
    private static extractGradient(color: unknown): GradientColor | undefined {
        if (typeof color !== "object" || color === null) {
            return undefined;
        }

        const colorObj = color as ColorObject;
        const isRadial = colorObj.colorType === "radial-gradient";
        if (colorObj.colorType !== "gradient" && !isRadial) {
            return undefined;
        }

        const colors = colorObj.colors?.filter((c): c is string => typeof c === "string") ?? [];
        if (colors.length === 0) {
            return undefined;
        }

        const stops = colorObj.stops?.length === colors.length ? colorObj.stops : undefined;

        return {
            radial: isRadial,
            colors,
            stops,
            // The radial form has no direction in the schema. Pin it to 0 so two radial gradients
            // that are equal in every meaningful way share one cache entry.
            direction: isRadial ? 0 : (colorObj.direction ?? 0),
            // likewise a linear gradient has no circle
            // (a canvas paints nothing for a circle of radius 0, so 0 is drawn as a point: all the last color)
            circle: isRadial
                ? { x: colorObj.centerX ?? 0.5, y: colorObj.centerY ?? 0.5, r: Math.max(colorObj.radius ?? 1, 1e-6) }
                : { x: 0.5, y: 0.5, r: 1 },
        };
    }

    /**
     * Returns the ramp texture for a gradient, interning it so equal gradients share one texture.
     *
     * WHY INTERNING IS NOT OPTIONAL HERE -- the GPU-memory hazard this guards, spelled out because
     * it is easy to reintroduce: `Styles.styleToId` interns a style by DEEP VALUE EQUALITY, so it
     * mints one style id per distinct style VALUE, not one per node. For a gradient written into a
     * style layer by hand that is fine: every node matching the layer shares one style id, one
     * cached mesh, one material and therefore one texture. But a `calculatedStyle` expression
     * computes a style value per node (Node.update merges `styleUpdates` and re-interns), so an
     * expression that derives a gradient from node data yields a DISTINCT style value -- and
     * therefore a distinct style id, mesh and material -- for every node it touches. Keying the
     * texture off the style id would then allocate one texture per node, and at
     * GRADIENT_TEXTURE_SIZE squared RGBA that is roughly 64 KB each: a thousand-node graph would
     * burn 64 MB of GPU memory on ramps nobody can tell apart.
     *
     * The fix is two-layered, and both layers matter:
     *   1. The cache key is the gradient VALUE (form, direction, stops), not the style id. Two
     *      style ids that differ only in shape or size share one texture, and a per-node
     *      calculated gradient that happens to repeat a value shares one too.
     *   2. A hard ceiling of MAX_GRADIENT_TEXTURES_PER_SCENE. Beyond it this returns undefined and
     *      `createMaterial` falls back to the first stop as a flat color. A graph with more than
     *      that many genuinely distinct gradients is a calculated gradient in disguise, and a flat
     *      approximation is a far better outcome than exhausting GPU memory. The ceiling is the
     *      reason this code does not need to know whether a gradient came from a calculated value:
     *      provenance is invisible here, but unbounded allocation is not.
     *
     * The cache is a WeakMap keyed by scene, so the entries die with the scene and never leak
     * across scenes or across tests. Each entry counts the materials drawing it: `MeshCache`
     * disposes a source mesh's material (never its textures), and the last material's disposal
     * disposes the texture and frees its slot, so the ceiling counts gradients in use rather than
     * every gradient the scene has ever seen (issue #7122).
     * @param gradient - The normalized gradient to paint
     * @param mat - The material that will draw the texture, holding it until disposed
     * @param scene - Babylon.js scene that will own the texture
     * @returns The shared texture, or undefined if one cannot or should not be allocated
     */
    private static getGradientTexture(
        gradient: GradientColor,
        mat: StandardMaterial,
        scene?: Scene,
    ): DynamicTexture | undefined {
        // One stop is no ramp: the caller paints it flat, which needs no texture.
        if (!scene || gradient.colors.length < 2) {
            return undefined;
        }

        const key = `${gradient.radial ? "radial" : "linear"}|${gradient.direction}|${gradient.colors.join(",")}|${gradient.stops?.join(",") ?? ""}|${gradient.circle.x},${gradient.circle.y},${gradient.circle.r}`;

        let sceneCache = gradientTextureCache.get(scene);
        if (!sceneCache) {
            sceneCache = new Map();
            gradientTextureCache.set(scene, sceneCache);
        }

        let entry = sceneCache.get(key);
        if (!entry) {
            if (sceneCache.size >= MAX_GRADIENT_TEXTURES_PER_SCENE) {
                return undefined;
            }
            const texture = this.createGradientTexture(gradient, scene, key);
            if (!texture) {
                return undefined;
            }
            entry = { texture, users: 0 };
            sceneCache.set(key, entry);
        }

        const held = entry;
        const cache = sceneCache;
        held.users++;
        mat.onDisposeObservable.addOnce(() => {
            held.users--;
            if (held.users === 0 && cache.get(key) === held) {
                cache.delete(key);
                held.texture.dispose();
            }
        });
        return held.texture;
    }

    /**
     * Paints a gradient ramp into a DynamicTexture.
     *
     * WHY THE CANVAS IS SQUARE RATHER THAN A 256x1 STRIP: a one-pixel-tall strip cannot represent
     * a gradient whose direction has any vertical component. At direction 90 the endpoint maths
     * below reduces to y1 = 0, y2 = 1, so the entire ramp is squeezed into a single row of pixels
     * and the node renders as one flat color -- exactly the defect this whole change exists to
     * remove, reintroduced for half the directions. A square canvas costs more memory per texture,
     * which is why the count is capped in `getGradientTexture` rather than the size shaved here.
     *
     * The linear endpoint maths is deliberately identical to the rich-text label background
     * painter (see RichTextLabel's `_fillBackground`), so a gradient reads the same on a node as it
     * does behind a label. Keep them in step.
     *
     * Everything is wrapped in a try/catch because `DynamicTexture` allocates a 2D canvas through
     * the engine, and there is no canvas in a plain Node.js test process (Babylon falls back to
     * `OffscreenCanvas`, which Node does not define). Throwing there would take down node creation
     * for a style that the schema says is valid; returning undefined lets `createMaterial` paint
     * the first stop instead.
     * @param gradient - The normalized gradient to paint
     * @param scene - Babylon.js scene that will own the texture
     * @param key - The interning key, reused as the texture name so it is identifiable in the
     * Babylon inspector
     * @returns The painted texture, or undefined if no 2D canvas is available
     */
    private static createGradientTexture(
        gradient: GradientColor,
        scene: Scene,
        key: string,
    ): DynamicTexture | undefined {
        const size = GRADIENT_TEXTURE_SIZE;
        let texture: DynamicTexture | undefined;

        try {
            texture = new DynamicTexture(`node-gradient-${key}`, { width: size, height: size }, scene, false);
            const ctx = texture.getContext();

            const { x, y, r } = gradient.circle;
            const ramp = gradient.radial
                ? ctx.createRadialGradient(x * size, y * size, 0, x * size, y * size, (r * size) / 2)
                : this.createLinearRamp(ctx, gradient.direction, size);

            const { colors, stops } = gradient;
            addGradientStops(ramp, colors, stops);

            ctx.fillStyle = ramp;
            ctx.fillRect(0, 0, size, size);
            // A stop with an alpha (`#rgba`, `#rrggbbaa`) is see-through, so the material reads the
            // texture's alpha too (setUpColorMaterial); an opaque ramp keeps its node opaque.
            texture.hasAlpha = colors.some((c) => SEE_THROUGH.test(c));
            // Default invertY, matching RichTextLabel's texture updates, so a canvas painted with
            // a top-left origin ends up upright on the mesh and "direction 90" means the same
            // thing on a node as it does behind a label.
            texture.update();

            return texture;
        } catch {
            // No usable 2D canvas here. Dispose the half-built texture rather than leaving it
            // registered on the scene -- an undrawable texture that is never released would be a
            // slow leak on every repaint. The caller falls back to the first stop.
            texture?.dispose();
            return undefined;
        }
    }

    /**
     * Computes the two endpoints of a linear ramp across a square canvas for a direction in
     * degrees, and returns the canvas gradient.
     *
     * Lifted verbatim from the rich-text label background painter so node fills and label fills
     * agree on what "direction 45" means. Zero degrees runs left to right; the angle sweeps the
     * endpoints around the canvas center.
     * @param ctx - The DynamicTexture's 2D context
     * @param direction - Gradient direction in degrees, 0 to 360
     * @param size - Width and height of the square canvas
     * @returns A canvas linear gradient with no stops added yet
     */
    private static createLinearRamp(ctx: ICanvasRenderingContext, direction: number, size: number): ICanvasGradient {
        const angle = (direction * Math.PI) / 180;
        const half = size / 2;
        const x1 = half - (Math.cos(angle) * size) / 2;
        const y1 = half - (Math.sin(angle) * size) / 2;
        const x2 = half + (Math.cos(angle) * size) / 2;
        const y2 = half + (Math.sin(angle) * size) / 2;

        return ctx.createLinearGradient(x1, y1, x2, y2);
    }

    /**
     * Register a custom shape creator function
     * @param type - Shape type identifier
     * @param creator - Function to create the mesh for this shape
     */
    static registerShapeCreator(type: string, creator: ShapeCreator): void {
        this.shapeCreators.set(type, creator);
    }

    private static createBox(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateBox("box", { size }, scene);
    }

    private static createSphere(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        // "low": an icosphere of one subdivision, the sparsest mesh that still reads as a ball, so
        // a wireframe of it is a clean geodesic rather than a mesh of 32 x 32 quads.
        if (detail === "low") {
            return MeshBuilder.CreateIcoSphere("sphere", { radius: size / 2, subdivisions: 1 }, scene);
        }

        return MeshBuilder.CreateSphere("sphere", { diameter: size, segments: segmentsOf(detail) }, scene);
    }

    private static createCylinder(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameter: actualSize,
                tessellation: segmentsOf(detail),
            },
            scene,
        );
    }

    private static createCone(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameterTop: 0,
                diameterBottom: actualSize,
                tessellation: segmentsOf(detail),
            },
            scene,
        );
    }

    private static createCapsule(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        return MeshBuilder.CreateCapsule(
            "capsule",
            {
                height: size,
                radius: size * SHAPE_CONSTANTS.CAPSULE_RADIUS_MULTIPLIER,
                tessellation: segmentsOf(detail),
            },
            scene,
        );
    }

    private static createTorus(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        return MeshBuilder.CreateTorus(
            "torus",
            {
                diameter: size,
                thickness: size * SHAPE_CONSTANTS.TORUS_THICKNESS_MULTIPLIER,
                tessellation: segmentsOf(detail),
            },
            scene,
        );
    }

    private static createTorusKnot(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateTorusKnot(
            "tk",
            {
                radius: actualSize * SHAPE_CONSTANTS.TORUSKNOT_RADIUS_MULTIPLIER,
                tube: actualSize * SHAPE_CONSTANTS.TORUSKNOT_TUBE_MULTIPLIER,
                radialSegments: SHAPE_CONSTANTS.TORUSKNOT_RADIAL_SEGMENTS,
                // Around the tube; the count along the knot keeps its curve.
                tubularSegments: segmentsOf(detail),
            },
            scene,
        );
    }

    private static createPolyhedron(type: PolyhedronType, size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreatePolyhedron(
            "polyhedron",
            {
                size,
                type: type,
            },
            scene,
        );
    }

    private static createGoldberg(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateGoldberg(
            "goldberg",
            {
                size,
            },
            scene,
        );
    }

    private static createIcoSphere(size: number, scene?: Scene, detail?: MeshDetail): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateIcoSphere(
            "icosphere",
            {
                radius: actualSize * SHAPE_CONSTANTS.ICOSPHERE_RADIUS_MULTIPLIER,
                // "low" is one subdivision, a number is the subdivisions; "full" keeps Babylon's 4.
                subdivisions: segmentsOf(detail, 1),
            },
            scene,
        );
    }

    private static createGeodesic(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateGeodesic(
            "geodesic",
            {
                size,
            },
            scene,
        );
    }
}

/**
 * An instance of a model template's group, answering for the group's own locked box. Babylon
 * sizes an instance of a skinned source from its raw vertices, and an animated template's are in
 * the file's units (its bones place and fit them), so a Fox was boxed 150 times too large and the
 * camera framed the graph by that box (issue #8607).
 * @param group - The template's group.
 * @param name - The instance's name.
 * @returns The instance.
 */
function modelInstance(group: Mesh, name: string): InstancedMesh {
    const instance = group.createInstance(name);
    const { minimum, maximum } = group.getBoundingInfo();
    instance.buildBoundingInfo(minimum, maximum);
    return instance;
}
