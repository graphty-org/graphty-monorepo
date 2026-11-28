/**
 * @file A Babylon.js canvas with a camera the reader can turn and zoom, and a panel showing what the
 * map reports, for the stories.
 */

import {
    ArcRotateCamera,
    Color3,
    Color4,
    Engine,
    MeshBuilder,
    Scene,
    StandardMaterial,
    Vector3,
} from "@babylonjs/core";

import type { MapSurface } from "../src/index.js";
import type { LatLon } from "../src/projection/index.js";

// The engine of the story drawn last: Storybook's html renderer has no unmount hook, so a story
// disposes the previous one's engine when it draws.
let previous: Engine | undefined;

/** A few cities the stories mark. */
export const CITIES: Readonly<Record<string, LatLon>> = {
    "New York": { lat: 40.71, lon: -74.01 },
    London: { lat: 51.51, lon: -0.13 },
    Nairobi: { lat: -1.29, lon: 36.82 },
    Tokyo: { lat: 35.68, lon: 139.69 },
    Sydney: { lat: -33.87, lon: 151.21 },
    "Rio de Janeiro": { lat: -22.91, lon: -43.17 },
    Suva: { lat: -18.14, lon: 178.44 },
};

/**
 * A `<pre>` that shows a story's result; `data-state` says when it is final.
 * @param testId - Its test id.
 * @returns The element.
 */
export function createOutput(testId: string): HTMLPreElement {
    const output = document.createElement("pre");
    output.dataset.testid = testId;
    output.style.cssText = "margin: 0; font: 12px monospace; white-space: pre-wrap;";
    return output;
}

/** A canvas with a scene, a turnable camera and a panel. */
export interface MapView {
    readonly element: HTMLElement;
    readonly scene: Scene;
    readonly output: HTMLPreElement;
    /**
     * Shows the map's tile counts and credits in the panel, and sets the panel's `data-state` to
     * `ready` once every tile is in (or `failed` once one fails).
     */
    watch(map: MapSurface): void;
    /** Puts a small red sphere at a scene position. */
    mark(position: Vector3, size: number): void;
}

/**
 * Creates the view.
 * @param options - The camera's distance from the origin and the background.
 * @param options.distance - The camera's distance from the origin.
 * @param options.background - The clear color.
 * @returns The view.
 */
export function createMapView(options: { distance: number; background: Color4 }): MapView {
    previous?.dispose();
    const element = document.createElement("div");
    element.style.cssText = "display: flex; gap: 16px; align-items: flex-start; font-family: sans-serif;";
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 480;
    canvas.style.cssText = "width: 640px; height: 480px; border: 1px solid #ccc; touch-action: none;";
    const output = createOutput("status");
    output.style.width = "320px";
    element.append(canvas, output);

    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true });
    previous = engine;
    const scene = new Scene(engine);
    scene.clearColor = options.background;
    // Looking along +z from the -z side: north up and east right on a flat map, longitude 0 facing
    // the camera on a globe.
    const camera = new ArcRotateCamera("camera", -Math.PI / 2, Math.PI / 2, options.distance, Vector3.Zero(), scene);
    camera.minZ = 0.1;
    camera.wheelDeltaPercentage = 0.01;
    camera.attachControl();
    const red = new StandardMaterial("marker", scene);
    red.emissiveColor = new Color3(0.9, 0.1, 0.1);
    red.disableLighting = true;
    engine.runRenderLoop(() => {
        scene.render();
    });

    return {
        element,
        scene,
        output,
        watch(map) {
            map.onChangedObservable.add(() => {
                const { loading, ready, failed, errors } = map.status;
                output.textContent = JSON.stringify({ loading, ready, failed, errors, credits: map.credits }, null, 2);
                if (failed > 0) {
                    output.dataset.state = "failed";
                } else if (loading === 0 && ready > 0) {
                    output.dataset.state = "ready";
                } else {
                    delete output.dataset.state;
                }
            });
        },
        mark(position, size) {
            const sphere = MeshBuilder.CreateSphere("city", { diameter: size }, scene);
            sphere.position = position;
            sphere.material = red;
        },
    };
}
