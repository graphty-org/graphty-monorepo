/**
 * The GitHub source's descriptor: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * The descriptor of the `github` source. Experimental.
 * @category Network sources
 */
export const GITHUB_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "GitHub",
    kind: "file-host",
    version: 1,
    defaultEndpoint: "https://api.github.com/",
    // a token only raises the rate limit (60 requests an hour without one) and reaches private repositories
    auth: ["bearer"],
    authRequired: "optional",
    params: [
        { name: "repository", plainName: "Repository", type: "string", required: true },
        { name: "path", plainName: "File", type: "string", required: true },
        { name: "ref", plainName: "Branch, tag or commit", type: "string", advanced: true },
    ],
    features: ["list"],
});
