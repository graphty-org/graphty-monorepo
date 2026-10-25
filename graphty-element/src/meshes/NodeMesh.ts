import {
    AbstractMesh,
    Color3,
    DynamicTexture,
    type ICanvasGradient,
    type ICanvasRenderingContext,
    type InstancedMesh,
    Matrix,
    Mesh,
    MeshBuilder,
    Scene,
    StandardMaterial,
    TransformNode,
    VertexBuffer,
} from "@babylonjs/core";

import { SharedImplementationMap } from "../catalog/pluginRegistry";
import type { NodeStyleConfig } from "../config";
import { PolyhedronType, SHAPE_CONSTANTS } from "../constants/meshConstants";
import { shadeInstanceColors } from "./InstanceColorShading";
import { setUpQuietly } from "./LabelBatch";
import type { MeshCache } from "./MeshCache";
import { isNodeMaterial, lightNodeMaterial, outlineNodeMesh, sceneLighting } from "./NodeLighting";
import {
    bodilessSlab,
    fitNodeMesh,
    type NodeExtents,
    outlineSlab,
    projectedVertices,
    ringSlab,
} from "./NodeShapeGeometry";
import {
    borderRing,
    convexHull,
    flatShapeOutline,
    isFlatShape,
    offsetOutline,
    type Point2,
    type WaveShape,
} from "./shapeOutlines";

interface NodeMeshOptions {
    styleId: string;
    is2D: boolean;
    size: number;
}

