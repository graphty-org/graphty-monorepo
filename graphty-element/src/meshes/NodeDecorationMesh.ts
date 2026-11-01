/**
 * @file What is drawn over a node's face: its pie, its stripes and its image (`pie`, `stripes`,
 * `image` of a node style), as meshes of their own in front of the node's fill, children of the
 * node's mesh so they move, hide and go with it. Each is a source mesh cached under the node's
 * style key, so every node of one style shares it and pays for one instance.
 */
import {
    type AbstractMesh,
    Color3,
    DynamicTexture,
    type InstancedMesh,
    Mesh,
    type Scene,
    StandardMaterial,
    Texture,
    VertexData,
} from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import type { LabelTableImage } from "./labelTable";
import type { MeshCache } from "./MeshCache";
import {
    boxOf,
    chartPieces,
    clipToBox,
    type ColorPiece,
    databaseRim,
    imageBox,
    type PieceBox,
    pieSlices,
    shapeLinePieces,
    shapePartPieces,
    stripeBands,
    tableFillPieces,
} from "./nodeDecoration";
import { NodeMesh } from "./NodeMesh";
import { earClip, type Point2 } from "./shapeOutlines";

/**
 * One piece drawn over a node's face, for a reader of the drawing: its kind and its box in the node's plane. A
 * `body` piece is part of the node's own body (`shape.parts`), not something drawn over it.
 */
export interface NodeDecorationPiece {
    readonly kind: "shape" | "image" | "body";
    readonly box: PieceBox;
    /** A body piece's fill: red, green and blue, 0..1, and its opacity. */
    readonly fill?: Pick<ColorPiece, "rgb" | "opacity">;
}

/** The metadata a decoration's source mesh carries. */
export interface NodeDecorationMetadata {
    readonly nodePieces: NodeDecorationPiece[];
}

/**
 * What a node whose label is a table (`shape.labelTable`) draws over its face besides its lines and words, laid out
 * with its mesh: its backgrounds, and its first picture with its cell's alignment. Each box is in fractions of the
 * node's half width and half height from its center, y up.
 */
export interface TableDecoration {
    readonly fills: readonly { readonly box: PieceBox; readonly color: string }[];
    readonly image: {
        readonly box: PieceBox;
        readonly image: LabelTableImage;
        readonly align?: string;
        readonly valign?: string;
    } | null;
}

