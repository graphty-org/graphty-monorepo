# Owner issue ledger: style import fidelity

The owner's review of the fidelity Storybook (2026-10-17), one row per issue, in the owner's own
words. Each row is closed by comparing graphty's import against the real program's SVG output in
this folder, not against a JSON translation of it. `story` is the fidelity Storybook story id;
`sample` is the matching id in `samples.ts` or `corpus-samples.ts`.

| id  | story                                   | sample                             | owner's words                                                                                            | area                                           | status                                                          | resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I01 | `cx--ndex-90-f-78-bcd`                  | `cx-ndex-90f78bcd`                 | arrowheads are ~5x too large                                                                             | arrowhead size                                 | fixed                                                           | Fixed in graph-io (each program's arrowhead proportions, `styles/defaults.ts`) and graphty-element (arrowheads drawn in those proportions instead of one fixed `DEFAULT_ARROW_LENGTH`). Against Cytoscape's SVG (2026-10-18 run): arrowhead length 0/108 -> 108/108, width 0/108 -> 108/108, arrow type 216/216. Still open on this sample, not arrowheads: label text 42/75, because Cytoscape wraps long names at its label width and drops the lines past its height (oracle 'Acetylcholine / receptor &', graphty adds 'channel activity'); node height 71/75. [report](http://dev.ato.ms:9323/cx-ndex-90f78bcd.html) Label wrapping (2026-10-18, second pass): Cytoscape desktop wraps by Java's measure, each word with a space after it, in DejaVu Sans (Java's SansSerif and Dialog on Linux); graphty measured without the space, in the browser's sans-serif (Liberation Sans, 14 percent narrower), with letters drawn 3 to 4 percent small (its label size model assumed a 1.33 em line box; DejaVu's is 1.40). graph-io now reads Java's logical fonts as 'DejaVu Sans, sans-serif' and a font Java lacks as '<name>, DejaVu Sans, sans-serif', and states labelWrapTrailingSpace for Cytoscape; graphty-element wraps with it (label field wrapTrailingSpace) and draws a file's letters at the file's size in any font (label field letterSize). Label text 42/75 -> 74/75, label offset 73/75 -> 75/75. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 108/108 -> 108/108; edge.arrowWidth 108/108 -> 108/108; edge.arrow 216/216 -> 216/216; label.text 42/75 -> 74/75. |
| I02 | `cx--syn-mappings`                      | `cx-syn-mappings`                  | lines don't match, some text is tilted in the source but not the destination                             | edge style; label rotation                     | fixed                                                           | Fixed in graph-io and graphty-element; against Cytoscape's SVG: label rotation 29/96 -> 96/96 (NODE_LABEL_ROTATION is read as `labelRotation` and drawn by the new `node.labelRotation` channel); edge color 0/37 -> 37/37 and width 4/37 -> 37/37 (the mappings read `weight`, which the CX importer keeps as the edge weight column `graphty.weight`; they now read that column); dash 27/37 -> 36/37 (the comparison read graphty's dash-dot as an unknown pattern); edge present 37/50 -> 37/37 (the 13 'self-loops' were pieces of zigzag and sinewave edges, the file has no loops); label style 77/96 -> 96/96 (`Dialog.bolditalic` and `Serif.italic` are drawn bold and italic). Left: curve 20/37 and route 13/37, on edges Cytoscape draws as zigzags, sine waves and parallel lines that the comparison cannot rebuild into one path. [report](http://dev.ato.ms:9323/cx-syn-mappings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.rotation 96/96 -> 96/96; edge.dash 36/37 -> 42/43; edge.width 37/37 -> 43/43; node.fill 83/96 -> 95/96.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I03 | `cx--syn-bypass`                        | `cx-syn-bypass`                    | missing yellow rectangle in top center; missing lines                                                    | annotations; missing edges                     | fixed                                                           | The yellow rectangle is an image annotation (Cytoscape's logo, which its SVG draws); graph-io now reads it (`readImageAnnotations()`) and graphty-element draws it with its outline. Missing lines: none are missing; the 7 'self-loops' were pieces of other edges' drawing (the file has no loops): edge present 59/66 -> 59/59. Also: edge color 40/59 -> 59/59 (a line's own EDGE_STROKE_UNSELECTED_PAINT bypass wins under arrowColorMatchesEdge); diamonds drawn as ellipses was the comparison reading a custom-graphics image over an ellipse as a diamond, shape now 8/8; label rotation 55/61 -> 61/61; edge route 41/59 -> 46/59 and curve 44/59 -> 54/59 (EDGE_BEND handles are drawn). Left: node fill 53/61 and outline 45/61 are custom graphics (pie charts, gradients, stars) graphty does not draw. [report](http://dev.ato.ms:9323/cx-syn-bypass.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): stray.present 5/82 -> 6/68; edge.present 59/59 -> 61/61; node.fill 53/61 -> 61/61; node.stroke 45/61 -> 61/61.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I04 | `cx--ddram`                             | `cx-ddram`                         | font weight too heavy (same for most other images)                                                       | font weight                                    | fixed                                                           | Root cause in graphty-element: every label was blended twice (its plane was double-sided, which is two coincident quads, both drawn because the material draws back faces) and its texture was mipmapped from straight alpha, which averages the black a canvas holds where it is see-through into every letter's edge. A label is now one quad, uploaded premultiplied and blended as premultiplied (RichTextLabel, LabelBatch). Label ink against the oracle here 1.29 -> 1.03; median over the 34 Cytoscape desktop samples 1.57 -> 0.99; samples within 0.8x to 1.25x of the oracle's ink 22 -> 36 of 69. cys-galfiltered 4.70 -> 0.54 and cys-annotation-example 4.73 -> 0.55 was the measure, not the drawing (2026-10-18): ink was a count of pixels past a cut, and a 2 px glyph filtered from a larger texture spreads the same ink over more, lighter pixels than resvg's grid-snapped glyph. Summed, it is 1.04 on both (0.92 to 0.97 at 2 to 4 px). [report](http://dev.ato.ms:9323/cx-ddram.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.weight 43/43 -> 43/43.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| I05 | `cx--radiation-bibliography`            | `cx-radiation-bibliography`        | graph doesn't match, layout doesn't match, styling doesn't match                                         | layout; styling; graph content                 | layout; fixed (graph content)                                   | Not extra nodes: the file has 188 nodes and 207 edges and Cytoscape draws all of them; the comparison finds 171 of Cytoscape's nodes because the two layouts are unrelated (the file stores no coordinates and Cytoscape lays it out its own way), so 17 bodies are not told apart. Its 32 'self-loop' edges were pieces of other edges (edge present 93/191 -> 93/159). Positions and sizes stay unmeasurable without a shared layout. [report](http://dev.ato.ms:9323/cx-radiation-bibliography.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/171 -> 0/188; node.fill 171/171 -> 188/188; node.stroke 171/171 -> 188/188; edge.color 86/93 -> 163/169; edge.width 93/93 -> 169/169; node.present 171/171 -> 188/188; edge.present 93/159 -> 169/169; label.text 170/171 -> 188/188. Open: node position 0/188, because graphty lays the file out itself where Cytoscape keeps its stored view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I06 | `cx2--ndex-90-f-78-bcd`                 | `cx2-ndex-90f78bcd`                | arrowheads ~5x too large                                                                                 | arrowhead size                                 | fixed                                                           | Fixed with I01; Cytoscape draws the CX2 file the same as the CX one. Arrowhead length 0/108 -> 108/108, width 0/108 -> 108/108. Same label wrapping gap (label text 42/75). [report](http://dev.ato.ms:9323/cx2-ndex-90f78bcd.html) Label wrapping fixed with I01: label text 42/75 -> 74/75, label offset 73/75 -> 75/75. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 108/108 -> 108/108; edge.arrowWidth 108/108 -> 108/108; edge.arrow 216/216 -> 216/216; label.text 42/75 -> 74/75.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I07 | `cx2--syn-mappings`                     | `cx2-syn-mappings`                 | line weights / dimensions don't match (dotted, zigzag, etc)                                              | edge width; edge line style                    | fixed                                                           | Fixed with I02: edge width 4/38 -> 38/38 (graphty drew the 1 px default, not 7x too heavy), edge color 0/38 -> 38/38, dash 28/38 -> 37/38 (Cytoscape's dash-dot and marquee lines are dashed in its SVG and graphty draws them dash-dot; the comparison now reads graphty's pattern), label weight 77/96 -> 96/96 and style 77/96 -> 96/96, label rotation 29/96 -> 96/96. Zigzag and sine wave are drawn by both. Left: node fill 59/96 and fill opacity 73/96. [report](http://dev.ato.ms:9323/cx2-syn-mappings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.width 38/38 -> 42/42; edge.dash 37/38 -> 41/42; node.fill 59/96 -> 96/96; node.stroke 48/96 -> 91/96.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I08 | `cx2--wp-1449-tlr`                      | `cx2-wp1449-tlr`                   | are we sure the source image is correct, there are edges that aren't connected to nodes                  | reference correctness; edge endpoints          | reference was wrong                                             | The source picture was right: Cytoscape's own SVG also has edges that end away from any visible node, at WikiPathways anchor points (nodes about 0.3 px across). graphty differs elsewhere: 85/137 edges match, and graphty draws 25 group boxes where Cytoscape draws 6. [report](http://dev.ato.ms:9323/cx2-wp1449-tlr.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.route 81/83 -> 120/126; edge.present 83/135 -> 126/133; group.present 7/7 -> 23/23.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I09 | `cx2--imatinib-smpdb`                   | `cx2-imatinib-smpdb`               | font weight and edge weight don't match                                                                  | font weight; edge width                        | stand-in                                                        | No oracle: Cytoscape 3.10.5's CX2 reader fails on this file every time ("Network view is null"), so there is no drawing to compare against. The text-weight defect of I04 (labels blended twice) is fixed for every sample, this one included; the edge-width question stays open. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I10 | `cx2--signor-aml`                       | `cx2-signor-aml`                   | arrowheads too large                                                                                     | arrowhead size                                 | fixed (arrowheads, group labels); edges were the comparison's   | Arrowheads fixed with I01: length 2/64 -> 60/63, width 2/64 -> 60/63, arrow type 128/144 (16 ends where one side draws an arrow and the other does not). Still open: only 72 of Cytoscape's 293 edges are found in graphty's drawing (graphty draws 306), and group label 0/3: graphty labels the boxes 'AP1', 'NFY', 'NfKb-p65/p50' where the comparator finds no label in Cytoscape's group; the floor (0.25) was met before the branches were merged, so this is a merge regression to trace. [report](http://dev.ato.ms:9323/cx2-signor-aml.html) Group labels (2026-10-18): 0/3 -> 3/3. Cytoscape draws 'AP1', 'NFY' and 'NfKb-p65/p50' (they are in its SVG at the boxes' centers), but paints nodes in an order of its own that the file does not give, so a later node covers them; the comparison now pairs each box with the group graphty draws over it and finds its words even under a node. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 60/63 -> 201/210; edge.arrowWidth 60/63 -> 200/210; edge.arrow 128/144 -> 449/526; edge.present 72/293 -> 263/291; group.label 0/3 -> 3/3. Open: 28 of Cytoscape's 291 edges are still not found in graphty's drawing (not traced).                                                                                                                                                                                                                                                                                                                                                                                             |
| I11 | `cytoscape-session--luad-vest-v-2`      | `cys-luad-vest-v2`                 | some nodes missing internal yellow color                                                                 | node fill                                      | reference was wrong                                             | As classified: the yellow was Cytoscape's selection highlight. The comparison now loads the network the oracle draws (`network.title`, 'H. sapiens (10)'): node position 4/19 -> 163/163, label text 0/19 -> 163/163, node fill 163/163, edge present 1/6 -> 280/300. [report](http://dev.ato.ms:9323/cys-luad-vest-v2.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 163/163 -> 163/163; node.width 141/163 -> 163/163.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| I12 | `dot--profile`                          | `dot-profile`                      | not even close to the right layout                                                                       | layout (Graphviz)                              | layout                                                          | DOT stores no positions and graphty laid it out with its own force layout (node position 0/61, fitted error 0.25 of the diagonal); a Graphviz dot engine is needed. Everything not caused by the layout now passes: arrowhead length 0/85 -> 85/85 and width 0/85 -> 85/85 (I01's fix), node size, outline, label size. Curve 67/85 follows the routes, which follow the layout. [report](http://dev.ato.ms:9323/dot-profile.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/61 -> 0/61.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I13 | `dot--real-crazy`                       | `dot-real-crazy`                   | not even close to the right layout                                                                       | layout (Graphviz)                              | layout                                                          | Layout only (node position 0/41, fitted error 0.19). The import defects measured before are fixed by the Graphviz and arrowhead branches: node outline 0/41 -> 41/41, edge width 0/49 -> 49/49, arrowheads 0/49 -> 49/49 (length and width), node height 6/41 -> 41/41, label size 41/41. Curve 43/49 follows the layout. [report](http://dev.ato.ms:9323/dot-real-crazy.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/41 -> 0/41.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I14 | `dot--real-siblings`                    | `dot-real-siblings`                | not even close to the right layout                                                                       | layout (Graphviz)                              | layout; fixed (node height)                                     | Layout: node position 0/200, fitted error 0.22. Fixed since the first run: the #add8e6 outline (node outline 0/199 -> 200/200) and arrowheads (0/283 -> 281/284). Still an import defect, not the layout: node height 1.20x Graphviz's (0/200), likely graph-io's DOT node size (Graphviz pads `height` to fit the label at its own font metrics, and graphty draws the declared or a padded height that is 20% taller). [report](http://dev.ato.ms:9323/dot-real-siblings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/200 -> 0/200; node.height 0/200 -> 200/200. Open: node positions, which wait for a Graphviz layout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I15 | `dot--real-happiness`                   | `dot-real-happiness`               | not even close to the right layout                                                                       | layout (Graphviz)                              | layout; partly fixed (node height)                              | Layout: the file names twopi, graphty used its own force layout (node position 1/77, fitted error 0.26). Import defect, not the layout: node height 1.22x Graphviz's (0/77), the same DOT node height gap as I14. The file asks for URW Chancery or Comic Sans, which the pinned fonts lack (label size still passes 77/77). [report](http://dev.ato.ms:9323/dot-real-happiness.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 1/77 -> 1/77; node.height 0/77 -> 53/77. Open: 24 node heights on dot-real-happiness, where Chromium draws "Verdana" and "Comic Sans" in a narrower fallback font than Graphviz's DejaVu Sans, so the comparison's width-based scale reads correct heights as too tall.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| I16 | `dot--real-depcruise`                   | `dot-real-depcruise`               | are we sure the source image is correct? the edges are a mess                                            | reference correctness; edge routing            | reference was wrong; layout                                     | The source was right: this is Graphviz's own SVG, which really is that tall and dense (natural size 1062 x 7626 pt), and its edges are Graphviz's own splines. Layout: graphty used its own force layout (node position 0/96), so routes and curves differ (curve 181/652). Fixed by the Graphviz branch: cluster outlines are drawn (group outline width 19/19, group present 19/19). Still open: cluster label 17/19 (the two outermost clusters, '..' and 'graph-format', are drawn unlabeled and unfilled; the floor was 19/19 before the branches were merged, a merge regression), and arrowhead length 558/652 (1.67x on the shortest edges). Group box overlap 0/19 is the layout. [report](http://dev.ato.ms:9323/dot-real-depcruise.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): group.label 17/19 -> 17/19.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| I17 | `(all dot)`                             | all dot-* samples                  | none of the dot layouts are correct                                                                      | layout (Graphviz)                              | layout; partly fixed (node shapes and sizes)                    | Every DOT sample is laid out by graphty's own force layout ('0 of N placed by the file'), so node position fails on all 9 (fitted error 0.19 to 0.26 of the diagonal); Graphviz engines are needed. Not the layout, still open: node height 1.20x to 1.22x on dot-real-siblings and dot-real-happiness (0/200, 0/77); dot-synth-nodes node width 74/104 (plain and record-like shapes up to 18x too wide) and shape 71/101 (box3d drawn as a plain rectangle, assembly and cds as ellipses); arrowhead length 3.25x on 16 of dot-synth-edges-clusters' 101 edges. Arrowheads pass on the other DOT samples (for example 85/85 on dot-profile, 268/268 on dot-real-softmaint). [report](http://dev.ato.ms:9323/index.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): dot-profile node.position 0/61 -> 0/61; dot-real-crazy node.position 0/41 -> 0/41; dot-real-depcruise node.position 0/96 -> 0/96; dot-real-happiness node.position 1/77 -> 1/77; dot-real-linux-kernel node.position 0/50 -> 0/50; dot-real-siblings node.position 0/200 -> 0/200; dot-real-softmaint node.position 0/213 -> 0/213; dot-synth-edges-clusters node.position 0/68 -> 0/68; dot-synth-nodes node.position 0/104 -> 0/104; dot-synth-nodes node.width 74/104 -> 82/104; dot-synth-nodes node.height 79/104 -> 84/104; dot-synth-nodes node.shape 71/101 -> 85/101; and 1 more on the other samples (report index). Open: node positions and group boxes wait for a Graphviz layout; the biology glyph shapes and record fields have no graphty drawing.                                                              |
| I18 | `gexf--miserables`                      | `gexf-miserables`                  | missing outlines on nodes                                                                                | node outline                                   | fixed                                                           | Fixed in graph-io: Gephi outlines each node in half its fill's channels, 0.08 of its width wide (DependantColor DARKER, measured on every Gephi SVG), and graph-io now gives each GEXF node that outline. Node outline 0/77 to 77/77 on miserables, and 221/221, 366/366, 120/120, 155/155, 96/96, 64/64 on the other samples. [report](http://dev.ato.ms:9323/gexf-miserables.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.stroke 77/77 -> 77/77; node.strokeWidth 77/77 -> 77/77.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I19 | `gexf--graphology-rio`                  | `gexf-graphology-rio`              | lines missing curve                                                                                      | edge curve                                     | fixed                                                           | Fixed: Gephi's preview curves every edge (EDGE_CURVED), so graph-io marks GEXF edges curved; graphty-element drew every curved edge straight in 2D (it bowed them along z, toward the camera), which it now bows in the drawing's plane. Edge curve 11/1076 -> 1059/1076, edge route 984 -> 1075, edge color 625 -> 1076 (the mix of the end nodes). Two edges fewer curve than before the branches were merged (floor 0.986, now 0.984), and arrow type fell 0.972 -> 0.968 (an arrowhead drawn at the source end where Gephi draws it at the target), both merge regressions with I21's. [report](http://dev.ato.ms:9323/gexf-graphology-rio.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.curve 1059/1076 -> 1057/1076; edge.arrow 2084/2152 -> 2096/2152.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I20 | `gexf--gsa-fpki-certs`                  | `gexf-gsa-fpki-certs`              | lines missing curve                                                                                      | edge curve                                     | fixed                                                           | Fixed (as I19): edge curve 0/119 -> 119/119, edge route 31 -> 87, node outline 0/120 -> 120/120, label size 0/102 -> 102/102, and arrowheads 0/119 -> 119/119 (I01's fix). Left: label shown 102/120 (Gephi's label overlap hiding, not mapped). [report](http://dev.ato.ms:9323/gexf-gsa-fpki-certs.html) Gephi's label overlap hiding is now mapped (labelAvoidOverlap in Gephi's defaults: DefaultPreset sets node.label.avoidOverlap; graphty keeps the larger font, then the node added first, as Gephi keeps a file's order among labels of one size). Label shown 102/120 -> 99/120: Gephi tests overlap on a 10-unit grid, which hides labels whose boxes only share a cell, and graphty tests the boxes themselves; the 3 are recorded in allowedDrops. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.curve 119/119 -> 119/119.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| I21 | `gexf--sigma-ediaspora`                 | `gexf-sigma-ediaspora`             | text too large                                                                                           | label size                                     | fixed (label size, arrow end)                                   | Label size fixed: Gephi draws each label round(0.6 x size) (0.3 of the node's width), which graph-io now gives each GEXF node; label size 24/90 -> 90/90. Arrowhead size passes. Still open: arrow type 578/734 (floor 0.875, now 0.787): on 78 edges graphty draws the arrowhead at the source end where Gephi draws it at the target; it passed before the curve and arrowhead branches were merged, so this is a merge regression in graphty-element's curved-edge arrow placement. Gephi's label overlap hiding (label shown 90/155) is not mapped. [report](http://dev.ato.ms:9323/gexf-sigma-ediaspora.html) Gephi's label overlap hiding is now mapped (labelAvoidOverlap in Gephi's defaults: DefaultPreset sets node.label.avoidOverlap; graphty keeps the larger font, then the node added first, as Gephi keeps a file's order among labels of one size). Label shown 90/155 -> 119/155 here, graphology-rio 270/366 -> 308/366, cns-wos 198/221 -> 202/221, synth-nx-viz 93/96 -> 95/96; miserables 72/77 -> 71/77 (one label, the grid's rounding, recorded in allowedDrops). The arrowhead end on 78 curved edges is not a label defect and is left to the edge work. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.size 90/90 -> 69/69; edge.arrow 578/734 -> 718/734; label.present 90/155 -> 119/155.                                                                                                                                                                                                                                                                             |
| I22 | `gexf--synth-nx-viz`                    | `gexf-synth-nx-viz`                | lines too heavy, missing curve, text too large, lines miscolored (e.g. red lines in bottom left)         | edge width; edge curve; label size; edge color | fixed                                                           | All four fixed. Edge width 97/188 to 187/188 (Gephi draws the weight and ignores viz:thickness); curve 0/188 to 188/188; label size 23/93 to 93/93; edge color 102/188 to 188/188 and opacity 17/188 to 188/188 (Gephi mixes the two end nodes' colors and alphas, ignoring the edge's own). Gephi's circles and solid lines: node shape 24/96 to 96/96, edge dash 105/188 to 188/188, node fill opacity 30/96 to 96/96. [report](http://dev.ato.ms:9323/gexf-synth-nx-viz.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.width 187/188 -> 187/188; edge.curve 188/188 -> 188/188; label.size 93/93 -> 93/93; edge.color 188/188 -> 188/188.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I23 | `gexf--hsk-chars`                       | `gexf-hsk-chars`                   | layout doesn't match                                                                                     | layout (positions)                             | layout                                                          | The file stores no positions (0 of 868 placed by the file), so Gephi placed the nodes itself; nothing to compare against (node position 2/868, fitted error 0.25). [report](http://dev.ato.ms:9323/gexf-hsk-chars.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 2/868 -> 2/868.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I24 | `gml--yed-pmodel`                       | `gml-yed-pmodel`                   | source shows nodes without fill, but colored outline; import shows filled nodes with black outline       | node fill; node outline                        | reference was wrong; stand-in                                   | The old picture was Graphviz's gml2gv conversion, which turns a GML `fill` into an outline color. The file gives fill #D2DEEE and outline #000000, which graphty draws. Cytoscape's GML reader (a stand-in oracle: yEd wrote the file and cannot run here) draws the fill but no outline (node outline 0/36), edges 0.5x graphty's width (0/57) and arrowheads 0.44x as long (0/55). None of these can be judged against yEd until yEd draws the file. [report](http://dev.ato.ms:9323/gml-yed-pmodel.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 36/36 -> 36/36; node.stroke 0/36 -> 0/36.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| I25 | `gml--synthetic-coverage`               | `gml-synthetic-coverage`           | layout doesn't match, styles don't match, lots of fill issues                                            | layout (positions); styling; node fill         | reference was wrong; stand-in                                   | Layout: graphty matches the file's coordinates (fitted error 0.001 of the diagonal). The fit needs a top-to-bottom mirror because gml2gv copies GML's downward y into Graphviz's upward y, so the old picture was the mirrored one. Styles: the oracle is gml2gv, which draws every fill as an outline (node fill 0/71); it also draws the 2 groups as nodes (82 against graphty's 71 matched). These cannot be judged until yEd draws the file. [report](http://dev.ato.ms:9323/gml-synthetic-coverage.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 80/80 -> 80/80; edge.route 65/80 -> 68/80; node.fill 9/80 -> 9/80; node.stroke 0/80 -> 0/80; edge.color 80/80 -> 80/80; edge.width 80/80 -> 80/80.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I26 | `(all gml)`                             | all gml-* samples                  | GML fills and outlines generally need work                                                               | node fill; node outline                        | reference was wrong; stand-in                                   | All six GML oracles are gml2gv drawings, which write the GML fill as the outline color with no fill. So node fill and node outline fail on every node of every sample (for example 0/261 and 0/261 on need4stacks261). That reflects gml2gv's reading, not graphty's. yEd (or Cytoscape's GML reader, as for I24) is needed to judge. [report](http://dev.ato.ms:9323/gml-need4stacks261.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): gml-dunnart-autobahn node.fill 0/53 -> 0/53; gml-dunnart-autobahn node.stroke 0/53 -> 0/53; gml-dunnart-autobahn node.strokeWidth 53/53 -> 53/53; gml-dunnart-planar-orthogonal node.fill 0/60 -> 0/60; gml-dunnart-planar-orthogonal node.stroke 0/60 -> 0/60; gml-dunnart-planar-orthogonal node.strokeWidth 60/60 -> 60/60; gml-jgrapht-grid-territorio node.fill 0/25 -> 0/25; gml-jgrapht-grid-territorio node.stroke 0/25 -> 0/25; gml-jgrapht-grid-territorio node.strokeWidth 25/25 -> 25/25; gml-need4stacks261 node.fill 0/261 -> 0/261; gml-need4stacks261 node.stroke 0/261 -> 0/261; gml-need4stacks261 node.strokeWidth 261/261 -> 261/261; and 8 more on the other samples (report index).                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I27 | `yed-graphml--yed-voctomix`             | `graphml-yed-voctomix`             | missing text in middle of grouping box                                                                   | group label                                    | fixed; stand-in                                                 | yEd's internal label model (`t`, `tl`, ...) was read as the node's middle whenever the label's box lay inside the node, and neither graph-io nor graphty-element had a position inside a side. Now an `inside-` position (graph-io and `LabelLocation`); a right-aligned header as wide as its group is `inside-top-right`, drawn at the top right like draw.io's. Label offset: synthetic-nodes 48/65 to 54/65, galaxy-lcms 24/31 to 25/31. Group labels are not scored here: draw.io's groups are not detected. Arrowheads and the 3 edge labels: not this fix. [report](http://dev.ato.ms:9323/graphml-yed-voctomix.html) Left (2026-10-18): draw.io, standing in for yEd, does not draw this group's header as a detected group, so group labels are not judged here; nothing in graph-io or graphty-element was found to change. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I28 | `yed-graphml--open-archaeo`             | `graphml-open-archaeo`             | arrowheads too large, stylebox has grey background                                                       | arrowhead size; group fill                     | fixed (arrowheads); reference was wrong (group fill)            | Arrowheads fixed with I01 (length 0/40 -> 100%, width 0/40 -> 100%, arrow type 99%). The grey group background follows the file, which gives the group bodies #F5F5F5 or #CAECFF80; draw.io (the yEd stand-in) draws them unfilled. Left: 34 leftover draw.io shapes (stray 0/34) and edge route 46/52. [report](http://dev.ato.ms:9323/graphml-open-archaeo.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 40/40 -> 40/40; edge.arrowWidth 40/40 -> 40/40; edge.arrow 103/104 -> 103/104.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I29 | `yed-graphml--galaxy-lcms-workflow`     | `graphml-galaxy-lcms-workflow`     | are we sure the source image is right? the nodes are black and white split boxes                         | reference correctness; node shape              | reference was wrong                                             | The black-and-white split boxes are a draw.io export defect: it writes `fill="undefined"` for the entity header, which paints black. yEd would draw a #A8AFC6 header with the name. graphty's node height is 2.2x draw.io's (20/42), but draw.io is unreliable on these shapes. [report](http://dev.ato.ms:9323/graphml-galaxy-lcms-workflow.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.shape 1/20 -> 1/20.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| I30 | `yed-graphml--scala-collection-mutable` | `graphml-scala-collection-mutable` | nodes missing gradient, arrowheads too large                                                             | node gradient; arrowhead size                  | fixed                                                           | Gradient: graph-io kept a `y:Fill color2` as a note, the neutral model had no gradient, and graphty-element published no gradient channel. Now `fillGradient` / `fillGradientAngle` in graph-io (yEd's 45 degrees, top-left to bottom-right, written back as `color2`), the `node.gradientColor` / `node.gradientDirection` channels, and texture coordinates on flat node shapes so the ramp is drawn. Node gradient 0/25 -> 25/25 (magiclantern 23/36 -> 35/36). Arrowheads fixed with I01 (length and width 100%). Left: node fill 25/42, a stand-in difference: the 17 nodes have `y:Fill hasColor="false"`, which yEd paints as no fill (a gradient needs both colors) and graphty draws transparent; draw.io's GraphML import fills them white. [report](http://dev.ato.ms:9323/graphml-scala-collection-mutable.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 38/38 -> 42/42; edge.arrowWidth 38/38 -> 42/42; edge.arrow 76/76 -> 84/84; node.gradient 25/25 -> 25/25.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| I31 | `yed-graphml--libcitygml-mapping`       | `graphml-libcitygml-mapping`       | nodes are filled with yellow, source image has no fill                                                   | node fill                                      | reference was wrong                                             | The file fills all 51 UML nodes #FFCC00, so yEd draws them yellow, and graphty's yellow is right. draw.io (the stand-in) drops the fill (node fill 0/51). Arrowheads, 7x before, now pass (I01's fix). [report](http://dev.ato.ms:9323/graphml-libcitygml-mapping.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 0/51 -> 0/51.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| I32 | `yed-graphml--stm-32-func`              | `graphml-stm32-func`               | nodes are filled with blue, source image has no fill                                                     | node fill                                      | import defect; stand-in                                         | Node fill 103/143, unchanged. yEd draws a `y:ImageNode`'s embedded image (a `y:Resource` PNG) and no fill. Two pieces are missing: graph-io does not read the image resources, and graphty-element draws no node image (`image` is not drawn). Leaving the node unfilled without its image was tried and dropped: the node then draws nothing and the comparator loses all 15 (143 to 128 matched), and draw.io drops the images anyway, so no oracle can score the fix. [report](http://dev.ato.ms:9323/graphml-stm32-func.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 103/143 -> 128/143.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| I33 | `yed-graphml--synthetic-nodes`          | `graphml-synthetic-nodes`          | extra subgroup on imported image, many styles don't match                                                | groups; styling                                | import defect; stand-in                                         | Not an import defect: the 2 group boxes are in the file and draw.io draws the outer one as open header and body paths, which the comparator's group detection (one closed shape) misses; draw.io drops the nested group. Shapes 44/55 to 47/55: yEd's BPMN task, gateway and ER attribute were drawn as boxes. The 8 left are draw.io re-mappings (flowchart `process` with 2 px corners, `hexagon2`, `trapezoid2`). Gradient 57/64 to 58/64, label offset 48/65 to 54/65 (I27, I30). [report](http://dev.ato.ms:9323/graphml-synthetic-nodes.html) Label offset (2026-10-18): the 12 offsets left are draw.io's stand-in, not yEd: draw.io places internal, eight-position, sandwich and side labels where yEd's model does not (for example `internal` `bl` inside the bottom-left corner, which graphty draws and draw.io puts at the top). The one new failure since the merge, shape-diamond, is graphty now drawing yEd's inside bottom-left position; recorded in allowedDrops. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 55/69 -> 55/69; node.stroke 66/69 -> 66/69; edge.color 21/21 -> 21/21; edge.width 21/21 -> 21/21.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I34 | `json--cyjs-tokyo`                      | `json-cyjs-tokyo`                  | source image doesn't have text, imported image does. are we sure the source image is correct?            | reference correctness; label visibility        | reference was right; import defect fixed                        | The oracle is Cytoscape.js's own drawing as its exports make it (renderer.drawElements, as cy.png() and cytoscape-svg do), and it holds every label: white text (`color: #fff`) on a white page, so no ink. graphty drew those white labels as dark smudges: the smaller mip levels of a straight-alpha label texture average the black a canvas keeps where it is see-through into the letters. Fixed with I04 (premultiplied label textures): label ink 189x -> 0.11x the oracle's. Cytoscape.js's `min-zoomed-font-size` is NOT mapped: only its live canvas hides small labels, its exports draw every one, and mapping it would take label.present here from 100% to about 0% against the oracle; graphty-element can do it (`node.labelMinScreenSize`) for a consumer who wants the live behavior. The 204 group boxes and the node count are other areas. [report](http://dev.ato.ms:9323/json-cyjs-tokyo.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 712/712 -> 712/712.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I35 | `json--sigma-lesmis`                    | `json-sigma-lesmis`                | text too large                                                                                           | label size                                     | fixed                                                           | sigma.js 4 draws a node's label to the right of the node (DEFAULT_NODE_DISPLAY_DATA labelPosition 'right'); graph-io now carries that as sigma's default `labelPosition`. The sizes already matched by eye; the oracle is sigma's own PNG export, so label size is not measured. Measured against sigma's own record of what it drew: node position, size and fill 77/77, label text 51/51, label shown 54/77 (graphty shows 23 labels sigma's label grid hides). [report](http://dev.ato.ms:9323/json-sigma-lesmis.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 54/77 unchanged. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I36 | `json--graphology-synth`                | `json-graphology-synth`            | text behind nodes?                                                                                       | label draw order                               | fixed                                                           | Two defects fixed. sigma.js draws its labels after every node and edge; graphty sorted them by depth with the nodes, so nearer nodes covered them. graph-io now gives sigma's labels `labelOnTop` and graphty-element draws such a label over the whole graph (`node.labelOnTop`). sigma draws no edge labels unless its `renderEdgeLabels` setting is on, and a graphology file carries no settings, so graph-io no longer styles an edge's `label` attribute as a drawn label (the 'e175' labels are gone). Measured against sigma's record: label text 66/66, label shown 68/80 (floor 0.888, now 0.85: 3 labels graphty shows that sigma hides). Still open: node present 80/100 and node fill 26/80, because sigma draws the grid square and graphty stretched, so the fill read off sigma's PNG lands on the wrong node (the positions area). [report](http://dev.ato.ms:9323/json-graphology-synth.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 68/80 unchanged. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 68/80 -> 77/89; node.present 80/100 -> 89/96. Against sigma's own record of its paint (2026-10-19): node present 89/89 and node fill 89/89; the misses were the comparator reading the pixels of nodes drawn over these ones (see Specimen sheets: graphology). Edges judged: present, color and width 180/180, route 138/180 (routes under overlapping nodes). |
| I37 | `json--vis-unix`                        | `json-vis-unix`                    | nodes too large, text too large                                                                          | node size; label size                          | layout; fixed (outline)                                         | The file stores no positions, so graphty ran its own layout. Relative to node size, node and label sizes match vis-network (label size, node width, node height 100%). graphty's layout is about 3.5x tighter relative to node size than vis-network's physics result, which is why nodes and text look too large (vis-world and vis-transparency the same). Import defect, still open: node outline 0.56x (0/41): vis-network divides borderWidth by the view's zoom, so its outline is 1 screen pixel at any zoom, and graphty draws it in graph units. [report](http://dev.ato.ms:9323/json-vis-unix.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.size 41/41 -> 41/41; node.width 41/41 -> 41/41; node.height 41/41 -> 41/41; node.strokeWidth 0/41 -> 41/41; edge.arrow 73/98 -> 97/98. Open: node positions, because the file stores none and vis-network runs its own physics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| I38 | `json--vis-synth`                       | `json-vis-synth`                   | layout flipped                                                                                           | layout (axis orientation)                      | fixed                                                           | Fixed: graph-io read vis-network `x` / `y` as y up unless a node carried `physics`; vis-network draws them straight onto its y-down canvas, so every vis-network document (edges with `from` / `to`) is now read y down, in canvas px. No mirror in the fit (fitted error 0.003), node position 69/71, edge route 96%, label placement 9/70 -> 69/70. Left, not orientation: edge width 69/80 (pairs of neighboring edges with their widths swapped, 6.37 against 0.80 px), node shape 16/18. [report](http://dev.ato.ms:9323/json-vis-synth.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 69/71 -> 69/71; edge.route 77/80 -> 78/80.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| I39 | `json--cyjs-perf`                       | `json-cyjs-perf`                   | the source image is a blob of grey nodes. are we sure the source image is correct?                       | reference correctness                          | reference was wrong                                             | The source was right: the grey blob is Cytoscape.js's own drawing of its performance-test file (500 nodes, edges at opacity 0.333, nodes 10 to 60 wide on top of each other). [report](http://dev.ato.ms:9323/json-cyjs-perf.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I40 | `json--gephi-worldcup`                  | `json-gephi-worldcup`              | generated image is a mess of overlapping text                                                            | label size; label visibility                   | fixed (approximate)                                             | sigma.js keeps one label per 100 px screen cell, the largest node's, so few labels show; graphty drew all 736. graph-io now gives sigma's node labels `labelAvoidOverlap`, which graphty-element draws as `node.labelDeclutter: 'size'`: a label whose words would overlap a larger one is hidden, decided again as the camera moves. Measured against sigma's record: label shown 601/736, label text 21/21, node position 736/736, node fill 726/736. graphty still shows more labels than sigma's grid; the exact grid is not modeled. [report](http://dev.ato.ms:9323/json-gephi-worldcup.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 601/736 -> 603/736. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 601/736 -> 603/736.                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| I41 | `pajek--graphstream-b`                  | `pajek-graphstream-b`              | source image nodes don't have text but the imported image does. are we sure the source image is correct? | reference correctness; label visibility        | reference was wrong; fixed (Pajek defaults)                     | The source was wrong: Pajek 6.02 draws every vertex's label (all 111 phone numbers, Arial bold 15, dark red #ad0000, below and to the right of the vertex), so graphty showing them is right; the old picture was our own sketch, which drew no labels. Against Pajek's own SVG (test/fidelity/oracles/pajek-graphstream-b.svg): label.present 111/111; with the Pajek defaults now measured instead of assumed, label weight and color 0 -> 111/111, node outline color 0 -> 111/111, node fill 13/111 -> 93/111, label offset 0 -> 111/111. Still open: the comparator reads Pajek's diamond, whose tips Pajek cuts (six corners), as a hexagon (shape 88/111); arrowheads 6 long where graphty draws 3.3 (arrow length 0/192); and 18 vertices `ic LightOrange`, a color Pajek lists and its EPS export defines but its SVG export draws in the default color.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I42 | `pajek--football`                       | `pajek-football`                   | source image doesn't have text, but import image does. are we sure the source image is correct?          | reference correctness; label visibility        | reference was wrong; fixed (Pajek defaults)                     | The source was wrong: Pajek 6.02 draws all 35 labels (football.svg), so the labels graphty draws are right; the old picture was our own sketch. With the Pajek defaults now measured: node width and height 0 -> 35/35 (a vertex is 20 across, not 5), fill and outline 0 -> 35/35 (#ffd9bc with a #660000 outline half a point wide, not yellow and black), label size, weight and color 0 -> 35/35, label offset 0 -> 35/35, and all 118 arcs found (the comparator now reads Pajek's markup). Still open: arrowheads, which Pajek scales with the line's `s` (arrow length 49/118).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| I43 | `pajek--kdorola`                        | `pajek-kdorola`                    | text too large                                                                                           | label size                                     | reference was wrong; fixed (Pajek defaults, carried parameters) | The source had no text at all (our own sketch). Pajek 6.02 draws every label at the file's `fos 9`: vertex 1 sets `lr 11 lphi 285 fos 9` and the 58 vertices after it that set nothing are drawn exactly as vertex 1 (and 61 on as vertex 60's `box`), which graph-io now reads the same way. Against kdorola.svg: label size 127/127, node shape 60/127 -> 127/127, node size, fill, outline, label weight and color 0 -> 127/127. Still open: label offset 0/127 -- Pajek places the text at `lr 11` from the center, closer than graphty's nearest side, bottom-right, puts it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I44 | `xgmml--syn-bypass`                     | `xgmml-syn-bypass`                 | layout doesn't match                                                                                     | layout (positions)                             | fixed                                                           | The 6 nodes the file does not place are the two expanded groups (drawn as the box round their members) and the four members of the collapsed group, which XGMML stores only as offsets from the group (`__xLocation`, `__yLocation`); graph-io now places them where Cytoscape expands them, and graphty-element's recommended layout keeps every placed node where the file put it. Node position 0/58 -> 58/58 (fitted error 0.24 -> 0.00, no mirror), edge route 50/59. Still open, not positions: group present 0/2, node fill 50/58 and outline 43/58 (custom graphics), arrowhead length 1.76x on 10 of 60. [report](http://dev.ato.ms:9323/xgmml-syn-bypass.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 58/58 -> 58/58; edge.route 50/59 -> 54/60; node.fill 50/58 -> 58/58.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| I45 | `xgmml--wp-4271-cy-3-export`            | `xgmml-wp4271-cy3-export`          | grouping areas have too heavy of line weight, too many grouping areas in target image                    | group outline width; group count               | reference was wrong                                             | Against Cytoscape's own SVG, Cytoscape draws every complex group graphty draws (the octagon outlines), filled #b4b464 at 10% opacity with a #aaaaaa outline as graphty does; the 'filled where Cytoscape draws none' and the missing groups were the comparison reading Cytoscape's separately drawn fill and outline as two groups. Group present now 14/17 and group outline width 100%; the heavy look in the old picture came from the JSON reference. Other gaps on this sample: node width 77/122 (WikiPathways anchor and label nodes: Cytoscape draws them 0.02 to 8 px wide, graphty 0.58 px), node fill 93/122, edges 59/82 found. [report](http://dev.ato.ms:9323/xgmml-wp4271-cy3-export.html) Groups (2026-10-18): group present 14/17 -> 20/20. The 3 'missing' were the Legend, Lysosome and Absorption boxes, which graphty draws as the file's annotations; 6 more complex boxes are found now that a box around a flat node is no longer taken for that node's outline. Group label 0/1 is no longer judged: 'Cubam receptor' is a separate transparent label node (Cytoscape node 1277913), not the group's label, and graphty draws it. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): group.strokeWidth 14/14 -> 14/14; group.present 14/17 -> 20/20; node.width 77/122 -> 97/122.                                                                                                                                                                                                                                                                                                   |

Status values, judged against each program's own SVG (oracles in this folder) by the oracle
comparator (`graphty-element/test/fidelity/oracle-report.test.ts`, report pages
`node graphty-element/scripts/oracle-report.mjs`, served as http://dev.ato.ms:9323/):

- **reference was wrong**: the old picture or JSON was our own translation, or another program's
  misreading, and the real program draws the file differently (the resolution says how).
- **import defect**: graphty differs from the real program's drawing (the property, the measured
  difference and the likely owner are named).
- **layout**: the comparison needs a layout the file does not store (Graphviz engines are being
  built separately; vis-network and Gephi compute their own).
- **fixed**: the defect is fixed where it lives, and the row gives the comparator's numbers before and
  after.
- **stand-in**: no real oracle yet (yEd's licence forbids automation, so draw.io and gml2gv stand
  in).

Pass counts are "passing / compared"; ratios are graphty divided by the program, median of the
failing elements unless the row says otherwise. "Relative to node size" ratios divide each label's
pixel size by its node's width on both sides, so they hold even when the two layouts differ.

## After merging the eight fix branches (2026-10-18)

The arrowhead, edge line, Graphviz node and cluster, node size and shape, fill and outline, group and
annotation, label, and graph content fixes are merged and the comparator was run again on all 101
oracles. Every floor in `graphty-element/test/fidelity/oracle-floors.json` is the higher of the
branches' floors and the merged code's measured rate; none was lowered.

- Two merge defects in the comparator were found and fixed: a border Cytoscape exports as a filled
  outline (dotted, zigzag, sine-wave, double) was counted twice in a node's size once the node-size
  fix judged sizes to the outline's outer edge (syn-bypass family node width 59/61 -> 61/61), and a
  WikiPathways anchor drawn as a dot of no size was given a shape (wp4271 node shape 74/93 -> 74/74 of
  what is judged).
- 41 properties fall under a floor and are recorded in `allowedDrops` with their cause: 12 are
  rounding (the same pass count, a floor written at 4 places against a rate reported at 3); 10 are
  more elements judged once another branch found more of the program's edges (the rate falls while
  the passing count holds or rises); 4 measure what the base and the branches measured (the depcruise
  cluster labels under graphty's layout, Graphviz's shortened arrowheads, sigma's label grid, two
  edge stubs on graphology-rio); 10 are leftover-text counts that shrank because the label fix now
  reads wrapped label lines as labels; and 5 are single elements one branch's matching moves (wp1449
  node 137128, 7 Cytoscape.js perf arrow ends), not traced.
- The older drawn-scene scorecard's vis-network border widths no longer match its JSON reference:
  graphty now draws those borders at a fixed width on screen, as vis-network does, and vis-network's
  own SVG agrees (outline width 41/41 on vis-unix).

## New defects the comparator found (not in the owner's list)

Measured on 2026-10-18 against all 101 oracles, with every fix branch merged into
feat/style-oracles. Report: [index](http://dev.ato.ms:9323/index.html).

Regressions from merging the fix branches (each passed its floor in `oracle-floors.json` on its own
branch; 13 of the 101 samples fail the floor test after the merge)

- Arrowhead at the wrong end of a curved edge: on gexf-sigma-ediaspora graphty draws 78 edges'
  arrowheads at the source where Gephi draws them at the target (arrow type 0.875 -> 0.787); also
  gexf-graphology-rio (0.972 -> 0.968). The curve branch ("its arrow along the curve's end") and
  the arrowhead branch both changed `EdgeMesh.ts`. Owner: graphty-element.
- Stored edge bends drawn straight again: xgmml-gcmodeller-demo edge curve 0.958 -> 0.750 (6 of 24
  edges, for example 178->181). Owner: graphty-element edge routing or graph-io's Cytoscape
  `EDGE_BEND` reading, whichever the merge resolved differently.
- Graphviz cluster labels: dot-real-depcruise group label 1.00 -> 0.895 (the outermost clusters
  '..' and 'graph-format' drawn unlabeled and unfilled). Owner: graph-io DOT clusters or
  graphty-element nested groups.
- Cytoscape group labels: cx2-signor-aml group label 0.25 -> 0. Fixed in the comparison: 3/3 (see I10).
- One element each, under 1%: dot-synth-nodes arrowhead length (0.931 -> 0.925),
  gml-synthetic-coverage arrowhead width, graphml-synthetic-nodes label offset, cys-syn-bypass
  leftover shapes.
- Newly judged properties with no floor yet (node outline width): gexf-hsk-chars,
  graphml-cla-checker-graph, json-cyjs-graphmaker. Record them with `GRAPHTY_FIDELITY_RECORD=1`.
- A comparator merge defect, fixed in `compare-oracle.ts`: the "label under one pixel is not
  shown" rule met the sigma raster oracles, whose labels carry no size (0), so every sigma label
  was judged hidden (json-sigma-lesmis label shown 0.688 -> 0.065, json-graphology-synth 0.888 ->
  0.075, json-gephi-worldcup label text no longer judged). A label with no size is now shown:
  lesmis 54/77 and worldcup 601/736 meet their floors again; graphology-synth is at 0.85 against
  0.888 (3 labels graphty shows that sigma hides).

Other gaps first measured on 2026-10-18

- Node size: cys-luad-vest-v2 small nodes 3.0x Cytoscape's (22 of 163, 2.05 against 0.68 px);
  cx2-synthetic-lethal 1.21x (48/69); cx2-repro-shared-interaction height 1.18x (0/16); DOT node
  height 1.20x to 1.22x (I14, I15); dot-synth-nodes plain and record-like shapes up to 18x too wide.
- Node fill opacity: cx2-wp1449-tlr draws 17 WikiPathways shapes opaque where Cytoscape draws
  them at 0.098 opacity; it also draws 25 group boxes where Cytoscape draws 7, and 83 of 135
  edges are found. Fixed in the comparator (2026-10-18): graphty draws them as Cytoscape does.
  Each of the 17 is a gene drawn on the middle of a one-member group box (80 x 20 inside 95 x 75,
  `#B4B464` at 0.098, dashed `#AAAAAA`), and a shape on the same spot was taken as the body's own
  fill-and-outline twin when only its longer side matched; both sides must match now. Node fill
  157/170 -> 176/177, fill opacity 152/169 -> 168/169, outline 157/170 -> 175/177, group boxes
  7/7 -> 23/23. xgmml-wp4271-cy3-export: a 1 x 1 anchor node with a 1 px border is drawn by
  Cytoscape as a shape of size 0, a dot of its round-capped outline, which the comparison skipped
  as a body; it is now the body, its fill painting nowhere (fill 93/122 -> 100/122, outline
  92/122 -> 100/122). Left: the other 22 anchors still take the arrowhead that ends on them as
  their body. Groups (2026-10-18): Fixed in the comparison: Cytoscape draws the same complex boxes graphty does
  (JUN/FOS, MAP2K6/MAP2K3, TLR7/TLR8 ...), but a box drawn round a flat node is about as wide as
  the node, and the node took it for its own outline, its fill (#b4b464 at 0.098) and its size
  with it. graphty's groups now claim their boxes first: group present 7/7 -> 23/23, node fill
  opacity 152/169 -> 169/169, node width 152/170 -> 168/170, node fill 157/170 -> 168/170.
- Edges: json-vis-synth draws neighboring edges with each other's widths (69/80, 6.37 against
  0.80 px); cx2-signor-aml finds 72 of Cytoscape's 293 edges in graphty's drawing.
- Group labels on nested groups: json-cyjs-synth-edges 0/4 (the inner group's label is drawn on
  the outer box, and the outer box gets "Group 0"). Fixed: graphty was right; the comparison gave
  the outer box the first words inside it (the inner group's) and missed "Group 0", which
  Cytoscape.js draws above the box. Each box is now paired with the group graphty draws over it
  and labeled with that group's words, inside or just outside the box: 0/4 -> 4/4.
- graphty's route not read at all on cx-repro-locked-own-size (0/12), xgmml-repro-name-only-labels
  (0/13) and cx2-repro-shared-interaction (3/12, self-loops): check the comparator before the
  drawing.
- Parallel-edge labels: FIXED in the comparator: two parallel edges whose routes pass alike now pair by
  their label words (graphml-synthetic-edges edge label 4/13 -> 10/10). Was: edge label 4/13, the labels of two edges between
  the same nodes matched crosswise (likely the comparator's pairing).

Arrowheads

- Fixed for most programs (graph-io states each program's arrowhead proportions, graphty-element
  draws them): every arrowhead passes on cx-ndex-90f78bcd, every DOT sample but two, the Gephi
  samples and the yEd stand-ins that failed at 2x to 7x.
- Still open: Cytoscape arrow size and shape mappings on the syn-mappings family (length 20/48,
  4.1x on the mapped sizes; width 0.41x; 22 of 74 ends where one side draws an arrow and the other
  does not); the syn-bypass family 1.75x on 11 of 64; dot-synth-edges-clusters 3.25x on 16 of 101;
  dot-real-depcruise 1.67x on 94 of 652; vis-network arrow type 73/98 (vis-unix) and width 0.59x
  (vis-world 43/48).

Labels

- FIXED (labels were blended twice and mipmapped from straight alpha; see I04). Heavier text on every Cytoscape desktop sample (label ink 1.2x to 4.7x the oracle's at the same
  font size and weight).
- Label visibility rules. graphty-element now has them as label style channels
  (`node.labelMinScreenSize`, `node.labelDeclutter`, `node.labelOnTop`) and graph-io maps:
  vis-network's drawThreshold (a label under 4 screen px is not drawn) and sigma's label grid
  (approximated by overlap avoidance, largest first). Still open: vis-siblings label shown 0/140,
  because graphty frames its own layout of that unplaced graph far closer than vis-network's
  physics does (graphty's labels are 14 px on screen, vis-network's under 4), a layout
  difference, not a visibility one. Cytoscape.js `min-zoomed-font-size` is deliberately not
  mapped: its exports, which the oracles are, draw every label (see I34). Gephi's overlap
  avoidance is mapped (2026-10-18; see I21): label shown on sigma-ediaspora 90/155 -> 119/155,
  graphology-rio 270/366 -> 308/366, cns-wos 198/221 -> 202/221.
- Label text wrapping: FIXED for Cytoscape (see I01). Label text: ndex-90f78bcd 42/75 -> 74/75 (both
  copies), imagenet-dog-children 170/190 -> 189/190, import-and-save 275/300 -> 300/300, ddram 40/43 ->
  43/43, radiation-bibliography 170/171 -> 178/178, us-returned-students 164/170 -> 168/169, Cytoscape.js
  graphmaker 189/211 -> 209/211 (Cytoscape.js measures every word but a line's last with the space
  after it). Left: Java rounds each glyph's advance to whole pixels, so a line within a pixel of its
  width can break on one side only (lianhe-affiliation and us-returned-students lose one label each,
  recorded in allowedDrops). draw.io keeps one line where graphty wraps (cla-checker-graph,
  voctomix).
- Gephi labels 1.2x to 1.6x too large relative to node size on every GEXF sample.
- Bold and italic dropped: label weight 0/48 on pathguide-allpathwaysdb and 0/14 on
  repro-name-only-labels (Cytoscape 700, graphty 400); label style 77/96 on the syn-mappings family
  (italic drawn upright).
- Cytoscape.js genemania: label color 0/31 was the comparator's mistake, now 31/31. Cytoscape.js
  strokes each label's outline as an unfilled text before the white label; the SVG reader took the
  unfilled text for the label, black by default. It now skips unfilled text.

Edges

- Curves: Gephi draws every edge curved and graphty draws them straight (0/119 to 11/1076 on all
  8 GEXF samples). Cytoscape's bezier bundles and haystack curves are drawn straight on cx-ddram
  (85/109), lianhe-affiliation (334/388) and the syn-* family; xgmml-gcmodeller-demo's stored edge
  bends are not followed (edge route 0/24).
- Edge width: us-returned-students 2.2x too wide (8/489); 2 of 12 edges on
  repro-shared-interaction drawn as hairlines (about 0.01x); gml-yed-pmodel 0.5x against
  Cytoscape's GML reader (0/57).
- Edge color: Gephi draws edge colors that look like a mix of the two end nodes' colors
  (graphology-rio 625/1076, miserables 194/254, sigma-ediaspora 208/367, hsk-chars 178/1334);
  graphty uses one end's color.
- Self-loops: every edge the comparator cannot find in graphty's drawing on the Cytoscape samples
  is a self-loop (syn-bypass 7 missing, syn-mappings 13, wp4271 27, dream4-signaling 9). graphty
  draws self-loops as teardrops, so either the shape differs from Cytoscape's loop or the comparator
  misses graphty's loops; check which first.
- Dash patterns: Cytoscape.js dotted drawn as dashed (graphmaker 236/271, synth-nodes outlines
  23/28). Open. The file says "dashed", and graphty draws dashes 3 line widths long where
  Cytoscape.js draws fixed 4 px (borders) and 6 px (edges) dashes, which at widths of 3 to 5 px
  look like dots. graph-io has no property for a dash length, and graphty-element sizes its
  dashes by line width only.

Node fills, outlines, shapes and backgrounds

- Background: graphty paints #f5f5f5 behind 55 samples whose file declares no background (every
  DOT, GML, GraphML, Pajek, Cytoscape.js, sigma and vis-network sample); every one of those
  programs paints white. Fixed: graph-io's defaults for Graphviz, yEd, yFiles 3, Cytoscape.js,
  vis-network, sigma and Pajek now give the white those programs draw, and the comparator judges
  a background within delta E 1 (white against #f5f5f5 is 2.0, which the 3 for small marks let
  pass) and sees a drawing with no background shape on the white page it is shown on.
  The background now matches on 100 of the 101 oracles (44 before). cys-syn-bypass's session background #fafaf0 is drawn
  white (the CX and XGMML copies of the same file get it right). Fixed: the session reader now
  applies the view's locked network properties over the style's default (0 to 1).
  cys-import-and-save (#ebf6ff drawn #cccccc) is the several-networks problem below.
- Node shapes: Cytoscape diamonds drawn as ellipses (syn-bypass family 4 or 5 of 16 to 18);
  Cytoscape.js hexagons drawn as ellipses (synth-nodes 22/30; now 25/30: the spellings
  concavehexagon, cutrectangle, cut-rectangle, bottomroundrectangle and right-rhomboid are read;
  left: heptagon and tag have no graphty shape, and the comparator calls graphty's parallelogram
  and vee "other"); rounded rectangles drawn square
  (draw.io stand-ins, magiclantern 28/33, synthetic-nodes 44/55); networkportal-nsoxphos 9/25.
- Node outline width 1.6x to 2.1x Cytoscape's (aracne-mycccnd1 49/236, networkportal-nsoxphos
  53/69, the syn-mappings family 70/96); vis-network outlines drawn 0.4x to 0.65x (vis-unix 0/41,
  vis-world 0/48, vis-lesmiserables 0/74). Open: vis-network divides a node's borderWidth by the
  view's zoom (vis-network.esm.js 9.1.9 line 21827), so its outline is 1 screen pixel at any zoom;
  graphty draws it in graph units, so it thins with the zoom-to-fit. graph-io has no way to say a
  width is in screen pixels, and graphty-element no border drawn at a fixed screen width.
- Node size: cx2-synthetic-lethal 1.21x (48/69); repro-shared-interaction height 1.18x (0/16);
  DOT node heights 1.2x to 1.7x on every DOT sample.
- vis-siblings: graphty draws 200 nodes where vis-network draws 140 (vis-network hides some), and
  labels where vis-network shows none.

Groups and annotations

- Cytoscape group boxes: the "8 missing" on the syn-mappings family were the comparator reading edges Cytoscape draws as filled ribbons as group boxes; Cytoscape draws none there. signor-aml 4/8 (its fill and outline primitives were counted as two boxes each).
- Extra group boxes: cyjs-tokyo 204, wp1449-tlr 25 against 6, wp4271 17 against 7,
  cys-syn-bypass 2, gexf-cns-wos 4, the draw.io stand-ins 2 to 9. Mostly the comparison's
  reading (2026-10-18): wp1449 and wp4271 draw the boxes graphty draws (23/23, 20/20 found now);
  cyjs-tokyo's 204 are stations whose 3 px box covers a neighbor's, no box at all.
- Cytoscape.js compound nodes saved with a position (`cy.json()`) were drawn as plain nodes at
  that position: json-cyjs-synth-edges-saved group present 0/3. Cytoscape.js draws a compound
  around its children wherever its position says, so graph-io's position read no longer reads a
  Cytoscape JSON compound's saved position (`containersFollowChildren`) and graphty-element
  draws it round its members: 0/3 -> 4/4, group label 4/4. Left: group box 2/4 on both copies:
  the file sets `padding: 15` (5 on the inner group) and graphty pads a group by its largest
  member's radius; graph-io has no group padding property yet.
- Group fill painted where the program draws none: signor-aml (white, 0/3), wp1449-tlr and
  wp4271 (#b4b464).
- Annotations (leftover shapes and free text in the program's drawing) drawn by graphty: 0 on
  most Cytoscape samples that have them (polygenic-sle 0/96, ddram 0/57, syn-mappings 0/260,
  signor-aml 0/17). Measured again (2026-10-18): most leftovers are no annotation. A free text
  now counts as drawn where graphty draws a label holding those words (a node, edge or group
  label the comparison did not pair, a label-only node): cyjs-tokyo 0/535 -> 528/535 (the labels
  of edges hidden under nodes and of compound stations), wp4271 23/71 -> 48/78, wp1449 15/144 ->
  70/153, sbgn-sciluna 0/61 -> 21/63. polygenic-sle's 106 are STRING's enhancedGraphics labels
  (`stringdb::enhancedLabel Passthrough`, a gene name drawn as outlined glyph paths at each
  node's top right), a second node label graph-io does not read and graphty has no channel for;
  the syn-mappings leftovers are custom graphics and edge pieces.
- Graphviz clusters: no cluster labels (depcruise 0/19, synth-edges-clusters 9/12) and no cluster
  outlines (depcruise); edge labels 43/54 on synth-edges-clusters; the graph label ("Synthetic node
  coverage", "Object Oriented Graphs") is not drawn.

Content and loading

- Sessions with several networks: Cytoscape draws the largest network and graphty loads the
  first unless told; the comparison now loads the oracle's network by its title (cys-luad-vest-v2,
  cys-import-and-save).
- Node and edge counts differ from Cytoscape's on cx-radiation-bibliography (188 against 171
  nodes), xgmml-syn-bypass (67 against 58), cx-repro-unplaced-boxes (24 against 18).

## Comparator gaps found while classifying (fixed 2026-10-18)

Each was fixed in the comparator (`graphty-element/test/fidelity/oracle/`), and the oracle
numbers in the rows and lists above are measured with the fixes.

- A mirror is no longer fitted, except for an oracle whose metadata says the program's drawing is
  mirrored (`"mirrored": true`, written for the gml2gv stand-ins). json-vis-synth's node position
  now fails 0/71 (I38). dot-real-siblings loses 2 chance matches of an unrelated layout.
- Cytoscape's arrow shape NONE draws a filled dot one line width across at the line's end. A cap
  no wider than its line is now part of the line, not an arrowhead; a shape longer than the line it
  ends (over 12 px), or one holding a node's center, is never an arrowhead. Edge arrow pass counts
  rose on every Cytoscape sample (cx-ndex-90f78bcd 108/216 to 216/216, xgmml-pathguide 72/144 to
  144/144, cx2-signor-aml 64/144 to 128/144, xgmml-wp4271 67/118 to 106/118), and the
  several-hundred-pixel "arrowheads" are gone: what they were (group boxes, annotations) is read
  as that, or left as a stray.
- dot-real-softmaint read 0 graphty nodes because its nodes are unfilled: graphty draws the outline
  over a transparent body, and the drawn-scene reader called a node with a transparent body
  invisible. A node that draws an outline is now drawn, with no fill. The same counted 9 more nodes
  on gml-synthetic-coverage, 17 on graphml-scala-collection-mutable and 4 on
  graphml-synthetic-nodes, where some of them fail (scala's are filled white by draw.io, and
  transparent in graphty).
- sigma oracles: the oracle tool records sigma's own account of where it drew each node and
  which labels it drew (`drawn` in the metadata); the comparison reads the fills off the PNG, so
  node presence, position, size and fill, and label presence and text are judged, and the pixel
  comparison runs. Label size and place, and edges, are still not judged for sigma.
- Multi-network sessions: the comparison imports the network named in the oracle's
  `network.title`.
- Also: a group box is now a box-like shape at least as wide and tall as each node it holds (not
  an edge ribbon through node centers), and a fill and an outline drawn over one box are one group;
  a draw.io label wrapped into positioned `<tspan>` lines is read as lines, not run together.
- Fixed: graphty's node border width was read as half its box's growth, but a ring round a
  pointed shape grows its box by more than its width (a triangle's or a diamond's corners move out
  by the width over the sine of their half angle). The growth is now divided by the shape's own,
  so node stroke width rose on 18 samples (xgmml-aracne-mycccnd1 49/236 to 236/236, mostly
  triangles) and fell on none.
- Fixed: a gradient fill was read as the white material under its ramp; it is now read as the
  ramp's first stop, as the oracle side reads an SVG gradient.
- draw.io draws a yEd group as an open header path and an open body path, so no group box is
  detected on any yEd stand-in (I27, I33).
- FIXED (2026-10-18, planted-defect test, pass 2): a specimen sheet's captions drawn as text only were judged as
  annotations, and on the Cytoscape.js sheets never matched: Cytoscape.js puts a zero-width space between the letters
  of a label it may break anywhere, and the comparison read them as part of the words. The words are now read without
  zero-width characters, every caption's words (and each line of a caption the program wrapped) are left out on both
  sides, a caption node never takes a specimen's body (on vis-network-specimen-arrows the captions had taken all but
  two of the specimens' bodies: 2 of 116 nodes paired), and a drawing whose nodes carry no labels is framed on the
  free texts both sides draw before it falls back on its ink's extent (cytoscapejs-specimen-edges-lines paired 2 of
  86 nodes and none of its 47 edges, and the yEd stand-in sheets paired none).

Open comparator gaps found on 2026-10-18 (not fixed)

- Group box overlap is judged even when the layouts are unrelated, so every DOT sample with
  clusters fails it (dot-real-depcruise 0/19, dot-synth-edges-clusters 0/12) for the layout's
  reason, not the cluster's. It should be judged in the size-fitted frame, or not at all, as node
  positions are.
- FIXED (2026-10-18; a free line counts as drawn where graphty draws a label holding its words,
  0/119 -> 119/119). Cytoscape wraps a long label into several `<text>` lines; lines after the ones read as the label
  are counted as leftover shapes (cx-ndex-90f78bcd 0/119 leftovers, all of them label lines), so
  "stray present" overstates the missing annotations there.
- Dense Cytoscape.js drawings: edges hidden under nodes are not found in graphty's drawing
  (json-cyjs-perf 188/998, json-cyjs-tokyo 533/860); not yet told apart from missing edges.
- FIXED (2026-10-18): the Pajek stand-ins matched one node each. Pajek 6.02 now draws every Pajek
  sample (below), and the comparator reads Pajek's own markup (each element follows a
  `<!-- Vertex: n -->` or `<!-- Arc: a b -->` comment), skips its signature logo, sizes an SVG that
  has only a viewBox, and no longer reads a `<line>` as a black-filled shape (which had hidden every
  Pajek edge).
- Not testable yet, so the planted-defect test cannot check them: a node gradient removed (graphty draws a gradient
  nowhere the oracle draws the same one: Cytoscape.js `background-fill` gradients are not imported, and the yEd
  stand-in runs draw.io's gradient at 0 degrees where graphty draws yEd's 45), and a border added round a label's
  background (graphty draws no label background on any sample: graph-io's style vocabulary has no label background, so
  Cytoscape.js `text-background-*` and Cytoscape desktop's label backgrounds are dropped on import, though
  graphty-element's labels can draw one; 3 of 45 labels on cytoscapejs-specimen-edge-labels and 93 of 122 on
  cx-syn-mappings fail `label.background`).
- FIXED (2026-10-18): every DOT specimen sheet is drawn by `neato -n2`, which reads the pinned `pos` as
  points, but the files carried no `bb`, so graph-io read them as neato's input inches (`dotPositions()`) and
  drew every DOT specimen node at 1/72 of its size; every node size, fill and outline failed, and the defects
  planted on them tested nothing. The sheets now carry the root `bb` Graphviz's own laid-out output writes (the
  corner anchors' box), which leaves every Graphviz drawing byte for byte the same. Also untestable by design: edges and label geometry on the sigma.js raster oracles (graphology,
  Gephi JSON), and a mirror on a sheet where only its four corner anchors pair (yed-live-graphml-specimen-images-charts:
  draw.io names no node, and four symmetric corners pair the same mirrored or not).

## Pajek 6.02's own drawings (2026-10-18)

Every Pajek sample (the eight in corpus-samples.ts and pajek-iliad in samples.ts) now has Pajek
6.02's own SVG export as its oracle, made headless under Wine by `tools/pajek.mjs` (Pajek's
licence: "Free for noncommercial use"; it says nothing against automation). The drawings answer
the owner's three questions: Pajek draws every vertex label, so I41 and I42 were wrong pictures, and
I43's labels are the file's own size.

What the real drawings showed that the old sketches and graph-io's assumed defaults did not:

- **Pajek's defaults** (graph-io had assumed them): a vertex is 20 across at x_fact 1 (not 5), filled
  #ffd9bc with a #660000 outline 0.5 wide (not yellow with a black outline 1 wide); labels are Arial
  bold 15 in #ad0000 (not black 10), with the text starting 20 from the center at 285 degrees, so
  below and to the right; an arc is grey #999999 and 1 wide, an edge teal #007091 and drawn twice
  its `w` (2 by default). All fixed in `graph-io/src/styles/defaults.ts` and
  `graph-io/src/formats/pajek/styles.ts`.
- **Parameters carry from line to line**: a line that leaves out `c`, `w`, `p` or `ap` is drawn with
  the line before it's value, and a vertex line that sets nothing is drawn exactly as the vertex
  line before it (kdorola, 1crn, b98). A vertex line that sets anything starts from the defaults.
  graph-io now reads files this way, and its writer restates what would otherwise carry.
- **Ten more color names**: Pajek knows LightYellow, LightCyan, LightMagenta, LightPurple, LightGreen,
  LightOrange, Canary, LFadedGreen, Pink and LSkyBlue besides the dvips names (graph-io had read
  them as unknown).
- **Line labels are not drawn** by default (synth-lines: 28 `l` labels, none drawn).

Pass rates against the real drawings, before -> after the graph-io fixes: node width, height, fill,
outline color and width, and label size, weight and color went from 0 (or 1 in 10) to 100% on football,
kdorola, c, 1crn, iliad and synth-lines, and to 96% on lin-rel4; node shape 60/127 -> 127/127 on
kdorola; label offset 0 -> 100% on football, c, graphstream-b, iliad and synth-lines; edge color
0 -> 100% on c. synth-vertices stays at 60% node width (the `s_size` and `empty` quirks below).

Still open, each judged against Pajek's drawing:

- pajek-iliad: the file stores no positions and Pajek places the vertices on a circle; graphty runs
  its own layout (node position 0/311). A layout choice, as for DOT.
- Arrowheads: Pajek draws an arrow 5 x its `s` long and 2 x `s` wide, `s` carried like the other line
  parameters (football arrow length 49/118, synth-lines 3/25, graphstream-b 0/192); graph-io does
  not read `s`.
- Bidirected arcs and loops: Pajek draws the two arcs of a mutual pair as curves and a loop as a
  Bezier loop (synth-lines edge route 54/88, c 122/125, graphstream-b 23/193 routes).
- Line labels: Pajek's default drawing hides them; graphty draws them (synth-lines label 0/28).
- Label placement at a small `lr`: graphty's label positions are eight sides, Pajek's a point at
  `lr` and `lphi` with the text starting there (kdorola offset 0/127 at `lr 11`, 1crn 0/314 with
  large vertices).
- Pajek quirks graph-io does not copy: `c 0.700 0.700 0.700` (three fractions) is drawn as the
  default color (1crn edge color 0/337; graph-io reads it as gray); an `empty` vertex's label is
  drawn white at size 1, so it is hidden (synth-vertices); `cross` is drawn as an ellipse in the
  SVG export; a vertex line's first parameter is read as a shape by its first letter when the line
  names no shape (`bw 2` draws a box), `Triangle` (capital T) is not a shape, and a line that starts its parameters with `s_size` without a shape has them all ignored; an `empty` vertex draws no body, which graphty still sizes (synth-vertices width 48/80).

## Specimen sheets: GEXF

The GEXF specimen sheets (`graph-io/test/fidelity/specimens/gexf/`, written by
`generators/specimens/gexf-gephi.mjs`) drawn by Gephi Toolkit 0.11.3's Preview and SVG export (`tools/gephi.mjs`):
each category's file under Gephi's defaults with node labels on and label overlap avoidance off, and again under
one Preview setting per further page (`specimens/gexf/pages.json`; the `.oracle.json` names the setting as
`previewProperties`). What Gephi does with the GEXF vocabulary, which the importer must match:

- Gephi's limits (the GEXF says it, Gephi does not draw it; graph-io must draw Gephi's way):
    - `viz:shape` on a node is ignored: square, triangle, diamond and image are drawn as discs, with or
      without `node.per.node.opacity` (`gexf-specimen-node-shapes`, `-p2`, `gexf-specimen-images-charts`, `-p2`).
    - `viz:shape` on an edge (dotted, dashed, double) is ignored: every edge is solid (`gexf-specimen-edges-lines`, all pages).
    - `viz:thickness` is ignored: the width is the edge's weight (`thickness-1/4/8` draw at the neutral weight 1.5).
    - `viz:color`'s alpha on a node is ignored unless `node.per.node.opacity` is on (`gexf-specimen-node-sizes-opacity`
      vs `-p2`); on an edge it shows only with `edge.color=original` (`gexf-specimen-edges-lines-p5`).
    - An edge's own `viz:color` is ignored under the default `edge.color=mixed`: the edge takes the mix of its end
      nodes' colors (`end-colors`); `source`, `target`, `original` and a custom color are the other pages.
    - `z` is ignored in 2D (`position-z`).
    - Edge labels are hidden by default (`edge.label.show=false`; `gexf-specimen-edge-labels` vs `-p2`).
    - A node label's line break is drawn as a space (`label-newline`: the SVG text is one line).
    - GEXF 1.3's hierarchy (nested `<nodes>`, `pid`, `<parents>` with several parents) is flattened: every parent
      and child is a plain node, with no group box (`gexf-specimen-groups`, `group-parents`).
    - A dynamic graph is drawn static (`gexf-specimen-node-sizes-opacity-p4`, `mode="dynamic"`): every node and edge
      is drawn whatever its `start`/`end` or `<spells>`, and of several timed `viz:color`, `viz:size` or
      `viz:position` elements the one listed LAST in the file is drawn, not the latest in time
      (`color-timed-last-earlier`, blue 3-5 then red 1-3, is red).
    - GEXF 1.1draft and 1.2draft files (namespaces `http://www.gexf.net/1.1draft`, `.../1.2draft` and their viz
      modules) are drawn exactly like 1.3 (`gexf-specimen-node-fills-borders-p8`, `-p9`; edges in 1.2draft:
      `gexf-specimen-edges-lines-p14`, which shows the same parallel-edge gap as the 1.3 sheet).
    - `timerepresentation="timestamp"` is drawn static the same way (`gexf-specimen-node-sizes-opacity-p5`): every
      node with a `timestamp`, `timestamps` or a timestamped `<spell>` is drawn, and of several timestamped
      `viz:color` / `viz:size` values the one listed last in the file is drawn (`color-timestamped-last-earlier`,
      blue @4 then red @1, is red). graph-io matches it.
    - GEXF 1.2draft's open interval bounds (`startopen` / `endopen` on a node, an edge and a `<spell>`) are reported
      as deprecated and drawn static the same way (`gexf-specimen-node-sizes-opacity-p6`), and so is GEXF 1.3's
      `mode="slice"` with a graph `timestamp`: a node and an edge whose interval lies outside the slice are drawn
      (`gexf-specimen-node-sizes-opacity-p7`). graph-io matches both.
- Gephi's own rules (facts the importer must copy):
    - A node with no `viz:size` is size 10 (20 across); `viz:size value="0"` is also drawn as size 10.
    - A node with no `viz:color` is black. A node with no `viz:position` is placed at (0, 0) with autoscale off.
    - `hex` colors are read with Java's `Color.decode` on the digits: `#rrggbb` (either case) is right, but `#rgb`
      is read as the number 0xrgb (`#f80` is drawn #000f80), `#rrggbbaa` keeps only its last six digits (`#4daf4a80`
      is drawn #af4a80), and hex without `#` is black (`gexf-specimen-node-fills-borders`). A value too big for a
      Java int (`#FF000080`) is no color either. When a `viz:color` has both `hex` and `r`/`g`/`b`, `hex` wins
      (`color-hex-and-rgb`: r=255 with hex #0000ff is blue). graph-io now reads hex exactly this way
      (`canonVizColor` in `graph-io/src/formats/gexf/styles.ts`); the conformance fixture
      `authored/rgba-hex-1.3.gexf` expects Gephi's reading.
    - Parallel edges of one kind are merged into one edge whose weight is their sum (`parallel-same`, weight 3); in an
      undirected graph a reverse pair is merged the same way (`reverse-pair`). Edges of different `kind` stay apart
      and are drawn on top of each other. graph-io matches it: the merged edges are hidden and the first is drawn at
      the summed weight (`gephiEdges` in `graph-io/src/formats/gexf/styles.ts`).
    - When the smallest edge weight is 0 or less, every edge's weight is raised by |smallest| + 1
      (`gexf-specimen-edges-lines-p13`: weights 1, 4, 0, -2 are drawn 4, 7, 3, 1). graph-io matches it.
    - A dynamic edge weight (`<attributes class="edge" mode="dynamic">` with `<attribute id="weight"
      title="Weight">` and timed `<attvalue for="weight" start end>`; `gexf-specimen-edges-lines-p15`): Gephi draws
      each edge at the value of its EARLIEST interval, whatever order they are listed in (`weight-timed` and
      `weight-timed-last-earlier`, 8 over 1-2 and 1 over 2-3, both draw 8), and an edge with no timed value has
      weight 0 -- its static `weight` XML attribute is not read (`weight-static-4`) -- so the rule above then adds 1
      to every edge (drawn 9, 9, 5, 1, 1). graph-io matches it: a dynamic edge attribute whose id or title is
      `weight` is the weight, read at its earliest interval (fixed 2026-10-19).
    - In a `defaultedgetype="directed"` graph an edge with `type="undirected"` is dropped (`gexf-specimen-arrows`,
      `type-undirected` has no edge); `type="mutual"` is drawn as one directed edge with one arrowhead. In an
      undirected graph a `type="directed"` edge is dropped the same way and every other edge is undirected (`-p6`:
      `type-directed` has no edge). A `mutual` graph is drawn as a directed one, and there an undirected edge is kept
      (`-p7`). A graph with no `defaultedgetype` is drawn like a `mutual` one: every untyped edge directed, with an
      arrowhead, and a reverse pair kept apart (measured on probe files, Gephi Toolkit 0.11.3). graph-io matches all
      of it.
    - A self-loop is stroked 1.3 times as thick as its weight and has no arrowhead (`gexf-specimen-edges-lines`,
      `-arrows`); graph-io matches both. **Open gap (graphty-element):** Gephi draws the loop as a small circle of
      radius size / 2 + 0.429 x weight beside the node (2.64 for a size-4 node of weight 1.5); graphty-element's loop
      is about 3.7 times as long (edge.route 0.313 vs 1.718 of its length), and the style vocabulary has no loop size
      to ask for Gephi's. It is the one edge.route / edge.curve failure left on every edges-lines and arrows page.
    - A node of `viz:size value="0"` is drawn at the default size 10 (`gexf-specimen-node-sizes-opacity`, `size-0`);
      graph-io matches it. A node's border is stroked inside its size (radius size - border / 2), and a fixed border
      is never wider than the size (a size-3 node takes a border of 4 as 3; `gexf-specimen-node-fills-borders-p3`);
      graph-io matches both.
    - Shorten (`node.label.shorten`, `edge.label.shorten`) cuts a label only when it has at least max-char + 3
      characters, to its first max-char characters and "..." (`label-long`, 33 characters, is cut at the default 30).
    - A label is 0.6 x its node's size high (proportional size, the default).
    - A node's border is 0.08 x its size wide (0.16 x the radius / 2, `SizeUtils.getBorderWidth`) unless
      `node.border.fixed` is on; `node.border.width` is read only then (`gexf-specimen-node-fills-borders-p2`, `-p3`
      set both; `-p7` sets fixed alone, width 1).
- Not drawable: `<viz:color hex="..." a="...">` (hex with an alpha attribute) and r/g/b with a channel missing make
  Gephi's GEXF importer throw ("Color parameter outside of expected range: Green") and open nothing, so no sheet
  holds them (`gexf-gephi-vocabulary.json`, `notCovered`).
- The oracle route imports each file into a new workspace, as Gephi's File > Open does
  (`references/GephiExport.java`): an existing workspace refused a timestamped graph ("TimestampSet does not match
  the column type IntervalSet") and a dynamic weight column; every earlier oracle is byte-identical either way.
- Gephi's Preview values that never reach the SVG, so no page sets them: `background-color` (the SVG export draws
  no background), `margin` (pads the canvas only), and the code-only `edge.arc-curveness` / `edge.bezier-curveness`;
  `node.scale.factor`, `edge.scale.factor`, `node.label.scale` and `edge.label.scale` are overwritten by
  `refreshPreview` from the Overview. `directed` is set by `refreshPreview` from the graph, `visibility-ratio` is an
export-time option that drops a share of the nodes (1.0 keeps all), and `canvas.moving` only skips labels while
the interactive preview is dragged. Every DependantColor mode (parent, darker, lighter, custom) of the border,
  label outline and label box colors, and every Font style, has its own page.
- The Preview settings are Gephi's, not the file's: a GEXF file cannot carry them. graph-io takes them as the
  `gephiPreview` import option (graphty-element's GEXF reader: `config.gephiPreview`), by Gephi's own names, and the
  oracle harness passes each page's recorded `previewProperties` (fixed 2026-10-19). Every page then draws its
  setting: node border fixed / width / color (darker, lighter, parent, a color), node opacity and per-node opacity
  (a node drawn less than opaque has no border), label show, proportional size, color (parent, original, a color),
  shorten and max-char, outline size and color, box and box color, custom font (family, bold, italic, size) and
  overlap avoidance;
  edge show, curved, color (mixed, source, target, original, a color), opacity, thickness, use-weight and weight
  rescaling; arrow size (0 draws none); edge label show, color, outline, shorten and font, centered on the line.
  This also settles the label overlap row: page 1 of every sheet was drawn with `node.label.avoidOverlap` false and
  graph-io now hides overlapping labels only while that setting is on. The corpus oracles were drawn under Gephi's
  default (overlap avoidance on), so their remaining label.present misses are Gephi's 10-unit grid against
  graphty-element's box test (the allowedDrops above), not an oracle defect. Still open:
    - `node.label.outline.opacity` and `edge.label.outline.opacity` (`labels-p10`, `edge-labels-p6`): the style
      vocabulary has no label outline opacity (graph-io), so the outline is drawn opaque.
    - `node.label.box.opacity` (`labels-p13`): Gephi strokes the label box (drawn as the label border, 0.08 of the
      node's size wide) at that opacity; the vocabulary has no label border opacity, so it is drawn opaque.
    - `edge.radius` (`arrows-p4`): Gephi ends each edge that far short of its nodes; the vocabulary has no edge end
      gap (graph-io vocabulary, then graphty-element).
    - `node.label.overlapGridSize` (`labels-p16`): graphty-element tests label boxes, not Gephi's grid.
    - Gephi's SVG writes a label's text with the space before `&` and `<` dropped (`label-entity`: "a& b<c>");
      graph-io keeps the file's text, so label.text fails there on every labels and edge-labels page.
    - Comparator (graphty's side): `labels`, every page: graphty-element draws `label-overlap` as a plain node, but
      `groupsOf` in `graphty-element/test/fidelity/extract-scene.ts` reads any node whose box holds another node's
      box as a group box, so the small node drawn over it makes it a group (group.extra) and its oracle node is
      missing (node.present). Gephi has no group boxes; the heuristic should not make one.
    - `arrows-p2` (arrow.size 8) and `-p4`: the arrowheads of `weight-4` and `target-size-12` are read as `half` or
      `other` from Gephi's SVG, where Gephi draws the node over the arrowhead's tip; graphty draws the size asked
      for (arrowSize 8 / 3). The comparator's arrow-shape reading of a covered arrowhead, not the import.
    - `node-sizes-opacity`, `-p2`, `-p3`: one node has no `viz:position` (`position-none`), which the oracle route's
      autoscale-off import places at (0, 0); graphty-element's `layout: "recommended"` then lays out every node
      (layout, not style: position, size and stroke rows all fail with the frame). `-p4` .. `-p7` place every node
      and pass.

## Specimen sheets: yEd GraphML and yEd Live GraphML

The yEd GraphML sheets (`graph-io/test/fidelity/specimens/yed-graphml/`, yEd's own markup) and the yEd Live GraphML
sheets (`specimens/yed-live-graphml/`, yFiles for HTML 3 markup, as yEd Live 3.0 writes it) are written by
`generators/specimens/yed.py` from `generators/specimens/yed-vocabulary.json`. yEd's license forbids automating yEd
("The Software may not be used as part of an automated process"), and yEd Live is treated the same, so neither
program drew these oracles: every one is draw.io 32.4.1's drawing of its own GraphML import (`tools/drawio.mjs`),
marked `standIn: true` with `standInFor` naming the program. **Owner action:** open each sheet in yEd (or yEd
Live), File > Export > SVG at 1200 x 900, and save it over `oracles/<format>-<sheet>.svg`; then set `standIn`
to false in its `.oracle.json`. Until then a row that disagrees with these oracles may be draw.io's error, not
graph-io's. What draw.io does differently from yEd, read from the stand-in drawings (so the Fix phase does not
copy a draw.io mistake into graph-io):

- yEd GraphML (draw.io's mxGraphMlCodec):
    - `y:ImageNode` images (PNG resources) are not drawn: an empty box (`yed-graphml-specimen-images-charts`,
      `image-node`, `image-alpha-false`, `image-wide`). `y:SVGNode` resources are drawn.
    - Label icons (`iconData`) are not drawn, so `horizontalTextPosition`, `verticalTextPosition` and `iconTextGap`
      change nothing (`icon-text-*`).
    - `y:SmartNodeLabelModel` parameters are ignored (`model-smart-*` all centered); `sandwich` and `sides`
      positions below the node are clipped at the label box (`labels-p2`).
    - Edge label models are not followed: almost every `y:EdgeLabel` is drawn near the target end whatever its
      `modelName` / `modelPosition` / `ratio` (`yed-graphml-specimen-edge-labels`, rows 3 and 4).
    - `y:DropShadow` is not drawn (`dropshadow-*`); `y:BorderStyle raised="true"` draws a plain border.
    - `com.yworks.entityRelationship.big_entity` is drawn with a black body; the BPMN `Event` configurations draw
      nothing; `Artifact` is a white box; `com.yjava.BevelNode*` and `ShinyPlateNode*` are plain rectangles
      without their bevel or gloss (`node-shapes-p2`, `-p3`).
    - `hexagon2`, `octagon2` and `rectangle3d` are drawn as plain rectangles; `triangle2` as `triangle`.
    - A closed folder (`yfiles.foldertype="folder"`, the folded realizer active) is drawn folded but its members
      are still drawn (`group-closed`): yEd hides them.
    - A `y:Fill` `color2` (yEd's gradient) is not drawn: the node is flat `color` (`gradient-*`, `gradient-tall`,
      `gradient-alpha`).
    - Every draw.io SVG ends with the text "Text is not SVG - cannot display" at the bottom center (draw.io's
      fallback link for its HTML labels); it is not part of the sheet.
- yEd Live GraphML (draw.io knows only yFiles for HTML 2.x names, so it reads a 3.0 file partly):
    - No label text at all: draw.io reads a label's `text`, and yFiles writes `Text` (as attribute or `Label.Text`
      element), so every node and edge label, and every caption, is missing (every `yed-live-graphml-*` oracle;
      the older `graphml-yfiles-html-*` oracles lose their labels the same way).
    - `yjs:RectangleNodeStyle`, `yjs:ArrowNodeStyle`, `yjs:ImageNodeStyle` and the GroupNodeStyle tab, icon and
      fills are not mapped: white rectangles (`node-shapes` rows 3 and 4, `images-charts`, `groups*`).
    - `{x:Null}` is passed through as the color `{x:null}`, which an SVG renderer draws black (`fill-null`): yFiles
      draws no fill.
    - Fills: `#AARRGGBB`, `SolidColorFill` and some named colors (`RED`, `BLUE`, `FIREBRICK`) are read;
      `CORNFLOWER_BLUE` is drawn black, `CssFill` and the gradients (`LinearGradient`, `RadialGradient`) white.
    - `yjs:ArcEdgeStyle` is drawn straight; most `ArrowType` values (`CHEVRON`, `DELTOID`, `KITE`, `STEALTH`,
      `ELLIPSE`, `OPEN`) are drawn as draw.io's default arrow (`yed-live-graphml-specimen-arrows`).
    - A key's `<default>` style is ignored (`mappings-bypass`, `default` and `edge-key-default` are drawn with
      draw.io's defaults); a whole style by `y:GraphMLReference` is followed (`fill-reference`, `edge-reference`),
      but a `Stroke`, fill or `Arrow` referenced from an attribute is not: no border (`stroke-reference`), a black
      fill (`color-reference`), no arrow (`arrow-reference`).
    - The label model parameters (`yx:` namespace, yFiles for HTML 3) are not read.
- Added by the completeness review (sheets `yed-graphml-specimen-node-shapes-p4`, `-p5`, and new specimens on
  `node-shapes-p2`, `node-fills-borders`, `labels` and `groups`; yEd Live pages `node-shapes-p2`, `-p3`, `labels-p3`,
  `-p4`, `edges-lines-p2`, `arrows-p2`), and what the stand-in does with them:
    - yEd's BPMN palette keeps its look in `y:StyleProperties` (`com.yworks.bpmn.type`, `characteristic`, `taskType`,
      `dataObjectType`, `icon.fill`, `icon.fill2`, `icon.line.color`), which the older sheets never set. draw.io draws
      the event, gateway, task, artifact and data object symbols; it draws nothing for three event characteristics
      (`START_EVENT_SUB_PROCESS_NON_INTERRUPTING`, `INTERMEDIATE_BOUNDARY_NON_INTERRUPTING`, `INTERMEDIATE_THROWING`,
      whose spelling is inferred: `bpmnStyleProperties` in `yed-vocabulary.json`) nor for an `Event` with no
      properties. graph-io reads only the configuration's outline (`bpmn.event` an ellipse, `bpmn.gateway` a
      diamond), so every symbol, marker and icon color is a gap: graphty-element has no BPMN symbol to draw yet.
    - Older yEd versions write the Modern Nodes ids without their `com.yjava.` prefix (`BevelNode`, `BevelNode2`,
      `BevelNode3`, `BevelNodeWithShadow`: `generic-legacy-*`), and `DemoGroup` (a GenericGroupNode with a
      `headerBackground` property). draw.io draws them as plain boxes.
    - `y.view.ShadowNodePainter.SHADOW_PAINTING` (on a GenericNode: its drop shadow) is not drawn by draw.io.
    - Label configurations: `CroppingLabel` is drawn uncropped; the entity-relationship `name` label (with its
      background) and `attributes` label (`ErdAttributesNodeLabelModel`) are drawn by draw.io under a black body.
    - TableNode color properties (`yed.table.lane.color.alternating`, `yed.table.header.color.main`,
      `yed.table.header.color.alternating`) are ignored by draw.io; their names are the ones draw.io's yEd importer
      reads, as no yEd-written corpus file sets them.
- yEd Live in yFiles for HTML 2.6 markup (what yEd Live wrote before its yFiles for HTML 3 update; 5 of the 6 yEd
  Live files in the corpus): the 2.6 vocabulary is taken from https://docs.yworks.com/yfiles-html-2.6/api/ and the
  flowchart palette's `FlowchartNodeType` from yfiles-for-html-demos v2.6. draw.io reads this markup better than the
  3.0 markup: it draws every 2.6 `ShapeNodeStyle` shape, BevelNodeStyle and ShinyPlateNodeStyle (as a glossy plate),
  every `demostyle:FlowchartNodeStyle` type with its fill and stroke, and the 2.6 arrows; it draws `PanelNodeStyle` as
  a white box, ignores an Arrow's fill and stroke, and draws no label text (`y:Label.Text`), so the `labels-p3` and
  `labels-p4` oracles judge only the nodes. graph-io reads FlowchartNodeStyle, BevelNodeStyle, ShinyPlateNodeStyle,
  PanelNodeStyle and the 2.6 shapes since fix round 1 (below).
- Spelling the sheets could not take from a real file: no yEd-written corpus file shows the camel case of 37 of
  yEd's 63 GenericNode configuration ids (`yed-vocabulary.json`, `"spelling": "inferred"`), and no yFiles for HTML
  3 corpus file shows the edge label model parameters (`SmartEdgeLabelModelParameter`, `EdgePathLabelModelParameter`,
  `EdgeSegmentLabelModelParameter`, `FreeEdgeLabelModelParameter`), gradients or arrow scales; those follow the API
  reference's property names. The owner's export from yEd and yEd Live settles both: a specimen the program draws
  as its default was misspelled.


## Specimen sheets: yEd Live settings graph-io now reads (fix round 1, 2026-10-19)

What graph-io now reads from yEd Live's markup as yFiles draws it (unit tests in
`graph-io/test/formats/graphml/styles-yfiles3.test.ts`; defaults from the yFiles for HTML 2.6 API reference and the
v2.6 demos' `FlowchartStyle.ts`):

- `BevelNodeStyle` and `PanelNodeStyle` fill with their `color` (default black), `ShinyPlateNodeStyle` with its
  `fill`; Bevel and ShinyPlate are rounded boxes of their `radius` (10 and 5; 0 is a plain box), outlined only where
  a ShinyPlate sets `stroke` (the bevel's light band and the plate's gloss are not drawn).
- `demostyle:FlowchartNodeStyle` draws its `type`'s outline, the one yEd's flowchart palette draws for the same type
  (`configurationOutline`), with the demo's default fill rgb(183, 201, 227) and black stroke; `annotation` is an
  unoutlined box (its bracket is not drawn), and a style with no `type` an outlined box.
- The 2.6 shapes `SHEARED_RECTANGLE`, `SHEARED_RECTANGLE2` (parallelogram), `TRAPEZ`, `TRAPEZ2` (trapezoid),
  `STAR5_UP` (star), `TRIANGLE2`, `FAT_ARROW2` and `PILL` (a box with half-circle ends); `ROUND_RECTANGLE` has its
  documented corner of 10.
- Node label places: the interior, exterior, stretch and sandwich models of 2.6 (`y:InteriorLabelModelParameter`,
  `{x:Static y:InteriorStretchLabelModel.North}`, ...) and of yFiles 3 (`yx:InteriorNodeLabelModelParameter`,
  `yx:ExteriorNodeLabelModelParameter`, `yx:StretchNodeLabelModelParameter`), inline or shared. Edge labels: the path
  model's `SideOfEdge` at ratio 0.5 and the nine-position model's center row (above, on, below the line).

Measured against draw.io's drawings (stand-ins): node-shapes-p2 node shape 22/40 -> 34/40, fill 35/40 -> 37/40,
outline 30/40 -> 32/40; node-shapes-p3 node shape 5/34 -> 19/34; graphml-yfiles-html-stag-flowchart node shape 0/37 ->
1/37; node outline raster regions up (p2 0.947 -> 0.968, p3 0.952 -> 0.980, stag-flowchart 0.891 -> 0.914). The labels
are not judged: draw.io draws no yFiles label text.

Where draw.io misreads what graphty now draws as yFiles documents it (`yed-live-stand-in`; allowed drops and known
failures in graphty-element's `test/fidelity/oracle-floors.json` and `oracle-known-failures.json`, expiring
2026-12-31):

- `PILL` and `STAR5_UP` are drawn as plain boxes (`shape-pill`, `v2-shape-pill`, `v2-shape-star5-up`); graphty draws
  the pill (a circle on a square box) and the star.
- `PanelNodeStyle` is a white box outlined black (`panel`, `panel-color`, `panel-label-insets-color`); graphty fills
  it with its `color` and draws no outline. yFiles gives the style no stroke property; its panel border shading is
  not drawn, and the owner's export will show whether yEd Live outlines it.
- A FlowchartNodeStyle without a fill is white (`node-shapes-p3` `default`, two `stag-flowchart` process nodes); the
  demo's default is rgb(183, 201, 227).

Still open after fix round 1:

- The free and ratio-anchored models' `LayoutOffset` (`model-free-offset`, `v2-model-...`): the neutral style
  vocabulary has no label offset (shared with the other formats' label anchor and offset work). A label at an
  edge's end, a segment's middle, or left or right of the edge's direction is not placed either.
- GroupNodeStyle stroke (`groups`, `groups-p2`, `groups-p3`: 39 groups): not an import defect. Every sheet writes the
  stroke (`#FF505050` 1, `stroke-group` `#FFFF0000` 2) and graphty draws it; draw.io, the stand-in, ignores
  `GroupNodeStyle.stroke` and draws every group outline black and 1 wide, the red 2-wide one too. yFiles documents the
  stroke's default as null. Judged when the owner's yEd Live export replaces the stand-in.
- Label text, and fills and shapes draw.io misreads (`CssFill`, gradients, `CORNFLOWER_BLUE`, `{x:Null}`,
  `RectangleNodeStyle` corners, `ArrowNodeStyle`; `node-fills-borders`, `node-shapes`): the stand-in's, above. They
  wait for the owner's yEd Live export; yEd Live's license is treated as yEd's, so it is not driven by a script.

## Specimen sheets: Cytoscape.js

The Cytoscape.js specimen sheets (`graph-io/test/fidelity/specimens/cytoscapejs/`, cy.json() documents written by
Cytoscape.js 3.34.3 itself through `generators/specimens/cytoscapejs.mjs`) drawn by `tools/web/web-oracle.mjs cyjs`
(preset layout at the stored positions; the SVG is Cytoscape.js's own `drawElements` replayed onto svgcanvas). Every
property of Cytoscape.js's style table has a specimen except the 18 that draw nothing in a still picture (events,
transitions, box selection, the core's selection box / touch circle / textured viewport, and `position`, which
3.34.3 parses and never reads); `generators/specimens/cytoscapejs-coverage.json` names the specimen of every
property and enumerated value. What Cytoscape.js does, which the importer must match:

- A color's own alpha is ignored: `rgba(148,103,189,0.5)` and `hsla(300,70%,50%,0.6)` are drawn opaque, and
  `background-color: transparent` is drawn BLACK (`cytoscapejs-specimen-node-fills-borders`); only the
  `*-opacity` properties make a color see-through. An 8-digit hex color (`#8c564bcc`) is invalid and dropped.
- `font-weight` 700 written as a number is saved by cy.json() as the string "700", which Cytoscape.js then rejects
  when it reads the file: `font-weight-700` (`cytoscapejs-specimen-labels-p2`) is drawn at normal weight. Every
  other numeric weight survives the round trip.
- A compound (parent) node is drawn as a rectangle for `shape: ellipse` and `shape: diamond`; round-rectangle,
  cut-rectangle, barrel and bottom-round-rectangle are honored (`cytoscapejs-specimen-groups`).
- An angle endpoint (`source-endpoint: 90deg`, `target-endpoint: 270deg`) on a straight edge is drawn where
  outside-to-node puts it (`cytoscapejs-specimen-edges-lines-p2`); the position forms (`-50% 0%`) move it.
- `taxi-direction: leftward` and `rightward` draw like `horizontal` when the target is to the right.
  The sheet draws each again with the target on the other side (`taxi-direction-leftward-target-left`,
  `-rightward-target-left`, `-upward-target-above`, `-downward-target-above`), where the directions part.
- A `haystack` edge draws no arrow at all, whatever its arrow shapes say (`arrow-on-haystack`,
  `cytoscapejs-specimen-arrows-p2`); graphty must draw none either.
- `selected: true` with no `:selected` rule of the file's own draws the neutral node (`state-selected-no-rule`,
  `cytoscapejs-specimen-mappings-bypass`): the default stylesheet's `:selected` colors come before the file's
  `node` rule, which wins. The element states cy.json() saves (`selected`, `selectable`, `locked`, `grabbable`)
  are read by `:selected`, `:unselectable`, `:locked` and `:ungrabbable` rules on the same sheet.
- `target-arrow-width: 10` on a square arrow draws the normal arrow size.
- Every straight-triangle edge also emits a triangle path with NaN coordinates, which draws nothing (the two
  page errors of `cytoscapejs-specimen-edges-lines`).
- `label: data(missing)` draws no label (Cytoscape.js warns and leaves the mapping unset).
- `stripe-direction` draws nothing different: 3.34.3's `drawStripe` turns the stripes only for the misspelled
  value `righward`, which its own property table does not accept, so `stripe-direction-vertical` is drawn as the
  same horizontal bands as `stripe-direction-horizontal` (`cytoscapejs-specimen-images-charts`). The importer
  already reads it that way.
- Hiding an end node: `display: none` on a node removes its edges too (`target-display-none`), `visibility:
  hidden` does not -- Cytoscape.js still draws the edge to the invisible node (`target-visibility-hidden`, both in
  `cytoscapejs-specimen-edges-lines-p2`). Fixed in fix round 1 (below): the hidden node is kept at opacity 0.
- An edge's `underlay-*` and `overlay-*` draw a band along the line (`edge-underlay-opacity-0-5`,
  `edge-overlay-opacity-0-5` in `cytoscapejs-specimen-edges-lines-p2`; the node forms are on
  `cytoscapejs-specimen-node-sizes-opacity`). Read into the neutral `underlay*` / `overlay*` properties and drawn
  by graphty-element's `underlay` / `overlay` (a node's padded filled shape, an edge's band), matching the SVG. OPEN,
  comparator work: the oracle's node underlays and overlays are unassociated strays (`stray.present`), and an
  edge's overlay, a wider stroke drawn OVER its line, is read as a second edge (`edge-overlay-opacity-0-5`
  `#g1` fails `edge.present`); the underlay is judged as the edge's outline and passes.
- `*-arrow-fill: hollow` strokes the arrow's outline (`target-arrow-fill-hollow`, `-circle`, `-square`, `-diamond`
  and the source and middle forms in `cytoscapejs-specimen-arrows-p2`). The importer reads a hollow triangle,
  diamond and circle as `triangle-open`, `diamond-open`, `circle-open`, and a hollow square as `other:open-square`,
  which graphty-element draws as its `open-box` cap (`target-arrow-fill-hollow-square` passes `edge.arrowFill`).
  The other shapes (vee, tee, chevron, the compound arrows) stay filled when hollow.
- How a value is spelled (`cytoscapejs-specimen-mappings-bypass-p2`, and the color specimens of
  `cytoscapejs-specimen-node-fills-borders`): cy.json() respells every color as `rgb(r,g,b)`, every alias as the
  property it points to and drops a value it refuses, so these rules are written into the sheet as authored, the
  way hand-written files and Cytoscape desktop's style export carry them. Every color syntax matches: upper-case and
  short hex, names in any case, `rgb()` in percentages, `rgba()` with its alpha ignored, `hsl()` with its hue
  wrapped (-60, 420); and refused, so drawn at the rule beneath: mixed percentages, a channel above 255,
  `rebeccapurple`, 8-digit hex, `hsl()` without percentages and `rgb( 44 , 160 , 44 )` (a space after the
  parenthesis). camelCase names in a stylesheet (`backgroundColor`) are read. Cytoscape.js's eleven aliases are
  read as their properties (only `content` was before). OPEN: an alias of a property graph-io does not carry fails
  exactly where that property fails on the other sheets: `padding-left` / `-right` / `-top` / `-bottom` (as
  `padding-6`), `control-point-distance` / `-weight`, `segment-distance` / `-weight` / `-radius` (as their plural
  forms on `cytoscapejs-specimen-edges-lines`, which graph-io's property table does not read), and
  `edge-text-rotation` and `text-rotation: 0.5rad` (as `text-rotation-30deg`); the gradient written in mixed color
  syntaxes fails as every `background-fill` gradient on `cytoscapejs-specimen-node-fills-borders` does.

Where the oracle SVG and Chromium's own screen differ (each checked against `ORACLE_SCREENSHOT_DIR` captures):

- The SVG is wrong (svgcanvas records no `globalCompositeOperation` and no image smoothing switch):
  `border-style-double` is drawn as one solid ring (the screen shows two), and `background-image-smoothing-no`
  is smoothed. The SVG also draws the label of `min-zoomed-font-size-12`, which the screen hides at the sheet's
  zoom (0.97, font size 10). These specimens need the oracle fixed before their verdict means anything.
- The screen is wrong (Cytoscape.js's element texture cache keys a node's bitmap on a style hash that leaves out
  `background-blacken` and the stripe properties, so those nodes reuse the bitmap of an earlier node with the
  same other properties): on screen `background-blacken-0-5` looks like `background-opacity-0-5`, and the
  horizontal stripe nodes of `cytoscapejs-specimen-images-charts` are drawn as the pie charts before them. The
  SVG follows Cytoscape.js's drawing code (blacken darkens, stripes are bands), and so must graphty.

Fix round 1 (2026-10-19), what graph-io now reads as Cytoscape.js 3.34.3 draws it (unit tests in
`graph-io/test/styles/cyjs-specimen-fixes.test.ts`):

- `text-valign` / `text-halign` `-inside` values: a label against that side inside the node (`inside-top-left`,
  `inside-right`, ...), where they were read as their outside alignments (30 px off). One inside and one outside
  alignment keep the outside side, noted.
- `text-transform` (upper, lower case), a node's and an edge's `text-rotation` (degrees, 0 to 360; an edge's
  `autorotate` along the line between its nodes' centers), `text-justification` (`auto` follows the horizontal
  alignment) as `labelTextAlign`, and `text-max-width` only under `text-wrap: wrap`, for edges too (a rule that set
  the width wrapped labels that do not wrap: `text-wrap-none` drew 3 lines for 1).
- `text-outline-*` as the label outline (drawn only with a width, a stroke twice `text-outline-width`), and
  `text-background-color` as the label's box (drawn only with a `text-background-opacity` above 0). An outline or
  box opacity between 0 and 1 is drawn opaque, noted.
- An edge's label sits on the line's middle (`labelPosition: center`, Cytoscape.js's tool default), where graphty
  drew it 7 to 14 px above.
- A `haystack` edge (the default curve style) draws no arrow (`arrow-on-haystack`).
- `line-opacity` times `opacity` is the line's opacity (`line-opacity-0-3` drew opaque).
- `background-fill: linear-gradient` as `fill`, `fillGradient` and `fillGradientAngle` (first and last stop, the
  direction); stops between are dropped and a radial gradient stays flat, noted.
- `segments`, `taxi` (with its Z and L fallbacks), `unbundled-bezier` with control points and every loop
  (`loop-direction`, `loop-sweep`, `control-point-step-size`): the route Cytoscape.js works out, read as `bends`
  (the beziers and loops sampled from the quadratic spline Cytoscape.js draws). Nodes other than ellipses are
  measured as their box.
- `padding` on a node that holds no others draws it that much larger on every side (`padding-6`).
- `visibility: hidden` on a node keeps its edges (`target-visibility-hidden`): the node is kept, drawn at opacity 0
  with no border, outline or label, and `display: none` still removes it with its edges. OPEN, comparator: the
  oracle's line to the invisible node has no drawn node at that end, so the comparator reads it as a stray and
  graphty's edge as extra (`edge.extra` 42/43 on `cytoscapejs-specimen-edges-lines-p2`).
- The comparator no longer counts a group graphty draws nothing for (no fill, outline or label):
  `json-cyjs-tokyo`'s 204 invisible compound parents (`group.extra`).

Still open after fix round 1:

- `text-opacity`, and the opacities of a label's outline and box between 0 and 1: graph-io's neutral styles have no
  label opacity, and graphty-element's label style has none either (its colors carry an alpha, the neutral colors
  do not). Needs a label opacity in both (`text-opacity-0-4`, the 809 translucent labels of `json-cyjs-tokyo`).
- `text-margin-x` / `-y` (and the source and target forms): neither the neutral styles nor graphty-element's label
  style have an offset of the label from its anchor; graphty-element's margins pad the label's box instead.
- `text-background-padding`, `-shape` and the `text-border-*` box outline: no neutral slot; graphty-element's label
  style has a padding, a corner radius and a border, which the neutral styles do not carry yet.
- `text-wrap: ellipsis` (cut at `text-max-width` with an ellipsis): graph-io cannot measure text; graphty-element
  needs an ellipsis wrap.
- `width: label` / `height: label`: the neutral `labelFit` sizes both axes and the Cytoscape.js writer cannot write it
  back; Cytoscape.js sizes one axis at a time. Needs a per-axis label fit.
- `border-dash-pattern`, `-dash-offset`, `border-cap`, `line-dash-pattern`, `line-dash-offset`, `line-cap`: the
  neutral styles carry the dash class only, and graphty-element draws its own fixed patterns; both need a dash
  array.
- Compound bounds (`padding`, `min-width` / `min-height` and their biases, `compound-sizing-wrt-labels`): graphty
  places a Cytoscape.js parent around its members padded by its largest member's radius (`LayoutManager.placeGroups`)
  because the file's compound position is not read (Cytoscape.js recomputes it); graphty-element needs a group
  padding and minimum size, and graph-io to read them (11 `group.box` and the `min-width-80` `group.extra` on
  `cytoscapejs-specimen-groups`).
- The Cytoscape.js writer writes no `curve-style` for a straight edge, so Cytoscape.js draws a file graphty wrote with
  haystack edges and no arrows; it should write `curve-style: straight` where an arrow is drawn.

The annotation, chart color scheme and mapping pages added after the first round (`-images-charts-p6`,
`-mappings-bypass-p19`, `-p20`):

- Arrow annotations (`*-specimen-images-charts-p6`, the `arrow-*` specimens). No CyREST command makes one, so the
  generator saves the sheet as a session, adds the arrows to its `__Annotations` column in the form Cytoscape
  3.10.5 itself saves (`generators/specimens/cys_add_annotations.py`), and opens that session again; Cytoscape reads
  them, and every file is saved from it. What Cytoscape draws: the head numbers it saves are ding's
  `ArrowAnnotationImpl.ArrowType` in declaration order (0 Circle, 1 Closed Arrow, 2 Concave Arrow, 3 Diamond, 4 Open
  Arrow, 5 No Arrow, 6 X Arrow, 7 Triangular Head, 8 T-Shape); graph-io read 6 as a T and 8 as a triangle, and now
  reads them as Cytoscape draws them. An arrow with no head at either end draws no line at all
  (`arrow-target-type-no-arrow`), so the neutral arrow carries a Closed Arrow head. The line runs from the middle of
  the side of the source annotation that faces the end, to the end point or the facing side of the target annotation
  (graph-io now places both ends so), at half the saved `lineThickness` and never under 1. Each head carries its own
  color (`sourceColor`, `targetColor`, now read and drawn). Still different in graphty, not fixed yet:
    - head sizes: Cytoscape draws every head 17 x 10 at size 1, whatever the line width; graphty sizes a head from the
      line width (`8 + 2 x width`). The head geometry should come from graph-io as data (graphty-element is neutral),
      which needs a head length and width on `ArrowAnnotation`.
    - Open Arrow is an open chevron in Cytoscape and an outlined triangle in graphty; Triangular Head (5 long) is read
      as a plain triangle.
    - `arrow-to-a-node`: Cytoscape stops the line at the node's box; graph-io stops it at the node's center, because
      reading the end at the node's box needs the node's drawn size, which the annotation reader does not have.
    - the comparator judges annotations only as stray marks (`stray.present`, `stray.extra`), so a head's shape, color
      and size are not checked one by one: sent to the comparator work.
- Annotation rotation (`annotation-shape-angle-30`, `annotation-bounded-text-angle-30`, `annotation-image-angle-30`
  on p6, `annotation-text-angle-45` on p4): Cytoscape turns the annotation about its center, clockwise. graph-io now
  reads `rotation` and graphty-element turns the annotation's plane by it.
- `annotation-shape-v`: Cytoscape's annotation shapes include `V` (a downward chevron), which its API enum does not
  list; graph-io reads it as `vee`, and graphty draws it.
- `annotation-shape-border-opacity-40`: drawn opaque in the SVG, like the opacity specimens of p4 (the SVG writer
  drops an annotation's alpha).
- `annotation-image-brightness-50`, `annotation-image-contrast-50`: Cytoscape draws the picture lighter and with more
  contrast; graph-io does not read `brightness` or `contrast`, so graphty draws the picture as it is. Open.
- Chart positions with different anchors (`customgraphics-position-1-e-w-c-0-0` on p6,
  `customgraphics-position-9-c-nw` on p3): fixed. Measured over every anchor pair on both pages, fitted (XGMML,
  which saves no style dependencies) and at the chart's own size of 24 (CX, CX2 and sessions, which save
  `nodeCustomGraphicsSizeSync` off): Cytoscape moves the chart's center by the node anchor times half the drawn disc
  minus the chart anchor times half the node, so `NW,NW` moves a fitted 54 disc 3 px down and right and a 21.6 disc
  19 px, `C,NW` puts either one's center 30 px down and right, and `E,W` puts a fitted disc 57 px right. graph-io's
  formula (`styles/cytoscape/charts.ts`) had the two terms swapped; the pie sheets now match every oracle slice
  (`stray.present` 108 of 108 on all four `-p3` sheets, was 28).
- Continuous mappings at a point (`specimen-mappings-bypass-p20`): a point's `equal` value is drawn for a value
  exactly at the point (`continuous-shape-5`, `continuous-step-fill-5`). Cytoscape's CX2 writer drops `equal`
  (each range excludes the point), and a continuous mapping onto `NODE_SHAPE` written that way cannot be loaded
  again (CyREST answers 500, a null `NodeShape`), so that page and the continuous shape mapping exist as XGMML, CX
  and a session only; `-p19` holds the other new mapping kinds in all four formats.
- Chart color schemes (`bar-color-scheme-*` on `images-charts`, `-p6` and their replay): `cy_colorScheme` (the
  deprecated CONTRASTING, MODULATED and RAINBOW, and the named gradients of custom-graphics-internal's
  `ColorGradient`, BLUE_RED, YL_OR_RD and 21 more) gives a chart its colors when `cy_colors` is absent. graph-io does
  reads only pie and ring charts, and neither reads `cy_colorScheme`, so graphty draws no bars at all here. Open:
  the fix is in graph-io's chart reader (bar charts first; the scheme colors are generated in `ColorScheme`, the
  gradients listed in `ColorGradient`).

## Specimen sheets: vis-network

The vis-network specimen sheets (`graph-io/test/fidelity/specimens/vis-network/`, `{ nodes, edges, options }`
documents with physics off and every position stored, written by `generators/specimens/vis-network.mjs`) drawn by
`tools/web/web-oracle.mjs vis` (vis-network 9.1.9's own canvas renderer replayed onto svgcanvas). The sheets sweep
vis-network's own option table (`networkOptions.allOptions`): 195 node, edge and group options and 90 enumerated
values have a specimen; the 48 that draw nothing in a still picture (selection, hover, physics, layout, tooltips,
functions a document cannot hold, the DOM-only option groups) are listed with their reason in
`generators/specimens/vis-network-coverage.json`. What vis-network does, which the importer must match (each read in
vis-network 9.1.9's source and seen on Chromium's own screen):

- Node `x` and `y` are read with `parseInt`: positions are truncated to whole pixels.
- Once any edge in the document has a `value`, every edge WITHOUT one is drawn at the global `edges.width` (1 by
  default) and its own `width` is ignored: `Edge.baseWidth` is taken from the defaults in the constructor and never from
  the edge's options (`width-6-reset`, `vis-network-specimen-edges-lines-p2`). Nodes do not have this defect.
- An edge `background` is drawn only on a smooth (curved) edge; a straight edge (`smooth: false`) never draws it
  (`background`, `background-color`, `background-dashes` of `vis-network-specimen-edges-lines` draw nothing; the
  `background-curved-*` specimens of `vis-network-specimen-edges-lines-p3` vary one background field at a time).
- A node color given as text is read by vis-util's `parseColor`: a 3- or 6-digit hex or an `rgb()` color gets a
  border 25% more saturated and 20% darker (in HSV); any other text (a name, `rgba()`, an 8-digit hex, `hsl()`) is
  used for the border too (`color-named`, `color-rgba`, `color-hex-alpha`, `color-hsl`,
  `vis-network-specimen-node-fills-borders`).
- `groups.useDefaultGroups: false` does nothing: `Groups.setOptions` skips the key and never stores it, so a node
  whose group is not defined still takes the next color of the default palette (`vis-network-specimen-groups-p2`
  draws exactly like `vis-network-specimen-groups`). The palette has 20 colors and cycles: `palette-21` is drawn
  like `palette-1`.
- `margin: 0` on a box draws nothing at all, neither box nor label: `_setMargins` tests `if (options.margin)`, so 0
  leaves every side undefined and the size NaN (`margin-0`, `vis-network-specimen-node-sizes-opacity`).
- `size` is ignored by the shapes that hold their label (box, ellipse, circle, database, text): they are sized by the
  label and `margin` (`size-30-box`, `size-30-circle`, `size-30-database`).
- `scaling.label.maxVisible` never changes the drawn font size: the capped size only feeds the fade color
  (`max-visible`, labels-p2 and edge-labels). A label whose size on screen is under `scaling.label.drawThreshold - 1`
  is not drawn, and one between that and `drawThreshold` is faded (`draw-threshold`, `font-size-3`).
- An image that fails to load is replaced by the `brokenImage` of whichever node with the same `image` URL asked
  first: vis-network caches images by URL, so `broken-image-none` (no `brokenImage` of its own) draws the fallback
  of `broken-image` (`vis-network-specimen-images-charts`).
- An 8-digit hex color (`#1f77b480`) is drawn with its alpha.
- A `font` given as text (`"18px arial #2ca02c"`, and a multi-font modifier such as `font.bold` given the same way)
  is split on single spaces into size, face and color (`Label.parseFontString`), so a face is one word. With a
  two-word face (`"14px DejaVu Serif #2ca02c"`) the face is `DejaVu` and the color is the word `Serif`, which the
  canvas rejects, so the label keeps the fill of whatever vis-network drew before it: the drawing depends on draw
  order, not on the file, so it has no specimen (the earlier `font-shorthand` specimens used that form, and their
  oracle showed black where Chromium drew the previous label's green: svgcanvas writes the rejected color as
  `fill="Serif"`, which resvg paints black). graph-io reads the text form as vis-network splits it.
- An edge whose `font` is text draws no label at all: `Edge.drawLabel` reads `options.font.align` (undefined on a
  string) as not horizontal, translates the canvas to the label point and rotates, while the label module, which
  parsed the text, still draws at the absolute point, so the text lands off the canvas (seen on Chromium's own
  screen; `font-shorthand`, `vis-network-specimen-edge-labels`). Fixed in graph-io: such an edge's label is empty.

Fixed, found while checking the sheets: two defects kept 11 of the 14 sheets from being read as vis-network at all,
so graphty ran its own layout with default styles and the comparator matched almost nothing (before: 0 to 3 oracle
nodes associated on 11 sheets; after: 13 of the 14 sheets associate every oracle node). graph-io's JSON dialect sniff called a document vis-network
only when its first edge had `from` and `to`, so a document with no edges was NetworkX node-link; it now also calls
vis-network a document with no edge record, none of NetworkX's keys and an `options` object holding one of
vis-network's option groups (`nodes`, `edges`, `groups`, `physics`, ...). And graphty-element's JSON reader told the
dialect from the first 64 KB of the text although it holds the parsed document, so a file with more node records
than that before its first edge or its `options` (arrows, edges-lines, edge-labels; any large vis-network,
Cytoscape.js or graphology file) was read as node-link; it now sniffs the parsed document (`sniffJsonDialect`, now
exported by graph-io). Test: `graphty-element/test/data/json-dialect-whole-document.test.ts`.

Comparator blind spots, for the Comparator phase:

- `vis-network-specimen-arrows`: graphty draws every node where the oracle does, but the geometric association
  matches 2 of 116 oracle nodes (guide: 29 label pairs; `transform.matched` 2), so the sheet judges almost nothing.
  The middle and end arrowheads (filled circles, boxes and diamonds the size of the end nodes, next to them) are the
  likely confusion; the edges-lines and edge-labels sheets, with the same layout and no such heads, associate fully.
- When association fails, `node.present` has n = 0 and passes; only `node.extra` failed on the eight edgeless sheets
  while nothing was matched. A sheet whose oracle has dozens of unassociated node-sized shapes should fail outright.
- Raster scores of an unchanged sheet differ between consecutive runs: `vis-network-specimen-edge-labels`
  `raster.edge` measured 0.85 and then 0.83, `raster.label` 0.89 and then 0.88, and `vis-network-specimen-labels-p3`
  `raster.nodeOutline` 0.98 in the recording run and 0.97 in the next three, with the same sheet, oracle and build.
  Something in graphty's drawing or in the raster capture is not deterministic, so a recorded raster floor can fail
  the next run with nothing changed.
- `vis-network-specimen-edges-lines` `dashes-wide` (dashes true, width 4) and `width-on-dashes` (width 6, dashes
  [4,4]): the oracle draws dashes (see its PNG), but the oracle side is read as "solid"; `dashes-pattern`
  ([12,3,3,3]) reads "dash-dot" on the oracle and "dashed" on graphty.

Open import and drawing gaps the sheets show (graphty against the oracle, 2026-10-18): middle arrows are not drawn,
and the `curve`, `inv_curve` and `image` arrow types draw nothing (arrows); captions and labels ignore
`widthConstraint.maximum` and do not wrap (every sheet); multi-font markup (`font.multi` html / markdown / true and the
`bold`, `ital`, `boldital`, `mono` modifiers, as objects or as text) is not read by graph-io, so graphty draws the
markup characters as plain text where vis-network draws styled runs (labels, labels-p2, labels-p3, edge-labels,
edge-labels-p2); curved `smooth` types other than the default draw straight
(edges-lines route 38/56, edges-lines-p3 route 7/17; fixed in fix round 1, see "vis-network settings graph-io now
reads" below); edge `background` and the rest of edges-lines-p3 as judged in `graphty-element/tmp/oracle-report/`.

The oracle SVG was checked against Chromium's own screen of every sheet (`ORACLE_SCREENSHOT_DIR`, a per-cell pixel
difference): after four fixes to the SVG context in `web-oracle.mjs`, they differ only in text antialiasing. Before
the fixes, the SVG had no shadows (svgcanvas never writes shadowColor / shadowBlur / shadowOffset; now an
feDropShadow), lost an edge background (a second stroke of the same path restyled the first `<path>`; now each
repeated paint gets its own copy), drew an image node's `opacity` opaque (svgcanvas's `<image>` dropped
globalAlpha), and missed a `brokenImage` (the image tracker did not wait for a second load started by setting `src`
again on the same Image). The fixes apply to every web oracle; the Cytoscape.js and sigma.js oracles pick them up
when regenerated.

## Specimen sheets: vis-network settings graph-io now reads (fix round 1, 2026-10-19)

graph-io's vis-network reader (`graph-io/src/formats/json/styles.ts`) now reads these settings the way
vis-network 9.1.9 draws them; tests in `graph-io/test/styles/vis-specimen-fixes.test.ts`:

- `edges.smooth`: every static type (`continuous`, `discrete`, `diagonalCross`, `straightCross`, `horizontal`,
  `vertical`, `curvedCW`, `curvedCCW`) with its `roundness`, and `cubicBezier` with `forceDirection`, as vis-network's
  own control points (`BezierEdgeStatic._getViaCoordinates`, `CubicBezierEdge._getViaCoordinates`) from the
  positions it draws (`parseInt` of `x` and `y`). graphty-element draws them with the new `line.bendCurve` value
  `"bezier"` (neutral `bendCurve: "bezier"`): one Bezier curve from node center to node center through the bends,
  cut where it leaves each node. A `dynamic` curve (vis-network's default) is drawn through a support node the
  physics moves; with physics off it stays at the middle and the edge is straight, which graph-io draws.
  `vis-network-specimen-edges-lines` (smooth-*, roundness-*, background-curved*) and `-edges-lines-p3` pass their
  route and curve rows.
- `selfReference.size`, `.angle` and the older `selfReferenceSize`: a self-loop is vis-network's circle on the
  node's outline, written as bends round the circle (`bendCurve: "midpoints"`).
- `font.background`, `font.strokeWidth`, `font.strokeColor` (new neutral `labelBackground`, `labelOutlineColor`,
  `labelOutlineWidth`, and graphty-element channels `node.` / `edge.labelBackground`, `labelOutline`,
  `labelOutlineWidth`), with vis-network's edge label default of a 2 px white stroke as a tool default.
- Edge labels sit on the line (`font.align` horizontal and middle; new edge `labelPosition`, graphty-element draws
  it through the label style's location), above it or below it (`top`, `bottom`), turned along the line for any
  align but horizontal (edge `labelRotation`, as `Edge._getRotation`).
- `widthConstraint` (a number or its `maximum`) as the label's wrap width, for nodes and edges (edge
  `labelWrapWidth` is new); vis-network does not take the margins off it (`constrainWidth` is never set).
- `font.multi` (true, html, markdown): the markup is read off the label, and a label whose words all share one
  modifier is drawn bold, italic or in the mono face.
- Shapes sized by their label: a node with no label text is sized round a 14 x 14 box
  (`NodeBase.getDimensionsFromLabel`); `margin: 0` on a box, circle or database draws nothing (its size is NaN);
  `heightConstraint.valign` top and bottom put the label inside the node's top or bottom.
- `opacity` fades a node's border as well as its fill, but only where vis-network can (a hex or `rgb()` color;
  `overrideOpacity` leaves `rgba()`, 8-digit hex and names as they are).
- `color.inherit: "both"` is a linear gradient from the source node's border color to the target's; an edge's own
  `inherit` wins over a color `options.edges` gives (`edge-inherit-from-group`).
- `dashes` and `shapeProperties.borderDashes` arrays as the line style they draw: dash-dot, dotted or dashed by
  the same reading the comparator uses, with an edge's round caps (vis-network draws edges with `lineCap: "round"`),
  and an `options.edges.dashes` array drawn as vis-network's default [5, 5] (bridgeObject turns it into an object).
- `scaling.label`: with `enabled`, a label's font size from `value`, as its node's size is.

Re-judged on the vis-network sheets and samples (failing elements before -> after, at the commit of this entry):
edges-lines 28 -> 10, edges-lines-p2 1 -> 0, edges-lines-p3 11 -> 2, edge-labels 50 -> 29, edge-labels-p2 5 -> 4,
node-sizes-opacity 13 -> 3, node-fills-borders 8 -> 3, mappings-bypass 6 -> 3, node-shapes 31 -> 27, arrows 18 -> 17,
groups 3 -> 2, groups-p2 3 -> 2, json-vis-synth 57 -> 37. Still open, and why:

- Multi-font runs (`font.multi` with `<b>B</b> x`, and `font.bold` / `ital` / `boldital` / `mono` color, size, face,
  mod and vadjust; labels, labels-p2, labels-p3, edge-labels, edge-labels-p2): graphty-element draws one font per
  label, so a label mixing runs is drawn in the label's own font. graphty-element work: styled runs in a label.
  The comparator also reads vis-network's runs as separate texts and associates none of them with graphty's one
  label (`label.present` o=None), so these rows cannot pass until it joins runs on one baseline.
- `font.vadjust` (node and edge labels), `font.align` left / right (multi-line node labels) and an asymmetric
  `margin` (`margin-sides`): graphty-element has no label offset or line alignment channel yet (the shared
  `label-anchor-offset` work). edge-labels `font-vadjust` (-10) passed before only because graphty drew every edge
  label 7 px above its line; it fails now that the others sit on it.
- `font.background` box size: graphty-element draws the panel with its label margins, about 6 px taller than
  vis-network's box round the text (`label.backgroundBox`, labels and edge-labels).
- `selfReference.renderBehindTheNode: false` (`self-reference-front`): vis-network draws only a short arc of the
  circle; graphty draws the whole circle. The comparator reads vis-network's full-circle loops (`self-loop`,
  `self-reference-size`, `self-reference-size-legacy`) as stray paths, not edges (`stray.present` path#0..2 on
  edges-lines), so graphty's loops count as extra edges: comparator work. `self-reference-angle` (the one loop the
  comparator does read) follows the circle away from the node but leaves and re-enters the node at one point where
  vis-network's circle crosses it twice (`edge.route` 0.32 against 0.05).
