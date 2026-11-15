/**
 * @file The sample model catalogue: the 3D models graphty-element ships, which a style layer can
 * name in `node.model` without adding a file.
 *
 * A sample is resolved from the package when a layer first names it, never stored in a session:
 * `session.assets.list()` does not list it and a saved project names it by id only. The model
 * files and their thumbnails are in `assets/models/` (sources and licenses in its LICENSES.md).
 *
 * Each thumbnail is a 128 x 128 PNG with a transparent background, addressed with
 * `new URL(..., import.meta.url)`: the library build and `./bundle` inline it as a `data:` URL, so
 * it is reachable wherever the package runs and showing it makes no request. Only the
 * thumbnails are here; the model bytes are imported when a sample is first used, so this table
 * costs a few kilobytes.
 */

import type { AssetId } from "../session/assets/assetId";

/**
 * One sample model graphty-element ships.
 *
 * OPEN: may gain optional members in a minor release.
 */
export interface ModelDescriptor {
    /** The id a style layer names in `node.model`, such as `"asset:sample/server"`. */
    readonly id: AssetId;
    /** The model's default display name. */
    readonly plainName: string;
    /** A URL of a 128 x 128 PNG picture of the model, with a transparent background. */
    readonly thumbnail: string;
}

/** Every sample model graphty-element ships, in a stable order. */
export const MODEL_DESCRIPTORS: readonly ModelDescriptor[] = Object.freeze(
    [
        {
            id: "asset:sample/box",
            plainName: "Box",
            thumbnail: new URL("../../assets/models/box.png", import.meta.url).href,
        },
        {
            id: "asset:sample/server",
            plainName: "Server",
            thumbnail: new URL("../../assets/models/server.png", import.meta.url).href,
        },
        {
            id: "asset:sample/person",
            plainName: "Person",
            thumbnail: new URL("../../assets/models/person.png", import.meta.url).href,
        },
        {
            id: "asset:sample/tree",
            plainName: "Tree",
            thumbnail: new URL("../../assets/models/tree.png", import.meta.url).href,
        },
    ].map((descriptor) => Object.freeze(descriptor as ModelDescriptor)),
);
