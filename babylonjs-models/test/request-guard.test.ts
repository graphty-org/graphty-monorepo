/**
 * The request guard a model load runs under: while a
 * load runs, a URL under a load's root that is not one of its files is refused. Every other URL --
 * a node's picture, an edge's texture -- is not the model's and passes (issue #7235).
 */

import { Tools } from "@babylonjs/core/Misc/tools.js";
import { assert, describe, it } from "vitest";

import { guardRequests, REFUSED } from "../src/load/requestGuard.js";

describe("requestGuard", () => {
    it("refuses a model reference no file answers while a load runs, and maps the load's own files", () => {
        const load = guardRequests(new Map([["car.glb", "blob:https://page/car"]]));
        try {
            assert.throws(() => Tools.PreprocessUrl(`${load.root}https://host/x.png`), REFUSED);
            assert.throws(() => Tools.PreprocessUrl(`${load.root}../other.glb`), REFUSED);
            assert.throws(() => Tools.PreprocessUrl("babylonjs-models:/999999/car.glb"), REFUSED);
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

    it("maps a web address or a path above the folder to the key the intake held its file under", () => {
        const load = guardRequests(
            new Map([
                ["car.babylon", "blob:https://page/car"],
                ["assets.example.com/environments/car.png", "blob:https://page/body"],
                ["textures/wheel.png", "blob:https://page/wheel"],
            ]),
        );
        try {
            for (const [asked, answer] of [
                ["https://assets.example.com/environments/car.png", "blob:https://page/body"],
                ["//assets.example.com/environments/car.png?v=2", "blob:https://page/body"],
                ["sub/https://assets.example.com/environments/car.png", "blob:https://page/body"],
                ["../textures/wheel.png", "blob:https://page/wheel"],
                ["%2E%2E/textures/wheel.png", "blob:https://page/wheel"],
            ]) {
                assert.strictEqual(Tools.PreprocessUrl(`${load.root}${asked}`), answer, asked);
            }
            // The outside address itself is never requested: one the set does not hold is refused.
            assert.throws(() => Tools.PreprocessUrl(`${load.root}https://elsewhere.example.org/x.png`), REFUSED);
        } finally {
            load.release();
        }
    });
});