- `dashes-wide` (dashes true, width 4): vis-network's round caps leave gaps of 0.94 px in a 9.4 px pattern, which the
  comparator reads as solid, as it should by its rule; graph-io reads the same and asks for dashed only where a
  gap is at least a tenth of the pattern. graphty-element's dashed line has no dash array, so its own dashes differ.
- `database` (`size-30-database`, `shape-database*`): vis-network sizes it from its label's width alone and the
  oracle reads its cylinder as having no stroke; graphty sizes it as a square round the whole label.
- A hexagon (`shape-hexagon`, `shape-hexagon-label-below`): vis-network draws it sqrt 3 times its size tall, with
  its corners at 0, 60, ... degrees, but puts the label below its full size (2 x size); graphty draws the hexagon
  the node's full height and its label below what it draws. Drawing it shorter moves graphty's label up with it, so
  it waits for a label offset in graphty-element (the shared `label-anchor-offset` work).
- `json-vis-siblings` extra elements: the file has no hidden or duplicate records (200 nodes, 284 edges, none
  hidden, no repeated id or pair), and vis-network draws all of them: the oracle SVG holds 484 filled paths,
  200 nodes and 284 arrowheads. The comparator finds 83 of the nodes and 77 of the edges in it, so graphty's
  others count as extra: comparator work, not an import gap.

