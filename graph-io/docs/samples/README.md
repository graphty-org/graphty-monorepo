# Sample files

The graph files the graph-io guide reads in its examples, published at
https://graphty.app/docs/graph-io/samples/.

The Game of Thrones character network is from
[sample-social-network-datasets](https://github.com/melaniewalsh/sample-social-network-datasets) by
Melanie Walsh, released under CC0 (public domain). The `got.*` files hold the same 107 characters
and 352 weighted edges, saved by graph-io in other formats.

- `got-network.graphml`: the network, with a label per character and a weight per edge.
- `got-edges.csv`: the edges as a CSV edge table (`Source,Target,Weight`).
- `got-nodes.csv`: the characters as a CSV node table (`Id,Label`).
- `got.gml`, `got.gexf`, `got.net` (Pajek), `got.json` (d3, with the weights in `value`),
  `got.cx2` and `got.cx`: the network in other formats.

The other files were written for this guide and are released under the MIT license, like graph-io:

- `teams.gv`: a small DOT graph with two clusters.
- `vehicles.obo`: a four-term OBO ontology.
- `networks.cys`: a Cytoscape session with two networks, Alpha and Beta.
- `proteins.xgmml`: a three-node network as Cytoscape writes XGMML.
- `movies-nodes.csv` and `movies-rels.csv`: a Neo4j bulk import of movies and the people in them.
