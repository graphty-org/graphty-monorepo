# Draco glTF decoder

The build (`scripts/copy-decoders.mjs`) copies Google's Draco decoder, built for the glTF
`KHR_draco_mesh_compression` extension, into `dist/wasm/`: `draco_wasm_wrapper.js` and
`draco_decoder.wasm` from `three/examples/jsm/libs/draco/gltf/` (three.js is a devDependency of
babylonjs-models, used only for these two files).

Copyright Google LLC. Licensed under the Apache License 2.0 (LICENSE.md in this folder).
Source: https://github.com/google/draco

babylonjs-models serves these files from its own package so that a compressed model never makes it
fetch a decoder from a CDN (src/decoders/draco.ts).
