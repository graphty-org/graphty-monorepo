# Owner issue ledger: style import fidelity

The owner's review of the fidelity Storybook (2026-10-17), one row per issue, in the owner's own
words. Each row is closed by comparing graphty's import against the real program's SVG output in
this folder, not against a JSON translation of it. `story` is the fidelity Storybook story id;
`sample` is the matching id in `samples.ts` or `corpus-samples.ts`.

| id  | story                                   | sample                             | owner's words                                                                                            | area                                           | status                                                          | resolution                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --- | --------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| I01 | `cx--ndex-90-f-78-bcd`                  | `cx-ndex-90f78bcd`                 | arrowheads are ~5x too large                                                                             | arrowhead size                                 | fixed                                                           | Fixed in graph-io (each program's arrowhead proportions, `styles/defaults.ts`) and graphty-element (arrowheads drawn in those proportions instead of one fixed `DEFAULT_ARROW_LENGTH`). Against Cytoscape's SVG (2026-10-18 run): arrowhead length 0/108 -> 108/108, width 0/108 -> 108/108, arrow type 216/216. Still open on this sample, not arrowheads: label text 42/75, because Cytoscape wraps long names at its label width and drops the lines past its height (oracle 'Acetylcholine / receptor &', graphty adds 'channel activity'); node height 71/75. [report](http://dev.ato.ms:9323/cx-ndex-90f78bcd.html) Label wrapping (2026-10-18, second pass): Cytoscape desktop wraps by Java's measure, each word with a space after it, in DejaVu Sans (Java's SansSerif and Dialog on Linux); graphty measured without the space, in the browser's sans-serif (Liberation Sans, 14 percent narrower), with letters drawn 3 to 4 percent small (its label size model assumed a 1.33 em line box; DejaVu's is 1.40). graph-io now reads Java's logical fonts as 'DejaVu Sans, sans-serif' and a font Java lacks as '<name>, DejaVu Sans, sans-serif', and states labelWrapTrailingSpace for Cytoscape; graphty-element wraps with it (label field wrapTrailingSpace) and draws a file's letters at the file's size in any font (label field letterSize). Label text 42/75 -> 74/75, label offset 73/75 -> 75/75. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 108/108 -> 108/108; edge.arrowWidth 108/108 -> 108/108; edge.arrow 216/216 -> 216/216; label.text 42/75 -> 74/75.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| I02 | `cx--syn-mappings`                      | `cx-syn-mappings`                  | lines don't match, some text is tilted in the source but not the destination                             | edge style; label rotation                     | fixed                                                           | Fixed in graph-io and graphty-element; against Cytoscape's SVG: label rotation 29/96 -> 96/96 (NODE_LABEL_ROTATION is read as `labelRotation` and drawn by the new `node.labelRotation` channel); edge color 0/37 -> 37/37 and width 4/37 -> 37/37 (the mappings read `weight`, which the CX importer keeps as the edge weight column `graphty.weight`; they now read that column); dash 27/37 -> 36/37 (the comparison read graphty's dash-dot as an unknown pattern); edge present 37/50 -> 37/37 (the 13 'self-loops' were pieces of zigzag and sinewave edges, the file has no loops); label style 77/96 -> 96/96 (`Dialog.bolditalic` and `Serif.italic` are drawn bold and italic). Left: curve 20/37 and route 13/37, on edges Cytoscape draws as zigzags, sine waves and parallel lines that the comparison cannot rebuild into one path. [report](http://dev.ato.ms:9323/cx-syn-mappings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.rotation 96/96 -> 96/96; edge.dash 36/37 -> 42/43; edge.width 37/37 -> 43/43; node.fill 83/96 -> 95/96.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I03 | `cx--syn-bypass`                        | `cx-syn-bypass`                    | missing yellow rectangle in top center; missing lines                                                    | annotations; missing edges                     | fixed                                                           | The yellow rectangle is an image annotation (Cytoscape's logo, which its SVG draws); graph-io now reads it (`readImageAnnotations()`) and graphty-element draws it with its outline. Missing lines: none are missing; the 7 'self-loops' were pieces of other edges' drawing (the file has no loops): edge present 59/66 -> 59/59. Also: edge color 40/59 -> 59/59 (a line's own EDGE_STROKE_UNSELECTED_PAINT bypass wins under arrowColorMatchesEdge); diamonds drawn as ellipses was the comparison reading a custom-graphics image over an ellipse as a diamond, shape now 8/8; label rotation 55/61 -> 61/61; edge route 41/59 -> 46/59 and curve 44/59 -> 54/59 (EDGE_BEND handles are drawn). Left: node fill 53/61 and outline 45/61 are custom graphics (pie charts, gradients, stars) graphty does not draw. [report](http://dev.ato.ms:9323/cx-syn-bypass.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): stray.present 5/82 -> 6/68; edge.present 59/59 -> 61/61; node.fill 53/61 -> 61/61; node.stroke 45/61 -> 61/61.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I04 | `cx--ddram`                             | `cx-ddram`                         | font weight too heavy (same for most other images)                                                       | font weight                                    | fixed                                                           | Root cause in graphty-element: every label was blended twice (its plane was double-sided, which is two coincident quads, both drawn because the material draws back faces) and its texture was mipmapped from straight alpha, which averages the black a canvas holds where it is see-through into every letter's edge. A label is now one quad, uploaded premultiplied and blended as premultiplied (RichTextLabel, LabelBatch). Label ink against the oracle here 1.29 -> 1.03; median over the 34 Cytoscape desktop samples 1.57 -> 0.99; samples within 0.8x to 1.25x of the oracle's ink 22 -> 36 of 69. cys-galfiltered 4.70 -> 0.54 and cys-annotation-example 4.73 -> 0.55 was the measure, not the drawing (2026-10-18): ink was a count of pixels past a cut, and a 2 px glyph filtered from a larger texture spreads the same ink over more, lighter pixels than resvg's grid-snapped glyph. Summed, it is 1.04 on both (0.92 to 0.97 at 2 to 4 px). [report](http://dev.ato.ms:9323/cx-ddram.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.weight 43/43 -> 43/43.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I05 | `cx--radiation-bibliography`            | `cx-radiation-bibliography`        | graph doesn't match, layout doesn't match, styling doesn't match                                         | layout; styling; graph content                 | layout; fixed (graph content)                                   | Not extra nodes: the file has 188 nodes and 207 edges and Cytoscape draws all of them; the comparison finds 171 of Cytoscape's nodes because the two layouts are unrelated (the file stores no coordinates and Cytoscape lays it out its own way), so 17 bodies are not told apart. Its 32 'self-loop' edges were pieces of other edges (edge present 93/191 -> 93/159). Positions and sizes stay unmeasurable without a shared layout. [report](http://dev.ato.ms:9323/cx-radiation-bibliography.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/171 -> 0/188; node.fill 171/171 -> 188/188; node.stroke 171/171 -> 188/188; edge.color 86/93 -> 163/169; edge.width 93/93 -> 169/169; node.present 171/171 -> 188/188; edge.present 93/159 -> 169/169; label.text 170/171 -> 188/188. Open: node position 0/188, because graphty lays the file out itself where Cytoscape keeps its stored view.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I06 | `cx2--ndex-90-f-78-bcd`                 | `cx2-ndex-90f78bcd`                | arrowheads ~5x too large                                                                                 | arrowhead size                                 | fixed                                                           | Fixed with I01; Cytoscape draws the CX2 file the same as the CX one. Arrowhead length 0/108 -> 108/108, width 0/108 -> 108/108. Same label wrapping gap (label text 42/75). [report](http://dev.ato.ms:9323/cx2-ndex-90f78bcd.html) Label wrapping fixed with I01: label text 42/75 -> 74/75, label offset 73/75 -> 75/75. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 108/108 -> 108/108; edge.arrowWidth 108/108 -> 108/108; edge.arrow 216/216 -> 216/216; label.text 42/75 -> 74/75.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| I07 | `cx2--syn-mappings`                     | `cx2-syn-mappings`                 | line weights / dimensions don't match (dotted, zigzag, etc)                                              | edge width; edge line style                    | fixed                                                           | Fixed with I02: edge width 4/38 -> 38/38 (graphty drew the 1 px default, not 7x too heavy), edge color 0/38 -> 38/38, dash 28/38 -> 37/38 (Cytoscape's dash-dot and marquee lines are dashed in its SVG and graphty draws them dash-dot; the comparison now reads graphty's pattern), label weight 77/96 -> 96/96 and style 77/96 -> 96/96, label rotation 29/96 -> 96/96. Zigzag and sine wave are drawn by both. Left: node fill 59/96 and fill opacity 73/96. [report](http://dev.ato.ms:9323/cx2-syn-mappings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.width 38/38 -> 42/42; edge.dash 37/38 -> 41/42; node.fill 59/96 -> 96/96; node.stroke 48/96 -> 91/96.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I08 | `cx2--wp-1449-tlr`                      | `cx2-wp1449-tlr`                   | are we sure the source image is correct, there are edges that aren't connected to nodes                  | reference correctness; edge endpoints          | reference was wrong                                             | The source picture was right: Cytoscape's own SVG also has edges that end away from any visible node, at WikiPathways anchor points (nodes about 0.3 px across). graphty differs elsewhere: 85/137 edges match, and graphty draws 25 group boxes where Cytoscape draws 6. [report](http://dev.ato.ms:9323/cx2-wp1449-tlr.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.route 81/83 -> 120/126; edge.present 83/135 -> 126/133; group.present 7/7 -> 23/23.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| I09 | `cx2--imatinib-smpdb`                   | `cx2-imatinib-smpdb`               | font weight and edge weight don't match                                                                  | font weight; edge width                        | stand-in                                                        | No oracle: Cytoscape 3.10.5's CX2 reader fails on this file every time ("Network view is null"), so there is no drawing to compare against. The text-weight defect of I04 (labels blended twice) is fixed for every sample, this one included; the edge-width question stays open. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I10 | `cx2--signor-aml`                       | `cx2-signor-aml`                   | arrowheads too large                                                                                     | arrowhead size                                 | fixed (arrowheads, group labels); edges were the comparison's   | Arrowheads fixed with I01: length 2/64 -> 60/63, width 2/64 -> 60/63, arrow type 128/144 (16 ends where one side draws an arrow and the other does not). Still open: only 72 of Cytoscape's 293 edges are found in graphty's drawing (graphty draws 306), and group label 0/3: graphty labels the boxes 'AP1', 'NFY', 'NfKb-p65/p50' where the comparator finds no label in Cytoscape's group; the floor (0.25) was met before the branches were merged, so this is a merge regression to trace. [report](http://dev.ato.ms:9323/cx2-signor-aml.html) Group labels (2026-10-18): 0/3 -> 3/3. Cytoscape draws 'AP1', 'NFY' and 'NfKb-p65/p50' (they are in its SVG at the boxes' centers), but paints nodes in an order of its own that the file does not give, so a later node covers them; the comparison now pairs each box with the group graphty draws over it and finds its words even under a node. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 60/63 -> 201/210; edge.arrowWidth 60/63 -> 200/210; edge.arrow 128/144 -> 449/526; edge.present 72/293 -> 263/291; group.label 0/3 -> 3/3. Open: 28 of Cytoscape's 291 edges are still not found in graphty's drawing (not traced).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I11 | `cytoscape-session--luad-vest-v-2`      | `cys-luad-vest-v2`                 | some nodes missing internal yellow color                                                                 | node fill                                      | reference was wrong                                             | As classified: the yellow was Cytoscape's selection highlight. The comparison now loads the network the oracle draws (`network.title`, 'H. sapiens (10)'): node position 4/19 -> 163/163, label text 0/19 -> 163/163, node fill 163/163, edge present 1/6 -> 280/300. [report](http://dev.ato.ms:9323/cys-luad-vest-v2.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 163/163 -> 163/163; node.width 141/163 -> 163/163.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I12 | `dot--profile`                          | `dot-profile`                      | not even close to the right layout                                                                       | layout (Graphviz)                              | layout                                                          | DOT stores no positions and graphty laid it out with its own force layout (node position 0/61, fitted error 0.25 of the diagonal); a Graphviz dot engine is needed. Everything not caused by the layout now passes: arrowhead length 0/85 -> 85/85 and width 0/85 -> 85/85 (I01's fix), node size, outline, label size. Curve 67/85 follows the routes, which follow the layout. [report](http://dev.ato.ms:9323/dot-profile.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/61 -> 0/61.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I13 | `dot--real-crazy`                       | `dot-real-crazy`                   | not even close to the right layout                                                                       | layout (Graphviz)                              | layout                                                          | Layout only (node position 0/41, fitted error 0.19). The import defects measured before are fixed by the Graphviz and arrowhead branches: node outline 0/41 -> 41/41, edge width 0/49 -> 49/49, arrowheads 0/49 -> 49/49 (length and width), node height 6/41 -> 41/41, label size 41/41. Curve 43/49 follows the layout. [report](http://dev.ato.ms:9323/dot-real-crazy.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/41 -> 0/41. Round 4 (2026-10-21): graphty drew every `shape=polygon` node that grows to fit its label too large by its corners' reach a second time: graph-io gives the corners where Graphviz draws them, past the node's box, and the label fit had already grown the box by that reach (`4.2 BSD` drew 305 points wide against Graphviz's 175). The fit now leaves the box at the size the corners are fractions of: node.width 20/41 -> 41/41, node.height 26/41 -> 41/41, label.anchor 35/41 -> 38/41, and on the matched view node.position 32/41 -> 35/41. That also took away the 0.835 scale of every length: Graphviz had spaced the oversized nodes. Open, and not graphty's layout: Graphviz measured the labels in DejaVu Sans (fontconfig's face for the unknown `Helvetica-Outline`: `Mini Unix` 64.5 points at 14), Chromium in its sans-serif, Liberation Sans (57.6), so graphty's nodes are 5 to 14 percent narrower, Graphviz packs them closer, the canvas zooms in and label.size reads 1.13 (0/41), node.position 9/41.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| I14 | `dot--real-siblings`                    | `dot-real-siblings`                | not even close to the right layout                                                                       | layout (Graphviz)                              | layout; fixed (node height)                                     | Layout: node position 0/200, fitted error 0.22. Fixed since the first run: the #add8e6 outline (node outline 0/199 -> 200/200) and arrowheads (0/283 -> 281/284). Still an import defect, not the layout: node height 1.20x Graphviz's (0/200), likely graph-io's DOT node size (Graphviz pads `height` to fit the label at its own font metrics, and graphty draws the declared or a padded height that is 20% taller). [report](http://dev.ato.ms:9323/dot-real-siblings.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 0/200 -> 0/200; node.height 0/200 -> 200/200. Open: node positions, which wait for a Graphviz layout. Round 4 (2026-10-21): the positions are not the layout's. graphty's DOT for this file, handed Graphviz's own node sizes, gives Graphviz's drawing exactly (200/200 nodes within 5 points of the CLI's, offset only by the graph label graphty does not lay out); with node widths 8 percent narrower, the median node moves 180 points. graphty's nodes are about 10 percent narrower than Graphviz's because its tests draw `Verdana` in Inter (test/helpers/pin-label-font.ts) and Graphviz drew it in DejaVu Sans (`Amy Price` 64.5 against 70.4 points at 14). Fixing it means drawing the oracle runs in the faces the programs drew, which moves every Verdana sample's floors.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| I15 | `dot--real-happiness`                   | `dot-real-happiness`               | not even close to the right layout                                                                       | layout (Graphviz)                              | layout; partly fixed (node height)                              | Layout: the file names twopi, graphty used its own force layout (node position 1/77, fitted error 0.26). Import defect, not the layout: node height 1.22x Graphviz's (0/77), the same DOT node height gap as I14. The file asks for URW Chancery or Comic Sans, which the pinned fonts lack (label size still passes 77/77). [report](http://dev.ato.ms:9323/dot-real-happiness.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 1/77 -> 1/77; node.height 0/77 -> 53/77. Open: 24 node heights on dot-real-happiness, where Chromium draws "Verdana" and "Comic Sans" in a narrower fallback font than Graphviz's DejaVu Sans, so the comparison's width-based scale reads correct heights as too tall. Round 4 (2026-10-21): positions pass (twopi places by rank, not by size); node.width 46/77 is the font: Graphviz drew the URW Chancery / Comic Sans list in DejaVu Sans (`Peace` 118.5 points at 40), Chromium in a narrower face (93.3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I16 | `dot--real-depcruise`                   | `dot-real-depcruise`               | are we sure the source image is correct? the edges are a mess                                            | reference correctness; edge routing            | reference was wrong; layout                                     | The source was right: this is Graphviz's own SVG, which really is that tall and dense (natural size 1062 x 7626 pt), and its edges are Graphviz's own splines. Layout: graphty used its own force layout (node position 0/96), so routes and curves differ (curve 181/652). Fixed by the Graphviz branch: cluster outlines are drawn (group outline width 19/19, group present 19/19). Still open: cluster label 17/19 (the two outermost clusters, '..' and 'graph-format', are drawn unlabeled and unfilled; the floor was 19/19 before the branches were merged, a merge regression), and arrowhead length 558/652 (1.67x on the shortest edges). Group box overlap 0/19 is the layout. [report](http://dev.ato.ms:9323/dot-real-depcruise.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): group.label 17/19 -> 17/19.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I17 | `(all dot)`                             | all dot-* samples                  | none of the dot layouts are correct                                                                      | layout (Graphviz)                              | layout; partly fixed (node shapes and sizes)                    | Every DOT sample is laid out by graphty's own force layout ('0 of N placed by the file'), so node position fails on all 9 (fitted error 0.19 to 0.26 of the diagonal); Graphviz engines are needed. Not the layout, still open: node height 1.20x to 1.22x on dot-real-siblings and dot-real-happiness (0/200, 0/77); dot-synth-nodes node width 74/104 (plain and record-like shapes up to 18x too wide) and shape 71/101 (box3d drawn as a plain rectangle, assembly and cds as ellipses); arrowhead length 3.25x on 16 of dot-synth-edges-clusters' 101 edges. Arrowheads pass on the other DOT samples (for example 85/85 on dot-profile, 268/268 on dot-real-softmaint). [report](http://dev.ato.ms:9323/index.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): dot-profile node.position 0/61 -> 0/61; dot-real-crazy node.position 0/41 -> 0/41; dot-real-depcruise node.position 0/96 -> 0/96; dot-real-happiness node.position 1/77 -> 1/77; dot-real-linux-kernel node.position 0/50 -> 0/50; dot-real-siblings node.position 0/200 -> 0/200; dot-real-softmaint node.position 0/213 -> 0/213; dot-synth-edges-clusters node.position 0/68 -> 0/68; dot-synth-nodes node.position 0/104 -> 0/104; dot-synth-nodes node.width 74/104 -> 82/104; dot-synth-nodes node.height 79/104 -> 84/104; dot-synth-nodes node.shape 71/101 -> 85/101; and 1 more on the other samples (report index). Open: node positions and group boxes wait for a Graphviz layout; the biology glyph shapes and record fields have no graphty drawing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| I18 | `gexf--miserables`                      | `gexf-miserables`                  | missing outlines on nodes                                                                                | node outline                                   | fixed                                                           | Fixed in graph-io: Gephi outlines each node in half its fill's channels, 0.08 of its width wide (DependantColor DARKER, measured on every Gephi SVG), and graph-io now gives each GEXF node that outline. Node outline 0/77 to 77/77 on miserables, and 221/221, 366/366, 120/120, 155/155, 96/96, 64/64 on the other samples. [report](http://dev.ato.ms:9323/gexf-miserables.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.stroke 77/77 -> 77/77; node.strokeWidth 77/77 -> 77/77.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| I19 | `gexf--graphology-rio`                  | `gexf-graphology-rio`              | lines missing curve                                                                                      | edge curve                                     | fixed                                                           | Fixed: Gephi's preview curves every edge (EDGE_CURVED), so graph-io marks GEXF edges curved; graphty-element drew every curved edge straight in 2D (it bowed them along z, toward the camera), which it now bows in the drawing's plane. Edge curve 11/1076 -> 1059/1076, edge route 984 -> 1075, edge color 625 -> 1076 (the mix of the end nodes). Two edges fewer curve than before the branches were merged (floor 0.986, now 0.984), and arrow type fell 0.972 -> 0.968 (an arrowhead drawn at the source end where Gephi draws it at the target), both merge regressions with I21's. [report](http://dev.ato.ms:9323/gexf-graphology-rio.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.curve 1059/1076 -> 1057/1076; edge.arrow 2084/2152 -> 2096/2152.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| I20 | `gexf--gsa-fpki-certs`                  | `gexf-gsa-fpki-certs`              | lines missing curve                                                                                      | edge curve                                     | fixed                                                           | Fixed (as I19): edge curve 0/119 -> 119/119, edge route 31 -> 87, node outline 0/120 -> 120/120, label size 0/102 -> 102/102, and arrowheads 0/119 -> 119/119 (I01's fix). Left: label shown 102/120 (Gephi's label overlap hiding, not mapped). [report](http://dev.ato.ms:9323/gexf-gsa-fpki-certs.html) Gephi's label overlap hiding is now mapped (labelAvoidOverlap in Gephi's defaults: DefaultPreset sets node.label.avoidOverlap; graphty keeps the larger font, then the node added first, as Gephi keeps a file's order among labels of one size). Label shown 102/120 -> 99/120: Gephi tests overlap on a 10-unit grid, which hides labels whose boxes only share a cell, and graphty tests the boxes themselves; the 3 are recorded in allowedDrops. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.curve 119/119 -> 119/119.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I21 | `gexf--sigma-ediaspora`                 | `gexf-sigma-ediaspora`             | text too large                                                                                           | label size                                     | fixed (label size, arrow end)                                   | Label size fixed: Gephi draws each label round(0.6 x size) (0.3 of the node's width), which graph-io now gives each GEXF node; label size 24/90 -> 90/90. Arrowhead size passes. Still open: arrow type 578/734 (floor 0.875, now 0.787): on 78 edges graphty draws the arrowhead at the source end where Gephi draws it at the target; it passed before the curve and arrowhead branches were merged, so this is a merge regression in graphty-element's curved-edge arrow placement. Gephi's label overlap hiding (label shown 90/155) is not mapped. [report](http://dev.ato.ms:9323/gexf-sigma-ediaspora.html) Gephi's label overlap hiding is now mapped (labelAvoidOverlap in Gephi's defaults: DefaultPreset sets node.label.avoidOverlap; graphty keeps the larger font, then the node added first, as Gephi keeps a file's order among labels of one size). Label shown 90/155 -> 119/155 here, graphology-rio 270/366 -> 308/366, cns-wos 198/221 -> 202/221, synth-nx-viz 93/96 -> 95/96; miserables 72/77 -> 71/77 (one label, the grid's rounding, recorded in allowedDrops). The arrowhead end on 78 curved edges is not a label defect and is left to the edge work. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.size 90/90 -> 69/69; edge.arrow 578/734 -> 718/734; label.present 90/155 -> 119/155.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I22 | `gexf--synth-nx-viz`                    | `gexf-synth-nx-viz`                | lines too heavy, missing curve, text too large, lines miscolored (e.g. red lines in bottom left)         | edge width; edge curve; label size; edge color | fixed                                                           | All four fixed. Edge width 97/188 to 187/188 (Gephi draws the weight and ignores viz:thickness); curve 0/188 to 188/188; label size 23/93 to 93/93; edge color 102/188 to 188/188 and opacity 17/188 to 188/188 (Gephi mixes the two end nodes' colors and alphas, ignoring the edge's own). Gephi's circles and solid lines: node shape 24/96 to 96/96, edge dash 105/188 to 188/188, node fill opacity 30/96 to 96/96. [report](http://dev.ato.ms:9323/gexf-synth-nx-viz.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.width 187/188 -> 187/188; edge.curve 188/188 -> 188/188; label.size 93/93 -> 93/93; edge.color 188/188 -> 188/188.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I23 | `gexf--hsk-chars`                       | `gexf-hsk-chars`                   | layout doesn't match                                                                                     | layout (positions)                             | layout                                                          | The file stores no positions (0 of 868 placed by the file), so Gephi placed the nodes itself; nothing to compare against (node position 2/868, fitted error 0.25). [report](http://dev.ato.ms:9323/gexf-hsk-chars.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 2/868 -> 2/868.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I24 | `gml--yed-pmodel`                       | `gml-yed-pmodel`                   | source shows nodes without fill, but colored outline; import shows filled nodes with black outline       | node fill; node outline                        | reference was wrong; stand-in                                   | The old picture was Graphviz's gml2gv conversion, which turns a GML `fill` into an outline color. The file gives fill #D2DEEE and outline #000000, which graphty draws. Cytoscape's GML reader (a stand-in oracle: yEd wrote the file and cannot run here) draws the fill but no outline (node outline 0/36), edges 0.5x graphty's width (0/57) and arrowheads 0.44x as long (0/55). None of these can be judged against yEd until yEd draws the file. [report](http://dev.ato.ms:9323/gml-yed-pmodel.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 36/36 -> 36/36; node.stroke 0/36 -> 0/36.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I25 | `gml--synthetic-coverage`               | `gml-synthetic-coverage`           | layout doesn't match, styles don't match, lots of fill issues                                            | layout (positions); styling; node fill         | reference was wrong; stand-in                                   | Layout: graphty matches the file's coordinates (fitted error 0.001 of the diagonal). The fit needs a top-to-bottom mirror because gml2gv copies GML's downward y into Graphviz's upward y, so the old picture was the mirrored one. Styles: the oracle is gml2gv, which draws every fill as an outline (node fill 0/71); it also draws the 2 groups as nodes (82 against graphty's 71 matched). These cannot be judged until yEd draws the file. [report](http://dev.ato.ms:9323/gml-synthetic-coverage.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 80/80 -> 80/80; edge.route 65/80 -> 68/80; node.fill 9/80 -> 9/80; node.stroke 0/80 -> 0/80; edge.color 80/80 -> 80/80; edge.width 80/80 -> 80/80.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| I26 | `(all gml)`                             | all gml-* samples                  | GML fills and outlines generally need work                                                               | node fill; node outline                        | reference was wrong; stand-in                                   | All six GML oracles are gml2gv drawings, which write the GML fill as the outline color with no fill. So node fill and node outline fail on every node of every sample (for example 0/261 and 0/261 on need4stacks261). That reflects gml2gv's reading, not graphty's. yEd (or Cytoscape's GML reader, as for I24) is needed to judge. [report](http://dev.ato.ms:9323/gml-need4stacks261.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): gml-dunnart-autobahn node.fill 0/53 -> 0/53; gml-dunnart-autobahn node.stroke 0/53 -> 0/53; gml-dunnart-autobahn node.strokeWidth 53/53 -> 53/53; gml-dunnart-planar-orthogonal node.fill 0/60 -> 0/60; gml-dunnart-planar-orthogonal node.stroke 0/60 -> 0/60; gml-dunnart-planar-orthogonal node.strokeWidth 60/60 -> 60/60; gml-jgrapht-grid-territorio node.fill 0/25 -> 0/25; gml-jgrapht-grid-territorio node.stroke 0/25 -> 0/25; gml-jgrapht-grid-territorio node.strokeWidth 25/25 -> 25/25; gml-need4stacks261 node.fill 0/261 -> 0/261; gml-need4stacks261 node.stroke 0/261 -> 0/261; gml-need4stacks261 node.strokeWidth 261/261 -> 261/261; and 8 more on the other samples (report index).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I27 | `yed-graphml--yed-voctomix`             | `graphml-yed-voctomix`             | missing text in middle of grouping box                                                                   | group label                                    | fixed; stand-in                                                 | yEd's internal label model (`t`, `tl`, ...) was read as the node's middle whenever the label's box lay inside the node, and neither graph-io nor graphty-element had a position inside a side. Now an `inside-` position (graph-io and `LabelLocation`); a right-aligned header as wide as its group is `inside-top-right`, drawn at the top right like draw.io's. Label offset: synthetic-nodes 48/65 to 54/65, galaxy-lcms 24/31 to 25/31. Group labels are not scored here: draw.io's groups are not detected. Arrowheads and the 3 edge labels: not this fix. [report](http://dev.ato.ms:9323/graphml-yed-voctomix.html) Left (2026-10-18): draw.io, standing in for yEd, does not draw this group's header as a detected group, so group labels are not judged here; nothing in graph-io or graphty-element was found to change. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I28 | `yed-graphml--open-archaeo`             | `graphml-open-archaeo`             | arrowheads too large, stylebox has grey background                                                       | arrowhead size; group fill                     | fixed (arrowheads); reference was wrong (group fill)            | Arrowheads fixed with I01 (length 0/40 -> 100%, width 0/40 -> 100%, arrow type 99%). The grey group background follows the file, which gives the group bodies #F5F5F5 or #CAECFF80; draw.io (the yEd stand-in) draws them unfilled. Left: 34 leftover draw.io shapes (stray 0/34) and edge route 46/52. [report](http://dev.ato.ms:9323/graphml-open-archaeo.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 40/40 -> 40/40; edge.arrowWidth 40/40 -> 40/40; edge.arrow 103/104 -> 103/104.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I29 | `yed-graphml--galaxy-lcms-workflow`     | `graphml-galaxy-lcms-workflow`     | are we sure the source image is right? the nodes are black and white split boxes                         | reference correctness; node shape              | reference was wrong                                             | The black-and-white split boxes are a draw.io export defect: it writes `fill="undefined"` for the entity header, which paints black. yEd would draw a #A8AFC6 header with the name. graphty's node height is 2.2x draw.io's (20/42), but draw.io is unreliable on these shapes. [report](http://dev.ato.ms:9323/graphml-galaxy-lcms-workflow.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.shape 1/20 -> 1/20.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I30 | `yed-graphml--scala-collection-mutable` | `graphml-scala-collection-mutable` | nodes missing gradient, arrowheads too large                                                             | node gradient; arrowhead size                  | fixed                                                           | Gradient: graph-io kept a `y:Fill color2` as a note, the neutral model had no gradient, and graphty-element published no gradient channel. Now `fillGradient` / `fillGradientAngle` in graph-io (yEd's 45 degrees, top-left to bottom-right, written back as `color2`), the `node.gradientColor` / `node.gradientDirection` channels, and texture coordinates on flat node shapes so the ramp is drawn. Node gradient 0/25 -> 25/25 (magiclantern 23/36 -> 35/36). Arrowheads fixed with I01 (length and width 100%). Left: node fill 25/42, a stand-in difference: the 17 nodes have `y:Fill hasColor="false"`, which yEd paints as no fill (a gradient needs both colors) and graphty draws transparent; draw.io's GraphML import fills them white. [report](http://dev.ato.ms:9323/graphml-scala-collection-mutable.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): edge.arrowLength 38/38 -> 42/42; edge.arrowWidth 38/38 -> 42/42; edge.arrow 76/76 -> 84/84; node.gradient 25/25 -> 25/25.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| I31 | `yed-graphml--libcitygml-mapping`       | `graphml-libcitygml-mapping`       | nodes are filled with yellow, source image has no fill                                                   | node fill                                      | reference was wrong                                             | The file fills all 51 UML nodes #FFCC00, so yEd draws them yellow, and graphty's yellow is right. draw.io (the stand-in) drops the fill (node fill 0/51). Arrowheads, 7x before, now pass (I01's fix). [report](http://dev.ato.ms:9323/graphml-libcitygml-mapping.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 0/51 -> 0/51.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I32 | `yed-graphml--stm-32-func`              | `graphml-stm32-func`               | nodes are filled with blue, source image has no fill                                                     | node fill                                      | import defect; stand-in                                         | Node fill 103/143, unchanged. yEd draws a `y:ImageNode`'s embedded image (a `y:Resource` PNG) and no fill. Two pieces are missing: graph-io does not read the image resources, and graphty-element draws no node image (`image` is not drawn). Leaving the node unfilled without its image was tried and dropped: the node then draws nothing and the comparator loses all 15 (143 to 128 matched), and draw.io drops the images anyway, so no oracle can score the fix. [report](http://dev.ato.ms:9323/graphml-stm32-func.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 103/143 -> 128/143.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I33 | `yed-graphml--synthetic-nodes`          | `graphml-synthetic-nodes`          | extra subgroup on imported image, many styles don't match                                                | groups; styling                                | import defect; stand-in                                         | Not an import defect: the 2 group boxes are in the file and draw.io draws the outer one as open header and body paths, which the comparator's group detection (one closed shape) misses; draw.io drops the nested group. Shapes 44/55 to 47/55: yEd's BPMN task, gateway and ER attribute were drawn as boxes. The 8 left are draw.io re-mappings (flowchart `process` with 2 px corners, `hexagon2`, `trapezoid2`). Gradient 57/64 to 58/64, label offset 48/65 to 54/65 (I27, I30). [report](http://dev.ato.ms:9323/graphml-synthetic-nodes.html) Label offset (2026-10-18): the 12 offsets left are draw.io's stand-in, not yEd: draw.io places internal, eight-position, sandwich and side labels where yEd's model does not (for example `internal` `bl` inside the bottom-left corner, which graphty draws and draw.io puts at the top). The one new failure since the merge, shape-diamond, is graphty now drawing yEd's inside bottom-left position; recorded in allowedDrops. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.fill 55/69 -> 55/69; node.stroke 66/69 -> 66/69; edge.color 21/21 -> 21/21; edge.width 21/21 -> 21/21.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I34 | `json--cyjs-tokyo`                      | `json-cyjs-tokyo`                  | source image doesn't have text, imported image does. are we sure the source image is correct?            | reference correctness; label visibility        | reference was right; import defect fixed                        | The oracle is Cytoscape.js's own drawing as its exports make it (renderer.drawElements, as cy.png() and cytoscape-svg do), and it holds every label: white text (`color: #fff`) on a white page, so no ink. graphty drew those white labels as dark smudges: the smaller mip levels of a straight-alpha label texture average the black a canvas keeps where it is see-through into the letters. Fixed with I04 (premultiplied label textures): label ink 189x -> 0.11x the oracle's. Cytoscape.js's `min-zoomed-font-size` is NOT mapped: only its live canvas hides small labels, its exports draw every one, and mapping it would take label.present here from 100% to about 0% against the oracle; graphty-element can do it (`node.labelMinScreenSize`) for a consumer who wants the live behavior. The 204 group boxes and the node count are other areas. [report](http://dev.ato.ms:9323/json-cyjs-tokyo.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 712/712 -> 712/712.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| I35 | `json--sigma-lesmis`                    | `json-sigma-lesmis`                | text too large                                                                                           | label size                                     | fixed                                                           | sigma.js 4 draws a node's label to the right of the node (DEFAULT_NODE_DISPLAY_DATA labelPosition 'right'); graph-io now carries that as sigma's default `labelPosition`. The sizes already matched by eye; the oracle is sigma's own PNG export, so label size is not measured. Measured against sigma's own record of what it drew: node position, size and fill 77/77, label text 51/51, label shown 54/77 (graphty shows 23 labels sigma's label grid hides). [report](http://dev.ato.ms:9323/json-sigma-lesmis.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 54/77 unchanged. Fix round 3 (2026-10-20): the grid is mapped (see I40): label shown 54/77 -> 77/77. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I36 | `json--graphology-synth`                | `json-graphology-synth`            | text behind nodes?                                                                                       | label draw order                               | fixed                                                           | Two defects fixed. sigma.js draws its labels after every node and edge; graphty sorted them by depth with the nodes, so nearer nodes covered them. graph-io now gives sigma's labels `labelOnTop` and graphty-element draws such a label over the whole graph (`node.labelOnTop`). sigma draws no edge labels unless its `renderEdgeLabels` setting is on, and a graphology file carries no settings, so graph-io no longer styles an edge's `label` attribute as a drawn label (the 'e175' labels are gone). Measured against sigma's record: label text 66/66, label shown 68/80 (floor 0.888, now 0.85: 3 labels graphty shows that sigma hides). Still open: node present 80/100 and node fill 26/80, because sigma draws the grid square and graphty stretched, so the fill read off sigma's PNG lands on the wrong node (the positions area). [report](http://dev.ato.ms:9323/json-graphology-synth.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 68/80 unchanged. Fix round 3 (2026-10-20): the grid is mapped (see I40): label shown 77/89 -> 89/89. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 68/80 -> 77/89; node.present 80/100 -> 89/96. Against sigma's own record of its paint (2026-10-19): node present 89/89 and node fill 89/89; the misses were the comparator reading the pixels of nodes drawn over these ones (see Specimen sheets: graphology). Edges judged: present, color and width 180/180, route 138/180 (routes under overlapping nodes).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| I37 | `json--vis-unix`                        | `json-vis-unix`                    | nodes too large, text too large                                                                          | node size; label size                          | layout; fixed (outline)                                         | The file stores no positions, so graphty ran its own layout. Relative to node size, node and label sizes match vis-network (label size, node width, node height 100%). graphty's layout is about 3.5x tighter relative to node size than vis-network's physics result, which is why nodes and text look too large (vis-world and vis-transparency the same). Import defect, still open: node outline 0.56x (0/41): vis-network divides borderWidth by the view's zoom, so its outline is 1 screen pixel at any zoom, and graphty draws it in graph units. [report](http://dev.ato.ms:9323/json-vis-unix.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.size 41/41 -> 41/41; node.width 41/41 -> 41/41; node.height 41/41 -> 41/41; node.strokeWidth 0/41 -> 41/41; edge.arrow 73/98 -> 97/98. Open: node positions, because the file stores none and vis-network runs its own physics.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| I38 | `json--vis-synth`                       | `json-vis-synth`                   | layout flipped                                                                                           | layout (axis orientation)                      | fixed                                                           | Fixed: graph-io read vis-network `x` / `y` as y up unless a node carried `physics`; vis-network draws them straight onto its y-down canvas, so every vis-network document (edges with `from` / `to`) is now read y down, in canvas px. No mirror in the fit (fitted error 0.003), node position 69/71, edge route 96%, label placement 9/70 -> 69/70. Left, not orientation: edge width 69/80 (pairs of neighboring edges with their widths swapped, 6.37 against 0.80 px), node shape 16/18. [report](http://dev.ato.ms:9323/json-vis-synth.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 69/71 -> 69/71; edge.route 77/80 -> 78/80.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I39 | `json--cyjs-perf`                       | `json-cyjs-perf`                   | the source image is a blob of grey nodes. are we sure the source image is correct?                       | reference correctness                          | reference was wrong                                             | The source was right: the grey blob is Cytoscape.js's own drawing of its performance-test file (500 nodes, edges at opacity 0.333, nodes 10 to 60 wide on top of each other). [report](http://dev.ato.ms:9323/json-cyjs-perf.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): no oracle property judges this.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| I40 | `json--gephi-worldcup`                  | `json-gephi-worldcup`              | generated image is a mess of overlapping text                                                            | label size; label visibility                   | fixed (approximate)                                             | sigma.js keeps one label per 100 px screen cell, the largest node's, so few labels show; graphty drew all 736. graph-io now gives sigma's node labels `labelAvoidOverlap`, which graphty-element draws as `node.labelDeclutter: 'size'`: a label whose words would overlap a larger one is hidden, decided again as the camera moves. Measured against sigma's record: label shown 601/736, label text 21/21, node position 736/736, node fill 726/736. graphty still shows more labels than sigma's grid; the exact grid is not modeled. [report](http://dev.ato.ms:9323/json-gephi-worldcup.html) sigma.js's label grid (2026-10-18): the exact grid -- one label per 100 px screen cell, largest node first -- reproduces sigma's own record on lesmis 77/77 and graphology-synth 96/100 when computed on sigma's positions, but on graphty's framing (1.14x to 1.22x smaller and shifted) it scores 46/77 and 62/100, below today's overlap rule; it waits for graphty to frame a sigma file as sigma does (the positions work). Label shown 601/736 -> 603/736. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): label.present 601/736 -> 603/736. Fix round 2 (2026-10-19): sigma's labelRenderedSizeThreshold is mapped (graphty-element `node.labelMinNodeScreenSize`, 12 px from sigma's defaults): label shown 603/736 -> 719/736; sigma's 0.85 px edge floor is mapped (`edge.minScreenWidth`): raster edge 0.79 -> 0.93. The rest waits for graphty to frame the file as sigma does (see Specimen sheets: Gephi JSON). sigma.js's label grid is mapped (fix round 3, 2026-10-20): sigma files each label in a 100 px cell of its first framing (its positions fitted to the canvas, `stagePadding` 30) and draws only the cell's largest node's label (then the lesser key), more as the view zooms in. graph-io now gives sigma's files `labelGridCellSize` 100 in place of `labelAvoidOverlap` (sigma avoids no overlap), and graphty-element lays the grid on that framing of the canvas it draws on, not on its own camera, so graphty's own framing no longer matters: the label ranked r in its cell gets a `node.labelMinNodeScreenSize` of sqrt(r) times its node's size at sigma's framing, so it shows where sigma shows it as the view zooms in. The grid reproduces sigma's record exactly on worldcup (736/736), lesmis (77/77) and the Gephi JSON sheets. Label shown 719/736 -> 728/736; the 8 left are the framing labels below. |
| I41 | `pajek--graphstream-b`                  | `pajek-graphstream-b`              | source image nodes don't have text but the imported image does. are we sure the source image is correct? | reference correctness; label visibility        | reference was wrong; fixed (Pajek defaults)                     | The source was wrong: Pajek 6.02 draws every vertex's label (all 111 phone numbers, Arial bold 15, dark red #ad0000, below and to the right of the vertex), so graphty showing them is right; the old picture was our own sketch, which drew no labels. Against Pajek's own SVG (test/fidelity/oracles/pajek-graphstream-b.svg): label.present 111/111; with the Pajek defaults now measured instead of assumed, label weight and color 0 -> 111/111, node outline color 0 -> 111/111, node fill 13/111 -> 93/111, label offset 0 -> 111/111. Still open: the comparator reads Pajek's diamond, whose tips Pajek cuts (six corners), as a hexagon (shape 88/111); arrowheads 6 long where graphty draws 3.3 (arrow length 0/192); and 18 vertices `ic LightOrange`, a color Pajek lists and its EPS export defines but its SVG export draws in the default color.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| I42 | `pajek--football`                       | `pajek-football`                   | source image doesn't have text, but import image does. are we sure the source image is correct?          | reference correctness; label visibility        | reference was wrong; fixed (Pajek defaults)                     | The source was wrong: Pajek 6.02 draws all 35 labels (football.svg), so the labels graphty draws are right; the old picture was our own sketch. With the Pajek defaults now measured: node width and height 0 -> 35/35 (a vertex is 20 across, not 5), fill and outline 0 -> 35/35 (#ffd9bc with a #660000 outline half a point wide, not yellow and black), label size, weight and color 0 -> 35/35, label offset 0 -> 35/35, and all 118 arcs found (the comparator now reads Pajek's markup). Still open: arrowheads, which Pajek scales with the line's `s` (arrow length 49/118).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| I43 | `pajek--kdorola`                        | `pajek-kdorola`                    | text too large                                                                                           | label size                                     | reference was wrong; fixed (Pajek defaults, carried parameters) | The source had no text at all (our own sketch). Pajek 6.02 draws every label at the file's `fos 9`: vertex 1 sets `lr 11 lphi 285 fos 9` and the 58 vertices after it that set nothing are drawn exactly as vertex 1 (and 61 on as vertex 60's `box`), which graph-io now reads the same way. Against kdorola.svg: label size 127/127, node shape 60/127 -> 127/127, node size, fill, outline, label weight and color 0 -> 127/127. Still open: label offset 0/127 -- Pajek places the text at `lr 11` from the center, closer than graphty's nearest side, bottom-right, puts it.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| I44 | `xgmml--syn-bypass`                     | `xgmml-syn-bypass`                 | layout doesn't match                                                                                     | layout (positions)                             | fixed                                                           | The 6 nodes the file does not place are the two expanded groups (drawn as the box round their members) and the four members of the collapsed group, which XGMML stores only as offsets from the group (`__xLocation`, `__yLocation`); graph-io now places them where Cytoscape expands them, and graphty-element's recommended layout keeps every placed node where the file put it. Node position 0/58 -> 58/58 (fitted error 0.24 -> 0.00, no mirror), edge route 50/59. Still open, not positions: group present 0/2, node fill 50/58 and outline 43/58 (custom graphics), arrowhead length 1.76x on 10 of 60. [report](http://dev.ato.ms:9323/xgmml-syn-bypass.html) Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): node.position 58/58 -> 58/58; edge.route 50/59 -> 54/60; node.fill 50/58 -> 58/58.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| I45 | `xgmml--wp-4271-cy-3-export`            | `xgmml-wp4271-cy3-export`          | grouping areas have too heavy of line weight, too many grouping areas in target image                    | group outline width; group count               | reference was wrong                                             | Against Cytoscape's own SVG, Cytoscape draws every complex group graphty draws (the octagon outlines), filled #b4b464 at 10% opacity with a #aaaaaa outline as graphty does; the 'filled where Cytoscape draws none' and the missing groups were the comparison reading Cytoscape's separately drawn fill and outline as two groups. Group present now 14/17 and group outline width 100%; the heavy look in the old picture came from the JSON reference. Other gaps on this sample: node width 77/122 (WikiPathways anchor and label nodes: Cytoscape draws them 0.02 to 8 px wide, graphty 0.58 px), node fill 93/122, edges 59/82 found. [report](http://dev.ato.ms:9323/xgmml-wp4271-cy3-export.html) Groups (2026-10-18): group present 14/17 -> 20/20. The 3 'missing' were the Legend, Lysosome and Absorption boxes, which graphty draws as the file's annotations; 6 more complex boxes are found now that a box around a flat node is no longer taken for that node's outline. Group label 0/1 is no longer judged: 'Cubam receptor' is a separate transparent label node (Cytoscape node 1277913), not the group's label, and graphty draws it. Merged (2026-10-18, all eight fix branches, against the programs' own SVGs): group.strokeWidth 14/14 -> 14/14; group.present 14/17 -> 20/20; node.width 77/122 -> 97/122.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

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

## How the suite decides pass and fail (from 2026-10-22)

The scorecards gate on elements, not decimals. A sample fails only when an element (a node, edge, group, label or
stray) fails a property that `graphty-element/test/fidelity/oracle-known-failures.json` (or, for the drawn-scene
scorecard, the `known` lists of `baseline-scores.json`) does not list for it: one that passed before, or a new one.
Pass rates, raster regions included, are a report written by every run (`gate.txt`), set against the recorded rates in
`oracle-floors.json`, which no longer fail anything; `allowedDrops` is gone, since nothing is left for it to excuse.
A raster region is reported when it drops more than 0.02; a property with nothing left on the other side to compare
is reported as not measurable, never as a failure. A run given an earlier run's report directory
(`GRAPHTY_ORACLE_BASELINE`) judges those drawings again with its own comparator and marks every change as the
drawing's or the comparator's. `npm run fidelity:ratchet` (graphty-element) applies a run in the same commit as the
change: it takes off what passes, raises the recorded rates, and adds an element only with `--add "<reason>"`,
which it records. The record of rates "lowered" below is history from before this rule; the raster slack described
in the 2026-10-20 report is replaced by the 0.02 report line.

See graph-io/test/fidelity/TOOLS.md, "How the scorecards decide pass and fail".

## Final report: where every format stands (2026-10-20)

The branch was merged with master and every oracle in this folder was judged again (563 samples: 461 specimen sheets
and 102 corpus files, `graphty-element/test/fidelity/oracle-report.test.ts`). Each floor in
`graphty-element/test/fidelity/oracle-floors.json` is now what its sample scores, never above it; a floor that went
down has a `lowered` record with the reason, and every element that still fails a property is listed in
`oracle-known-failures.json`. The settings each format still misses are in that format's section below; this
section gives the totals, what the merge with master changed, and the gaps found while finishing.

Per format, from this run (a sample passes when no element of it fails any property; round 3 of 2026-10-19 had
224 passing samples and 25,325 failing elements):

| format           | samples | specimen sheets | samples with no failing element | failing elements |
| ---------------- | ------- | --------------- | ------------------------------- | ---------------- |
| cytoscapejs      | 24      | 14              | 3                               | 2761             |
| vis-network      | 23      | 16              | 9                               | 1487             |
| graphology       | 21      | 19              | 20                              | 43               |
| gephi-json       | 6       | 5               | 5                               | 8                |
| dot              | 55      | 46              | 4                               | 3999             |
| gexf             | 90      | 82              | 52                              | 3411             |
| yed-graphml      | 28      | 16              | 0                               | 2313             |
| yed-live-graphml | 27      | 27              | 1                               | 694              |
| gml              | 56      | 49              | 27                              | 3295             |
| pajek            | 33      | 24              | 14                              | 308              |
| xgmml            | 52      | 41              | 36                              | 481              |
| cx               | 51      | 41              | 35                              | 1127             |
| cx2              | 49      | 40              | 34                              | 796              |
| cys              | 48      | 41              | 33                              | 461              |
| all              | 563     | 461             | 273                             | 21184            |

What the merge with master changed (judged against the same run of the branch before the merge):

- Nothing in graph-io's reading changed except the Cytoscape font size, which master reads as the whole number
  Cytoscape draws: one mapped label of `cx2-syn-mappings` moves past its anchor tolerance (label.anchor 0.917 to
  0.906).
- graphty-element frames the 2D view about 0.1 percent wider since the merge (`vis-network-specimen-arrows`:
  graphty's node spacing 33.717 to 33.757 against vis-network's 33.682), which moves antialiased pixels: the
  vis-network sheets' raster scores fell 0.01 to 0.05 and `cx2-u2os-hierarchy`'s raster.edge 0.01. graph-io reads
  these files the same as before, and their elements are judged the same.
- `dot-real-depcruise` stores no positions, so graphty lays it out itself, and since the merge its seeded layout
  (seed 42) draws a different picture on each run: it filled 0.75 of the canvas in one run and 1.29 in the next,
  against Graphviz's 0.96 (frame.zoom 1 to 0); before the merge it scored frame.zoom 1 on every recorded run. A
  seed must give the same drawing however the data arrives, so this is an open graphty-element defect (master's
  first-frame paint, eb56d74ba, changed when imported rows are painted, a likely place to look); its floors are
  the lower of the two runs and its known failures the union. Graphviz's own layout engine is the separate open
  gap of I12-I17. Fixed 2026-10-21: the file is laid out by Graphviz, which spaces nodes by their drawn size, and
  a node's mesh took the size its style paints only when a frame drew that paint; when no frame fell between the
  load's styles and its layout (a busy machine), Graphviz was handed every node as the unstyled default circle. A
  snapshot layout now draws the paint that has arrived before it reads node sizes. Four runs (one with every core
  busy) drew every node at the same place, frame fill 0.865 against Graphviz's 0.958, frame.zoom 1 on both views.
- A merge regression found and fixed: master's yEd SmartNodeLabelModel reading placed a label hung from a node's
  top edge as a header inside it, overriding the label's stored box; `graphml-stm32-func` fell from 0.95 to 0.75 on
  label offset. The stored box decides again, and the ratios only where a file stores no box.

Gaps found while finishing, each open:

- Fixed 2026-10-21: the comparator dropped a specimen's label when its words equaled a caption's: a DOT sheet's
  `default` node is labeled `default` (Graphviz's `\N`), and so is its caption, so the label was never judged
  (label.text n = 0 on 29 DOT sheets). A caption a side names (a `cap-*` node, a text it owns) is now left out only
  where it stands; its words on a specimen are the specimen's. All 29 `default` labels are judged and pass but one:
  `dot-specimen-groups-p12` draws its `default` label too large (label.size), because graphty does not stretch
  the layout by the sheet's `ratio=2` as Graphviz does (the same sheet already fails node.width and node.height).
  On a side that names no caption (an SVG of free texts), a specimen labeled as a caption is still dropped.
- graph-io's vis writer writes a vis-network node fitted to its label as a sized `dot`, whose label the reader then
  hangs below it (labelOffsetY 4 on reading back): six vis round trips in graph-io's harness, one in its block
  tests and fourteen in graphty-element's export round trips run as expected failures until it is fixed.
- The Cytoscape.js writer keeps a node's own opacity under a translucent class as an exceptions column that comes
  back as a layer of its own (graphty-element `export-styles` and `export-round-trip`, expected failures), and
  rounds a label offset to 5 decimals where the rules hold 4.333333333333334 (two harness plans, expected
  failures).
- Graphviz's arrow gap is written into Cytoscape files, which have none, and read back as Cytoscape's 4; an edge
  label Gephi hides is written as a label of opacity 0; graphology keeps a label's markup and line breaks only as
  text; the CSV writer names label settings CSV has no column for as written. Each is an expected failure in
  graphty-element's `export-round-trip`.
- OGDF's `rootcluster` is read as a group node `cluster<id>`; GML cannot hold that id, so the GML export throws
  E_INVALID_ID unless `sanitizeIds` is set (two conformance fixtures marked).
- graphty-element's style-fidelity scorecard (`test/fidelity/scorecard.test.ts`) still judges against the older
  reference scenes, which are graph-io's own earlier reading and not the programs' drawings; 36 of its properties
  now read as each program draws them and score lower there, and are allowed drops in `requested-floors.json`.
  The oracle report is the judge for those properties.
- Fixed 2026-10-21: the raster floors failed on the GPU path they were not recorded on. Chromium's SwiftShader path
  (`GRAPHTY_BROWSER_GPU` unset: the documented command, and CI) and the NVIDIA path antialias thin lines and glyph
  edges differently: over all 563 oracles on one code state, a region measured up to 0.046 apart (a 1 px edge line,
  crisp on one path and spread over two pixels on the other; node bodies, outlines and labels within 0.01). Floored to
  2 places, 95 raster regions read as drops on the NVIDIA path against floors recorded on SwiftShader, and 9 on
  SwiftShader against floors a later NVIDIA run had raised, with nothing drawn changed. The raster floors are now
  SwiftShader's: judged there with one unit of slack, judged on another path with 0.05 of slack, and recorded only
  from SwiftShader (`rasterSlack` and `recordableScores` in `graphty-element/test/fidelity/oracle/floors.ts`). 28
  raster floors rose to SwiftShader's measurement; `cytoscapejs-specimen-groups` raster.edge was lowered 0.95 to 0.93
  (graphty now ends the edge from a compound at the compound's border, as Cytoscape.js does, so the short edge's
  region reaches the border's antialiasing). `dot-real-siblings` raster.edge and raster.nodeOutline still fail on
  both paths: its Graphviz layout changed with the DOT layout scale fix, which the Graphviz-layout work owns.
- The SonarQube changed-lines scan could not run (the server was unreachable from this machine); the next push from
  the owner's network checks the branch.

## yEd sheets to export by hand

yEd's license forbids using it in an automated process, so every yEd GraphML, yEd Live GraphML and yEd-written GML
oracle below is a stand-in (draw.io's drawing for GraphML, Cytoscape's or Graphviz's for GML), marked
`standIn: true` and held to `standInFloors`. To replace one with yEd's own drawing: open the file in yEd (yEd Live
for the yEd Live rows), File > Export > SVG at 1200 x 900, save it over the oracle path, run
`node graph-io/test/fidelity/oracles/tools/rasterize.mjs <oracle path>`, and set the oracle's `.oracle.json` to
`"program": "yEd"` (or `"yEd Live"`), its version and `"standIn": false`. Then record that sample's floors again
with the oracle report.

| program  | file                                                                                                     | export to                                                                         |
| -------- | -------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| yEd      | `graph-io/test/corpus/styles/gml/fidelity/dunnart-autobahn.gml`                                          | `graph-io/test/fidelity/oracles/gml-dunnart-autobahn.svg`                         |
| yEd      | `graph-io/test/corpus/styles/gml/fidelity/dunnart-planar-orthogonal.gml`                                 | `graph-io/test/fidelity/oracles/gml-dunnart-planar-orthogonal.svg`                |
| yEd      | `graph-io/test/corpus/styles/gml/fidelity/jgrapht-grid-territorio.gml`                                   | `graph-io/test/fidelity/oracles/gml-jgrapht-grid-territorio.svg`                  |
| yEd      | `graph-io/test/corpus/styles/gml/spupyrev_bob__need4stacks261.gml`                                       | `graph-io/test/fidelity/oracles/gml-need4stacks261.svg`                           |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-arrows-p2.gml`                                            | `graph-io/test/fidelity/oracles/gml-specimen-arrows-p2.svg`                       |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-arrows-p3.gml`                                            | `graph-io/test/fidelity/oracles/gml-specimen-arrows-p3.svg`                       |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-edge-labels-p2.gml`                                       | `graph-io/test/fidelity/oracles/gml-specimen-edge-labels-p2.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-edges-lines-p2.gml`                                       | `graph-io/test/fidelity/oracles/gml-specimen-edges-lines-p2.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-groups.gml`                                               | `graph-io/test/fidelity/oracles/gml-specimen-groups.svg`                          |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-labels-p2.gml`                                            | `graph-io/test/fidelity/oracles/gml-specimen-labels-p2.svg`                       |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-labels-p3.gml`                                            | `graph-io/test/fidelity/oracles/gml-specimen-labels-p3.svg`                       |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-node-fills-borders-p2.gml`                                | `graph-io/test/fidelity/oracles/gml-specimen-node-fills-borders-p2.svg`           |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-node-shapes-p2.gml`                                       | `graph-io/test/fidelity/oracles/gml-specimen-node-shapes-p2.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-node-shapes-p3.gml`                                       | `graph-io/test/fidelity/oracles/gml-specimen-node-shapes-p3.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/gml/specimen-node-sizes-opacity-p2.gml`                                | `graph-io/test/fidelity/oracles/gml-specimen-node-sizes-opacity-p2.svg`           |
| yEd      | `graph-io/test/corpus/styles/gml/fidelity/synthetic-coverage.gml`                                        | `graph-io/test/fidelity/oracles/gml-synthetic-coverage.svg`                       |
| yEd      | `graph-io/test/corpus/styles/gml/fidelity/visualgraph-tree30.gml`                                        | `graph-io/test/fidelity/oracles/gml-visualgraph-tree30.svg`                       |
| yEd      | `graph-io/test/corpus/styles/gml/ImperialCollegeLondon_pyrealm__pmodel.gml`                              | `graph-io/test/fidelity/oracles/gml-yed-pmodel.svg`                               |
| yEd      | `graph-io/test/corpus/styles/graphml/yed-large/ministryofjustice__cla_backend__checker-graph.graphml.gz` | `graph-io/test/fidelity/oracles/graphml-cla-checker-graph.svg`                    |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/galaxy-lcms-workflow.graphml`                              | `graph-io/test/fidelity/oracles/graphml-galaxy-lcms-workflow.svg`                 |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/libcitygml-mapping.graphml`                                | `graph-io/test/fidelity/oracles/graphml-libcitygml-mapping.svg`                   |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/magiclantern-architecture.graphml`                         | `graph-io/test/fidelity/oracles/graphml-magiclantern-architecture.svg`            |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/open-archaeo.graphml`                                      | `graph-io/test/fidelity/oracles/graphml-open-archaeo.svg`                         |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/scala-collection-mutable.graphml`                          | `graph-io/test/fidelity/oracles/graphml-scala-collection-mutable.svg`             |
| yEd      | `graph-io/test/corpus/styles/graphml/LTVA1_STM32CrapSynth__func.graphml.gz`                              | `graph-io/test/fidelity/oracles/graphml-stm32-func.svg`                           |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/synthetic-edges.graphml`                                   | `graph-io/test/fidelity/oracles/graphml-synthetic-edges.svg`                      |
| yEd      | `graph-io/test/corpus/styles/graphml/fidelity/synthetic-nodes.graphml`                                   | `graph-io/test/fidelity/oracles/graphml-synthetic-nodes.svg`                      |
| yEd      | `graph-io/test/corpus/styles/graphml/yed-shapenode/voc__voctomix__schema.graphml`                        | `graph-io/test/fidelity/oracles/graphml-yed-voctomix.svg`                         |
| yEd Live | `graph-io/test/corpus/styles/graphml/yfiles-html-large/spacestation13__SS13-Codebases__tree.graphml.gz`  | `graph-io/test/fidelity/oracles/graphml-yfiles-html-ss13-tree.svg`                |
| yEd Live | `graph-io/test/corpus/styles/graphml/yfiles-html-large/ctmrbio__stag-mwc__stag_flowchart.graphml`        | `graph-io/test/fidelity/oracles/graphml-yfiles-html-stag-flowchart.svg`           |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-arrows.graphml`                                   | `graph-io/test/fidelity/oracles/yed-graphml-specimen-arrows.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-edge-labels.graphml`                              | `graph-io/test/fidelity/oracles/yed-graphml-specimen-edge-labels.svg`             |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-edges-lines.graphml`                              | `graph-io/test/fidelity/oracles/yed-graphml-specimen-edges-lines.svg`             |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-groups-p2.graphml`                                | `graph-io/test/fidelity/oracles/yed-graphml-specimen-groups-p2.svg`               |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-groups.graphml`                                   | `graph-io/test/fidelity/oracles/yed-graphml-specimen-groups.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-images-charts.graphml`                            | `graph-io/test/fidelity/oracles/yed-graphml-specimen-images-charts.svg`           |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-labels-p2.graphml`                                | `graph-io/test/fidelity/oracles/yed-graphml-specimen-labels-p2.svg`               |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-labels.graphml`                                   | `graph-io/test/fidelity/oracles/yed-graphml-specimen-labels.svg`                  |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-fills-borders.graphml`                       | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-fills-borders.svg`      |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes-p2.graphml`                           | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p2.svg`          |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes-p3.graphml`                           | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p3.svg`          |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes-p4.graphml`                           | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p4.svg`          |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes-p5.graphml`                           | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p5.svg`          |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes-p6.graphml`                           | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes-p6.svg`          |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-shapes.graphml`                              | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-shapes.svg`             |
| yEd      | `graph-io/test/fidelity/specimens/yed-graphml/specimen-node-sizes-opacity.graphml`                       | `graph-io/test/fidelity/oracles/yed-graphml-specimen-node-sizes-opacity.svg`      |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-arrows-p2.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-arrows-p2.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-arrows.graphml`                              | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-arrows.svg`             |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-edge-labels-p2.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-edge-labels-p2.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-edge-labels.graphml`                         | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-edge-labels.svg`        |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-edges-lines-p2.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-edges-lines-p2.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-edges-lines-p3.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-edges-lines-p3.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-edges-lines.graphml`                         | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-edges-lines.svg`        |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-groups-p2.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-groups-p2.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-groups-p3.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-groups-p3.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-groups-p4.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-groups-p4.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-groups.graphml`                              | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-groups.svg`             |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-images-charts.graphml`                       | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-images-charts.svg`      |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-labels-p2.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-labels-p2.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-labels-p3.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-labels-p3.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-labels-p4.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-labels-p4.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-labels-p5.graphml`                           | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-labels-p5.svg`          |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-labels.graphml`                              | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-labels.svg`             |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-mappings-bypass.graphml`                     | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-mappings-bypass.svg`    |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-fills-borders.graphml`                  | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-fills-borders.svg` |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p2.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p2.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p3.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p3.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p4.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p4.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p5.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p5.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p6.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p6.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes-p7.graphml`                      | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes-p7.svg`     |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-shapes.graphml`                         | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-shapes.svg`        |
| yEd Live | `graph-io/test/fidelity/specimens/yed-live-graphml/specimen-node-sizes-opacity.graphml`                  | `graph-io/test/fidelity/oracles/yed-live-graphml-specimen-node-sizes-opacity.svg` |

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
- FIXED (2026-10-19) Arrowheads: Pajek draws an arrow 6 x its `s` long (tip to back corners) and 5 x `s` wide,
  `s` carried like the other line parameters; graph-io reads `s` as the arrow size and the Pajek tool arrowhead
  draws it so (football arrow length 49/118 -> 118/118, graphstream-b 0/192 -> 193/193).
- FIXED (2026-10-21) Arcs, their arrowheads and their routes (synth-lines edge.route 53/88 -> 87/88, edge.arrow
  238/264 -> 264/264, edge.dash 85/88 -> 88/88; iliad edge.route 278/292 -> 292/292, edge.arrowShape 3 misses -> none;
  the arrows and edges-lines sheets' Bezier arcs edge.route and edge.curve -> all):
    - Pajek bows apart the arcs that share their two vertices, a mutual pair or two the same way, as
      `a1 15 k1 0.25 a2 15 k2 0.25` (the first of two the same way at `a1 -15 a2 -15`), and draws them straight under
      Straight Lines; graph-io reads them so.
    - An arc's arrowhead stops 1 px outside its target's outline, border and all, whatever its size; a Bezier arc's
      route ends at its arrowhead's tip (a target port), so its curve runs through Pajek's control points (arrow-bezier
      bowed 0.135 of its chord where Pajek's bows 0.196).
    - `ap` is not carried to the next line, and an `ap` above 1 is a distance from the target's center (arc 3 4 `ap 20`).
    - A short arc under a large arrowhead: Pajek runs the line from the source back to the head's back, behind the
      source's center, so the head covers its whole line. The comparator gave such heads to the source end (13 heads of
      synth-lines, one classed inverted); it now gives a head that covers its line to the end at its back, and routes the
      edge from there to the tip.
    - graphty-element drew a dash or dot line too short for two elements and a gap (or laid out longer, then shortened)
      as touching or overlapping elements, a solid line (synth-lines arcs 2 3, 22 23, 27 28); it now draws one element.
- FIXED (2026-10-19) Line labels: Pajek's default drawing hides them, and graph-io now draws them only under the
  `pajekDraw` ini flag `Form8.withLabels1` (Mark Lines / with Labels), writing the file's own `l` back on export
  (synth-lines edge.label 0/28 -> none drawn, as Pajek).
- FIXED (2026-10-19) Label placement: graph-io places a label by its point, `labelPosition` center with
  `labelOffsetX` / `Y` at (lr cos lphi, -lr sin lphi) and `labelShiftX` 0.5 (the text starts there), its middle
  0.3465 of its size above that baseline point; the default is lr 20 at 285 degrees (label offset 1crn 0/324 ->
  324/324, kdorola 0/127 -> 127/127, lin-rel4 0/234 -> 234/234, football 0/35 -> 35/35, graphstream-b 0/111 ->
  111/111, c 0/65 -> 65/65, iliad 11/311 -> 309/311, synth-lines 0/40 -> 40/40, synth-vertices 0/71 -> 67/71).
  Left: a label turned by `la` turns about its start point in Pajek (synth-vertices v27, v51, v75: `la 60 fos 10`,
  1.09 of the tolerance off), and graphty turns it about its middle; iliad's two misses are its widest labels.
- Raster dips the right label places expose (2026-10-19): Pajek draws each vertex and then its label, in file
  order, so a later vertex covers an earlier vertex's label; graphty-element draws every label over every node in
  2D (`RichTextLabel` sorts by depth, and a 2D drawing has none between nodes). With the labels now where Pajek
  draws them, among dense vertices, raster.nodeBody fell 0.01 to 0.02 (1crn 0.95 -> 0.94, c 0.94 -> 0.93,
  kdorola 0.94 -> 0.92, lin-rel4 0.83 -> 0.81) and 1crn raster.edge 0.95 -> 0.93 and raster.label 0.92 -> 0.91,
  while raster.label rose elsewhere (c 0.82 -> 0.85, kdorola 0.83 -> 0.85, lin-rel4 0.72 -> 0.78) and c's label
  ink ratio went 3.69 -> 1.17. Open in graphty-element: a 2D drawing in which a node drawn later covers the labels
  of the nodes before it (side by side: `tmp/style-specimens/pajek-fix2/1crn-side.png`).
- FIXED (2026-10-19): `c 0.700 0.700 0.700` (three fractions) is no color to Pajek; graph-io now reads it so
  (1crn edge color 0/337 -> 337/337), and `s_size` is not read as a size (synth-vertices width 48/80 -> 52/80).
- FIXED (2026-10-19): an `empty` vertex's label is drawn white at size 1 on its center, and graph-io now reads it so
  (synth-vertices label size 66/71 -> 68/71, color 65/71 -> 69/71; lin-rel4 v226 to v233 225/234 -> 234/234).
- LightOrange: Pajek's SVG export draws it #ffd9bc (its default vertex fill), not its EPS dictionary's #ffccb3;
  FIXED (2026-10-19) in graph-io's Pajek color table (graphstream-b node fill 93/111 -> 111/111).
- Pajek quirks graph-io does not copy: `cross` is drawn as an ellipse in the SVG export (graph-io still draws a
  cross; `edges-lines-p2` `h-cross-1-3` node.shape fails), `Triangle` (capital T) is not a shape, and an `empty`
  vertex draws no body, which graphty still sizes (synth-vertices width 48/80). A placed line that names no shape and
  starts its parameters with `bc`, `bw`, `s_size`, `phi`, `r`, `q`, `lc`, `la`, `lr`, `lphi`, `fos` or `font` is drawn
  with none of them; graph-io copies this since the third fix round (2026-10-20). The earlier reading that such a
  line's first parameter names a shape by its first letter (`bw 2` a box) does not hold: the probe `r3-lead` drew
  `bw 3 ic Red` after a box as a default ellipse.

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
    - A node label's line break is drawn as nothing: Java's drawString draws "line one\nline two" as "line oneline
      two" on one line (Gephi's Preview and PNG export; its SVG writer turns the break into a space, which the oracle
      route puts back, `restoreLabelText` in `tools/gephi.mjs`). graph-io draws it so (fixed 2026-10-19, fix round 2).
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
      `-arrows`); graph-io matches both. **Open gap (graphty-element), row gexf-self-loop:** Gephi draws the loop as a small circle of
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
  graph-io now hides overlapping labels only while that setting is on. Under it (Gephi's default, every corpus
  oracle) graph-io now runs Gephi's own grid (NodeLabelRenderer.preProcess: largest font first, each label's Dialog
  box marks the cells of a `node.label.overlapGridSize` grid, a label meeting a marked cell is hidden, Gephi's font
  cache and its item order, largest node first) over the stored positions and leaves out the labels it hides;
  graphty-element then avoids no overlap of its own. On cns-wos, sigma-ediaspora, gsa-fpki-certs, miserables,
  graphology-rio and synth-nx-viz it hides exactly the labels Gephi's preview items mark hidden (fixed 2026-10-19,
  fix round 2; Row gexf-label-overlap-grid, `labels-p16` included). Fixed in the same round:
    - Row gexf-label-outline-opacity: `node.label.outline.opacity` and `edge.label.outline.opacity` (default 80;
      `labels-p10`, `edge-labels-p5`, `-p6`): drawn at that opacity, cut down to one of Java's 256 alpha steps (30 is
      76/255), through the new style keys `labelOutlineOpacity` (graph-io) and channels `node/edge.labelOutlineOpacity`
      (graphty-element).
    - `node.label.box.opacity` (`labels-p13`): drawn at that opacity (`labelBorderOpacity`). The oracle's 0.16 was
      Gephi's SVG writer putting the opacity on the box twice (opacity and stroke-opacity); its PNG export strokes
      the box at 0.4, and the oracle route now writes it once (`singleBoxOpacity` in `tools/gephi.mjs`).
    - Row gexf-label-box: the label box's size (`labels-p11`, `-p12`, `-p20`, `-p21`, label.backgroundBox): Gephi's
      box is the text's own bounds (advance width by the font's ascent plus descent) grown by its stroke; graph-io
      now asks for a label padding of 0 and a line height of 1 (new keys `labelPadding`, `labelLineHeight`, channels
      `node/edge.labelPadding`, `labelLineHeight` in graphty-element), and every page's box passes.
      Fixed (graphty-element, 2026-10-19, verification of the round): graphty drew that box as a solid panel in the
      border's color over the node (`labels-p11`: 200 gray inside the box, where Gephi strokes an unfilled box and the
      node shows through). `RichTextLabel` never cut a border's hole (its path helper began a new path, so the hole
      replaced the box) and filled the last ring solid for the background to cover, which a label with no background
      never does. It now draws the border as a ring wherever the background lets the middle show. Comparator blind
      spot (for the comparator owner): label.backgroundBox and label.backgroundBorder passed the solid panel; nothing
      compares a box's inside with the oracle's.
    - Seen in the same runs, not traced to this round: edge.curve on `hsk-chars` (0.145, floor 0.684),
      `sigma-ediaspora` (0.872, floor 0.905), 31 non-loop edges of `graphology-rio` and 2 of `miserables` (27->25,
      62->59: graphty bows 0.109 and 0.125 of the chord where Gephi bows 0.069 and 0.059), already at these values
      in the first run of the round that drew the corpus, which already had this round's edge merging and Preview
      settings and graphty-element's Bezier edge change (f926d5164), so the cause is not settled; and
      raster.nodeBody on `node-fills-borders-p5`, `-p6` (0.967, floor 0.97) and `node-sizes-opacity` (0.72, floor
      0.73), which every geometric row of those pages passes. Not allowed: the floors stay until the mechanism is
      found.
    - Fixed (2026-10-19, verification of the round): `images-charts` raster.nodeBody (0.85, floor 0.95) and its
      stray.extra were one import defect: graph-io kept an `image` shape's picture for Gephi's drawing, and
      graphty-element drew the data: URI's picture over the node, where Gephi Toolkit 0.11.3 draws every
      `viz:shape`, image too, as the node's disc (no `<image>` in the oracle). graph-io now draws no picture for a
      file graphty did not write; nodeBody 0.976, both pages pass.
    - Fixed (comparator, 2026-10-19, fix round 2): `sigma-ediaspora` node.present (nodes 134 and 77 read as group
      boxes) and every `labels` page's `label-overlap` (group.extra, node.present): the comparison reads no group box
      from graphty's drawing where the oracle program draws none (Gephi Toolkit, Pajek: `NO_GROUP_PROGRAMS` in
      `graphty-element/test/fidelity/oracle/oracle-library.ts`, as it already did for sigma.js), so a plain node drawn
      round a smaller one is two nodes there. (Reading groups only from nodes graphty draws behind their members was
      tried and dropped: Cytoscape.js and CX2 compartments with no hierarchy, `json-cyjs-sbgn-sciluna` and
      `cx2-signor-aml`, lost their group boxes.)
    - Fixed (comparator, 2026-10-19, fix round 2): edge.arrowShape on Gephi's curved arrows (`arrows-p2`, `-p4`
      `weight-4` and `target-size-12`, `graphology-rio` 409 -> 6, `sigma-ediaspora` 80 -> 0): Gephi ends the arc at the
      arrowhead's back and aims the arrowhead from there at the target's center, about 14 degrees off the arc's end;
      `measureArrow` (oracle/associate.ts) now reads such a cap along its own axis (only a pointed cap symmetric
      about the axis from the line's end through its tip, turned under 30 degrees). The triangles were never covered
      by the node; the reading direction was wrong.
    - Fixed (2026-10-19, fix round 2): the edges graphty drew between overlapping nodes (`cns-wos` edge.extra 24,
      `sigma-ediaspora` 30): Gephi draws a curved edge as an arc of radius distance / 1.2 cut back by a chord of
      each end node's radius (and the arrowhead); where the cuts meet it draws no line, though it draws the arrowhead
      (EdgeRenderer.CurvedEdgeRenderer, ArrowRenderer). graph-io now hides such an undirected edge and draws a
      directed one with no line. Those arrowheads are now judged as free shapes on both sides (fix round 3, below).
    - Fixed (comparator and graph-io, 2026-10-20, fix round 3): `cns-wos` node.present 221/225 (n5, n23, n50, n100)
      -> 221/221. Each lies wholly under a node drawn at (nearly) the same place, which graphty's scene marks hidden
      (`occluders`) while the oracle's reading counted every circle. The oracle side now judges cover the same way
      (`withoutCovered` in oracle/associate.ts: an opaque node later in the document whose box holds the node's box,
      within graphty's half pixel taken into the oracle's pixels by the two drawings' node size ratio, 1.49 here).
      That surfaced the covered nodes' labels ("Borner, K", "Bueckle, A"), which Gephi draws over every node (its
      node label items come after the nodes; g#node-labels follows g#nodes in its SVG) and graphty drew under the
      node covering theirs: graph-io's Gephi defaults now set `labelOnTop`, and extract-scene counts an on-top label
      of a hidden node as drawn. stray.present 0/2 -> 2/2, label.present floor 0.914 -> 1.
    - Fixed (graph-io, 2026-10-20, fix round 3): a node drawn less than opaque (`node.opacity` 40, or a per-node alpha
      under `node.per.node.opacity`; `node-sizes-opacity-p2`, `-p3`) keeps its border. Gephi draws such a node as a
      fill of radius 0.84 s and a separate ring out to s, both at the node's alpha (NodeRenderer; the -p3 SVG's
      r=29.4 fill and r=32.2 ring of width 5.6 at opacity 0.4); graph-io gave it no border at all. It now keeps the
      border and gives it the node's alpha (`borderOpacity`), which graphty-element draws as a ring outside the fill
      (border position inside). The comparator read Gephi's ring, which names no node, as a stray: the oracle's SVG
      reader now gives the unnamed ring drawn right after a node's fill on its center to that node (`gephiRingOf` in
      oracle/svg-primitives.ts). -p3 node.width 0/21 -> 21/21, node.stroke 1/21 -> 21/21, stray.present 0/22 gone;
      -p2 node.width 17/20 -> 20/20.
    - Fixed (comparator, 2026-10-20, fix round 3): edge.arrowShape on Gephi's arrowheads of short arcs
      (`graphology-rio` 1070/1076 -> 1076/1076, e.g. `ncs337->ncs291`: a 1.4 px arc whose arrowhead aims 34 degrees
      off its end, read as half an arrow). The cap's own axis was accepted only within 30 degrees of the line; Gephi's
      aim turns from its arc by at most asin(0.6) = 36.87 degrees (the tangent-chord angle of an arc of radius
      distance / 1.2 through both node centers), which is now the bound (`CAP_AXIS_TURN` in oracle/associate.ts).
    - Fixed (comparator, 2026-10-20, fix round 3): the arrowheads Gephi draws on edges it draws no line for (their
      nodes swallow the arc) were oracle strays nothing on graphty's side could match. graphty's side now reads the
      arrowheads it draws on line-less edges as free shapes (`linelessCaps` in oracle/drawn-primitives.ts), and both
      sides leave out one drawn wholly inside an opaque node drawn over it (Gephi draws its nodes after its arrows):
      `sigma-ediaspora` 26 of Gephi's 30 lie under a node, `graphology-rio` none. rio: stray.present 0/20 -> 17/20
      and stray.extra 17/20; the 3 left are graphty's arrowheads about 0.6 graphty pixels off Gephi's, which a 3 px
      box's IoU 0.5 does not allow.
    - Open (graphty-element): `sigma-ediaspora` stray.extra 0/10, stray.present 0/1. Of the 30 swallowed directed
      edges, Gephi draws the arrowhead with its tip on the target's outer rim, aimed along the arc's chord from the cut
      point (ArrowRenderer.Helper), so 29 lie under the overlapping source node; graphty draws 10 of them clear of
      every node, about 25 to 160 oracle pixels from Gephi's (one: 4 px inside the target's rim where Gephi's tip is
      on it). Where graphty-element puts the cap of a curved edge whose two trimmed ends pass each other needs to
      follow ArrowRenderer: tip on the target's rim along the arc, whatever the line.
    - `edge.radius` (`arrows-p4`): Gephi ends each edge that far short of its nodes; the vocabulary has no edge end
      gap (graph-io vocabulary, then graphty-element).
    - Fixed (oracle, 2026-10-19, fix round 2): Gephi's SVG wrote a label's text with the space before `&` and `<`
      dropped (`label-entity`: "a& b<c>"), where its Preview, PNG export and preview items draw "a & b <c>"; the
      oracle route now writes the label Gephi draws (`restoreLabelText`) and the 37 label and edge-label oracles were
      drawn again.
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

## Specimen sheets: yEd Live settings graph-io now reads (fix round 2, 2026-10-19)

What graph-io now reads (unit tests in `graph-io/test/formats/graphml/styles-yfiles3.test.ts`, "edge geometry, stroke
alpha and hollow arrows"):

- Edge bends: the `EdgeGeometry` key's `<x:List><y:Bend Location="x,y"/></x:List>` is the edge's `bends`, relative
  to the centers of its two nodes' `NodeGeometry` boxes (a self-loop's to its node's size). Before, every yEd Live
  edge was drawn straight (`bends-one`, `bends-two`, the smoothing and path auto-rotation specimens of
  `edges-lines`, `-p2`, `-p3` and `edge-labels`).
- Smoothing: a `PolylineEdgeStyle` with a `smoothingLength` above 0 and bends is `curved`, as the yEd reader treats a
  smoothed `y:BendStyle`. yFiles rounds each bend with an arc of that length and keeps the straight runs; graphty
  draws a curve through the bends, so a long straight run between two rounded bends is drawn bowed.
- Stroke alpha: a node stroke's `#AARRGGBB` alpha is the `borderOpacity` (`stroke-alpha-40`, `stroke-alpha-80`).
- An `Arrow` whose `fill` is `{x:Null}` is the open outline of its type (`triangle-open`, `diamond-open`,
  `circle-open`) in its `stroke`'s color (`arrow-fill-null`).
- yFiles 3.0 renamed 2.6's `DEFAULT` arrow to `STEALTH` and `CIRCLE` to `ELLIPSE`
  (https://docs.yfiles.com/yfiles-html/api/ArrowType/); both are now read as their 2.6 names are (triangle,
  circle). Before, they were unknown shapes and graphty drew no arrow on `target-stealth`, `source-stealth`,
  `target-ellipse` and `source-ellipse` (`arrows`: edge arrow 0.905 -> 0.952). The stand-in draws ELLIPSE as its
  triangle or vee and STEALTH as a vee, so those four ends fail arrow shape against it (0.938 -> 0.75, allowed
  drop in `oracle-floors.json`, expiring 2026-12-31). Open: whether 2.6 `DEFAULT` / 3.0 `STEALTH`, "an arrow
  notched on the side opposite its tip", is graph-io's `vee` rather than `triangle`; judge it against the owner's
  yEd Live export. `CHEVRON`-like 3.1 shapes `DELTOID` and `KITE`, and `CROSS`, have no neutral arrow and graphty
  still draws none.

Measured against draw.io's drawings (stand-ins): edge curve edges-lines 0.667 -> 1, -p2 0.9 -> 1, -p3 0.929 -> 1,
edge-labels 0.927 -> 1; edge route edges-lines 0.593 -> 0.697, -p3 0.786 -> 0.857, edge-labels 0.927 -> 1;
node-sizes-opacity node stroke 0.905 -> 1. `arrow-fill-null` fails against the stand-in, which fills it (allowed
drop in `oracle-floors.json`, expiring 2026-12-31).

Not import defects, judged against the stand-in (wait for the owner's yEd Live export):

- Arrow colors on `color-*`, `v2-stroke-color-ff0000` and `mappings-bypass`: each file gives its arrows their own
  `fill="#FF505050"` beside a colored edge stroke, and yFiles fills an `Arrow` with its `fill`, so graphty's #505050
  cap is what the file says; draw.io colors the cap with the edge stroke. `arrow-fill-ff0000` and
  `v2-arrow-fill-ff0000` are drawn red by graphty (the arrow's fill) where draw.io draws #505050.
- `arrow-stroke-ff0000` (`v2-arrow-stroke-ff0000`): a #505050 arrow with a red outline. The neutral vocabulary has
  one arrow color, the fill; an arrow's separate outline color is not drawn (graphty-element has no arrow outline).

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
- A `haystack` edge (the default curve style) draws no source or target arrow (`arrow-on-haystack`); its mid arrows
  are still drawn (`drawArrowheads`), and a vertical edge's `autorotate` label reads 90 whichever way the line runs.
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

Fix round 2 (2026-10-19), what graph-io now reads (unit tests in `graph-io/test/styles/cyjs-specimen-fixes.test.ts`,
the writer's round trip in `cyjs.test.ts`):

- Opacities as `drawText` and `drawNode` draw them, each part's own times the element's `opacity`: `text-opacity` as
  `labelOpacity`, the label's box (`text-background-opacity`) as `labelBackgroundOpacity`, its line
  (`text-border-opacity`) as `labelBorderOpacity`, its outline (`text-outline-opacity`, also times the words'
  opacity) as `labelOutlineOpacity`, a node's `border-opacity` and `outline-opacity` as `borderOpacity` and
  `outerBorderOpacity` (`opacity-0-15` drew its border at 1). An edge's label follows the edge's `opacity`, not its
  `line-opacity`; `json-cyjs-tokyo`'s edge labels at `opacity: 0.5` are its 533 `label.opacity` rows. The writer
  writes each back divided by the opacity it is drawn times.
- `text-margin-x` / `-y` (negative too), a node's and an edge's, as `labelOffsetX` / `labelOffsetY`.
- `text-border-width` and `-color` as `labelBorderWidth` / `labelBorderColor`, drawn only with a width and an
  opacity above 0 (both 0 by default); `double` is one line a quarter of the width, noted (`drawText` strokes two such
  lines, the second inset half the width); dotted and dashed are drawn solid, noted. `text-background-padding` (0
  unset) is `labelPadding` wherever a box or a line is drawn. The writer writes the box, the line, the outline and the padding back.
- `border-position` as `borderPosition`.
- `width: label` / `height: label` as `labelFit: bounds` with that side 0 and the node's padding as the label
  padding, the other side kept; written back as `width: label`.
- `source-endpoint` / `target-endpoint` as `sourcePort` / `targetPort`: `inside-to-node` the center, `x y` offsets
  (pixels or percentages of the outer size), an angle on the outline (a polygon's measured as its box); taxi edges
  ignore them, as Cytoscape.js does. A `haystack` edge runs between the centers (its default `haystack-radius: 0`).
- `unbundled-bezier` with no `control-point-distances`: its one control point at the step size (40 px), where it
  was drawn as graphty's own arc. `round-segments` and `round-taxi`: each corner replaced by the arc
  `calcCornerArc` draws (`segment-radii`, `taxi-radius`, default 15, `radius-type` arc or influence radius).
- `line-style: dashed` and `border-style: dashed` as the line their dash pattern draws at their width
  (`line-dash-pattern` 6 3, `border-dash-pattern` 4 2 in pixels, `line-cap` / `border-cap` lengthening each dash):
  dotted where no dash is longer than one and a half widths (`json-cyjs-graphmaker`'s 5 px dashed edges, 32
  `edge.dash` rows), dash-dot for long and short dashes. The exact lengths still need a dash array (below).

The comparator in the same round:

- Cytoscape.js erases the canvas under a translucent edge's arrowhead before painting it (`drawArrowhead`,
  `destination-out`, which the SVG replay records as a white fill of the same shape); the erasure was read as a hollow
  arrowhead (`json-cyjs-graphmaker`'s 31 `edge.arrowFill` rows at `opacity: 0.2`). The arrow painted over it is now
  the arrowhead (`compare-oracle-lines.test.ts`).

Failing elements on the 24 Cytoscape.js samples went from 3157 to 2768 (`oracle-report.test.ts`, this worktree):
`json-cyjs-graphmaker` 73 to 12, `json-cyjs-tokyo` 2007 to 1785, `-node-fills-borders` 16 to 8, `-labels` 20 to 11,
`-edge-labels` 29 to 20, `-edges-lines` 13 to 6, `cyjs-glycolysis` 10 to 0. The floors this worktree's
`oracle-floors.json` sets for `json-cyjs-perf`, `json-cyjs-tokyo`, `json-cyjs-graphmaker`'s raster and
`cyjs-genemania`'s `edge.extra` are not met with or without this round's reader (checked with the haystack ends
turned back off): they come from the comparator work in flight beside it.

Still open after fix round 2:

- `text-background-shape` (round-rectangle's 2 px corners, circle) and a label line's dotted and dashed styles: no
  neutral slot (graphty-element's label style has a corner radius the neutral styles do not carry).
- graphty-element: composing `borderOpacity` with `opacity` as a second replanned composite in `translate.ts`
  (`#compositeCombined`) painted one class's value onto another class's nodes (`opacity-0-5` drew its border at
  0.15, the next class's value): two replanned composites in one translation collide. Not used now (the reader
  gives the border its drawn opacity), but any second composite will meet it.
- Numeric font weights (100, 200, 900, `lighter`): the neutral `labelWeight` and graphty-element's
  `LabelWeightValue` are `normal | bold` only; widening graphty-element's exported value type may break a consumer
  that switches over it, so it waits for the owner.
- `text-wrap: ellipsis` (graph-io cannot measure text; graphty-element needs an ellipsis wrap) and
  `text-overflow-wrap: anywhere` (graphty-element breaks only at spaces).
- `background-fill: radial-gradient` and stops between the first and last (`background-gradient-stop-colors` with
  three colors, `-stop-positions`): graphty-element's mesh draws radial and many-stop fills, but its channels
  (`node.gradientColor`, `node.gradientDirection`) carry one linear two-stop gradient and the neutral styles likewise
  (`node-gradient`, shared with DOT and Pajek).
- Exact dash lengths (`*-dash-pattern`, `*-dash-offset`): the dash class is read; the lengths need a dash array in
  both packages.
- `source-distance-from-node` / `target-distance-from-node` (8 px gaps): no neutral slot.
- `haystack-radius` above 0: Cytoscape.js puts each end at a random point that far toward the outline
  (`findHaystackPoints`, `Math.random`), which no reader can repeat; drawn from the centers.
- `border-position: inside` / `outside`: read and drawn by graphty-element, but the comparator ignores the SVG's
  `clip-path` (an inside border is Cytoscape.js's doubled stroke clipped to the node, `drawNode`), so it reads an
  11.6 wide stroke for a 5.8 border; and the replay records an outside border's clip as the bare rectangle (the
  `evenodd` path Cytoscape.js adds is dropped), so that oracle is wrong (`cytoscapejs-specimen-node-fills-borders`).
- The haystack edges of `cytoscapejs-specimen-edges-lines` keep failing `edge.route` and `edge.arrow`: the comparator
  attaches the neighboring straight-triangle edge's filled sliver (a 65 px triangle at the same height) to the
  haystack edge as its source arrow and its route.
- Compound bounds (`padding`, `min-width` / `-height` and biases, one child): graphty-element places a parent around
  its members itself; it needs a group padding and minimum size, and graph-io to read them (`group-box-geometry`).
- `json-cyjs-perf` and `json-cyjs-tokyo` have no compound parents: their `node.extra` / `group.extra` rows are plain
  nodes the comparator leaves unpaired among overlapping nodes, and the unpaired bundled and haystack edges
  (`edge.present` / `edge.extra`) are the comparator's (`comparator-edge-association`), as is an edge's translucent
  overlay band read as a second edge (`edge-overlay-opacity-0-5`).
- An edge line under a circle cap (`arrows`, `arrows-p2`, `comparator-arrow-line-reach`): open for the comparator.
- An edge's `autorotate` label on a route or a loop, and the end labels' margins and rotations
  (`source-text-margin-*`, `source-text-rotation`): as before.
- The Cytoscape.js writer writes no `curve-style` for a straight edge, so Cytoscape.js draws a file graphty wrote with
  haystack edges and no arrows; it should write `curve-style: straight` where an arrow is drawn.

Fix round 3 (2026-10-20), what graph-io now reads and the comparator now sees (unit tests in
`graph-io/test/styles/cyjs-specimen-fixes.test.ts` and `graphty-element/test/browser/oracle-clip-band.test.ts`):

- One label alignment inside the node and the other outside it (`text-align-bottom-inside-left`,
  `-bottom-left-inside` and the rest on `cytoscapejs-specimen-labels`): the label is centered, moved to the point
  `recalculateNodeLabelProjection` puts it at (half the node's size, `padding` out for an outside side and in for an
  inside one, `text-margin` added) and pinned there by `labelShiftX` / `labelShiftY` (its far edge for an outside
  side, its near edge for an inside one). `label.anchor` and `label.offset` pass on every one; the outside side alone,
  noted, is kept only for a node sized to its label. Fixed: the fix round 1 note "One inside and one outside
  alignment keep the outside side" no longer holds.
- The label's box (`text-background-*`, `text-border-*`): one font size tall a line (`labelLineHeight: 1`, as
  `calculateLabelDimensions` measures it), and `text-background-shape: round-rectangle` (and `roundrectangle`) rounds
  its corners 2 px (`drawText`'s `roundRadius`). `label.backgroundBox` passes for every box without a border on
  `-labels-p2` and `-edge-labels` (it drew 26.1 x 13.5 for 26.1 x 9.7), but only inside the comparator's size ratio:
  graphty still draws it 26.1 x 11.2, 1.16 times too tall. The neutral `labelLineHeight` is a multiple of the
  font's ascent plus descent (1.164 font sizes for the DejaVu Sans graphty draws these labels in), and Cytoscape.js's
  box is exactly one font size a line (`calculateLabelDimensions`, `h = size`), as is its line step (`line-height`
  times the font size, which graph-io does not read at all). No neutral value says "one font size" for every font,
  so this needs a line height in font sizes in the vocabulary and in graphty-element. Also still open:
  `text-metrics: glyph` (unread; the box is the glyphs' own ascent plus descent, 26.1 x 7.7 against graphty's
  26.1 x 11.2, failing `label.backgroundBox` on `-labels-p2`), `circle` (a disc as tall as the box, centered on
  it; no neutral box has that shape, noted), and a box with a border: Cytoscape.js strokes the border centered on
  the box's edge, graphty-element draws it wholly outside the box, on top of the 1.16 times too tall box (29.9 x
  15.1 for 26.1 x 9.7 at a 2 px border, 5.4 px taller), which needs a label border position in graphty-element.
- `border-position: inside` / `outside`: the comparator now reads only the half of the doubled stroke the clip keeps
  (the node's outline, or a box minus the outline by the evenodd rule), and the web oracle now records the evenodd
  rule and the `Path2D.addPath` that builds the outside clip (the SVG had the bare box, so the stroke was drawn whole).
  `cytoscapejs-specimen-node-fills-borders` regenerated; both specimens pass `node.width`, `node.height` and
  `node.strokeWidth` (they read 46.4 and an 11.6 stroke for a 5.8 border).

Still open after fix round 3:

- Numeric font weights 100, 200, 900 and `lighter` (`label.weight`): unchanged, the owner's call (above). 100, 200
  and `lighter` are read as normal (400), 900 as bold (700); none is drawn bolder than the file asks.
- Compound bounds (`group.box`, `group.present`, `group.extra` on `cytoscapejs-specimen-groups`): unchanged.
  graphty-element pads a group by its largest member's radius (`LayoutManager.boxOf`); Cytoscape.js pads the
  members' box, labels included, by `padding` (10 px unset) and grows it to `min-width` / `min-height` by the biases.
  Needs a group padding and minimum size channel in graphty-element and neutral properties for them.
- `source-distance-from-node` / `target-distance-from-node`: the neutral `nodeGap` and graphty-element's
  `edge.nodeGap` stop both ends alike; one end's gap needs a per-end gap in both packages.
- Label wrap (`json-cyjs-winecheese` 10 and `json-cyjs-graphmaker` 6 `label.lines`): not the widths. Measured in
  Chromium with the pinned fonts, `Hoch Ybrig` is 48 px wide at bold 9 px, inside `text-max-width: 50`, and
  Cytoscape.js keeps it on one line: `getLabelText` measures `subline + word + wordSeparator`, and a label's last word
  has no separator (`/[\s​]+|$/g` matches the end with ""). graphty-element's `wrapTrailingSpace` counts a space
  after the last word too (Cytoscape desktop's rule, measured on `cx-ndex-90f78bcd`), 50.5 px, so it breaks the
  line. Needs a wrap mode that counts the space after every word but the last, in graph-io's vocabulary and
  graphty-element's label options.
- `json-cyjs-tokyo` label places (`label.anchor` 17/712, `label.offset` 655/712): not a mixed alignment (its
  stylesheet sets none; every label is Cytoscape.js's default `top`). graphty draws each label about 4.5 render px
  higher than Cytoscape.js at the sheet's small zoom; the specimen sheets' `top` labels pass, so the gap grows as the
  font shrinks on screen. Open, graphty-element.
- `haystack` and `haystack-radius`, the edge to a hidden node, the edge overlay read as a second edge, the corpus
  edges left unpaired and the compound arrow caps (`circle-triangle`, `triangle-tee`, `triangle-cross`, read as no
  class on the oracle side): unchanged, as above; the comparator's edge association and arrow classes
  (`associate.ts`) are being changed by other work.

Round 4 (2026-10-21), lines drawn on one another and lines drawn as a filled shape, in the comparator
(`graphty-element/test/fidelity/oracle/associate-bands.test.ts`):

- Coincident edges between one pair: Cytoscape.js draws haystack edges between the same two nodes on top of each
  other. Where the one drawn first was wider, the comparator read it as the outline of the one over it
  (`cyjs-genemania`: Cytoscape.js drew 255 edges, the comparator read 218, 35 of them with an outline, and left 37 of
  graphty's edges extra). A band along a line is now read only while more lines run between the two nodes than
  graphty draws edges there. `cyjs-genemania` now pairs all 255 edges (`edge.extra` 218/255 to 255/255, no
  `edge.outline` rows); `json-cyjs-perf` gains 2 paired edges the same way.
- An edge's `overlay-*`, a wider band drawn over its line, was read as a second edge
  (`edge-overlay-opacity-0-5` in `cytoscapejs-specimen-edges-lines-p2`). It is now read as the line's overlay and
  judged as a property of its own, `edge.overlay` (graphty-element draws it as `line.overlay`), beside
  `edge.outline` for the band under the line.
- `curve-style: straight-triangle`: Cytoscape.js draws the line as one long filled triangle, as wide as the line at
  the source and a point at the target. The comparator read it as a shape and attached its point to the next edge
  as an arrowhead and its route (the haystack edges of `cytoscapejs-specimen-edges-lines`). It is now read as a line
  of line class `tapered`: the two triangle edges and the two haystack edges pass `edge.route`, `edge.arrow` and
  `edge.extra`, and the two tapered edges (and `curve-straight-triangle` on `json-cyjs-synth-edges`) now fail
  `edge.dash`, because graphty draws the line at one width. OPEN, graph-io and graphty-element: a tapering width
  needs a neutral property and a line of varying width (the same gap as Graphviz's `style=tapered`).
- The edge to a node with `visibility: hidden` (`target-visibility-hidden` on `-edges-lines-p2`): Cytoscape.js draws
  the line to the hidden node's outline, graphty draws it to the hidden node's center, and the comparator finds an
  undrawn end only within 4 px of where graphty's line ends; this line ends 4.4 px short of it, so graphty's edge is
  still extra. OPEN, comparator: graphty's drawing carries no size for a node it hides.

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

## Specimen sheets: Cytoscape desktop label settings graph-io now reads (fix round 1, XGMML, 2026-10-19)

graph-io's Cytoscape resolver (`graph-io/src/styles/cytoscape/`, shared by XGMML, CX, CX2 and sessions) now reads
these settings the way Cytoscape 3.10.5 draws them; tests in `graph-io/test/formats/xgmml/styles.test.ts` and the
CX and CX2 golden file `graph-io/test/styles/cytoscape-golden.json`. graphty-element draws them with new label
field channels (`labelOpacity`, `labelBackgroundOpacity`, `labelOffsetX`/`Y`, `labelShiftX`/`Y`). Numbers are the
XGMML sheets before and after:

- `NODE_LABEL_POSITION` is read whole: which point of the label's box is pinned to which point of the node, the
  justification and the x and y offsets (CX2's `*_ALIGN` fields are the label's point). A label inside the node or
  at its middle keeps its neutral `labelPosition`; any other pairing is drawn from the middle with an offset by the
  node's size and a shift by the label's own size, flush against the node as Cytoscape draws it. label.offset and
  label.anchor on `labels-p2` 6/42 -> 42/42; `labels-p2`, `-p3`, `-p4` and `mappings-bypass-p7` to `-p9` pass whole.
- `EDGE_LABEL_POSITION`: an edge's label is centered on its line; the anchor's horizontal letter pins it to the
  drawn line's source end (W) or target end (E), and its vertical letter changes nothing (measured on level lines).
  `edge-labels-p2` and `mappings-bypass-p17` pass (label.alongLine and label.offLine 2/7 -> 7/7); label.offLine on
  `edge-labels` 2/28 -> 28/28 (the label used to be drawn 7.5 px above its line).
- `*_LABEL_BACKGROUND_*`: a box behind the words only with a shape other than NONE (the default), in its color and
  transparency. label.background on `edge-labels` 24/28 -> 28/28.
- `*_LABEL_TRANSPARENCY` (CX2 `*_LABEL_OPACITY`): label.opacity on `edge-labels` 26/28 -> 28/28.
- `EDGE_LABEL_ROTATION`: label.rotation 25/28 -> 29/29. `EDGE_LABEL_AUTOROTATE`: Cytoscape 3.10.5's SVG draws an
  autorotated edge label level (`label-autorotate-true`, rotation 0 in the oracle), so graph-io reads nothing for it.
- `EDGE_LABEL_WIDTH` (CX2 `EDGE_LABEL_MAX_WIDTH`): the edge label wraps; edge.label 28/29 -> 29/29.
- Comparator: a label Cytoscape wraps is one SVG text per line, joined into one label, which kept its first line's
  box; it is now placed by the box of all its lines (`associate.ts`, `stackedTexts`), which the two-line labels of
  `labels` and `labels-p4` needed.
- Annotation arrowheads (`images-charts-p6`): every head is 10 wide at size 1 whatever the line's width, the Closed,
  Concave, Diamond and Open Arrows 17 long, the Circle and the X 10, the Triangular Head 5, the T a bar across
  (new `ArrowAnnotation` head lengths and widths); an Open Arrow is a chevron with no base. The comparator judges
  annotations only as stray marks, so this was checked by eye on the overlay, not by a property.
- `EDGE_BEND` rows of `edges-lines` and `mappings-bypass-p10` pass (graph-io draws XGMML handles at the network's
  origin, as Cytoscape's XGMML reader does). `xgmml-specimen-groups` passes: a group graphty draws nothing for is
  left out of the comparison (f85e2ba6a), so the 30 `group.extra` are gone.

Still open:

- label.backgroundBox (judged since this round): Cytoscape's box is the words' own box (11.7 px tall for a 10 px
  font) and `ROUND_RECTANGLE` rounds its corners; graphty-element's label panel keeps its own margins (5 px of the
  label's canvas on each side, 15.1 px tall, a ratio of 1.29) and square corners. The fix is a label box padding
  and corner channel in graphty-element (shared with Row gexf-label-box). `labels`, `edge-labels`,
  `mappings-bypass-p6` and `-p13`, 4 specimens each.
- Charts: bar charts (grouped, stacked, up-down, horizontal, heat strips), box, heat map and line charts, their
  axes, item labels and `cy_colorScheme`. graph-io reads only pie and ring charts and graphty-element draws only
  pies, rings and stripes on a node's face; Cytoscape draws the others with JFreeChart (axes, margins, item labels).
  The fix is a new face drawing in graphty-element and graph-io's chart reader feeding it. `images-charts`, `-p2`,
  `-p5`, `-p7` and the replays `-p14`, `-p15`, `-p18` keep their stray.present drops.
- `arrow-to-node`: the annotation's line stops at the node's center, Cytoscape stops at its box; the annotation
  reader has no node sizes.
- Annotations are judged only as stray marks (their shape, rotation and head sizes are not scored): comparator work.
- `arrows` and `arrows-p2` (25 of 43 and 3 of 15 edges associated): the comparator's edge association, which the
  comparator work is changing in `associate.ts`; not changed here.

## Specimen sheets: Cytoscape session settings graph-io now reads (fix round 1, sessions, 2026-10-19)

A session reads its style from `session_vizmap.xml` and each view's bypasses from `lockedVisualProperties`, through
the same resolver as XGMML, CX and CX2, so every label setting the XGMML round reads (above) is read for sessions too:
`labels-p2`, `-p3`, `-p4`, `edge-labels-p2` and `mappings-bypass-p7` to `-p9` pass whole on the session sheets, and
label.opacity, label.background, label.offLine and edge.label pass on `edge-labels`. What sessions needed beyond that
(test: "draws what a view's bypass of a parent visual property locks" in `graph-io/test/formats/cys/styles.test.ts`):

- A bypass of a parent visual property: a view saves a bypass under the name it was set with, and Cytoscape locks
  the parent's children with it. `NODE_PAINT` now paints the fill and the border (`node-fills-borders`
  `paint-d62728`), `NODE_SIZE` sizes the node whatever `nodeSizeLocked` says (`node-sizes-opacity`
  `size-80-unlocked`, 36 -> 80), and `EDGE_PAINT` and `EDGE_UNSELECTED_PAINT` paint the line and its arrows
  (`edges-lines` `paint-d62728`, `unselected-paint-d62728`; edge.color 54/56 -> 56/56). Only these children are read
  from a parent: the label colors' and the selected paints' places in the lexicon were not measured.
- `arrowColorMatchesEdge`: the line and both arrows are `EDGE_UNSELECTED_PAINT` (#404040, Cytoscape's own, when the
  style has none); the stroke's default and its mapping are not drawn, and a bypass of the stroke paints the line
  alone. `mappings-bypass` edge.color 8/11 -> 11/11, edge.arrowColor 2/6 -> 6/6
  (`passthrough-edge-color-*` and `arrow-color-matches-edge` are #404040 in all four oracles and in the XGMML's own
  saved graphics; `bypass-over-edge-passthrough` has a #9467bd line with #404040 arrows). The CX reading is the same
  resolver and changes with it; a CX test that expected the mapped color was corrected.

Still open on the session sheets (the same rows, with the same counts, on the XGMML, CX and CX2 copies):

- label.backgroundBox, the bar, box, heat map and line charts, the annotation scoring and the large arrowheads of
  `arrows-p2` (`target-arrow-size-16`, `-24`, `source-arrow-size-16`, `arrow-on-wide-edge`: 14 of 15 edges
  associated, the heads read as 5 stray paths): as the XGMML round above says. Linear and radial gradient custom
  graphics cannot be judged against these oracles: Cytoscape's SVG writer (FreeHEP) paints a gradient as one flat
  color (`#b7cce1` for the white-to-`#1F77B4` gradient on `images-charts-p2`), so a gradient graphty draws would fail
  where a flat fill would pass; they need a PNG oracle first.
- `mappings-bypass-p19` `passthrough-font-face` (label.weight 2/3 here, on CX and on CX2): the column holds
  `Serif,bold,12` and Cytoscape draws it plain (the XGMML saves `Serif.plain,plain,12`). Cytoscape's font parser
  takes bold only from a `.bold` suffix on the name and ignores the style word; graph-io reads the style word. The
  reader fix needs the writer to change with it (graph-io writes `SansSerif,bold,12`, which Cytoscape also draws
  plain), so both are left for one change. Resolved in fix round 2 (07cd87d31, the CX round): the session sheet
  passes.
- `labels` and `mappings-bypass-p6` `font-face-serif` (label.anchor, all four formats): the oracle reads the serif
  label as start-anchored; not an import setting (graph-io reads the label as centered, as the file says). Resolved
  in fix round 2: a comparator misreading, fixed there (f5a24b69c, see the session round 2 section below).

## Specimen sheets: Cytoscape session settings (fix round 2, sessions, 2026-10-20)

Measured with the oracle report on every `cys-` sample after rebuilding graph-io.

Fixed:

- Text measured in the wrong face (comparator, f5a24b69c): Cytoscape's SVG writer (FreeHEP) names Java's logical fonts
  `Helvetica`, `Times`, `Courier` or `Dialog.bolditalic`, but Java laid each line out in DejaVu (a centered "Multidrug "
  starts half of DejaVu Sans's 71.07 px left of its node's middle, not Liberation Sans's 61.47). The oracle reader now
  measures those texts in the DejaVu face. `cys-import-and-save` label.offset 212/300 -> 299/300, label.anchor
  222/300 -> 300/300 (the "corpus label places" row was this, not an import gap); `font-face-serif` on `labels` and
  `mappings-bypass-p6` passes; `cys-syn-mappings` and `-syn-bypass` label anchors 88/96 -> 96/96 and 52/58 -> 57/58.
- Edge ends where nodes overlap (comparator, associate.ts): an end is given to the node whose outline (an ellipse's
  own, a box's sides) or center it lies on, not to any node whose box holds it. `cys-affinity-purification` edge.present
  881/893 -> 892/893, `cys-luad-vest-v2` 295/300 -> 303/305, `cys-annotation-example` and `cys-galfiltered` find more
  of their edges. Test: `graphty-element/test/fidelity/oracle/associate-ends.test.ts`.
- A chart slice inside its node at the end of a line of the node's own drawing (a ring's divider) is no longer taken
  as that line's arrowhead, so it is judged as a stray against graphty's slice (`images-charts` `ring`,
  `ring-hole-0-7`, `-p2` `customgraphics-3-ring`, `-p5` `ring-hole-0-1`).
- ARROW, HAYSTACK, uncurved parallel edges (bbdf7ce71), the label background box and its ROUND_RECTANGLE corners
  (12b7e0d4d, e6d877107) and OPEN_HALF_CIRCLE caps (dbfd268c8), fixed by the sibling rounds, pass on the session
  sheets too. Test: `graph-io/test/formats/cys/fix-round-2.test.ts`.

Still open, and why:

- Chart labels (`images-charts-p5`, `-p7`, `mappings-bypass-p18`): as the CX and XGMML rounds say; 9 of the 11 on
  `-p7` label bar, line and heat map charts graphty-element does not draw at all, and pie item labels need a neutral
  slot and words drawn on a pie slice in graphty-element. `-p5` `pie-item-label-font-size-20` also leaves one slice
  extra (the oracle's slice is taken with the item label over it).
- The line reach under T, half circle and square caps (`arrows`, `mappings-bypass-p11`): being fixed by the sibling
  comparator round in `drawn-primitives.ts` and graphty-element's arrow gap; not changed here.
- Patterned corpus edges (`cys-syn-mappings` 139 `edge.arrow`, all on slashed, arrow-patterned, dashed and double
  lines in a crowded sheet; `cys-syn-bypass` 18): the oracle reader finds no cap at the end of a line drawn in pieces.
- `cys-import-and-save` 3 labels ("Decanoic Acid", 99.0 wide at a wrap width of 100) wrap in graphty and not in
  Cytoscape. Resolved in fix round 3 (e37884b68): Cytoscape keeps whole a label narrower than its width; see the
  session round 3 section below.
- The edge-end change was checked on every `cys-` sample and the comparator unit tests; the whole report across the
  other formats had not finished when this round ended.

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
  `vis-network-specimen-edges-lines` (smooth-_, roundness-_, background-curved*) and `-edges-lines-p3` pass their
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

## Specimen sheets: vis-network settings graph-io now reads (fix round 2, 2026-10-20)

graph-io's vis-network reader (`graph-io/src/formats/json/styles.ts`) now reads these the way vis-network 9.1.9 draws
them; tests in `graph-io/test/styles/vis-fix-round-2.test.ts`:

- Multi-font labels (`font.multi` true, html, markdown, and `font.bold`, `ital`, `boldital`, `mono` as objects or
  text): each block is a run of the new neutral `labelRuns` (a JSON array of `{ text, weight, italic, font, size,
color }`), its font from its modifier's own options over the label's (mono is 15 px monospace unless given).
  graphty-element draws the runs through its label markup, a run's size as a share of the label's (`<size='150%'>`
  is new in the markup); tests in `graphty-element/test/session/styles/label-runs.test.ts`.
- An `icon` node is its glyph alone (shape none): vis-network draws no body, fill or border for it.
- A color's alpha fades the border too (`color-rgba`, `color-hex-alpha`).
- `font.strokeWidth` with no `strokeColor` strokes the label white, vis-network's default (`font-stroke-default-color`).
- `scaling.label.drawThreshold` hides a label drawn under `drawThreshold - 1` screen pixels (`labelMinScreenSize`).
- `font.vadjust` moves the label down (`labelOffsetY`); a node's `font.align` left or right aligns its lines
  (`labelTextAlign`); a box's or text's uneven `margin` moves its label off center by half the difference of
  opposite sides (`margin-sides`). graphty-element now draws a label its offset moves over its own node in front of
  the node, as a center label is (`font-vadjust-neg` was hidden behind the dot);
  `graphty-element/test/browser/label-offset-over-target.test.ts`.
- A node takes none of a group's options it sets itself, each option whole (`Node.updateGroupOptions`): a node with a
  `color` of its own keeps vis-network's default border, not its group's (`group-border`).
- The style planner folds a tool's defaults rule last when a file has more than 15 rules, so a node the file does not
  style keeps vis-network's default colors and shape (`default` on the groups sheets drew graphty's #6366f1).
- A circle arrowhead is 0.8 of the arrow's length across (vis-network's `Circle`, radius 0.4 of it): it was drawn
  the whole length across, and the line under it judged off (mappings-bypass `edge-default` curve 0.24 against 0.18).
- `font.background` asks for a box round the words alone (`labelPadding` 0, `labelLineHeight` 1).

Comparator and oracle fixes, each with a test under `graphty-element/test/fidelity/oracle/`:

- A node graphty draws no body for (shape none, no image) is its label and glyph as free texts, unless the oracle
  draws a node there: vis-network's text and icon nodes (`node.extra` on `shape-text`, `shape-icon`, `icon-*`).
- Texts side by side on one line are one text, with a space where they are apart or one keeps a blank: vis-network
  draws each multi-font block as its own text (`label.present` o=None on every multi-font label). The web oracles now
  keep a text's blanks (`xml:space`): svgcanvas wrote the block " x" and the SVG collapsed its space; the
  vis-network label sheets were drawn again (`tools/web/regenerate-web.sh`).
- A curved open stroke across an edge's end is that end's arrowhead, a hollow half circle, also beside a node smaller
  than it (`curve`, `inv_curve`: `edge.arrow` o=false). graphty's curve cap is read as the hollow half circle it draws.
- graphty's line is carried on to the tip of a cap placed by its middle, as the oracle's is (`edge.route` 0.14 to
  0.28 under `circle` and `inv_triangle` caps).
- A dash gap of a tenth of its pattern still shows (`dashes-wide`, [5, 5] at width 4 under round caps, read solid by
  rounding while the same edge read dashed on mappings-bypass).
- A whole circle on a node's outline is the node's self-loop where graphty draws one, its route run from inside the
  node and the way graphty's turns (`self-loop`, `self-reference-size*`, `label-loop` were stray paths, graphty's
  loops extra edges).
- Lines flush right are one wrapped label (`font-align-right`); a caption's first line that is another caption's
  words still starts its wrapped caption; a text drawn off the canvas is judged nowhere (`font-shorthand` on
  edge-labels draws its label beyond the right edge).

Failing elements before -> after on the sheets: arrows 14 -> 6, edge-labels 29 -> 4, edge-labels-p2 4 -> 0,
edges-lines 10 -> 2, edges-lines-p3 2 -> 2, groups 2 -> 0, groups-p2 2 -> 0, images-charts 22 -> 8, labels 13 -> 4,
labels-p2 24 -> 4, labels-p3 3 -> 1, mappings-bypass 3 -> 1, node-fills-borders 3 -> 1, node-shapes 24 -> 5,
node-sizes-opacity 3 -> 2. Still open, and why:

- A modifier's own `vadjust` (`font.bold.vadjust` and the others: `font-*-vadjust` on labels-p2 and edge-labels, 4
  rows each): the run is drawn that far lower; graphty-element's label markup has no vertical shift for a run, and the
  comparator does not join a run drawn that far off the line. graphty-element work: a run offset in the markup.
- A line of runs of mixed sizes (`font-multi-html`, `font-multi-markdown`, `font-mono-shorthand`: `label.offset` 33.9
  against 27.8): vis-network draws every block middle-baselined on the line's middle and adds a mono block's
  vadjust 2, graphty-element sets the runs on one baseline. graphty-element work.
- `font.background` box (`label.backgroundBox` 22.4 x 9.2 against 25.2 x 15.7): graph-io asks for `labelPadding` 0
  and `labelLineHeight` 1, and the label is built with `boxPadding` 0 and `lineHeight` 1, yet the box graphty-element
  draws keeps its size: graphty-element.
- `widthConstraint.maximum` (`width-constraint-max`: 2 lines against 3, node 53 x 30 against 39 x 38): vis-network
  measures each blank between words as three when it wraps (`LabelSplitter.getLongestFit` joins its word list, the
  blanks included, with a blank), so "a long box label" at 50 wraps after every word. graphty-element's wrap counts a
  blank once; it needs a wrap option for it, and graph-io a neutral property to ask for it.
- `edges.background` with `dashes` (`background-curved-dashes`, edges-lines-p3): vis-network draws the band dashed.
  Fixed in fix round 3: graph-io reads `background.dashes` as the neutral `outlineStyle` (the band's dashes at its
  `size`, butt caps), graphty-element draws `line.outline.type` "dash" or "dot" (channel `edge.outlineStyle`), and the
  comparator reads a dashed band under a line as that edge's outline with its line class. edges-lines-p3 passes every
  row. Still open: its `raster.edge` falls from 0.9225 (band drawn solid) to 0.9198, under the 0.92 floor, because of
  this fix: `background.dashes` [6, 4] on a 10-wide band is blocks 6 long with butt ends, 10 px apart, which the
  neutral `dotted` names; graphty-element draws a `dot` band as round dots about 15 px apart. The class is right and
  the pattern's own geometry is not carried; it needs a dash length and gap the outline (and a line) can be drawn
  with (graph-io and graphty-element). A background whose dashes read as dash-dot is drawn as `dash-dot` since
  the verification of fix round 3 (before it, graphty-element dropped the value and drew the band solid).
- A small label below a node sized by `size` (`labels` `font-size-6`, label.offset 25.1 against 21.7) and
  `font.background` (`font-background`, 28.6 against 22.0): vis-network hangs the text's top 4 + size / 2 below the
  outline (ShapeBase._drawShape, Label.calculateLabelSize), lower than a neutral `bottom` label, by more the larger the
  font. Fixed in fix round 3: graph-io adds 2 + size / 6 to `labelOffsetY` of such a label, fitted on the labels
  sheet's font sizes 6 to 40 (the words' ink now within 1 px of vis-network's at every size); the labels sheet passes
  every row. A neutral anchor that hangs a label's words from a point would replace the fit.
- The picture graphty draws inside a vis-network image node (`circularImage`, an `image` with a border or a
  background; `node-shapes`, `images-charts`) failed `stray.extra` (`graphty:annotation-image`): the oracle side
  folds the program's `<image>` into the node, so nothing was left for graphty's picture to match. Comparator, fixed in
  fix round 3: the oracle node keeps the boxes of the pictures it is drawn with (`pictures`), and graphty's picture
  matches one of them as it would a stray. `annotation-image#5` on `images-charts` still fails: graphty places the
  `coordinate-origin-circular` node 23 px off (`node.position`, shared with `unpositioned-layout-scale`).
- `json-vis-siblings` (200 nodes / 284 edges drawn, 83 / 104 associated): not an import gap. The file has no hidden or
  duplicate record and vis-network draws all of them (`observed` 200 / 284 in the oracle's metadata); it stores no
  positions, so graphty lays it out itself and the geometric association pairs 83 of its nodes by chance. Shared
  with the other vis-network documents without positions (`unpositioned-layout-scale`).
- `json-vis-synth` `curve`, `inv_curve` and `image` arrows (5->6, 6->7, 11->12) read as no arrow on the oracle: the
  arc sits against the target dot where the next edge starts at the same center, and the comparator gives it to
  neither; the image arrow is read as a stray picture.
- Unchanged from round 1: `database` (no stroke on the oracle, sized from its label's width), `border-radius-12`
  (shape class), `coordinate-origin-circular` and `image-background` (images-charts), `self-reference-front`.

Checked again on a clean copy of the commits (2026-10-20), every vis-network sheet run against the committed floors
and known failures:

- The rows still open above are not in `oracle-known-failures.json`, so these sheets fail the oracle report as
  committed: `labels` (`label.offset` on `font-multi-html`, `font-multi-markdown`, and `font-background`, which the
  `labelLineHeight` 1 of the background box moved 6.7 px toward its node while the box kept its size), `labels-p3`
  (`label.offset` on `font-mono-shorthand`, judged now that its runs are one text), `json-vis-synth` (the `curve`,
  `inv_curve` and `image` arrows, now that graphty's own curve cap is read) and `node-sizes-opacity`
  (`size-30-database` `label.anchor`, failing before this round too). The recording that went with this round dropped
  them from the list without their passing on the committed code.
- `json-vis-world` (`node.width`), `json-vis-lesmiserables` (`edge.present`, `label.size`), `json-vis-nodelegend`
  (`label.rotation`) and `images-charts` (`node.position`) fail their floors on a clean copy from before this round
  as well: not this round's, and graph-io resolves those three documents' styles the same before and after it.
- `inv_curve` on the arrows sheet (`edge.route` 0.109 against 0.05) failed after the Cytoscape `OPEN_HALF_CIRCLE`
  change ended graphty's line at the back of every open half circle: vis-network's lies against its node and graphty
  runs the line on under it. The comparator now ends the line at the arc's back only for a cap standing off its node
  (`ArrowStyle.gap`, which Cytoscape's half circles set).

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

A Pajek vertex is its number in the file; `pages.json` `names` maps each vertex number to its setting id
(`anchor-*`, `cap-*`, `<edge id>-s` / `-t`). FIXED (2026-10-19): the comparison names every vertex by that map on
both sides once the oracle is associated (`specimenNames` in `oracle-library.ts`), so the frame is fitted on the four
anchors, the captions are left out and a failure names its setting. Each page is loaded with the `pajekDraw` it was
drawn with (the Draw window's 1200 x 900, the page's `ini`, the partition and vectors of its DRAW macro).

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
    - `q` reshapes the diamond: 0.01 is a diamond with cut tips, 0.5 a hexagon, 1 a square, 2 a bow tie. FIXED
      (2026-10-20): graph-io reads every diamond as Pajek's six-cornered polygon, `q` (0.001 by default) wide at its
      top and bottom (`shapePoints`, unstretched), and writes it back as `diamond q`; node.shape on `node-shapes` and
      `-p2` 24/38 -> 35/38, graphstream-b 88/111 -> 111/111, lin-rel4 179/225 -> 225/225.
- Sizes: `s_size` is ignored (`specimen-node-sizes-opacity` `s-size-*`); `x_fact 0 y_fact 0` draws nothing; a vertex
  line whose parameters start with `s_size` and name no shape (`s_size 2 ic Red`) is drawn as a default box, its
  color ignored (FIXED 2026-10-20, below). SVG Opacity of Vertices 0.5 sets the fill and stroke opacity (`-p3`). Options / Size / of Vertices s (default 8) scales
  each axis by f = s / 8 when the file sizes that axis (`x_fact`, `y_fact`) and by f squared when it does not, each
  axis on its own (`specimen-node-sizes-opacity-p2` at 16; a probe at 4, 16 and 24: `x_fact 2` alone is drawn 20 x 5,
  80 x 80 and 120 x 180). FIXED (2026-10-19) per axis; the fix round had scaled a half-sized vertex's unsized axis by
  f, not f squared.
- Colors: a name Pajek does not know, or a known one in lower case (`red`), fills a vertex white and draws a line
  black (FIXED 2026-10-19: node fill on `node-fills-borders-p3` 31/33 -> 33/33; LightOrange, drawn #ffd9bc,
  `-p2` 52/53 -> 53/53); `Gray50`, which Figure 19 does not list, is drawn gray. The four syntaxes (`RGBFF8800`, `RGB(1,0.5,0)`,
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
  value is drawn as `Dots` when the line sets no `p` (`p` is not carried from the line before: `pajek-synth-lines`
  edge `3 10` after `1 8 ... p Dots`, arc `5 6 -1` after `p Solid`); the oval (`k1 -1`), circular
  arc (`k1 -2`, `k1 -3`) and double (`k1 -4`) routes are drawn straight; a loop is a Bezier loop and a bidirected
  pair two curves. Straight Lines (`specimen-edges-lines-p4`) draws the curves of a bidirected pair and of parallel
  lines straight and leaves a line's own Bezier route (`a1 k1 a2 k2`) curved; Lines Color as Gradient of EndVertices
  (`-p5`) paints each line with a gradient of its end vertices' colors. FIXED (2026-10-20): `Dots` is
  `stroke-dasharray:5`, dashes and gaps 5 px long whatever the width, so graph-io reads it as dots on a line 10/3 px
  wide or wider and as dashes on a thinner one (it read every one as dotted, and carried `p`; `edges-lines` edge.dash
  31/33 -> 33/33, synth-lines 65/88 -> 85/88); Straight Lines no longer straightens a Bezier route (`edges-lines-p4`
  edge.curve 31/36 -> 35/36, edge.route 29/36 -> 34/36).
- Arrows: `a B` draws the same arrow as `a A`; an arrow is 6 x `s` long (tip to its back corners) and 5 x `s` wide, its back notched by 1 x `s`; `ap` is measured from the
  target along the line between the centers, the arrowhead's back at that point (`ap 1` at the source's center,
  pointing on); `*Edges` lines draw no arrow whatever `a` and `s` say. No Labels no Arrows hides the labels, but the
  SVG export still draws every arrowhead (`specimen-arrows-p2`; FIXED 2026-10-20, graph-io had removed them: edge.arrow
  45/66 -> 66/66); Lines finished at Vertex Border stops each line at its vertex's border (`-p3`). FIXED (2026-10-20)
  in the comparator's reading of graphty's drawing (`graphty-element/test/fidelity/drawn-scene.ts`): an arrowhead
  graphty draws part-way along its line (`arrowPosition`) no longer cuts the line there (`ap-0-25`, `ap-0-5`, `ap-1`
  edge.route 18/22 -> 21/22 on `arrows`), and one past the middle is read at the end it sits at, pointing back
  (`ap-1`: edge.arrow 64/66 -> 66/66, arrowShape 21/21). Left: graphty puts the arrowhead's tip at `ap` of the line
  between the outlines where Pajek puts its back at `ap` of the line between the centers (`ap-0-25` a few px apart;
  not judged).
- Line labels: drawn only under Mark Lines / with Labels (`specimen-edge-labels` against `-p2`, which draws none);
  `lp` is measured from the terminal vertex. Pajek's SVG export writes each line's label BEFORE its line's comment,
  after the line before it, so the comparison read every label as the line before's (`Edge: 1 2`, which has no
  label, followed by the label drawn at the middle of `3 4`); FIXED (2026-10-19) in the comparator's Pajek markup
  reader, and graph-io now reads the place: the label's middle at `lp` from the target (a fraction up to 1, else a
  distance), out by `lr` at `lphi`, its baseline through that point, turned along the line (along a Bezier curve's
  tangent there) and `la` further (`edge-labels` alongLine 0/26 -> 28/28, offLine 18/26 -> 28/28, rotation 21/26 ->
  27/28, size, color and family 22-23/26 -> 28/28, edge.label 24/30 -> 28/28; `edge-labels-p2` and `arrows-p2`
  draw none, as Pajek). Left: the loop's label (`on-loop`, rotate(179.97)), with the loop below. Mark Lines / with Values could not be switched on through the ini
  (`Form8.withValues1` leaves the export unchanged), so line values have no page.
- Options that change only the Draw window, never the SVG (the export is byte for byte the default one): Size of
  Vertex Border, Size of Lines, Size of Arrows, Size of Font, Labels Centered, Labels with Transparent Background,
  Arrows in the Middle. They are in `pajek.py`'s NOT_SWEPT with that reason.
- Hooks: Pajek's shipped SHAPES.CFG defines hooks for every shape but `empty` (box CART, 400 points round its
  border; ellipse CIRC `10 1`, hook k at k degrees; diamond and cross POLAR), and a line's `h1` / `h2` 1, 2, ... use
  them: `h1 90 h2 270` between two ellipses runs from the top of the source to the bottom of the target, `h1 1 h2 1`
  ends on the far side of the target (`specimen-edges-lines-p2` `h-*`); a cross, drawn as an ellipse, takes an
  ellipse's hooks (`h-cross-1-3`: hook 3 at 3 degrees), 0 is the center and -1 the nearest hook. FIXED (2026-10-20):
  graph-io reads the ellipse's, the box's and the cross's hooks as `sourcePort` / `targetPort` (`h-ellipse-90-270`,
  `h-box-1-100` edge.route pass). Left: the hooks of a diamond (360 polar radii), a triangle, a house and the figures
  are not read (no specimen or sample uses them), and Pajek draws the box's hook 100 0.22 of the half width left of
  where its SHAPES.CFG puts it (`h-box-1-100`, 1.3 px).
- Rotation and the third coordinate: `phi` rotates a wide ellipse and a diamond too (`specimen-node-shapes`
  `phi-30-*`); the `z` coordinate, or none, leaves the drawing unchanged (`specimen-node-sizes-opacity` `z-*`).
  FIXED (2026-10-20) for the box, triangle, house and diamond: graph-io writes the turned corners as `shapePoints`
  (`phi-30-box` node.shape, width and height, `phi-30-triangle` position). Open: a turned ellipse (`phi-30-ellipse-wide`,
  height 25 against 37.5) and a turned man or woman (`phi-30-man`, `phi-90-man`: width and height swapped). The
  neutral vocabulary and graphty-element have no node rotation, and an outline of corners would draw an ellipse as a
  polygon: the fix is a node rotation in graphty-element and the vocabulary, not yet built.
  Comparator, open (2026-10-20): `phi-30-triangle` now fails `node-shapes@matched` and `-p2@matched` node.position
  (0.974 against its floor 1; it passed before the fix, and passes the unmatched view). Both readers take a node's
  position as the middle of its drawn outline, which a turned triangle has off its center; the matched view moves
  graphty's node CENTER to the oracle's outline middle (`matchPositions` in `run-oracle.ts`), so graphty's turned
  triangle is read that offset off again (oracle (327.79, 338), graphty (335.37, 342.37); Pajek's center is
  (320, 333.5)). Moving each node by the step from its own read position to the oracle's instead fixes it (and
  `dot-specimen-node-shapes`, `gml-specimen-node-shapes-p7` @matched node.position), but in a full run it also
  changed `json-graphology-synth@matched` edge.route 141 -> 131 of 180, `dot-real-depcruise@matched` frame.zoom
  1 -> 0 and `json-vis-siblings@matched` node.width 50 -> 48 for reasons not yet found, so it is not applied.
- A project file's partition and vector (`specimen-mappings-bypass`): Draw > Network + First Partition colors each
  vertex by its cluster with Figure 20's 40 partition colors (cluster 0 Cyan, 1 Yellow, 2 LimeGreen, 3 Red, ...),
  over the vertex's own `ic` (`part-3-over-ic`, as section 5.2 says); a cluster past 39 wraps (40 Cyan, 45 Pink,
  100 WildStrawberry) and -2 is drawn LimeGreen. First Vector scales a vertex by the square root of its value (4
  doubles the radius), 0 hides it, and -1 draws it at its own size. With a second vector (Draw > Network + First
  Partition + First Vector + Second Vector, `-p3`) each value is a plain factor, not a square root: the first scales
  the width and the second the height (`vector=4` with a second value of 1 is four times as wide and as tall as
  before; `vec2-*`, `vec-2-vec2-3`), times the vertex's own `x_fact` / `y_fact`. Without them (`-p2`) the same file
  draws every vertex as the file says. FIXED (2026-10-19): graph-io's `pajekDraw` option takes `partition`,
  `vector` and `vector2` and draws them by these rules (`formats/pajek/draw.ts`); node fill, width and height pass on
  all three pages but for `vec-0` (a hidden vertex graphty still draws as a dot, below) and the comparator's
  large-vertex misses (below).
- Coordinates: Pajek stretches the file's 0..1 coordinates to its Draw window one axis at a time (x * 1200, y * 900 on
  these sheets). FIXED (2026-10-19): `pajekDraw` `width` / `height` set the position column's `pxPerUnit` and
  `pxPerUnitY`; without the option a file keeps the 500 x 500 square of Pajek's EPS export, which the corpus oracles
  are drawn in. Every position on every page now passes but `phi-30-triangle` (`specimen-node-shapes`, a turned triangle's center) (all 112 missed on `specimen-mappings-bypass` before).
- Draw window options FIXED (2026-10-19) through `pajekDraw.ini`: Mark Vertices Using Numbers / No Labels / No Labels
  no Arrows (`labels-p2`, `labels-p3`, `arrows-p2`), Size of Vertices (`node-sizes-opacity-p2`), SVG Opacity of
  Vertices (fill at the opacity, border at its square: `-p3`), SVG Opacity of Lines, Straight Lines (`edges-lines-p4`)
  and Lines as Gradient of End Vertices, arrowheads in their end vertex's fill (`edges-lines-p5`). Also read now: a
  line's `s` (an arrowhead 6 x `s` long and 5 x `s` wide, carried like `c` and `w`; football and graphstream-b arrow
  length 49/118 and 0/192 -> all), a label's `la` below 360 as its rotation, `s_size` not at all (as Pajek draws), and
  a color written as numbers (`c 0.700 0.700 0.700`, `c 0.7 0.2 0.2`) as no color, the line keeping its carried or
  default one (`pajek-1crn` edge color 0/337 before; `c-three-fractions`).
- Still open after the fix round:
    - FIXED (2026-10-19) Label placement (`lr`, `lphi`): the label is centered with its left edge's middle at
      (lr cos lphi, -lr sin lphi) less 0.3465 of its size (its baseline through the point), `labelShiftX` 0.5
      (`labels` offset 28/39 -> 39/39, anchor 26/39 -> 39/39; `labels-p2` 33/44 -> 44/44, 31/44 -> 44/44).
    - FIXED (2026-10-19) `la` 360 and above turns the label away from the middle of the file's square, (0.5, 0.5) in
      its own coordinates, then `la - 360` further (`la-360` -109.83, `la-400` -110.17; `labels` rotation 37/39 ->
      39/39, `labels-p2` 42/44 -> 44/44).
    - FIXED (2026-10-19) Bezier routes: `a1 k1 a2 k2` are one cubic curve, its first control point k1 / 2 of the line
      from the source turned a1 clockwise on screen, its second k2 / 2 back from the target turned a2
      counterclockwise; a negative `k1` (oval, arcs, double) stays straight, as the SVG export draws them, and
      Straight Lines draws every one straight (`edges-lines-p2` and `-p5` curve 28/36 -> 32/36, route 26/36 ->
      29/36; `edge-labels`, `-p2` 28/30 -> 29/30; `arrows-p3` curve 21/22 -> 22/22; c 122/125 -> 125/125). Left: an
      arc's curve, which Pajek fits to the arrowhead's back rather than the target's center (`arrow-bezier`, curve
      0.13 against 0.19 on `arrows`, `-p2`; FIXED 2026-10-20 below), and loops: Pajek's Bezier loop has its control points k x 250 out at
      a1 and 180 - a2 degrees on screen (k 0.3 at -70 by default), which graphty's own loop does not draw (curve
      2.4 against 11.1). Mutual pairs pass.
    - FIXED (2026-10-19) SVG Vertices 3D Effect (`Form10.effect3d`): each vertex is a linear gradient from its fill
      to half of it, top to bottom, turned with `phi` (`node-shapes-p2` gradient 0/38 -> 38/38).
    - `x_fact 0 y_fact 0` draws nothing; graphty draws a 2 px dot (`x-fact-0`). The same holds for a vertex a vector
      value of 0 hides (`specimen-mappings-bypass` `vec-0`).
    - A vertex line whose parameters start with `s_size` and name no shape (`s_size 2 ic Red`, `s-size-no-shape`) is
      drawn by Pajek with every parameter on the line ignored: default size and fill, and the shape carried from the
      line before (a box on the `node-sizes-opacity` pages, 20 x 20 at the default size, 80 x 80 at Size of Vertices
      16). FIXED (2026-10-20): a Pajek 6.02 probe of every vertex key first on a placed line voids the line for `bc`,
      `bw`, `s_size`, `phi`, `r`, `q`, `lc`, `la`, `lr`, `lphi`, `fos` and `font`, and reads it whole for `ic`,
      `x_fact` and `y_fact`; graph-io now draws such a line at Pajek's defaults in the shape of the vertex line before,
      and its writer names `ellipse` before such a key (`node-sizes-opacity`, `-p2`, `-p3` node.shape and node.fill
      26/27 -> 27/27). Left: the shape is not always the line before's (in the probes, after `box ic Green` a voided
      line drew an ellipse in one file and the triangle of two lines before in another); Pajek's rule was not found.
    - FIXED (2026-10-20) A Bezier arc's end: Pajek places the arrowhead as on a straight arc, its tip 1.5 short of where
      the straight line meets the target's outline, turns it `-a2` degrees about that point, and runs the curve from
      the source's center to the arrowhead's back, its control points measured on that shorter line
      (`route-bezier-opposite-arc`: back at (347.02, 124.32), 6.5 from the outline point (352, 128.5), turned 40
      degrees); graph-io now writes those control points in the frame of the line between the centers
      (`arrow-bezier`, `route-bezier-*-arc` curve 0.129 -> 0.135 against 0.189). Left: graphty still runs the curve on
      to the outline and puts the arrowhead there, so `route-bezier-opposite-arc` and `arrow-bezier` miss by 0.007 of
      their length (edge.route 0.057 against 0.05).
    - Comparator: a vertex much larger than its neighbors (`vec-9` 120 px, `vec2-3`, `vec-2-vec2-3`, and on
      `node-sizes-opacity-p2` the 80 px vertices at Size of Vertices 16) is reported `node.present` missing with a
      graphty `group.extra`, although both drawings show it the same size in the same place (overlay of
      `pajek-specimen-mappings-bypass`). A comparator false positive, sent to the comparator work.
    - FIXED (2026-10-19) PostScript font names: Pajek writes `font` into its SVG as the family, which the pinned
      fonts draw as that PostScript family, upright: graph-io reads `Courier-Bold` as `Courier, monospace` and
      `Helvetica-Oblique` as `Helvetica, sans-serif` (`labels`, `labels-p2` family 37/39 -> 39/39, 42/44 -> 44/44;
      `edge-labels` 23/26 -> 28/28).
    - Comparator: the specimen sheets' lines are now named by their end vertices' settings too
      (`lp-0-2-s->lp-0-2-t#0` for `7->8#0`), as their vertices already were (FIXED 2026-10-19).
    - Arrowhead class: Pajek's notched arrowhead is read as a triangle; `edge.arrowShape` passes on `edges-lines`,
      `-p3` and `-p5` (7/7, 7/7, 12/12) since the comparator reads an arrowhead along its own axis.
    - Label text encoding (pajek-iliad): Pajek 6.02 reads the UTF-8 file as Windows-1252 and draws the two
      characters of each UTF-8 byte pair; graph-io decodes it right. The program's limit, not an import gap. It is
      also why two labels miss their place now that a label starts at its point: vertices 204 and 85 (Oilean Ajax and
      Deiphobus, each with an i-diaeresis) are a character wider in Pajek's drawing, which draws that letter as two
      (A-tilde and a diaeresis), so their middles sit further right (label.offset 309/311; listed in
      oracle-known-failures.json).

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
(`oracles/tools/ogdf.mjs`, OGDF built from source at its release tag `foxglove-202510` into the main checkout's
`tmp/ogdf/`) and the Gephi sheets drawn by Gephi Toolkit 0.11.3 (`oracles/tools/gephi.mjs`, node labels shown and
label overlap avoidance off, as the GEXF pages are). The GML draft's sheets (plain GML, no Creator: `node-shapes`,
`node-fills-borders`, `node-sizes-opacity`, `labels`, `edges-lines`, `arrows`, `edge-labels`, `images-charts`) are
drawn by the same OGDF as written, read by GraphIO::readGML and drawn by GraphIO::drawSVG (route `ogdf-draw`, the
owner's decision of 2026-10-20; before, Cytoscape desktop's GML reader or gml2gv stood in), and judged per setting
(below): OGDF judges what it draws, Cytoscape desktop's GML reader and gml2gv | neato -n2 (both drawn into
`oracles/stand-ins/`) what OGDF does not draw, and the draft itself what no program here draws. The yEd sheets' oracles are still Cytoscape desktop's GML reader or gml2gv
| neato -n2, stand-ins for yEd, which cannot be automated here, until the owner exports them from yEd by hand. What
the programs do, which the importer must match:

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

OGDF's reading of the GML draft (Himsolt, "GML: A portable Graph File Format", 1996, and the Tk keys it borrows),
key by key, from OGDF 2025.10's GmlParser and SvgPrinter and from its drawings of the draft sheets (2026-10-20). Where
OGDF departs from the draft, graph-io keeps the draft's reading and the specimen is OGDF's limit, not an import gap:
its elements are listed in `oracle-known-failures.json` for that reason and no floor was lowered for them.

- Drawn as the draft says: `graph [ directed ]`, `node [ id label graphics [ x y w h ] ]` (x, y the center, y down),
  `fill` and `outline` written `#RGB` or `#RRGGBB`, `type "rectangle"`, `edge [ source target label ]`, edge
  `graphics [ fill arrow Line [ point [ x y ] ] ]` (arrow `none`, `first`, `last`, `both`; a Line's points are its
  route, the end points dropped where they sit on the node centers). `graphics [ label [ x y ] ]` is OGDF's own label
  offset, not the draft's. `w`, `h` and the node box are exact (`node-sizes-opacity`: every size drawn as written).
- Drawn differently (OGDF's limits):
    - `type`: OGDF knows `rectangle` alone of the draft's types; `oval`, `arc`, `polygon`, `line`, `text`, `image`
      and `bitmap` are logged as invalid and drawn as rectangles (`node-shapes`, and every node of every draft sheet,
      whose neutral type is `oval`: node.shape fails wherever graphty draws the draft's ellipse).
    - Colors: only `#RGB` and `#RRGGBB`. Tk's other syntaxes (`#RRRGGGBBB`, `#RRRRGGGGBBBB`) and every color name
      (`orange`, `light blue`, `ORANGE`, an outline `red`, an edge `blue`) are drawn black (`node-fills-borders`
      `fill-hex9`, `fill-hex12`, `fill-name`, `fill-name-space`, `fill-name-upper`, `outline-name`).
    - `width` (the draft's outline width of a node and line width of an edge) is not read: every outline and line is
      1 px (`node-fills-borders` `width-0` to `width-6`, `outline-*` at width 3). OGDF reads its own `lineWidth`.
    - `stipple` (a Tk bitmap name, a fill pattern) is read as an OGDF stroke type, which none of Tk's names is: the
      node is drawn with no outline and the edge with no line at all (`node-fills-borders` `stipple-*`; the
      `edges-lines` stipples, seen in a trial drawing).
    - A node with no graphics is OGDF's default, a 20 x 20 white rectangle with a black outline (`default` on every
      draft sheet), and an edge with no `arrow` gets OGDF's default arrow at its target even in an undirected graph
      (`default` on `arrows` and `edge-labels`), where the draft draws none.
    - `label`: every label is drawn centered on its node in one 10 px Arial (drawSVG's default; the draft names no
      font), on one line however long (`labels` `label-long`), and GML's character entities are not decoded
      (`label-entity` draws `A&amp;B &quot;q&quot;`, `label-char-ref` draws `caf&#233;`). An edge label is drawn at
      the middle of the route's first segment (`edge-labels` `label-bend`).
    - `image` and `bitmap` are not read: the node is a plain rectangle (`images-charts`, every image specimen).
    - `smooth`, `arrowshape`, `capstyle`, `joinstyle`, `anchor`, `font`, `justify` and `visible` are not keys OGDF
      knows (GML.cpp): they are skipped, so a smoothed Line is drawn as straight segments. OGDF draws a loop as a
      polyline through its bends and back.
    - A line longer than the draft's 254 characters fails the read ("Cannot obtain min and max node id"); the draft
      sheets' header comment is written as two `comment` keys for it (`generators/specimens/gml.py`).
    - A `Line` holding only the edge's two end points (the draft's straight edge, `edges-lines` `line-straight`)
      crashes OGDF's reader (GmlParser pops the end points and then reads the back of the empty list: a segmentation
      fault). `oracles/tools/ogdf.mjs` leaves such a Line out of the copy OGDF reads, which the draft says means the
      same straight edge (A.4, Line, note 1), and records it in the oracle.json (`preprocessing`); since 2026-10-20
      `edges-lines` is drawn by OGDF too (it kept gml2gv as its stand-in before).

Per-setting judging of the GML draft's sheets (the owner's decision of 2026-10-20). No one program draws every key of
the draft, so each property of each setting (each specimen) is judged by the first reference that draws it as the
draft means, and never by one that cannot: `specimens/gml/judges.json` holds the map, with the reason for every rule,
and `graphty-element/test/fidelity/oracle/judges.ts` applies it (each reference's comparison keeps only the judgments
the map gives it). The map was chosen from what each program drew of each setting, never from what graphty draws.

- OGDF (the oracle; floors key `<sample>`) judges node position and size, label presence, text and place, `type
rectangle`, `#RGB` and `#RRGGBB` fills and outlines, the `arrow` ends, a Line's bends and loops, and edge labels.
- Cytoscape desktop's GML reader (a stand-in; key `<sample>~cytoscape-gml`, in `standInFloors`) judges the draft's
  `width` (outline and line width), Tk's color names (`fill-name`, `fill-name-upper`, `outline-name`, the edge's
  `fill-blue`), and the outline and line of a stippled node or edge, which OGDF does not draw.
- gml2gv | neato -n2 (a stand-in; key `<sample>~gml2gv`) judges `type oval` (OGDF draws rectangle alone, Cytoscape its
  round rectangle; Graphviz draws oval as an ellipse), the outer size of a node with a wide outline (drawn centered
  on the box, as Tk draws it; OGDF draws every outline 1 px wide and Cytoscape draws its border inside the box), and a
  label's text where GML's character entities decode (`label-entity`, `label-char-ref`).
- The draft (key `<sample>~specification`, in `specificationFloors`): an expectation per setting, the oracle's
  drawing with the expected values written over it, citing the draft's section or the Tk manual the draft says its
  graphics follow (A.4). Tk's 9- and 12-digit colors and `light blue` (`fill-hex9`, `fill-hex12`,
  `fill-name-space`: #FF8800, #FF8800, #ADD8E6), a 0-wide outline drawn one pixel wide (`width-0`), a gray stipple as
  that share of its fill or line (`stipple-gray75` to `-gray12`: 0.75 to 0.125 of the fill's or line's opacity), an
  image or bitmap node drawn as its picture's rectangle with no outline (`type-image`, `type-bitmap`, `image-png`,
  `image-png-wide`, `bitmap-xbm`, `bitmap-fill`), Tk's default arrowhead (`-arrowshape {8 10 3}`: 10 long, 7.5
  across a 1.5-wide line), a `smooth 1` Line as Tk's parabolic splines (`smooth-1`), and no arrow on an undirected
  graph's edge that names none (`default` on `edge-labels` and `edges-lines`). An element the oracle does not draw at
  all (OGDF draws a stippled line as no line) is taken from a stand-in's drawing, carried into the oracle's frame on
  the corner anchors.
- No one (`none`): what nothing sets and nothing defines. The `default` specimens' style (no program draws the
  draft's own defaults, w and h 0 and an edge width of 0.0, so each draws its own), the canvas background, a label's
  font (the draft names none), the draft's types a node's box cannot draw (`type-arc`, `type-line`, `type-polygon`,
  `type-text`), an icon stipple's coverage (`stipple-error` and the other icons), a picture's content and how an image
  draws a node of type oval (`image-on-oval`), and where an edge label sits on a bent edge (`label-bend`: OGDF puts it
  on the first segment, Graphviz at the middle; the draft says nothing).

A sheet judged per setting has no raster scores: a region's similarity is a mean over every element in it, whatever
reference judges each one's properties, so no one drawing can judge it. Its floors and known failures were recorded
afresh under the scheme (2026-10-20), not lowered: under OGDF alone the seven sheets failed 166 element-properties
(and `edges-lines`, under gml2gv, 91), nearly all OGDF's or gml2gv's limits; under per-setting judging OGDF's and the
stand-ins' shares fail nothing but the six unassociated primitives OGDF draws on the `labels` sheet (known before too), and the specification's share
fails 38, each a graph-io or graphty-element gap now on the fix list in `oracle-known-failures.json`:

- graph-io does not read Tk's 9- and 12-digit colors or a color name with a space (`fill-hex9`, `fill-hex12`,
  `fill-name-space`: graphty draws its default fill), `stipple` (node and edge), `image` and `bitmap` (graphty draws
  a plain oval with its outline), `smooth` (graphty draws the Line straight), or a 0-wide outline as Tk's one-pixel
  line (graphty draws none).
- graph-io gives a plain GML arrow no size, so graphty-element draws its own arrowhead (4 by 3 px) where Tk draws
  10 by 7.5.
- graphty-element draws its default edge, which has a target arrow, for an undirected graph's edge that names no
  arrow (`default` on `edge-labels` and `edges-lines`).

Decided by the team (2026-10-20, reversible): a plain GML node's label is centered on its node, as OGDF and
Cytoscape draw it; the draft names no place for it. graph-io's GML reader sets `labelPosition` center for the label of
a node in a file with no recognized writer (the draft's keys, and igraph's); yEd's GML keeps its own label models
(`LabelGraphics`). Before, graphty-element drew such a label at its own default place, below the node
(`gml-specimen-labels` label.offset and label.anchor 0/4 against OGDF, now 4/4).

Open:

- yEd's `free` label model (`gml-specimen-labels-p3`, `free-30-30`, `free-20-10`, a label's model `free` with its
  `x` and `y`): not read. What yEd's GML `x` and `y` measure from (the label box's corner or its center, against the
  node's corner or its center) is not documented and cannot be read off a drawing here: yEd cannot be automated and
  the stand-in (gml2gv) draws every label centered. graph-io now has the property it needs (`labelOffsetX` /
  `labelOffsetY`, drawn by graphty-element); it waits for the owner's yEd export of the sheet.
- `gml-specimen-node-shapes-p5` (`type-hexagon`, and the width of `type-triangle`, `type-invtriangle`,
  `type-pentagon`): OGDF draws these regular, inside the ellipse of the node's box (a hexagon 31 of 36 px high);
  graphty-element stretches a polygon until its farthest corners reach the node's sides, so it draws them as large as
  the box (node.height 33/34, within 0.001 of the tolerance).
- `gml-specimen-edges-lines-p5`, `gml-specimen-arrows-p6` (every edge): Gephi draws a curved edge as a circular arc
  between its end nodes' outlines with the radius of the arc between their centers; graphty's curve is trimmed from
  the center-to-center curve, so with end nodes 12 px wide its route is 0.054 of the chord off Gephi's (the tolerance
  is 0.05). The GEXF sheets, whose end nodes are half as wide, pass.
- `gml-specimen-labels-p4` (`label-long`, label.offset 6/7): graphty wraps it as Cytoscape does now (below), but
  Cytoscape's SVG places each line where Java's DejaVu Sans metrics put it and names the face Helvetica, which the
  comparator measures in Liberation Sans (13 percent narrower), so the wrapped block reads 13 px left of the node's
  middle. A comparator gap for every Cytoscape desktop oracle (FreeHEP's Helvetica is Java's SansSerif): measuring
  such a text in DejaVu Sans would fix it; it touches every Cytoscape desktop sheet's floors, so it is left for the
  comparator's owner.
- Gephi reads a GML edge's `fill` and `label` (`gml-specimen-edges-lines-p5` `fill-ff0000`,
  `gml-specimen-edge-labels-p4`) but its Preview's defaults draw neither (MIXED edge colors, no edge labels), and
  graphty matches that.
- The gv2gml sheets show the same graphty-element gaps as the DOT sheets, for the same Graphviz values: the third
  outline of `tripleoctagon` (graphty draws one outer ring; noted as not carried) and the outlines of `insulator`, the
  synthetic-biology glyphs and `cylinder` (`gml-specimen-node-shapes-p7`: `promoter`, `terminator`, `utr`,
  `primersite`, `restrictionsite`, `fivepoverhang`, `threepoverhang`, `noverhang`, `assembly`, `signature`,
  `rnastab`, `ribosite`, `proteasesite`, `proteinstab`: graph-io reads them as `other:<name>` and graphty-element
  draws a 37 px ellipse or box where Graphviz draws a 7 to 19 px glyph; graphty-element's shape vocabulary, the
  DOT sheets' `node-shape-vocabulary` gap), and the `curve` / `icurve` arrows (`gml-specimen-arrows-p7` / `-p8`
  `target-arrow-curve`, `-lcurve`, `-rcurve`, `-icurve`, `-licurve`, `-ricurve`). FIXED (fix round 3, 2026-10-20):
  graph-io read `icurve` as `other:icurve`, which graphty-element draws nothing for, and both at a normal arrow's size;
  it now reads `curve` and `icurve` in Graphviz's dialect as `other:curve` / `other:inv-curve` with the arc's own
  size (arrows.c arrow_type_curve: radius half the arrow's length, `{ length: 0.5, aspect: 2 }` in the Graphviz tool
  defaults). The comparator read neither Graphviz's stroked stem nor its stroked arc in the edge's group: it now
  carries the line to the stem's tip and takes the arc as a hollow half circle (half an arrow for an `l` / `r` arc,
  as graphty's cap cut to one side). arrows-p7 and arrows-p8 edge.route 42/48 -> 48/48, edge.arrow and
  edge.arrowShape all pass (9 failing elements -> 0 on each).
  STILL OPEN (verified 2026-10-20): `icurve`, `licurve` and `ricurve` are drawn in the wrong place along the line.
  arrows.c draws the inverted arc with its ends half an arrow back from the tip and its apex a whole arrow back, the
  stem running through it to the node; graphty-element draws `other:inv-curve` as its `open-half-circle` cap, ends at
  the node and apex half an arrow back, so the arc sits half an arrow (about 5 px on these sheets) too close to the
  node (`graphty-element/tmp/oracle-report/gml-specimen-arrows-p7` and `-p8`, side by side). The comparator passes
  it because it measures an arrowhead's length, width, fill, shape and color but not how far back from the tip it
  sits. The fix is graphty-element's: a cap that is the inverted arc set back one arc depth with the line carried
  through it (an `arrowHead.gap` stops the line, so graph-io cannot express it), and a comparator check of a head's
  distance from its tip. A curved
  route's `lp` is not read yet: graphty-element hangs a curved edge's label where it samples its curve, which
  graph-io cannot know; every gv2gml sheet's edges are straight. A node's `pencolor`, which gv2gml also writes as
  `outline`, is a cluster's alone and Graphviz ignores it on a node; the sheets set a node's outline by its `color`,
  which is what Graphviz draws.
- FIXED (fix round 3, 2026-10-20, comparator): `gml-specimen-edges-lines-p4` (`loop`): OGDF draws a self-loop as a
  stroked polyline from its node's center through its bends and back (`M848.889,651 L828.889,616 ... L848.889,651`);
  the comparator read it as a closed triangle and took a ring with corners as no loop, so the loop was a stray and
  graphty's edge 15 an extra. A ring with corners drawn through a looped node's middle is now that node's loop:
  edge.extra and stray.present 1 -> 0, the sheet passes.
- GML corpus `gml-need4stacks261`, `gml-dunnart-autobahn`, `gml-jgrapht-grid-territorio` (edge.arrow): each file says
  `directed 1` and names no `arrow`; the stand-in (gml2gv | neato) draws Graphviz's default digraph arrowhead on every
  edge (need4stacks 776), graphty none. Neither the programs that wrote them (JGraphT has no drawing; Dunnart and
  need4stacks' tool cannot run here) nor yEd can draw them here, so what a GML reader should draw for a directed graph
  with no `arrow` key cannot be read off a real drawing; the rows judge the stand-in.
- The stand-in sheets (`node-shapes-p2`, `-p3`, `node-fills-borders-p2`, `node-sizes-opacity-p2`, `labels-p2`,
  `labels-p3`, `edges-lines`, `-p2`, `arrows-p2`, `-p3`, `edge-labels-p2`, `groups`): Cytoscape's GML reader and gml2gv
  paint their own defaults over the GML draft's, Tk's and yEd's keys (Cytoscape fills #89d0f5, labels a node by its id
  and draws 12 px labels; gml2gv draws every label at 14 pt, every fill as an outline, bold and italic as plain), so
  node.fill, node.stroke, label.present and label.size there judge the stand-in, not GML. yEd's license forbids
  automating it, so the yEd sheets wait for the owner's yEd exports; `edges-lines`, the one draft sheet left, waits
  for an OGDF that reads a Line holding only its end points (above). Their floors were lowered on 2026-10-19 with that
  reason where leaving the captions out made the rates the specimens' alone (`lowered` in `oracle-floors.json`).
- The draft sheets OGDF draws since 2026-10-20 (`node-shapes`, `node-fills-borders`, `node-sizes-opacity`, `labels`,
  `arrows`, `edge-labels`, `images-charts`): their stand-in floors, the stand-in's `lowered` entries and known
  failures were dropped with the stand-in oracles and recorded afresh against OGDF's drawing (a new oracle, not a
  lowered floor). What moved, stand-in to OGDF (floors, gml-specimen-*):
  label.present rose to 1 on every sheet (Cytoscape labeled each node by its id; OGDF draws the file's labels, and
  none for a node without one); node.width / height rose (0.5-0.79 to 0.89-1: OGDF draws `w` and `h` as written);
  `arrows` edge.arrow 0.933 -> 1, arrowLength and arrowToSpacing 0 -> 1; `edge-labels` edge.route and edge.curve
  0.667 -> 1, label.offLine 0 -> 1, label.family 0 -> 1. What fell is OGDF's reading, listed above, not graphty:
  node.shape (every draft `oval` drawn as a rectangle: `labels` 1 -> 0.4, `edge-labels` 1 -> 0.4, `node-shapes`
  0.385, `node-sizes-opacity` 0.375, `arrows` 0.286, `node-fills-borders` 0.143), node.stroke and node.strokeWidth on `node-fills-borders` (1 -> 0.536
  and 0.688: `width`, color names and Tk stipples), node.fill there (0.821 -> 0.786: color names and the 9- and
  12-digit hex drawn black), edge.width (0.8 / 0.667 -> 0: `width` not read), edge.arrowWidth and arrowColor on the
  default edge (OGDF's default arrow, which the draft does not draw), label.text on `labels` (1 -> 0.5: entities not
  decoded), label.size on `labels` and `edge-labels` (1 -> 0: OGDF's 10 px against graphty's default; the draft
  names no size) and
  `edge-labels` label.alongLine (1 -> 0.5: OGDF's label on the first segment of a bent edge).
  One finding for graph-io: OGDF and Cytoscape desktop (the old stand-in) both draw a draft node's label centered on
  the node, and graphty draws it above (graphty-element's default, since graph-io gives a draft file no label position):
  label.offset and label.anchor fail on `labels` (`label-text`, `label-entity`, `label-char-ref`, `label-long`).
  The draft names no label place, so this is left as an open question for the GML importer's draft defaults, not
  changed here. `background` fails on every draft sheet as it did against the stand-ins: the draft names no canvas
  color; OGDF's SVG has none (white), graphty draws its default #f5f5f5.
- Left failing after fix round 1 (2026-10-19), not caused by it: `gml-specimen-arrows-p2` / `-p3` (yEd arrows:
  edge.arrowLength 1/9, arrowFill, arrowToSpacing) and `-p4` (arrowShape 0.82, arrowColor) began failing after the
  comparator's arrowhead and line changes landed the same afternoon; small raster drops (0.01 to 0.03) on
  `arrows-p4`, `edges-lines`, `edges-lines-p3`, `node-shapes-p3`, `node-shapes-p6`, `edge-labels-p2` and the corpus
  samples, and label.alongLine on `gml-dunnart-autobahn` and `gml-synthetic-coverage`, appeared with them and are
  present with this round's comparator changes switched off.

Fixed in fix round 1 (2026-10-19):

- `gml-specimen-groups-p2`: OGDF's clusters (`rootcluster` after the graph block) were not imported (group.present
  0/10). Each cluster is now a group node `cluster<id>`, the parent of its `vertex` nodes and nested clusters, with
  its box (x and y its top-left corner), fill, outline (`color`, `lineWidth`) and label; drawSVG draws a cluster's
  outline solid whatever its `stipple`, kept as `clusterStipple`. The label is placed where SvgPrinter::drawCluster
  puts it: one font size below the box where more of the drawing lies below it (else above), starting at its left
  side where more of the drawing lies left of it (else ending at its right side). group.present, box, fill, stroke,
  label 10/10; label.offset and label.anchor 10/10.
- `gml-specimen-labels-p5` (`label-offset-n`, `-e`, `-s`, `-w`): OGDF's `graphics [ label [ x y ] ]` (the label's
  center from the node's, y down) is read into the new node style properties `labelOffsetX` / `labelOffsetY`, which
  graphty-element draws (`node.labelOffsetX` / `node.labelOffsetY`). label.offset and label.anchor 2/6 -> 6/6.
- The OGDF oracles were drawn with drawSVG's font set to DejaVu Sans, a setting no file carries; they are drawn again
  in OGDF's own default, Arial (label.family 0/6 -> 6/6 on `labels-p5`, 0/10 -> 10/10 on `groups-p2`), and
  `tools/rasterize.mjs` draws a family the pinned fonts lack in its fontconfig metric twin (Arial and Helvetica in
  Liberation Sans), as the browser reading the SVG does.
- `gml-specimen-labels-p4` (`label-long`): Cytoscape desktop's default label font is SansSerif, drawn by Java in
  DejaVu Sans, where the label measures 206 px and wraps at Cytoscape's 200 px label width; graph-io gave the
  browser's sans-serif (Liberation Sans, 180 px), so graphty drew one line. Cytoscape's defaults now name Java's face
  (label.lines 6/7 -> 7/7).
- `gml-specimen-labels-p2`: yEd's Java fonts (`fontName "Dialog"`, `SansSerif`, `Monospaced`) were passed through
  and drawn in the browser's serif default; they are read in Java's faces, as the yEd GraphML reader reads them, and
  written back as the logical font (label.family 35/38 -> 38/38). A yEd `#RRGGBBAA` label color's alpha is the
  label's opacity (it was dropped).
- Specimen ids by number (every GML sheet): the comparator named a GML caption by its `comment` on graphty's side
  only, so a caption the program drew as a node stayed in the oracle and was judged a node graphty does not draw
  (`labels-p2` paired 44 of 84 oracle nodes); and the corner anchors, which fix a sheet's frame, were never known by
  their number, so the frame was fitted on every node (`node-shapes-p7` failed its four anchors' positions). Captions
  and anchors are now named by their `comment` or `template` on both sides (`specimenRoleNames`, `namedCaptions`),
  and a caption's words the association hands to a tall specimen beside it are taken off it (`node-sizes-opacity-p4`
  `size-40x80`). OGDF's root cluster, a stroked 0 x 0 rect SVG does not draw, is no longer read as a stray.

Fixed in fix round 2 (2026-10-19):

- `gml-specimen-arrows-p7` / `-p8` (`obox`, `olbox`, `orbox`, `oinv`, `olinv`, `orinv`, `invempty`): gv2gml's open
  arrows the neutral vocabulary has no name for were read filled; they take the open values the DOT reader gives
  them (`other:open-square`, `other:open-inverted`), through one shared `graphvizArrowValue` (edge.arrowFill 7 per
  page -> 0).
- `gml-specimen-node-shapes-p6` (`type-doublecircle`, `type-doubleoctagon`, and `type-tripleoctagon`'s second
  outline): gv2gml's double outlines were not read. The ring Graphviz draws 4 points outside the first outline is
  read as `outerBorder*`, as the DOT reader reads it, and the node is sized by its inner outline (gv2gml's `w` and
  `H` are the outer size). A third outline is noted as not carried.
- `gml-specimen-edge-labels-p5`: gv2gml copies Graphviz's `lp` as a plain edge key; a straight edge's label is now
  moved there from the line's middle (labelPosition center, labelOffsetX / Y, y flipped). label.alongLine 0.34 ->
  passes.
- `gml-specimen-edge-labels-p3`: OGDF's drawSVG draws an edge label centered on its line, at the middle of the
  route's first segment (source center to first bend), not at the route's middle; both are read (OGDF's edge
  labelPosition default center, a bent edge's labelOffsetX / Y). label.alongLine 0.22 -> passes.
- `gml-specimen-arrows-p6` (`directed-0`): Gephi's GML importer never loads an edge whose `directed` disagrees with
  the graph's, so its drawing has none; the edge is kept with its data and read as not visible (edge.extra -> 0;
  the sheet passes).
- Specimen ids by number: the comparator names every node of a GML sheet by the setting id its `comment` (or OGDF's
  `template`) keeps (`specimenSettingNames`), so a failing row reads `type-promoter` or
  `target-arrow-curve-s->target-arrow-curve-t#0`, not a number that is another setting on each page. The sheets'
  rows of `oracle-known-failures.json` were renamed to match.

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

Fix round 4, edge routes (2026-10-22), against Graphviz 14.1.2's SVG:

- FIXED, graphty-element: a DOT file that places every node and stores no `pos` for its edges is drawn by Graphviz
  with `neato -n2`: the nodes stay and Graphviz routes each edge round the nodes in its way, by its `splines`
  (curved, ortho, polyline), into its compass and record-field ports. graphty kept the nodes and drew every such
  edge straight. A placed DOT file now loads with the fixed layout and `edgeRoutes: "graphviz"` (when the optional
  Graphviz package is installed), which hands Graphviz the placed nodes with their drawn size, shape and record
  label, and the edges' ports and arrows, and draws each edge along the route Graphviz lays; a route the file stores
  still wins. `edge.route` on `dot-specimen-edges-lines` 0.604 -> 0.925, `-p2` 0.778 -> 1, `-p3` 0.556 -> 0.778,
  `-p4` (curved) 0.333 -> 1 with `edge.curve` 0.333 -> 1 and its label on the line, `-p5` (ortho) 0.5 -> 0.9 (with
  the comparator fix below), `-p6`, `-p9` 0.889 -> 1, `-p8` 0.778 -> 1, `dot-specimen-arrows-p4` 0.25 -> 0.75.
- FIXED, comparator: an edge Graphviz draws as open paths laid end to end is one line: its colored segments
  (`red;0.2:green;0.3:blue`, one piece per color) and an orthogonal route with rounded corners (`radius=8`, its runs
  and corners drawn apart). The comparator read the longest piece as the whole edge (`color-segments-3`
  `edge.color` blue and `edge.route` a third of the line; `radius` one straight run). It now joins the pieces into
  one line, painted through the colors with a hard switch at each joint where they differ, and reads graphty's
  gradient as the flat pieces it draws rather than blending neighbours at each switch: `color-segments` and
  `color-segments-3` pass `edge.color`, `edge.route` and `edge.gradient`; `-p5` `radius` passes `edge.route` and
  `edge.curve`.
- FIXED, comparator: a line that crosses its end node to a port on the outline (`headport=n`, `ne`, `s`) and ends a
  hair inside or outside it, or pokes a hair past a corner and back, is cut where it enters the node, as the
  program's line is.
- OPEN: `splines=polyline` parallels (`dot-specimen-edges-lines-p3` `parallel`): the Graphviz graphty-element runs
  (16.1.0, WebAssembly) draws the two edges straight on one another at pinned positions where 14.1.2 fans them; a
  Graphviz version difference. Self-loops keep graphty's loop (`-p5` `loop`, `loop-port`): Graphviz's loop route is
  not read back. HTML-like ports (`headport-html-port`, `-table-port`) need the HTML table, which graphty draws at
  the wrong size. Tapered edges (`style-tapered*`) are drawn by Graphviz as a filled polygon the comparator does not
  read as an edge (`edge.extra`, `stray.present`). A stored `pos` with an `e,x,y` arrow point (`pos-arrow-endpoint`)
  is the open row above.

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
  graphty's cap fails `edge.arrow` (oracle false, graphty true). Comparator work. Fix round 3: the comparator takes a
  stroked half circle across a line's middle as its hollow middle arrow, so vis-network's `arrow-middle-curve` and
  `arrow-middle-inv-curve` pass.
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
  / `triangle-cross` are shape class "other" on the oracle side; an edge overlay reads as a second edge, a node
  underlay or overlay as strays. Fixed in fix round 3: the large middle arrow of `scale-factor-middle` (vis-network,
  `scaleFactor` 2 on a short edge; its point at the line's middle, its base by the source) is the middle arrow, and
  vis-network's dashed background under a curved edge (`background-curved-dashes`) is that edge's outline; the
  vis-network arrows sheet passes every row.
- Cytoscape desktop's arrows sheets (`{xgmml,cx,cx2,cys}-specimen-arrows`, `-mappings-bypass-p11`): 18 of 43 edges
  are still not associated with the oracle's paths (`comparator-edge-association`), so their caps are unjudged.
- vis-network's dashed background (`background.dashes`): fixed in fix round 3 (`outlineStyle`, `line.outline.type`).
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

Fixed (2026-10-19, fix round 2):

- `specimen-labels` `label-small-node`, `attr-forcelabel` (label shown 0.895 -> 1): sigma.js's renderLabels skips a
  node whose rendered size, a radius, is under `labelRenderedSizeThreshold` (6 px), and sigma 4 forces a label only
  by `labelVisibility: "visible"`, which a Gephi column named `forceLabel` is not. graphty-element now hides a node
  label by its node's drawn size on screen (channel `node.labelMinNodeScreenSize`, label field
  `minNodeScreenSize`, decided again as the camera moves), and graph-io gives sigma's files
  `labelMinNodeScreenSize` 12 (the 6 px radius across).
- `edges-lines`, `edge-labels`, `json-gephi-worldcup` edge width (5/29 -> 29/29, 0/13 -> 13/13; edge present
  29/30 -> 30/30, `edge-size-0`): sigma's edge program draws an edge `max(size, minEdgeThickness 1.7)` wide in
  screen pixels, halved, so never under 0.85 px, whatever the framing makes of a size. graphty-element now has an
  edge minimum screen width (channel `edge.minScreenWidth`, style `line.minScreenWidth`, in the line shader, so it
  holds at every zoom; a line of width 0 with a floor is drawn at the floor), and graph-io gives sigma's files
  `minScreenWidth` 0.85. On worldcup the raster scores rise with it (edge 0.79 -> 0.93, node outline 0.79 -> 0.93,
  node body 0.92 -> 0.97, label 0.81 -> 0.84, canvas 0.93 -> 0.98) and label shown 603/736 -> 719/736.
- `specimen-node-sizes-opacity` `size-0` (node width and height 21/22 -> 22/22): sigma draws nothing and graphty a
  0.014 px node. The comparator now judges two sizes both under a quarter pixel alike (`sizeMiss` in
  `compare-oracle.ts`: neither covers a pixel's center), and still fails a drawn node against an undrawn one.

Still open:

- `json-gephi-worldcup` framing: graphty frames worldcup 1.109x smaller than sigma.js (sigma fits the node
  positions into the canvas less a 30 px `stagePadding`; graphty's fit leaves more room). Both rules above are in
  screen pixels, as sigma draws them, so the framing shows: edge width 0/9,228 (graphty's 0.85 px lines are
  judged at the fit's scale, 0.943 against 0.85, just past the 1.1 ratio), and 8 labels sigma shows on nodes
  12.22 px across that graphty draws 11.02 px across and so hides (218, 342, 366, 404, 422, 432, 44, 54; recorded
  as known failures with this cause). The edge widths now pass (9,228/9,228); the 8 labels wait for
  graphty to frame a sigma file as sigma does (the positions and program view settings work).
- Fixed (fix round 3, 2026-10-20): sigma's 100 px label grid, which hid 9 labels graphty showed on worldcup. sigma
  files each label in a 100 px cell of its first framing (its positions fitted to the canvas, `stagePadding` 30) and
  draws only the cell's largest node's label (then the lesser key), more as the view zooms in. graph-io now gives
  sigma's files `labelGridCellSize` 100 in place of `labelAvoidOverlap` (sigma avoids no overlap), and graphty-element
  lays the grid on that framing of the canvas it draws on, not on its own camera, so graphty's own framing no longer
  matters: the label ranked r in its cell gets a `node.labelMinNodeScreenSize` of sqrt(r) times its node's size at
  sigma's framing, so it shows where sigma shows it as the view zooms in. The grid reproduces sigma's record exactly
  on worldcup (736/736), lesmis (77/77) and the Gephi JSON sheets.
  Worldcup label shown 719/736 -> 728/736, raster label 0.84 -> 0.85.
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

Fixed (2026-10-19, fix round 2):

- `edge-labels-p2`, `-p3` (edge label now 5/5 and 6/6; graphty drew none): sigma draws edge labels only under its
  `renderEdgeLabels` setting, and under `edgeLabelAnchors` "nodeLabels" (the default) only between two nodes that
  show their labels. Both are the application's settings, never in the file: graph-io's JSON importer takes them as
  the `sigmaSettings` option (graphty-element's JSON reader passes `sigmaSettings` through), and draws an edge's
  `label` in sigma's edge label look (#666, 12 px, on the line's middle). The oracle record listed every edge's label
  whenever `renderEdgeLabels` was on, so `edge-label-unlabeled-ends` ("Bare ends") read as drawn on page 2, where
  sigma's PNG has none: the oracle tool now records `getEdgeDisplayedLabels()`, and page 2 was regenerated (its
  PNG and SVG unchanged).
- Thin edges and `edge-size-0` (edge width now 27/27 on edges-lines, 8/8 on arrows, arrows-p2 and the three
  edge-labels pages, 14/14 on edges-lines-p2; edge present 27/27): the screen-pixel edge floor
  (`minScreenWidth` 0.85, see Gephi JSON).
- `labels` `label-size-below-threshold`, `force-label-small`: sigma's `labelRenderedSizeThreshold`
  (`labelMinNodeScreenSize` 12, see Gephi JSON); label shown now 19/20.
- `node-sizes-opacity` `size-0`, `size-negative` (node width and height now 24/24): two sizes under a quarter
  pixel are judged alike (see Gephi JSON).
- Comparator: a line drawn at its screen floor was judged through the frame's length scale, so where graphty frames a
  sigma file smaller than sigma (lesmis 1.137x, worldcup 1.109x) its 0.85 px lines read as 0.97 px and failed:
  json-sigma-lesmis edge width 254/254 -> 157/254 when the floor landed, json-gephi-worldcup 0/9,228. The drawn
  record now marks a line whose thickness is its screen floor, and the comparator judges it as drawn, as it already
  judges a screen-pixel node border: lesmis 254/254, worldcup 9,228/9,228.

Still open:

- json-graphology-synth edge route 138/180: the 42 that fail run between nodes that overlap (centers 93 px apart,
  radii up to 93 px), so almost nothing of the route lies outside its nodes on either side and the route is judged on
  a few pixels or none. A comparator limit, not a drawing difference seen by eye.
- Fixed (fix round 3, 2026-10-20): `labels` `label-grid-smaller` (label shown 19/20 -> 20/20), json-sigma-lesmis
  54/77 -> 77/77, json-graphology-synth 77/89 -> 89/89: sigma's label grid is mapped (see Gephi JSON).
- `edge-labels-p2`, `-p3` `edge-label-long` ("A longer edge label"): sigma 4.0.1 draws an edge label only along the
  edge's body between its two node discs, and softly truncates the rest: glyphs fade out over the last 15 px before
  either disc (`FADE_WIDTH_PIXELS`, `v_edgeFade` in its edge label shader), and the whole label fades or is hidden
  when the body is shorter than the text (`computeEdgeLabelAlpha`, its min and full visibility ratios). Its PNG
  shows "A" and "el" faded to almost nothing; graphty draws the whole label, over the source node's disc. Not judged:
  the comparator reads the label's text from sigma's record (`getEdgeDisplayedLabels()` lists a label whatever alpha
  the shader gives it), not the glyphs drawn, so edge label passes. graphty-element has no way to clip or fade an
  edge label to the edge's visible body; it waits for that option in graphty-element (then graph-io sets it for
  sigma), and the oracle record should then carry each label's visible span.
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
- `stray.extra` on stm32-func (15), synthetic-nodes (2) and `images-charts` (5): pictures graphty draws on
  `y:ImageNode` and `y:SVGNode` nodes, for most of which draw.io draws an empty box. Two of them are not that, and the
  floor of 0 must not be read as accepting them:
    - synthetic-nodes `image-node` ("image icon"): its `y:Resource` PNG is corrupt (the IDAT chunk's CRC and its zlib
      checksum are both wrong), so no program can draw the picture. graphty draws a solid black square in its place:
      graphty-element draws a picture that fails to decode as black instead of leaving it out. That is an extra
      element, open in graphty-element.
    - synthetic-nodes `svg-node` ("svg icon"): draw.io draws this picture too, as an `<image>`, yet it is counted as an
      extra. Why the comparator does not pair the two is open.
      Not a stray but related: `images-charts` `default` ("ImageNode=nothing set") has no `y:Image` and no `y:Fill`, and
      graphty fills it with yEd's default ShapeNode fill (#FFCC00). Whether yEd paints an ImageNode's fill at all is the
      open question in `readPicture` (styles-yed.ts); a drawing by yEd decides it.
- Raster regions fall by 0.01 to 0.04 (labels drawn in Dialog's sans-serif face with their boxes, where draw.io draws
  its own face and no box).

Not import defects (no change):

- Label lines: the 73 labels drawn on two lines that the stand-in draws on one each have a newline in their text and
  a stored label box two or more lines tall (box height over font size 2.3 to 2.8: cla-checker "CLINNEG\nOUTOFSCOPE",
  stm32-func, voctomix, magiclantern "exec\r\nautoexec.bin", galaxy-lcms "HTML\nreport"), so yEd drew two lines.
  draw.io's HTML labels draw a newline as a space.
- Node label models. Three causes, none of them graph-io's reading of the model:
    - Resolved (fix round 2): graphty-element drew at most `labelLayers` (8) distinct label positions per file and
      the rest at the most common one. A file's label positions are now drawn element by element through
      `node.labelLocation` in one layer, with no cap and no default changed (`labelLayers` is deprecated and
      ignored), so `model-corners-ne` and `model-eight-pos-ne` are drawn at the top right.
    - Resolved (fix round 2): yEd sets an outside label its model's distance (4 px by default) from the node, and
      graphty drew it against the node (`se`, `sw`: [29, 22] against [35, 30]). graph-io now reads the distance,
      and a free label's offset, from the label's stored box as `labelOffsetX` / `labelOffsetY` (see "yEd GraphML
      settings graph-io now reads (fix round 2)").
    - The rest of the anchor rows (an internal `c` label the stand-in puts at the node's bottom, smart labels it puts
      at the left): draw.io ignores `SmartNodeLabelModel` and the internal model; yEd's stored label boxes put these
      labels where graphty draws them.
- Edge label models, arrow shapes and fill alpha (`#RRGGBBAA`): the stand-in cannot judge them (above); they wait for
  the owner's yEd export.

## Specimen sheets: yEd GraphML settings graph-io now reads (fix round 2, 2026-10-19)

Judged against the draw.io stand-ins, on the `yed-graphml-specimen-*` sheets and the `graphml-*` corpus samples.
Fixed (unit tests in `graph-io/test/formats/graphml/styles.test.ts`):

- Outside label distance and free label offsets. yEd writes every label's box as it draws it, relative to the node's
  top-left corner. A label beside the node (`sides`, `sandwich`, `corners`, `eight_pos`) is now moved by the gap
  between the node and its box (yEd's 4-point default distance), and along the side by how far its box's middle is
  from the node's; a `free` or custom (smart) label over the node by its box's middle on both axes. Read as
  `labelOffsetX` / `labelOffsetY`, which graphty-element already draws. A turned label is left where its position
  puts it (its stored box is not its words' box). Label offset: `labels-p2` 12/33 to 24/33,
  voctomix 21/32 to 32/32, stm32-func 28/106 to 101/106 (anchor 26 to 90), galaxy-lcms-workflow 7/33 to 11/33,
  libcitygml-mapping 44/51 to 45/51. Where graphty now draws a label where yEd's box puts it and draw.io does not
  (recorded with this reason, row `yed-label-box-stand-in`): libcitygml-mapping's raster label and node body
  regions 0.65 to 0.64 and 0.57 to 0.56 (its class names are stored 1.4 above their nodes' middles, which draw.io
  centers, `allowedDrops`); `labels-p2` raster label region 0.862 to 0.840 (draw.io puts `sides-w` 4.6 lower and
  the side and corner labels further out, `allowedDrops`); galaxy-lcms-workflow `n0::n8` label offset (its two-line
  "HTML\nreport" box is 4 below the node, and draw.io draws it on one line, half a line higher); stm32-func `n78`
  label anchor (a smart label stored 9 above the node's middle, which draw.io centers: it ignores
  `SmartNodeLabelModel`).
- Label rotation. A `y:NodeLabel` / `y:EdgeLabel` `rotationAngle` is read as `labelRotation`. yEd is a Java2D program,
  whose angles turn clockwise on screen, as the neutral slot does (and as the stand-in draws them). Label rotation: `labels` 40/44 to 44/44,
  `edge-labels` 39/41 to 41/41, stm32-func 99/106 to 106/106, synthetic-nodes 68/69 to 69/69.

Not fixed, and why:

- Table nodes and BPMN pools (`groups`, `groups-p2`: `table-*`, `bpmn-pool-*`). PARTLY FIXED (fix round 3,
  2026-10-20): graph-io reads a `y:TableNode` as bands over the node (the neutral `stripe*` slots graphty-element
  already draws): the table's header inset (`y:Table/y:Insets` top, or left for columns side by side) in
  `yed.table.header.color.main`, then each `y:Row` top to bottom (or `y:Column` left to right) at its own height in
  `yed.table.lane.color.main` and `.alternating` by turns, then the opposite inset. A color the table leaves unset
  is the node's `y:Fill` color (one lane color unset is the other). So a 90-tall pool now draws as a 30 header and
  two 30 lanes in the file's colors, where it drew one gradient box. Even against the stand-in, the node body
  raster score rose 0.81 to 0.94 (`groups`) and 0.75 to 0.93 (`groups-p2`); the bands are new graphty shapes the
  stand-in has nothing under (`stray.extra` 0 and 0.061, floored). Still open: the lines between lanes and around
  the header (`yed.table.section.color`; graphty-element has no band divider), row and column headers
  (`yed.table.header.color.alternating`, row and column `y:Insets`), a table with both several rows and several
  columns (bands run one way only; its rows are drawn), `yed.table.lane.style` (which of rows or columns take the
  lane colors; graph-io always colors the rows unless the columns sit side by side), `yed.table.header.height`, the
  lane labels (`table-row-label`, `table-column-label`: a second `y:NodeLabel` in a `y:RowNodeLabelModel` or
  `y:ColumnNodeLabelModel`, which graph-io drops with an `EXTRA_LABELS` note because a node carries one label, so
  graphty draws no "Lane" text), and yEd's own defaults for an unset color, which are not
  documented. None of this can be judged here: draw.io draws its own table (63 tall lanes in `#C0C0C0` with black
  lines and the header label above them), so the stand-in's `node.stroke` and height rows keep failing until the
  owner's yEd export of `groups` and `groups-p2` replaces it.
- Group containers on the stand-in (`groups`: `group.extra` on 9 group specimens), arrows, edge label models, fill
  alpha and default fills (`arrows`, `edge-labels`, `edges-lines`, `node-sizes-opacity`, `labels`), and the
  `graphml-*` corpus samples (draw.io's own arrows, newlines drawn as spaces): draw.io's drawings, not yEd's (see
  "Specimen sheets: yEd GraphML and yEd Live GraphML" above). yEd's license forbids automating it, so these oracles
  stay stand-ins until the owner exports each sheet from yEd by hand (File > Export > SVG).

## Specimen sheets: one-sided caps, crossed deltas, label places, loops and captions (fix round 2, rendering batch 1, 2026-10-19)

graphty-element now draws, as style options with channels, and graph-io maps the files onto them:

- One side of any cap, cut along its line (`arrowHead.side` / `arrowTail.side`, channels `edge.arrowHeadSide` and
  so on; graph-io `targetArrowSide` / `sourceArrowSide`): Graphviz's `l` and `r` modifiers (`lcrow`, `rdiamond`,
  `lvee`, `oldiamond`, ...) on `dot-specimen-arrows`, `-arrows-p2` and gv2gml's `gml-specimen-arrows-p7`, `-p8`
  now draw the half Graphviz keeps; their `edge.arrowShape` rows pass. `rnormal` used to be drawn on the left too.
- Cytoscape's CROSS_DELTA and CROSS_OPEN_DELTA (caps `cross-delta`, `open-cross-delta`; graph-io
  `other:cross-delta`, `other:cross-open-delta`, CX2's `triangle-cross` included), at 1.5 times a delta, the line
  running through the bar: `cx2-specimen-arrows` arrowLength and arrowWidth pass. Their `edge.arrowShape` rows
  still fail because the oracle side reads a delta with a separate bar as class "other", which matches nothing
  (comparator work, as Cytoscape.js `circle-triangle` above).
- Every label place a file sets (`node.labelLocation` / `edge.labelLocation`): the 9 inside labels of
  `cytoscapejs-specimen-labels` and yEd's `model-corners-ne`, `model-eight-pos-ne` pass.
- An end caption's face, color, weight and opacity (`edge.arrowHeadTextFont`, `-TextColor`, `-TextWeight`,
  `-TextOpacity` and the tail's), taken from the edge's label: `cytoscapejs-specimen-edge-labels` `label.family`
  passes for every end label.
- graph-io lays the loops of Graphviz (neato's `selfRight`) and Gephi (its self-loop circle) as bends:
  `dot-specimen-edges-lines` `loop` and `loop-2` pass; Gephi's loop route passes on the GEXF sheets.
- Graphviz polygons at the size Graphviz draws them (a distortion or skew reaching past the box is kept):
  `dot-specimen-node-shapes-p2` `distortion-1` and `skew-1` widths pass.
- yEd labels inside a node keep the inset of their stored box (`labelOffsetX` / `-Y`).

Still open, and why:

- `cytoscapejs-specimen-labels`: the six mixed alignments (one axis outside, the other inside: `top-inside` with
  `left`, `bottom` with `left-inside`, ...) have no neutral position; graph-io notes them and draws the nearest.
  They need `labelPosition: center` with offsets and shifts from the node's size (graph-io, `label-anchor-offset`).
- `yed-graphml-specimen-labels-p2` `model-internal-b`, `-tr`, `-tl` and `yed-graphml-specimen-groups` table labels:
  graphty now draws them where yEd's stored boxes put them (its 4-point insets); the draw.io stand-in draws them
  elsewhere. Stand-in limit, until the owner's yEd export.
- `dot-specimen-node-shapes-p2` `distortion-*`, `skew-*` `node.shape`: the oracle reads Graphviz's trapezium and
  parallelogram as "rect", graphty's corners give "other" (comparator).
- Cytoscape.js `outline-style: dashed`: Cytoscape.js dashes an outline [4, 2] pixels whatever its width, graphty
  dashes 3 and 2 widths; it needs a dash pattern of its own (the import work's `dash-pattern`).
- Cytoscape.js `loop-direction` / `loop-sweep`, vis-network `selfReference` (angle, `renderBehindTheNode`), Pajek
  loops, Graphviz loops with ports or `splines=ortho`: graphty draws graph-io's bends or its own loop; the programs'
  loop geometries are not laid yet. Gephi's loop curve still fails (`edge.curve` 0.44 against 0.65): graphty
  clips the loop at its node's border, which reaches past the half size the bends are measured in; and
  `gexf-graphology-rio`'s loops draw graphty's own loop, the bends not reaching them (not found yet).
- Cytoscape.js end-label rotation (`source-text-rotation`, `target-text-rotation`), `*-text-margin-*` and
  `text-justification` on edge labels: graph-io does not read the rotations and margins of end labels yet, and
  graphty-element's captions have no rotation or shift of their own.

## Specimen sheets: partly placed files, Pajek sources, Graphviz stripes and wedges (fix round 2, rendering batch 3, 2026-10-19)

Fixed:

- A file that places some nodes and not others, with no edges (`gexf-specimen-node-sizes-opacity` and its pages,
  `position-none`): graphty-element kept the file's positions only when the advised layout could hold nodes still,
  and a graph with no edges is advised a ring, which cannot, so one unplaced node sent the whole sheet round a
  circle (`frame.rotation` 160, every size and position failing). The import now lays out only the unplaced nodes
  with the default force layout whenever the advised one cannot hold the placed nodes still
  (`GraphSession` layout advice; `test/browser/file-positions.test.ts`). `gexf-specimen-node-sizes-opacity`: 23
  failing elements to 0; `-p2`: 25 to 6 (the three `alpha-*` widths, Gephi's own size rule).
- Pajek's source vertices drawn blank (`pajek-specimen-edge-labels`, `-p2`, every `*-s` vertex): graph-io's planner
  explained the fill, border and size of every vertex by its in-degree (caption vertices 0, line ends 1), counted
  on graph-io's snapshot, where a `*Edges` line of a file with `*Arcs` is stored as two directed rows and so gives
  its source an in-degree of 1. graphty-element keeps one row per line and counts 0 there, so the sources took the
  captions' white, borderless, 0.2-wide style. graph-io no longer offers a degree as an explanation when an
  undirected edge is stored as a directed pair (`styles/plan/features.ts`, `test/styles/plan.test.ts`); the
  vertices' styles come from their own columns. Every `node.*` row of both pages passes (56 vertices).
- Graphviz `striped` and `wedged` (`dot-specimen-images-charts`): graphty-element drew the bands and slices in
  Graphviz's order and sizes; the comparator read the oracle's node fill from its largest piece's box, which for
  equal stripes is decided by rounding and for a wedge is the wedge's bounding box, not its area. A node filled in
  pieces (two or more fills, none covering their union) is now read by its first piece, the first color of the list
  (`oracle/associate.ts`, `compare-oracle-labels.test.ts`). graph-io now gives what sized colors leave to the last
  color, as Graphviz's `parseSegs` does (`wedged-partial` `red;0.3:green;0.3` is red 0.3, green 0.7; it drew a third
  of the pie empty), and reads `style="striped,rounded"` with square corners, as Graphviz draws it.

Still open, and why:

- `dot-specimen-images-charts` `wedged-partial` `node.fill`: the oracle's green piece covers the whole box (0.7 of
  the pie), so it is read as the node's fill, while graphty reports the node's own fill (the list's first color,
  under the pie). The drawing matches; the comparator reads a pie's fill differently on its two sides.
- Cytoscape desktop's bar, line, box and heat strip charts (`{xgmml,cx,cx2,cys}-specimen-images-charts`, `-p2`,
  `-p5`, `-p6`): graph-io reads only pie and ring charts and graphty-element has no chart of bars, lines or boxes
  on a node's face (JFreeChart's layout: axes, margins, item labels). The face drawing in graphty-element
  (`meshes/NodeDecorationMesh.ts` already draws colored polygon pieces) and graph-io's chart reader are both
  needed; not started in this batch.
- Gephi's `edge.radius` preview setting (`gexf-specimen-arrows-p4`, every curved edge: `edge.curve` 0.148 against
  0.102, `edge.route` 0.185): Gephi stops each edge that many pixels short of its nodes, which trims the arc to its
  flatter middle. graphty-element has no option for a gap between a node and its line's end (Cytoscape.js's
  `source-distance-from-node` / `target-distance-from-node` need the same), and graph-io does not read the setting.
- Gephi's curved edges between large nodes (`gexf-miserables`, 103 routes): `62.0->59.0` curves 0.125 in graphty
  against 0.059; graphty's drawn arc starts farther from the node than its outline. The mechanism (where
  `Edge.placeRoute` trims the arc's 7.5-degree pieces at the outline) is not isolated yet.
- yEd arc, quad curve, bezier and spline edges (`yed-graphml-specimen-edges-lines`, `edge-bend-curve`): graphty's
  curve through the control points bows deeper (`spline` 0.347 against 0.199). Not worked in this batch.
- Graphviz edge routing and the layout of DOT files without positions: needs Graphviz's own layouts, which are not
  merged into this branch (`feat/graphviz-layouts`).

## Specimen sheets: Cytoscape desktop's wave and arrow line types, transparent inside borders, Pajek gradients (fix round 2, rendering batch 4, 2026-10-19)

Fixed:

- Sine-wave and zigzag edges and borders (`{xgmml,cx,cx2,cys}-specimen-edges-lines`, `-node-fills-borders`,
  `-mappings-bypass-p3`, `-p10`): graphty-element drew its own wave, a thin line swinging within the line's width
  every 0.75 scene units. Cytoscape desktop's strokes (`ding-presentation-impl` 3.10.5, read from the jar's classes)
  swing 10 px and repeat every 20 px whatever the width: `SineWaveStroke` lays one rigid period (two quadratic arcs
  through control points `10 + width` off the path, a band `width` apart where it meets the path) centered every 20 px
  along the path, so round a small node its periods loop out past it; `ZigzagStroke` turns 10 px to either side every
  10 px from 5 px on and strokes that line `width` thick with Java2D's miters and square caps, ending at its last
  turn. graphty-element now draws both from new style options `line.waveAmplitude`, `line.wavePeriod`,
  `border.waveAmplitude` and `border.wavePeriod` (channels `edge.waveAmplitude`, `edge.wavePeriod`,
  `node.borderWaveAmplitude`, `node.borderWavePeriod`; unset, the wave is drawn within the width as before), a waved
  edge starting at its node's outline as Cytoscape's does. graph-io gives every Cytoscape desktop format the 10 and
  20 px as tool defaults (`waveAmplitude`, `wavePeriod`, `borderWaveAmplitude`, `borderWavePeriod`) and the Cytoscape
  writers treat them as fixed, as `borderPosition`.
- Contiguous-arrow borders (same sheets, `CONTIGUOUS_ARROW`): graphty-element drew a solid ring. It now draws
  Cytoscape's `ContiguousArrowStroke`: a bar three border widths long with a chevron two widths to either side, one
  every three widths round the ring (`border.style` `contiguous-arrow`).
- A transparent border inside the node (`-node-sizes-opacity`, `-mappings-bypass-p4`, `NODE_BORDER_TRANSPARENCY` 0
  width 6): graphty-element filled the whole size under a border it did not draw. Cytoscape fills out to the middle
  of the stroke it would draw (the fill path is the size less the border's width); graphty-element now does, for a
  border of opacity 0 inside the size (`NodeMesh.borderFit`).
- The comparator misread three of Cytoscape's border outlines, each shown by `oracle/cytoscape-painted-borders.test.ts`
  on the path data of the export itself: a sine-wave border drawn a whole period a piece was read as arrows (a
  period lies off its own mirror image by more than its thickness, not twice it); a chain of contiguous arrows,
  whose chevrons leave a hole a third as wide as their reach, was read as no ring at all (a stray); and a zigzag
  ring stroked by Java2D, whose inner corners pass through the corner itself and whose sharp turns overlap, was read
  3.3 wide for a stroke of 4 (its width is now the distance its two outlines most often keep). graphty's own wave
  border is judged by the thickness of its line (`PStroke.line`), its ring kept for the node's size.
- Pajek's Lines as Gradient between two vertices of one color (`pajek-specimen-edges-lines-p5`, `52->53#1`): the
  comparator judged the direction of a gradient that does not change color; a ramp of one color is no longer judged
  by its direction.

Still open, and why:

- `{xgmml,cx,cx2,cys}-specimen-edges-lines` and `-mappings-bypass-p10` keep four failing edges each: the haystack and
  curved-false parallel edges (`haystack-edges`, `parallel-edge-spread`, graph-io's), and on `cx` one unbundled
  bezier (`edge-curve-styles`).
- The `syn-mappings` samples now find the arrowheads of two waved edges they missed (`378->390`, `447->465`), whose
  shapes and sizes then fail as every other Cytoscape arrowhead of those samples does (`arrow-shape-mapping`).
- The `stray.present` floors of the Cytoscape specimen sheets are no longer judged in this worktree with or without
  this batch's changes (no unassociated oracle shape is left); the floors are kept for whoever finds which change took
  the strays away.

## Specimen sheets: CX settings graph-io now reads, and the CX rows still open (fix round 2, 2026-10-19)

Measured with the oracle report on every `cx-` sample after rebuilding graph-io (34 of 51 still fail the verdict).

Fixed:

- Passthrough `NODE_LABEL_FONT_FACE` (`cx-specimen-mappings-bypass-p19`, `passthrough-font-face`, `Serif,bold,12`):
  graphty drew it bold, Cytoscape plain. Cytoscape 3.10.5 takes a face's bold from a `.bold` suffix on the name only
  and never reads the style word after it (`FontVisualProperty.parseSerializableString`, its regexes
  `(\.[bB]old)?,[a-zA-Z]+,\d+(\.\d+)?` and `(?i).*\.bold,[a-zA-Z]+,.*`, read from the 3.10.5 api-bundle). graph-io
  now reads the face the same way for every Cytoscape desktop format, and the Cytoscape writer puts bold and italic
  on the name as a Java face suffix (`SansSerif.bold,bold,12`) as desktop itself writes them. NDEx files written by
  other tools (`cx2js/UD-294.cx`, `Dialog,bold,12`) are now drawn plain, as Cytoscape draws them. The sheet passes.
  Test: `graph-io/test/formats/cx/fix-round-2.test.ts`.
- `ARROW` caps, `HAYSTACK` edges and curved-false parallel edges: fixed for all four Cytoscape desktop formats by the
  XGMML round (`bbdf7ce71`); `cx-specimen-arrows` and `-edges-lines` no longer fail on them.
- Label background size: graphty's box now measures 27.2 x 11.73 against Cytoscape's 27.2 x 11.74 (`labels`,
  `edge-labels`, `mappings-bypass-p6`, `-p13`); only the ROUND_RECTANGLE shape still fails there (the corner radius is
  an eighth of the box's height in Cytoscape's SVG, 1.455 of 11.64; a label corner radius slot is being added by the
  sibling round for all Cytoscape formats).
- `OPEN_HALF_CIRCLE` is now read as a cap on both sides (`edge.arrow` passes); `T`, `CIRCLE`, `HALF_*` routes pass.

Still open, and why:

- `parallel-2` (`cx-specimen-mappings-bypass-p10`, and `edges-lines` of XGMML, CX2 and sessions): Cytoscape bows the
  one fanned edge of a two-edge bundle to opposite sides in files whose node and edge order is identical
  (`cx-specimen-edges-lines` up, `cx-specimen-mappings-bypass-p10` down, both written with the `-t` node before the
  `-s` node and the edges in the same order). Nothing in the file decides the side, so no import rule can match both;
  walking the fan back from the newest (straight) edge fixed `edges-lines` and broke the other six sheets, and was
  not kept. Left to the comparator (accept either side for a lone fanned edge whose side the file cannot decide) or
  to a regenerated oracle. Resolved in CX fix round 3 (below): the side is decided by the ids, through the hash order
  Cytoscape's CX reader creates the elements in.
- `OPEN_HALF_CIRCLE` route (`arrows`, `mappings-bypass-p11`): graphty's scene line ends at the arc's open side (124.4)
  while both drawings stop the line at the arc's back (118.6); being fixed in `drawn-primitives.ts` by the sibling
  comparator round.
- `CROSS_DELTA`, `CROSS_OPEN_DELTA` (`arrowShape`, graphty-element-render): unchanged.
- Chart labels (`images-charts-p5`, `-p7`, `mappings-bypass-p18`): not fixed. Pie item labels need a neutral slot
  (`cy_itemLabels`, `cy_itemLabelsColumn`, `cy_itemLabelFontSize`, drawn by Cytoscape in Tahoma `#404040` inside each
  slice) and graphty-element to draw text on a pie, which it cannot (pies are flat geometry, `nodeDecoration.ts`).
  The bar, line, heat map and box chart labels (domain and range axis labels, `cy_domainLabelPosition`,
  `cy_axisLabelFontSize`) cannot be judged before graphty-element draws those charts at all (`node-custom-graphics`).
- Pie and ring slices judged as annotations (`images-charts` `stray.extra`, 2 of 12): a graphty slice is scored by its
  box against the oracle's unassociated shapes; on `ring-hole-0-7` the oracle's blue slice is drawn (`#1f77b4` path at
  the node) but is not among the oracle's strays (the association took it into another element), so graphty's
  matching slice is reported extra. Comparator (`annotation-scoring`).
- `cx-polygenic-sle` (93 `edge.arrow`, 98 `stray.present`): the style has no arrows. The oracle's "arrows" and strays
  are the stringApp enhancedGraphics label every node carries (`NODE_CUSTOMGRAPHICS_3` passthrough of
  `stringdb::enhancedLabel Passthrough`, `label: attribute="display name" labelsize=12 labelAlignment=left
outline=true outlineColor=white outlineTransparency=95 outlineWidth=10`, placed NE by
  `NODE_CUSTOMGRAPHICS_POSITION_3`): Cytoscape draws a second label per node as glyph paths with a white halo, which
  the comparator reads as caps where it crosses an edge's end. graph-io does not read enhancedGraphics labels and
  graphty-element has no second node label to draw it with (graph-io-import and graphty-element-render, not
  comparator).
- `cx-syn-mappings`, `cx-syn-bypass` patterned edges: 141 and 22 `edge.arrow` failures, all `o=false g=true` on edges
  whose oracle line is slashes (41), arrows (30), dashed (17), double (16), dash-dot, zigzag, dotted or sine: the
  oracle reader does not find the caps at the end of a line drawn in pieces (`comparator-edge-association`).
- `cx-ndex-90f78bcd` node `304542`: Cytoscape shows two lines ("Various" / "neuronal") of a six-line wrapped label at
  size 25; graphty shows all six. Not yet explained.

## Specimen sheets: XGMML settings graph-io now reads, and the XGMML rows still open (fix round 2, 2026-10-19)

Measured with the oracle report on every `xgmml-` sample after rebuilding graph-io: 21 of 52 now pass the verdict
(15 before), and the failing elements of the 52 fell from 1,559 to about 640. Every change below holds for CX, CX2 and
sessions too, since the four formats share the Cytoscape desktop reader.

Fixed:

- `ARROW` caps (`arrows`, `mappings-bypass-p11`, and 71 caps of `xgmml-pathguide-allpathwaysdb`): Cytoscape 3.10.5
  draws ARROW as a filled delta as long and wide as DELTA; graph-io read it as an open vee. It is a triangle now, and
  the Cytoscape writer writes a neutral vee as ARROW with a W_STYLE_APPROXIMATED note (desktop has no open vee).
- `EDGE_STACKING` HAYSTACK (`edges-lines`, `mappings-bypass-p10`, `stacking-haystack`): drawn straight, never fanned
  and not counted among its parallel edges. `EDGE_CURVED` false on AUTO_BEND parallel edges (`curved-false-parallel`):
  Cytoscape still fans and curves them (the oracle's curves are point for point those of `parallel-3`), so graph-io
  does too. Both sheets pass.
- Label background box (`labels`, `edge-labels`, `mappings-bypass-p6`, `-p13`, and the 92 boxes of
  `xgmml-syn-mappings`): Cytoscape draws the box round the words alone, one line tall (the font's ascent plus descent,
  1.164 of a DejaVu Sans size, which is also the step between a label's lines): the Cytoscape tool defaults now say
  `labelPadding` 0 and `labelLineHeight` 1. A ROUND_RECTANGLE box's corners are rounded an eighth of its height
  (1.455 on the 11.64-tall box of a 10 px label), read into the new neutral `labelCornerRadius` and drawn by the new
  `node.labelCornerRadius` / `edge.labelCornerRadius` channels of graphty-element. All four sheets pass.
- Java font names in the corpus (`xgmml-dream4-signaling`, `-imagenet-dog-children`, `-networkportal-nsoxphos`: 40,
  190 and 69 `label.family`): graph-io was right (Java draws `Default`, a font it does not have, in Dialog's face,
  DejaVu Sans). Cytoscape's SVG writes `font-family="Default"`, a CSS-wide keyword the browser rejects, so the oracle
  reader fell back to Times New Roman; it now keeps the name the program wrote when CSS rejects it, and classes
  `Default` as sans-serif (comparator, d577376ba). With the sibling round's FreeHEP measurement (f5a24b69c), the label
  places of these samples pass too: `imagenet-dog-children` passes the verdict (151 offsets, 118 anchors before).
- `NODE_LABEL_FONT_FACE` Serif (`labels`, `mappings-bypass-p6`): fixed by the sibling round's FreeHEP measurement
  (Java laid "Label" out 28.4 wide, DejaVu Serif's width, where the browser measured the SVG's `Times` 23.1 wide).
- `OPEN_HALF_CIRCLE` caps and the lines under CIRCLE, T and HALF_* caps (`arrows`, `mappings-bypass-p11`): fixed by
  the sibling comparator round; no `edge.arrow` or `edge.route` failure remains on these sheets.

Tests: `graph-io/test/formats/xgmml/fix-round-2.test.ts`, `graphty-element/test/session/file-style-label-box.test.ts`,
`graphty-element/test/browser/oracle-svg-primitives.test.ts` (a family CSS rejects).

Still open, and why:

- Chart labels (`images-charts-p5`, `-p7`, `mappings-bypass-p18`; `chart-labels`): not fixed. Pie item labels need a
  neutral slot (`cy_itemLabels`, `cy_itemLabelsColumn`, `cy_itemLabelFontSize`) and graphty-element to draw words on a
  pie slice, which it cannot yet; the bar, line, heat map and box chart labels cannot be judged before graphty-element
  draws those charts at all (`node-custom-graphics`). The next fix is in graphty-element.
- Annotations judged as strays (`images-charts`, `-p2`, `-p5`, `-p7` `stray.extra` 1 or 2 each, `-p6` 7 annotation
  arrows; `annotation-scoring`): graphty's pie slices and file annotations are scored only by their boxes against the
  oracle's unassociated shapes, so a slice or arrow whose oracle twin the association took into another element is
  reported extra. Comparator work (FINDINGS "File annotations are not scored"); not changed here.
- `CROSS_DELTA`, `CROSS_OPEN_DELTA`, `SQUARE`, `OPEN_SQUARE` sizes (`arrows`, `mappings-bypass-p11`, 4 `arrowShape`
  each): graphty-element-render (`arrow-shape-vocabulary`), unchanged.
- Patterned corpus edges (`xgmml-syn-mappings` 142 and `-syn-bypass` 18 `edge.arrow`): the oracle reader finds no cap
  at the end of a line Cytoscape draws in pieces (slashes, arrows, dashes); comparator (`comparator-edge-association`).
- `xgmml-aracne-mycccnd1`, `-networkportal-nsoxphos`, `-basicdataviz` edge rows moved in this run (aracne 22 to 36
  failing edges, networkportal 0 to 8 on its thick edges, basicdataviz one route): none of their edges is parallel,
  stacked or arrowed, and the frame fit moved by 0.2 percent between the runs; they follow the comparator's
  association changes landing beside this round, not an import change. Not yet explained further.
- `xgmml-pathguide-allpathwaysdb` edge `-19->-23`: the oracle draws a 1.7 px box before its diamond cap, graphty only
  the diamond. Not yet explained.
- HAYSTACK edges drawn on top of each other (`edges-lines`, `stacking-haystack`; found verifying fix round 2): graph-io
  now draws them straight and unfanned, and the sheet passes, but Cytoscape 3.10.5 ends each HAYSTACK edge at its own
  point inside each node (the three edges of `stacking-haystack` start at x 841.4, 846.8 and 844.6 and stand up to 3 px
  apart), so the reader sees three thin lines. graphty draws all three center to center, exactly on top of each other,
  so two are hidden. The comparator does not notice, because each graphty edge lies within its route tolerance of an
  oracle edge. Fixing it needs a neutral per-edge end offset in graph-io and a way for graphty-element to draw it.
  Desktop's offsets come from its own random generator, so they could only be matched approximately. Open.

## Specimen sheets: CX2 settings graph-io now reads, and the CX2 rows still open (fix round 2, 2026-10-19)

Measured with the oracle report on every `cx2-` sample after rebuilding graph-io: 29 of 49 pass the verdict (19 in
the round-2 gap list), and the failing elements of the 49 fell from 1,703 to 1,397.

Fixed:

- Arrow paint under an edge color bypass (`cx2-specimen-mappings-bypass`, `bypass-over-edge-passthrough`): graphty
  painted the arrow in the bypassed line color (#9467bd), Cytoscape in the style's #505050. Cytoscape's CX2 writer
  spells a desktop `EDGE_UNSELECTED_PAINT` bypass out as `EDGE_LINE_COLOR` plus both arrow colors, so an
  `EDGE_LINE_COLOR` bypass alone is the stroke's; under `arrowColorMatchesEdge` the arrows now keep the style's line
  color, and an arrow's own `EDGE_SOURCE/TARGET_ARROW_COLOR` bypass still wins. The sheet passes. Test:
  `graph-io/test/formats/cx2/styles.test.ts` ("CX2 edge colors under arrowColorMatchesEdge").
- Caps Cytoscape draws standing off their node (`arrows`, `mappings-bypass-p11`; T, HALF_CIRCLE, OPEN_HALF_CIRCLE,
  HALF_TOP, HALF_BOTTOM, SQUARE, OPEN_SQUARE): Cytoscape's SVG draws each cap's unit glyph back from the node's outline
  (T's bar 0.8 to 1, a half circle 0.5 to 1, HALF_TOP's barb 0.3 to 1.435, a square 0.25 to 1.25) with the line
  stopping at it; graphty drew every cap against the node. graph-io reads the gap as the new neutral
  `sourceArrowGap` / `targetArrowGap` (a multiple of the cap's own length), and graphty-element draws it through the new
  `edge.arrowHeadGap` / `edge.arrowTailGap` channels (`ArrowStyle.gap`). The gaps now measure 9.28 against 9.29 (T),
  5.80 against 5.81 (half circle) and 2.90 against 2.91 (square). Holds for CX, XGMML and sessions too. Tests:
  `graph-io/test/formats/cx2/styles.test.ts` ("CX2 arrows Cytoscape draws off their node"),
  `graphty-element/test/browser/edge-arrow-gap.test.ts`.
- `OPEN_HALF_CIRCLE` route (comparator): the drawn scene reports graphty's line as ending at the cap's tip, which for an
  open half circle is its mouth, while both drawings stop the line at the arc's back (cropped side by side, identical);
  the oracle reader never carries a line through a small open stroke, so graphty's line is now ended at the arc's back
  too (`drawn-primitives.ts`). No `edge.route` failure remains on `arrows` in CX, CX2, XGMML or sessions. Test:
  `graphty-element/test/fidelity/oracle/drawn-primitives.test.ts`.
- ROUND_RECTANGLE label boxes (`labels`, `edge-labels`, `mappings-bypass-p6`,
  `label-background-shape-round-rectangle`): CX2 spells the shape `round-rectangle`, so the corner radius the sibling
  XGMML round reads for ROUND_RECTANGLE was never set and the box drew square. Either spelling is read now. Test:
  `graph-io/test/formats/cx2/styles.test.ts` ("CX2 label background shapes").
- Straight lines judged as strays (`images-charts-p6`, 7 annotation arrows `stray.extra` and their 7 lines
  `stray.present`): a straight line's box has no height, so the same line in both drawings shared no area under the
  stray IoU and was a stray on both sides. Strays are now overlapped with each thin axis taken as 2 render px thick
  (`strayIou`, `compare-oracle.ts`); a line a row apart still matches nothing (`-p6`: `stray.extra` 7 to 0,
  `stray.present` 93 to 86, in all four Cytoscape desktop formats). Test:
  `graphty-element/test/fidelity/oracle/stray-iou.test.ts`.
- `ARROW`, HAYSTACK, curved-false parallel edges, the passthrough font face, the label background size and `Serif`:
  fixed for every Cytoscape desktop format by the sibling XGMML and CX rounds (bbdf7ce71, d577376ba); they no longer
  fail on the CX2 sheets.

Still open, and why:

- Chart labels (`images-charts-p5`, `-p7`, `mappings-bypass-p18`; `chart-labels`): not fixed, as the CX, XGMML and
  session rounds say. 9 of the 11 labels on `-p7` belong to bar, line and heat map charts graphty-element does not draw
  at all (`node-custom-graphics`), so they cannot be judged before those charts are drawn; pie item labels
  (`cy_showItemLabels`, `cy_itemLabelsColumn`, `cy_itemLabelFontSize`) need a neutral slot and graphty-element to draw
  words on a pie slice. One change in graphty-element closes it for all four Cytoscape desktop formats; it is left to a
  single owner rather than four rounds racing on it.
- `CROSS_DELTA`, `CROSS_OPEN_DELTA` (`arrows`, 4 `edge.arrowShape`): graphty-element-render (`arrow-shape-vocabulary`),
  not in this round.
- `arrows-p2` `target-arrow-size-24` (`edge.extra` 1, `stray.present` 2): both programs draw the same edge (cropped side
  by side, identical): a line shorter than its size-24 delta. The oracle reader takes the delta as a stray and finds no
  edge under it, so graphty's edge is reported extra (`comparator-edge-association`). Comparator.
- Patterned corpus edges (`cx2-syn-mappings` 143 and `cx2-syn-bypass` 23 `edge.arrow`, `cx2-signor-aml`,
  `cx2-wp1449-tlr` `edge.present` / `edge.extra`; `comparator-edge-association`): the oracle reader finds no cap at the
  end of a line Cytoscape draws in pieces (slashes, arrows, dashes) and pairs some long edges with the wrong path
  (`cx2-syn-mappings` `156->192`: the oracle's line runs node to node while its cap sits 250 px away). Comparator.
  The cap gaps above raise these samples' `edge.route` (A/B on the same build, gaps off then on: `syn-mappings` 93 to
  97 of 131, `signor-aml` 210 to 211 of 271, `wp1449-tlr` 92 to 112 of 126); the floors these samples fell below in
  this run (`signor-aml` label.present, edge.width, dash, arrowLength; `syn-mappings` alongLine, edge.present, color;
  `wp1449-tlr` edge.present) did not move in that A/B, so they follow the comparator's association changes landing
  beside this round, not an import change.
- Label wrapping (`cx2-us-returned-students` 3 `label.lines`, `cx2-ndex-90f78bcd` `Citric acid cycle`): graphty wraps
  "Chinese Students' Christian Association" (198.3 wide in DejaVu Sans at size 10) and "Grass Valley High School
  Debating Club" (198.5) under `NODE_LABEL_MAX_WIDTH` 200 because each word is measured with the space after it (201.5);
  Cytoscape draws them on one line, and in this file it draws every label on one line, up to "American Association for
  Advancement of Science" (251.8 wide). Its wrap rule for these files is not yet known (the specimen sheets' wrap width
  specimens pass), so nothing was changed. graph-io-import (`label-wrap-width`).
- `cx2-ndex-90f78bcd` node `304542` (`label.lines` 2 of 6): the node sits at x -9641, at the canvas's left edge; the
  oracle holds only the two lines of its label the canvas shows. Not an import gap.
- Chart pieces Cytoscape draws (bar, line, box, heat strip; the `60x30` image placeholder text): `stray.present` on the
  `images-charts` pages, graphty-element-render (`node-custom-graphics`), not in this round.

## Specimen sheets: node gradients, wrap rules, end captions, groups and loops (fix round 3, rendering batch 1, 2026-10-19)

graphty-element now draws, as style options with channels, and graph-io maps the files onto them:

- Gradient fills through any number of colors at their stops, linear or radial (`node.gradientColors`,
  `node.gradientStops`, `node.gradientKind`; graph-io `fillGradientColors`, `fillGradientStops`, `fillGradientKind`):
  Cytoscape.js `background-fill: radial-gradient`, `background-gradient-stop-colors` with three stops and
  `background-gradient-stop-positions` (`cytoscapejs-specimen-node-fills-borders`, `-mappings-bypass-p2`), Graphviz
  `style=radial` (with and without `gradientangle`) and a weighted first color `red;0.3:blue`
  (`dot-specimen-node-fills-borders`): every `node.gradient` row passes.
- Wrap rules (`labelWrapEllipsis`, `labelWrapAnywhere`, `labelWrapSpaceCount`, node and edge): Cytoscape.js
  `text-wrap: ellipsis` and `text-overflow-wrap: anywhere` (`cytoscapejs-specimen-labels-p2` `label.text`, offset and
  anchor pass) and vis-network's `widthConstraint.maximum`, which counts a blank between words three times
  (vis-network's LabelSplitter keeps each blank as a word and joins words with a blank):
  `vis-network-specimen-node-sizes-opacity` `width-constraint-max` lines, width and height pass.
- End captions turned and moved (`edge.arrowHeadTextRotation`, `-TextOffsetX`, `-TextOffsetY` and the tail's;
  graph-io `sourceLabelRotation`, `sourceLabelOffsetX` / `-Y` and the target's): Cytoscape.js `source-` /
  `target-text-rotation` (angle or autorotate) and `-text-margin-*`; `target-text-rotation-45deg`,
  `-autorotate`, `target-text-margin-*` pass. An edge label with `text-justification` left or right is centered line
  by line and moved half its width, as Cytoscape.js draws an edge's lines (its text is always centered):
  `text-justification-left` passes.
- An edge to a group drawn as a region ends at the region's outline, as Cytoscape.js ends an edge to a compound node
  (`cytoscapejs-specimen-groups` `edge-to-group`: cropped side by side, drawn alike; graphty used to run it from the
  region's middle across a member). Its `edge.extra` row stays: the oracle reader pairs no edge with a compound node, so
  the oracle's short line is left a stray (comparator, `comparator-edge-association`).
- Pajek loops are Pajek's Bezier route (a line 500 points long, `a1 -70 k1 0.3 a2 -70 k2 0.3` by default, measured on
  `pajek-specimen-edges-lines-p2`), drawn round under Straight Lines and with no visible head; a turned line label's
  middle sits above its baseline in its own frame: `pajek-specimen-edges-lines-p2`, `-p4`, `pajek-specimen-edge-labels`
  and `-p2` pass.
- vis-network loops whose circle holds the whole node are that circle, which graphty-element draws as a closed ring
  with no line out from the node (a loop whose bends close on themselves and all lie outside its node); one drawn in
  front of its node (`renderBehindTheNode: false`) is the arc vis-network searches for (Edge._circle).

Still open, and why:

- Cytoscape.js `border-style: double` and `outline-style: double` (`node-fills-borders`: `node.strokeDash`,
  `node.ring`, the outline's width): oracle. Cytoscape.js draws a double border as one stroke and then erases its
  middle third with `globalCompositeOperation = "destination-out"` (cytoscape.js 3.34.3 `drawBorder` / `drawOutline`);
  the svgcanvas replay does not record composite operations (its `.oracle.json` says so), so the oracle's SVG holds a
  solid 3.87 stroke under a 1.29 one of the same color. graphty draws the double ring Cytoscape.js's canvas shows.
- Cytoscape.js end labels (`edge-labels` `source-text-margin-x-10`, `source-text-margin-y-neg-10`,
  `source-text-rotation-none`, `-autorotate`, `-45deg`): comparator (`comparator-edge-association`). Cropped side by
  side the captions are drawn alike; the oracle reader hangs each source label on the neighboring edge (the label at
  x 414.9 of `source-text-margin-x-10`, whose node is at 400.9, is given to `source-text-margin-y-neg-10`, whose node is
  at 509.1, and the reverse), and gives `source-text-rotation-none`'s caption, which lies over its node, to the node.
- Gephi's self-loop (`gexf-specimen-arrows`, `edge-labels` ..., `edge.curve` 0.646 against 0.436): fixed in round 4
  (see "Gephi's self-loops drawn at their own size" below). It was not the comparator: graphty drew the loop's circle
  smaller than Gephi's.
- vis-network `selfReference.angle` and the default loop in the position-matched view (`edge.curve` o=2078.8): comparator.
  `curvatureOf` calls a path a loop only when its ends are under 1e-9 apart; vis-network's closed circle ends a float's
  error apart (2078.8), and graphty's ring does too once its node is moved (15.9 in the matched view, 1 in the plain one).
- vis-network `self-reference-front` (`renderBehindTheNode: false`, `edge.route` 1.82 against 0.10, was 2.31):
  graph-io now writes vis-network's searched arc, but on a node the circle never meets the search stops short of the
  node and graphty runs a line from the node's outline to each end of the arc, which vis-network does not draw.
  Dropping the legs for every loop whose bends lie outside its node also dropped them from Cytoscape.js's loops
  (whose splines end at the node), so the rule is limited to closed rings; an open detached arc needs a neutral way to
  say "no legs" (graphty-element-render, `loop-geometry`).
- Cytoscape.js `loop-direction: 90deg` (`edges-lines-p2`, `edge.curve` 2.79 against 1.84): the loop's size and shape
  match (38.2 across and 20.5 to either side on both, in the oracle's frame), but graphty's line leaves the node 3.6 px
  past its outline (cropped at 12x: a gap between the node and both legs) where Cytoscape.js's touches it. The cut is
  `Edge.leaveNode` from the first bend outside the node; why it lands that far out on this sheet (its nodes have the
  inset border another round is changing) was not found. graphty-element-render.
- Pajek `edges-lines-p5` (Color as Gradient of End Vertices) still fails rows of its own; the loops pass there.

## Specimen sheets: glyph shapes, label runs, image sides and centered borders (fix round 3, rendering batch 2, 2026-10-20)

graphty-element now draws, as style options with channels, and graph-io maps the files onto them:

- A node's further pieces and lines (`node.shapeParts`, `node.shapeLines`, `node.shapeLineWidth`; graph-io
  `shapeParts`, `shapeLines`, `shapeLineWidth`): Graphviz's synthetic-biology shapes are their glyphs at Graphviz's own
  size on a baseline through the node's middle (a polygon drawn where its points say, the further bars of an
  `assembly` or a `noverhang`, the open baselines and stems), an `insulator`'s square is an outer ring 3 points round
  it, and the decorated boxes (`box3d`, `tab`, `folder`, `component`, `note`, `cds`, the arrows and promoters) are
  drawn at the node's size with their decorations a fixed number of points across, as Graphviz draws them, with their
  lines (a `box3d`'s edges, a `note`'s fold); an `underline` is its box with no line round it and its bottom line. The
  geometry was measured with Graphviz 14.1.2 `neato -n2 -Tsvg` at 36 x 36, 72 x 36, 36 x 72 and 108 x 54 points. A
  `cylinder` is drawn as graphty's database. `dot-specimen-node-shapes` fell from 25 failing nodes to 4,
  `gml-specimen-node-shapes-p7` from 22 to 1.
- A run of label markup drawn off its line (`<shift='60%'>`, a share of the label's size) and where runs of different
  sizes meet (`node.labelRunAlign` / `edge.labelRunAlign`: alphabetic baselines, hanging baselines or middles; graph-io
  `labelRunAlign` and a run's `shift` in `labelRuns`): vis-network's font modifiers' own `vadjust` (mono's is 2 unless
  given), its hanging baseline below a node and middle baseline inside one and on an edge, and the extra depth a larger
  run gives a label below a node (half of what its lines are taller than one font size each, ShapeBase._drawShape).
  `vis-network-specimen-labels` `font-multi-html`, `font-multi-markdown` and `-labels-p3` `font-mono-shorthand` label
  offsets pass.
- An image's side left unset drawn at the picture's own pixels (`node.imageAutoSize` "natural"; graph-io
  `imageAutoSize`), and Cytoscape.js `background-width` / `-height` in percent of the node's padding box, its default
  `-relative-to: include-padding` (of its inner box under `inner`), as cytoscape.js 3.34.3 drawInscribedImage sizes
  them: a picture 100% wide on a 36 px node with 8 px padding is 52 wide and its own 24 tall
  (`cytoscapejs-specimen-images-charts` `background-width-relative-to-include-padding`: cropped side by side, drawn
  alike). Its rows stay: the oracle reader takes the picture for the node (`node.width` o=51.2 x 23.2, no fill and no
  outline) and leaves the node's own body as strays (`stray.present` path#15, #16 ...), so graphty's body reads as a
  different size and its picture as an extra annotation (comparator, `comparator-clip-path`, `annotation-scoring`).
- vis-network's and Pajek's borders are centered on the node's outline (`borderPosition` "center", a canvas or SVG
  stroke), and a node's label is placed against its outline whatever its border's position, so a centered or inside
  border no longer pulls the label in by half or all of its width: `vis-network-specimen-node-fills-borders`
  `border-width-8` and `pajek-specimen-node-fills-borders-p3` `bw-8` width and height pass (44 across, not 52), and
  Pajek's lines end at the vertex outline (`pajek-lin-rel4` 88 routes, `pajek-synth-vertices` 10, `pajek-1crn` 3).
  Over the vis-network and Pajek sheets and samples this fixed 118 rows and broke 8 (below); over the other formats'
  label, shape, border, size, group, image and mapping sheets (305) placing labels against the outline changed only
  yEd rows, 6 fixed (`yed-graphml-specimen-labels-p2` internal, corner and eight-position models) and 3 broken (below).

Still open, and why:

- Rows the centered borders and the outline label place broke: `pajek-synth-lines` 5 routes, `json-vis-synth` 1 route,
  `pajek-lin-rel4` 1 route, `pajek-synth-vertices` 1 height; `yed-graphml-specimen-groups-p2` `box-99`, `box-107` and
  `-labels` `border-distance` label offsets (draw.io standing in for yEd; graphty's group label now sits against the
  group's outline, half its 1 px border further out). Not looked into one by one this round.

- `dot-specimen-node-shapes` and `gml-specimen-node-shapes-p6` `parallelogram` (`node.shape` o=rect g=other):
  comparator (`comparator-shape-class`). graphty draws Graphviz's own corners (classed "other", as `shapeOf` classes a
  four-sided outline with two corners on its box's); Graphviz's polygon is the same parallelogram (its corners
  `811.66,-721.25 781.97,-721.25 774.34,-685.25 804.02,-685.25`), yet the oracle side reads "rect". Why was not found.
- `tripleoctagon` (DOT and GML, width and height 45 against 37): graphty draws one outer ring; the oracle reader counts
  the middle ring in the node's size and the outermost as its ring. A third outline needs a second outer ring
  (graph-io `node-outline-ring`).
- vis-network `font-*-vadjust` (`labels-p2`, `edge-labels`, `label.present` o=None): comparator. graphty-element now
  draws the run that much lower, as vis-network does; the oracle reader keeps a run drawn more than half its height off
  the line as a text of its own (`joinRuns`), so the label is not found on the oracle side at all.
- vis-network `font.background` (`labels` `font-background`, label 28.6 below its node against 22.0; passes since fix
  round 3, which places a label below a node sized by `size` as vis-network hangs it): graph-io draws
  the box round the words alone (`labelPadding` 0, `labelLineHeight` 1), and graphty-element places a label by its
  box, so the words move up with the smaller box; vis-network places the words and draws the box round them. Needs a
  way to place a label by its words when its box is drawn (graphty-element-render), or graph-io's label place for
  vis-network below a node modelled on the words (`label-anchor-offset`).
- vis-network `size-30-database` (`label.anchor` center/end against center/center): the database is sized by its label,
  as vis-network sizes it (width and height pass now); graphty's label box is a line height and a padding taller than
  the words, so its words sit lower in the small node (`label-anchor-offset`). Its `node.stroke` rows and
  `node-shapes` `shape-database*`: comparator, as before (vis-network strokes the database as one open path, which
  the oracle reader does not take as the node's outline).
- vis-network `border-radius-12` (`node.shape` o=other g=roundrect): comparator, as before (the same capsule).
- Pajek `bw-4-cross`, `bw-4-diamond`: comparator and oracle, as before (Pajek 6.02's SVG export writes a cross vertex as
  an ellipse; its diamond's corners are 0.04 wide and read as a hexagon).
- vis-network `image-background` (`useBorderWithImage`, width 68 against 35) and `coordinate-origin-top-left` /
  `-circular`: vis-network sizes an image node's box to its picture's proportions, its shorter side `2 * size`
  (CircleImageBase._resizeImage), and with `coordinateOrigin` "top-left" draws the node with its box's corner at the
  position. graphty-element needs a node whose box follows its picture once loaded, and a node placed by a corner of its
  box (graphty-element-render, `node-images`).
- Cytoscape.js `background-image-two-layers` (`fit none contain`): Cytoscape.js draws every layer of a background image
  list, each with its own fit, size and place; graphty-element draws one picture per node and graph-io reads the first.
  Needs picture layers in graphty-element's node style (graphty-element-render, `node-images`). The oracle side reads
  these image nodes with no fill and no outline (`node.fill`, `node.stroke` o=None) though Cytoscape.js draws both
  (cropped side by side): comparator (`comparator-clip-path`).
- `json-graphology-synth` routes (42 rows): not sigma's curve. Of the 42, 39 are straight edges (30 plain, 4 hidden,
  4 `line`, 1 `arrow`) and 3 curves; sigma 4's default programs draw every edge straight (the oracle registers no curve
  program), as graph-io reads them. The straight ones are the raster reading of short edges under their nodes
  (comparator), as recorded in fix round 2.
- vis-network `mappings-bypass` `edge-default` (`edge.route` 0.082 of the chord against 0.05): it is a `curvedCW` edge
  (the sheet's `options.edges.smooth`), drawn as vis-network's quadratic Bezier through its control point
  (BezierEdgeStatic `curvedCW`); both curves bow the same way and the difference is at the circle arrow's end. Not
  found this round.

## Specimen sheets: edge ends on curves, Gephi's edge radius, record fields, programs' own placements (fix round 3, rendering batch 3, 2026-10-20)

graphty-element now draws, and graph-io maps the files onto it:

- A curved edge leaves and meets its nodes where the curve itself crosses their outlines. graphty-element drew an
  arc as straight pieces of 7.5 degrees and joined the first piece outside a node to the node's outline by a line
  from the node's center, which cut the curve's corner and bowed the rest of it deeper; and it measured a flat
  ellipse's outline as its box's, so between large discs the line started a box corner away. The route is now cut
  where its own piece crosses the outline, the outline of a flat ellipse is the ellipse, and an arrowhead on a curve
  spans the chord from where the curve is cut back by the head's length to the outline, as Gephi and Cytoscape.js
  draw it (`Edge.placeRoute`, `Edge.placeBent`; `crossingOf`, `cutFromEnd` and `surfaceReach` in
  `meshes/edgeRoute.ts`). `gexf-miserables` 103 failing elements to 0, `gexf-qvge-mine-airing` 27 to 0,
  `gexf-graphology-rio` 268 to 50 (the rest self-loops), `gexf-sigma-ediaspora` 346 to 36.
- Gephi's `edge.radius` (`line.nodeGap`, channel `edge.nodeGap`; graph-io `nodeGap`): every edge, and its arrowhead,
  stops that far short of its nodes' outlines. `gexf-specimen-arrows-p4` 11 failing elements to 0.
- A node with no `viz:position` in a GEXF file that places the others is put at the origin, as Gephi's importer puts
  it (`originUnplaced` in the position column's spelling; `gexf-specimen-node-sizes-opacity` `position-none`, drawn at
  0, 0 by Gephi). A file that places no node is still laid out by graphty: Gephi gives such nodes random places.
- A Pajek file with no coordinates is placed as Pajek 6.02 places it: round a circle in vertex order, the first on
  the left, clockwise, radius 0.4 of the Draw window (`unplacedCircle` in the importer's positions answer;
  `pajek-iliad`, 311 vertices on a circle of 200 points: every position now matches; its 30 failing elements left
  are the oracle's Windows-1252 reading of the names, already recorded, and 8 routes and 5 arrowheads).
- Graphviz records (`record`, `Mrecord`): graph-io lays a record out as Graphviz does (`parse_reclbl`,
  `size_reclbl`, `resize_reclbl`, `pos_reclbl`: fields at their padded text size, the node at least their size
  unless `fixedsize`, the difference shared out in whole points, nested braces turned, `rankdir` LR and RL turning
  the top level, `\l` and `\r` lines set in 8 points from their field's side) and writes the dividers as the node's
  lines (`shapeLines`) and each text line as a further text over the node (`shapeTexts`), which graphty-element
  draws in the label's font, size and color (`shape.texts`, channel `node.shapeTexts`). Text widths are estimated from
  DejaVu Sans's advances (`formats/dot/record.ts`). `dot-specimen-node-shapes-p3` and `-p4` (rankdir LR and RL)
  fell from 5 failing nodes to 1 (the default node's width, unrelated), `-p2`'s six records from 6 to 1.

Still open, and why:

- Graphviz edge routing, ports and the layout of DOT files without positions (`graphviz-layout-engine`: every
  `dot-specimen-edges-lines*`, `arrows-p2`, `-p4`, `edge-labels`, `mappings-bypass` route, curve and edge-label place;
  the nine DOT corpus samples): Graphviz routes every edge as a spline round its obstacles into its ports and places
  every edge label, even when `neato -n2` pins the nodes. That needs Graphviz's own engines, which are on
  `origin/golden` (`feat/graphviz-layouts`, PR #3203) and not merged into this branch; merging another branch is the
  integration step's, not a rendering batch's. A record port still ends its edge at the node's center: the port's
  field is known (`layoutRecord` returns it), but Graphviz's spline into it is the router's.
- Files whose program lays them out itself (`unpositioned-layout-scale`): vis-network documents without positions
  (`json-vis-siblings`, `-unix`, `-lesmiserables`, `-world`, `-transparency`, `-nodelegend`) are placed by
  vis-network's Barnes-Hut physics, which only a port of vis-network's simulation would reproduce; Gephi places the
  nodes of a GEXF file with no positions at random (`gexf-hsk-chars`); Cytoscape desktop lays a CX file without a
  `cartesianLayout` out differently on each load (`cx-radiation-bibliography`, `cx-repro-unplaced-boxes`: "two loads
  drew different SVGs" in their oracle records). graphty's own layout cannot match a random or physics layout node by
  node, so their positions stay unjudged in any useful sense.
- `dot-specimen-node-shapes-p2` `distortion-*`, `skew-*` (`node.shape` o=rect g=other): graphty draws Graphviz's
  corners where Graphviz does (cropped side by side: the same parallelograms and trapezia); the oracle reader classes
  Graphviz's four-cornered polygon "rect" (comparator, `comparator-shape-class`).
- Graphviz record fields are spaced with estimated DejaVu Sans widths and Graphviz's rows here differ by up to a point
  from the even shares graph-io computes for a vertical record (Graphviz's 13.75, 13.75, 12.5 against 14, 13, 13).
- `dot-specimen-node-shapes-p2` `record-escapes` `label.anchor` (o=start/center g=center/center): the field texts
  are where Graphviz sets them to within a point, but their union is 2.3 px left of the node's middle in graphty
  against 2.6 in the oracle, either side of the anchor tolerance; `label.anchor` on the sheet falls to 5 of 6 judged
  (6 of 7 before: one record's merged label is no longer judged against its box).
- Rows this batch moved the wrong way, each looked at:
    - `vis-network-specimen-arrows` `raster.edge` 0.92 to 0.875 and `raster.label` 0.868 to 0.864, with no element
      row changed (6 failing before and after): graphty's frame zooms in by 0.1% (the anchors 0.64 px further apart)
      because its drawing's extent shrank where curved edges now stop at their outlines, and the raster score of
      lines 1 to 2 px wide changes with the sub-pixel phase of the aligned image. `gml-specimen-edge-labels`
      `raster.edge` 0.8318 to 0.8298 the same way (one bent edge's end moved 1.5 px onto its ellipse).
    - `graphml-scala-collection-mutable` `n2->n11` `edge.route` and `yed-graphml-specimen-edges-lines`
      `raster.arrowhead`, `raster.nodeOutline`: graphty's edges now end on an ellipse node's outline, not its box's
      corner; the draw.io stand-in ends them at the box corner (`n2->n11` ends 48.5, 23.5 px from the center of a
      93 x 47 ellipse). Stand-in limit until the owner's yEd export.
    - `dot-synth-nodes` `node.sizeToSpacing`, `sizeToExtent`, `label.present`: an unrelated layout (graphty's own,
      until Graphviz's engines land); the records are now Graphviz's size, which moves graphty's force layout.
    - `gexf-sigma-ediaspora` `109->80`, `66->63` `edge.curve`: failing before as well (the sheet's curve rate was
      under its floor, which hid them); 346 failing elements to 36.

## Specimen sheets: tiny centered borders, yEd arcs, Cytoscape's bar, line, box and heat map charts (fix round 3, rendering batch 4, 2026-10-20)

Fixed:

- Pajek's `x_fact 0` vertex (`pajek-specimen-node-sizes-opacity` and its pages, `x-fact-0`): Pajek draws an ellipse
  of radius 0 stroked 1 wide, a dot 1 across; graphty-element drew it 2 across, because a centered border on a node
  narrower than the border kept its full width outside a fill shrunk to a point. A centered border now reaches half
  its width past the size whatever the size (`NodeMesh.borderFit`). Every `node.width`, `node.height`, size and
  `node.strokeWidth` row of the three pages passes (27 of 28 before); no other node sheet of any format changed.
- yEd arc edges: yEd saves an arc's apex as its one bend, `y:Arc height` from the line between the ends (every
  yEd-saved arc in the corpus: `scala-collection-mutable`, `Animatron__player__flow`), and draws the arc of the
  circle through the ends and that point. graphty-element drew the bend's corner rounded, about 3 px inside the arc;
  it now draws the circle (new `edge.bendCurve` value `arc`), and graph-io gives every `y:ArcEdge` that value. On
  `yed-graphml-specimen-edges-lines` the drawn arcs lie on yEd's circles within 0.0003 of the chord.
- yEd Bezier edges of whole cubic pieces and quad curve edges: graph-io flattens their curves into points on the
  curve; it no longer marks them curved, so graphty-element draws straight from point to point instead of rounding
  the corners, which cut inside the curve and bowed a quad curve of straightness 1 (its control polygon).
- Cytoscape desktop's bar, line, box and heat map charts (`{xgmml,cx,cx2,cys}-specimen-images-charts`, `-p2`, `-p5`,
  `-p7`, `-mappings-bypass-p14`, `-p15`, `-p18`): graphty-element draws a chart over a node's face (new `chart` style
  block, channels `node.chartKind`, `-Values`, `-Colors`, `-Min`, `-Max`, `-Horizontal`, `-Size`, `-Margin`, `-Gap`,
  `-LineWidth`, `-BorderColor`, `-BorderWidth`), and graph-io reads `BarChart` (grouped, stacked, heat strips,
  up-down, horizontal, separation, border), `LineChart`, `BoxChart` and `HeatMapChart` as Cytoscape 3.10.5 draws them
  (measured from its SVG export: the plot 52.1 across a 60 node, 51.1 for a heat map; bars 0.025 of the side in
  from each end; heat colors from the zero color toward the up or down color by value; a line's range with a tenth
  of headroom; JFreeChart's quartiles). `stray.present` on each format's `images-charts` 24 to 94 of 108, `-p2` 24
  to 38 of 38, `-p5` 28 to 66 of 104, `-p7` 4 to 13 of 85, and the same on the `mappings-bypass` twins.

Rows still open, each with what stops it:

- yEd arc, Bezier and quad curve routes (`yed-graphml-specimen-edges-lines`, `edge.route` and `edge.curve` on
  `arc-*`, `bezier`, `quadcurve-straightness-1`): the oracle is draw.io's stand-in, and draw.io draws its own curves
  from yEd's points, not yEd's: an arc as one quadratic whose control is the apex (so it peaks at half the height:
  `M 1026.25 334.48 Q 1060.18 316.62 1087.47 330.99`), a Bezier from the outline crossings rather than the ports,
  and every quad curve alike whatever its straightness (0.1, 0.5 and 1 are the same path). graphty now draws yEd's
  geometry, so these rows differ from the stand-in by design; they wait for the owner's yEd export of the sheet.
  The sheet's `arc-fixed-height-minus-20` also saves its point above the line where yEd, for a negative height,
  saves it below (generator: `generators/specimens/yed.*`).
- Charts with an axis or labels (`images-charts` `bar-domain-axis`, `bar-range-axis`; every chart on `-p7`;
  `-p5` `bar-axis-color-width`, `bar-item-labels`, `bar-zero-baseline`): Cytoscape shrinks the plot by the room
  its axis labels take (5.2 px for the domain axis and 5.3 for the range axis at the default label size, 15.6 and
  16.7 at size 10, 27.3 and 29.5 at size 20, more for turned labels), which depends on JFreeChart's text metrics;
  graphty draws the chart over the whole plot and no axis, tick, label or zero line. The bars are drawn, a few px
  from Cytoscape's, so `-p7` now reports graphty's bars as `stray.extra` (8 of 30) where it reported nothing drawn.
  Needs axis and chart-label options in graphty-element (`chart-labels`).
- Charts colored by a named scheme (`-p5` `bar-color-scheme-rainbow`, `-contrasting`; `-p6` `-modulated`,
  `-blue-red`, `-yl-or-rd`): the file holds only the scheme's name; Cytoscape's colors for three bars are measured
  (rainbow #ff0000 #00ff00 #0000ff, contrasting #ff0000 #ff00ff #0000ff, modulated #ff0000 #7dfd7d #1e1ef6,
  blue-red #ff0000 #0000ff #c0c0c0, YlOrRd #ffeda0 #feb24c #f03b20) but its rule for other counts is not known, so
  graph-io draws no chart for them.
- Comparator: a stroked open path whose two ends land on one node is taken on the oracle side as a piece of the
  node's drawing and never judged (`associate.ts`, "a path whose nearest ends are one node"), so Cytoscape's line
  chart, its box whiskers and medians, and its axis lines are not compared at all. graphty reports its own chart
  lines as line work of the node's face to match; their geometry is checked by
  `graphty-element/test/meshes/node-decoration.test.ts` against the SVG's coordinates. Comparator work.
- The `60x30` text on `{xgmml,cx,cx2,cys}-specimen-mappings-bypass-p2`: it is the third line of the caption
  `shape=\nROUND_RECTANGLE\n60x30` (and `PARALLELOGRAM`), which the oracle keeps as a free text while the caption's
  other lines are dropped with it. Not a chart and not drawn wrong. Comparator work (caption words).

## Specimen sheets: Graphviz DOT settings graph-io now reads, and the DOT rows still open (fix round 3, 2026-10-20)

Graph-io now reads these Graphviz settings, each checked against Graphviz 14.1.2's own drawing of the DOT sheets.
The unit tests are in `graph-io/test/formats/dot/styles-fix-round-3.test.ts`, `graphty-element/test/browser/oracle-svg-primitives.test.ts`
and `graphty-element/test/fidelity/oracle/compare-oracle-labels.test.ts`.

- HTML `<B>`, `<I>` and `<FONT COLOR FACE POINT-SIZE>` (`dot-specimen-labels-p2` `html-b`, `html-i`, `html-nested`,
  `html-font-*`; `dot-specimen-groups` `cluster-label-html`). These are now `labelRuns`. A label drawn in one run
  sets the label's own color, size, family, weight and slant. All of these specimens pass. `<BR ALIGN>` now lines up
  the label (`html-br-left`, `html-br-right`). Underline, overline, strike-through, `<SUB>` and `<SUP>` have no
  neutral slot, so they are drawn plain.
- `labelangle` and `labeldistance` (`dot-specimen-edge-labels`). An end label is now placed where Graphviz's
  `place_portlabel` puts it: `10 * labeldistance` points from the end of the line, turned `labelangle` degrees.
  Graphviz does this only when an edge's value is off its default. All five specimens pass. With both values at
  their defaults, Graphviz places end labels as external labels (the label's corner at the end of the line), and
  graphty keeps its own place beside the end.
- `lp`, `head_lp` and `tail_lp` are read only for an edge that has a stored `pos`. `neato -n2` routes an edge
  without a stored `pos` again and places its labels again, so on the sheet Graphviz ignores them (`lp`, `head-lp`).
  `lp-s->lp-t` still fails `label.alongLine` (o=0.32, g=0.5) because of that placement; see the
  `graphviz-layout-engine` row.
- A cluster's stored `lp` (`cluster-lp`), and `labeljust=l` / `r` set 8 points in from the side (Graphviz pads the
  label's box by 8 points). Both pass.
- `pos` arrow tips (`s,` / `e,`): the route now runs on to each tip. Route on `-edges-lines-p11` went from 0.12 to
  0.108 and from 0.17 to 0.164. The tip's arrow is drawn along the line from the end of the spline to the tip.
  Graphviz's line ends at the spline, so the comparator still classes Graphviz's arrow as `half`
  (`pos-arrow-*` `edge.arrowShape`). That is open for the comparator.
- `quantum` (`dot-specimen-node-sizes-opacity-p4`). A box or ellipse that grows to fit its label is now at least
  one quantum across, and an ellipse at least the quantum times the square root of 2 (`quantum-box` and
  `quantum-fixed` pass). Open: Graphviz rounds a padded label box that is wider than one quantum up to the next
  multiple. graphty-element has no setting to round a label-sized node, so `quantum-label` is 92.9 wide against 153.
- Comparator fixes:
    - `shape=plain` with `style=filled` (Graphviz writes `points="-nan,nan ..."`) and an `arrowsize=0` head (a stroked
      polygon of equal points with butt caps) now paint nothing on the oracle side.
    - `style=rounded` on a hexagon now classes as a hexagon. The rule: a path of straight cubic sides between corner
      curves classes as the polygon it rounds.
    - `wedged-partial` now reads the first wedge. The rule: a node is filled in pieces when one piece at least does
      not cover the box.

    All four now pass.

Still open:

- HTML-like tables (`TABLE` / `TD` borders, padding, spacing, sizes, `COLSPAN` / `ROWSPAN`, `HR` / `VR`, `IMG`) on
  `-labels-p2`, `-labels-p3`, `-edges-lines`, `-edge-labels` and `-images-charts`. graph-io keeps only the cells'
  text, and graphty-element has no table or cell label to draw them with. Graph-io work (laying out the table) and
  graphty-element work (drawing cells as label boxes). The edge with an HTML table label (`label-html-table`) is
  routed around its label by neato; that is the `graphviz-layout-engine` row.
- `peripheries=3`, `doublecircle` with `peripheries=3`, `tripleoctagon`. The neutral styles carry one outer ring
  (`outerBorder*`), so drawing a third ring needs a ring count in graph-io's vocabulary and in graphty-element.
- `style=tapered`. This needs a tapering width in the vocabulary and a line of varying width in graphty-element.
- `labelfontcolor`, `labelfontname` and `labelfontsize`. The neutral end labels (`sourceLabel` and `targetLabel`)
  use the edge label's font. graphty-element has `edge.arrowHeadText{Color,Font,Size}` channels, but no neutral
  property reaches them. Fixing this means adding end-label font properties to `vocabulary.ts`, `types.ts` and
  graphty-element's `translate.ts`. Those are shared files that other work had uncommitted edits in, so this was
  left for one coordinated change.
- `xlabel` and `xlp` on a node: there is no second node label in the vocabulary or in graphty-element.
- The root graph's `label`: graphty draws annotations only from Cytoscape's annotation column, so a DOT graph
  label needs an annotation reader for DOT.
- `rotate=90`, `landscape` and `orientation=landscape` (`-groups-p9` to `-p11`): Graphviz turns the whole drawing,
  text included. `ratio=2` (`-groups-p12`) stretches positions only. Both need a transform of the stored positions
  (and, for rotation, of every label), which `ImporterPositions` cannot express.
- Comparator: Graphviz draws `curve`, `icurve`, `lcurve` and `rcurve` arrows as a stem plus an open arc, which the
  oracle side reads as no arrow. It writes colored segments (`color="red;0.3:blue"`) as one path per segment, and
  the oracle side takes one segment as the edge. Both are in `associate.ts`, which other work is changing.
- A quoted DOT label that looks like an HTML string (`label="<I>"`, `label="<BR ALIGN=LEFT/>"`, the captions of
  `dot-specimen-labels-p2`) is read as an HTML-like label: graphty draws `I` and `BR ALIGN=LEFT/` where Graphviz
  draws the text as written, brackets included, and the `<BR ALIGN>` reading lines up such a caption too. The DOT
  tokenizer knows which ids were HTML strings (`DotToken.html`), but the importer stores both spellings as the same
  text, so the style reader cannot tell them apart (`isHtmlString`). Graph-io work: carry the HTML flag of a label
  into the snapshot (or keep a quoted string's text distinguishable) and read only true HTML strings as HTML.
  Not caught by the comparator, because captions are dropped from both scenes.

## Specimen sheets: Cytoscape session settings (fix round 3, sessions, 2026-10-20)

Measured with the oracle report on every `cys-` sample after rebuilding graph-io, before and after the fix
(`tmp/style-specimens/cys-r3/a.tsv` and `b.tsv` in the worktree). The working tree also held other agents'
uncommitted comparator and chart-label edits, so the "now" figures below include them.

Fixed:

- Label wrap width (`label-wrap-width`, graphty-element e37884b68). Cytoscape 3.10.5's `LabelInfo`
  (ding-presentation-impl, read decompiled) measures the whole label first and keeps a one-line label whose width
  is under `NODE_LABEL_WIDTH` on one line; only a label that does not fit is broken word by word, each word
  measured with the space after it, a line ending when the next word reaches the width. Cytoscape.js does the same
  per line (`labels.mjs`: a line no wider than `text-max-width` is kept). graphty-element counted the last word's
  space even for a line that fits, so "Decanoic Acid" (98.95 wide in DejaVu Sans at a width of 100), "Butenoic Acid"
  and "Etacrynic acid" broke onto two lines. `cys-import-and-save` label.lines 297/300 -> 300/300. The `cys-syn-bypass` label.offset and label.anchor
  change measured in the same runs (57/58 -> 58/58, node 2172 "B27") is not this fix: a one-word label wraps the
  same either way, so it came from other uncommitted edits in the working tree. Test:
  `graphty-element/test/browser/label-wrap-width.test.ts`.
  Known difference: ding keeps only a one-line label whole (a label with newlines is always broken by its words);
  graphty-element keeps any line that fits, as Cytoscape.js does. ding also caches a label's lines by text, font and
  width but not by the font render context it measured with, so the first measurement wins: why two loads of this
  session laid some labels out differently (its oracle's `loads` note).

Still open, and why:

- `cys-import-and-save` label.align (node 3769, "Magnesium salicylate": o=end, g=middle) and label.offset (node
  3673, 1.2 px): Java centers each wrapped line with its trailing space, so the visible words of a wrapped label sit
  half a space left of the node's middle. graphty-element drops the space at a line's end, and the comparator reads
  graphty's alignment from its option, not from per-line boxes. Needs both (graphty-element-render and comparator).
- Chart labels (`chart-labels`; `images-charts-p5`, `-p7`, `mappings-bypass-p18`): pie item labels are being added
  in the shared `styles/cytoscape/charts.ts` by the XGMML round (uncommitted while this ran); with it, graphty's pie
  item words on p5/p18 node 438863 are read as that node's label ("A B C", the oracle has no node label there).
  `-p7` keeps 10 of 16 missing: the bar, line and heat map charts' domain, range and item labels are not read, and
  Cytoscape also shrinks a bar chart's plot for its axes, so graphty's bars on `-p7` sit about 30 px off the
  oracle's.
- Annotations (`annotation-scoring`): on `images-charts-p5` and `mappings-bypass-p18` stray.extra now passes. The
  graphty extras left on these sheets are not file annotations but bar-chart pieces, which the graphty scene records
  as `annotation-shape` strays: 21 on `images-charts-p7` (the axis reason above) and 1 on `mappings-bypass-p14` (a
  short blue bar whose base sits 4 px below the oracle's, IoU 0.41 against 0.5). That is chart geometry
  (`node-custom-graphics`). Scoring an annotation's shape, fill, text and rotation is still not built; on the session
  samples only `cys-annotation-example` (2 arrows) and `cys-syn-bypass` (4 shapes) show annotation extras.
- CROSS_DELTA and CROSS_OPEN_DELTA (`comparator-arrow-class`; `arrows`, `mappings-bypass-p11`, 4 of 42 each): with
  the XGMML round's uncommitted `cross-delta` class the oracle side now reads them, graphty's side still reads
  `other`. Left to that round, which owns the change.
- The size 24 arrowhead on short edge 8 (`comparator-edge-association`; `arrows-p2`, `mappings-bypass-p12`): the edge
  now pairs; one 3 x 6 px `#505050` piece of the oracle's line at the source node stays an unmatched stray.
- Patterned corpus edges: `cys-syn-mappings` edge.arrow 352/393 (139 rows failing in round 3, 41 now) with the
  association change in progress; `cys-affinity-purification`, `-annotation-example`, `-galfiltered` and
  `-luad-vest-v2` keep 4 to 8 edge.route rows each. Comparator, not changed here.

## Specimen sheets: CX2 settings graphty now reads, and the CX2 rows still open (fix round 3, 2026-10-20)

Measured with the oracle report on every `cx2-` sample (49) (`tmp/style-specimens/cx2-r3/` in the worktree). The working
tree also held other agents' uncommitted comparator, chart and Pajek edits, so the "now" figures include them.

Fixed:

- Mapped `NODE_LABEL_POSITION` with `NODE_LABEL_ROTATION` (`cx2-syn-mappings`, `label-anchor-offset`): not an import
  gap. graph-io reads the mapped position whole (node 189, `pos` 3: the label's left middle at the node's right
  middle, 5 px out), but Cytoscape turns a label about that pinned point while graphty-element turned it about its
  own middle, so a label turned 33.5 degrees hung 7 px lower in Cytoscape. graphty-element now turns a label's shift
  with the label (74cbbef30); Cytoscape.js and Pajek turn a label about its anchor the same way. `label.anchor`
  37 -> 8 failing, `label.offset` 19 -> 0; one more label passes in each of the cx, cx2, xgmml and cys `syn-bypass`
  samples. The 8 left are within 3 px of the oracle and read across the anchor classes' borders. (The same file as CX
  passed only because Cytoscape's CX reader does not match the `pos` column's 3.0 to the mapping's integer key 3 and
  draws every label centered, as graph-io's CX reader does too.) Test:
  `graphty-element/test/mesh-testing/label-opacity-offset.test.ts`.
- Horizontal label offset (`cx2-u2os-hierarchy`, 5 `label.offset`): not an import gap. Cytoscape writes CX2's
  generic family `sans-serif` as `Sans-serif`; Java has no font of that name and lays the text out in Dialog (DejaVu
  Sans): "Mitochondria " starts 73.0 px left of its node at 21.38 px, half its 146.0 px DejaVu Sans width. The oracle
  reader measured the text in the browser's own sans-serif face, 16 percent narrower, so the label read 12 px left of
  center. It now measures it in DejaVu Sans, as it does Helvetica, Dialog and SansSerif (b22c179af). Every element
  of the sample now passes its rows, but the sample still fails two raster floors in the same tree
  (`raster.label` 0.76 < 0.79, `raster.arrowhead` 0.93 < 0.94): not from these commits, since the sample has no
  turned label and the raster regions and the alignment come from graphty's scene and the nodes, never the oracle's
  text boxes. Not traced here. Test: `graphty-element/test/browser/oracle-freehep-text.test.ts`.

Still open, and why:

- Label wrap width (`cx2-us-returned-students` 3 `label.lines`, `cx2-ndex-90f78bcd`; `label-wrap-width`): the wrap
  rule is now known and graphty-element already follows it (with the session round's e37884b68); what differs is the
  measure. Java lays Cytoscape's labels out with whole-pixel hinted advances (a FontRenderContext without fractional
  metrics): replaying every label of both samples in Java 21 with Dialog at the file's size (238 labels,
  `tmp/style-specimens/cx2-r3/java/Wrap.java`), graphty-element's rule with Java's hinted widths gives Cytoscape's
  breaks for all 238, and with fractional widths it misses 2 ("American Institute of Electrical Engineers" is 199 px
  hinted, 207.18 fractional, against a width of 200). Hinted advances are not each fractional advance rounded (815 of
  1,190 label and size pairs differ, `W3.java`), and a browser canvas measures only fractional advances, so graphty-element
  would need the face's hinted advance table per pixel size to wrap these labels as Java does. graphty-element-render;
  not changed. The same measure decides `National Committee of Y.M.C.A. of China` (node 10195), which now fails:
  202 px hinted, so Cytoscape breaks it, but under 200 in the browser, so graphty-element keeps it whole since the
  session round's rule. On the 49 samples the round-3 run's 1,397 failing elements are 823 now and 32 samples pass
  (29), most of it the sibling rounds' chart and association work.
- Chart labels (`chart-labels`), `CROSS_DELTA` / `CROSS_OPEN_DELTA` (`comparator-arrow-class`), the size 24 arrowhead
  on a short edge and the patterned corpus edges (`comparator-edge-association`): the XGMML and session rounds own
  these shared changes (`styles/cytoscape/charts.ts`, `oracle/primitives.ts`, `oracle/associate.ts`, uncommitted
  while this ran; see the session round 3 section above). Not changed here, to keep one owner per shared file.
- Annotations (`annotation-scoring`; `images-charts-p5`, `-p7`, `mappings-bypass-p14`, `-p18`): the graphty strays
  on these sheets are not file annotations but bar-chart pieces, which graphty's drawn scene records as
  `annotation-shape` strays (p5 and p18: one green bar 24.5 px tall where Cytoscape's is 51.8; p14: three bars whose
  base sits below the oracle's). That is chart geometry (`node-custom-graphics`), not scoring.

## Specimen sheets: CX settings graph-io now reads, and the CX rows still open (fix round 3, 2026-10-20)

Measured with the oracle report on every `cx-` sample after rebuilding graph-io. Against round 3's scoring
(`tmp/style-specimens/gaps-round-3.md`): 1,684 failing elements on the 51 samples are 1,261 now, and 27 samples
pass (was 27; `edges-lines` and `ddram` now pass, while the sibling rounds' uncommitted chart and association work
moved others both ways).

Fixed:

- `parallel-2` on `edges-lines` (graph-io; `parallel-edge-spread`). Cytoscape desktop fans the edges between two nodes
  from the node whose view it made first (`DEdgeDetails.getAnchors`, ding 3.10.5, read decompiled: the pair's lower
  view SUID is the fan's source) and makes views newest node first (`SimpleNetwork.getNodeList`). Its CX reader
  (cx-support 2.8.4, `NiceCyRootNetwork.handleNodes` and `addElements`) creates a file's nodes and edges as
  `HashMap`s of their ids iterate, not in file order: `cx-specimen-edges-lines` and `-mappings-bypass-p10` hold the
  same order, but their ids hash in opposite orders, which is why they bowed to opposite sides (round 2's "nothing
  in the file decides the side"). The CX reader now works out that order (`Long.hashCode` spread by `HashMap.hash`,
  the table grown from 16) and gives each fanned edge its place in desktop's fan as a bend, the control point of a
  quadratic curve whose middle lies the fan spacing off the line on desktop's side. Replayed against both oracles,
  the rule gives every fanned edge's side on both sheets. A collection (`cySubNetworks`), whose elements desktop
  creates in list order, keeps the old fan; a file graphty wrote reads its fan back as written. `edges-lines` and
  `mappings-bypass-p10` pass; `cx-lianhe-affiliation` 19 -> 14 failing, `cx-nci-pid-rhoa` 22 -> 10. Test:
  `graph-io/test/formats/cx/fix-round-3.test.ts`.
- `cx-ddram` sub-pixel label lines (comparator; `comparator-text-metrics`): Cytoscape draws the further lines of
  wrapped labels at 0.15 px (node 6907); the association dropped the first line with its node as illegible but kept
  the others as free text no drawing could match. A free oracle text under one render pixel is no longer judged,
  by the rule labels already follow. 51 -> 0 failing; the sample passes. Test:
  `graphty-element/test/fidelity/oracle/compare-oracle-legible-texts.test.ts`.

Still open, and why:

- Label wrap width (`cx-ndex-90f78bcd` node 304542, `cx-lianhe-affiliation` node 240; `label-wrap-width`):
  "Various neuronal effects induced by elavl3, sox10, and mbp" at 25 px in a width of 200: Cytoscape breaks after
  "effects", graphty after "effects induced". "effects induced " is 199.95 px in the browser (kerned) and over 200
  in Java, which lays labels out with hinted whole-pixel advances and no kerning. The CX2 round 3 section above
  replayed both samples' labels in Java: graphty-element's wrap rule gives Cytoscape's breaks once widths are Java's
  hinted advances, which a canvas cannot measure; graphty-element would need the face's hinted advance table per
  pixel size. graphty-element-render; not changed.
- `cx-lianhe-affiliation` edge.route (13): the fan's side and depth now match Cytoscape's (311->264: 19.8 px on both
  sides), but graphty ends a curve on a diamond node's bounding box, not its outline (`Edge.reachOf` /
  `surfaceReach` know boxes and ellipses only): the route of 311->264 starts 12 px off Cytoscape's, on the diamond.
  graphty-element-render.
- Chart labels (`chart-labels`; `images-charts-p5`, `-p7`, `mappings-bypass-p18`), CROSS_DELTA and CROSS_OPEN_DELTA
  (`comparator-arrow-class`; `arrows`, `mappings-bypass-p11`, 4 each), the size 24 arrowhead on a short edge
  (`arrows-p2`, `mappings-bypass-p12`: the edge now pairs, its cap path is still a stray) and the patterned corpus
  edges (`comparator-edge-association`; `cx-syn-mappings`, `cx-syn-bypass`, `cx-polygenic-sle`, `cx-nci-pid-rhoa`):
  shared with XGMML, CX2 and sessions, whose rounds own the changes (`styles/cytoscape/charts.ts`,
  `oracle/primitives.ts`, `oracle/associate.ts`, uncommitted while this ran). Not changed here, to keep one owner
  per shared file; the CX reader goes through the same chart reader, so CX takes the fix with it.
- Annotations (`annotation-scoring`; `images-charts-p5`, `-p7`, `mappings-bypass-p14`, `-p18`): as on CX2 and
  sessions, the graphty extras on these sheets are bar-chart pieces graphty's scene records as `annotation-shape`
  strays (`node-custom-graphics`), not file annotations; scoring an annotation's shape, fill, text and rotation is
  still not built.

## Specimen sheets: XGMML settings graph-io now reads, and the XGMML rows still open (fix round 3, 2026-10-20)

Measured with the oracle report on every `xgmml-` sample: 36 of 52 samples have no failing element, and the failing
elements of the 52 fell to 649 (about 640 after round 2). The changes hold for CX, CX2 and sessions too, since the
four formats share the Cytoscape desktop reader.

Fixed:

- Pie and ring item labels (`images-charts-p5` `pie-item-labels`, `pie-item-label-font-size-20`, `-p7`
  `pie-item-labels-column`, `mappings-bypass-p18`): graph-io reads `cy_showItemLabels`, `cy_itemLabels`,
  `cy_itemLabelsColumn` and `cy_itemLabelFontSize` (1 px by default) into the node's further texts, each centered on
  its slice's middle, 0.62 of the disc's radius out, in #404040, as measured on Cytoscape's SVG. graphty-element's
  `node.shapeTexts` entries take a fourth item for their own size, color, font and turn. Two graphty-element defects
  hid them: the 2D camera stood only 10 units behind the nodes, so a text centered over a node more than about 14
  units across fell inside the near plane (fixed in `TwoDCameraController.zoomToBoundingBox`), and the comparator
  counted graphty's 0.9 px default-size labels as shown while it counted the oracle's 1 px ones as unreadable (fixed).
  `label.present` passes on all three sheets; their label properties need floors recorded.
- `CROSS_DELTA` and `CROSS_OPEN_DELTA` (`arrows`, `mappings-bypass-p11`): the comparator read the oracle's crossed
  delta as no class and graphty's as `other`; both read `cross-delta` now, and the sheets pass.
- Arrow size 24 on a short edge (`arrows-p2`, `mappings-bypass-p12` edge 8, `dream4-signaling`'s 8 short edges,
  `pathguide-allpathwaysdb` -27->-22): the comparator now ends the short line under a long head at the node the head
  reaches. A line-wide dot at the start of a 6 px line over an 11 px node (`arrow-on-wide-edge`, arrow shape NONE) is
  the line's own end, no longer a stray. All four samples pass.
- Patterned band edges (`syn-mappings`): every cap at a band line's end was dropped as a line cap (the band's width
  read as NaN); at a crowded node the cap goes to the line that stops at its base. `syn-mappings` `edge.arrow`
  failures fell from 144 to 42; more caps are now paired, so the shape, color and size rows judge more of them.

Tests: `graph-io/test/styles/cytoscape-charts.test.ts`, `graphty-element/test/browser/node-shape-texts.test.ts`,
`graphty-element/test/cameras/TwoDCameraController.test.ts`, and the comparator's
`compare-oracle-lines.test.ts`, `compare-oracle.test.ts` and `drawn-primitives.test.ts`.

Still open, and why:

- Bar, line, box and heat map chart labels (`images-charts-p7` 10 `label.present`, the chart strays of `-p5`, `-p6`,
  `-p7`, `mappings-bypass-p14`, `-p18`): Cytoscape draws them through JFreeChart, which shrinks the plot to make room
  for its axes; the tick units, label widths and 45 or 90 degree turns must be emulated in graph-io before the bars and
  labels land where Cytoscape puts them. The further texts' size, color and turn are the drawing hook.
- Crowded band ends in `syn-mappings`: at node 1269791 the caps of 1269795 and 1269797 are still read swapped
  (triangle and diamond), and 1269791->1269779's half arrow is read as graphty's crossed delta. Comparator.
- `syn-bypass` (26 failing), `aracne-mycccnd1` (26 edge rows), `wp4271-cy3-export` (22) were not investigated in this
  round. `pathguide-allpathwaysdb` -19->-23's box before its diamond is still unexplained.

## yEd's notched arrows, and the comparator's notch line (round 4, 2026-10-20)

The yEd GraphML and yEd Live GraphML samples are judged against draw.io's drawings standing in for yEd (see "yEd
sheets to export by hand"). Their three most failed properties were arrow shape (734 elements), node shape (478) and
label anchor (450). Most of the arrow shape failures were graph-io's, not draw.io's:

- Fixed in graph-io: yEd's `standard` arrow, the one yEd draws by default, is "a triangle with impressed bottom side"
  (https://docs.yworks.com/yfiles/doc/api/y/view/Arrow.html); `delta` is the plain triangle. yFiles for HTML's
  `STEALTH` (2.6's `DEFAULT`) is "an arrow that is notched on the side opposite its tip"
  (https://docs.yworks.com/yfiles-html/api/ArrowType/). graph-io read all three as the plain triangle; they are now
  `vee` (the yEd dialect, so yEd-written GML too, and the yFiles 3 reader). A stealth with a `{x:Null}` fill is the
  open triangle, the nearest outline graphty-element draws. The yEd writers write a triangle as `delta` and a vee as
  `standard`. draw.io agrees: its `mxGraphMlArrowsMap` maps `standard` and `DEFAULT` to its notched `classic`.
- Fixed in the comparator: an arrowhead was read as notched when its outline covered under 0.75 of its span a fifth
  of the way from its back. draw.io's `classic` is pressed in a quarter of its length, which covers exactly 0.75
  there, so the same arrow read `vee` on one edge and `triangle` on the next (`graphml-yfiles-html-stag-flowchart`
  judged 20 of 37 alike). The line is now drawn at 0.15, which puts the boundary at a notch about 0.19 of the length
  deep: draw.io's classic (0.25) is a vee, Pajek's arrow (a sixth) and vis-network's `arrow` (a tenth) stay
  triangles. A vertex lying exactly on a sampling line was also crossed twice (once by each side meeting there),
  which read a sampled vee as a triangle; the crossings are half open now. Planted defect "arrowhead notch filled in
  (vee<->triangle)" (`graphty-element/test/fidelity/mutations.ts`) keeps both caught.

Arrow shape after both (pass rate, before -> after; the same with nodes at draw.io's positions):
`graphml-cla-checker-graph` 0.004 -> 0.945, `graphml-yfiles-html-ss13-tree` 0.254 -> 1, `graphml-stm32-func`
0.289 -> 0.856, `graphml-scala-collection-mutable` 0.19 -> 0.976, `graphml-magiclantern-architecture` 0.321 -> 0.964,
`graphml-yed-voctomix` 0.34 -> 0.98, `graphml-synthetic-edges` 0.31 -> 0.87, `graphml-synthetic-nodes` 0.333 -> 1,
`graphml-yfiles-html-stag-flowchart` 0.541 -> 1.

What the arrow fix moved the other way, each a lowered floor in `oracle-floors.json` with this reason:

- yEd-written GML (`gml-yed-pmodel`, `gml-visualgraph-tree30`, `gml-dunnart-planar-orthogonal`, `gml-specimen-arrows-p2`
  and `-p3`): their stand-in is Cytoscape desktop, which draws GML's `standard` as a plain delta. yEd draws it
  notched, so these now fail arrow shape against the stand-in (pmodel 0.982 -> 0, tree30 and dunnart 1 -> 0) until
  yEd's own drawings replace them.
- Raster arrowhead and edge regions of the yEd and yEd Live samples drawn with standard or DEFAULT arrows, 0.01 to
  0.07 (`yed-live-graphml-specimen-edge-labels-p2` raster.edge 0.89 -> 0.85, `gml-visualgraph-tree30` 0.81 -> 0.74):
  graphty-element's vee is pressed in 0.6 of its length, yEd's standard about a quarter, so fewer pixels overlap than
  graphty's plain triangle did. graphty-element has one notch depth; a shallow vee (or a notch-depth setting) would
  draw yEd's standard, draw.io's classic and Pajek's arrow closer. Open.
- Unverified, and open: no drawing by yEd itself backs the vee's notch depth. Every yEd and yEd Live oracle is a
  stand-in (the programs behind the oracles are Cytoscape desktop, Gephi, Graphviz, draw.io, Pajek, sigma.js,
  Cytoscape.js, vis-network and OGDF), and the yFiles documentation quoted above says "impressed", not how deep.
  graphty-element's vee is notched 0.6 of its length; if yEd's standard is shallower, every yEd and yFiles default
  arrow is drawn wrong, and the lowered stand-in floors above would hide it. Measure the notch once from a real yEd
  export of `yed-graphml-specimen-arrows` (see "yEd sheets to export by hand") and set graphty-element's depth, or a
  depth setting, from it.
- `yed-live-graphml-specimen-mappings-bypass` `edge-key-default` (arrow shape 1 -> 0.8): its key's `<default>` style
  ends in a TRIANGLE, which graphty draws; draw.io ignores a key's `<default>` and draws its own classic, which the
  comparator used to read as a triangle by chance.

Still failing arrow shape, and why (all in `oracle-known-failures.json`):

- yEd `circle` (`graphml-stm32-func` 10 source ends, `yed-graphml-specimen-arrows` `*-circle`): draw.io's arrow table
  has `CIRCLE`, `white_circle` and `transparent_circle` but no lowercase `circle`, so it draws its default classic.
  graph-io reads the circle yEd draws. Stand-in error.
- yEd `short` and `convex` (`yed-graphml-specimen-arrows`, `yed-live-graphml-specimen-arrows-p2` `v2-*-short`): yFiles
  says only "short and broad" and "two curves forming a convex shape"; graph-io reads both as the triangle, draw.io
  draws `short` as its notched classicThin and `convex` as its default. Whether yEd's short arrow is notched is
  for the owner's yEd export to settle.
- yFiles 3 `OPEN` ("shaped like an angle bracket", `yed-live-graphml-specimen-arrows` `target-open`): graph-io reads it
  as the vee, the nearest cap graphty-element draws (it has no open chevron); draw.io draws its default arrow.
- `graphml-synthetic-edges` `n32->n2`: two parallel edges, one ending in `standard`, one in `delta`; the comparator
  pairs their arrowheads crosswise (each oracle cap with the other edge), so both fail. Comparator, open.

Node shape and label anchor, the other two most failed properties, are draw.io's: `graphml-yfiles-html-ss13-tree`'s
169 `node.shape` failures are a yFiles demo `GraphvizNodeStyle shape="ellipse"`, which graph-io reads as the ellipse
and draw.io, not knowing the style, draws as a rectangle; `graphml-cla-checker-graph`'s 84 `label.anchor` failures are
SmartNodeLabelModel labels centered in their nodes (ratios 0, box centered), which draw.io places about 5 px left of
the middle (its own label spacing). Both wait for the owner's yEd exports.

## json-vis-siblings: vis-network's nodes named by where it drew them (round 4, 2026-10-20)

`json-vis-siblings` stores no positions, and at the zoom vis-network fits its physics layout to (0.27) every label is
under vis-network's draw threshold, so its SVG names no node by id or by label. The comparator then related the two
drawings by their extents alone, paired 86 of graphty's 200 nodes with whatever body lay near each by chance, and
the fit through those pairs called the layouts related (rms 0.008): it judged positions, edges and node bodies as
if the layout matched, left the other 114 nodes extra and their bodies strays. The earlier rows that called this an
import defect, or said vis-network hides some nodes, were wrong: vis-network draws all 200 nodes and 284 edges, in
file order (its 200 node fills match the file's colors one for one).

- Fixed in the oracle tool: `web-oracle.mjs` records where vis-network drew each node (`drawn` in the
  `.oracle.json`: id, center from `getPositions` through `canvasToDOM`, box from `getBoundingBox`). Regenerated for
  `json-vis-siblings` only; its SVG and PNG are byte-identical. The other vis-network oracles pick it up when next
  regenerated (their labels already name their nodes).
- Fixed in the comparator: a vector oracle with `drawn` names each shape, picture or text centered on a drawn node as
  that node (`nameDrawnNodes`, `graphty-element/test/fidelity/oracle/associate.ts`), as markup would. And where
  graphty laid every node out itself (`seededNodeCount` 0), a geometric association seeded by the extents alone pairs
  nothing, since such pairs are chance (`associate-drawn-nodes.test.ts`). Planted defect "two nodes' fills swapped"
  (`mutations.ts`, `json-vis-siblings` added to the mutants' default samples) is absorbed by known failures without the
  fix and caught with it.

After (before -> after): nodes associated 86 -> 200, edges 21 -> 284, strays 351 -> 31, failing elements 964 -> 568;
the layouts are now unrelated (rms 0.15). node.fill 0.453 -> 1, node.stroke 0.314 -> 1, node.width 0.465 -> 1,
node.extra 0.43 -> 1, edge.present 0.174 -> 1, edge.color 0.381 -> 1, edge.arrow 0.667 -> 0.951, edge.arrowShape
0.3 -> 0.955. With graphty's nodes at vis-network's positions (`@matched`): node.position 0.82 -> 1, edge.route
0.077 -> 0.743.

Lowered floors (in `oracle-floors.json` `lowered`, with this reason): node.position 0.012 -> 0 and frame.mirror,
frame.rotation and the raster regions no longer judged (the layouts are unrelated; the old rates came from the chance
pairs); edge.curve 0.905 -> 0.764 (`@matched` 0.808 -> 0.764), now judged on all 284 edges.

Still failing, open:

- edge.curve (67 edges): vis-network draws its default `smooth: { type: "dynamic" }` curves, graphty straight lines.
  The file sets no smooth option; graph-io does not read vis-network's default curve.
- edge.width (all 284): vis-network's 1-wide edge at its zoom is 0.3 px, graphty's 0.245 px against the same node
  spacing (ratio 0.82, tolerance 0.9).
- edge.arrow (42 target ends) and stray.present (31 shapes): about 5 x 3 px arrowheads at crowded nodes that the
  comparator gives to no edge. Comparator, open.

## Cytoscape desktop's patterned lines carried to their own arrowheads (round 4, 2026-10-20)

Cytoscape desktop exports a zigzag, sine-wave, slashes, double or arrows line as a filled band, and stops it up to a
piece of its pattern short of its arrowhead's base; it draws each edge's arrowheads right after its line. The
comparator looked for a band's nodes only within an end reach of the band's axis ends, so a band 20 px or more short
of its node, or nearer a neighbor's box than its own node, was left unpaired. The free band was then taken for a
neighbor's arrowhead: `cys-syn-mappings` 186->198's target cap was read as a "half" 346 px long, colored like the
zigzag below it, and carried 186->198's line on to x = 802, past its node at x = 663. The band's own arrowheads went to
whichever line ended nearest, and what was left became strays. Fixed in the comparator
(`graphty-element/test/fidelity/oracle/associate.ts`, tests in `associate-patterned-ends.test.ts`):

- The shapes drawn right after a line (its two caps; a dot no wider than the line is its own end) carry an end that is
  not on a node's outline on to their tip, and they cap that line, whichever neighbor's end lies nearer them. A line
  they would carry to a pair graphty does not draw is read as it was without them (an arrow annotation in
  `xgmml-wp4271-cy3-export`).
- A band's end reaches half its swing farther, as its drawn pieces do.
- A band is no arrowhead an end reaches its node through (`cys-syn-mappings` 420->426: an open half circle at the end
  of a double line, read through that line to the far node, stood in for the edge).
- An end beyond a flat ellipse is judged by its distance along the ray from its center (35 px off a 38 x 15 ellipse's
  end was read as 19, `xgmml-syn-mappings` 345->360).
- A wide sine wave Cytoscape draws a whole period per piece (`cys-syn-mappings` 432->450, 225->210) is read as a sine
  wave, not as arrows: a period lies off its mirror image by half its thickness or more, an arrow by a fraction of a
  pixel (`primitives.ts`).
- Planted defect "arrowhead color changed on lines drawn in pieces" (`mutations.ts`), caught on all four syn samples.

Before -> after (whole oracle report, every sample re-run; no other sample's score moved apart from the run-to-run
raster and layout noise graphty's own drawing already showed):

- `cys-syn-mappings`: failing elements 167 -> 45, strays 31 -> 5; edge.extra 0.936 -> 0.979, route 0.878 -> 0.985,
  dash 0.962 -> 0.993, arrow 0.896 -> 0.99, arrowShape 0.791 -> 0.984, arrowColor 0.815 -> 0.992. 186->198 now
  passes every property (its target cap the #b44c42 triangle 18.8 px long, its line ending at x = 649).
- `cx-syn-mappings`: 171 -> 47 failing, strays 34 -> 5; arrowColor 0.797 -> 0.992, arrowShape 0.783 -> 0.984; 255->279
  passes; 462->192 fails only arrow length and width (Cytoscape draws its caps larger).
- `cx2-syn-mappings`: 207 -> 82, strays 39 -> 12; `xgmml-syn-mappings`: 170 -> 45, strays 30 -> 5; the same rises.
- The syn-bypass family: `cys` 21 -> 17, `cx` 27 -> 24, `cx2` 30 -> 25, `xgmml` 24 -> 17 failing elements.
- Other Cytoscape and draw.io drawings whose caps follow their lines: `cx2-signor-aml` 180 -> 120, `cx-nci-pid-rhoa`
  10 -> 1, `json-cyjs-graphmaker` 19 -> 4, `cx2-wp1449-tlr` 137 -> 130, `graphml-synthetic-edges` 109 -> 106,
  `graphml-stm32-func` 130 -> 126.

Lowered floors (each with its reason in `oracle-floors.json`): `cx-radiation-bibliography` arrowToSpacing 0.006 -> 0 and
(matched) arrowLength and arrowToSpacing 0.012 -> 0.006, more of its arrowheads judged and failing as nearly all already
did; `cx2-syn-mappings` stray.present 0.093 -> 0.077, over 13 free shapes instead of 43; `graphml-yfiles-html-ss13-tree`
arrowFill 0.171 -> 0.17 and `yed-graphml-specimen-arrows` arrowFill 0.944 -> 0.9, a cap judged for the first time that
fails as its twins do (draw.io, the yEd stand-in, draws them hollow).

Still open:

- `cx-syn-bypass` / `cx2-syn-bypass` 2235->2244: one path holds the slashes of several lines (1715 pieces), so no one
  band of it is the edge.
- `xgmml-syn-bypass` 1273092->1273088: the only band in its color is a slashes band of 716 pieces running from x = 468,
  past 1273092, so no band ends at both nodes; not investigated further.
- `*-syn-mappings` 189->192 (a solid line 5 px wide): no line of Cytoscape's SVG is read there yet; not investigated
  further.
- Now judged and failing as import gaps: Cytoscape's mapped arrow sizes on the syn-mappings family (49 to 92 px heads
  where graphty draws 13 to 22, e.g. 441->426, 408->414, 345->360), and half arrows drawn as one long barb.

## sigma.js drawings judged by their discs and at their own framing (round 4, 2026-10-21)

The graphology and Gephi JSON samples are judged against sigma.js's own drawing (a PNG with sigma's record of where it
drew each node and which labels it drew). Two comparator defects there are fixed (`compare-oracle.ts`, `associate.ts`):

- A node sigma paints over was told by its box lying inside a later, opaque node's box (`rasterScene`). A disc in a
  corner of a bigger disc's box still shows there: `json-graphology-synth` n14, n26 and n66 sit in the corners of n25,
  n37 and n77 and show 29 px of themselves, but were dropped from sigma's side, so the edges ending at them lost that
  end (`edge.route` judged them uncut there). Now the disc must lie inside the later disc. Planted defect: "disc in a
  later disc's box corner removed" (absorbed under the old rule, caught now).
- A label under sigma's node-size rule (`labelRenderedSizeThreshold`, and its label grid; graphty-element's
  `node.labelMinNodeScreenSize`) shows while its node is drawn so many px across, and how many px a node is across
  depends on how large each side frames the graph: a camera choice, judged apart by `frame.zoom`. The drawn scene now
  records each such label with its node's size on screen (`DrawnLabel.nodeSizeRule`, `PNode.sizedLabel`), and the
  comparator shows it where sigma's framing would (`labelAtScale`); a node within 1 percent of its rule may go either
  way, since sigma's grid puts the rule of a cell's second label exactly at its first framing. `json-gephi-worldcup`
  label.present 728/736 -> 736/736: the 8 labels (218, 342, 366, 404, 422, 432, 44, 54) on nodes sigma draws 12.22 px
  across and graphty, framing the graph 1.109x smaller, 11.02 px, are judged at sigma's framing; the known failures are
  cleared and the floor raised to 1. Planted defect: "node-size label rule ignored" (json-graphology-synth,
  graphology-specimen-labels, both added to the default mutant samples).

Still open: graphty frames a sigma file 1.109x (worldcup) to 1.217x (graphology-synth) smaller than sigma, which fits
the node positions into the canvas less its 30 px `stagePadding`; graphty-element's own fit is the consumer's choice
(`fitInsets`, `fitBounds`) and offers no fit by node centers alone (`json-graphology-synth` frame.zoom, recorded).

## Gephi's self-loops drawn at their own size (round 4, 2026-10-21)

Gephi draws a self-loop as an arc of a circle of radius r = half the node's size plus a third of the loop's stroke,
centered r right of and r above the node's center (gephi PreviewPlugin `EdgeRenderer.SelfLoopEdgeRenderer`; on
`gexf-specimen-arrows` the SVG arc's radius is 2.6435 for a size-4 node and a 1.95 stroke). graph-io writes that circle
as the loop's bends, in fractions of the node's half size, and that was right. graphty-element measured the bends
against the node's fill instead of its size: Gephi's nodes carry an inside border (0.16 of the size), which draws the
fill in, so every loop came out 0.84 times Gephi's (`edge.curve` 0.458 against 0.646). graphty-element now measures a
self-loop's bends and an edge's ports against the node's outline (`Node.outlineHalfExtents`: the drawn surface plus
what a centered or inside border took from a fitted mesh).

Every Gephi loop specimen now passes `edge.curve`, plain and position-matched: `gexf-specimen-arrows` and `-p2` to
`-p7`, `gexf-specimen-edge-labels` and `-p2` to `-p15`, `gexf-specimen-edges-lines` and `-p2` to `-p14` except `-p9`,
`gexf-synth-nx-viz` (`v1`, also `edge.route`) and the 11 loops of `gexf-graphology-rio` (`edge.curve` 0.988 to
0.998, `edge.route` 0.998 to 1).

Still open: `gexf-specimen-edges-lines-p9` (a loop of weight 4.5, stroke 5.85): oracle. Gephi extends the arc past
where it meets the node by the round cap's angle, asin(stroke / 2r) on each side; on this thick loop the extended arc
covers more than a full turn, and the SVG arc command (`A 3.9305,3.9305 0 1,1`) between its two near-coincident ends
then takes the other circle through those ends, centered down and to the left of the node, under it. Gephi's own
preview (`Arc2D`) draws the loop up and to the right, where graphty draws it.

## vis-network's dynamic curves drawn through support points (round 4, 2026-10-21)

vis-network's default edge, `smooth: { type: "dynamic" }`, is a quadratic curve through a hidden support node that its
physics moves with the nodes: two springs of half the edge's length (`physics.<solver>.springLength`, or the edge's own
`length`) tie it to the edge's ends, every node and every other support node pushes it away, and central gravity pulls
it in (vis-network 9.1.9 SpringSolver, BarnesHutSolver, ForceAtlas2BasedRepulsionSolver and their central gravity
solvers). graph-io read such an edge as straight, so the five corpus files that keep vis-network's defaults and store
no positions (`json-vis-transparency`, `-lesmiserables`, `-world`, `-unix`, `-siblings`) drew every edge as a 2-point
line where vis-network bows them. The bow needs no position in the file: stepping vis-network's own forces with the
nodes held where vis-network drew them puts the curve where vis-network did on 99 of 100 transparency edges.

graph-io now reads a dynamic edge, wherever physics runs for it, as curved through a support point with its forces
(neutral `supportModel` "barnesHut" or "forceAtlas2", `supportSpringLength`, `supportSpringConstant`,
`supportRepulsion`, `supportCentralGravity`; none under `physics: false`, an edge's own `physics: false`, or a
hierarchical layout, which turns every dynamic curve static). graphty-element draws them through the new edge style
options `line.supportModel`, `line.supportSpringLength`, `line.supportSpringConstant`, `line.supportRepulsion`,
`line.supportCentralGravity` and `line.supportUnit` (channels of the same names): it settles each support point under
those forces over a Barnes-Hut tree built as vis-network builds its own, with the nodes where its own layout (or the
reader) put them, carries each point along its edge as the nodes move, and holds `waitForStableFrame()` until the
points rest. Edges between the same two nodes bow apart by the support points' own push.

| sample (edge.curve; route where judged) | before             | after              |
| --------------------------------------- | ------------------ | ------------------ |
| json-vis-transparency @matched          | 0.48; route 0.58   | 1; route 0.98      |
| json-vis-world @matched                 | 0.638; route 0.725 | 1; route 0.986     |
| json-vis-unix @matched                  | 0.776; route 0.776 | 1; route 0.98      |
| json-vis-siblings @matched              | 0.796; route 0.757 | 0.986; route 0.968 |
| json-vis-lesmiserables @matched         | 0.617; route 0.664 | 0.949; route 0.885 |
| json-vis-transparency (own layouts)     | 0.48               | 0.64               |
| json-vis-world (own layouts)            | 0.638              | 0.754              |
| json-vis-unix (own layouts)             | 0.776              | 0.837              |
| json-vis-siblings (own layouts)         | 0.764              | 0.975              |
| json-vis-lesmiserables (own layouts)    | 0.617              | 0.843              |

No other property of these samples, or of the 16 vis-network specimen sheets, moved (the sheets set `physics: false`).

`gexf-hsk-chars`, named with these in the round's evidence as "edges drawn as collinear 5-point lines", already passes
every edge (edge.curve 1332/1332, plain and @matched): Gephi's curve is drawn as an arc of the circle through both node
centers (`line.arcRadius`, 1 / 1.2 of their distance) wherever graphty's layout puts the nodes, so it needs no
position from the file. Its floor is raised from 0.14 to 1.

Still open:

- On a file with no positions each program lays it out itself, so a dynamic edge bows by graphty's neighbors, not
  vis-network's: the plain (own layouts) rows judge one layout's crowding against another's, as node.position was
  before it stopped being judged there. The @matched rows are the measure of the setting.
- Elements newly failing (recorded in `oracle-known-failures.json`): `json-vis-transparency` 11->50 (own layouts);
  `json-vis-lesmiserables` 22->21 and 68->25 (own layouts), 22->21 and 56->49 curve, 22->21, 51->49 and 56->49 route
  (@matched); `json-vis-siblings` @matched route Ilana Melcher->Casondra Brimmage. Stepping vis-network's forces in
  Python with every node fixed where vis-network drew it misses the same lesmiserables edges (56->49: 0.084 against
  0.006): vis-network stopped its simulation with those nodes still moving, so their support points sit where no
  rest puts them. 22->21 is the pair 21-22, whose two support points vis-network separates by a seeded random nudge.
- vis-network's `repulsion` and `hierarchicalRepulsion` solvers are not modeled: their dynamic edges are drawn straight.
- A hierarchical layout turns dynamic curves into its direction's static curve (`horizontal` or `vertical`); graph-io
  draws them straight.

## Graphviz's own routes drawn for a DOT file without positions (round 4, 2026-10-21)

A DOT file that stores no positions is laid out by graphty-element with Graphviz's own engine (dot, unless the file
names another). graphty read back only where Graphviz put the nodes and drew every edge as a straight line between
them, so each spline Graphviz routes round the nodes in its way, and each orthogonal route of `splines=ortho`, was
drawn straight: `dot-profile` placed its nodes where Graphviz did (fitted error 0.002 of the diagonal) and still failed
edge.curve on 18 of 85 edges.

graphty-element now names each edge it hands Graphviz (`id="e<k>"`), reads the route Graphviz lays it from the `-Tjson`
answer (the edge's `pos`, read into bends by graph-io's new `graphvizPosBends`, the reading a DOT file's stored `pos`
gets), and draws the edge along it. A layout hands a route to its edges through `EdgePosition.bends` (new, optional,
`along,across` pairs as `line.bends` holds them), so any layout engine can route its edges; a route the edge's style
stores wins over it. Two defects this exposed are fixed with it:

- Graphviz draws a straight line (`splines=false`) up to half a point off the line between the two nodes' centers
  (`dot-real-linux-kernel`'s VFS -> mmap, 0.61 points off a 345-point line). graph-io read that as a bent route; a
  route within one point of the line is now straight, for a stored `pos` and a laid one alike.
- graphty hands Graphviz the node shapes it draws only as circles and boxes, so a route can end a hair outside a
  drawn triangle or pentagon, and the stub from there to the outline turned the arrowhead across the line
  (`dot-real-depcruise`, four heads measured 1.55 times Graphviz's width). A bent line now drops the route's points
  that lie under its arrowheads (within half a head's length of the end), so a head points along the route it covers.

Against the programs' drawings (plain and @matched, before -> after):

| sample                   | property        | plain          | @matched       |
| ------------------------ | --------------- | -------------- | -------------- |
| dot-profile              | edge.curve      | 67/85 -> 85/85 | 67/85 -> 85/85 |
| dot-profile              | edge.route      | 39/85 -> 56/85 | 68/85 -> 85/85 |
| dot-real-depcruise       | edge.curve      | 206/652 -> 650 | 206/652 -> 650 |
| dot-real-depcruise       | edge.route      | 158/652 -> 522 | 212/652 -> 642 |
| dot-real-siblings        | edge.curve      | 241/284 -> 283 | 241/284 -> 282 |
| dot-real-siblings        | edge.route      | 8/284 -> 14    | 245/284 -> 275 |
| dot-real-crazy           | edge.curve      | 43/49 -> 47    | 43/49 -> 47    |
| dot-synth-nodes          | edge.curve      | 95/108 -> 106  | 95/108 -> 106  |
| dot-synth-edges-clusters | edge.curve      | 57/100 -> 81   | 56/100 -> 80   |
| dot-synth-edges-clusters | label.alongLine | 13/54 -> 27    | 12/54 -> 26    |

No positioned DOT or GML sample moved. Still open, recorded in `oracle-known-failures.json` and, where a floor fell,
in `lowered` with the reason:

- graphty's Graphviz run lays the nodes out as the shapes graphty draws (no label text, circles and boxes), so where
  Graphviz's own drawing routes round larger, label-sized or distorted nodes the routes differ: `dot-real-crazy`
  @matched edge.route 9 -> 8 of 49 (3 edges newly bow where Graphviz drew them nearly straight), and a few edges of
  `dot-synth-edges-clusters` and of the plain views of `dot-real-depcruise` and `dot-real-siblings`.
- An edge label hangs from the middle of the route, not where Graphviz placed it (`lp`, which a layout graphty runs
  does not read): `dot-synth-edges-clusters@matched` label.offLine 21 -> 20 of 54.
- `dot-synth-nodes` n_hsv2 -> n_pen5: the orthogonal route's last stretch into pen5 is shorter than the arrowhead,
  and the comparator measures the head across it (edge.arrowWidth 1 of 108).
- A patterned (dashed or dotted) line keeps its straight line under a laid route.
- edge.width on `dot-real-crazy` (graphty 0.84 of Graphviz's width, against the fitted positions) is not a route or
  unit defect: graphty's Graphviz run spaces the nodes about 1.25 times wider than Graphviz's own drawing, in units of
  the line width, because the nodes graphty hands it are not the nodes Graphviz sized to their labels (node.width
  20/41). `dot-real-depcruise`'s edge.width passes (652/652).

## Round 4 verification: comparator readings fixed and new properties judged (2026-10-22)

A check of round 4's comparator found readings that hid or invented defects. Fixed, each with a unit test that fails
on the old comparator:

- A Cytoscape desktop double line (PARALLEL_LINES), exported as short pieces on two rows, was read as a zigzag from
  one row to the other, and the double edges' arrowheads off the zigzag's end. It is read midway between the rows
  (cx-, cx2-, cys- and xgmml-specimen-edges-lines, the mappings-bypass-p10 sheets and the syn-mappings samples pass
  their curve and arrow floors again).
- A Graphviz stub wholly under its arrowhead was capped at the wrong end (Pajek's rule); the head now caps the end it
  points to where the nodes are drawn apart (dot-real-softmaint, dot-real-depcruise).
- A line between two nodes drawn on one another is named the way graphty runs the edge (cx-radiation-bibliography
  30 -> 44, cx2-signor-aml 57 -> 67), so its arrowheads are judged at their own ends.
- Cytoscape desktop's labels drawn as glyph outlines (cx-polygenic-sle) are one label each, drawn where graphty draws
  text over them (stray.present 0 -> 0.984), not two strays.
- Graphviz's inv on a spline that kinks at its end is read along its own axis (it read "other" against itself).
- A compound member's label grows its group by Cytoscape.js's 2 px in font pixels, not layout units
  (json-cyjs-synth-edges and -saved: group.box 0 -> 1, group.present 0.75 -> 1).

Newly judged, so defects that passed now fail (each a planted defect in mutations.ts):

- edge.arrowLength and edge.arrowWidth within [0.85, 1.18] (was [0.67, 1.5]) or a render pixel. Real misses now
  shown: Cytoscape desktop's source heads drawn about 23% small (cx/cx2/cys/xgmml-specimen-arrows and
  mappings-bypass-p11), Graphviz's box heads 25% large (dot-specimen-arrows), vis-network's crow and inv_triangle
  34% wide.
- edge.arrowPlace: graphty's head on its line's end (no gap, not back along the line, not aside).
- edge.arrowParts: stacked heads (Graphviz's normalnormal, boxdotnormal, crowtee), which graphty draws as one.
- edge.dashPeriod: a dash pattern's period and drawn share (Graphviz's dotted is drawn nearly solid, Cytoscape's
  dashes about 1.8 times too long).
- stray.extra on free text graphty draws, a body-less node's label among them.
- edge.route judges each end where it sits on its own node (node.position judges where the node is), and its
  allowance is capped at the end nodes' smaller side (at least ten render pixels), so a long line sent through
  another node fails. dot-real-depcruise falls furthest (graphty's own Graphviz run lays out nodes without their
  label text, so its splines differ; see the section above).
- edge.curve is not judged between two programs' own unrelated layouts of a file with no positions (vis-network's
  dynamic curve bends with its physics), as node.position is not.

Left open: a dashed or patterned line is always drawn straight (PatternedLineMesh), so a curved dashed edge fails
edge.curve (cx2-signor-aml 27 -> 68); graphty's vee is notched 0.6 of its length and reads as thin barbs where
vis-network, Graphviz and Cytoscape.js draw a broad head; the drawing defects the new properties expose. Each failing
element is in oracle-known-failures.json, and each lowered floor in oracle-floors.json's lowered with its reason.

## Round 4: the comparator, edges and layouts (2026-10-22)

Round 4 worked on three things: the oracle comparator's own readings (so a defect is neither hidden nor invented),
how edges are drawn, and how layouts the programs make are carried. The sections above, from "yEd's notched arrows"
on, hold each change and its evidence; this one gives the totals and what is left.

Totals over all 563 samples (461 specimen sheets, 102 corpus files), from a full run of the branch head
(`graphty-element/test/fidelity/oracle-report.test.ts`):

| measure                                             | final report, 2026-10-20 | round 4 |
| --------------------------------------------------- | ------------------------ | ------- |
| samples with no failing element                     | 273                      | 309     |
| failing elements, plain and @matched views together | 21,184                   | 20,209  |
| failing elements, plain view                        | -                        | 10,359  |
| failing elements, @matched view (559 samples)       | -                        | 9,850   |

The failing count fell while the comparator judges more: arrowhead length and width within [0.85, 1.18], where the
arrowhead sits, stacked heads, the dash period and drawn share, free text graphty draws, and a route's allowance capped
at its end nodes' smaller side. Each of these turned elements that used to pass into failures; the totals are net of
them. The most failed properties now are edge.route (1,479 plain), label.anchor (1,449), node.stroke (1,291),
edge.arrow (1,174) and stray.present (1,169).

Fixed in the comparator (each with a unit test that fails without the fix, and a planted defect in `mutations.ts`
where one applies):

- Arrowheads: yEd's notched arrows read as notched (the notch line at 0.15); a head under a covered stub capped at
  the end it points to; head parts counted by place, so Graphviz's stacked heads are seen.
- Edges: a Cytoscape desktop double line read midway between its two rows, not as a zigzag; a patterned band carried
  to its own arrowheads; a zigzag round a small node read as a zigzag; a route drawn as runs and corners joined; a
  line between two overlapping nodes named the way graphty runs it.
- Labels and strays: glyph-outline labels read as one label each; free text judged by its words; a compound member's
  label bounding its group in font pixels, as Cytoscape.js does.
- Layouts: sigma.js labels judged at sigma's framing; edge.curve not judged between two programs' own unrelated
  layouts, as node.position is not; vis-network nodes named by where vis-network drew them, not paired by chance.

Fixed in graph-io and graphty-element (edges and layouts):

- yEd's `standard` and yFiles' `STEALTH` arrows read as notched (`vee`).
- vis-network's default dynamic curves drawn through support points under vis-network's own forces (new
  `line.support*` options); Gephi self-loops measured against the node's outline.
- A DOT file without positions drawn along the routes Graphviz lays (`EdgePosition.bends`, graph-io's
  `graphvizPosBends`); a placed DOT file whose edges store no route has Graphviz route them (`neato -n2`, the fixed
  layout's `edgeRoutes: "graphviz"`); a seeded layout gives the same drawing however the data arrives.
- Pajek arcs: arrowhead stops, the bow Pajek gives two arcs between the same vertices, `ap` as a distance; the Pajek
  writer now writes a line's arrowhead size `s` (it dropped it, so a re-read Bezier arc ended at a default-size head
  and its bends moved), and a file graphty wrote keeps its routes in its block instead of being bowed again.

Still open:

- A dashed or patterned line is drawn straight (PatternedLineMesh), so a curved dashed edge fails edge.curve, and a
  patterned line keeps its straight line under a laid Graphviz route.
- graphty's vee is notched 0.6 of its length and reads as thin barbs where vis-network, Graphviz and Cytoscape.js draw
  a broad head; Cytoscape desktop's source heads are drawn about 23 percent small, Graphviz's box heads 25 percent
  large, vis-network's crow and inv_triangle 34 percent wide; graphty draws stacked heads as one.
- graphty's Graphviz run lays nodes out as the shapes graphty draws (no label text), so its routes differ where
  Graphviz routes round label-sized nodes (`dot-real-depcruise`, `dot-real-crazy`); an edge label hangs from the
  middle of a laid route, not at Graphviz's `lp`.
- The recommendation asks Graphviz to route a placed DOT file even when every edge already stores its `pos`
  (`parsing_test.dot`); the stored routes win, so the run only costs time.
- vis-network's `repulsion` and `hierarchicalRepulsion` solvers and hierarchical static curves are not modeled.
- The full oracle run is not green against its own records: 30 samples have a property below its recorded floor or an
  element failing that `oracle-known-failures.json` does not list (for example `gml-need4stacks261` edge.arrow, whose
  pass rate equals its floor but whose 178 newly judged failing heads were never added; `cx-syn-mappings` and its
  CX2, session and XGMML copies at label.alongLine 0.971 against a floor of 1), and the drawn-scene and mutant checks
  report 11 more (a planted glow the border scorer misses, seven planted label and gradient defects now caught that are
  still listed as untestable). The aggregate totals above are identical to the run the floors were recorded from, so
  these are records that do not match that run, not new regressions; they need a recording pass with a reason for
  each lowered floor.

## Round 5: comparator audit, arrowheads, routes, labels, outlines and charts (2026-10-28)

Round 5 started from an audit of the comparator (does it hide real defects, does it invent false ones), then fixed
the most damaging drawing problems it measured. Every number below comes from a full run of the oracle comparison
(`graphty-element/test/fidelity/oracle-report.test.ts`, 563 samples, NVIDIA path) and counts only drawings made by the
file's own program. Stand-in drawings (79 samples, mostly draw.io for yEd files) and raster oracles are left out: they
are not the judge, and their 5,560 failing elements did not change in this round.

Three trees were measured:

- **before**: origin/master 780b7edbe6, before round 5, with the old comparator.
- **comparator only**: the round-5 comparator (#4246) on that same drawing. Every change from "before" here is the
  comparator reading the drawings differently, never graphty drawing differently.
- **after**: origin/master fea3503e96 (which holds the comparator #4246 and the arrowheads #4254) merged with the four
  round-5 pull requests still open: #4259 (dashed routes), #4265 (label pairing), #4251 (DOT table outlines) and #4250
  (Cytoscape chart marks). The Graphviz label-size branch is not in it (no pull request; see "Decisions pending").

The after tree equals the comparator-only run plus each pull request's own measured change, element by element, on
every sample: the branches do not interact.

### Totals

| measure (real-program oracles)                    | before                  | comparator only        | after                  |
| ------------------------------------------------- | ----------------------- | ---------------------- | ---------------------- |
| real files: failing elements                      | 3,597 of 32,574 (11.0%) | 2,879 of 32,546 (8.8%) | 2,491 of 32,512 (7.7%) |
| real files: clean samples                         | 23 of 80                | 20 of 80               | 20 of 80               |
| specimen pages: failing elements                  | 1,308 of 20,094 (6.5%)  | 1,049 (5.2%)           | 800 (4.0%)             |
| specimen pages: clean                             | 261 of 377              | 261                    | 271                    |
| Cytoscape desktop pages clean in all four formats | 31 of 41                | 31                     | 33                     |
| old combined total (every oracle, stand-ins too)  | 10,469 (14.8%)          | 9,492 (13.4%)          | 8,855 (12.5%)          |

The oracle side's element count moves a little (32,574 to 32,512) because the comparator now keeps apart shapes it
used to merge (two Tokyo stations drawn 0.9 px apart) and merges shapes it used to split.

Clean real files went down by three in the comparator step and stayed there: `cx-repro-unplaced-boxes`,
`json-vis-world` and `json-vis-transparency` were passing only because the old comparator did not judge what is wrong
with them (below). The ten newly clean specimen pages are all arrowhead pages: cx, cx2, cys and xgmml
`specimen-arrows`, cx, cys and xgmml `specimen-mappings-bypass-p11`, `gml-specimen-arrows-p7` and `-p8`,
`vis-network-specimen-arrows`.

### Per property (real-program oracles, failing elements)

| property                  | before   | comparator only | after   | what moved it                                                                          |
| ------------------------- | -------- | --------------- | ------- | -------------------------------------------------------------------------------------- |
| stray.present             | 999      | 709             | 495     | comparator (annotation heads, vis arrowheads); Cytoscape chart colors and pies (#4250) |
| label.anchor              | 952      | 162             | 90      | comparator (tiny-label boxes, Calibri); twin pairing (#4265)                           |
| edge.width                | 622      | 622             | 621     | not worked on (#4268; the DOT part goes with #4203)                                    |
| node.position             | 468      | 468             | 466     | not worked on (DOT: #4203, blocked)                                                    |
| edge.route                | 371      | 373             | 332     | twin pairing (#4265), dashed routes (#4259)                                            |
| node.sizeToSpacing        | 47       | 259             | 246     | comparator newly judges own layouts (+212 cx, #3103); DOT tables (#4251)               |
| edge.arrowPlace           | 209      | 58              | 58      | comparator (Pajek mid-line heads)                                                      |
| node.width                | 206      | 205             | 145     | DOT tables (#4251), twin pairing (#4265)                                               |
| stray.extra               | 168      | 177             | 177     | comparator (graphty's own annotation heads now seen)                                   |
| node.height               | 136      | 135             | 77      | DOT tables (#4251), twin pairing (#4265)                                               |
| edge.arrowLength          | 122      | 123             | 14      | arrowheads (#4254)                                                                     |
| edge.arrowWidth           | 120      | 121             | 14      | arrowheads (#4254)                                                                     |
| edge.extra / edge.present | 127 / 92 | 127 / 92        | 77 / 42 | twin pairing (#4265: json-cyjs-perf, json-cyjs-tokyo)                                  |
| label.offset              | 108      | 109             | 45      | twin pairing (#4265)                                                                   |
| node.stroke               | 79       | 74              | 12      | comparator (vis database outline); DOT tables (#4251)                                  |
| edge.arrowToSpacing       | 71       | 71              | 11      | arrowheads (#4254)                                                                     |
| edge.label                | 50       | 50              | 21      | twin pairing (#4265)                                                                   |
| edge.curve                | 36       | 41              | 39      | comparator newly judges own layouts (+5 vis); dashed routes (#4259)                    |
| edge.dash                 | 39       | 39              | 36      | dashed routes (#4259)                                                                  |
| edge.color                | 21       | 21              | 7       | twin pairing (#4265)                                                                   |
| node.fill                 | 14       | 14              | 7       | DOT tables (#4251)                                                                     |
| edge.arrowParts           | 14       | 18              | 18      | not worked on: stacked heads (#4267)                                                   |

Unchanged: label.present 100, label.lines 65, node.strokeWidth 63, label.size 45, edge.arrowShape 41, node.shape 39 to
41, edge.dashPeriod 30, group.box 28.

### Per format (failing elements: real files / specimen pages)

| format      | before      | comparator only | after       |
| ----------- | ----------- | --------------- | ----------- |
| cx          | 215 / 239   | 354 / 176       | 332 / 118   |
| cx2         | 199 / 237   | 198 / 174       | 173 / 118   |
| cys         | 68 / 239    | 68 / 176        | 48 / 118    |
| xgmml       | 69 / 239    | 68 / 176        | 49 / 118    |
| dot         | 1,129 / 206 | 1,074 / 206     | 1,072 / 199 |
| json        | 1,518 / -   | 864 / -         | 564 / -     |
| pajek       | 309 / 36    | 163 / 32        | 163 / 32    |
| gml         | - / 17      | - / 17          | - / 11      |
| vis         | - / 27      | - / 24          | - / 18      |
| gexf        | 90 / 2      | 90 / 2          | 90 / 2      |
| cytoscapejs | - / 66      | - / 66          | - / 66      |
| cyjs        | 0 / -       | 0 / -           | 0 / -       |

cx real files went UP in the comparator step (215 to 354): `cx-radiation-bibliography` and `cx-repro-unplaced-boxes`
now fail node.sizeToSpacing on 212 nodes that graphty draws as dots where Cytoscape draws labeled boxes. That is a real
defect the old comparator hid, not a regression. The Graphviz label-size branch, measured on its own, takes DOT real
files from 1,074 to 646 (all of dot-real-siblings' and dot-real-crazy's edge.width, most of their node.position); it is
not in the "after" column.

### What the comparator changes did (#4246, merged)

Blind spots closed, so numbers went up:

- Where each program lays the file out itself, a uniformly wrong size passed, because the scale fitted between the
  two layouts absorbed it. node.sizeToSpacing is judged there again (band 1/3 to 3), and a render pixel there is at
  most the canvases' ratio, not the fitted scale (it was 14 px on `cx-radiation-bibliography`).
- Edge shape was never judged on own layouts. edge.curve is judged there as one element for the drawing: the share
  of bent lines (vis-network bends 22 to 52 percent of its lines, graphty 0 to 13 on `json-vis-world`, `-siblings`,
  `-unix`, `-transparency`; `json-vis-lesmiserables` the other way round).
- A zigzag under 5 percent of a long edge passed. New property edge.wiggle counts how often a route turns back.

False failures removed, so numbers went down:

- Labels drawn under 6 px got line boxes up to twice their font size (Chromium rounds ascent and descent at screen
  size): they are laid out 100 times larger and measured there. json-cyjs-tokyo label.anchor 695 to 70,
  dot-real-depcruise 96 to 2.
- Cytoscape desktop's Calibri labels are measured in the face Java actually drew (DejaVu Sans):
  cx-radiation-bibliography label.anchor 70 to 0.
- Pajek's mid-line arrowheads are judged by where along the line their middle sits, not from the line's end:
  pajek-graphstream-b 193 to 44.
- Cytoscape annotation arrowheads read one by one (charts-p6 stray.present 86 to 21 per format); vis-network's open
  database outline joined to its fill; vis arrowheads over a flat neighbour box no longer refused.

Each change has a test that fails on the old comparator, and the planted-defect run (`mutants.test.ts`) now includes
two own-layout samples and four new defects (zigzag at 3 percent, nodes and labels at a fifth of their size, one node
twice its size, one label at 0.7). Two gaps found in review are filed as #4252 (half-arrow line run-on, open half
arrows, vis-network's crow) and #4264 (a missing or outlined node in a coincident pair, stacked WikiPathways boxes).

### What the drawing and reader changes did

- **Arrowheads (#4254, merged; #4202).** Cytoscape desktop's heads beside a half-arrow source sized as Cytoscape sizes
  them (`DEdgeDetails.adjustArrowSize`), Graphviz's obox at its box size, vis-network's crow and Graphviz's crow and inv
  at their program's width, graphty's vee notched at half its length with the line run on to the notch.
  arrowLength 123 to 14, arrowWidth 121 to 14, arrowToSpacing 71 to 11. One edge newly fails edge.route in each
  Cytoscape format (`syn-mappings` n43 -> n44, a sinewave line beside a half arrow: the line now starts 4.6 px off the
  node, Cytoscape starts it at the outline). The vee change touches every vee graphty-element draws.
- **Label and node pairing (#4265, open; #4247), comparator only.** Two Tokyo stations drawn 0.9 px apart were read
  as one node, and station names were swapped between same-name stations 1 to 4 px apart. json-cyjs-tokyo 282 to 35
  failing elements, json-cyjs-perf 108 to 55. A shape that is another node's own best body is never this node's twin,
  and same-name nodes within two node sizes take the words drawn where graphty puts their own label. On
  `cx2-wp1449-tlr` 4 edge.route and 2 node.extra newly fail (stacked TIRAP and MYD88 boxes, #4264).
- **DOT HTML table labels (#4251, open; #4248).** Graphviz draws a table's border (BORDER, COLOR, STYLE) even on a
  plain, plaintext or none node, and sizes the node to border, cell spacing, cell border and cell padding round the
  text (lib/common/htmltable.c); `shape=plain` forces margin 0. On DOT: node.stroke 62 to 2, node.width 148 to 105,
  node.height 82 to 39. Left: inner cell borders, `TABLE STYLE=rounded`, a plaintext or none table at default margin.
- **Cytoscape chart marks (#4250, open; #4249).** graph-io reads `cy_colorScheme` (bar colors, BarLayer.java's
  up/zero/down rule) and `cy_values` pies. stray.present 59 to 5 per Cytoscape desktop format on images-charts-p5,
  -p6 and mappings-bypass-p18. Left: chart axes, tick and item labels and the plot inset (images-charts-p7, 70 marks
  per format).
- **Patterned lines along their route (#4259, open; #3102).** A dash-dot, slashes, zigzag or sinewave edge, and a
  dashed or dotted edge on a Graphviz-laid route, are laid along their curve, bends, route or self-loop, and a click
  picks them there. edge.dash 39 to 36 (cx, cx2, cys `syn-bypass`), edge.curve and edge.route on dot-synth-edges-clusters.
  The piece count is not capped yet (#4257).
- **Node sizes: no change.** GEXF and vis-network radii (#3100) were already fixed on master (0 node-size failures on
  all 90 GEXF samples). The remaining step of the owner's decision on #2322 removes the fixed layout's public `scale`
  option, a breaking change, so it was not done. The largest real node-size failure, `cx-radiation-bibliography` drawn
  as dots, is #3103.

Every pull request had a review that re-derived its numbers from the run files element by element. The chart marks,
dashed routes, label pairing and Graphviz label-size changes also had an engineering review, which checked that each
new test fails without its change and probed malformed input; the DOT tables (#4251) and arrowheads (#4254) changes
opened without one. Those two reviews, and a review of the commits that fixed the first reviews' findings on #4251
and the Graphviz branch, came afterwards and found two defects: graphty's own DOT writer lost a table label's frame,
so the table's padding did not survive a round trip (fixed on #4251, which also reads table attributes as Graphviz's
lexer does), and #4254's line run on to the vee's notch covered the vee on lines wider than half of it (fixed by
#4309). Blocking findings that were fixed before the pull requests opened: a record label `<f0>|<f1>` handed to
Graphviz as HTML (a syntax error, Graphviz branch); a table size overriding a larger node size and an outline drawn
on a plaintext node's whole box (DOT tables); Cytoscape heat-strip colors for two- and five-color schemes (chart
marks); click picking still straight for routed patterned edges (dashed routes); graphty's own wrong label offset
able to pick a twin's label four node sizes away (label pairing). No input in any probe threw.

### What did not improve, and why

| failing elements (after)                               | what                                                                                                                                    | issue                                       |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| 447 node.position, 333 edge.width (dot)                | graphty's Graphviz run lays out nodes without their label text, so Graphviz spaces and routes a different graph                         | #4203 (branch ready, blocked on a decision) |
| 284 edge.width (json-vis-siblings)                     | one uniform line-width ratio against vis-network                                                                                        | #4268                                       |
| 280 stray.present + 84 stray.extra (Cytoscape desktop) | chart axes, tick and item labels and the plot inset on images-charts-p7                                                                 | #4249                                       |
| 212 node.sizeToSpacing (cx)                            | a computed layout ignores the file's node sizes: labeled boxes drawn as dots                                                            | #3103 (owner)                               |
| 58 edge.arrowPlace (pajek)                             | on 20 to 28 px edges graphty puts a mid-line head's tip at the middle, Pajek its middle                                                 | #706                                        |
| 44 label.present (gexf-hsk-chars)                      | graphty draws 44 single-character Chinese labels where Gephi's drawing has none; not traced (Gephi's font or the comparator's reading)  | #706                                        |
| 18 edge.arrowParts                                     | stacked heads drawn as one                                                                                                              | #4267                                       |
| 39 edge.curve                                          | Graphviz routes (dot 25), vis-network's bent lines on own layouts (json 6), the wrong edge of a parallel pair curved (cx2-signor-aml 6) | #4203, #706, #4258                          |
| 104 edge.arrow (json 54)                               | json-vis-siblings: arrowheads at crowded nodes the comparator cannot yet give to the right edge (it does not use the head's direction)  | #706                                        |

### The full-run gate

The full run's gate (`oracle-known-failures.json`) is red: 38 samples (70 keys counting the matched view) against 27
samples (53 keys) before round 5. No key that was red before turned green, and every key that turned red is a defect
the round-5 comparator now sees: `cx-radiation-bibliography` (node sizes), the four `specimen-images-charts-p6`
copies (graphty's annotation heads), `json-vis-siblings`, `-world`, `-unix`, `-lesmiserables` (bent lines),
`pajek-synth-lines` (part-way heads), `dot-real-depcruise@matched` (wiggle). Recording them needs
`fidelity:ratchet --add` with a reason, which round 5 leaves to the owner. One round-5 change did add known failures:
the comparator pull request (#4246, commit 4cc3484c97) recorded 31 elements on three CI scorecard samples that the new
comparator judges and graphty's drawing did not change -- `cx-repro-unplaced-boxes` (24 nodes, `node.sizeToSpacing`),
`json-vis-transparency` (`edge.curve` on element `edges`) and `json-vis-synth` (3 strays renumbered, in both views).
CI runs only the 28-sample scorecard
(`test/browser/oracle-scorecard.test.ts`), which each open pull request passes except the Graphviz branch.

### Floors

This section's pull request changes no floor. The DOT tables (#4251) and chart marks (#4250) pull requests ratchet
their own floors and known failures; the comparator, arrowheads, label pairing and dashed-route changes recorded none.
Raising floors on master now from the merged run would record rates master reaches only with the open pull requests,
and would conflict with the two that edit the same file. The floors follow in a later pull request under #4266, from a
full run of master once the open round-5 pull requests have merged.

### Decisions pending (owner)

- **Graphviz label sizes (#4203).** Handing Graphviz the label-sized nodes takes DOT real files from 1,074 to 646
  failing elements, but on `dot-real-crazy` 3 nodes and 1 edge newly fail the CI scorecard. Graphviz's own
  WebAssembly build places only 19 of that file's 41 nodes near the command-line Graphviz's drawing (font metrics), so
  the 3 nodes are inside what any WebAssembly run can reach. Accept the trade and record it, or keep the old result.
- **#3103**: a computed layout ignores the file's node sizes (the 212 cx nodes drawn as dots).
- **#2322**: the last step removes the fixed layout's `scale` option, a breaking change.
- **The 8-distinct-label-positions limit**: unchanged in round 5.
- **yEd hand exports**: every yEd and yEd Live oracle is still a stand-in (see "yEd sheets to export by hand"), so
  the 43 yed and 12 graphml samples judge nothing about yEd.
- **The red full-run gate**: whether the newly seen defects above are recorded as known failures, and with what reason.
- **The 31 known failures #4246 added** (commit 4cc3484c97, listed under "The full-run gate"): they keep the CI
  scorecard green on defects the new comparator sees and graphty's drawing did not cause. Keep the record, or fix
  the drawings (`cx-repro-unplaced-boxes`'s boxes are #3103) and take it back.

### What to look at

Only a person can judge whether the drawings got better. These stories of the graph-io fidelity Storybook (open
`?path=/story/<id>`) show the program's drawing beside graphty's, with the comparator's table under them:

1. `style-fidelity-cx2-specimens--arrows` (and the xgmml, cx and session copies): the heads beside a half-arrow source
   now match Cytoscape's size; the half arrow itself is still a filled wedge (#4253).
2. `style-fidelity-graphviz-dot-specimens--arrows`: obox and box at Graphviz's size, the vee notched at half its
   length with the line run on to the notch; stacked heads still drawn as one (#4267).
3. `style-fidelity-vis-network-specimens--arrows`: crow and inv_triangle at vis-network's width, the broad vee.
4. `style-fidelity-graphviz-dot-specimens--labels-p-2` and `--labels-p-3`: HTML table labels now framed with the
   table's border weight, color and dashes; inner cell borders still missing.
5. `style-fidelity-cx-specimens--images-charts-p-5`, `--images-charts-p-6` and `--mappings-bypass-p-18`: bar charts
   in Cytoscape's color schemes and `cy_values` pies; the axes and labels of `--images-charts-p-7` are still missing.
6. `style-fidelity-cx-samples--syn-bypass`: the curved slashes edge (2106 -> 2112) drawn as a patterned curve, not a
   solid line.
7. `style-fidelity-graphviz-dot-samples--synth-edges-clusters`: dotted edges along Graphviz's routes (c2_3 -> c9_4,
   c3_3 -> c1_3); dense, judge at full size.
8. `style-fidelity-cx2-samples--syn-mappings`: 19 arrowheads now right; the sinewave edge n43 -> n44 starts 4.6 px off
   its node, the one new failure of the arrowhead change.
9. `style-fidelity-cytoscape-js-samples--cyjs-tokyo`: the drawing did not change, the comparator's reading did; check
   that the twin stations' labels it now pairs are the ones you would pair.
10. `style-fidelity-cx-samples--radiation-bibliography`: the largest defect the new comparator found, labeled boxes
    drawn as dots on graphty's computed layout (#3103).
11. `style-fidelity-vis-network-samples--vis-world`: vis-network bends its lines, graphty draws them straight (newly
    judged).
12. `style-fidelity-graphviz-dot-samples--real-crazy`: the sample the Graphviz label-size decision is about; that
    branch is not in the Storybook, so compare it with the side-by-side image the branch's proof names.
