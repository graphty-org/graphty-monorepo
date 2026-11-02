/**
 * The planner, the candidate features and the reference resolver of a file's styles.
 */

export { featuresOf, styleFingerprint } from "./features.js";
export { MAX_STYLE_RULES, type PlanOptions, planStyles, type StyleValues } from "./plan.js";
export { matchPredicate, resolveRule, resolveStyles } from "./resolve.js";