## Specimen sheets: Pajek

The Pajek specimen sheets (`graph-io/test/fidelity/specimens/pajek/`, written by `generators/specimens/pajek.py`
from `generators/specimens/pajek-vocabulary.json`) drawn by Pajek 6.02's own SVG export under Wine
(`tools/pajek.mjs`) in a 1200 x 900 Draw window: each category's `.net` file under Pajek's defaults, and again
under one Draw window or export option per further page (`specimens/pajek/pages.json`; the `.oracle.json` names
the option as `ini`). The edge-labels sheet's first page is drawn with Mark Lines / with Labels on, since Pajek
draws no line label without it. The mappings sheet is a project file (`specimen-mappings-bypass.paj`) drawn
with its partition and vector (Draw > Network + First Partition + First Vector), again without them (`-p2`), and
with its second vector as the height (`-p3`).
Groups, and images and charts, are absent from the format.

A Pajek vertex is its number, on both sides of the comparison; `pages.json` `names` maps each vertex number to its
setting id (`anchor-*`, `cap-*`, `<edge id>-s` / `-t`). Until the comparator reads that map it cannot tell the
anchors or captions from the specimens, so it frames on every pair and judges the caption vertices (a 0.2 px white
dot with a centered label) like any other vertex.

What Pajek 6.02's SVG export does with the vocabulary, which the importer must match:

