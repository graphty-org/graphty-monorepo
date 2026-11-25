/**
 * @file A clear-coated or sheened model draws in its own color under graphty-element's lights.
 *
 * Babylon.js 9.37.0 sets a hemispheric light's L, H and VdotH only when some light has a specular
 * color, yet clear coat and sheen read them. graphty-element's lights have black specular, so
 * unfixed, a clear-coated or sheened part (the ToyCar's body, the StainedGlassLamp's glass) drew
 * pure white. graphty-element fixes the shader include when its model chunk loads
 * (src/models/chunk.ts), so an npm consumer gets the fix with no patch of their own.
 *
 * Unfixed, sheen does not turn white: it draws a little brighter than it should, so the white check
 * alone passes without the fix. The reference check below catches both layers: it draws the model
 * again with the include computing L, H and VdotH always, as Babylon does for a light with a
 * specular color, and the two pictures must match pixel for pixel.
 */

import { ShaderStore } from "@babylonjs/core/Engines/shaderStore.js";
import { afterEach, assert, describe, it } from "vitest";

import type { Graphty } from "../../../index.js";
import { sphereGlb } from "../../fixtures/models/fixtures";
import { cleanups, countIn, drawModel, mount, pixelsChanged, readFrame } from "./helpers";

afterEach(() => {
    for (const cleanup of cleanups.splice(0).reverse()) {
        cleanup();
    }
});

/** Clearly red: the sphere's own color, lit. */
const RED = (r: number, g: number, b: number): boolean => r > 90 && r > g + 50 && r > b + 50;
/** Pure white, the unfixed shader's color. */
const WHITE = (r: number, g: number, b: number): boolean => r > 250 && g > 250 && b > 250;

/** The PBR include that sets each light's direction, by name in Babylon's ShaderStore. */
const LIGHTING_SETUP = "pbrDirectLightingSetupFunctions";

/** The guard on the hemispheric light's L, H and VdotH, fixed or not. */
const HEMISPHERIC_GUARD = /(computeHemisphericPreLightingInfo[^#]*)#if[^\n]*\n/;

/**
 * Make the hemispheric light set L, H and VdotH for every material, until the returned undo runs.
 * @returns Puts the include back.
 */
function alwaysSetHemisphericDirection(): () => void {
    const stores = [ShaderStore.IncludesShadersStore, ShaderStore.IncludesShadersStoreWGSL];
    const saved = stores.map((store) => store[LIGHTING_SETUP]);
    for (const store of stores) {
        const rewritten = store[LIGHTING_SETUP].replace(HEMISPHERIC_GUARD, "$1#ifndef GRAPHTY_NEVER_DEFINED\n");
        assert.notEqual(rewritten, store[LIGHTING_SETUP], "the hemispheric guard is in the include");
        store[LIGHTING_SETUP] = rewritten;
    }

    return () => {
        stores.forEach((store, at) => (store[LIGHTING_SETUP] = saved[at]));
    };
}

/**
 * Draw a red sphere with one coating layer on a new element.
 * @param extension - The coating's glTF extension.
 * @param values - The extension's values.
 * @returns The element.
 */
async function drawCoatedBall(extension: string, values: object): Promise<Graphty> {
    const element = await mount();
    const ball = sphereGlb(32, 16, [1, 1, 1], [0.8, 0.05, 0.05, 1], [0, 0, 0], { [extension]: values });
    await drawModel(element, new Map([["ball.glb", ball]]), [{ id: "a", x: 0 }], { "node.size": 4 });
    return element;
}

/** Each coating layer: its name, its glTF extension and the extension's values. */
const LAYERS: readonly (readonly [string, string, object])[] = [
    ["clear coat", "KHR_materials_clearcoat", { clearcoatFactor: 1, clearcoatRoughnessFactor: 0 }],
    ["sheen", "KHR_materials_sheen", { sheenColorFactor: [1, 1, 1], sheenRoughnessFactor: 0.5 }],
];

describe("a model with a coating layer under graphty-element's lights", () => {
    for (const [layer, extension, values] of LAYERS) {
        it(`draws a ${layer} part in its own color, not white`, async () => {
            const element = await drawCoatedBall(extension, values);
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

        it(`draws a ${layer} part as it draws with the hemispheric light's direction always set`, async () => {
            const shipped = await readFrame(await drawCoatedBall(extension, values));
            const restore = alwaysSetHemisphericDirection();
            cleanups.push(restore);
            const reference = await readFrame(await drawCoatedBall(extension, values));

            assert.equal(pixelsChanged(shipped, reference), 0, `the ${layer} reads the hemispheric light's direction`);
        });
    }
});
