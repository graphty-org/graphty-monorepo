# Style fidelity reference tools

The reference scenes come from these programs. They are invoked by `regenerate.sh` from a local tools
directory and never vendored into a package; only `references/dvipsnam.def` is a copied file. No
yFiles code is used anywhere: yEd files are read from their own stored geometry.

| Tool                                                                        | Version                                 | License                             | Used for                                                                                                                                                                                                                   |
| --------------------------------------------------------------------------- | --------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| @hpcc-js/wasm-graphviz                                                      | 1.29.2 (Graphviz 16.1.0)                | Apache-2.0 (Graphviz: EPL-1.0)      | `graphviz-json`: lays out and draws DOT, `-Tjson`                                                                                                                                                                          |
| Graphviz CLI (conda-forge)                                                  | 14.1.2                                  | EPL-1.0                             | `gml2gv`, `neato -n2` for the `gml2gv` and `graphviz-n2` routes; `gv2gml` writes the GML sheets of the `graphviz` route                                                                                                    |
| Gephi Toolkit                                                               | 0.11.3 (`gephi-toolkit-0.11.3-all.jar`) | CDDL-1.0 OR GPL-3.0                 | `gephi-noscale`: GEXF through Gephi's preview, run by `references/GephiExport.java`                                                                                                                                        |
| Eclipse Temurin JDK                                                         | 17.0.20.1                               | GPL-2.0 with Classpath Exception    | runs Gephi and Cytoscape                                                                                                                                                                                                   |
| Cytoscape desktop                                                           | 3.10.5, CyREST                          | LGPL-2.1                            | `cytoscape-desktop`, `cytoscape-gml`: resolved visual properties per node and edge                                                                                                                                         |
| Cytoscape.js                                                                | 3.34.3 (graph-io's devDependency)       | MIT                                 | `cyjs-computed`, `cyjs-hop`                                                                                                                                                                                                |
| Playwright Chromium                                                         | the workspace's Playwright              | Apache-2.0 (Chromium: BSD-3-Clause) | runs Cytoscape.js and draw.io headless                                                                                                                                                                                     |
| draw.io (jgraph/drawio)                                                     | 32.4.1, `mxGraphMlCodec`                | Apache-2.0                          | `drawio`: yEd GraphML through draw.io's GraphML importer                                                                                                                                                                   |
| graphology, graphology-gexf, sigma                                          | 0.26.0, 0.13.2, 4.0.1                   | MIT                                 | `sigma`: the file's own GEXF edge colors                                                                                                                                                                                   |
| networkx                                                                    | 3.7                                     | BSD-3-Clause                        | `yed-file` for GML: `read_gml`                                                                                                                                                                                             |
| OGDF (Open Graph Drawing Framework), built from source (cmake, g++)         | 2025.10 (tag `foxglove-202510`)         | GPL-2.0 OR GPL-3.0                  | `ogdf`: GML in OGDF's dialect read, written and drawn by OGDF; `ogdf-draw`: the GML draft's sheets read and drawn by OGDF as written (`oracles/tools/ogdf.mjs` builds OGDF into `tmp/ogdf/` and `ogdf-gml.cpp` against it) |
| Python                                                                      | 3.12 standard library                   | PSF-2.0                             | `yed-file` for GraphML, `pajek-file`                                                                                                                                                                                       |
| Pajek                                                                       | 6.02 (Windows build)                    | free for noncommercial use          | `pajek`: Pajek's own SVG export of the Pajek samples and specimen pages, run from a startup log file                                                                                                                       |
| Wine, xvfb-run                                                              | Wine 9.0                                | LGPL-2.1 (Wine), MIT (Xvfb)         | run Pajek headless                                                                                                                                                                                                         |
| dvipsnam.def (LaTeX graphics bundle, `drivers.dtx`, the `dvipsnames` block) | 2026-05-29                              | LPPL-1.3c                           | dvips color names for Pajek, copied unmodified into `references/dvipsnam.def`                                                                                                                                              |

Not used: the draw.io desktop CLI (its virtual display launch was not permitted here), and yEd and yEd Live, whose
license forbids using them in an automated process. draw.io stands in for yEd until the yEd sheets are exported by
hand (see "yEd's oracles" below).

sigma.js draws label sizes in canvas px over positions it fits to the canvas, so its JSON scenes
(`json-sigma-lesmis`, `json-graphology-synth`) are drawn on an 800 x 600 canvas, the one the browser
scorecard draws graphty-element on; their `command` names the canvas. The other routes draw every
length in the unit of the positions, so their 1200 x 900 canvas does not change what is judged.

## The oracles

An oracle is the program's own SVG drawing of a committed file, kept in `oracles/<sample id>.svg` with a PNG of it
and an `.oracle.json` that records the program, its version, the exact command, the file's hash and whether the
program is a stand-in for the one that wrote the file. Where the program says where it drew each node, the
`.oracle.json` records that too (`drawn`): sigma.js for its raster, and vis-network (each node's id, center and box,
from its own `getPositions` and `getBoundingBox`), which the comparator names the SVG's shapes by, since a vis-network
SVG carries no ids. One script per program makes them, from
`oracles/tools/`:

| Script                  | Program                              | Draws                                                                                  |
| ----------------------- | ------------------------------------ | -------------------------------------------------------------------------------------- |
| `cytoscape-desktop.mjs` | Cytoscape desktop 3.10.5 over CyREST | XGMML, CX, CX2 and session files, and GML through Cytoscape's GML reader (a stand-in)  |
| `graphviz.mjs`          | Graphviz 14.1.2                      | DOT files, and GML sheets through `gml2gv` (a stand-in)                                |
| `ogdf.mjs`              | OGDF 2025.10                         | GML sheets written in OGDF's dialect, and the GML draft's sheets (plain GML)           |
| `gephi.mjs`             | Gephi Toolkit 0.11.3                 | GEXF files through Gephi's Preview, one Preview setting per specimen page              |
| `pajek.mjs`             | Pajek 6.02 under Wine                | Pajek files, one Draw window option per specimen page                                  |
| `web/regenerate-web.sh` | Cytoscape.js, vis-network, sigma.js  | the JSON formats, each in headless Chromium with the pinned library (`web-oracle.mjs`) |
| `drawio.mjs`            | draw.io 32.4.1                       | yEd and yEd Live GraphML (a stand-in for yEd)                                          |
| `rasterize.mjs`         | resvg                                | the PNG of any oracle SVG, with the repository's pinned fonts                          |

Each script's header says what it needs (a tool directory, an environment variable) and takes sample ids, or none
for every sample it draws. Run `rasterize.mjs` on the SVGs it wrote, then the oracle report in graphty-element:

```bash
node graph-io/test/fidelity/oracles/tools/gephi.mjs gexf-specimen-labels
node graph-io/test/fidelity/oracles/tools/rasterize.mjs graph-io/test/fidelity/oracles/gexf-specimen-labels.svg
cd graphty-element && npx vitest run --project=fidelity test/fidelity/oracle-report.test.ts -t "gexf-specimen-labels"
```

Cytoscape desktop runs under servherd on a headless display, and only one script may drive it at a time. Start it
from the main checkout's `tmp/file-styles-corpus/scripts`, which holds `run-cytoscape.sh` (Cytoscape 3.10.5 and a
JDK unpacked under `tmp/`):

