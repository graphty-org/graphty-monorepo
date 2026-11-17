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
function mark(material: Material): void {
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
            mark(material);
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
            mark(material);
        } else if (material instanceof PBRMaterial && material.albedoTexture === texture) {
            material.albedoTexture = null;
            mark(material);
        }
    }
}
