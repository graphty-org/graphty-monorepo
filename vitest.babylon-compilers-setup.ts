/**
 * @file Added to every browser project by `withBabylonCompilers` (vitest.babylon-compilers.mjs):
 * the page's requests for Babylon.js's GLSL compilers are answered from a local copy, never
 * cdn.babylonjs.com.
 */

import { beforeAll } from "vitest";
import { commands } from "vitest/browser";

declare module "vitest/browser" {
    interface BrowserCommands {
        /** Answer the page's requests for glslang and twgsl from the local copy. */
        serveBabylonCompilers: () => Promise<void>;
    }
}

beforeAll(async () => {
    await commands.serveBabylonCompilers();
});
