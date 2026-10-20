/**
 * `detectAssetKind` from `./catalog` (design/rendering/node-models.md section 13.8): a drop target
 * learns whether a file is a model or a picture from its bytes, whatever it is called.
 */

import { assert, describe, it } from "vitest";

import { detectAssetKind } from "../../catalog";
import {
    ASCII_PLY,
    ASCII_STL,
    binaryStl,
    PNG_1X1,
    sphereGlb,
    triangleGltf,
    utf8,
    zip,
} from "../fixtures/models/fixtures";

const JPEG = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 16, 0x4a, 0x46, 0x49, 0x46, 0]);
const WEBP = utf8("RIFF\u0000\u0000\u0000\u0000WEBPVP8 ");
const OBJ = utf8("v 0 0 0\nv 1 0 0\nv 0 1 0\nf 1 2 3\n");

describe("detectAssetKind", () => {
    it("reads PNG, JPEG and WebP as pictures by their bytes, under any name", () => {
        for (const head of [PNG_1X1, JPEG, WEBP]) {
            assert.equal(detectAssetKind({ filename: "car.glb", head }), "image");
            assert.equal(detectAssetKind({ head }), "image");
        }
    });

    it("reads every model format as a model by its bytes, under any name", () => {
        const heads = {
            glb: sphereGlb(4, 2),
            gltf: utf8(JSON.stringify(triangleGltf())),
            obj: OBJ,
            stlAscii: ASCII_STL,
            ply: ASCII_PLY,
        };
        for (const [format, head] of Object.entries(heads)) {
            assert.equal(detectAssetKind({ head }), "model", format);
            assert.equal(detectAssetKind({ filename: "picture.png", head }), "model", format);
        }
    });

    it("reads a zip of model files as a model, under its own name or none", () => {
        const kit = zip({ "a.glb": sphereGlb(4, 2) });
        assert.equal(detectAssetKind({ head: kit }), "model");
        assert.equal(detectAssetKind({ filename: "car-kit.zip", head: kit }), "model");
    });

    it("reads a binary STL, which has no magic bytes, by its exact length when its name allows STL", () => {
        assert.equal(detectAssetKind({ head: binaryStl(2) }), "model");
        assert.equal(detectAssetKind({ filename: "part.stl", head: binaryStl(2) }), "model");
    });

    it("falls back to the name only when there are no bytes", () => {
        assert.equal(detectAssetKind({ filename: "Textures/colormap.PNG" }), "image");
        assert.equal(detectAssetKind({ filename: "police.glb" }), "model");
        assert.isUndefined(detectAssetKind({ filename: "graph.csv", head: utf8("id,label\n1,a\n") }));
        assert.isUndefined(detectAssetKind({ filename: "notes.txt" }));
    });
});
