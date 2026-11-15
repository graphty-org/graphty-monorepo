/**
 * The S3 source's descriptor and params: catalog data, available without loading the source's code.
 */

import { type SourceDescriptor } from "../types.js";

/**
 * Which file to load from a public Amazon S3 bucket. Experimental.
 * @category Network sources
 */
export interface S3Params {
    /** The bucket's name ("my-graphs"). */
    readonly bucket: string;
    /** The object's key, its path in the bucket ("data/karate.graphml"). */
    readonly key: string;
    /** The bucket's AWS Region ("us-east-2"); default the global address, which finds most buckets. */
    readonly region?: string | undefined;
}

/**
 * The descriptor of the `s3` source. Experimental.
 * @category Network sources
 */
export const S3_DESCRIPTOR: SourceDescriptor = Object.freeze({
    plainName: "Amazon S3",
    kind: "file-host",
    version: 1,
    // the address is the bucket's own, made from the bucket and the Region
    defaultEndpoint: null,
    params: [
        { name: "bucket", plainName: "Bucket", type: "string", required: true },
        { name: "key", plainName: "File", type: "string", required: true },
        { name: "region", plainName: "Region", type: "string", advanced: true },
    ],
    features: ["list"],
});
