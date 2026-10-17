/**
 * `@graphty/graph-io/sources/rest`: the REST mapping source and its `openalex` preset.
 * Experimental. Not built yet: loading rejects with E_SOURCE_UNSUPPORTED until the REST work lands.
 * @module @graphty/graph-io/sources/rest
 */

import { defineSource } from "../define.js";
import { notBuiltYet } from "../fail.js";
import { OPENALEX_SOURCE_ID, REST_SOURCE_ID } from "../ids.js";
import { type GraphSource } from "../types.js";
import { OPENALEX_DESCRIPTOR, REST_DESCRIPTOR } from "./descriptor.js";
import { type OpenAlexParams, type RestParams } from "./params.js";

export { OPENALEX_DESCRIPTOR, REST_DESCRIPTOR } from "./descriptor.js";
export {
    type OpenAlexParams,
    type RestEdgeRule,
    type RestEntity,
    type RestMapping,
    type RestPaging,
    type RestParams,
    type RestRequest,
} from "./params.js";

/**
 * The generic REST mapping source: `params.mapping` says how to read the API. Experimental.
 * @category Network sources
 */
export const restMappingSource: GraphSource<RestParams> = defineSource<RestParams>({
    id: REST_SOURCE_ID,
    descriptor: REST_DESCRIPTOR,
    records: () => notBuiltYet(REST_SOURCE_ID),
});

/**
 * The OpenAlex preset. Experimental.
 * @category Network sources
 */
export const openalexSource: GraphSource<OpenAlexParams> = defineSource<OpenAlexParams>({
    id: OPENALEX_SOURCE_ID,
    descriptor: OPENALEX_DESCRIPTOR,
    records: () => notBuiltYet(OPENALEX_SOURCE_ID),
});
