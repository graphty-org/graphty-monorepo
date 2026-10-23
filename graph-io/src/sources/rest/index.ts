/**
 * `@graphty/graph-io/sources/rest`: the REST mapping source, `restSource()` for turning a mapping
 * into a source of its own, and the `openalex` preset. Experimental: the mapping format carries
 * `version: 1`.
 * @module @graphty/graph-io/sources/rest
 */

export { OPENALEX_DESCRIPTOR, REST_DESCRIPTOR } from "./descriptor.js";
export { checkRestMapping, type RestMappingIssue, type RestMappingIssueCode } from "./mapping.js";
export { OPENALEX_MAPPING, openalexSource } from "./openalex.js";
export {
    type OpenAlexParams,
    type RestEdgeRule,
    type RestEntity,
    type RestMapping,
    type RestPaging,
    type RestParams,
    type RestRequest,
} from "./params.js";
export { DEPS_DEV_MAPPING } from "./samples/deps-dev.js";
export { STRING_MAPPING } from "./samples/string.js";
export { restMappingSource, restSource, type RestSourceInfo } from "./source.js";
