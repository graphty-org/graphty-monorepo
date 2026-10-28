import { Matrix, Mesh, type Scene, VertexBuffer, VertexData } from "@babylonjs/core";

import { earClip, fansFromOrigin, type Point2, type RingPiece } from "./shapeOutlines";

/**
 * Collects the triangles of a slab: a 2D shape given a depth along z, front face towards -z (where
 * the 2D camera is), back face towards +z, and walls round its edges.
 *
 * Every triangle has its own three vertices, so each face is lit as one plane and the walls stay
 * crisp. Babylon draws a triangle's front where its corners run counter-clockwise, so the front
 * face keeps the outline's order and the back face reverses it.
 */
class SlabBuilder {
    readonly positions: number[] = [];
    readonly indices: number[] = [];

    constructor(
        private readonly front: number,
        private readonly back: number,
    ) {}

    /**
     * One triangle of the shape's face, put on both the front and the back of the slab.
     * @param a - First corner, counter-clockwise.
     * @param b - Second corner.
     * @param c - Third corner.
     */
    face(a: Point2, b: Point2, c: Point2): void {
        this.triangle([a, this.front], [b, this.front], [c, this.front]);
        this.triangle([a, this.back], [c, this.back], [b, this.back]);
    }

    /**
     * The wall along one edge, facing the side that is on the right of the edge's direction.
     * @param p - Where the edge starts.
     * @param q - Where it ends.
     */
    wall(p: Point2, q: Point2): void {
        this.triangle([p, this.front], [q, this.back], [q, this.front]);
        this.triangle([p, this.front], [p, this.back], [q, this.back]);
    }

    /**
     * Build the mesh.
     * @param name - The mesh's name.
     * @param scene - The scene it belongs to.
     * @returns The mesh, with normals and texture coordinates.
     */
    build(name: string, scene?: Scene): Mesh {
        const mesh = new Mesh(name, scene);
        const data = new VertexData();
        const normals: number[] = [];

        VertexData.ComputeNormals(this.positions, this.indices, normals);
        data.positions = this.positions;
        data.indices = this.indices;
        data.normals = normals;
        data.uvs = this.planarUvs();
        data.applyToMesh(mesh);

        return mesh;
    }

    /**
     * Texture coordinates laid flat across the shape's box, u left to right and v bottom to top,
     * so a texture (a gradient fill's ramp) covers the face the way it covers a square. Without
     * them every vertex samples one texel and a gradient draws as one flat colour.
     * @returns Two coordinates per vertex.
     */
    private planarUvs(): number[] {
        let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
        for (let i = 0; i < this.positions.length; i += 3) {
            x0 = Math.min(x0, this.positions[i]);
            x1 = Math.max(x1, this.positions[i]);
            y0 = Math.min(y0, this.positions[i + 1]);
            y1 = Math.max(y1, this.positions[i + 1]);
        }

        const w = x1 - x0 || 1;
        const h = y1 - y0 || 1;
        const uvs: number[] = [];
        for (let i = 0; i < this.positions.length; i += 3) {
            uvs.push((this.positions[i] - x0) / w, (this.positions[i + 1] - y0) / h);
        }

        return uvs;
    }

    private triangle(...corners: [Point2, number][]): void {
        for (const [[x, y], z] of corners) {
            this.indices.push(this.positions.length / 3);
            this.positions.push(x, y, z);
        }
    }
}

/**
 * A flat shape as a closed slab: its outline filled front and back, and walled round.
 *
 * The face is fanned from the origin where every corner can be seen from it, which holds for
 * every flat outline in `shapeOutlines` but a figure's; that one is cut into triangles by clipping
 * its ears.
 * @param name - The mesh's name.
 * @param outline - The outline, counter-clockwise round the origin.
 * @param depth - How deep the slab is along z.
 * @param scene - The scene it belongs to.
 * @returns The mesh.
 */
export function outlineSlab(name: string, outline: readonly Point2[], depth: number, scene?: Scene): Mesh {
    const slab = new SlabBuilder(-depth / 2, depth / 2);
    const centre: Point2 = [0, 0];
    const fan = fansFromOrigin(outline);

    outline.forEach((point, i) => {
        const next = outline[(i + 1) % outline.length];
        if (fan) {
            slab.face(centre, point, next);
        }

        slab.wall(point, next);
    });

    if (!fan) {
        for (const [a, b, c] of earClip(outline)) {
            slab.face(outline[a], outline[b], outline[c]);
        }
    }

    return slab.build(name, scene);
}

/**
 * A node with no body: the corners of its box and no face, so it takes up its box -- for its
 * bounds, its label and the edges that meet it -- and draws nothing.
 * @param name - The mesh's name.
 * @param outline - The box's outline.
 * @param depth - How deep the box is along z.
 * @param scene - The scene it belongs to.
 * @returns The mesh.
 */
export function bodilessSlab(name: string, outline: readonly Point2[], depth: number, scene?: Scene): Mesh {
    const slab = new SlabBuilder(-depth / 2, depth / 2);

    for (const [x, y] of outline) {
        slab.positions.push(x, y, -depth / 2, x, y, depth / 2);
    }

    return slab.build(name, scene);
}

