/**
 * @file What is drawn over a node's face: its pie, its stripes and its image (`pie`, `stripes`,
 * `image` of a node style), as meshes of their own in front of the node's fill, children of the
 * node's mesh so they move, hide and go with it. Each is a source mesh cached under the node's
 * style key, so every node of one style shares it and pays for one instance.
 */
import {
    type AbstractMesh,
    Color3,
    type InstancedMesh,
    Mesh,
    type Scene,
    StandardMaterial,
    Texture,
    VertexData,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import type { MeshCache } from "./MeshCache";
import { boxOf, clipToBox, type ColorPiece, imageBox, type PieceBox, pieSlices, stripeBands } from "./nodeDecoration";
import { NodeMesh } from "./NodeMesh";
import { earClip, type Point2 } from "./shapeOutlines";

/** One piece drawn over a node's face, for a reader of the drawing: its kind and its box in the node's plane. */
export interface NodeDecorationPiece {
    readonly kind: "shape" | "image";
    readonly box: PieceBox;
}

/** The metadata a decoration's source mesh carries. */
export interface NodeDecorationMetadata {
    readonly nodePieces: NodeDecorationPiece[];
}

/** What a node's decorations are built from. */
export interface NodeDecorationOptions {
    readonly shape?: NodeStyleConfig["shape"];
    readonly border?: NodeStyleConfig["border"];
    readonly pie?: NodeStyleConfig["pie"];
    readonly stripes?: NodeStyleConfig["stripes"];
    readonly image?: NodeStyleConfig["image"];
}

/**
 * How far in front of the node's face its decorations are drawn, in scene units: far below what a
 * reader sees in an orthographic view, and below the step between two draw orders, so a node drawn
 * over another still covers the other's decorations.
 */
const FRONT_STEP = 0.0005;

/**
 * Whether a style draws anything over the node's face.
 * @param o - The style.
 * @returns True with a pie, stripes or an image.
 */
export function hasDecoration(o: NodeDecorationOptions): boolean {
    return o.pie?.colors !== undefined || o.stripes?.colors !== undefined || (o.image?.src ?? "") !== "";
}

/**
 * Build a node's decorations: an instance of its colored pieces (pie slices and stripes) and an
 * instance of its image, each null when the style draws none. The caller parents them to the node's
 * mesh.
 * @param cache - The mesh cache the node's mesh came from.
 * @param key - The node's style key, with its view.
 * @param o - The node's shape, border, pie, stripes and image.
 * @param size - The node's size, when its shape gives none.
 * @param fill - The node's own mesh.
 * @param scene - The scene.
 * @returns The two instances.
 */
export function createNodeDecorations(
    cache: MeshCache,
    key: string,
    o: NodeDecorationOptions,
    size: number,
    fill: AbstractMesh,
    scene: Scene,
): { pieces: InstancedMesh | null; image: InstancedMesh | null } {
    if (!hasDecoration(o)) {
        return { pieces: null, image: null };
    }
    const face = NodeMesh.faceOf(o, size, fill);
    const z = frontOf(fill) - FRONT_STEP;
    const colored = coloredPieces(o, face);
    const pieces =
        colored.length === 0 ? null : cache.get(`node-decoration-${key}`, () => buildColored(colored, z, scene));
    const image =
        (o.image?.src ?? "") === ""
            ? null
            : cache.get(`node-image-${key}`, () =>
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked just above
                  buildImage(o.image!, face, NodeMesh.extentPerSize(o.shape), z - FRONT_STEP, scene),
              );
    for (const mesh of [pieces, image]) {
        if (mesh !== null) {
            mesh.isPickable = false;
            mesh.sourceMesh.isPickable = false;
        }
    }
    return { pieces, image };
}

/** A colored piece, with the box a reader of the drawing gives it where that is not its outline's. */
type Placed = ColorPiece & { readonly box?: PieceBox };

/**
 * The pieces a node draws in color over its face: its stripes, cut to its outline, and over them
 * its pie's slices, as Cytoscape.js draws them.
 * @param o - The node's style.
 * @param face - The node's face.
 * @param face.outline - Its outline.
 * @param face.width - Its width.
 * @param face.height - Its height.
 * @returns The pieces.
 */
function coloredPieces(o: NodeDecorationOptions, face: { outline: Point2[]; width: number; height: number }): Placed[] {
    // a band is the box it fills, cut to the node: its box for a reader is the band's own, as a clipped
    // rectangle's is in an SVG
    const bands = stripeBands(o.stripes, face.width, face.height).flatMap((b) => {
        const outline = clipToBox(face.outline, b.box);
        return outline.length < 3 ? [] : [{ outline, rgb: b.rgb, opacity: b.opacity, box: b.box }];
    });
    return [...bands, ...pieSlices(o.pie, face.width, face.height, NodeMesh.extentPerSize(o.shape))];
}

/**
 * The z of a node mesh's face toward the 2D camera (its least z).
 * @param fill - The node's mesh.
 * @returns The z, in its own frame.
 */
function frontOf(fill: AbstractMesh): number {
    const source = "sourceMesh" in fill ? (fill as InstancedMesh).sourceMesh : fill;
    return source.getBoundingInfo().boundingBox.minimum.z;
}

/**
 * Put the triangles of flat outlines, all at one z, into vertex arrays.
 * @param outlines - The outlines, counter-clockwise.
 * @param z - Their z.
 * @param uv - The texture coordinates of a point, or none.
 * @returns The arrays, and how many vertices each outline took.
 */
function flatFaces(
    outlines: readonly (readonly Point2[])[],
    z: number,
    uv?: (p: Point2) => Point2,
): { positions: number[]; indices: number[]; uvs: number[]; counts: number[] } {
    const positions: number[] = [];
    const indices: number[] = [];
    const uvs: number[] = [];
    const counts: number[] = [];
    for (const outline of outlines) {
        const base = positions.length / 3;
        for (const p of outline) {
            positions.push(p[0], p[1], z);
            if (uv !== undefined) {
                uvs.push(...uv(p));
            }
        }
        for (const [a, b, c] of earClip(outline)) {
            indices.push(base + a, base + b, base + c);
        }
        counts.push(outline.length);
    }
    return { positions, indices, uvs, counts };
}

/**
 * An unlit material that draws its mesh's colors or texture as given, from both sides.
 * @param name - Its name.
 * @param scene - The scene.
 * @returns The material.
 */
function flatMaterial(name: string, scene: Scene): StandardMaterial {
    const mat = new StandardMaterial(name, scene);
    mat.disableLighting = true;
    mat.diffuseColor = Color3.White();
    mat.emissiveColor = Color3.Black();
    mat.specularColor = Color3.Black();
    mat.backFaceCulling = false;
    return mat;
}

/**
 * The colored pieces as one mesh with a color per vertex.
 * @param pieces - The pieces.
 * @param z - The z they are drawn at.
 * @param scene - The scene.
 * @returns The mesh.
 */
function buildColored(pieces: readonly Placed[], z: number, scene: Scene): Mesh {
    const { positions, indices, counts } = flatFaces(
        pieces.map((p) => p.outline),
        z,
    );
    const colors: number[] = [];
    pieces.forEach((p, i) => {
        for (let k = 0; k < counts[i]; k++) {
            colors.push(p.rgb[0], p.rgb[1], p.rgb[2], p.opacity);
        }
    });
    const mesh = new Mesh("node-decoration", scene);
    const data = new VertexData();
    data.positions = positions;
    data.indices = indices;
    data.colors = colors;
    data.applyToMesh(mesh);
    mesh.hasVertexAlpha = pieces.some((p) => p.opacity < 1);
    mesh.material = flatMaterial("node-decoration", scene);
    const metadata: NodeDecorationMetadata = {
        nodePieces: pieces.map((p) => ({ kind: "shape", box: p.box ?? boxOf(p.outline) })),
    };
    mesh.metadata = metadata;
    return mesh;
}

/**
 * The image as a mesh textured with it: its box, or with `clip` "node" the part of the node's
 * outline the image (or, repeated, its row or column, or the whole node) covers. Its geometry is
 * built once the picture has loaded, from the picture's own size; until then its texture is not
 * ready, so no finished frame is drawn without it.
 * @param image - The node style's image block.
 * @param face - The node's face.
 * @param face.outline - Its outline.
 * @param face.width - Its width.
 * @param face.height - Its height.
 * @param scale - World units per unit of the style's lengths.
 * @param z - The z it is drawn at.
 * @param scene - The scene.
 * @returns The mesh.
 */
function buildImage(
    image: NonNullable<NodeStyleConfig["image"]>,
    face: { outline: Point2[]; width: number; height: number },
    scale: number,
    z: number,
    scene: Scene,
): Mesh {
    const mesh = new Mesh("node-image", scene);
    const mat = flatMaterial("node-image", scene);
    mat.alpha = image.opacity ?? 1;
    const repeat = image.repeat ?? "no-repeat";
    const shape = (natural: { width: number; height: number } | null): void => {
        const box = imageBox(image, face.width, face.height, natural ?? face, scale);
        const [w, h] = [box.x1 - box.x0, box.y1 - box.y0];
        const across = repeat === "repeat" || repeat === "repeat-x";
        const along = repeat === "repeat" || repeat === "repeat-y";
        const region: PieceBox = {
            x0: across ? -Infinity : box.x0,
            x1: across ? Infinity : box.x1,
            y0: along ? -Infinity : box.y0,
            y1: along ? Infinity : box.y1,
        };
        const outline =
            (image.clip ?? "node") === "node"
                ? clipToBox(face.outline, region)
                : clipToBox(
                      [
                          [box.x0, box.y0],
                          [box.x1, box.y0],
                          [box.x1, box.y1],
                          [box.x0, box.y1],
                      ],
                      region,
                  );
        const drawn = natural !== null && outline.length >= 3;
        const faces = flatFaces(drawn ? [outline] : [], z, ([x, y]) => [
            (x - box.x0) / Math.max(w, 1e-9),
            (y - box.y0) / Math.max(h, 1e-9),
        ]);
        const data = new VertexData();
        data.positions = faces.positions;
        data.indices = faces.indices;
        data.uvs = faces.uvs;
        data.applyToMesh(mesh, true);
        mesh.refreshBoundingInfo();
        const metadata: NodeDecorationMetadata = {
            // the picture's own box, as an SVG image's is whatever cuts it; a tiled picture's, the part it covers
            nodePieces: drawn ? [{ kind: "image", box: repeat === "no-repeat" ? box : boxOf(outline) }] : [],
        };
        mesh.metadata = metadata;
    };
    const sampling = image.smoothing === false ? Texture.NEAREST_SAMPLINGMODE : Texture.TRILINEAR_SAMPLINGMODE;
    /**
     * Load a picture as the material's texture: its own size shapes the mesh once it arrives; one that cannot be
     * loaded gives way to the next in line, and with none left draws nothing and holds no frame back.
     * @param sources - The URLs still to try, in order.
     */
    const load = (sources: readonly string[]): void => {
        const [src, ...rest] = sources;
        if (src === undefined) {
            mat.diffuseTexture = null;
            shape(null);
            return;
        }
        const texture: Texture = new Texture(
            src,
            scene,
            false,
            true,
            sampling,
            () => {
                const natural = texture.getBaseSize();
                shape({ width: natural.width, height: natural.height });
            },
            () => {
                texture.dispose();
                load(rest);
            },
            // Babylon.js reads a `data:` URL itself only in base64; any other (an SVG written out as text) it loads
            // as an image only when handed the URL as the picture's buffer
            src.startsWith("data:") && !src.includes(";base64,") ? src : null,
        );
        texture.hasAlpha = true;
        texture.wrapU =
            repeat === "repeat" || repeat === "repeat-x" ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE;
        texture.wrapV =
            repeat === "repeat" || repeat === "repeat-y" ? Texture.WRAP_ADDRESSMODE : Texture.CLAMP_ADDRESSMODE;
        mat.diffuseTexture = texture;
    };
    load([image.src ?? "", image.fallback ?? ""].filter((u) => u !== ""));
    mat.useAlphaFromDiffuseTexture = true;
    mesh.material = mat;
    // drawn at the node's size until the picture says its own
    shape({ width: face.width, height: face.height });
    return mesh;
}
