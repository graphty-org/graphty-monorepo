# Sample files from other programs

One sample file per program whose files graphty reads, each as the program (or its own tutorials, tests or
examples) wrote it. The start page lists them in their own section, each under its program's name. Every file here is
a byte-for-byte copy of a file in graph-io's test corpus (the path given under "Test copy"); `cytoscape.xgmml.gz` is
gzipped, as the corpus stores it, and the app unzips it as it opens it. Do not edit them: they are the official load tests
(`graph-io/test/programs/program-samples.test.ts` and `graphty-element/test/browser/program-samples.test.ts`), and
`graph-io/test/corpus/programs/samples.json` lists them with their counts.

The licenses below are the licenses of the files. Files under GPL, LGPL, EPL or CDDL are redistributed unchanged,
under their own license, with their source named, and the Neo4j file, changed, under the Apache License 2.0 and
GPL 3.0 its repository states; each of those licenses' full text is in `licenses/`, beside the app's copies of the files
(`graphty/public/samples/programs/licenses/`). The CDDL text there has its typographic
quotes written as plain quotes and its section sign as "Section", and the Neo4j NOTICE its copyright sign as "(c)";
every other text is as its publisher gives it.

## yEd -- yed.graphml

- What it is: a FileMaker object dependency diagram saved by yEd 3.18.0.2. 65 nodes in 13 yEd shapes (round
  rectangles, stars, hexagons, diamonds, parallelograms, ...), 9 fill colors, 102 edges in 7 colors, solid and dotted.
- Source: https://raw.githubusercontent.com/mrwatson-de/fmCheckMate-XSLT/61700dcd3923164cc77be9972fb4036c0bb0b9bd/xml/yEd/fmObjectDependency/fmObjectDependencyGraph.graphml
- Test copy: graph-io/test/corpus/programs/mrwatson-de__fmCheckMate-XSLT__fmObjectDependencyGraph.graphml
- License: MIT. Copyright (c) 2018 Russell Watson. Permission is hereby granted, free of charge, to any person
  obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software
  without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute,
  sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
  subject to the following conditions: The above copyright notice and this permission notice shall be included in all
  copies or substantial portions of the Software. THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
  EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE
  AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
  SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
- No file written by yWorks itself may be redistributed, so this is a user's file.

## yEd Live -- yed-live.graphml

- What it is: a WaveNet diagram written by yFiles for HTML 2.4.0.4 (yEd Live). 183 nodes (ellipses, parallelograms,
  rectangles), filled and hollow, solid, dashed and dotted outlines, 207 solid and dashed edges.
- Source: https://raw.githubusercontent.com/cheind/autoregressive/e54c7f2cf66c6ffde706ea5839c747b5ab9b61c1/etc/presentation/wavenet.graphml
- Test copy: graph-io/test/corpus/programs/cheind__autoregressive__wavenet.graphml
- License: MIT. Copyright (c) 2021 Christoph Heindl. The MIT permission notice above, with this copyright line,
  applies.

## Cytoscape -- cytoscape.cys

- What it is: the "Import & Save" sample session that ships with Cytoscape. graphty opens its first network,
  Malignant Melanoma: 30 nodes in 4 shapes and 4 fills, 137 edges, solid and dashed, with arrows. The session also
  holds a picture of NDEx's web page, as Cytoscape ships it.
- Source: the Cytoscape 3.10.5 distribution, `sampleData/sessions/Import & Save.cys`. The same bytes are in
  py4cytoscape's tests:
  https://raw.githubusercontent.com/cytoscape/py4cytoscape/47b60d5563d2dec36cb521a842fcc957d55d896c/tests/data/Import%20%26%20Save.cys
- Test copy: graph-io/test/corpus/styles/cys/fidelity/import-and-save.cys
- License: LGPL 2.1, the license of the Cytoscape distribution it ships in (`licenses/LGPL-2.1.txt`). Copyright
  The Cytoscape Consortium. It is redistributed under the distribution's license, not under the MIT license of the
  py4cytoscape repository that also holds a copy.

## Cytoscape (XGMML) -- cytoscape.xgmml.gz

- What it is: the network of Cytoscape's Basic Data Visualization tutorial. 331 nodes (rectangles, ellipses, round
  rectangles) colored by expression, 362 edges, stored positions.
- Source: https://github.com/cytoscape/cytoscape-tutorials/blob/877ad003322ba36ccd46b1e4b64be03fc30ebb12/protocols/data/BasicDataVizDemo.xgmml
- Test copy: graph-io/test/corpus/styles/xgmml/BasicDataVizDemo.xgmml.gz (gzipped)
- License: CC0 1.0 Universal.

## NDEx (CX) -- ndex.cx

- What it is: a dark-themed network from the NDEx Python client's tests. 34 nodes (ellipses, rectangles, round
  rectangles, an octagon), 116 white edges, solid and dotted, on a dark background.
