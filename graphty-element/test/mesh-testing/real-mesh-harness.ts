/**
 * Scene helpers for the real-mesh tests in this directory.
 *
 * A Babylon `NullEngine` scene, a real `MeshCache`, and -- separately -- a scene that
 * `EdgeMesh.is2DMode` reports as two-dimensional, which is the only way the 2D line and 2D arrow
 * code paths are reachable at all.
 *
 * The canvas polyfill and the drawing recorder live in `./recording-canvas`, whose readers this
 * module re-exports so a test needs one import. That split exists because the polyfill is also
 * loaded by the mesh project's setup file (see `./test-setup.ts`), and a setup file must not drag
 * Babylon in.
 */

import { ArcRotateCamera, Camera, NullEngine, Scene, Vector3 } from "@babylonjs/core";

import { MeshCache } from "../../src/meshes/MeshCache";
import { installCanvasPolyfills } from "./recording-canvas";

export { drawnText, drawOps, resetRecordedCanvases } from "./recording-canvas";

installCanvasPolyfills();

/** A scene, its engine and a fresh mesh cache, wired for the 3D code paths. */
export interface MeshTestScene {
    engine: NullEngine;
    scene: Scene;
    cache: MeshCache;
    dispose: () => void;
}

/**
 * Creates a NullEngine scene for the 3D mesh paths.
 * @returns The scene, its engine, a fresh MeshCache, and a disposer.
 */
export function createMeshScene(): MeshTestScene {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const cache = new MeshCache();
    // A scene with no camera throws "No camera defined" on render, and rendering is the only way
    // to observe a label animation -- RichTextAnimator drives it from registerBeforeRender.
    // Perspective, so `EdgeMesh.is2DMode` keeps answering false here; create2DMeshScene below is
    // the deliberate opposite.
    const camera = new ArcRotateCamera("mesh-test-camera", 0, Math.PI / 3, 10, Vector3.Zero(), scene);
    scene.activeCamera = camera;

    return {
        engine,
        scene,
        cache,
        dispose: () => {
            cache.clear();
            scene.dispose();
        },
    };
}

/**
 * Creates a scene that `EdgeMesh.is2DMode` reports as two-dimensional.
 *
 * Both halves are required and neither is obvious: `is2DMode` returns true only when the active
 * camera is orthographic AND `scene.metadata.twoD` is true. Set one without the other and the 2D
 * arrow and 2D line paths are silently never taken -- which is exactly how a test can claim to
 * cover `Simple2DLineRenderer` while running the 3D renderer.
 * @returns The scene, its engine, a fresh MeshCache, and a disposer.
 */
export function create2DMeshScene(): MeshTestScene {
    const created = createMeshScene();
    const camera = new ArcRotateCamera("test-2d-camera", 0, 0, 10, Vector3.Zero(), created.scene);
    camera.mode = Camera.ORTHOGRAPHIC_CAMERA;
    created.scene.activeCamera = camera;
    created.scene.metadata = { ...(created.scene.metadata ?? {}), twoD: true };
    return created;
}