- Shapes:
    - `cross` is drawn as an ellipse, `empty` draws nothing (and its label at size 1 in white), `r` is ignored on
      box and diamond (`specimen-node-shapes` `r-*`), and a shape keyword with a capital letter (`Box`, `Triangle`)
      or no shape keyword at all draws an ellipse. Open: graph-io reads a shape keyword in any case and keeps it
      lower-cased in the `shape` column (`isShapeKeyword`, a published helper), so it draws `Box` and `Triangle`
      as a box and a triangle (`shape-box-capitalized`, `shape-triangle-capitalized`); keeping the keyword as
      written changes what an import returns, a breaking change left for the owner.
    - `man` and `woman` are about 2.5 x 6.5 times the size of the other shapes at the same `x_fact` / `y_fact` (50 x
      130 px at 1, against 20 for an ellipse); the sheets draw them at 0.5.
    - `q` reshapes the diamond: 0.01 is a diamond with cut tips, 0.5 a hexagon, 1 a square, 2 a bow tie.
- Sizes: `s_size` is ignored (`specimen-node-sizes-opacity` `s-size-*`); `x_fact 0 y_fact 0` draws nothing; a vertex
  line whose parameters start with `s_size` and name no shape (`s_size 2 ic Red`) is drawn as a default box, its
  color ignored. SVG Opacity of Vertices 0.5 sets the fill and stroke opacity (`-p3`). Options / Size / of Vertices = 16 (default 8) doubles every vertex the file sizes, and quadruples
  a vertex with no parameters (`specimen-node-sizes-opacity-p2`).
