# Draco glTF decoder

`draco_wasm_wrapper_gltf.js` and `draco_decoder_gltf.wasm` are Google's Draco decoder, built for
the glTF `KHR_draco_mesh_compression` extension, copied unchanged from
`three@0.182.0/examples/jsm/libs/draco/gltf/` (`draco_wasm_wrapper.js` and `draco_decoder.wasm`).

Copyright Google LLC. Licensed under the Apache License 2.0 (LICENSE.md in this folder).
Source: https://github.com/google/draco

graphty-element serves these files from its own package so that a compressed model never makes it
fetch a decoder from a CDN (src/models/decoders/draco.ts).