- Source: https://raw.githubusercontent.com/ndexbio/ndex2-client/bd01564bbe16cb4b44af3827e22e4a936dac1e02/tests/data/darkthemefinal.cx
- Test copy: graph-io/test/corpus/programs/ndex2-client__darkthemefinal.cx
- License: BSD-3-Clause. Copyright (c) 2013-2026, The Regents of the University of California, The Cytoscape
  Consortium. All rights reserved. Redistribution and use in source and binary forms, with or without modification,
  are permitted provided that the following conditions are met: 1. Redistributions of source code must retain the
  above copyright notice, this list of conditions and the following disclaimer. 2. Redistributions in binary form
  must reproduce the above copyright notice, this list of conditions and the following disclaimer in the
  documentation and/or other materials provided with the distribution. 3. Neither the name of the copyright holder
  nor the names of its contributors may be used to endorse or promote products derived from this software without
  specific prior written permission. THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
  ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND
  FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER BE LIABLE FOR ANY DIRECT,
  INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF
  SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
  ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

## NDEx (CX2) -- ndex.cx2

- What it is: WikiPathways' Toll-like receptor pathway (WP1449) from NDEx. 280 nodes, 159 edges in 10 colors with tee
  and triangle arrows, 17 Cytoscape annotations.
- Source: https://public.ndexbio.org/v3/networks/1bd41238-5c68-11ec-b3be-0ac135e8bacf
- Test copy: graph-io/test/corpus/styles/cx2/fidelity/wp1449-tlr.cx2
- License: CC0 ("Waiver-No Rights Reserved (CC0)", rights holder WikiPathways).

## Cytoscape.js -- cytoscape-js.json

- What it is: Cytoscape.js's GeneMANIA export demo. 31 genes sized by score, 255 edges colored by interaction type.
- Changed: this file is our merge of two of the demo's files, not a file Cytoscape.js wrote: the `elements` of its
  data.json, unchanged, with the stylesheet its code.js passes to Cytoscape.js written in as `style`.
- Source: https://github.com/cytoscape/cytoscape.js/tree/48115e358d4d406451d0a9aed1b40fb7768f2a83/documentation/demos/genemania-export
  (data.json and code.js)
- Test copy: graph-io/test/fidelity/samples/cyjs-genemania.json
- License: MIT. Copyright (c) 2016-2026, The Cytoscape Consortium. The MIT permission notice above, with this
  copyright line, applies.

## Gephi -- gephi.gexf

- What it is: Les Miserables, the welcome-screen sample that ships with Gephi (written by Gephi 0.8.1). 77 nodes in 9
  colors and 18 sizes, stored positions, 254 edges.
- Source: https://github.com/gephi/gephi/blob/eee9b3920b489c994062ee826c0acd3fbe9134ca/modules/WelcomeScreen/src/main/resources/org/gephi/desktop/welcome/samples/Les%20Miserables.gexf
- Test copy: graph-io/test/corpus/programs/gephi__Les-Miserables.gexf
- License: Gephi's dual license at that commit, CDDL 1.0 or GPL 3.0
  (https://github.com/gephi/gephi/blob/eee9b3920b489c994062ee826c0acd3fbe9134ca/COPYING.txt;
  `licenses/CDDL-1.0.txt`, `licenses/GPL-3.0.txt`). Copyright 2008-2011 Gephi Consortium.

## Graphviz -- graphviz.gv

- What it is: the Linux kernel diagram from the Graphviz gallery. 65 nodes (ellipses, boxes, octagons, points), 10
  fills and 13 edge colors; Graphviz lays it out.
- Source: https://gitlab.com/graphviz/graphviz.gitlab.io/-/raw/13a10865ac7eb412d8d532056bacd211723eb037/content/en/Gallery/directed/Linux_kernel_diagram.gv.txt
- Test copy: graph-io/test/corpus/styles/dot/fidelity/real-linux-kernel.gv
- License: Eclipse Public License 1.0, the LICENSE of graphviz.gitlab.io at that commit (`licenses/EPL-1.0.txt`).

## OGDF -- ogdf.gml

- What it is: the entity-relationship diagram among OGDF's own layout examples. 43 boxes in 10 fills and 25 widths,
  labels in black and white, 57 solid and dotted edges; laid out by graphty.
- Source: https://raw.githubusercontent.com/ogdf/ogdf/1a40505ac00677a58ab5ce532e1dcc3bd63116e5/doc/examples/layout/ERDiagram.gml
- Test copy: graph-io/test/corpus/programs/ogdf__ERDiagram.gml
- License: GPL 2.0 or GPL 3.0, OGDF's LICENSE.txt
  (https://github.com/ogdf/ogdf/blob/1a40505ac00677a58ab5ce532e1dcc3bd63116e5/LICENSE.txt;
  `licenses/GPL-2.0.txt`, `licenses/GPL-3.0.txt`). Copyright (C) the OGDF authors.