/**
 * A node border as slabs: each ring piece filled front and back and walled on every side.
 * @param name - The mesh's name.
 * @param pieces - The ring's pieces, from `borderRing`.
 * @param depth - How deep each piece is along z.
 * @param scene - The scene it belongs to.
 * @returns The mesh.
 */
export function ringSlab(name: string, pieces: readonly RingPiece[], depth: number, scene?: Scene): Mesh {
    const slab = new SlabBuilder(-depth / 2, depth / 2);

    for (const piece of pieces) {
        addRingPiece(slab, piece);
    }

    return slab.build(name, scene);
}

/**
 * One ring piece's faces and walls.
 * @param slab - The slab being built.
 * @param piece - The piece.
 */
function addRingPiece(slab: SlabBuilder, piece: RingPiece): void {
    const { inner, outer, closed } = piece;
    const steps = closed ? inner.length : inner.length - 1;

    for (let i = 0; i < steps; i++) {
        const j = (i + 1) % inner.length;
        slab.face(inner[i], outer[i], outer[j]);
        slab.face(inner[i], outer[j], inner[j]);
        slab.wall(outer[i], outer[j]);
        slab.wall(inner[j], inner[i]);
    }

    if (!closed) {
        slab.wall(inner[0], outer[0]);
        slab.wall(outer.at(-1) ?? outer[0], inner.at(-1) ?? inner[0]);
    }
}

/** The drawn extent of a node along each axis, in world units; an axis left out keeps its proportion. */
export interface NodeExtents {
    /** The extent across the view (the larger of x and y) the shape is scaled to. */
    readonly across: number;
    readonly x?: number;
    readonly y?: number;
    readonly z?: number;
}

/**
 * Centre a built node mesh on its origin and scale it to the node's extents, baking both into its
 * vertices so its instances, its bounds and an edge's ray all see the same geometry.
 *
 * WHY "ACROSS THE VIEW". Every shape at one size covers the same extent in the plane a 2D camera
 * looks at, which is what a reader compares and what a file's node size means. Babylon builds its
 * shapes at whatever size its own parameters give -- an octahedron of size 1 is 2.83 across, a
 * sphere 1 -- so without this a diamond in a file was drawn nearly three times its neighbours.
 * Depth keeps the shape's own proportion unless the node asks for one.
 * @param mesh - The mesh, as its creator built it.
 * @param extents - What to scale it to.
 */
export function fitNodeMesh(mesh: Mesh, extents: NodeExtents): void {
    mesh.refreshBoundingInfo();
    const { center, extendSize } = mesh.getBoundingInfo().boundingBox;
    const [sizeX, sizeY, sizeZ] = [extendSize.x * 2, extendSize.y * 2, extendSize.z * 2];
    const across = Math.max(sizeX, sizeY);

    if (across <= 0) {
        return;
    }

    const uniform = extents.across / across;
    const scale = (target: number | undefined, size: number): number =>
        target === undefined || size <= 0 ? uniform : target / size;
    const [sx, sy, sz] = [scale(extents.x, sizeX), scale(extents.y, sizeY), scale(extents.z, sizeZ)];

    if (isIdentity(center.x, center.y, center.z, sx, sy, sz)) {
        return;
    }

    mesh.bakeTransformIntoVertices(
        Matrix.Translation(-center.x, -center.y, -center.z).multiply(Matrix.Scaling(sx, sy, sz)),
    );

    // A scale that is not the same on every axis turns the normals; work them out again from the
    // faces rather than stretch them.
    if (Math.abs(sx - sy) > 1e-9 || Math.abs(sx - sz) > 1e-9) {
        const positions = mesh.getVerticesData(VertexBuffer.PositionKind);
        const indices = mesh.getIndices();

        if (positions !== null && indices !== null) {
            const normals: number[] = [];
            VertexData.ComputeNormals(positions, indices, normals);
            mesh.setVerticesData(VertexBuffer.NormalKind, normals);
        }
    }

    mesh.refreshBoundingInfo();
}

/**
 * Whether a centring and scaling would leave a mesh where it is.
 * @param cx - The centre's x.
 * @param cy - Its y.
 * @param cz - Its z.
 * @param sx - The scale along x.
 * @param sy - Along y.
 * @param sz - Along z.
 * @returns True when there is nothing to bake.
 */
function isIdentity(cx: number, cy: number, cz: number, sx: number, sy: number, sz: number): boolean {
    const near = (value: number, to: number): boolean => Math.abs(value - to) < 1e-6;

    return near(cx, 0) && near(cy, 0) && near(cz, 0) && near(sx, 1) && near(sy, 1) && near(sz, 1);
}

/**
 * The outline a built mesh shows a camera looking along z: the convex hull of its vertices.
 * @param mesh - The mesh.
 * @returns Its vertices projected onto the plane, for `convexHull`.
 */
export function projectedVertices(mesh: Mesh): Point2[] {
    const positions = mesh.getVerticesData(VertexBuffer.PositionKind) ?? [];
    const points: Point2[] = [];

    for (let i = 0; i < positions.length; i += 3) {
        points.push([positions[i], positions[i + 1]]);
    }

    return points;
}
