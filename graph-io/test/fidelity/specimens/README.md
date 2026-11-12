# Style specimen sheets

Small synthetic files that sweep one file format's documented style vocabulary, one setting per element at a fixed
position, so the oracle comparator can judge graphty-element's drawing of every setting against the real program's
own SVG of the same sheet. The oracle is always the program's own output, never our own translation of the file.

## Layout of this directory

- `sheets.ts`: the ten sheet categories every format has, and the registry types.
- `index.ts`: every format's registry; `SPECIMEN_SAMPLES` is what the oracle tests and the fidelity Storybook read.
- `<format>/registry.ts`: one format's sheets. Each category is in exactly one of `sheets` (a file here),
  `absent` (the format has no such setting: a sentence and the documentation URL) or `pending` (not built yet).
- `<format>/<sheet id>.<ext>`: the sheet files, written by the seeded generators in `../generators/specimens/`
  (or, for Cytoscape's formats, by Cytoscape itself). A file over 256 KB is stored gzip-compressed (`.gz`).

A sheet's sample id is `<format>-<sheet id>`, for example `cytoscapejs-specimen-node-shapes`. Its oracle is
`../oracles/<sample id>.svg`, with the rasterized `.png` (`../oracles/tools/rasterize.mjs`) and the provenance in
`.oracle.json` beside it, like every other oracle. Its story is `Style Fidelity/<Format>/Specimens/<category>` in
`graph-io/fidelity-stories/stories/<format>/Specimens.stories.ts`.

## Sheet categories

| id                            | holds                                                                               |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| `specimen-node-shapes`        | every node shape                                                                    |
| `specimen-node-fills-borders` | fill colors and color syntaxes, gradients, border colors, widths and styles         |
| `specimen-node-sizes-opacity` | width, height, size scaling, node, fill and border opacity, visibility              |
| `specimen-labels`             | label text, fonts, sizes, weights, colors, positions, offsets, wrapping, outlines   |
| `specimen-edges-lines`        | edge colors, widths, line styles, curve and routing styles, bends, loops, parallels |
| `specimen-arrows`             | every arrow shape at each end, fill, size, color                                    |
| `specimen-edge-labels`        | edge label text, fonts, positions, rotation, backgrounds                            |
| `specimen-groups`             | groups, clusters, compound nodes, their boxes and labels                            |
| `specimen-images-charts`      | node images, custom graphics, charts                                                |
| `specimen-mappings-bypass`    | the same values reached through the format's mappings or defaults and per element   |

A long list is split into pages: `specimen-node-shapes`, then `specimen-node-shapes-p2`, and so on.

## Rules every sheet follows

1. One setting per element against an explicit neutral baseline: every other property is set explicitly to the
   neutral value in `../generators/sheet-layout.json`. Each sheet has one `default` specimen with nothing set.
2. Fixed positions for everything: nodes, group boxes, bends and label offsets wherever the format stores them. No
   layout runs.
3. Four small neutral corner nodes, `anchor-nw`, `anchor-ne`, `anchor-sw` and `anchor-se`, at the corners in
   `sheet-layout.json`. The comparator fits the frame on them alone.
4. Under each specimen a caption node `cap-<specimen id>` with the text `<property>=<value>`, drawn as text only
   where the format allows. The comparator ignores every `cap-*` node and its words.
5. At most 60 specimens on a 1200 x 900 sheet, on the grid `sheet-layout.json` describes
   (`sheet_layout.py`, `sheet-layout.mjs`).
6. Element ids (or names, where the program matches by name) are the setting ids: lowercase letters, digits and
   hyphens, such as `shape-diamond` or `border-style-dashed`. An edge specimen's two neutral end nodes are
   `<edge id>-s` and `<edge id>-t`.
7. The repository's pinned fonts (`visual-fonts/`) in every program that draws text.
8. Value lists come from the program's own authoritative list (its documentation or its API), so a new version
   shows up as a new or missing specimen.
