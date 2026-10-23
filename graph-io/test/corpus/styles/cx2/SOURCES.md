# CX2 style corpus

Real styled files whose stated license allows redistribution, and inputs generated for this project, read by
graph-io's style tests (`test/styles/harness.test.ts`). The license is the one the source states: the GitHub
repository's license, an NDEx network's `rights` property, or the project's own license text. A file over 256 KB
is stored gzip-compressed (`.gz`); the tests read it decompressed, under its name without `.gz`.
Files under `generated/` were written for this project by seeded scripts, MIT like the package.

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `generated/mapping-edges.cx2` | Generated for this project by a seeded script | MIT (generated for this project) |  |
| `ndex-1014623d-c2e0-11f1-be0a-005056ae3c32.cx2.gz` | https://public.ndexbio.org/v3/networks/1014623d-c2e0-11f1-be0a-005056ae3c32 | Apache License 2.0 (Apache-2.0) | NDEx: Metabolite exchange map between the pea aphid and Buchnera aphidicola (owner cottret, 821 nodes, 1046 edges) |
| `ndex-440c8958-1dd0-11ef-9621-005056ae23aa.cx2.gz` | https://public.ndexbio.org/v3/networks/440c8958-1dd0-11ef-9621-005056ae23aa | Attribution 4.0 International (CC BY 4.0) | NDEx: Full hierarchical schizophrenia risk gene network with genes, AOP-Wiki (owner pklemmer, 2718 nodes, 4820 edges) |
| `ndex-821a7310-beb6-11ed-a79c-005056ae23aa.cx2.gz` | https://public.ndexbio.org/v3/networks/821a7310-beb6-11ed-a79c-005056ae23aa | CC BY 4.0 | NDEx: Phosphoproteomic interaction networks for iC3b (owner alexanderpico) |
| `ndex-90f78bcd-1dd0-11ef-9621-005056ae23aa.cx2` | https://public.ndexbio.org/v3/networks/90f78bcd-1dd0-11ef-9621-005056ae23aa | CC BY 4.0 | NDEx: Schizophrenia risk gene subnetwork with AOP-Wiki (owner pklemmer) |
| `ndex-a2d9d91b-b1dc-11ec-b3be-0ac135e8bacf.cx2.gz` | https://public.ndexbio.org/v3/networks/a2d9d91b-b1dc-11ec-b3be-0ac135e8bacf | Waiver-No rights reserved (CC0) | NDEx: Orexin Receptor 1 Network (owner bbkazu0901, 468 nodes, 1713 edges) |
| `ndex-da86cc1f-9544-11e5-b435-06603eb7f303.cx2.gz` | https://public.ndexbio.org/v3/networks/da86cc1f-9544-11e5-b435-06603eb7f303 | CC BY 2.0 | NDEx: Parkinson's Disease Map (owner biocore-lcsb) |
| `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2` | https://public.ndexbio.org/v3/networks/f5fd4274-a8c1-11e8-9520-0ac135e8bacf | CC0 | NDEx: Functional gene map (owner elisa cirillo) |
| `generated/graphty-written.cx2` | Written by graph-io from `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2` (in the CX2 corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC0 (derived from a CC0 file) | the network written by graph-io's CX2 writer with its styles, and its `graphty.styles` aspect |
| `generated/graphty-written-native-edit.cx2` | Written by graph-io from `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2` (in the CX2 corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC0 (derived from a CC0 file) | the same file with one node's fill bypassed, as Cytoscape writes an edit |
| `generated/graphty-written-block-truncated.cx2` | Written by graph-io from `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2` (in the CX2 corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC0 (derived from a CC0 file) | the same file with its `graphty.styles` block cut in half |
| `generated/graphty-written-block-other-graph.cx2` | Written by graph-io from `ndex-f5fd4274-a8c1-11e8-9520-0ac135e8bacf.cx2` (in the CX2 corpus), then edited by the helpers in `test/styles/formats/cx.ts` | CC0 (derived from a CC0 file) | the same file with a block that describes a graph of one node fewer |

## Style fidelity fixtures

Files scored against the drawing of the program that wrote them (`graph-io/test/fidelity/corpus-samples.ts`, reference
scenes in `graph-io/test/fidelity/scenes/<sample id>/`). Generated files were written by the seeded scripts in
`graph-io/test/fidelity/generators/`, MIT like the package.

On 2026-10-16 the owner chose to commit every file of the style fidelity corpus regardless of its license, so some files below state no license, or one that does not allow redistribution; each row gives the license its source states, or "none stated".

| File | Source | License | What it is |
| --- | --- | --- | --- |
| `fidelity/syn-mappings.cx2` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 96 nodes/140 edges; every feature through the style: defaults, discrete/continuous/passthrough mappings over all 9 shapes, 8 border strokes, 16 line types, 22 arrow shapes, 7 label positions, 5 fonts, label rotation/width/background/opacity, z-order, tooltips, separate arrow colors, background |
| `fidelity/syn-bypass.cx2` | built in Cytoscape 3.10.5 by generators/build-synthetic.mjs over CyREST, saved by Cytoscape | MIT (generated for this project) | 64 nodes/90 edges; every feature per element (bypasses): fills, shapes, w!=h sizes, borders, opacity, labels, rotation, z, hidden nodes/edges, pie/bar/ring charts, linear/radial gradients, image custom graphics, edge bends, curved=false, edge labels, 3 groups (1 collapsed), 6 annotations |
| `fidelity/wp1449-tlr.cx2` | https://public.ndexbio.org/v3/networks/1bd41238-5c68-11ec-b3be-0ac135e8bacf | CC0-1.0 | WikiPathways diagram: graphical label nodes, z-order bypasses, annotations in network attributes |
| `fidelity/repro-shared-interaction.cx2` | generated by `graph-io/test/fidelity/generators/gen_repros.py` (seeded) | MIT (generated) | edge and label mappings on `shared interaction` and `shared name`, which the file does not hold; hexagon nodes (the structure of imatinib-smpdb, no stated license) |
| `fidelity/imatinib-smpdb.cx2` | https://public.ndexbio.org/v3/networks/66a902f5-2022-11e9-bb6a-0ac135e8bacf | none stated | Drug action pathway: shapes/fonts/arrows by type. Cytoscape drew the NDEx network's other encoding (Cytoscape 3.10.5 fails to load this CX2: "Network view is null"), whose node ids differ from this file's, so its scene judges no property yet |
| `fidelity/signor-aml.cx2` | https://public.ndexbio.org/v3/networks/077e15fd-1e5f-11e8-b939-0ac135e8bacf | CC-BY-SA-4.0 | SIGNOR AML pathway: shapes by entity type, T-bar arrows, dashed edges |
| `fidelity/synthetic-lethal.cx2` | https://public.ndexbio.org/v3/networks/13c87f38-c3c1-11e6-8e29-06603eb7f303 | none stated | Synthetic lethal screen: continuous node size/border, edge color/width |
| `fidelity/u2os-hierarchy.cx2` | https://public.ndexbio.org/v3/networks/37969df7-649f-11ef-a7fd-005056ae23aa | none stated | Cell-map hierarchy: continuous sizes and label opacity |
| `fidelity/us-returned-students.cx2` | https://public.ndexbio.org/v3/networks/beeaeb6a-47b7-11f1-94e8-005056ae3c32 | none stated | Historical social network: discrete line styles, continuous edge width |
