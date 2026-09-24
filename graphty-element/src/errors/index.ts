/**
 * The graphty-element error model: one class, one code union, one type guard.
 *
 * Everything the element fails at arrives as a `GraphtyError` carrying a `GraphtyErrorCode`.
 * The codes are the contract a consumer writes against; the messages are for people. Nothing
 * here imports a renderer, a DOM API or a component framework, so the whole model is available
 * from the Node-safe entry points as well as from the browser bundle.
 * @module errors
 */

export type { AccelerationErrorCode, GraphtyErrorCode } from "./codes";
export { ACCELERATION_ERROR_CODES, GRAPHTY_ERROR_CODES, isGraphtyErrorCode } from "./codes";
export type { GraphtyErrorInit, GraphtyErrorJson, GraphtyErrorSource, GraphtyErrorTarget } from "./GraphtyError";
export { GraphtyError, isGraphtyError } from "./GraphtyError";
