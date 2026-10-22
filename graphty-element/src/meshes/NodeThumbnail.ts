import { ArcRotateCamera, Color4, type Engine, type Scene, Vector3, type WebGPUEngine } from "@babylonjs/core";

import type { NodeStyleConfig } from "../config";
import { renderTargetCapture } from "../screenshot/ScreenshotCapture.js";
import { MeshCache } from "./MeshCache.js";
import { NodeMesh } from "./NodeMesh.js";

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
    // Framed by the shape's own bounds, so a wide polyhedron and a small sphere both fill it.
    const bounds = mesh.getBoundingInfo().boundingSphere;
    camera.setTarget(THUMBNAIL_AT.add(bounds.center));
    camera.radius = (bounds.radius / Math.sin(camera.fov / 2)) * FRAME_MARGIN;
    try {
        return await renderTargetCapture(engine, camera, { width: size, height: size }, 4, (texture) => {
            texture.clearColor = new Color4(0, 0, 0, 0);
        });
    } finally {
        camera.dispose();
        mesh.dispose();
        for (const each of source) {
            each.material?.dispose();
            each.dispose();
        }
    }
}
