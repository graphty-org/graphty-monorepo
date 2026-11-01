## 0.0.3 (2026-10-31)

### 🚀 Features

- **babylonjs-map:** add blue marble with the sea floor, and an air glow that fades ([9a5a29c65a](https://github.com/graphty-org/graphty-monorepo/commit/9a5a29c65a))
- **babylonjs-map:** a sharper world image, a sun and an air glow for the globe ([6c42b319d8](https://github.com/graphty-org/graphty-monorepo/commit/6c42b319d8))
- **babylonjs-map:** a sharper world image, a sun and an air glow for the globe ([52d865086c](https://github.com/graphty-org/graphty-monorepo/commit/52d865086c))

### 🩹 Fixes

- **graphty-element:** clip planes that follow the location map, not only the graph ([#4403](https://github.com/graphty-org/graphty-monorepo/issues/4403))
- **babylonjs-map:** draw a flat map past its box as one world centered on the data ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **babylonjs-map:** keep a globe's lower layers under the tiles drawn over them ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **babylonjs-map:** draw a flat map's world once, never repeated east or west ([#3274](https://github.com/graphty-org/graphty-monorepo/issues/3274))
- **babylonjs-map:** draw a globe's tiles under a camera close to its surface ([f763911665](https://github.com/graphty-org/graphty-monorepo/commit/f763911665))

### ❤️ Thank You

- Adam Powers @apowers313

## 0.0.2 (2026-10-29)

This was a version bump only for babylonjs-map to align it with other projects, there were no code changes.

## 0.0.1 (2026-10-28)

### 🚀 Features

- **babylonjs-map:** shade a globe darker toward its rim so its map reads as a ball ([1d28b516dd](https://github.com/graphty-org/graphty-monorepo/commit/1d28b516dd))
- **babylonjs-map:** recover failed tiles, keep data across the date line, read mixed columns ([7ba8a6c7e5](https://github.com/graphty-org/graphty-monorepo/commit/7ba8a6c7e5))
- **babylonjs-map:** flat maps, globes, tile level of detail and location parsers ([206461e0f1](https://github.com/graphty-org/graphty-monorepo/commit/206461e0f1))
- **babylonjs-map:** add the babylonjs-map package with Web Mercator and a lat/lon parser ([e483ae2528](https://github.com/graphty-org/graphty-monorepo/commit/e483ae2528))

### 🩹 Fixes

- **babylonjs-map:** make the location parsers linear and drop the deploy gazetteer cache ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **graphty:** pass PR Integrity on the data branch ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- clear the SonarQube findings on the data management changes ([#3315](https://github.com/graphty-org/graphty-monorepo/issues/3315))
- **babylonjs-map:** keep the build info in dist so a clean build emits every file ([08193f3dd1](https://github.com/graphty-org/graphty-monorepo/commit/08193f3dd1))

### ❤️ Thank You

- Adam Powers @apowers313
- graphty-agent @graphty-agent