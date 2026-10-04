# Sample dataset sources

The files in this directory are served at the site root by Vite's public dir, so the
app loads them with `handle.loadFromUrl("/samples/<file>", "gml")`. They are
byte-for-byte copies of the graphty-element test corpus
(`graphty-element/test/helpers/corpus/gml/`), not retyped or reformatted; the source and
license fields below are copied from that corpus's `manifest.json`.

The third sample the Welcome state offers, the cat social network, needs no file here:
it is bundled in `graphty/src/data/sampleGraphs.ts` and loads inline.

## karate.gml

- Nodes: 34
- Edges: 78
- Source: http://www-personal.umich.edu/~mejn/netdata/
- License: Academic
- Credit shown in the app: Zachary 1977
- Copied from: graphty-element/test/helpers/corpus/gml/karate.gml

Zachary's karate club: the social network of a university karate club that split in
two, and the classic test case for community detection.

## football.gml

- Nodes: 115
- Edges: 613
- Source: http://www-personal.umich.edu/~mejn/netdata/
- License: Academic
- Credit shown in the app: Girvan and Newman 2002
- Copied from: graphty-element/test/helpers/corpus/gml/football.gml

American college football games between Division IA teams in the autumn 2000 season,
with each team tagged by conference.

## les-miserables.gml and florentine.gml

- Les Miserables: 77 nodes, 254 edges; the edge key `shared_chapters` counts the chapters two
  characters share. Knuth, The Stanford GraphBase (1993), through the networkx 3.1 copy
- Florentine families: 15 nodes, 20 edges. Padgett and Ansell (1993), through the networkx 3.1 copy
- Written by `graphty/scripts/write-sample-gml.ts` (`npm run samples:write`) from the
  graph-samples datasets with graph-io's GML writer; each node carries a readable `name`. Do not
  edit them by hand: change the script and run it again. Licenses: graph-samples' dataset `meta.ts`

## Provenance

Both files come from Mark Newman's network data collection at the URL above, which
distributes them for academic use. The counts recorded here are the corpus manifest's
`expectedNodes` and `expectedEdges`, and they are also the pre-computed counts in
`graphty/src/data/sampleManifest.ts`, so a Welcome row can draw its size string before
anything is loaded.
