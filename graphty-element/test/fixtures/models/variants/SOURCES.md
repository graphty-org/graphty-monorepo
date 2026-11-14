# Model variant fixtures

One folder per variant of every model format graphty-element reads or refuses, and `manifest.json`,
which says what each one should do. `generate.ts` writes all of them:

```sh
cd graphty-element && pnpm exec tsx test/fixtures/models/variants/generate.ts
```

Every file is written by the script (a 12-triangle cube, or a 6 x 6 x 6 grid of points), except
these, which no npm package can write. The script downloads each once and keeps the copy in its
folder:

| Folder                 | File                            | Source                                                                                             | License   |
| ---------------------- | ------------------------------- | -------------------------------------------------------------------------------------------------- | --------- |
| `ply-splat-compressed` | `combined_SPZv3.compressed.ply` | https://assets.babylonjs.com/splats/combined_SPZv3.compressed.ply (BabylonJS/Assets)               | CC-BY-4.0 |
| `spz`                  | `combined_SPZv3.spz`            | https://assets.babylonjs.com/splats/combined_SPZv3.spz (BabylonJS/Assets)                          | CC-BY-4.0 |
| `sog`                  | `combined_SPZv3.sog`            | https://assets.babylonjs.com/splats/combined_SPZv3.sog (BabylonJS/Assets)                          | CC-BY-4.0 |
| `gltf-ktx2`            | `cube.ktx2`                     | `dgg_basecolor.ktx2` from KhronosGroup/glTF-Sample-Assets, Models/ChronographWatch/glTF-KTX-BasisU | CC-BY-4.0 |

The GIF, WebP, AVIF and DDS pictures are converted from the script's PNG by ImageMagick's
`convert`, which the script needs when it runs.
