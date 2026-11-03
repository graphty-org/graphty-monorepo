/**
 * The request guard a model load runs under (design/rendering/node-models.md section 3.3): while a
 * load runs, every URL Babylon.js asks for that is not one of its files is refused. The element's
 * own pictures (`node.texture`) are decoded from their bytes and ask for no URL, so a picture that
 * decodes beside a load is never refused.
 */

import { Tools } from "@babylonjs/core/Misc/tools.js";
import { assert, describe, it } from "vitest";

import { guardRequests, REFUSED } from "../../src/models/requestGuard";

describe("requestGuard", () => {
    it("refuses a URL no load owns while a load runs, and maps the load's own files", () => {
        const load = guardRequests(new Map([["car.glb", "blob:https://page/car"]]));
        try {
            assert.throws(() => Tools.PreprocessUrl("blob:https://page/picture"), REFUSED);
            assert.strictEqual(Tools.PreprocessUrl(`${load.root}car.glb`), "blob:https://page/car");
        } finally {
            load.release();
        }
        assert.strictEqual(Tools.PreprocessUrl("blob:https://page/picture"), "blob:https://page/picture");
    });
});
