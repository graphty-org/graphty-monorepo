/**
 * @file `babylonjs-models/files`: reading and checking a model's files without Babylon.js or the
 * DOM -- from a URL (with the files it names), files, a folder, a `.zip` or bytes -- into a file
 * set, its main file, its format and a summary of what it holds, or the coded facts that say why
 * it was refused. Everything in `babylonjs-models/detect` is here too.
 */

export * from "../detect/index.js";
export type { CheckedModel, ModelInSet, PictureFetch, RedirectGate } from "./intake.js";
export {
    checkModelFiles,
    fetchModel,
    fetchModelSet,
    isKnownWebPage,
    isWebPage,
    listModels,
    listParts,
    mainFileOf,
    readModelFiles,
    unpackZip,
    webPageParams,
} from "./intake.js";
export { DEFAULT_MODEL_LIMITS } from "./limits.js";
export { WHITE_PNG, withSkips } from "./textFormats.js";
