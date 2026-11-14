# Draco glTF decoder

The library build copies Google's Draco decoder, built for the glTF `KHR_draco_mesh_compression`
extension, beside its chunks: `draco_wasm_wrapper.js` and `draco_decoder.wasm` from
`three/examples/jsm/libs/draco/gltf/` (three.js is a devDependency of graphty-element, used only
for these two files).

Copyright Google LLC. Licensed under the Apache License 2.0 (LICENSE.md in this folder).
Source: https://github.com/google/draco

graphty-element serves these files from its own package so that a compressed model never makes it
fetch a decoder from a CDN (src/models/decoders/draco.ts).