interface NodeMeshCreateOptions {
    shape?: NodeStyleConfig["shape"];
    texture?: NodeStyleConfig["texture"];
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

/** How deep a node drawn flat is, as a fraction of its smaller side: thin, but never zero. */
const THIN_DEPTH_RATIO = 0.02;

/**
 * How far apart along the 2D camera's view, in scene units, the front faces of two neighbouring
 * `zIndex` levels are drawn. Far above the depth buffer's resolution at the 2D camera's range,
 * and far below anything a reader could see in an orthographic view.
 */
const Z_INDEX_STEP = 0.05;

/**
 * In a 2D view, move a node mesh's geometry back so its front face sits `-zIndex` steps behind
 * the plane every edge and every node at `zIndex` 0 is drawn on (the 2D camera looks along +z).
 * Its position stays the node's own, so edges, picking and the layout see no difference; only the
 * depth test does. A 3D view, and a node at 0 or with no `zIndex`, are left exactly as they were.
 * @param mesh - The source mesh, before any instance is made of it.
 * @param shape - The node's shape block.
 * @param is2D - Whether the graph is drawn in 2D.
 */
function placeByZIndex(mesh: Mesh, shape: NodeStyleConfig["shape"], is2D: boolean): void {
    const zIndex = shape?.zIndex ?? 0;
    if (!is2D) {
        return;
    }

    if (zIndex >= 0) {
        placeByDrawOrder(mesh, shape?.drawOrder);
        return;
    }

    mesh.refreshBoundingInfo();
    const front = mesh.getBoundingInfo().boundingBox.minimum.z;
    mesh.bakeTransformIntoVertices(Matrix.Translation(0, 0, -zIndex * Z_INDEX_STEP - front));
    mesh.refreshBoundingInfo();
}

/**
 * How far apart along the 2D camera's view the front faces of two neighbouring `drawOrder`
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

type ShapeCreator = (size: number, scene?: Scene) => Mesh;

/**
 * Width and height in pixels of the square canvas a gradient ramp is painted into.
 *
 * Square rather than a 1-pixel strip because a strip cannot carry a vertical ramp -- see
 * `NodeMesh.createGradientTexture`. 128 costs roughly 64 KB of GPU memory per distinct gradient
 * and is ample for a node-sized mesh; raising it multiplies the ceiling described on
 * MAX_GRADIENT_TEXTURES_PER_SCENE by the square of the change.
 */
/** The smallest size a node mesh is built at; a size of 0 draws this, never hidden. */
const MIN_NODE_SIZE = 1e-3;

const GRADIENT_TEXTURE_SIZE = 128;

/**
 * Hard ceiling on how many distinct gradient ramps may be allocated for one scene.
 *
 * This is the guard against the calculated-style hazard documented on
 * `NodeMesh.getGradientTexture`: a `calculatedStyle` expression produces a distinct style value,
 * and therefore a distinct material, per node, so a gradient computed per node would otherwise
 * allocate a texture per node. At 32 the worst case is about 2 MB, which is affordable; past the
 * ceiling the material falls back to the gradient's first stop as a flat colour rather than
 * allocating without bound.
 */
const MAX_GRADIENT_TEXTURES_PER_SCENE = 32;

/**
 * Gradient ramps interned per scene, keyed by the gradient VALUE rather than by style id.
 *
 * A WeakMap so the whole table is collected with the scene it belongs to -- textures never leak
 * between scenes, and a test that builds and drops a scene leaves nothing behind.
 */
const gradientTextureCache = new WeakMap<Scene, Map<string, DynamicTexture>>();

interface ColorObject {
    colorType: string;
    value?: string;
    colors?: string[];
    stops?: number[];
    direction?: number;
    opacity?: number;
}

/**
 * A gradient colour normalised out of the `AdvancedColorStyle` discriminated union.
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
        NodeMesh.registerShapeCreator("sphere", (size, scene) => NodeMesh.createSphere(size, scene));
        NodeMesh.registerShapeCreator("cylinder", (size, scene) => NodeMesh.createCylinder(size, scene));
        NodeMesh.registerShapeCreator("cone", (size, scene) => NodeMesh.createCone(size, scene));
        NodeMesh.registerShapeCreator("capsule", (size, scene) => NodeMesh.createCapsule(size, scene));
        NodeMesh.registerShapeCreator("torus", (size, scene) => NodeMesh.createTorus(size, scene));
        NodeMesh.registerShapeCreator("torus-knot", (size, scene) => NodeMesh.createTorusKnot(size, scene));

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
        NodeMesh.registerShapeCreator("icosphere", (size, scene) => NodeMesh.createIcoSphere(size, scene));
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
        const cacheKey = `node-style-${options.styleId}-${options.is2D ? "2d" : "3d"}`;

        return cache.get(cacheKey, () => {
            const mesh = this.createMeshWithoutCache(options, createOptions, scene);
            placeByZIndex(mesh, createOptions.shape, options.is2D);

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
            if (isNodeMaterial(material)) {
                outlineNodeMesh(mesh, sceneLighting(scene));
            }

            if (
                createOptions.texture?.color &&
                typeof createOptions.texture.color === "object" &&
                "opacity" in createOptions.texture.color
            ) {
                mesh.visibility = createOptions.texture.color.opacity ?? 1;
            }

            return mesh;
        });
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
        const mesh = creator(size, scene);
        if (!this.isFitted(createOptions.shape)) {
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

        return build(type, this.flatOutline(shape, extents), extents.z ?? extents.across, scene);
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
        const instance = cache.get(`node-border-${options.styleId}-${options.is2D ? "2d" : "3d"}`, () => {
            const extents = this.fillExtents(sized, inset);
            const outline = flat ? this.flatOutline(shape, extents) : this.solidOutline(fill);
            const depth = flat ? (extents.z ?? extents.across) : THIN_DEPTH_RATIO * extents.across;
            const wave = NodeMesh.waveOf(border, this.extentPerSize(shape));
            const mesh = ringSlab(
                "node-border",
                borderRing(outline, width, border?.style ?? "solid", wave),
                depth,
                scene,
            );
            placeByZIndex(mesh, shape, options.is2D);
            mesh.material = this.createBorderMaterial(border?.color ?? "#000000", opacity, scene);

            return mesh;
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
        const instance = cache.get(`node-outer-border-${options.styleId}-${options.is2D ? "2d" : "3d"}`, () => {
            const extents = this.fillExtents(sized, inset);
            const outline = flat ? this.flatOutline(shape, extents) : this.solidOutline(fill);
            const depth = flat ? (extents.z ?? extents.across) : THIN_DEPTH_RATIO * extents.across;
            const base = gap > 0 ? offsetOutline(outline, gap) : outline;
            const mesh = ringSlab(
                "node-outer-border",
                borderRing(base, width, outerBorder?.style ?? "solid"),
                depth,
                scene,
            );
            placeByZIndex(mesh, shape, options.is2D);
            mesh.material = this.createBorderMaterial(outerBorder?.color ?? "#000000", opacity, scene);

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
     * Build a node's underlay or overlay (Cytoscape.js `underlay-*`, `overlay-*`) and hand back an
     * instance of it, or null when the node has none: a filled shape `padding` beyond the node's box
     * on every side, drawn just behind the node's back (underlay) or just before its front (overlay),
     * cached under the node's style key as its outer border is.
     * @param cache - The mesh cache the node's own mesh came from.
     * @param options - The node's mesh options.
     * @param shape - The node's shape block.
     * @param halo - The underlay or overlay.
     * @param kind - Which of the two.
     * @param fill - The node's own mesh, whose outline and depth it follows.
     * @param scene - The scene.
     * @returns The instance, or null.
     */
    static createHalo(
        cache: MeshCache,
        options: NodeMeshOptions,
        shape: NodeStyleConfig["shape"],
        halo: NodeStyleConfig["underlay"],
        kind: "underlay" | "overlay",
        fill: AbstractMesh,
        scene?: Scene,
    ): InstancedMesh | null {
        const opacity = halo?.opacity ?? 0;
        if (shape?.type === undefined || opacity <= 0) {
            return null;
        }

        const perSize = this.extentPerSize(shape);
        const pad = (halo?.padding ?? 0) * perSize;
        const sized = this.extentsOf(shape, Math.max(shape.size ?? options.size, MIN_NODE_SIZE));
        const flat = isFlatShape(shape.type);
        const instance = cache.get(`node-${kind}-${options.styleId}-${options.is2D ? "2d" : "3d"}`, () => {
            const own = halo?.shape;
            const corner = halo?.cornerRadius === undefined ? undefined : halo.cornerRadius * perSize;
            let outline: Point2[];
            if (own !== undefined && isFlatShape(own)) {
                outline = flatShapeOutline(
                    own,
                    (sized.x ?? sized.across) + 2 * pad,
                    (sized.y ?? sized.across) + 2 * pad,
                    corner,
                );
            } else {
                const nodeOutline = flat ? this.flatOutline(shape, sized) : this.solidOutline(fill);
                outline = offsetOutline(nodeOutline, pad);
            }
            fill.computeWorldMatrix(true);
            const box = fill.getBoundingInfo().boundingBox;
            const depth = THIN_DEPTH_RATIO * Math.max(sized.across, MIN_NODE_SIZE);
            // drawn as a ring from the middle out, so it fills the whole shape
            const mesh = ringSlab(
                `node-${kind}`,
                [{ inner: outline.map((): Point2 => [0, 0]), outer: outline, closed: true }],
                depth,
                scene,
            );
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
     * @returns The ring, or null when the style draws no border.
     */
    static createGroupBorder(
        createOptions: NodeMeshCreateOptions,
        extents: { x: number; y: number; z: number },
        is2D: boolean,
        scene?: Scene,
    ): Mesh | null {
        const { border, shape } = createOptions;
        const width = (border?.width ?? 0) * this.extentPerSize(shape);
        if (width <= 0 || shape?.type === undefined || !isFlatShape(shape.type)) {
            return null;
        }

        const outline = this.flatOutline(shape, { across: Math.max(extents.x, extents.y), ...extents });
        const mesh = ringSlab("node-border", borderRing(outline, width, border?.style ?? "solid"), extents.z, scene);
        placeByZIndex(mesh, shape, is2D);
        mesh.isPickable = false;

        return mesh;
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
        const corner = shape.cornerRadius === undefined ? undefined : shape.cornerRadius * this.extentPerSize(shape);

        const outline = flatShapeOutline(
            shape.type ?? "",
            extents.x ?? extents.across,
            extents.y ?? extents.across,
            corner,
            shape.points,
            shape.stretchPoints !== false,
            shape.exactCornerRadius === true,
        );
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

    private static solidOutline(fill: AbstractMesh): Point2[] {
        const source = fill instanceof Mesh ? fill : (fill as InstancedMesh).sourceMesh;

        return convexHull(projectedVertices(source));
    }

    /**
     * The border's material: its colour, unlit, so a border reads as the colour a file gave it in
     * 2D and 3D alike, the way an edge's line does.
     * @param color - The border colour.
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
     * THE DEFECT THIS FIXES: `extractColor` answers only two of the three colour forms the zod
     * schema accepts -- a bare hex string and `{colorType: "solid"}`. For `"gradient"` and
     * `"radial-gradient"` it returns undefined, and this function used to read
     * `if (color3) { ... }` with NO else branch. The consequence was not a wrong gradient: the
     * StandardMaterial kept its stock colour, so a gradient node rendered flat white/grey with no
     * colour applied at all. That is the product owner's report, "gradient color strips don't
     * currently work", and it was made more galling by the fact that the schema accepted the
     * value (see config/common.ts `AdvancedColorStyle`), so `Styles.getNodeIdForStyle` interned a
     * fresh style id and `NodeMesh.create` allocated a whole cached mesh for it. The user paid the
     * full interning cost and got no pixels back. Every colour form the schema accepts must now
     * produce a visible colour, or the schema and the renderer have drifted again.
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
     * @param createOptions - Creation options carrying the texture colour and effects
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
     * @param createOptions - Creation options carrying the texture colour and effects
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
        const gradient = color3 ? undefined : this.extractGradient(styleColor);
        const gradientTexture = gradient ? this.getGradientTexture(gradient, scene) : undefined;

        if (gradient && !gradientTexture) {
            // The ramp could not be allocated -- no scene, no 2D canvas in this environment, or
            // the per-scene texture budget is spent. Fall back to the first stop so the node still
            // carries a colour. This mirrors what Node.ts already does for rich-text label
            // backgrounds, and it is strictly better than the old behaviour of drawing nothing:
            // a flat approximation of a gradient is legible, an unstyled default is not.
            const [firstStop] = gradient.colors;
            if (firstStop) {
                color3 = Color3.FromHexString(firstStop);
            }
        }

        // `node.unlit` draws a 3D node the way 2D draws every node: its own colour, no light.
        const unlit = is2D || createOptions.effect?.unlit === true;

        if (gradientTexture) {
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
                // colour share this material and carry their own colour in a per-instance buffer
                // instead. Babylon multiplies that buffer in after it clamps the light term, which
                // flattens every surface lit past four fifths into one patch of unshaded colour --
                // so the plugin moves the multiply inside the clamp and the node looks round
                // again. On a material whose instances carry no colour it changes nothing.
                //
                // BEFORE freeze(): a frozen material stops re-evaluating its shader defines, and a
                // plugin is a define.
                shadeInstanceColors(mat);
            }
        }

        mat.wireframe = createOptions.effect?.wireframe ?? false;

        // What `freeze()` does, less its `markDirty`, which walks every mesh in the scene for the
        // submeshes drawn with this material -- of which a new material has none.
        mat.checkReadyOnlyOnce = true;
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
     * Normalises the two gradient members of `AdvancedColorStyle` into one shape.
     *
     * Kept separate from `extractColor` on purpose: `extractColor` answers "is there a single flat
     * colour here", and several callers rely on it returning undefined for a gradient. Widening it
     * to also mean "or a gradient" would change what undefined means at every call site.
     *
     * A gradient with a single stop is still returned. It cannot be PAINTED -- the stop offsets are
     * `i / (colors.length - 1)`, which is a division by zero for one stop, and a one-stop ramp is a
     * flat colour anyway -- so `getGradientTexture` refuses it and `createMaterial` falls back to
     * that one stop. Returning undefined here instead would send the node back to the unstyled
     * default, which is the exact defect this whole change removes.
     * @param color - The `texture.color` value taken straight off the parsed style
     * @returns The normalised gradient, or undefined if this is not a paintable gradient
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
     *      `createMaterial` falls back to the first stop as a flat colour. A graph with more than
     *      that many genuinely distinct gradients is a calculated gradient in disguise, and a flat
     *      approximation is a far better outcome than exhausting GPU memory. The ceiling is the
     *      reason this code does not need to know whether a gradient came from a calculated value:
     *      provenance is invisible here, but unbounded allocation is not.
     *
     * The cache is a WeakMap keyed by scene, so the entries die with the scene and never leak
     * across scenes or across tests. `MeshCache` disposes a source mesh's material but never its
     * textures, so a cached texture stays valid across a 2D/3D switch.
     * @param gradient - The normalised gradient to paint
     * @param scene - Babylon.js scene that will own the texture
     * @returns The shared texture, or undefined if one cannot or should not be allocated
     */
    private static getGradientTexture(gradient: GradientColor, scene?: Scene): DynamicTexture | undefined {
        // One stop cannot make a ramp: the stop offsets below are `i / (colors.length - 1)`, which
        // is NaN for a single stop and throws in `addColorStop`. The caller paints it flat.
        if (!scene || gradient.colors.length < 2) {
            return undefined;
        }

        const key = `${gradient.radial ? "radial" : "linear"}|${gradient.direction}|${gradient.colors.join(",")}|${gradient.stops?.join(",") ?? ""}`;

        let sceneCache = gradientTextureCache.get(scene);
        if (!sceneCache) {
            sceneCache = new Map<string, DynamicTexture>();
            gradientTextureCache.set(scene, sceneCache);
        }

        const cached = sceneCache.get(key);
        if (cached) {
            return cached;
        }

        if (sceneCache.size >= MAX_GRADIENT_TEXTURES_PER_SCENE) {
            return undefined;
        }

        const texture = this.createGradientTexture(gradient, scene, key);
        if (!texture) {
            return undefined;
        }

        sceneCache.set(key, texture);
        return texture;
    }

    /**
     * Paints a gradient ramp into a DynamicTexture.
     *
     * WHY THE CANVAS IS SQUARE RATHER THAN A 256x1 STRIP: a one-pixel-tall strip cannot represent
     * a gradient whose direction has any vertical component. At direction 90 the endpoint maths
     * below reduces to y1 = 0, y2 = 1, so the entire ramp is squeezed into a single row of pixels
     * and the node renders as one flat colour -- exactly the defect this whole change exists to
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
     * @param gradient - The normalised gradient to paint
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

            const ramp = gradient.radial
                ? ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
                : this.createLinearRamp(ctx, gradient.direction, size);

            const { colors, stops } = gradient;
            for (let i = 0; i < colors.length; i++) {
                ramp.addColorStop(stops?.[i] ?? i / (colors.length - 1), colors[i] ?? "transparent");
            }

            ctx.fillStyle = ramp;
            ctx.fillRect(0, 0, size, size);
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
     * endpoints around the canvas centre.
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

    private static createSphere(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateSphere("sphere", { diameter: size }, scene);
    }

    private static createCylinder(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameter: actualSize,
            },
            scene,
        );
    }

    private static createCone(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateCylinder(
            "cylinder",
            {
                height: actualSize * SHAPE_CONSTANTS.GOLDEN_RATIO,
                diameterTop: 0,
                diameterBottom: actualSize,
            },
            scene,
        );
    }

    private static createCapsule(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateCapsule(
            "capsule",
            { height: size, radius: size * SHAPE_CONSTANTS.CAPSULE_RADIUS_MULTIPLIER },
            scene,
        );
    }

    private static createTorus(size: number, scene?: Scene): Mesh {
        return MeshBuilder.CreateTorus(
            "torus",
            { diameter: size, thickness: size * SHAPE_CONSTANTS.TORUS_THICKNESS_MULTIPLIER },
            scene,
        );
    }

    private static createTorusKnot(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateTorusKnot(
            "tk",
            {
                radius: actualSize * SHAPE_CONSTANTS.TORUSKNOT_RADIUS_MULTIPLIER,
                tube: actualSize * SHAPE_CONSTANTS.TORUSKNOT_TUBE_MULTIPLIER,
                radialSegments: SHAPE_CONSTANTS.TORUSKNOT_RADIAL_SEGMENTS,
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

    private static createIcoSphere(size: number, scene?: Scene): Mesh {
        const actualSize = size;
        return MeshBuilder.CreateIcoSphere(
            "icosphere",
            {
                radius: actualSize * SHAPE_CONSTANTS.ICOSPHERE_RADIUS_MULTIPLIER,
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
