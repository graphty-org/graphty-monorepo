/**
 * Cytoscape desktop's visual style model (CX, CX2, sessions, XGMML): the style read from a file, resolved per element
 * the way Cytoscape draws it, translated into neutral rules, and neutral rules written back as a Cytoscape style.
 */

export {
    cx1Definition,
    cytoscapeCx2Aspects,
    cytoscapeCxAspect,
    type CytoscapeDialect,
    type CytoscapeEmitOptions,
    type CytoscapeEmitted,
    cytoscapeVizmapXml,
    emitCytoscapeStyle,
} from "./emit.js";
export { normalizeVisualProperties } from "./lexicon.js";
export {
    type Cx1Definition,
    type Cx1IndexedTag,
    type CytoscapeContinuousPoint,
    type CytoscapeMapping,
    type CytoscapeStyle,
    cytoscapeStyleFromCx,
    cytoscapeStyleFromCx2,
    type CytoscapeTargetStyle,
    emptyCytoscapeStyle,
    mappingFromCx1,
    mappingFromCx2,
    parseCx1Definition,
    typedKey,
} from "./mappings.js";
export {
    cytoscapeBackground,
    type CytoscapeBypass,
    type CytoscapeElements,
    type CytoscapeResolveOptions,
    resolveCytoscape,
    resolveCytoscapeBypasses,
} from "./resolve.js";
export { type CytoscapeRules, cytoscapeRules, type CytoscapeTranslateOptions } from "./translate.js";
