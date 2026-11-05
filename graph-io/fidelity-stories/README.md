# Style fidelity, side by side

A Storybook of the graph-io package (not published to npm) that shows, for each style fidelity sample of graph-io, three
panels side by side, each drawing at the oracle canvas size of 1200 x 900:

1. **The program's own drawing**: the real SVG the program that wrote the file exported (or, where that program
   cannot be run, another program's real drawing standing in for it), rasterized, from the oracle library
   `graph-io/test/fidelity/oracles/`. Its caption names the program, its version and whether it is a stand-in;
   the `<sample>.oracle.json` beside each SVG records how it was made.
2. **graphty-element** importing the same file with its file styles (`styles: "file"`, `layout: "recommended"`),
   in 2D, exactly as the oracle tests in graphty-element load it.
3. **The comparator's table**: what graphty-element drew (read off its renderer) judged against that SVG, one row
   per property, with each property's passed count, rate and its recorded rate from
   `graphty-element/test/fidelity/oracle-floors.json`. Green is every element passing, amber some failing that
   `graphty-element/test/fidelity/oracle-known-failures.json` lists, red an element failing that it does not list
   (what fails the oracle tests; a rate below its recorded one never does). Hover a row for its tolerance and worst
   elements.

The stories are for looking; the oracle tests in graphty-element (`test/fidelity/oracle-report.test.ts` and the
CI subset `test/browser/oracle-scorecard.test.ts`) run the same comparison and are what gate.

## Running it

Start it through servherd, which sets `PORT`:

```jsonc
servherd_start({ name: "graph-io-fidelity-storybook", cwd: "<repo>/graph-io", protocol: "https",
  command: "env HTTPS_CERT_PATH={{httpsCert}} HTTPS_KEY_PATH={{httpsKey}} npm run storybook",
  env: { PORT: "{{port}}", HOST: "0.0.0.0" } })
```

It draws graphty-element from its source and graph-io from its build, so build graph-io (`pnpm exec nx run
graph-io:build`) after changing an importer, then reload the story.

The oracle PNGs are Git LFS objects; `npm run build-storybook` pulls them first.

## Which samples have a story

Every sample in `graph-io/test/fidelity/samples.ts` and `corpus-samples.ts` that has an oracle, plus two whose
story says why they have none (`pajek-iliad`: no coordinates and Pajek never ran; `cx2-imatinib-smpdb`:
Cytoscape's CX2 reader fails on it), except `json-cyjs-synth-edges`, which draws its group boxes differently on each load and is left out
until that is fixed.

The stories are grouped by file format (never by file extension: Cytoscape.js, vis-network, graphology and Gephi
JSON are four folders), one folder per format under `stories/<format>/`, titled "Style Fidelity/<Format>". Each
folder holds:

- `Specimens.stories.ts` ("Style Fidelity/<Format>/Specimens"): the same ten specimen sheet stories in every format,
  from node shapes to mappings and bypasses, listed in `graph-io/test/fidelity/specimens/<format>/registry.ts`
  (`graph-io/test/fidelity/specimens/README.md` describes the sheets). A sheet the format has no setting for, or
  one not built yet, shows a short placeholder saying so.
- `Samples.stories.ts` ("Style Fidelity/<Format>/Samples"): one story per real-world or older synthetic sample,
  named for the sample.

- `Matched.stories.ts` (vis-network only, "Style Fidelity/vis-network/Matched"): graphty-element drawn with its nodes at
  the program's own positions (the oracle tests' position-matched comparison), the program's drawing, graphty-element's
  and the two overlaid in the same frame, with every element failing a property the known failures do not list outlined
  and listed below with a short reason. Hover an item to pick its outline out; click it to zoom every panel onto it.
  The `sample` arg picks any vis-network sample with an oracle.

To add a sample, add its oracle to `graph-io/test/fidelity/oracles/` (`graph-io/test/fidelity/TOOLS.md` says how
each program is run) and the story to its format's `Samples.stories.ts`.

## Adding a format

A new format gets its own folder, even when it shares a file extension with another:

1. Add its specimen sheets under `graph-io/test/fidelity/specimens/<format>/` with a `registry.ts` that puts each of
   the ten categories in `sheets`, `absent` or `pending`, and list the registry in `specimens/index.ts`
   (`graph-io/test/fidelity/specimens/README.md` has the rules every sheet follows). Write the sheets with a seeded
   generator in `graph-io/test/fidelity/generators/specimens/`.
2. Make each sheet's oracle with the program that writes the format (`graph-io/test/fidelity/TOOLS.md`), and
   record its floors with the oracle report in graphty-element.
3. Copy another format's `stories/<format>/` folder, change its title to `Style Fidelity/<Format>`, and point its
   `Specimens.stories.ts` at the new registry.
