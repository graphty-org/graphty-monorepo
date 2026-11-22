# OpenUSD importer

The build (`scripts/copy-decoders.mjs`) downloads the four files of the OpenUSD importer Babylon.js
publishes for its USD loader (protocol 5) from the Babylon.js repository at commit
`5560048894661a00bdd43c63de278979c72a3ace`
(`packages/tools/babylonServer/public/babylonUsdImporter/5/`), checks each against the SHA-256
Babylon.js records for it, and copies them into `dist/wasm/`:

| File                             | Size                     |
| -------------------------------- | ------------------------ |
| `babylon-usd-importer.worker.js` | 7 KB                     |
| `babylon-usd-importer.js`        | 117 KB                   |
| `babylon-usd-importer.wasm`      | 9.1 MB (2.3 MB gzipped)  |
| `babylon-usd-importer.data`      | 0.8 MB (0.14 MB gzipped) |

They are built from [BabylonJS/babylon-usd-importer](https://github.com/BabylonJS/babylon-usd-importer)
at commit `2baa7a0` (tag `v5`):

- the importer's own code (the worker and the C++ extractor): Apache License 2.0,
  `LICENSE-babylon-usd-importer.md`;
- OpenUSD: Tomorrow Open Source Technology License 1.0 (Apache 2.0 with a different trademark
  section), with the notices of the third-party code OpenUSD bundles, `LICENSE-openusd.txt`;
- oneTBB: Apache License 2.0, `LICENSE-onetbb.txt`;
- zlib: the zlib license, `LICENSE-zlib.txt`.

babylonjs-models serves them from its own package and loads them only when a USD model is loaded
(src/decoders/usd.ts), so a USD model never makes it fetch anything from a CDN.
