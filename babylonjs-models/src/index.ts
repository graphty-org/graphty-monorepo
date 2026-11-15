/**
 * @file `babylonjs-models`: load a 3D model into a Babylon.js scene from a URL, files, a folder, a
 * `.zip` or bytes -- glTF and GLB (with Draco, meshopt and KTX2), OBJ with MTL, STL, PLY, Gaussian
 * splats and `.babylon` -- with every file checked first and nothing fetched from a CDN.
 * Everything in `babylonjs-models/files` is here too.
 */

export type { DecoderOptions } from "./decoders/config.js";
export { configureDecoders } from "./decoders/config.js";
export * from "./files/index.js";
export type { LoadedModel, LoadModelFilesOptions, LoadModelOptions } from "./load/loadModel.js";
export { hasReader, loadModel, loadModelFiles } from "./load/loadModel.js";
