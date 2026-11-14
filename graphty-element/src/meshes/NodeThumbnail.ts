import { ArcRotateCamera } from "@babylonjs/core/Cameras/arcRotateCamera.js";
import type { Engine } from "@babylonjs/core/Engines/engine.js";
import type { WebGPUEngine } from "@babylonjs/core/Engines/webgpuEngine.js";
import { Color4 } from "@babylonjs/core/Maths/math.color.js";
import { Vector3 } from "@babylonjs/core/Maths/math.vector.js";
import type { Scene } from "@babylonjs/core/scene.js";

import type { Channel, ChannelValue } from "../catalog/types";
import type { NodeStyleConfig } from "../config";
import type { ModelTemplate } from "../models/ModelCache";
import { renderTargetCapture } from "../screenshot/ScreenshotCapture.js";
import { MeshCache } from "./MeshCache.js";
import { NodeMesh } from "./NodeMesh.js";
import { readColor } from "./readColor.js";

/** A node shape as the style config spells it. */
type ShapeType = NonNullable<NodeStyleConfig["shape"]>["type"];

/** The layer mask bit only the thumbnail mesh and its camera carry, so nothing of the graph is drawn. */
const THUMBNAIL_MASK = 0x20000000;

/** Where the thumbnail mesh is drawn: far from any graph. */
const THUMBNAIL_AT = new Vector3(0, 50_000, 0);

/** Room around the shape, as a share of its bounding sphere. */
const FRAME_MARGIN = 1.04;

/** What a node thumbnail draws. */
export interface NodeThumbnailOptions {
    /** A node shape, as `node.shape` takes it ("box", "icosahedron"). */
    readonly shape: string;
    /** Its color, as `node.color` takes it. Defaults to a mid gray. */
    readonly color?: string;
    /** The picture's width and height, in pixels. Defaults to 32. */
    readonly size?: number;
}

/** What a model thumbnail draws (`modelThumbnail`). */
export interface ModelThumbnailOptions {
    /** The picture's width and height, in pixels. Defaults to 32. */
    readonly size?: number;
    /**
     * The node's style values, as a layer's `set` holds them: `node.color` and the `node.model*`
     * channels (Up, Turn, Fit, Center, Tint) are read, the rest are ignored.
     */
    readonly style?: Readonly<Partial<Record<Channel, ChannelValue>>>;
}

/**
 * Draw meshes alone from a three-quarter view (head on in 2D), framed by a bounding sphere, on a
 * transparent background, through a render target of the scene's own engine.
 * @param engine - The scene's engine.
 * @param scene - The graph's scene.
 * @param is2D - Whether the graph is drawn in 2D.
 * @param size - The picture's side, in pixels.
 * @param center - The sphere's center, from the thumbnail's place.
 * @param radius - The sphere's radius.
 * @returns The picture as a PNG data URL.
 */
async function drawAlone(
    engine: Engine | WebGPUEngine,
    scene: Scene,
    is2D: boolean,
    size: number,
    center: Vector3,
    radius: number,
): Promise<string> {
    // A three-quarter view, as a node in 3D is mostly seen; head on in 2D.
    const camera = new ArcRotateCamera(
        "graphty-node-thumbnail",
        is2D ? -Math.PI / 2 : -Math.PI / 3,
        is2D ? Math.PI / 2 : Math.PI / 2.8,
        1,
        THUMBNAIL_AT.clone(),
        scene,
        false,
    );
    camera.layerMask = THUMBNAIL_MASK;
    camera.minZ = 0.01;
    camera.setTarget(THUMBNAIL_AT.add(center));
    camera.radius = (radius / Math.sin(camera.fov / 2)) * FRAME_MARGIN;
    try {
        return await renderTargetCapture(engine, camera, { width: size, height: size }, 4, (texture) => {
            texture.clearColor = new Color4(0, 0, 0, 0);
        });
    } finally {
        camera.dispose();
    }
}

/**
 * One model drawn alone as a node draws it -- an instance of its template, tinted as
 * `node.modelTint` asks -- on a transparent background. The template is the caller's to dispose.
 * @param engine - The scene's engine.
 * @param scene - The graph's scene.
 * @param is2D - Whether the graph is drawn in 2D.
 * @param template - The model's template, built for the style's geometry options.
 * @param options - The size and the style values.
 * @returns The picture as a PNG data URL.
 */
export async function modelThumbnail(
    engine: Engine | WebGPUEngine,
    scene: Scene,
    is2D: boolean,
    template: ModelTemplate,
    options: ModelThumbnailOptions,
): Promise<string> {
    const size = Math.max(8, Math.round(options.size ?? 32));
    const style = options.style ?? {};
    const tinted = style["node.modelTint"] === true || style["node.modelTint"] === "replace";
    const color = typeof style["node.color"] === "string" ? style["node.color"] : undefined;
    const { rgb } = readColor(color, "#FFFFFF");
    const tint = tinted && color !== undefined ? new Color4(rgb.r, rgb.g, rgb.b, 1) : new Color4(1, 1, 1, 1);
    const shape = {
        type: "box",
        modelFit: style["node.modelFit"] === "stretch" ? "stretch" : "contain",
    } as NonNullable<NodeStyleConfig["shape"]>;
    const root = NodeMesh.createModelInstance(template, shape, "graphty-model-thumbnail");
    const parts = [root, ...root.getChildMeshes(true)];
    for (const part of parts) {
        part.layerMask = THUMBNAIL_MASK;
        part.instancedBuffers.color = tint;
    }
    root.position.copyFrom(THUMBNAIL_AT);
    root.scaling.setAll(1);
    try {
        return await drawAlone(engine, scene, is2D, size, Vector3.Zero(), template.radius);
    } finally {
        root.dispose();
    }
}

/**
 * One node drawn alone, as the graph draws it -- its mesh, material and the scene's lighting -- on a
 * transparent background, from the scene's own engine through a render target (no second WebGL
 * context). Only the thumbnail's own mesh is drawn (a layer mask the graph's meshes do not carry).
 * @param engine - The scene's engine.
 * @param scene - The graph's scene.
 * @param is2D - Whether the graph is drawn in 2D (a flat node).
 * @param options - The shape, color and size.
 * @returns The picture as a PNG data URL.
 */
export async function nodeThumbnail(
    engine: Engine | WebGPUEngine,
    scene: Scene,
    is2D: boolean,
    options: NodeThumbnailOptions,
): Promise<string> {
    const color = options.color ?? "#9E9E9E";
    const size = Math.max(8, Math.round(options.size ?? 32));
    const cache = new MeshCache();
    const mesh = NodeMesh.create(
        cache,
        { styleId: `thumbnail-${options.shape}-${color}`, is2D, size: 1 },
        // Shapes are an open list (NodeMesh.registerShapeCreator); an unknown one throws there.
        { shape: { type: options.shape as ShapeType, size: 1 }, texture: { color } },
        scene,
    );
    mesh.position.copyFrom(THUMBNAIL_AT);
    mesh.layerMask = THUMBNAIL_MASK;
    const source = [...cache.meshCacheMap.values()];
    for (const each of source) {
        each.layerMask = THUMBNAIL_MASK;
    }
    // Framed by the shape's own bounds, so a wide polyhedron and a small sphere both fill it.
    const bounds = mesh.getBoundingInfo().boundingSphere;
    try {
        return await drawAlone(engine, scene, is2D, size, bounds.center, bounds.radius);
    } finally {
        mesh.dispose();
        for (const each of source) {
            each.material?.dispose();
            each.dispose();
        }
    }
}