## Pajek -- pajek.net

- What it is: a phone-call network in Pajek's .net format from GraphStream's test files. 111 vertices as ellipses,
  boxes and diamonds in 7 colors, stored positions, 193 arcs. Pajek's own sample files are tiny or carry no license.
- Source: https://github.com/graphstream/gs-core/blob/950b87280075f92a85b564b47ce6522ced5ba53a/src-test/org/graphstream/stream/file/pajek/test/B.NET
- Test copy: graph-io/test/corpus/styles/pajek/graphstream_gs-core__B.net
- License: LGPL 3.0 or CeCILL-C, GraphStream's COPYING at that commit
  (https://github.com/graphstream/gs-core/blob/950b87280075f92a85b564b47ce6522ced5ba53a/COPYING).
  Redistributed under LGPL 3.0 (`licenses/LGPL-3.0.txt`, with the GPL 3.0 it builds on, `licenses/GPL-3.0.txt`).

## Neo4j -- neo4j-movies.csv

- What it is: Neo4j's official Movies graph as a neo4j-admin import file: a node section and a relationship section.
  169 nodes (Movie, Person), 250 relationships of 6 types. No styles: the format has none.
- Source: https://github.com/neo4j/apoc/blob/07c551a0be6277e35afd0e55138a4cad7f8530db/common/src/main/resources/movies.cypher,
  converted by us from Cypher to import CSV (no redistributable import CSV from Neo4j exists).
- Test copy: graph-io/test/corpus/programs/neo4j-movies.csv
- License: Apache License 2.0 or GPL 3.0; the repository states both at that commit. Its LICENSE file
  (https://github.com/neo4j/apoc/blob/07c551a0be6277e35afd0e55138a4cad7f8530db/LICENSE), its readme and the header
  it puts on its source code give the Apache License 2.0; its NOTICE.txt
  (https://github.com/neo4j/apoc/blob/07c551a0be6277e35afd0e55138a4cad7f8530db/NOTICE.txt) says the software Neo4j
  develops there is licensed under GPL 3.0. movies.cypher carries no license line of its own. The file is
  redistributed meeting both: both texts (`licenses/Apache-2.0.txt`, `licenses/GPL-3.0.txt`) and the NOTICE
  (`licenses/neo4j-apoc-NOTICE.txt`, its copyright sign written as "(c)") are here, the source is named and the
  change is stated. Copyright (c) 2002-2023 Neo4j Sweden AB. Changed: rewritten from the CREATE statements of
  movies.cypher into neo4j-admin import CSV.

## OBO Foundry -- obo-foundry.obo

- What it is: the Taxonomic Rank Vocabulary (taxrank). 77 terms in one tree, 75 edges. No styles.
- Source: http://purl.obolibrary.org/obo/taxrank/releases/2025-09-24/taxrank.obo
- Test copy: graph-io/test/corpus/obo/taxrank.obo
- License: CC0 1.0 Universal (the file's own license line and the OBO Foundry registry).

## Cytoscape (SIF) -- cytoscape.sif

- What it is: the network of Cytoscape's Group Nodes tutorial. 37 nodes, 62 edges. No styles.
- Source: https://github.com/cytoscape/cytoscape-tutorials/blob/8b5f7d9853f2b583a257ce5a2cd35f19b4ab43db/protocols/data/GroupNodes.sif
- Test copy: graph-io/test/corpus/programs/cytoscape-tutorials__GroupNodes.sif
- License: CC0 1.0 Universal.

## Cytoscape (CSV table) -- cytoscape-table.csv

- What it is: the AP-MS demo table from Cytoscape's tutorials, imported as a network from its Bait and Prey columns.
  453 nodes, 499 edges. No styles.
- Source: https://github.com/cytoscape/cytoscape-tutorials/blob/8b5f7d9853f2b583a257ce5a2cd35f19b4ab43db/protocols/data/ap-ms-demodata.csv
- Test copy: graph-io/test/corpus/programs/cytoscape-tutorials__ap-ms-demodata.csv
- License: CC0 1.0 Universal.

## D3 -- d3.json

- What it is: Les Miserables as D3's own force-layout sample: 77 nodes in 10 groups, 254 links. No styles.
- Source: https://github.com/d3/d3-plugins/blob/40f8b3b91e67719f58408732d7ddae94cafa559a/graph/data/miserables.json
- Test copy: graph-io/test/corpus/programs/d3-plugins__miserables.json
- License: BSD-3-Clause. Copyright (c) 2012-2015, Michael Bostock. All rights reserved. The BSD-3-Clause conditions
  and disclaimer above apply, with "the name Michael Bostock" in condition 3 and "MICHAEL BOSTOCK" in the disclaimer.
