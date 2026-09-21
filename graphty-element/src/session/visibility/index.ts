/**
 * @file Visibility: which nodes and edges the session considers part of the graph on screen.
 *
 * Two things live here. `./filter` is the rule engine -- what a filter and a time window mean,
 * and how either one becomes a mask -- and `./VisibilityApi` is the model a consumer holds: the
 * masks, the lazy id sets, the summary a status bar reads, the two verbs that change what is
 * showing, and the flag that says hidden nodes should still be drawn faintly.
 *
 * The one sentence to carry away: this is the DATA scope, never the render set. Above its ceiling
 * the renderer draws fewer elements than are visible here, and analysis running "on the visible
 * graph" means this model rather than whatever happened to be drawn.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

export {
    assertVisibility,
    type CompiledVisibility,
    compileVisibility,
    type ElementTest,
    type Filter,
    type FilterDirection,
    type FilterSources,
    type FilterValueSource,
    runPass,
    runPassInSlices,
    type TimeStep,
    type TimeWindow,
    type VisibilityPass,
} from "./filter";
export {
    createVisibilityApi,
    type FilterResult,
    type SessionVisibilityApi,
    type VisibilityApi,
    type VisibilityChange,
    type VisibilitySources,
    type VisibilitySummary,
} from "./VisibilityApi";