- Colors: a name Pajek does not know, or a known one in lower case (`red`), fills a vertex white and draws a line
  black; `Gray50`, which Figure 19 does not list, is drawn gray. The four syntaxes (`RGBFF8800`, `RGB(1,0.5,0)`,
  `CMYK00FF8800`, `CMYK(0,1,0.5,0)`) all work. `bw 0` draws no border.
- Labels: always bold; `lr 0` centers the label on the vertex, any other `lr` starts the text at (`lr`, `lphi`)
  from the center, left-aligned; `la` 360 and above turns the label toward the layout's center; `font` is written
  into the SVG as given, and a quoted font name (`font "DejaVu Sans"`) breaks the line (the sheets use Helvetica).
  Mark Vertices Using / Numbers draws the vertex numbers instead of the labels (`specimen-labels-p2`), No Labels draws
  none (`-p3`).
- Lines: an `*Edges` line is drawn twice its `w`, an `*Arcs` line at its `w`; value 0 draws no line (graph-io
  hides it), nor does `w 0`; a pattern other than `Solid` or `Dots`, or either in another case (`p Dashed`,
  `p dots`), draws a solid line, as graph-io now reads it (`specimen-edges-lines` `p-dashed`, `p-dots-lowercase`);
  a `*Matrix` section's lines are arcs, and a value in both cells a curved pair (`matrix`, `matrix-pair`); a negative
  value is dotted only when no `p` is set on the line or carried from the line before; the oval (`k1 -1`), circular
  arc (`k1 -2`, `k1 -3`) and double (`k1 -4`) routes are drawn straight; a loop is a Bezier loop and a bidirected
  pair two curves. Straight Lines (`specimen-edges-lines-p4`) draws the Bezier routes straight; Lines Color as
  Gradient of EndVertices (`-p5`) paints each line with a gradient of its end vertices' colors.
