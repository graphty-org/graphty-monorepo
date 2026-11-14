# KTX2 transcoders

The library build copies the `.wasm` files and `msc_basis_transcoder.js` from the `wasm/` folder of
the `@babylonjs/ktx2decoder` dependency beside its chunks. LICENSE.md here is that folder's
`license.md` (Apache License 2.0; the Basis Universal transcoder is Binomial LLC's, zstddec is
Meta's, under the licenses that file names).

graphty-element serves them from its own package, so a KTX2 texture never makes it fetch a
transcoder from a CDN (src/models/decoders/ktx2.ts). The decoder's JavaScript is the dependency
itself.
