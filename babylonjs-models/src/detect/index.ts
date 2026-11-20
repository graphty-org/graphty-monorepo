/**
 * @file `babylonjs-models/detect`: telling a model file from its name and first bytes, the error
 * every check and load throws, and the path rules a model's references are matched by. Small,
 * Babylon-free and DOM-free, so a drop target or a server can ask "is this a model" without
 * loading the checks or Babylon.js.
 */

export type {
    AssetKind,
    BuiltInModelFormat,
    ImageFormat,
    ModelDetection,
    ModelDetectionInput,
    ModelFormat,
} from "../files/detect.js";
export {
    assetFileExtensions,
    BUILT_IN_MODEL_FORMATS,
    detectAssetKind,
    detectModelFormat,
    imageFormatOf,
    isZip,
} from "../files/detect.js";
export { isPrivateHost } from "../files/privateHost.js";
export type { PartRole } from "../files/references.js";
export { baseName, cut as cutParam, ModelError, normalizePath, roleOfName } from "../files/references.js";
export type {
    ModelCompression,
    ModelEncoding,
    ModelFact,
    ModelFactParam,
    ModelFileOptions,
    ModelGeometry,
    ModelLimits,
    ModelPart,
    ModelPartRole,
    ModelPartState,
    ModelPicture,
    ModelProgress,
    ModelProgressListener,
    ModelSource,
    ModelSummary,
    NamedBlob,
} from "../files/types.js";
