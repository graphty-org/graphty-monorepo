/**
 * @file Touch: pinching two fingers together zooms out in 2D and 3D, one finger dragged across the
 * 3D view turns the camera, and two fingers turned spin it. Real touch input sent through the
 * browser's own input pipeline (test/helpers/real-input.ts), the render loop running, the outcome
 * read through the element's public API.
 *
 * A finger panning the 2D view, two fingers spreading to zoom in, and two fingers turning the 2D
 * view are in test/interactions/real-input.test.ts.
 */

import { assert, describe, it } from "vitest";

import { pinch, touchDrag, twist } from "../../helpers/real-input";
import { applied, camera, EMPTY, HEIGHT, mounted, spread, WIDTH } from "../helpers/mounted-element";

const CENTER = { x: WIDTH / 2, y: HEIGHT / 2 };

describe("two fingers pinched together", () => {
    it("zoom the 2D view out", async () => {
        const element = await mounted("2d");
        const gap = spread(element);

        await pinch(element, CENTER, 180, 60);
        await applied(element);

        assert.isBelow(spread(element), gap / 1.5, "the drawing shrank with the fingers");
    });

    it("zoom the 3D view out", async () => {
        const element = await mounted("3d");
        const distance = (): number => element.getCameraState().cameraDistance ?? Number.NaN;
        const before = distance();

        await pinch(element, CENTER, 180, 60);
        await applied(element);

        assert.isAbove(distance(), before, "the camera moved away");
    });
});

describe("in 3D", () => {
    it("one finger dragged across empty canvas turns the camera", async () => {
        const element = await mounted("3d");
        const before = camera(element);

        await touchDrag(element, EMPTY, { x: EMPTY.x + 100, y: EMPTY.y - 50 });
        await applied(element);

        assert.notStrictEqual(camera(element), before, "the camera turned");
        assert.isNull(element.getSelectedNode(), "a drag on empty canvas selects nothing");
    });

    it("two fingers turned spin the camera about the line of sight", async () => {
        const element = await mounted("3d");
        await element.setCameraState({ pivotRotation: { x: 0, y: 0, z: 0 } });
        await applied(element);

        await twist(element, CENTER, 120, 40);
        await applied(element);

        const rotation = element.getCameraState().pivotRotation;
        assert.isDefined(rotation);
        assert.isAbove(Math.abs(rotation.z), 0.1, "the camera spun");
    });
});
