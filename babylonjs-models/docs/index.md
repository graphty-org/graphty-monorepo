# babylonjs-models

`babylonjs-models` loads 3D models into [Babylon.js](https://www.babylonjs.com/) scenes:

- **from anywhere a model comes from**: a URL, a `File`, a whole folder, a `.zip`, or bytes;
- **glTF, GLB, OBJ, STL, PLY, Gaussian splats and `.babylon`**, with Draco, meshopt and KTX2
  compression;
- **every file checked first**: a model reads only its own files, sizes are limited, and every
  problem is a code with plain-value params, never a sentence;
- **nothing fetched from a CDN**: the Draco decoder and the KTX2 transcoders ship inside the package.

The package knows nothing about graphs. Its `babylonjs-models/files` and `babylonjs-models/detect`
entry points never load Babylon.js, so they also run in Node, a Web Worker or a server.

## Read next

- [Getting started](./guide/getting-started): install it and load a model.
- [Formats](./guide/formats): the file formats it reads.
- [Checking files](./guide/files): detect, check and list models without Babylon.js.
- [Error and warning codes](./guide/codes): every code a load can report.
- [Decoders](./guide/decoders): where the Draco and KTX2 files come from, and how to serve them.
- [API reference](./api/): every exported class, function, constant and type.