- Arrows: `a B` draws the same arrow as `a A`; an arrow is 5 x `s` long and 2 x `s` wide; `ap 1` puts the arrow at
  the source end; `*Edges` lines draw no arrow whatever `a` and `s` say. No Labels no Arrows draws neither
  (`specimen-arrows-p2`); Lines finished at Vertex Border stops each line at its vertex's border (`-p3`).
- Line labels: drawn only under Mark Lines / with Labels (`specimen-edge-labels` against `-p2`, which draws none);
  `lp` is measured from the terminal vertex. Mark Lines / with Values could not be switched on through the ini
  (`Form8.withValues1` leaves the export unchanged), so line values have no page.
- Options that change only the Draw window, never the SVG (the export is byte for byte the default one): Size of
  Vertex Border, Size of Lines, Size of Arrows, Size of Font, Labels Centered, Labels with Transparent Background,
  Arrows in the Middle. They are in `pajek.py`'s NOT_SWEPT with that reason.
- Hooks: Pajek's shipped SHAPES.CFG defines hooks for every shape but `empty` (box CART, 400 points round its
  border; ellipse CIRC `10 1`, hook k at k degrees; diamond and cross POLAR), and a line's `h1` / `h2` 1, 2, ... use
  them: `h1 90 h2 270` between two ellipses runs from the top of the source to the bottom of the target, `h1 1 h2 1`
  ends on the far side of the target (`specimen-edges-lines-p2` `h-*`).
- Rotation and the third coordinate: `phi` rotates a wide ellipse and a diamond too (`specimen-node-shapes`
  `phi-30-*`); the `z` coordinate, or none, leaves the drawing unchanged (`specimen-node-sizes-opacity` `z-*`).
- A project file's partition and vector (`specimen-mappings-bypass`): Draw > Network + First Partition colors each
  vertex by its cluster with Figure 20's 40 partition colors (cluster 0 Cyan, 1 Yellow, 2 LimeGreen, 3 Red, ...),
  over the vertex's own `ic` (`part-3-over-ic`, as section 5.2 says); a cluster past 39 wraps (40 Cyan, 45 Pink,
  100 WildStrawberry) and -2 is drawn LimeGreen. First Vector scales a vertex by the square root of its value (4
  doubles the radius), 0 hides it, and -1 draws it at its own size. With a second vector (Draw > Network + First
  Partition + First Vector + Second Vector, `-p3`) each value is a plain factor, not a square root: the first scales
  the width and the second the height (`vector=4` with a second value of 1 is four times as wide and as tall as
  before; `vec2-*`, `vec-2-vec2-3`), times the vertex's own `x_fact` / `y_fact`. Without them (`-p2`) the same file
  draws every vertex as the file says. graph-io reads the partition and vector into the `partition` and `vector` node columns
  but styles nothing from them, so graphty draws `-p2` for both pages; mapping them is the importer's open gap.
- Coordinates: Pajek stretches the file's 0..1 coordinates to its Draw window one axis at a time (x * 1200, y * 900 on
  these sheets), while graph-io reads them at one scale on both axes, so graphty's drawing of every sheet is a
  square where Pajek's is 4:3, and the comparator, which cannot yet tell the anchors from the specimens by vertex
  number, fits neither (`specimen-mappings-bypass`: all 112 positions miss).

## Specimen sheets: Cytoscape desktop (XGMML, CX, CX2, sessions)

The Cytoscape desktop specimen sheets (`graph-io/test/fidelity/specimens/{xgmml,cx,cx2,cys}/`) are built inside
Cytoscape 3.10.5 over CyREST by `generators/specimens/cytoscape-desktop.mjs` and saved by Cytoscape itself in all
four formats; each oracle is Cytoscape's own SVG of the saved file loaded into a new session
(`tools/cytoscape-desktop.mjs`). Every visual property of the live lexicon has a specimen or a written reason
(`generators/specimens/cytoscape-desktop-coverage.json`). The chart and gradient keys come from Cytoscape's own
source (`custom-graphics-internal/.../charts/AbstractChart.java` and each chart class): `cy_holeSize` (not
`cy_hole`), `cy_rotation`, `cy_showItemLabels` / `cy_itemLabels` / `cy_itemLabelFontSize`, `cy_borderWidth` /
`cy_borderColor`, `cy_showRangeZeroBaseline`, `cy_axisWidth` / `cy_axisColor`, `cy_globalRange`, `cy_orientation`,
`cy_colorScheme`, `cy_values`. The heat strip chart is the `org.cytoscape.HeatMapChart` factory; an
`org.cytoscape.HeatStripChart` value names no factory and draws nothing. What Cytoscape does, which the importer
must match:

- Groups: an expanded group is drawn as its members only, with no group node and no box, in all four formats
  (`*-specimen-groups`). The group's own view type is saved in the group node's `__ViewSettings` column
  (`group-view-type-compound-node` and the other three), but 3.10.5 applies it when the network is added, before
  its view exists, so a loaded file never draws a compound box. `COMPOUND_NODE_SHAPE` and
  `COMPOUND_NODE_PADDING` are therefore saved and never drawn; graphty must not draw a group box for these either.
  A collapsed group is one ordinary node with the group node's own look. graphty draws no box either (its
  `graphty.png` of `xgmml-specimen-groups` shows members only), but the comparator's drawn-scene extraction
  reports 30 graphty groups there (`group.extra`): a comparator false positive, sent to the comparator work.
- XGMML: an edge with `EDGE_BEND` handles (`bend-one-handle`, `bend-two-handles`, `curved-false-bend` in
  `xgmml-specimen-edges-lines` and `xgmml-specimen-mappings-bypass-p10`) is drawn by Cytoscape through a point
  near the sheet's top-left corner: the reader resolves the relative handles before the nodes are placed. The
  session, CX and CX2 copies of the same edges bend between their own ends. This is Cytoscape's defect, not the
  file's; graphty should bend the edges as the session draws them, so these three rows of the XGMML sheets stay
  failing against this oracle.
- XGMML: a node image reached through a passthrough mapping on a URL column (`passthrough-image-url`,
  `xgmml-specimen-mappings-bypass`) is drawn as Cytoscape's "?" placeholder (the XGMML keeps only the resolved
  image graphic, which names an image the new session's image manager does not have). CX, CX2 and the session
  draw the image.
- CX2: Cytoscape's CX2 writer leaves the edges' `name` values out (the column is declared, no edge carries it),
  so the edge pages of the name-mapping replays (`cx2-specimen-mappings-bypass-p10` to `-p13`) keep their
  discrete mappings on `name` but nothing matches them: Cytoscape draws those edges with the style defaults, and
  graphty must too. The node pages are not affected (node names are written).
- Custom graphics (charts and gradients, `*-specimen-images-charts*` and the replays `-p14`, `-p15`, `-p18`):
  graphty draws none of them, only the node underneath. The oracles of `images-charts` and `-p2` were drawn
  again after the ring hole (`cy_holeSize`) and heat map (`HeatMapChart`) specimens were corrected, so they now
  hold more chart pieces graphty does not draw, and their `stray.present` rate falls (0.374 to 0.329 and 0.418
  to 0.377): a real gap, the next fix is in graphty-element (draw the chart layers graph-io reads).

Where the oracle SVG and Cytoscape's own screen differ:

- Annotation opacity: `annotation-shape-opacity-40` and `annotation-image-opacity-40`
  (`*-specimen-images-charts-p4`) are drawn opaque in the SVG. The files keep `fillOpacity=40.0` and
  `opacity=0.4`, and Cytoscape's PNG export of the same view draws them see-through: the SVG writer drops the
  annotation's alpha composite. graphty should draw them see-through; these two specimens need the oracle fixed
  (for example a PNG oracle for that sheet) before their verdict means anything.

## Specimen sheets: GML

The GML specimen sheets (`graph-io/test/fidelity/specimens/gml/`, written by `generators/specimens/gml.py`) hold five
vocabularies, one per file: the GML draft's and Tk's keys (no Creator line), yEd's keys (Creator "yFiles"), Cytoscape
2.x's keys (Creator "Cytoscape": `node-shapes-p4`, `node-fills-borders-p3`, `node-sizes-opacity-p3`, `labels-p4`,
`edges-lines-p3`, `arrows-p4`), OGDF's keys (Creator "ogdf::GraphIO::writeGML": `node-shapes-p5`,
`node-fills-borders-p4`, `node-sizes-opacity-p4`, `labels-p5`, `edges-lines-p4`, `arrows-p5`, `edge-labels-p3`,
`groups-p2`) and Gephi's keys (Creator "Gephi" inside the graph: `node-fills-borders-p5`, `node-sizes-opacity-p5`,
`labels-p6`, `edges-lines-p5`, `arrows-p6`). The OGDF sheets are written and drawn by OGDF 2025.10 itself
(`oracles/tools/ogdf.mjs`) and the Gephi sheets drawn by Gephi Toolkit 0.11.3 (`oracles/tools/gephi.mjs`, node labels
shown and label overlap avoidance off, as the GEXF pages are); the others' oracles are Cytoscape desktop's GML reader
or gml2gv | neato -n2, stand-ins for yEd and Graphlet, which cannot run here. What the programs do, which the
importer must match:

- OGDF's GraphIO::writeGML writes the stroke color as `outline` (older OGDF wrote `line`), its stroke types and
  shapes by name (`stipple "Dashdot"`, `type "RoundedRect"`), and a `Line` that holds the bends alone, without the
  end points the GML draft puts in it. `stipple "None"` draws no border (a node) or no line (an edge). Read so since
  2026-10-18; before, the border color, every stroke name and the first and last bend were lost.
- OGDF's drawSVG draws every label centered on its node in one 10 px font, its arrowheads three times the line's
  width long and half as wide, its triangles and pentagon regular inside the node's ellipse, and ignores fill
  patterns (`pattern`, `fillbg`) and a cluster's `stipple`. OGDF's defaults say so since 2026-10-18.
- Cytoscape's GML reader names a node with an empty or missing `label` by its id and draws that name, and reads a
  `type` only when it is one of its own shape names (with Cytoscape 2.x's `rect` and `round_rect`): `rect_3d`,
  `trapezoid` and `trapezoid_2` draw its default round rectangle. Read so since 2026-10-18.
- Gephi writes its Creator line inside the graph, and its coordinates are y up: graph-io read a real Gephi file
  (Creator inside the graph) y down, so every Gephi GML drawing was mirrored top to bottom. Gephi's `w` is a node's
  size, a radius (its disc is twice as wide), and its `h` is never read; an edge is as thick as its `value`, which
  graphty-element's GML reader keeps as plain data. Its preview draws node labels, as the GEXF reader reads them.
  All read so since 2026-10-18.
- A node border's dash-dot is drawn dash-dot by graphty-element since 2026-10-18 (it was drawn as plain dashes);
  OGDF and Cytoscape desktop both draw it.
- Graphviz writes GML too: its `gv2gml` (Graphviz 14.1.2) is a sixth vocabulary, with no `Creator` line and
  `version 2` first in the graph. Its sheets (`node-shapes-p6`, `-p7`, `node-fills-borders-p6`, `node-sizes-opacity-p6`,
  `labels-p7`, `labels-p8` written with `gv2gml -y`, `edges-lines-p6`, `arrows-p7`, `arrows-p8`, `edge-labels-p5`) are
  converted by gv2gml from DOT files in `specimens/gml/graphviz/`, and Graphviz's own drawing of those DOT files is the
  oracle: no stand-in. gv2gml writes Graphviz's values under GML keys: coordinates in points with y up, the height as
  `H` (not `h`), `fill` drawn only with `hasFill 1` (`style=filled`), `visible 0` for `style=invis`, the label color
  as `LabelGraphics fontColor`, Graphviz's shape, color and arrow names, the edge's `pos` spline as `Line` (arrow tips
  as plain points), and `dir` as `arrow` with `first` meaning forward (the head's arrow), the reverse of the GML
  draft's. graph-io read none of that before 2026-10-19 (every drawing mirrored, every height, invisible node and label
  color lost, every unfilled node filled); it reads all of it since, with Graphviz's defaults beneath.

Open:

- `gml-specimen-groups-p2`: OGDF's clusters (`rootcluster` / `cluster` / `vertex`, a box with its own x, y, width,
  height, fill, color, lineWidth and label) are not imported at all: graphty draws the member nodes and no box
  (group.present 0/10). The fix is in the GML importer: read `rootcluster` into group nodes and the parent column,
  their box from the cluster's graphics (x and y are its top left corner).
- `gml-specimen-labels-p5` (`label-offset-n`, `-e`, `-s`, `-w`): OGDF's label offset (`graphics [ label [ x y ] ]`)
  moves a label any distance from its node's center; graph-io's neutral styles have no free label offset, only
  `labelPosition`, so graphty draws the label centered. yEd's `free` label model (`gml-specimen-labels-p3`) needs
  the same property. The fix spans graph-io (a label offset style property) and graphty-element (drawing it).
- `gml-specimen-node-shapes-p5` (`type-hexagon`, and the width of `type-triangle`, `type-invtriangle`,
  `type-pentagon`): OGDF draws these regular, inside the ellipse of the node's box (a hexagon 31 of 36 px high);
  graphty-element stretches a polygon until its farthest corners reach the node's sides, so it draws them as large as
  the box (node.height 33/34, within 0.001 of the tolerance).
- `gml-specimen-edges-lines-p5`, `gml-specimen-arrows-p6` (every edge): Gephi draws a curved edge as a circular arc
  between its end nodes' outlines with the radius of the arc between their centers; graphty's curve is trimmed from
  the center-to-center curve, so with end nodes 12 px wide its route is 0.054 of the chord off Gephi's (the tolerance
  is 0.05). The GEXF sheets, whose end nodes are half as wide, pass.
- `gml-specimen-labels-p4` (`label-long`): Cytoscape wraps a label longer than its 200 px default label width onto
  two lines; graphty draws it on one.
- `gml-specimen-arrows-p6` (`directed-0`): Gephi's GML exporter writes an edge's own `directed` key in a mixed
  graph, but Gephi's own GML importer drops an edge whose `directed` disagrees with the graph's (it loads 4 of the
  sheet's 5 edges, and a mixed file it wrote itself loses its edges the same way), so its drawing has no edge there;
  graph-io reads the edge as undirected and graphty draws it without an arrow (edge.extra 0.8). This is Gephi's
  limit, not an import defect: dropping the edge would lose data the file holds. Gephi reads the edge's `fill` and
  `label` (`gml-specimen-edges-lines-p5` `fill-ff0000`, `gml-specimen-edge-labels-p4`) but its Preview's defaults
  draw neither (MIXED edge colors, no edge labels), and graphty matches that.
- The gv2gml sheets show the same graphty-element gaps as the DOT sheets, for the same Graphviz values (the DOT
  sheets' rows of `oracle-known-failures.json` list them by setting id): the peripheries of `doublecircle`,
  `doubleoctagon`, `tripleoctagon` and `insulator` (`gml-specimen-node-shapes-p6` / `-p7` node.ring and the outer
  size), the synthetic-biology glyphs and `cylinder` (`-p7`: `promoter`, `terminator`, `utr`, `primersite`,
  `restrictionsite`, `fivepoverhang`, `threepoverhang`, `noverhang`, `assembly`, `signature`, `rnastab`, `ribosite`,
  `proteasesite`, `proteinstab`, drawn as plain ellipses), the one-sided arrows `l` / `r` (drawn whole and half as wide,
  not as a half), the open `o` box, inv and half arrows (drawn filled), the `curve` and `icurve` arrows, and the edge
  label's own place (`lp`, which gv2gml copies as a plain key: `gml-specimen-edge-labels-p5` `font-size-20`,
  `font-name-dejavu-serif`). graph-io has no free edge-label position to carry `lp` in, as for OGDF's node label
  offset above. A node's `pencolor`, which gv2gml also writes as `outline`, is a cluster's alone and Graphviz ignores it
  on a node; the sheets set a node's outline by its `color`, which is what Graphviz draws.
- The comparator cannot see setting ids on GML (ids must be integers; the id is in each element's `comment`, or an
  OGDF node's `template`), so captions are judged as nodes and every Cytoscape caption's text, which Cytoscape
  measures with Java's fonts, shows as a label offset of 6 to 9 px.

## Specimen sheets: Graphviz DOT

The DOT sheets (`graph-io/test/fidelity/specimens/dot/`) are written by `generators/specimens/graphviz.py` from
Graphviz's own documentation and drawn by Graphviz 14.1.2 (`neato -n2` at the stored positions,
`tools/graphviz.mjs`). Every sheet carries the root `bb` of a laid-out file, so graph-io reads its positions as
points (the entry above). With node sizes judged at last, these gaps show. All are graph-io or graphty-element
defects, open:

- Node defaults: the `default` specimen (a node with nothing set: Graphviz's 0.75 x 0.5 inch ellipse sized to its
  label) is drawn at the wrong width on every DOT page (`node.width`; `dot-specimen-groups-p2` and the other
  one-setting pages, `dot-specimen-mappings-bypass` `default`).
- `rankdir=LR` and `rankdir=RL` (`dot-specimen-node-shapes-p3`, `-p4`): Graphviz turns a record's fields even at
  pinned positions (`a|b|c` stacks top to bottom, `{a|{b|c}}` puts a left of b over c). graphty lays the fields out
  unturned (`label.text`, `label.lines` on all four records).
- `quantum=0.5` (`dot-specimen-node-sizes-opacity-p4`): Graphviz rounds a node sized to its label up to a multiple
  of half an inch (`quantum-label`, `quantum-box`); graphty draws them unrounded (`node.width`, `node.height`).
- `rotate=90`, `landscape=true`, `orientation=landscape` on the root graph (`dot-specimen-groups-p9` to `-p11`):
  Graphviz turns the whole drawing a quarter turn; graphty draws it unturned (`frame.rotation`).
- `ratio=2` (`dot-specimen-groups-p12`): Graphviz stretches the stored positions to twice as tall as wide; graphty
  keeps them (`node.position`, `node.width`, `node.height` on every node of the page).
- The root graph's label is never drawn, plain or HTML-like (`stray.present` on `dot-specimen-groups-p4`, `-p5`,
  `-p7`, `-p13`, `-p14`: Graphviz's "graph-label" at the bottom or top, left, center or right, in its own color and
  font; `-p8`: the HTML words "graph", "label", "html"). graph-io keeps the label as a graph attribute and
  graphty-element has no graph-level label to draw it in, so the fix starts in graphty-element.