```jsonc
servherd_start({ name: "cytoscape-desktop", cwd: "<main checkout>/tmp/file-styles-corpus/scripts",
  command: "bash run-cytoscape.sh {{port}} 96" })
```

then run `CYREST_PORT=<its port> CYTOSCAPE_DISPLAY=:96 node cytoscape-desktop.mjs [sample ids]`.

## How the scorecards decide pass and fail

graphty-element runs two scorecards over these samples: the oracle scorecard (`test/fidelity/oracle-report.test.ts`,
every oracle in `oracles/`, and its CI subset `test/browser/oracle-scorecard.test.ts`) and the drawn-scene scorecard
(`test/fidelity/fidelity.test.ts`, against the reference scenes in `scenes/`). Both decide on elements, never on
decimals:

- **A sample fails when an element fails a property that its known failures do not list**: a node, edge, group,
  label or stray that passed before and fails now, or a failing element that is new. The known failures are
  `graphty-element/test/fidelity/oracle-known-failures.json` (per sample and per `<sample>@matched`, the comparison
  with graphty's nodes at the program's own positions) and the `known` lists of
  `graphty-element/test/fidelity/baseline-scores.json`.
- **An oracle sample also fails when a rate drops below its floor.** Each run writes `gate.txt` and `gate.json`
  (`graphty-element/tmp/oracle-report/` and `graphty-element/test/fidelity/out/`): every newly failing element, every
  known failure that passes now, and every pass rate that moved from its recorded value (`oracle-floors.json`, the
  `floors` of `baseline-scores.json`). On the oracle scorecard a rate judged element by element that measures below
  its floor fails the sample, unless a drop to that rate or lower is accepted with a reason in the `drops` of
  `oracle-floors.json`: adding a known failure with a reason lowers a rate as surely as a new failure does, and that
  went unseen while the rates only reported (#5319). The drawn-scene scorecard's floors stay a report.
- **Whole-picture (raster) regions** are reported when they measure more than 0.02 under their recorded value, and
  never fail a sample. Their recorded values come from SwiftShader runs only (`GRAPHTY_BROWSER_GPU` unset).
- **A property that cannot be measured any more** (no element on the other side to compare it with: an arrowhead
  graphty rightly stopped drawing, a layout no longer judged between unrelated layouts) is reported as not
  measurable, never as a failure. A known failure that is not measurable stays on the list.
- **Comparator or drawing.** `GRAPHTY_ORACLE_BASELINE=<an earlier run's tmp/oracle-report directory>` judges that run's
  drawings again with this run's comparator. Every newly failing element is then marked `drawing` (the earlier
  drawing passes it under this comparator), `comparator` (the earlier drawing fails it too under this comparator,
  though its own run passed it) or `baseline` (it failed on the earlier drawing already); without a baseline it is
  `unclassified`. Every moved pass rate is split the same way: `comparator` is the earlier drawing's rate under this
  comparator minus its own run's, `drawing` is this run's minus the earlier drawing's under this comparator. So a
  comparator change moves both sides alike and is never reported as a graphty regression. Keep a run's report
  directory (copy `graphty-element/tmp/oracle-report` away) before changing the comparator to have a baseline.

