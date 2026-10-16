# Style fidelity, side by side

A private Storybook (not published to npm) that shows, for each style fidelity sample of graph-io, three
panels at 1200 x 900:

1. **The reference picture**: the sample drawn by the program that wrote it, or the closest stand-in
   (`references/SOURCES.md` says which program drew each one and how far to trust it).
2. **graphty-element** importing the same file with its file styles (`styles: "file"`, `layout:
"recommended"`), in 2D, exactly as the scored fidelity tests in graphty-element load it.
3. **The scorecard**: graph-io's fidelity comparer scoring what graphty-element drew (read off its
   renderer) against the committed reference scenes, one row per property. Hover a row for its worst
   elements.

The stories are for looking; the scored tests in graphty-element (`test/fidelity/`) are what gate.

## Running it

Start it through servherd, which sets `PORT`:

```jsonc
servherd_start({ name: "graph-io-fidelity-storybook", cwd: "<repo>/graph-io/fidelity-stories",
  command: "npm run storybook", env: { PORT: "{{port}}", HOST: "0.0.0.0" } })
```

The reference pictures are Git LFS objects; `npm run build-storybook` pulls them first.

## Which samples have a story

Every sample in `graph-io/test/fidelity/samples.ts` and `corpus-samples.ts` that has a reference picture,
plus
`pajek-iliad`, whose story says why it has no picture (the file stores no coordinates and Pajek never ran), and
except:

- No picture yet: `gexf-synth-13-hierarchy` (Gephi refused the file; the stand-in sketch is wrong), the two
  yFiles for HTML GraphML files (`graphml-yfiles-html-ss13-tree`, `graphml-yfiles-html-stag-flowchart`), and the
  small reproduction files (`cx-repro-locked-own-size`, `cx-repro-unplaced-boxes`, `cx2-repro-shared-interaction`,
  `xgmml-repro-name-only-labels`, `gml-repro-groups-no-creator`).
- Draws differently on each load: `json-cyjs-synth-edges` (its group boxes) and `gml-bionetgen-ruleviz-pattern`
  (two captures of its story differ), left out until that is fixed.

`stories/Fidelity.stories.ts` lists one story per sample. To add one, put its picture at
`references/<sample id>.png`, add a row to `references/SOURCES.md`, and add the story.
