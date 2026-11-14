# KTX2 transcoders

The `.wasm` files and `msc_basis_transcoder.js` are copied unchanged from the `wasm/` folder of
`@babylonjs/ktx2decoder@8.56.2` (the same version as `@babylonjs/core`), with that folder's
`license.md` as LICENSE.md here (Apache License 2.0; the Basis Universal transcoder is Binomial
LLC's, zstddec is Meta's, under the licenses that file names).

graphty-element serves them from its own package, so a KTX2 texture never makes it fetch a
transcoder from a CDN (src/models/decoders/ktx2.ts). The decoder's JavaScript still comes from
the optional peer `@babylonjs/ktx2decoder`, which a page installs to draw KTX2 textures.
