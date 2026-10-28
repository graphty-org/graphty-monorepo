/**
 * The parameters of the NDEx source (design section 12.1). Experimental. The NDEx work may add
 * optional fields only.
 */

/**
 * What to load from NDEx. Experimental.
 * @category Network sources
 */
export interface NdexParams {
    /** The network's UUID ("86719f5b-1439-11f0-9806-005056ae3c32"). */
    readonly uuid: string;
    /** The download format. @defaultValue "cx2" */
    readonly format?: "cx2" | "cx" | undefined;
    /** The node attribute that identifies a node across NDEx's two id spaces (for expand): "name", "represents". */
    readonly idAttribute?: string | undefined;
}
