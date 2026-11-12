/**
 * @file The shader runtime, loaded lazily by `../chunk.ts` the first time a graph compiles a
 * shader, so a graph that names no shader never loads it.
 */

export { ShaderRuntime } from "./ShaderRuntime";