After a run, in graphty-element, and in the same commit as the change that moved it:

```bash
npm run fidelity:ratchet                                    # take off what passes, raise the recorded rates
npm run fidelity:ratchet -- --add "<why these fail now>"     # also list every unlisted failing element
npm run fidelity:ratchet -- --add "<why>" --keys <sample>,<sample>@matched --suite oracle
```

The ratchet (`graphty-element/scripts/fidelity-ratchet.ts`) takes off the known failures every element that passes
now, raises every recorded rate to what the run measured and never lowers one, and adds elements only with `--add`
and a reason, which it records in the file's `reasons` with the date, the elements and how many came from the drawing
and from the comparator. With `--add` it also accepts every oracle rate below its floor at the rate measured, with the
same reason, in `drops`, and it takes a drop off once its rate is back at its floor. It exits 1 while unlisted
failures or unaccepted drops remain. Nobody edits a decimal or a list by hand.

## yEd's oracles

yEd's license says it "may not be used as part of an automated process", so no script drives yEd or yEd Live. Every
yEd GraphML and yEd Live GraphML oracle is draw.io's drawing, marked `standIn: true`, and the comparator holds stand-ins
to their own recorded rates (`standInFloors` in `graphty-element/test/fidelity/oracle-floors.json`). To replace one with yEd's
own drawing, open the file in yEd, use File > Export > SVG at the sheet's 1200 x 900 size, save it over the
oracle's SVG, run `rasterize.mjs` on it, and set the oracle's `.oracle.json` to `program: "yEd"` with
`standIn: false`. The files and the paths they go to are listed in `oracles/ISSUES.md`, "yEd sheets to export by
hand".
