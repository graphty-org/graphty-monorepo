/**
 * @file Where the sample models' files are, imported only when a layer first names a sample.
 *
 * `new URL(..., import.meta.url)` is what the library build and `./bundle` inline as a `data:` URL,
 * so reading a sample makes no network request in a built package; the dev server and the tests
 * serve the file itself. The table of what the samples are, with their thumbnails, is
 * `src/catalog/models.ts`.
 */

/** Sample name (the part after `asset:sample/`) to the URL of its GLB. */
export const SAMPLE_MODEL_URLS: Readonly<Record<string, string>> = Object.freeze({
    box: new URL("../../../assets/models/box.glb", import.meta.url).href,
    server: new URL("../../../assets/models/server.glb", import.meta.url).href,
    person: new URL("../../../assets/models/person.glb", import.meta.url).href,
    tree: new URL("../../../assets/models/tree.glb", import.meta.url).href,
});
