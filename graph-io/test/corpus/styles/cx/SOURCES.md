# CX style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx.gz` | https://public.ndexbio.org/v2/network/821a7310-beb6-11ed-a79c-005056ae23aa | CC BY 4.0 | NDEx: Phosphoproteomic interaction networks for iC3b (owner alexanderpico) |
| `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx` | https://public.ndexbio.org/v2/network/90f78bcd-1dd0-11ef-9621-005056ae23aa | CC BY 4.0 | NDEx: Schizophrenia risk gene subnetwork with AOP-Wiki (owner pklemmer) |
| `ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx.gz` | https://public.ndexbio.org/v2/network/da86cc1f-9544-11e5-b435-06603eb7f303 | CC BY 2.0 | NDEx: Parkinson's Disease Map (owner biocore-lcsb) |
| `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx.gz` | https://public.ndexbio.org/v2/network/f5fd4274-a8c1-11e8-9520-0ac135e8bacf | CC0 | NDEx: Functional gene map (owner elisa cirillo) |
| `generated/graphty-written.cx` | Written by graph-io from `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx` (in the CX corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC BY 4.0 (derived from a CC BY 4.0 file) | the network written by graph-io's CX writer with its styles, and its `graphty.styles` aspect |
| `generated/graphty-written-native-edit.cx` | Written by graph-io from `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx` (in the CX corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC BY 4.0 (derived from a CC BY 4.0 file) | the same file with one node's fill bypassed, as Cytoscape writes an edit |
| `generated/graphty-written-block-truncated.cx` | Written by graph-io from `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx` (in the CX corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC BY 4.0 (derived from a CC BY 4.0 file) | the same file with its `graphty.styles` block cut in half |
| `generated/graphty-written-block-other-graph.cx` | Written by graph-io from `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx` (in the CX corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC BY 4.0 (derived from a CC BY 4.0 file) | the same file with a block that describes a graph of one node fewer |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/syn-mappings.cx` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 96 nodes/140 edges; every feature through the style: defaults, discrete/continuous/passthrough mappings over all 9 shapes, 8 border strokes, 16 line types, 22 arrow shapes, 7 label positions, 5 fonts, label rotation/width/background/opacity, z-order, tooltips, separate arrow colors, background |
| `fidelity/syn-bypass.cx` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 64 nodes/90 edges; every feature per element (bypasses): fills, shapes, w!=h sizes, borders, opacity, labels, rotation, z, hidden nodes/edges, pie/bar/ring charts, linear/radial gradients, image custom graphics, edge bends, curved=false, edge labels, 3 groups (1 collapsed), 6 annotations |
