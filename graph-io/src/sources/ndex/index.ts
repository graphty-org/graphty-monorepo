/**
 * `@graphty/graph-io/sources/ndex`: the NDEx source. Experimental. Not built yet: loading rejects
 * with E_SOURCE_UNSUPPORTED until the NDEx work lands.
 * @module @graphty/graph-io/sources/ndex
 */

import { defineSource } from "../define.js";
import { notBuiltYet } from "../fail.js";
import { NDEX_SOURCE_ID } from "../ids.js";
import { type GraphSource } from "../types.js";
import { NDEX_DESCRIPTOR } from "./descriptor.js";
import { type NdexParams } from "./params.js";

export { NDEX_DESCRIPTOR } from "./descriptor.js";
export { type NdexParams } from "./params.js";

/**
 * The NDEx source. Experimental.
 * @category Network sources
 */
export const ndexSource: GraphSource<NdexParams> = defineSource<NdexParams>({
    id: NDEX_SOURCE_ID,
    descriptor: NDEX_DESCRIPTOR,
    file: () => notBuiltYet(NDEX_SOURCE_ID),
});
