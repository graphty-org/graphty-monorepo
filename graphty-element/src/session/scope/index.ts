/**
 * @file Scope: which elements a piece of work is allowed to look at.
 *
 * Two things live here and they answer two different questions. `./ElementMask` is the
 * membership primitive -- one byte per element, addressed by the dense index a node or an edge
 * already carries -- and it is what makes "show me this subgraph" cost the element count rather
 * than the answer's size. `./ScopeApi` turns a scope specification into the elements it names,
 * and into the digest that answers "do these numbers still describe what is on screen?" with the
 * consumer tracking nothing.
 *
 * Nothing in this module's import graph reaches Babylon.js, Lit or the DOM.
 */

export { DEFAULT_MASK_CAPACITY, ElementMask, type MaskIdSpace } from "./ElementMask";
export {
    type ComponentLabels,
    createScopeApi,
    DEFAULT_SCOPE_SAMPLE,
    edgeSpaceOf,
    membershipDigest,
    nodeSpaceOf,
    type SavedScope,
    type ScopeApi,
    type ScopeCount,
    type ScopeCountOptions,
    type ScopeResolver,
    type ScopeSelectionSource,
    type ScopeSources,
    type ScopeVisibilitySource,
} from "./ScopeApi";
