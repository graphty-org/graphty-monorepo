/**
 * @file Which loaded materials lost their color picture: a picture skipped (added without it) or
 * hidden. A material that drew its color from a picture has no look of its own left without it, so
 * an application may draw that part in a color of its own choosing (`drawsWithoutPicture`).
 */

import type { AssetContainer } from "@babylonjs/core/assetContainer.js";
import type { Material } from "@babylonjs/core/Materials/material.js";
import { PBRMaterial } from "@babylonjs/core/Materials/PBR/pbrMaterial.js";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial.js";
import type { BaseTexture } from "@babylonjs/core/Materials/Textures/baseTexture.js";

import { WITHOUT_PICTURE_EXTRA } from "../files/gltfChecks.js";
import { setKeyOf } from "../files/references.js";

/** What babylonjs-models keeps on a material's `metadata`. */
interface Metadata {
    readonly babylonjsModels?: { readonly withoutPicture?: boolean };
    readonly gltf?: { readonly extras?: Readonly<Record<string, unknown>> };
}

/**
 * Whether a loaded material lost the picture that was its color (the model was loaded without it:
 * `skipped` or `withoutPictures`), so it has no look of its own left.
 * @param material - A material of a container `loadModelFiles` loaded.
 * @returns True when it lost its color picture.
 */
export function drawsWithoutPicture(material: Material): boolean {
    const metadata = material.metadata as Metadata | null | undefined;
    return (
        metadata?.babylonjsModels?.withoutPicture === true || metadata?.gltf?.extras?.[WITHOUT_PICTURE_EXTRA] === true
    );
}

/**
 * Mark a material as having lost its color picture.
 * @param material - The material.
 */
export function markWithoutPicture(material: Material): void {
    const metadata = (material.metadata ?? {}) as Record<string, unknown>;
    material.metadata = { ...metadata, babylonjsModels: { withoutPicture: true } };
}

/**
 * After a load: mark the materials that lost their color picture, and take every skipped picture
 * still drawn (a 1 x 1 white stand-in, for a format whose files are not rewritten) off its material.
 * @param container - The loaded model.
 * @param root - The load's guarded root, which every picture's URL starts with.
 * @param skipped - Parts loaded without, by their path in the set.
 * @param named - Materials known by name to have lost their color picture (an OBJ's MTL).
 */
export function markWithoutPictures(
    container: AssetContainer,
    root: string,
    skipped: readonly string[],
    named: ReadonlySet<string>,
): void {
    for (const material of container.materials) {
        if (named.has(material.name)) {
            markWithoutPicture(material);
        }
    }

    const gone = new Set(skipped.map((name) => name.toLowerCase()));
    if (gone.size === 0) {
        return;
    }

    for (const texture of container.textures) {
        const path = pathOf((texture as { url?: string | null }).url ?? "", root);
        if (path !== undefined && gone.has(path)) {
            takeOff(container, texture);
        }
    }
}

/**
 * After a load: take pictures off by the name the loader gave their textures (an FBX file's
 * embedded pictures, named by their file's base name).
 * @param container - The loaded model.
 * @param names - The pictures, by their summary names.
 */
export function takeOffByName(container: AssetContainer, names: readonly string[]): void {
    const gone = new Set(names.map((name) => name.toLowerCase()));
    for (const texture of container.textures) {
        if (gone.has(texture.name.toLowerCase())) {
            takeOff(container, texture);
        }
    }
}

/** A PBR material's picture slots, as Babylon's USD loader fills them. */
const USD_SLOTS = [
    "albedoTexture",
    "emissiveTexture",
    "bumpTexture",
    "metallicTexture",
    "microSurfaceTexture",
    "ambientTexture",
    "opacityTexture",
] as const;

/**
 * After a USD load: take every white stand-in for a picture drawn without off every slot it
 * fills, so the part draws in its plain look. Babylon names a picture's texture by its file name,
 * and a picture it had to scale or bias first is a new 1 x 1 texture (the stand-in's size). A part
 * that lost its color picture is marked; one that lost its glow picture stops glowing (the glow's
 * color was the picture's scale, white for the SoC-ElephantWithMonochord's emission map).
 * @param container - The loaded model.
 * @param gone - The pictures drawn without, by path in the set.
 */
export function takeOffUsdPictures(container: AssetContainer, gone: readonly string[]): void {
    // ponytail: matched by file name, so a kept picture with the same name in another folder is
    // taken off too; match by path once Babylon names a USD texture by its resolved path.
    const names = new Set(gone.map((path) => baseName(path)));
    if (names.size === 0) {
        return;
    }

    const standIns = new Set(container.textures.filter((t) => names.has(baseName(t.name))));
    const isStandIn = (texture: BaseTexture): boolean => {
        if (standIns.has(texture)) {
            return true;
        }
        const size = texture.getSize();
        return !("url" in texture && texture.url) && standIns.size > 0 && size.width === 1 && size.height === 1;
    };
    for (const material of container.materials) {
        if (!(material instanceof PBRMaterial)) {
            continue;
        }
        for (const slot of USD_SLOTS) {
            const texture = material[slot];
            if (texture === null || !isStandIn(texture)) {
                continue;
            }
            material[slot] = null;
            if (slot === "albedoTexture") {
                markWithoutPicture(material);
            } else if (slot === "emissiveTexture") {
                material.emissiveColor.set(0, 0, 0);
            }
        }
    }
}

/**
 * A path's last part, lowercased.
 * @param path - The path.
 * @returns Its file name.
 */
function baseName(path: string): string {
    return path.slice(path.lastIndexOf("/") + 1).toLowerCase();
}

/**
 * A picture's path in the set, lowercased, from its URL under the load's root.
 * @param url - The picture's URL.
 * @param root - The load's guarded root.
 * @returns The path, or undefined for a URL not under the root.
 */
function pathOf(url: string, root: string): string | undefined {
    if (!url.startsWith(root)) {
        return undefined;
    }

    let path = url.slice(root.length);
    try {
        path = decodeURIComponent(path);
    } catch {
        // Kept as it is.
    }
    return (setKeyOf(path) ?? path).toLowerCase();
}

/**
 * Take a picture off every material that draws it as its color, and mark those materials.
 * @param container - The loaded model.
 * @param texture - The picture.
 */
function takeOff(container: AssetContainer, texture: BaseTexture): void {
    for (const material of container.materials) {
        if (material instanceof StandardMaterial && material.diffuseTexture === texture) {
            material.diffuseTexture = null;
            markWithoutPicture(material);
        } else if (material instanceof PBRMaterial && material.albedoTexture === texture) {
            material.albedoTexture = null;
            markWithoutPicture(material);
        }
    }
}
