# Style fidelity, side by side

A private Storybook (not published to npm) that shows, for each style fidelity sample of graph-io, three
panels side by side, each drawing at the oracle canvas size of 1200 x 900:

1. **The program's own drawing**: the real SVG the program that wrote the file exported (or, where that program
   cannot be run, another program's real drawing standing in for it), rasterized, from the oracle library
   `graph-io/test/fidelity/oracles/`. Its caption names the program, its version and whether it is a stand-in;
   the `<sample>.oracle.json` beside each SVG records how it was made.
2. **graphty-element** importing the same file with its file styles (`styles: "file"`, `layout: "recommended"`),
   in 2D, exactly as the oracle tests in graphty-element load it.
3. **The comparator's table**: what graphty-element drew (read off its renderer) judged against that SVG, one row
   per property, with each property's passed count, rate and its floor from
   `graphty-element/test/fidelity/oracle-floors.json`. Green is every element passing, amber some failing above
   the floor, red below it. Hover a row for its tolerance and worst elements.

The stories are for looking; the oracle tests in graphty-element (`test/fidelity/oracle-report.test.ts` and the
CI subset `test/browser/oracle-scorecard.test.ts`) run the same comparison and are what gate.

## Running it

Start it through servherd, which sets `PORT`:

```jsonc
servherd_start({ name: "graph-io-fidelity-storybook", cwd: "<repo>/graph-io/fidelity-stories",
  command: "npm run storybook", env: { PORT: "{{port}}", HOST: "0.0.0.0" } })
```

The oracle PNGs are Git LFS objects; `npm run build-storybook` pulls them first.

## Which samples have a story

Every sample in `graph-io/test/fidelity/samples.ts` and `corpus-samples.ts` that has an oracle, plus two whose
story says why they have none (`pajek-iliad`: no coordinates and Pajek never ran; `cx2-imatinib-smpdb`:
Cytoscape's CX2 reader fails on it), except `json-cyjs-synth-edges`, which draws its group boxes differently on each load and is left out
until that is fixed.

The stories are grouped by format, one file per format under `stories/` (`Gml.stories.ts` is "Style Fidelity/GML"),
one story per sample, named for the sample without its format. To add one, add its oracle to
`graph-io/test/fidelity/oracles/` (`graph-io/test/fidelity/TOOLS.md` says how each program is run) and the story to its
format's file.
