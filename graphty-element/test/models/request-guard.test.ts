/**
 * The request guard a model load runs under (design/rendering/node-models.md section 3.3): while a
 * load runs, a URL under a load's root that is not one of its files is refused. Every other URL --
 * a node's picture, an edge's texture -- is not the model's and passes (issue #7235).
 */

import { Tools } from "@babylonjs/core/Misc/tools.js";
import { assert, describe, it } from "vitest";

import { guardRequests, REFUSED } from "../../src/models/requestGuard";

describe("requestGuard", () => {
    it("refuses a model reference no file answers while a load runs, and maps the load's own files", () => {
        const load = guardRequests(new Map([["car.glb", "blob:https://page/car"]]));
        try {
            assert.throws(() => Tools.PreprocessUrl(`${load.root}https://host/x.png`), REFUSED);
            assert.throws(() => Tools.PreprocessUrl(`${load.root}../car.glb`), REFUSED);
            assert.throws(() => Tools.PreprocessUrl("graphty-model:/999999/car.glb"), REFUSED);
            assert.strictEqual(Tools.PreprocessUrl(`${load.root}car.glb`), "blob:https://page/car");
            // Not the model's: another picture on the page passes while the load runs.
            assert.strictEqual(Tools.PreprocessUrl("blob:https://page/picture"), "blob:https://page/picture");
            assert.strictEqual(
                Tools.PreprocessUrl("https://pictures.example.com/a.png"),
                "https://pictures.example.com/a.png",
            );
        } finally {
            load.release();
        }
        assert.strictEqual(Tools.PreprocessUrl("blob:https://page/picture"), "blob:https://page/picture");
    });
});