/** What a node's decorations are built from. */
export interface NodeDecorationOptions {
    readonly shape?: NodeStyleConfig["shape"];
    readonly border?: NodeStyleConfig["border"];
    readonly pie?: NodeStyleConfig["pie"];
    readonly stripes?: NodeStyleConfig["stripes"];
    readonly chart?: NodeStyleConfig["chart"];
    readonly image?: NodeStyleConfig["image"];
    readonly glyph?: NodeStyleConfig["glyph"];
    readonly texture?: NodeStyleConfig["texture"];
    readonly table?: TableDecoration;
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
 * @returns True with a pie, stripes, an image, or a database's rim.
 */
export function hasDecoration(o: NodeDecorationOptions): boolean {
    return (
        o.pie?.colors !== undefined ||
        o.stripes?.colors !== undefined ||
        o.chart?.values !== undefined ||
        (o.image?.src ?? "") !== "" ||
        (o.glyph?.text ?? "") !== "" ||
        (o.shape?.parts ?? "") !== "" ||
        (o.shape?.lines ?? "") !== "" ||
        (o.shape?.type === "database" && (o.border?.width ?? 0) > 0) ||
        (o.table?.fills.length ?? 0) > 0 ||
        (o.table?.image ?? null) !== null
    );
}

/**
 * Build a node's decorations: an instance of its colored pieces (pie slices and stripes), an
 * instance of its image and one of its glyph, each null when the style draws none. The caller parents
 * them to the node's mesh.
 * @param cache - The mesh cache the node's mesh came from.
 * @param key - The node's style key, with its view.
 * @param o - The node's shape, border, pie, stripes and image.
 * @param size - The node's size, when its shape gives none.
 * @param fill - The node's own mesh.
 * @param scene - The scene.
 * @returns The three instances.
 */
export function createNodeDecorations(
    cache: MeshCache,
    key: string,
    o: NodeDecorationOptions,
    size: number,
    fill: AbstractMesh,
    scene: Scene,
): { pieces: InstancedMesh | null; image: InstancedMesh | null; glyph: InstancedMesh | null } {
    if (!hasDecoration(o)) {
        return { pieces: null, image: null, glyph: null };
    }
    const face = NodeMesh.faceOf(o, size, fill);
    const z = frontOf(fill) - FRONT_STEP;
    const colored = coloredPieces(o, face);
    const pieces =
        colored.length === 0 ? null : cache.get(`node-decoration-${key}`, () => buildColored(colored, z, scene));
    const scale = NodeMesh.extentPerSize(o.shape);
    // a table's picture is drawn in its cell, in place of the node's own
    const cellImage = o.table?.image ?? null;
    const drawn = cellImage === null ? { image: o.image, face } : tableImage(cellImage, face, scale);
    const picture = drawn.image;
    const image =
        picture === undefined || (picture.src ?? "") === ""
            ? null
            : cache.get(`node-image-${key}`, () => buildImage(picture, drawn.face, scale, z - FRONT_STEP, scene));
    const glyph =
        (o.glyph?.text ?? "") === ""
            ? null
            : cache.get(`node-glyph-${key}`, () =>
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- checked just above
                  buildGlyph(o.glyph!, face, NodeMesh.extentPerSize(o.shape), z - 2 * FRONT_STEP, scene),
              );
    for (const mesh of [pieces, image, glyph]) {
        if (mesh !== null) {
            mesh.isPickable = false;
            mesh.sourceMesh.isPickable = false;
        }
    }
    return { pieces, image, glyph };
}

/** How a cell's `align` and `valign` place its picture in the room its padding leaves, 0 to 1. */
const CELL_PLACE: Readonly<Record<string, number>> = { left: 0, top: 0, right: 1, bottom: 1 };

/**
 * A table's picture as a node image drawn in its cell: the cell's room inside its padding as the face it is fitted
 * to, moved from the node's center to the room's, and scaled as `SCALE` says: at its own size (each pixel
 * `pixelSize` long), its proportions kept inside the room (`true`), stretched over it (`both`), or one side stretched
 * across it and the other at its own size (`width`, `height`), as Graphviz draws an `<IMG>` (`pos_html_img`).
 * @param cell - The picture, its room and its cell's alignment.
 * @param face - The node's face.
 * @param face.width - Its width.
 * @param face.height - Its height.
 * @param scale - World units per unit of the style's lengths.
 * @returns The image block and the face it is fitted to.
 */
function tableImage(
    cell: NonNullable<TableDecoration["image"]>,
    face: { width: number; height: number },
    scale: number,
): { image: NonNullable<NodeStyleConfig["image"]>; face: { outline: Point2[]; width: number; height: number } } {
    const [hw, hh] = [face.width / 2, face.height / 2];
    const [x0, x1, y0, y1] = [cell.box.x0 * hw, cell.box.x1 * hw, cell.box.y0 * hh, cell.box.y1 * hh];
    const [width, height] = [x1 - x0, y1 - y0];
    const { scale: how, pixelSize, src } = cell.image;
    const fit = { true: "contain", both: "fill" } as const;
    const s = scale > 0 ? scale : 1;
    return {
        image: {
            src,
            fit: how === "true" || how === "both" ? fit[how] : "none",
            ...(pixelSize === undefined ? {} : { pixelSize }),
            ...(how === "width" ? { width: width / s, autoSize: "natural" as const } : {}),
            ...(how === "height" ? { height: height / s, autoSize: "natural" as const } : {}),
            positionX: CELL_PLACE[cell.align ?? ""] ?? 0.5,
            positionY: CELL_PLACE[cell.valign ?? ""] ?? 0.5,
            offsetX: (x0 + x1) / 2 / s,
            offsetY: -(y0 + y1) / 2 / s,
            clip: "none",
        },
        face: {
            outline: [
                [-width / 2, -height / 2],
                [width / 2, -height / 2],
                [width / 2, height / 2],
                [-width / 2, height / 2],
            ],
            width,
            height,
        },
    };
}

/** How many texture pixels a glyph's font size is drawn at, whatever its size in the scene. */
const GLYPH_TEXTURE_PX = 128;

/**
 * The glyph as a mesh textured with its text: a box as wide as the text and a line and a half of the
 * font tall, centered on the node, the text's middle (canvas `textBaseline` "middle") at the node's
 * center, as vis-network draws an icon.
 * @param glyph - The node style's glyph block.
 * @param face - The node's face.
 * @param face.width - Its width.
 * @param face.height - Its height.
 * @param scale - World units per unit of the style's lengths.
 * @param z - The z it is drawn at.
 * @param scene - The scene.
 * @returns The mesh.
 */
function buildGlyph(
    glyph: NonNullable<NodeStyleConfig["glyph"]>,
    face: { width: number; height: number },
    scale: number,
    z: number,
    scene: Scene,
): Mesh {
    const text = glyph.text ?? "";
    const font = `${String(glyph.weight ?? 400)} ${String(GLYPH_TEXTURE_PX)}px ${glyph.font ?? "sans-serif"}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx !== null) {
        ctx.font = font;
    }
    const textPx = Math.max(1, Math.ceil(ctx?.measureText(text).width ?? GLYPH_TEXTURE_PX));
    const [w, h] = [textPx + GLYPH_TEXTURE_PX / 4, Math.ceil(GLYPH_TEXTURE_PX * 1.5)];
    canvas.width = w;
    canvas.height = h;
    if (ctx !== null) {
        // a canvas resized loses its state: the font again, then the text, its middle at the box's
        ctx.font = font;
        ctx.fillStyle = glyph.color ?? "#000000";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, w / 2, h / 2);
    }
    const texture = new DynamicTexture("node-glyph", canvas, scene, true);
    texture.hasAlpha = true;
    texture.update();
    // the font's size in the scene: the style's size, or the node's shorter side
    const em = glyph.size === undefined ? Math.min(face.width, face.height) : glyph.size * scale;
    const [bw, bh] = [(em * w) / GLYPH_TEXTURE_PX, (em * h) / GLYPH_TEXTURE_PX];
    const box: PieceBox = { x0: -bw / 2, y0: -bh / 2, x1: bw / 2, y1: bh / 2 };
    const outline: Point2[] = [
        [box.x0, box.y0],
        [box.x1, box.y0],
        [box.x1, box.y1],
        [box.x0, box.y1],
    ];
    const faces = flatFaces([outline], z, ([x, y]) => [(x - box.x0) / bw, (y - box.y0) / bh]);
    const mesh = new Mesh("node-glyph", scene);
    const data = new VertexData();
    data.positions = faces.positions;
    data.indices = faces.indices;
    data.uvs = faces.uvs;
    data.applyToMesh(mesh);
    const mat = flatMaterial("node-glyph", scene);
    mat.diffuseTexture = texture;
    mat.useAlphaFromDiffuseTexture = true;
    mesh.material = mat;
    // the text's own box: the ink of a line of it, as wide as it measures and as tall as its font
    const ink = (em * textPx) / GLYPH_TEXTURE_PX;
    const metadata: NodeDecorationMetadata = {
        nodePieces: [{ kind: "image", box: { x0: -ink / 2, y0: -em / 2, x1: ink / 2, y1: em / 2 } }],
    };
    mesh.metadata = metadata;
    return mesh;
}

/**
 * A colored piece, with the box a reader of the drawing gives it where that is not its outline's; `line` marks part
 * of the node's own line work (a database's rim), which a reader counts with the node's outline, not as a piece, and
 * `body` a further piece of the node's body (`shape.parts`).
 */
type Placed = ColorPiece & { readonly box?: PieceBox; readonly line?: boolean; readonly body?: boolean };

/**
 * The pieces a node draws in color over its face: its stripes, cut to its outline, and over them
 * its pie's slices, as Cytoscape.js draws them, and a database's rim.
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
    const rim =
        o.shape?.type === "database"
            ? databaseRim(o.border, face.width, face.height, NodeMesh.extentPerSize(o.shape))
            : null;
    const scale = NodeMesh.extentPerSize(o.shape);
    const [fill, fillOpacity] = solidFill(o.texture);
    const parts = shapePartPieces(o.shape, o.border, fill, face.width, face.height, scale, fillOpacity);
    return [
        // a table's backgrounds are its body, under everything else drawn over the face
        ...tableFillPieces(o.table?.fills ?? [], face.width, face.height).map((p) => ({ ...p, body: true })),
        ...parts.fills.map((p) => ({ ...p, body: true })),
        ...parts.lines.map((p) => ({ ...p, line: true })),
        ...bands,
        ...pieSlices(o.pie, face.width, face.height, scale),
        ...chartPieces(o.chart, face.width, face.height, scale),
        ...(rim === null ? [] : [{ ...rim, line: true }]),
        ...shapeLinePieces(o.shape, o.border, face.width, face.height, scale).map((p) => ({ ...p, line: true })),
    ];
}

/**
 * A node's fill as one color: its plain or solid color and that color's opacity, or none for a gradient.
 * @param texture - The node style's texture block.
 * @returns The color, or undefined, and its opacity.
 */
function solidFill(texture: NodeStyleConfig["texture"]): [string | undefined, number] {
    const color = texture?.color;
    if (typeof color === "string") {
        return [color, 1];
    }
    // ponytail: a gradient's parts are not filled; give them the gradient when a format draws one
    return color?.colorType === "solid" ? [color.value, color.opacity ?? 1] : [undefined, 1];
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
    // unlit, a fragment's color is its emissive color times its texture and vertex color
    mat.disableLighting = true;
    mat.diffuseColor = Color3.Black();
    mat.emissiveColor = Color3.White();
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
        nodePieces: pieces
            .filter((p) => p.line !== true)
            .map((p) => ({
                kind: p.body === true ? "body" : "shape",
                box: p.box ?? boxOf(p.outline),
                ...(p.body === true ? { fill: { rgb: p.rgb, opacity: p.opacity } } : {}),
            })),
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
