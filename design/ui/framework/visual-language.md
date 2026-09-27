# Visual language

**Job.** Part A: when graphty's chrome uses compact-mantine's tokens and where it departs. Part B:
what the graph surface must look like, written as requirements on graphty-element. This is the view
layer's appearance. **Not here:** token values (compact-mantine's `design/figma-spec.md`), component
choice (`interface-specification.md`), behaviour at a graph size (`state-matrix.md`). **Owner:**
visual designer. **Ceiling:** 20 KB. **Validated by:** a contrast test next to
`graphty-element/src/catalog/palettes.ts` for every palette against both canvas backgrounds, and
the rules below checked on a bare embed.

**Status: stub.** The earlier round's `design/ui/object-first-ux/visual-language.md` sections 4.3 to
4.8 (accent, selection, data colour, canvas) are inputs for Parts A and B; its token values become
pointers to compact-mantine.

## Received from the conceptual model

Read in `research/archive/conceptual-model-long-form.md` under the section named.

- **Collapse** (10). A set or group can be drawn collapsed as one counted node with meta-edges, and
  expanded again. It is display state captured by a saved view; analysis never sees it.
- **View mode and camera** (5, 6.3). 2D, 3D, VR and AR draw the graph's positions for that space;
  the camera and projection are view state, saved only inside a saved view.
- **Notes drawn on the canvas** (6.2, 6.3). A note is drawn anchored to its targets and follows them
  through a re-layout; a saved view draws its own notes as callouts showing each note's first line.

## Starting positions from the studio (Part B)

- **The drawing budget is never silent.** Whenever less is drawn than the filtered graph holds
  (level of detail, sampling, aggregation), the view states the counts drawn against the counts in
  scope, and every number still describes the filtered graph.
- **The legend is complete for what is drawn**: every painted channel has an entry, and every scale
  shows its domain and whether it is categorical or ordered. A suppressed suggestion is not in it.
- **The palette follows the measurement level** (`conceptual-model.md` 3.4): categorical palettes
  only for categorical attributes, so community ids are never drawn on a ramp; sequential or
  diverging for quantitative ones. graphty-element ships 8 categorical, 7 sequential and 3 diverging
  palettes (`catalog/palettes.ts`).
- **One data colour is drawn identically** on the four colour surfaces: canvas, legend, table
  swatch and inspector.

## Sources

- `research/archive/conceptual-model-long-form.md` sections 5.5, 6.2, 6.3, 10
- `design/ui/object-first-ux/visual-language.md`
- `document-architecture.md` section 2, item 10
- `graphty-element/src/catalog/palettes.ts`
