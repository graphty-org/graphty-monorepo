/**
 * @file A Babylon.js canvas that shows one model at a time, for the stories.
 */

import { ArcRotateCamera, Color4, Engine, Scene } from "@babylonjs/core";

import { loadModel, type LoadModelOptions, ModelError, type ModelSource } from "../src/index.js";
import { createOutput } from "./samples.js";

// The engine of the story drawn last: Storybook's html renderer has no unmount hook, so a story
// disposes the previous one's engine when it draws.
let previous: Engine | undefined;

/** A canvas, and what was loaded into it. */
export interface Viewer {
    readonly element: HTMLElement;
    /** Loads a model in place of the one shown, and shows what `loadModel` returned. */
    show(source: ModelSource, options?: LoadModelOptions): Promise<void>;
}

/**
 * Creates the viewer.
 * @returns The viewer.
 */
export function createViewer(): Viewer {
    previous?.dispose();
    const element = document.createElement("div");
    element.style.cssText = "display: flex; gap: 16px; align-items: flex-start; font-family: sans-serif;";
    const canvas = document.createElement("canvas");
    canvas.width = 480;
    canvas.height = 400;
    canvas.style.cssText = "width: 480px; height: 400px; border: 1px solid #ccc; touch-action: none;";
    const output = createOutput("result");
    output.style.width = "360px";
    element.append(canvas, output);

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    previous = engine;
    let scene: Scene | undefined;
    // a scene draws once its model is in and the camera made
    engine.runRenderLoop(() => {
        if (scene?.activeCamera) {
            scene.render();
        }
    });

    return {
        element,
        async show(source, options) {
            scene?.dispose();
            scene = new Scene(engine);
            scene.clearColor = new Color4(1, 1, 1, 1);
            delete output.dataset.state;
            output.textContent = "loading";
            try {
                const { container, summary, warnings } = await loadModel(scene, source, options);
                container.addAllToScene();
                scene.createDefaultCameraOrLight(true, true, true);
                const camera = scene.activeCamera;
                if (camera instanceof ArcRotateCamera) {
                    camera.alpha = Math.PI / 4;
                    camera.beta = Math.PI / 3;
                }
                await scene.whenReadyAsync();
                const { format, triangles, meshes, materials, textures, upAxis } = summary;
                output.textContent = JSON.stringify(
                    { summary: { format, triangles, meshes, materials, textures, upAxis }, warnings },
                    null,
                    2,
                );
                output.dataset.state = "loaded";
            } catch (error) {
                if (!(error instanceof ModelError)) {
                    throw error;
                }
                output.textContent = JSON.stringify({ error: error.facts }, null, 2);
                output.dataset.state = "refused";
            }
        },
    };
}
