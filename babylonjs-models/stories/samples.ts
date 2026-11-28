/**
 * @file The sample models the stories load: small cubes from the package's test fixtures
 * (test/fixtures/variants), each a set of files by name, fetched through Vite's ?url.
 */

import glbTextured from "../test/fixtures/variants/glb-textured/cube.glb?url";
import gltfVertexColors from "../test/fixtures/variants/gltf-vertex-colors/cube.glb?url";
import objMtl from "../test/fixtures/variants/obj-mtl/cube.mtl?url";
import obj from "../test/fixtures/variants/obj-mtl/cube.obj?url";
import objMissingPicture from "../test/fixtures/variants/obj-mtl-missing-png/cube.mtl?url";
import objMissingPictureObj from "../test/fixtures/variants/obj-mtl-missing-png/cube.obj?url";
import plyColors from "../test/fixtures/variants/ply-ascii-colors/cube.ply?url";
import stlColored from "../test/fixtures/variants/stl-binary-colored/cube.stl?url";

/** Each sample: its files, by the name the model uses, and where Vite serves them. */
export const SAMPLES = {
    "GLB with a picture": { "cube.glb": glbTextured },
    "GLB with vertex colors": { "cube.glb": gltfVertexColors },
    "OBJ with its MTL": { "cube.obj": obj, "cube.mtl": objMtl },
    "PLY with colors": { "cube.ply": plyColors },
    "STL with colors": { "cube.stl": stlColored },
    "OBJ missing its picture": { "cube.obj": objMissingPictureObj, "cube.mtl": objMissingPicture },
} satisfies Record<string, Record<string, string>>;

export type SampleName = keyof typeof SAMPLES;

/**
 * Fetches a sample's files.
 * @param name - The sample.
 * @returns Its files by name, the `{ files }` source `loadModel` and `checkModelFiles` take.
 */
export async function fetchSample(name: SampleName): Promise<Map<string, Uint8Array<ArrayBuffer>>> {
    const entries = await Promise.all(
        Object.entries(SAMPLES[name]).map(async ([file, url]): Promise<[string, Uint8Array<ArrayBuffer>]> => {
            const response = await fetch(url);
            return [file, new Uint8Array(await response.arrayBuffer())];
        }),
    );
    return new Map(entries);
}

/**
 * A `<pre>` showing a value as JSON.
 * @param testId - Its `data-testid`.
 * @returns The element.
 */
export function createOutput(testId: string): HTMLPreElement {
    const pre = document.createElement("pre");
    pre.dataset.testid = testId;
    pre.style.cssText = "font: 12px monospace; margin: 0; padding: 8px; background: #f4f4f4; overflow: auto;";
    return pre;
}
