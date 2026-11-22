/**
 * @file The frames one walk through a scene's labels takes to fit their textures to the screen do not grow with
 * the labels (issue #9364).
 *
 * The walk checked a fixed 256 labels a frame, so it took frames in proportion to the labels, and a graph is not
 * settled until the walk is done. Every one of those frames draws the whole graph, so settling a labeled graph cost
 * labels x graph: 3,000 labeled nodes and 12,000 arrows took 48 seconds where 750 and 3,000 took 5. Counted, never
 * timed: the frames until every label has been asked once.
 */
import { NullEngine, Scene, UniversalCamera, Vector3 } from "@babylonjs/core";
import { describe, it } from "vitest";

import { fitTexturesToScreen, type ScreenFittedTexture } from "../../src/meshes/labelTextureFit";
import { assertScalesLinearly } from "../helpers/cost";

/**
 * The frames until every one of `size` labels has been asked whether its texture fits.
 * @param size - How many labels.
 * @returns The frames.
 */
function framesForOneWalk(size: number): number {
    const scene = new Scene(new NullEngine());
    scene.activeCamera = new UniversalCamera("camera", new Vector3(0, 0, -10), scene);
    const asked = new Set<ScreenFittedTexture>();
    const labels = new Set<ScreenFittedTexture>();
    for (let at = 0; at < size; at++) {
        const label: ScreenFittedTexture = {
            fitTextureToScreen: () => {
                asked.add(label);
                return false;
            },
        };
        labels.add(label);
    }

    fitTexturesToScreen(scene, labels);
    let frames = 0;
    while (asked.size < size && frames < size) {
        scene.onBeforeRenderObservable.notifyObservers(scene);
        frames++;
    }

    scene.dispose();
    return frames;
}

describe("fitting label textures to the screen", () => {
    it("takes the same frames for one walk through the labels however many there are", async () => {
        await assertScalesLinearly(framesForOneWalk, {
            sizes: [1024, 4096],
            growth: "constant",
            counter: "frames until every label was checked once",
        });
    });
});