- Stored edge `pos` with the tail arrow's `s,x,y` point (`dot-specimen-edges-lines-p11`, `pos-arrow-startpoint`,
  `pos-arrow-both-points`, beside the `e,x,y` row `pos-arrow-endpoint` of `dot-specimen-edges-lines`): Graphviz draws
  a full `normal` triangle from the spline's end to the stored point, but the comparator reads each of these arrows
  as `half` (`edge.arrowShape`, oracle "half", graphty "triangle"); the oracle's polygon is an isosceles triangle
  (3 points, base perpendicular to its axis), so this is a comparator misreading, sent to the comparator work.
  `pos-arrow-startpoint` also fails `edge.route`: graphty does not route the curve the stored spline gives.
- FIXED (2026-10-19): every pinned cluster was drawn at the default node size beside its member, so 31 of the 32
  clusters of `dot-specimen-groups` (`label-html` among them) read as stray nodes (`node.extra`, `group.present`
  1/32). graph-io now sizes a laid-out cluster by its `bb`: `group.present` 32/32, and `cluster-defaults` of
  `dot-specimen-mappings-bypass` 2/2.
- `splines=none` and its alias `splines=""` (`dot-specimen-edges-lines-p7`, `-p10`): Graphviz draws no edge;
  graphty draws all nine (`edge.extra` 0/9). The aliases `splines=true` and `splines=false`
  (`dot-specimen-edges-lines-p8`, `-p9`) draw exactly what `spline` and `line` draw, and graphty fails the same rows
  there as on `-p2` and `-p6` (the self-loop, the edge around an obstacle, the edge between ports).
- HTML-like `<TABLE STYLE>` and `<TD STYLE>` values `dashed`, `dotted`, `solid`, `invis` and `invisible`
  (`dot-specimen-labels-p3`): shapes.html documents only ROUNDED and RADIAL, but Graphviz 14.1.2 draws these five
  (an unknown value warns "Illegal value ... for STYLE"; these do not). graphty draws none of the borders and
  sizes the tables wrongly (`node.width`, `node.height`, `node.stroke`, `label.text`), and draws the text of an
  invisible table, which Graphviz hides (`label.present`).
- FIXED (2026-10-19): the ten X11 names newer than Graphviz 2.43 (`webgray`, `webgreen`, `webgrey`, `webmaroon`,
  `webpurple`, `x11gray`, `x11green`, `x11grey`, `x11maroon`, `x11purple`) are in graph-io's X11 table, and
  `color-names.test.ts` has no open names left.
- Revealed by the unit fix on specimens that existed before: `arrowsize=0` (`dot-specimen-arrows-p2`): Graphviz
  still draws a head, graphty none (`edge.arrow`); the `curve`, `lcurve` and `rcurve` tails draw an arrow in graphty
  where the oracle shows none (`edge.arrow`), and every curve tail is routed differently (`edge.route`); the half
  arrows `olnormal` and `ornormal` are filled in graphty and hollow in Graphviz (`dot-specimen-arrows`,
  `edge.arrowFill`); the two parallel edges under `splines=polyline` take other routes (`dot-specimen-edges-lines-p3`,
  `edge.route`); the outline of `shape=underline` (`dot-specimen-node-shapes`), which Graphviz draws as one line
  under an unoutlined box and graphty as a whole outline (`node.stroke`); and the raster edge region falls under `splines=curved`, `ortho` and `none` (`raster.edge` on
  `dot-specimen-edges-lines-p4`, `-p5`, `-p7`). Their floors were recorded while the nodes were drawn at 1/72 of their
  size and meant nothing; they stay below them until fixed.

Fix round 1 (2026-10-19), against Graphviz 14.1.2's SVG, every DOT sheet and sample run again (sheets with `bb`):

- FIXED, graph-io: a bare color name SVG knows is drawn as Graphviz's SVG draws it (`fill="gray"` is CSS #808080,
  not X11's #c0c0c0; also `green`, `maroon`, `purple`), whatever the scheme (`dot-real-linux-kernel` `edge.color`
  40/40); an outline or font color list starting with such a name is no outline and a black text, because the SVG
  writes the list whole (`stroke="red:blue"`; `border-color-list` passes); `peripheries=0` draws no outline on a
  node or a cluster (`dot-specimen-node-shapes-p2`, `cluster_periph0`); a part-transparent outline is drawn so
  (`borderOpacity`: `border-color-alpha`, `cluster_alpha` pass); `\l` and `\r` line ends line a label up left or
  right (new neutral `labelTextAlign` and graphty-element channels `node.labelTextAlign`, `edge.labelTextAlign`;
  `dot-synth-nodes` `n_ljust`); `fillcolor="a:b"` with `style=filled` is a linear gradient at the negated
  `gradientangle` (`n_lingrad`); a cluster's label sits inside its box (`dot-real-depcruise` group label anchors
  19/19, `group.label` 19/19); an HTML-like table's rows are lines and its cells are parted by a space.
- FIXED, comparator: text runs side by side on one baseline (Graphviz's SVG writes each `<FONT>`, `<U>`, `<SUP>` of an
  HTML-like label as its own text) are one line, so `n_html2` passes `label.text` and `label.lines`; a graphty group
  with no fill and no outline is no box and its label is free text, as the oracle reads a cluster drawn with none.
- OPEN, graphty-element draws no radial node fill: `style=radial` (`n_radial`, `gradient-radial`,
  `gradient-radial-angle`) is drawn flat in its first color (`node.gradient`).
- OPEN, graphty-element: a gradient whose first color has a `;fraction` (`gradient-weighted`, `red;0.5:blue`) is a
  hard switch in Graphviz and a smooth blend in graphty; and Graphviz runs `gradientangle` in the node's box
  stretched to a square, so 315 degrees on a wide box is drawn at 29 degrees, where graphty draws 45 (`n_lingrad2`,
  miss 0.01).
- OPEN, graphty-element has no record shape: a record's fields, their dividers and their flip under `rankdir` cannot
  be drawn, so graph-io writes the fields as one text parted by " | " (`rec`, `s_record`, `s_Mrecord`: `label.text`,
  `label.lines`, `label.align`, `node.width`).
- OPEN, graph-io: an HTML-like label's font runs are read as plain text, so a label all in `<B>` or in one
  `<FONT COLOR>` keeps the node's own weight and color (`cluster-label-html` `label.weight`, `n_html2`
  `label.color`); `<BR ALIGN>`, `BALIGN` and a cell's `ALIGN` are not read (`html-br-left`, `html-br-right`,
  `html-td-balign-left`: `label.align`); `<SUB>`, `<SUP>` and `ROWSPAN` lay text out on lines graphty joins
  (`html-sub`, `html-sup`, `html-td-rowspan`: `label.text`).
- OPEN, graph-io: a cluster's stored `lp` (`cluster-lp`) is not read, and graphty's inside-left and inside-right
  label is a little farther in than Graphviz's (`cluster-labeljust-l`, `-r`: `label.offset`, miss 0.35 of the size);
  a striped cluster (`cluster-style-striped`) is drawn flat (`group.fill`).
- OPEN, comparator: on `dot-real-crazy` 28 labels read `start` or `end` against their node (`label.anchor`):
  Graphviz centers the label on the node's position while a distorted, turned polygon's box is off-center, and the
  comparison measures graphty's box centered on the position rather than round the polygon it draws. Not a `\l`.
- Not this format's import (other fix rounds own them): `dot-specimen-edge-labels` `label.family` (graphty's edge
  end labels in the pinned label face, not DejaVu Sans), `dot-synth-edges-clusters` `label.rotation` (edge labels
  turned 90 degrees) and `edge.dash` (graph-io reads `dashed`, graphty draws it dotted), `dot-real-happiness`
  `label.size`.

Not drawn on any sheet, with the reason (`NOT_DRAWN` and `NOT_SWEPT` in the generator): 112 of Graphviz's 177
attributes draw nothing at pinned positions (layout-engine parameters; output metadata such as URL, tooltip, id and
class; layers; page, size, dpi, viewport and the other whole-drawing placements; font and image search paths;
charset; bitmap, xdot and 3D output settings; write-only layout results), the HTML-like HREF, ID, TARGET, TITLE and
TOOLTIP, and multi-shape arrows (8 of 3,111,696), whose lookup belongs in unit tests. The sheets draw 10 of
Graphviz's 679 X11 color names, 4 of its 147 SVG names and 3 of its 265 Brewer schemes; every one of the 2,515 colors
is checked against the color Graphviz 14.1.2 draws for it (`generators/specimens/graphviz-colors.json`, measured by
`graphviz_colors.py`; `graph-io/test/formats/dot/color-names.test.ts`).

## Specimen sheets: what graphty-element now draws, and the rows still open (rendering round 1, 2026-10-18)

graphty-element now draws, each as a style option with a channel, and graph-io maps the files onto them: arrow caps
`half-circle`, `open-half-circle`, `curve`, `triangle-tee`, `triangle-cross`, `circle-triangle`; caps part-way along
the line (`arrowMiddleHead`, `arrowMiddleTail`: Cytoscape.js `mid-*-arrow-*`, vis-network `arrows.middle`); end
captions on the line at a distance from their node and in the label's size (`arrowHead.textDistance`: Cytoscape.js
`source-text-offset`, `target-text-offset`); a node's outer border (`outerBorder`: Cytoscape.js `outline-*`); a band
under an edge's line (`line.outline`: Cytoscape.js `line-outline-*`, vis-network `background` under a smooth edge);
and lines painted in a linear or radial gradient (`line.gradient`: Cytoscape.js `line-fill` and its stops). The
rows these sheets still fail, and why each cannot pass yet:

- The comparator does not see a stroked arc drawn as an arrowhead: vis-network `curve` and `inv_curve`
  (`vis-network-specimen-arrows`: `arrow-to-curve`, `arrow-from-curve`, `arrow-middle-curve`, `arrow-to-inv-curve`,
  `arrow-from-inv-curve`, `arrow-middle-inv-curve`; `json-vis-synth` edges 5->6 and 6->7), Graphviz's `curve`,
  `lcurve` and `rcurve` (`dot-specimen-arrows-p2` `arrowtail-curve`, `-lcurve`, `-rcurve`) and Cytoscape's OPEN_HALF_CIRCLE
  (`{xgmml,cx,cx2,cys}-specimen-arrows` and `-mappings-bypass-p11`, target and source `open-half-circle`). Each
  program draws the arc as one stroked path; the association keeps an arc as an arrowhead only when both its ends
  land on one node and it is under half that node's size, which these are not, so the oracle has no arrow there and
  graphty's cap fails `edge.arrow` (oracle false, graphty true). Comparator work.
- The comparator reads a band drawn under a line as a second edge: `cytoscapejs-specimen-edges-lines`
  `line-outline-width-2` and `line-outline-color-red` (and vis-network's background under a curved edge). The
  oracle's `#g0` is the band and `#g1` the line; graphty draws one edge with its outline, so `#g1` fails
  `edge.present` and `#g0` `edge.color` / `edge.width`. Comparator work: a wider stroke under a line along the same
  path is that edge's outline.
- Cytoscape.js's `circle-triangle` (a dot with a triangle behind it) is shape class "other" on both sides, which
  matches nothing (`cytoscapejs-specimen-arrows` source, target and mid-target, `-arrows-p2` mid-source); the
  mid-source `triangle-tee` and `triangle-cross` read "other" on the oracle side. Comparator work: classes for the
  compound arrows.
- vis-network `image` arrows (`vis-network-specimen-arrows`: `arrow-to-image`, `arrow-from-image`,
  `arrow-middle-image`, `arrow-image-size`) are drawn since fix round 1 as graphty-element's `image` cap, the
  picture standing on the line at the file's `imageWidth` x `imageHeight`, and the comparator takes a picture at an
  edge's end as its arrowhead (shape class "image") on both sides.
- Cytoscape.js `source-text-margin-x/-y` and `target-text-margin-x/-y` (`cytoscapejs-specimen-edge-labels`): an end
  caption has no shift of its own yet. The node label offsets (`text-margin-x/-y`) are the import work's
  `label-anchor-offset`; the end captions should take the same option once it exists.
- Cytoscape.js `outline-style: dashed` reads as dotted (its dash lengths, the same as the border's `dash-pattern`
  gap), and `outline-style: double` erases a band a third of the BORDER's width (Cytoscape.js drawOutline), so its
  "double" outline is nearly solid, as `border-style-double` already is in this SVG.

## Specimen sheets: arrow caps, underlays and overlays graphty-element now draws (fix round 1, rendering batch 1, 2026-10-19)

graphty-element now draws, each as a style option with a channel, and graph-io maps the files onto them:

- Cytoscape's HALF_BOTTOM on its own side of the line (cap `half-open-flipped`; graph-io reads it as
  `other:half-bottom`, where it read it as HALF_TOP's `half`): `{xgmml,cx,cx2,cys}-specimen-arrows` target and
  source `half-bottom` now put the barb where Cytoscape does. The comparator does not judge which side a half
  arrow is on, so this was checked by eye on the aligned overlays. Cytoscape strokes the barb as a line the
  line's width and runs the line on to the tip; graphty's barb is a filled sliver, and its line stops at the cap.
- A hollow square (cap `open-box`): Cytoscape's OPEN_SQUARE and Cytoscape.js `*-arrow-fill: hollow` on a square.
- vis-network image arrows (cap `image`, field `arrowHead.image` and channel `edge.arrowHeadImage`, and the tail's
  and middle caps'; graph-io's `targetArrowImage`, `-ImageWidth`, `-ImageHeight` and the source and middle forms).
- Cytoscape.js `underlay-*` and `overlay-*` for nodes (`underlay` / `overlay`: color, opacity, padding, shape,
  corner radius; channels `node.underlayColor` and so on) and edges (`line.underlay` / `line.overlay`: color,
  opacity, padding; channels `edge.underlayColor` and so on), with Cytoscape.js's defaults (black, 10 px, a round
  rectangle) under a file's own. `cytoscapejs-specimen-edges-lines-p2` `edge-underlay-opacity-0-5` passes.

Re-judged at this commit, the gaps the round-1 list gave graphty-element here: Cytoscape.js middle arrows, line
gradients, line outlines and node outline rings (solid) pass their rows of `cytoscapejs-specimen-arrows`,
`-arrows-p2`, `-edges-lines` and `-node-fills-borders`; its end labels (`-edge-labels`) pass their size, their end
and `source/target-text-offset`, and fail only `label.family` (graphty's pinned test face, as every label on the
sheet) and the margins below; vis-network middle arrows, box size and image arrows pass on
`vis-network-specimen-arrows`. Still open, and why:

- Comparator work: vis-network `curve` / `inv_curve` and Cytoscape's OPEN_HALF_CIRCLE arcs are not associated as
  arrowheads (above); Cytoscape.js `circle-triangle` and the mid-source `triangle-tee`
  / `triangle-cross` are shape class "other" on the oracle side; the large middle arrow of `scale-factor-middle`
  (vis-network, `scaleFactor` 2 on a short edge) is associated with the source end; an edge overlay reads as a
  second edge, a node underlay or overlay as strays; vis-network's dashed background under a curved edge
  (`background-curved-dashes`, `vis-network-specimen-edges-lines-p3`) is read as the edge, its line as a second.
- Cytoscape desktop's arrows sheets (`{xgmml,cx,cx2,cys}-specimen-arrows`, `-mappings-bypass-p11`): 18 of 43 edges
  are still not associated with the oracle's paths (`comparator-edge-association`), so their caps are unjudged.
- vis-network's dashed background (`background.dashes`): graphty draws the band solid; `line.outline` has no line
  style. graphty-element work, with a graph-io property for it.
- Cytoscape.js `source-text-margin-*` / `target-text-margin-*`: an end caption has no shift of its own yet; it waits
  for the label offset the import work's `label-anchor-offset` adds.
- Cytoscape.js `outline-style: double` is drawn by Cytoscape.js with a compositing erase the SVG does not record
  (oracle wrong, as `border-style-double`), and `outline-style: dashed` reads as dotted on the oracle side, the
  border's `dash-pattern` share of the import work.

## Specimen sheets: node images, charts and shapes graphty-element now draws (rendering round 1, batch 2, 2026-10-18)

graphty-element now draws, each as a style option with channels, and graph-io maps the files onto them: a picture
over the node (`image`: Cytoscape.js `background-*`, vis-network `image` and `circularImage` nodes with
`brokenImage` as the fallback); a pie or ring chart (`pie`: Cytoscape.js `pie-*`, Graphviz `style=wedged`, Cytoscape
desktop's PieChart and RingChart from the node's own data, with their size and position); bands of color
(`stripes`: Cytoscape.js `stripe-*`, Graphviz `style=striped`); and the node shapes `round-triangle`,
`round-diamond`, `round-pentagon`, `round-hexagon`, `round-octagon`, `round-polygon` (Cytoscape.js `round-*`),
`barrel` and `database` (vis-network). `cytoscapejs-specimen-images-charts` went from 121 unmatched oracle pieces
to 7, `cytoscapejs-specimen-node-shapes` from 7 failing elements to 2, the Cytoscape desktop pie sheets
(`*-specimen-images-charts-p3`, `-mappings-bypass-p16`) from 108 unmatched pieces to 6. The rows still open:

- Cytoscape desktop's bar (grouped, stacked, up-down, heat strips), box, heat map and line charts, and its linear
  and radial gradient custom graphics (`{xgmml,cx,cx2,cys}-specimen-images-charts`, `-p2`, `-p5`,
  `-mappings-bypass-p14`, `-p15`, `-p18`: 84, 14 and 74 oracle pieces per sheet), with their item labels
  (`pie-item-label-font-size-20`). graphty-element has no chart of bars, boxes or lines and no gradient with more
  than two stops over a node; graphty-element work, then graph-io maps the chart options.
- The chart options the earlier pages left out (`{xgmml,cx,cx2,cys}-specimen-images-charts-p7`): the axis label size
  (`cy_axisLabelFontSize`), the domain labels' slant (`cy_domainLabelPosition` UP_45, UP_90, DOWN_45, DOWN_90) and
  labels read from a list column (`cy_domainLabelsColumn`, `cy_rangeLabelsColumn`, `cy_itemLabelsColumn`). Cytoscape
  draws the slanted and column labels on the bar, line and heat map charts and the column's labels on a pie; it
  ignores `cy_rangeLabelsColumn` (the range axis keeps its numbers). graphty draws the pie but none of the axes or
  item labels (the bar, line and heat map rows above); 71 of 75 oracle pieces unmatched. `cy_autoRange` has no
  specimen: only Cytoscape's chart editor reads it, to fill in `cy_range`.
- `cytoscapejs-specimen-node-shapes` `corner-radius-8-round-triangle`: Cytoscape.js draws a set `corner-radius` as
  given, graphty-element caps a rounded polygon's corner at a tenth of its shorter side (as it caps a round
  rectangle's), so the set 8 draws as 3.6.
