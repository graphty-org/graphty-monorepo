/**
 * The Zenodo source's descriptor and params: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * Which file to load from a Zenodo record. Experimental.
 * @category Network sources
 */
export interface ZenodoParams {
    /** The record's number ("1234567", from `https://zenodo.org/records/1234567`). */
    readonly record: string;
    /** The file's name in the record ("network.graphml"). */
    readonly file: string;
}

/**
 * The descriptor of the `zenodo` source. Experimental.
 * @category Network sources
 */
export const ZENODO_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Zenodo",
    kind: "file-host",
    version: 1,
    defaultEndpoint: "https://zenodo.org/api/",
    // a token reaches restricted files; public records need none
    auth: ["bearer"],
    authRequired: "optional",
    params: [
        { name: "record", plainName: "Record", type: "string", required: true },
        { name: "file", plainName: "File", type: "string", required: true },
    ],
    features: ["list"],
});
