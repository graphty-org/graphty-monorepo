/**
 * @file A clear-coated or sheened model draws in its own color under graphty-element's lights.
 *
 * Babylon.js 9.37.0 sets a hemispheric light's L, H and VdotH only when some light has a specular
 * color, yet clear coat and sheen read them. graphty-element's lights have black specular, so
 * unfixed, a clear-coated or sheened part (the ToyCar's body, the StainedGlassLamp's glass) drew
 * pure white. graphty-element fixes the shader include when its model chunk loads
 * (src/models/chunk.ts), so an npm consumer gets the fix with no patch of their own.
 */

import { afterEach, assert, describe, it } from "vitest";

import { sphereGlb } from "../../fixtures/models/fixtures";
import { cleanups, countIn, drawModel, mount, readFrame } from "./helpers";

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/** Clearly red: the sphere's own color, lit. */
const RED = (r: number, g: number, b: number): boolean => r > 90 && r > g + 50 && r > b + 50;
/** Pure white, the unfixed shader's color. */
const WHITE = (r: number, g: number, b: number): boolean => r > 250 && g > 250 && b > 250;

const LAYERS = {
    "clear coat": { KHR_materials_clearcoat: { clearcoatFactor: 1, clearcoatRoughnessFactor: 0 } },
    sheen: { KHR_materials_sheen: { sheenColorFactor: [1, 1, 1], sheenRoughnessFactor: 0.5 } },
};

describe("a model with a coating layer under graphty-element's lights", () => {
    for (const [layer, extensions] of Object.entries(LAYERS)) {
        it(`draws a ${layer} part in its own color, not white`, async () => {
            const element = await mount();
            const ball = sphereGlb(32, 16, [1, 1, 1], [0.8, 0.05, 0.05, 1], [0, 0, 0], extensions);
            await drawModel(element, new Map([["ball.glb", ball]]), [{ id: "a", x: 0 }], { "node.size": 4 });
            const blank = await mount();
            const background = countIn(await readFrame(blank), WHITE);

            const frame = await readFrame(element);
            const red = countIn(frame, RED);
            const white = countIn(frame, WHITE);
            assert.isAbove(red.left + red.right, 500, "the sphere is drawn red");
            assert.isAtMost(
                white.left + white.right,
                background.left + background.right,
                "no part of the sphere is white",
            );
        });
    }
});