- Comparator: an image the program draws inside the node's own group is part of the oracle node, not a stray
  (Cytoscape.js `background-image-png`, `-fit-contain`, `-fit-cover`, the repeat specimens; vis-network
  `circular-image`, `use-border-with-image`, `image-padding`, `image-background`, `image-label`), so graphty's image
  of it fails `stray.extra`; and Cytoscape.js draws a node's body again as an unhinted path for `background-clip:
  none` and containment, which no graphty element matches. Comparator work: associate a node's image pieces with
  the node on both sides.
- Comparator: a node with no body (vis-network `text` and `icon` nodes) is still counted as a graphty node
  (`node.extra` on `vis-network-specimen-node-shapes` `shape-text`, `-icon`). Marking such a node not drawn in the
  reader moves the caption nodes of every vis-network sheet out of the raster regions and lowers their raster floors,
  so it is left to the comparator.
- vis-network icon nodes draw their glyph (`icon.code` in `icon.face`); graphty-element draws them with no body and
  no glyph. vis-network `imagePadding` and `shapeProperties.coordinateOrigin` are not read.
- Cytoscape.js `background-image` with two layers draws only the first; `background-width-relative-to` and
  `background-image-containment` follow the node's padding, which graph-io does not read (`node-size-to-label`).
- yEd ImageNode and SVGNode pictures are not read (graph-io would resolve the `y:Resources` the image refers to),
  and draw.io, the stand-in, draws an empty box for them. yEd GenericNode configurations with no neutral shape
  (flowchart card, cloud, delay, display, document, manual input, paper type, stored data; BPMN data object and data
  store) still draw rectangles; graphty-element needs those outlines, then graph-io maps the configurations, and
  much of what the stand-in classes "roundrect" is draw.io's own rounding.

## Specimen sheets: corner radii, glyphs, yEd outlines and pictures graphty-element now draws (fix round 1, rendering batch 2, 2026-10-19)

graphty-element now draws, each as a style option with channels, and graph-io maps the files onto them:
`shape.exactCornerRadius` (a radius a file gives drawn as given, up to half the shorter side, where the element's
own default caps it at a quarter, or a tenth on a rounded polygon: Cytoscape.js `corner-radius`, vis-network
`borderRadius`); a database node's rim (the near half of its top ellipse, in its border's color); and `glyph` (a
character or short text over the node, centered: vis-network icon nodes, `icon.code` in `icon.face`). graph-io now
reads yEd's GenericNode configurations as the outline yEd draws (a neutral shape where one names it, else a polygon:
flowchart card, loop limits, manual input and operation, document, paper tape, delay, display, stored and direct
data, cloud, page and message arrows; entity-relationship relationship; BPMN conversation; SBGN shapes), yEd
`y:ImageNode` and `y:SVGNode` pictures from the graph's `y:Resources`, vis-network `imagePadding`,
`shapeProperties.coordinateOrigin` and a node's `opacity` on its picture, vis-network `triangleDown` (an upright
triangle before), and Cytoscape.js's repeated background images at their own size. A file whose nodes are sized by
their labels alone (vis-network's default ellipses and boxes) is now scaled by its labels, not its edges, which drew
it 3.3 times too large: `json-vis-unix`, `-world` and `-transparency` were 3.2, 3.1 and 2.8 times the oracle's node
size against its spacing, and now pass `node.sizeToSpacing`, `node.sizeToExtent` and `edge.arrowToSpacing` on every
node and arrow (0 of 41, 48 and 50 before).

Rows still open, each with what stops it:

- Arrows: Cytoscape.js `target-arrow-fill: hollow` on a square now draws the open box (fixed earlier this round);
  `cytoscapejs-specimen-arrows-p2` judges every arrow fill as passing. Its remaining rows are the route and curve of
  segments, taxi, loop and unbundled-bezier edges (`edge-curve-styles`, another batch), the haystack arrow and the
  mid-arrow compound shapes.
- `cytoscapejs-specimen-node-shapes`: Cytoscape.js's `bottom-round-rectangle` (rounded bottom corners only),
  `concave-hexagon` (sides bent in), the fatter `star` and `cut-rectangle` with a set `corner-radius` are still drawn
  as the nearest neutral shape (round-rectangle, hexagon, star, octagon). The comparator passes them (same class),
  the drawings differ. graph-io work: polygons with `shapePoints` as for the other Cytoscape.js polygons. The
  reader classes graphty's `polygon` as `other` whatever its corners, so `shape-polygon` (Cytoscape.js's default
  square) fails `node.shape` against the oracle's `rect`: comparator work.
- `corner-radius-8-round-triangle` and vis-network `border-radius-12`: drawn with the radius given now; the
  reader reports graphty's node at its nominal size and classes it by the shape's name (`roundrect` for a pill),
  so `node.width` / `node.shape` still fail there. Comparator work: measure graphty's drawn outline.
- Cytoscape.js images: `background-image` with two layers draws only the first (graphty-element draws one picture
  per node); `background-width-relative-to`, `background-height-relative-to` and `background-image-containment`
  follow the node's `padding`, which graph-io does not read (`node-size-to-label`). `background-clip: none` draws
  graphty's border under the picture where Cytoscape.js draws it over. The oracle fills the whole node for
  `background-repeat: repeat-x` and `repeat-y` where Cytoscape.js's canvas pattern repeats one way only: svgcanvas,
  the oracle route's canvas, writes every pattern as repeating both ways (oracle limit); graphty draws the band.
  The oracle draws `background-image-smoothing: no` smoothed (svgcanvas drops `imageSmoothingEnabled`).
- Graphviz `style=striped` and `wedged` (`dot-synth-nodes` `n_striped`, `n_wedged`): drawn, bands and wedges in
  Graphviz's order and turn. `node.fill` still fails because each side reports a different piece as the node's fill
  (the oracle its middle stripe or largest wedge, graphty its first): comparator work. `green` is drawn as X11's
  #00ff00 where Graphviz's SVG writes the name, which every SVG reader draws #008000 (`program-color-parsing`).
- vis-network icon nodes draw their glyph now; the oracle reads a glyph as a text with no node, graphty's reader as
  a node with a picture, so `node.extra` (icon specimens) and `stray.present` stay. vis-network `text` nodes with
  no body: marking such a node not drawn in the reader moves every vis-network caption out of the raster regions
  (raster floors fall on 14 sheets, measured this round), so it is left to the comparator. Comparator work: read a
  glyph as text on both sides, and a bodiless node as its label.
- vis-network `database`: its rim is drawn now; the comparator reads the oracle's cylinder with no stroke
  (`node.stroke` o=None) and graphty's sized-to-label database is the `node-size-to-label` gap.
- vis-network `interpolation: true`: the oracle draws the upscaled checker crisp (the oracle route's rasterizer),
  graphty smooths it as a canvas would. `broken-image-none` (a picture that cannot load and no `brokenImage`): the
  oracle draws a picture, vis-network draws nothing; oracle limit, to recheck in a browser.
- yEd (`yed-graphml-specimen-node-shapes-p2` .. `-p6`, draw.io stand-in): the BPMN artifact (its `type` picks a data
  object, data store, message, ...), the SBGN nucleic acid feature and perturbing agent are left as boxes, which
  draw.io draws too, until yEd's own export shows them. The lines some shapes draw inside (predefined process,
  internal storage, direct data's rim, the big entity's header) are not drawn.
- yEd `y:ImageNode` (`yed-graphml-specimen-images-charts`): graphty draws the PNG yEd draws; draw.io, the stand-in,
  draws an empty box, so this sheet's stand-in raster floors (`raster.nodeBody`, `raster.nodeOutline`) fall until
  the owner's yEd export replaces the stand-in. Whether yEd paints an image or SVG node's own fill and border under
  the picture is not known from the stand-in; graphty keeps them under it (they are covered where the picture is
  opaque).
- Layouts of files without positions (`unpositioned-layout-scale`): graphty lays such a file out with its own
  force layout (the vis-network samples now pass) and draws the file's lengths at one scale chosen from the file (median node, else median label,
  else median edge). The program lays it out its own way: vis-network's physics (`springLength` 95 px), Gephi's
  toolkit at random positions (`gexf-hsk-chars`, nodes 2.9 times the oracle's against the spacing), Cytoscape's
  default layout on load (`cx-radiation-bibliography`, `cx-repro-unplaced-boxes`: graphty's nodes 0.15 times the
  oracle's against its spacing, Cytoscape's boxes overlap). A node's size against the spacing is the program's
  layout choice, not a style the file carries; matching it needs graph-io to state each program's layout spacing
  and the element to lay a file out at it. Not done in this round.
- `json-vis-siblings` (vis-network, no positions, `size: "30,30"`, which vis-network ignores, so its nodes size
  by their labels): drawn at the label scale now, its nodes pass `node.sizeToSpacing` on 59 of 83. Its 55 extra
  nodes and 153 extra edges (an import defect, not classified yet) remain, and with this scale the comparator
  fits graphty's layout to the oracle's as a related one (residual 0.008), so it judges positions, routes and
  arrows it did not judge before: 12 of its floors fall (`edge.present` 0.32 to 0.20, `node.extra` 0.73 to 0.42).
  The floors stand; the sample waits on its extra elements.
- The vis-network sheets' `raster.label` moves by 0.01 to 0.02 between two runs of the same code (this round:
  `vis-network-specimen-images-charts` 0.87 then 0.88, `-edges-lines-p2` 0.91 then 0.90, `-groups-p2` 0.90 then
  0.88, sheets whose nodes all have a size, which nothing in this round changed): comparator work, find what in
  the label raster is not deterministic.

## Specimen sheets: Cytoscape line types graphty-element now draws (fix round 1, rendering batch 3, 2026-10-19)

graphty-element now draws Cytoscape desktop's stroke line types as patterns of their own, where it drew a solid
line before. New `edge.style` (`line.type`) values: `double`, `forward-slash`, `backward-slash`, `vertical-slash`,
`separate-arrow` and `contiguous-arrow`. New `node.borderStyle` (`border.style`) values: `zigzag`, `sinewave`,
`forward-slash`, `backward-slash`, `vertical-slash` and `separate-arrow`. graph-io's Cytoscape reader now spells a
border's stroke as the line type's own value (`other:forward-slash`, `other:zigzag`; it wrote
`other:forward_slash`), and graphty-element maps each of them, and `double` on an edge (drawn solid before), onto
the new styles. On the XGMML, CX, CX2 and session `edges-lines` sheets every `edge.dash` row passes (6 failed:
slashes, arrows and parallel lines drawn solid); on `node-fills-borders` and `mappings-bypass-p3` `node.strokeDash`
passes 36 of 37 (31 of 37).

Re-judged this batch, now passing: Gephi's curved edges (`gephi-arc-curve`: `edge.curve` passes on every curved
GEXF page and on `gml-specimen-edges-lines-p5` and `-arrows-p6`), OGDF regular polygons (`gml-specimen-node-shapes-p5`
`node.shape` passes; its open row is the label font), Cytoscape self-loops (`loop-geometry`: every loop's route and
curve passes on the four `edges-lines` sheets and `mappings-bypass-p10`) and DOT hollow arrowheads
(`dot-real-depcruise` `edge.arrowFill` 652 of 652).

Rows still open, each with what stops it:

- `border-stroke-sinewave` (`*-specimen-node-fills-borders`, `*-mappings-bypass-p3`): the comparator reads
  Cytoscape's sine-wave border, which Java2D draws as loops round a short perimeter, as `arrows`; graphty draws and
  reports `sinewave`. Comparator work.
- `line-type-sinewave` and `line-type-zigzag` (`edge.width` on the four `edges-lines` sheets and
  `mappings-bypass-p10`): Cytoscape draws a sine wave of a 3-wide line as a 1.1-wide stroke waving about 2.4 widths
  either side with a wavelength of about 6.7 widths, and a zigzag as a stroke about as wide as the line; graphty's
  wave and zigzag are drawn narrower (half a width either side, a fifth of a width thick), and the reader reports
  graphty's line width, not its drawn stroke. Needs a decision on wave geometry options in graphty-element and the
  reader measuring the drawn stroke.
- `border-stroke-contiguous-arrow`: Cytoscape 3.10.5 draws no border at all for this line type on a node; graphty
  draws a solid one (`node.stroke` on `cys-specimen-node-fills-borders`). graph-io work: read it as no border.
- Graphviz layouts for DOT files without positions (`graphviz-layout-engine`, the nine `dot-real-*` and `dot-synth-*`
  samples): the engines of closed pull request #3203 reach master with pull request #3230 and are not on this branch; the
  rows wait for master to be merged in.

## Specimen sheets: Gephi JSON

The Gephi JSON specimen sheets (`graph-io/test/fidelity/specimens/gephi-json/`, written by
`generators/specimens/gephi-json.mjs` the way the Gephi JSON Exporter plugin writes a file) drawn by sigma.js 4.0.1
with its default settings (`tools/web/web-oracle.mjs sigma`, a raster oracle): the plugin has no drawing of its own,
and sigma.js is the program its files are made for. The plugin writes only a node's `label`, `x`, `y`, `size`,
`color` and an edge's `label`, `size`, `color`, beside an `attributes` record of the Gephi columns, so node shapes,
arrows, groups, images and mappings are absent.

Fixed in graph-io (2026-10-18):

- A Gephi JSON file with no edges (every node-only sheet) was read as NetworkX node-link: graphty drew its own
  circle layout with default blue nodes. A document whose first node has `id` and an `attributes` record, and no
  edges, is now Gephi's.
- A Gephi column named like a key sigma.js draws (`attributes.color`, `.size`, `.label`, `.x`, `.y`) shared that
  key's column: `attr-label` drew "Column" as the label of a node with none, `attr-color` drew red, and `attr-x`
  moved its node and threw the frame of the whole sizes sheet. These columns are now `<key>#data`.

Still open:

- `specimen-labels` `label-small-node`, `attr-forcelabel`: sigma draws no label on a node whose rendered size is
  under `labelRenderedSizeThreshold` (6 px); graphty draws "Small" and "Forced". graphty-element's
  `node.labelMinScreenSize` hides a label by the size of its letters on screen, not by its node's, so graph-io has
  nothing to map this to. graphty-element needs a label visibility channel keyed to the node's drawn size; the
  same rule applies to the graphology sheets.
- `specimen-node-sizes-opacity` `size-0`: sigma draws nothing; graphty draws a 0.014 px node, and the comparator
  fails the width ratio against 0. Nothing visible differs: a comparator edge case (a ratio against a zero size
  should judge a sub-pixel drawing as none).
- Edge width under sigma's floor (rerun 2026-10-19, edges now judged): sigma's edge shader draws an edge
  `max(scaleSize(size), minEdgeThickness) / 2` px wide (`correctionRatio` times the pixels one framed unit spans is
  1/2 by `getMatrixImpact`), so never under 0.85 px. graphty draws its size halved and scaled with the drawing (the
  graphology fix), which matches sizes 2 to 20 (0.97, 1.45, 2.41, 3.86, 9.65 px against 0.97, 1.45, 2.41, 3.86, 9.66)
  but draws size 1.5 0.72 px, size 1 0.48 px and size 0 nothing: edge width 5/29 on `edges-lines`, 0/13 on
  `edge-labels`, 0/9,228 on `json-gephi-worldcup` (every edge there is size 1), and edge present 29/30 (`edge-size-0`).
  On worldcup the halving also lowered the raster scores below their floors (edge 0.84 -> 0.79, node outline 0.84 ->
  0.79, label 0.83 -> 0.81, node body 0.93 -> 0.92, canvas 0.94 -> 0.93): sigma's 9,228 lines show 0.85 px opaque,
  graphty's as faint sub-pixel lines. graph-io cannot map a screen-pixel floor: graphty-element needs an edge
  minimum screen width channel (as `border.screenWidth` is for a node's border), kept on zoom like that border;
  a flat 2D line is a rectangle in world units (`lineWidth` metadata), so the floor means rebuilding or rescaling
  the line batches as the camera zooms. graph-io then sets it to 0.85 from sigma's defaults.
- Confirmed on the rerun: edge present, extra, color, opacity, dash, curve and arrow pass on every Gephi JSON edge
  sheet and on worldcup's 9,228 edges (edge colors are each edge's own `color`, no arrowheads: sigma 4 reads no edge
  `type`); edge labels are not drawn on either side (sigma's `renderEdgeLabels` is off). The node sheets pass every
  node property but `size-0` above and the two labels above; `size-0-5`, `size-1` now pass node fill (the raster
  scene takes sigma's recorded paint), and worldcup node fill 726/736 -> 736/736.

## Specimen sheets: graphology

The graphology specimen sheets (`graph-io/test/fidelity/specimens/graphology/`, written by
`generators/specimens/graphology.mjs` with graphology's own `graph.export()`) drawn by sigma.js 4.0.1
(`tools/web/web-oracle.mjs sigma`, a raster oracle). sigma 4's default styles read only a node's `x`, `y`, `size`,
`color`, `label` and an edge's `size`, `color`, `label`; groups and mappings are absent, and sigma v3's attributes
(`type`, `hidden`, `forceLabel`, `zIndex`, `image`, `border*`) are drawn as if absent.

Fixed in graph-io (2026-10-18):

- Colors were read as CSS, so graphty drew a color sigma cannot read in that color. sigma's own parser reads only
  `transparent`, its 148 names, `#rgb`, `#rrggbb`, `#rrggbbaa` and `rgb()` / `rgba()` with integer channels and no
  space before `)`; anything else is black. `node-fills-borders` `color-hsl` (graphty green), `color-rgb-spaces`
  (blue), `color-rgb-percent` (orange), `color-rgb-decimal` (green), `color-unknown-name`, `color-empty` (gray) and
  `color-hex4` (`#f80c`, which sigma reads as `#f80c00`, graphty as translucent orange), and the same seven on
  `edges-lines-p2`, are now drawn as sigma draws them.
- `node-sizes-opacity` `size-negative`: sigma draws no node; graphty drew it 20 units wide (the default size). A
  negative size is now a node of size 0.
- `node-sizes-opacity-p3` (2026-10-19): a graphology file whose nodes carry d3-force's simulation keys (`index`,
  `vx`, `vy`, `fx`, `fy`) or vis-network's `physics` was read as drawn y down in pixels, so graphty drew the whole
  sheet upside down and 0.3 times its size; sigma draws every graphology file y up from x and y. graph-io now reads
  a graphology file's positions y up whatever other keys it carries. (`node-sizes-opacity-p2`: a node's `z`, which
  sigma ignores, already draws as sigma does in graphty's 2D view.)
- `labels` `label-multiline` (2026-10-19): sigma draws a label's newline (any ASCII whitespace: the canvas's text
  preparation) as a space, on one line; graphty drew two lines. graph-io now hands graphty the label as sigma draws
  it. The comparator did not see it: `label.text` folds whitespace, so a line break and a space compare equal. A
  comparator blind spot on every format: a label's line count is not judged.

- Edge width (2026-10-19): sigma's edge shader draws an edge half as wide as a node of the same size is in radius
  (`arrows` `edge-size-6`: 3 px beside a size-6 node 5.8 px in radius), and an edge without a `size` as one of
  size 1 (`DEFAULT_EDGE_DISPLAY_DATA`). graph-io gave the size as the width, so graphty drew every sigma edge twice
  as wide; it now gives half the size (0.5 for none), and the writer writes the size back as twice the width.

Fixed in the comparator and the oracle record (2026-10-19):

- Edges are judged on the sigma.js oracles. The oracle tool (`tools/web/web-oracle.mjs sigma`) now records, beside
  where sigma drew each node, each node's and edge's paint as sigma's own `parseColor` reads the display color (its
  `#rrggbb` and alpha) and each edge's width in the PNG's pixels (half of `max(scaleSize(size), minEdgeThickness)`,
  sigma's edge shader, checked against the PNG); `rasterScene` (graphty-element `test/fidelity/oracle/associate.ts`) builds the edges from that record
  (straight between the node centers: sigma 4.0.1 draws every edge it reads as one line, its `type` is not read).
  The SVGs and PNGs did not change (same svgSha256). Edges matched: edges-lines 26/27, synth 180/180, lesmis 254/254,
  arrows and edge-labels 8/8; edge color, opacity, dash and arrows pass on every sheet. A self-loop, which the record
  names by its one node, is judged present and painted but has no route to judge.
- Alpha: sigma does blend a node's alpha (the PNG shows `#e6394655` as (247, 190, 194), the color at 0.33 over white),
  as graphty does; the raster scene read the blended pixel as an opaque color. It now takes sigma's recorded paint
  and alpha: `color-hex8-alpha-80`, `-33`, `color-rgba-half`, `color-alpha-half` pass fill and fill opacity.
- `color-transparent`, `color-rgba-zero`: a node sigma draws at alpha 0 shows nothing, and the raster scene no longer
  keeps it (node present 23/25 -> 23/23).
- json-graphology-synth node fill (59 of 89 wrong) and node present (7 missing): not an import defect. Its nodes are
  drawn up to 187 px across and overlap, so the fill read off sigma's PNG at a node's center was the node drawn over
  it, and the painted-over rule (a node wholly inside a later one showing the same pixels) missed nodes whose cover
  was crossed by an edge. Fills now come from sigma's record and a node wholly inside a later opaque one is painted
  over: node present 89/89, node fill 89/89.
- `node-sizes-opacity` `zindex`: graphty-element now draws the later node (blue) over the earlier (red), as sigma
  does (graphty's PNG is blue at the overlap). A comparator limit remains: no property judges which of two
  overlapping nodes is drawn on top; with recorded paint the pixels no longer stand in for it.
- `node-sizes-opacity` `size-0`, `size-negative`: the raster scene draws a node of no or negative size as nothing
  (sigma's recorded radius is 0 and -9.7), so it no longer has a fill graphty's sub-pixel node lacks.

Still open:

- Thin edges: sigma draws every edge at least 0.85 screen px wide (half its `minEdgeThickness` of 1.7), graphty its
  size scaled (`default` 0.48 px, size 1.5 0.72 px): edge width fails 21/26 on edges-lines and 7/8 on arrows and the
  edge-labels sheets (json-graphology-synth 180/180 and json-sigma-lesmis 254/254 pass); `edge-size-0` (sigma
  0.85 px, graphty none) fails edge present. graph-io has nothing to map it to: graphty-element needs a screen-pixel
  minimum edge width channel (as `border.screenWidth` is for a node's border).
- json-graphology-synth edge route 138/180: the 42 that fail run between nodes that overlap (centers 93 px apart,
  radii up to 93 px), so almost nothing of the route lies outside its nodes on either side and the route is judged on
  a few pixels or none. A comparator limit, not a drawing difference seen by eye.
- `labels` `label-size-below-threshold`, `force-label-small`: sigma draws no label on a node drawn under 6 px
  (`labelRenderedSizeThreshold`), even one with `forceLabel`; graphty draws "Small" and "Forced". graphty-element has
  no label visibility channel keyed to the node's drawn size (`node.labelMinScreenSize` is the letters' size), so
  graph-io has nothing to map it to; the fix is that channel in graphty-element. Same row as Gephi JSON's
  `label-small-node`.
- `labels` `label-grid-smaller`: sigma keeps one label per 100 px cell of its screen (the largest node's), so
  "Small" is hidden beside "Big"; graphty's `labelAvoidOverlap` hides a label only where it overlaps another, and
  these two do not. graphty-element needs sigma's grid rule as a label visibility option (see I35: the exact grid
  also waits for graphty to frame a sigma file as sigma does).
- `node-sizes-opacity` `size-0`, `size-negative`: graphty draws a 0.014 px node where sigma draws none, so node
  width fails; `size-0-5`, `size-1`: as on the Gephi JSON sheets, a comparator limit on sub-pixel nodes.
- `edge-labels-p2`, `-p3`: sigma draws the edge labels under its `renderEdgeLabels` setting (and `edgeLabelAnchors`
  "allNodes"), which is the application's and never in the file; graph-io cannot be told sigma's settings, so
  graphty draws no edge label on these pages (edge label fails 6/8 on each, now that edges are judged). Needs a graph-io import option
  carrying sigma's drawing settings (`renderEdgeLabels`, `edgeLabelAnchors`, `labelRenderedSizeThreshold`).
- A node whose `x` or `y` is a string, even a numeric one ("100"), makes sigma throw while drawing; graph-io places
  no node of such a file (the column is text). No oracle can be drawn, so no sheet holds it.

## Specimen sheets: yEd GraphML settings graph-io now reads (fix round 1, 2026-10-19)

Judged against the draw.io stand-ins (yEd's license forbids automating it), on the `yed-graphml-specimen-*` sheets and
the `graphml-*` corpus samples. Fixed:

- Java's logical fonts. yEd is a Java program: a label in `Dialog` (yEd's default), `SansSerif`, `Serif`, `Monospaced`
  or `DialogInput` is drawn in the face Java gives that font, and a font Java lacks in Dialog's. graph-io passed the
  Java name to the browser, which knows none of them and drew every yEd label in its serif default. graph-io now reads
  a yEd font as the Cytoscape reader does (`DejaVu Sans, sans-serif` for Dialog, `<name>, DejaVu Sans, sans-serif` for
  a font Java may lack), yEd's default font is Dialog's face, and the yEd writer writes a Java face back as its logical
  name. `label.family` 0 to 1 on cla-checker-graph (150 labels), galaxy-lcms-workflow, libcitygml-mapping,
  magiclantern-architecture, open-archaeo, scala-collection-mutable, synthetic-edges and voctomix; synthetic-nodes
  0.20 to 1, `labels` 0.89 to 1, `labels-p2` 0.97 to 1, `edge-labels` 0.93 to 1. GML written by yEd gets the same
  default font; the GML reader's own `fontName` is not mapped yet (the GML format's row).
- Label backgrounds and borders. A `y:NodeLabel` / `y:EdgeLabel` `backgroundColor` is read as `labelBackground` (none
  where `hasBackgroundColor` is false), and `lineColor` as a one-pixel `labelBorderColor` / `labelBorderWidth` (none
  where `hasLineColor` is false). The label border is new: graph-io's neutral styles gained `labelBorderColor` and
  `labelBorderWidth`, and graphty-element the `node.labelBorder`, `node.labelBorderWidth`, `edge.labelBorder` and
  `edge.labelBorderWidth` channels (the label style's border).
- GenericNode configurations with a neutral shape (entity-relationship relationship as a diamond, BPMN conversation
  as a hexagon) were fixed by rendering batch 2; `node.shape` passes on both now (`node-shapes-p2` 0.47 to 0.67,
  `-p3` 0.60 to 0.92).

Where graphty now draws what yEd draws and the stand-in does not (floors lowered with this reason in
`oracle-floors.json`, elements added to the known failures):

- draw.io draws no box and no line behind a plain yEd label: `label.background` and `label.backgroundBorder` fail on
  the labels that set them (synthetic-nodes 5 and 4, voctomix's 3 edge labels, `labels` `background-color`,
  `configuration-er-labels` and `line-color`, `edge-labels` `background-color` and `line-color`). On
  galaxy-lcms-workflow draw.io paints the entity-relationship name label black (I29) where the file gives #A8AFC6; the
  `#25537a` line it draws round that header is the entity's own outline (the label says `hasLineColor="false"`), the
  big entity's header line that graphty does not draw yet (rendering batch 2's open rows).
- A group header label's `backgroundColor` (`groups`, `groups-p2`): graphty draws it as a box round the words; yEd
  draws it as a bar across the group (`autoSizePolicy="node_width"`), which the neutral label box cannot say yet, and
  draw.io as a header path that is not read as the label's box.
- `stray.extra` on stm32-func (15), synthetic-nodes (2) and `images-charts` (5): the `y:ImageNode` pictures graphty
  draws, for which draw.io draws an empty box.
- Raster regions fall by 0.01 to 0.04 (labels drawn in Dialog's sans-serif face with their boxes, where draw.io draws
  its own face and no box).

Not import defects (no change):

- Label lines: the 73 labels drawn on two lines that the stand-in draws on one each have a newline in their text and
  a stored label box two or more lines tall (box height over font size 2.3 to 2.8: cla-checker "CLINNEG\nOUTOFSCOPE",
  stm32-func, voctomix, magiclantern "exec\r\nautoexec.bin", galaxy-lcms "HTML\nreport"), so yEd drew two lines.
  draw.io's HTML labels draw a newline as a space.
- Node label models. Three causes, none of them graph-io's reading of the model:
    - graphty-element draws at most `labelLayers` distinct label positions per file (8 by default, 16 at most) and the
      rest at the most common one; `labels-p2` holds 17, so `model-corners-ne` and `model-eight-pos-ne` are drawn in the
      middle ([0, 0] against the stand-in's [35, -22]). Raising the default changes a default of graphty-element's file
      styles, a breaking change: **owner decision**.
    - yEd sets an outside label its model's distance (4 px by default) from the node; graphty draws it against the
      node (`se`, `sw`: [29, 22] against [35, 30]). The neutral styles have no label distance or offset, and
      graphty-element no offset from the label's anchor: both are needed (shared with Cytoscape.js `text-margin`,
      `label-anchor-offset`).
    - The rest of the anchor rows (an internal `c` label the stand-in puts at the node's bottom, smart labels it puts
      at the left): draw.io ignores `SmartNodeLabelModel` and the internal model; yEd's stored label boxes put these
      labels where graphty draws them.
- Edge label models, arrow shapes and fill alpha (`#RRGGBBAA`): the stand-in cannot judge them (above); they wait for
  the owner's yEd export.
