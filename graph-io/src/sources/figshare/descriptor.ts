/**
 * The Figshare source's descriptor and params: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * Which file to load from a Figshare item. Experimental.
 * @category Network sources
 */
export interface FigshareParams {
    /** The item's number ("12345678", from `https://figshare.com/articles/dataset/<title>/12345678`). */
    readonly article: string;
    /** The file's name in the item ("network.graphml"). */
    readonly file: string;
}

/**
 * The descriptor of the `figshare` source. Experimental.
 * @category Network sources
 */
export const FIGSHARE_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Figshare",
    kind: "file-host",
    version: 1,
    defaultEndpoint: "https://api.figshare.com/v2/",
    params: [
        { name: "article", plainName: "Item", type: "string", required: true },
        { name: "file", plainName: "File", type: "string", required: true },
    ],
    features: ["list"],
});
