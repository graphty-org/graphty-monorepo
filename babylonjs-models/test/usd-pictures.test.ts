/**
 * A USD model loaded without a picture: the white stand-in is taken off every slot it fills,
 * directly or through the texture Babylon's USD loader draws from it to scale or bias it, and no
 * other texture is touched, however small.
 */

import { AssetContainer } from "@babylonjs/core/assetContainer.js";
import { NullEngine } from "@babylonjs/core/Engines/nullEngine.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { ProceduralTexture } from "@babylonjs/core/Materials/Textures/Procedurals/proceduralTexture.js";
import { RawTexture } from "@babylonjs/core/Materials/Textures/rawTexture.js";
import { Texture } from "@babylonjs/core/Materials/Textures/texture.js";
import { Scene } from "@babylonjs/core/scene.js";
import { afterEach, assert, describe, it } from "vitest";

import { drawsWithoutPicture } from "../src/index.js";
import { takeOffUsdPictures } from "../src/load/withoutPicture.js";

let scene: Scene | undefined;

afterEach(() => {
    scene?.getEngine().dispose();
    scene = undefined;
});

/**
 * A texture named as Babylon's USD loader names a picture's.
 * @param s - The scene.
 * @param name - Its file name.
 * @returns The texture.
 */
function picture(s: Scene, name: string): Texture {
    const texture = new Texture(null, s);
    texture.name = name;
    return texture;
}

/**
 * A texture processor's output drawn from one input, as the USD loader makes for a scaled map.
 * @param s - The scene.
 * @param name - Its name.
 * @param input - The picture it is drawn from.
 * @returns The output.
 */
function processed(s: Scene, name: string, input: Texture): ProceduralTexture {
    const texture = new ProceduralTexture(name, 1, "textureProcessor", s, null, false);
    texture.setTexture("textureT", input);
    return texture;
}

describe("takeOffUsdPictures", () => {
    it("takes off the stand-in and what was drawn from it, and keeps a real 1 x 1 map", () => {
        scene = new Scene(new NullEngine());
        const container = new AssetContainer(scene);

        const standIn = picture(scene, "albedo.png");
        const glow = processed(scene, "lamp emissive", standIn);
        const lamp = new PBRMaterial("lamp", scene);
        lamp.albedoTexture = standIn;
        lamp.emissiveTexture = glow;
        lamp.emissiveColor.set(1, 1, 1);

        // A second material whose roughness map is a real 1 x 1 picture, used directly and scaled.
        const tiny = picture(scene, "roughness.png");
        const scaled = processed(scene, "rock roughness", tiny);
        const constant = RawTexture.CreateRGBATexture(new Uint8Array([128, 128, 128, 255]), 1, 1, scene);
        const rock = new PBRMaterial("rock", scene);
        rock.microSurfaceTexture = scaled;
        rock.metallicTexture = tiny;
        rock.bumpTexture = constant;

        container.textures.push(standIn, glow, tiny, scaled, constant);
        container.materials.push(lamp, rock);

        takeOffUsdPictures(container, ["textures/albedo.png"]);

        assert.isNull(lamp.albedoTexture);
        assert.isNull(lamp.emissiveTexture);
        assert.deepEqual(lamp.emissiveColor.asArray(), [0, 0, 0]);
        assert.isTrue(drawsWithoutPicture(lamp));

        assert.strictEqual(rock.microSurfaceTexture, scaled);
        assert.strictEqual(rock.metallicTexture, tiny);
        assert.strictEqual(rock.bumpTexture, constant);
        assert.isFalse(drawsWithoutPicture(rock));
    });
});
