# Uploaded Fonts

A label can be drawn in a font file the reader hands the page: a TrueType, OpenType, WOFF or WOFF2
file from a file input or a drop. `session.fonts.add` reads the file, puts its face on the page and
keeps its bytes in the project, so a saved project or style file draws its labels in the same face
on any other machine.

## Quick start

```ts
const graph = document.querySelector("graphty-element");
const input = document.querySelector("input[type=file]");

input.addEventListener("change", async () => {
    const font = await graph.session.fonts.add(input.files[0]); // "Outfit.woff2" -> family "Outfit"
    await graph.session.styles.add({
        name: "Label font",
        target: "node",
        selector: { match: "everything" },
        set: { "node.labelFont": font.family },
    });
    await graph.session.project.save(); // the font's bytes are in the file
});
```

Any label setting that names a family can name an uploaded one: `node.labelFont`,
`edge.labelFont`, a label look, or `<font='Outfit'>` in label markup. A label already drawn in a
family before its font arrived is redrawn once it does.

## Adding, listing and removing

- `fonts.add(source, { family })` takes a `File`, a `Blob`, an `ArrayBuffer` or a `Uint8Array`.
  The family defaults to the file's name without its ending, else `Font` and the first eight
  digits of the file's SHA-256. The same bytes under the same family return the font already held.
- `fonts.list()` returns every font, in the order added: `{ family, sha256, format, byteLength }`.
- `fonts.remove(family)` takes a font out; labels in it fall back to the next family in their list.

Adding and removing a font are steps in the undo history, like any style edit.

## Formats and the limit

The format is told from the file's first bytes, not its name: `ttf`, `otf`, `woff` or `woff2`. A
font file may be at most 10 MiB (`FONT_BYTE_LIMIT`).

## Where fonts are saved

Every font the project holds is saved with its bytes, once each, in:

- project files (`session.project.save()`), in their style part;
- style files and style documents (`session.styles.toFile()`, `toDocument()`); applying one adds
  its fonts, and a family the project already holds keeps its own font;
- autosave, which writes each font's bytes once and not again on every style change.

Opening a project replaces the fonts of the one before it. A font a file carries is on the page
before the file's labels are first drawn.

Without a page (Node, a worker) fonts are still recorded and saved; there is just nothing to draw
them with.

## Errors

| Code                  | When                                                                                                                   |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `E_FONT_PARSE`        | The bytes are not a TrueType, OpenType, WOFF or WOFF2 font, or the browser could not read them.                        |
| `E_FONT_TOO_LARGE`    | The file is over 10 MiB.                                                                                               |
| `E_FONT_FAMILY_TAKEN` | Another font holds the family (compared without case); pass another `family`.                                          |
| `W_FONT_NOT_LOADED`   | Reported by an open: a font the file carries could not be read here. Its labels fall back; the rest of the file opens. |
| `E_BAD_DOCUMENT`      | A style document carries a font whose bytes do not match its `sha256`.                                                 |
