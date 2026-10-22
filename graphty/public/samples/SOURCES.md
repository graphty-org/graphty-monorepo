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
- Source: https://www-personal.umich.edu/~mejn/netdata/
- License: Academic
- Credit shown in the app: Zachary 1977
- Copied from: graphty-element/test/helpers/corpus/gml/karate.gml

Zachary's karate club: the social network of a university karate club that split in
two, and the classic test case for community detection.

## football.gml

- Nodes: 115
- Edges: 613
- Source: https://www-personal.umich.edu/~mejn/netdata/
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

## office-email.json and paper-citations.json (timed, synthetic)

- Office email: 48 nodes (people, with `name` and `team`), 2,102 directed edges, one per email,
  each with `sent`, an ISO 8601 UTC time from 2025-01-01 to 2025-06-30. Weekdays are busy and
  weekends quiet; three bursts: a product launch (engineering and design, March 10-14), quarter
  end (sales, March 24-31) and an offsite week (everyone, June 2-6)
- Paper citations: 159 nodes (papers, with `year` from 1995 to 2024 and `topic`), 453 directed
  edges from a citing paper to an older paper it cites; edges carry no time
- Both are synthetic, from a seeded generator, so no license applies. Written by
  `graphty/scripts/write-timeline-samples.ts` (`npm run samples:write`). Do not edit them by hand

## Provenance

Both files come from Mark Newman's network data collection at the URL above, which
distributes them for academic use. The counts recorded here are the corpus manifest's
`expectedNodes` and `expectedEdges`, and they are also the pre-computed counts in
`graphty/src/data/sampleManifest.ts`, so a Welcome row can draw its size string before
anything is loaded.
