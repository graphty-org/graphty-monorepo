# The assets member

`kind: "graphty-assets"`, version 1. Schema: [assets.schema.json](assets.schema.json). It holds the
3D model files and pictures a document's style layers name in `node.model` and `node.texture`,
embedded exactly as they were given (or, on request, kept by URL and digest), so a saved project opens anywhere, offline, with its models drawn. The container rules are
in [container.md](container.md); edge-case rulings are rows of [conformance.md](conformance.md),
"Assets". The design behind it is `design/rendering/node-models.md`, section 7.3.

## Data model

```ts
interface AssetsMember {
    kind: "graphty-assets";
    version: 1;
    assets: AssetEntry[]; // one per model a layer names; at least one
    extensions?: Record<string, unknown>;
}

interface AssetEntry {
    id: string; // what a layer names: "asset:<sha256>" or "asset:<name>"; never "asset:sample/..."
    sha256: string; // the digest of the file set, lower-case hex ("The digest")
    format: string; // the main file's format when it was added: glb, gltf, obj, stl or ply
    main: string; // the main file's path in the set (inside the zip, for a zip)
    source?: string; // the URL a layer named, when the model came from one
    stored?: "url"; // kept by URL: no files; source is required
    files?: AssetFile[]; // absent (and not stored by URL): the files of the earlier entry with the same sha256
    skipped?: string[]; // parts drawn without: pictures and .mtl files, by path in the set; not in the digest
}

interface AssetFile {
    path: string; // slash-separated, normalized
    mediaType: string; // informative only
    byteLength: number;
    data: string; // base64 of exactly byteLength bytes
}
```

```jsonc
{
    "kind": "graphty-assets",
    "version": 1,
    "assets": [
        {
            "id": "asset:9f2c...e1",
            "sha256": "9f2c...e1",
            "format": "gltf",
            "main": "robot.gltf",
            "files": [
                { "path": "robot.gltf", "mediaType": "model/gltf+json", "byteLength": 1822, "data": "eyJhc3..." },
                {
                    "path": "robot.bin",
                    "mediaType": "application/octet-stream",
                    "byteLength": 48200,
                    "data": "AAAA...",
                },
                { "path": "skin.png", "mediaType": "image/png", "byteLength": 9104, "data": "iVBORw..." },
            ],
        },
    ],
}
```

## The digest

`sha256` is SHA-256 over the file set's canonical bytes: for each path in ascending UTF-16 code
unit order, the path's UTF-8 length as a 4-byte big-endian integer, the path's UTF-8, the content
length as an 8-byte big-endian integer, the content. An unnamed asset's id is `"asset:"` and this
digest, so the same files have the same id in every file and every release.

## Writing

1. A writer embeds every model a node style layer names: the `node.model` of its `set`, and every
   asset id (or URL the session holds) an encoding of `node.model` lists. Layers that are switched
   off count.
2. Files are written exactly as the session holds them: the set as given, after its paths were
   normalized and the one folder every file shared was removed. Nothing is converted, so ids stay
   stable.
3. One copy of the files per digest. The first entry with a `sha256` carries `files`; a later entry
   with the same `sha256` (the same files under another name, or fetched from another URL) carries
   none.
4. The samples (`asset:sample/...`) are never embedded: every reader ships them.
5. A layer that named a URL keeps naming it; its entry carries the URL as `source`. A model the
   session does not hold -- a URL that never loaded, an id with no accepted model -- is not
   embedded, and the save reports `W_MODEL_NOT_EMBEDDED { ref, layerIds }`.
6. At most 64 MB of file bytes per document, counted once per digest. A model that would pass it is
   left out and reported as `E_MODEL_TOO_LARGE { what: "documentBytes", found, limit, id }`.
7. A model or picture a layer names by URL is kept by URL instead when the caller asks
   (`project.save({ assets: { [url]: "url" } })`): the entry carries `source`, `sha256`, `format`,
   `main` and `"stored": "url"`, and no files. A model whose parts were supplied one by one
   (`assets.supply`) has no one URL that brings it back: it is embedded anyway, and the save reports
   `W_MODEL_NOT_KEPT_BY_URL { url, reason: "parts" }`. A part's URL is never written.
8. A writer writes the member only when it holds an entry, and then lists `graphty-assets` in the
   document's `requires`: the layers would draw their placeholder shapes without it, and an older
   reader that skipped it would drop the models when it saved the file back.

## Reading

The assets member is applied first, whatever its position in `members`, so every layer that names
an asset finds it.

1. **The member is closed.** A member other than `kind`, `version`, `assets` and `extensions`, or an
   `assets` that is not an array, refuses the member, `E_BAD_DOCUMENT` naming the pointer; since
   the kind is in `requires`, that refuses the file (container.md, "Reading a file" rule 8).
2. **The document cap is checked before anything is decoded.** When the `data` strings of every
   file together are longer than the base64 of 64 MB, the member is refused,
   `E_MODEL_TOO_LARGE { what: "documentBytes", found, limit }`, and with it the file, before the
   session changes.
3. **Each entry is closed and read on its own**, one at a time. An entry or a file with a member its
   schema does not list, or a value of the wrong type, skips that entry, `E_BAD_DOCUMENT` with its
   pointer; reading bytes under an instruction the reader ignored (`"encoding": "gzip"`) would give
   other bytes.
4. **The limits hold before decoding.** The `byteLength`s of an entry's files together are held to
   the page's per-model limit (`maxBytes`), `E_MODEL_TOO_LARGE { what: "bytes" }`. Every `data`
   must be exactly the base64 length of its `byteLength` and decode to that many bytes.
5. **The digest is checked.** Bytes whose digest is not the entry's `sha256`, a path that is not
   normalized or a folder every file shares, or an id of the form `asset:<64 hex digits>` that is
   not `asset:` and the `sha256`, refuse the entry, `E_MODEL_DIGEST_MISMATCH { id }`.
6. **Then the files are added as a dropped file is** (`session.assets.add`, with the entry's `id`
   as the name and `main` as the main file): format detected from the bytes, every reference
   checked against the set, the structure, triangle, texture and session byte limits. A refusal
   there is the entry's problem with its `E_MODEL_*` code. An entry's `skipped` parts are applied
   first, as `add`'s `skipped` option: the model is drawn without them and asks for nothing. A
   `skipped` that is not a list of normalized paths, or names a geometry part, skips the entry,
   `E_BAD_DOCUMENT` at `/assets/<n>/skipped`.
7. **An id held by other files** is `E_MODEL_NAME_TAKEN`, never a replacement; one held by the same
   files is the same model. An id under `asset:sample/` is `E_MODEL_NAME_TAKEN`.
8. **A `source`** makes the URL resolve to the entry's files: a layer naming that URL draws the
   embedded copy and fetches nothing, whatever the page allowed. The embedded copy wins over the
   URL.
9. **An entry stored by URL** adds nothing: the URL loads when a layer names it and the reader
   allows it (`session.network`), and a file whose digest is not the entry's `sha256` is drawn and
   reported with `W_MODEL_CHANGED { url, expected, found }`. An entry with `stored` but no `source`,
   or with both `stored` and `files`, is skipped, `E_BAD_DOCUMENT`.
10. A skipped entry is reported in the open's problems as `{ code, params: { kind: "graphty-assets",
id, ... } }`; a layer naming it draws its placeholder shape and reports `E_MODEL_UNKNOWN_ASSET`.

## Autosave

graphty-element's autosave writes each model's files in a part of its own, named by its digest, and
the member without its files with the other members. A style change rewrites none of the files;
reassembled, the parts are exactly the file `session.project.save()` writes.
