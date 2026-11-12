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
- The start screen no longer offers Office email (scrubbing it mostly thinned repeated emails
  between the same people); the file stays as the timeline tests' fixture

## campus-contacts.json, graph-research.json and marvel-films.json (timed, real)

Written by `graphty/scripts/fetch-timeline-samples.ts` (`npm run samples:fetch`), which downloads
the sources below. Do not edit them by hand. Every time is an ISO 8601 UTC string on the edges, and
nodes carry none, so on the timeline a node shows while one of its edges is in the window. Each
file's `graph` object repeats its source and license. The OpenAlex and Wikidata answers change as
those databases are edited, so a rerun can differ.

### campus-contacts.json

- Nodes: 615 students (`name` "Student <id>", `gender`); edges: 8,142, undirected, one per pair
  per hour they were close, with `time` (the hour's start) and `minutes` (5 per close scan)
- Source: Copenhagen Networks Study interaction data, Bluetooth proximity (`bt_symmetric.csv`),
  https://doi.org/10.6084/m9.figshare.7267433 (figshare MD5s checked by the script)
- Citation: Sapiezynski, Stopczynski, Lassen and Lehmann, "Interaction data from the Copenhagen
  Networks Study", Scientific Data 6, 315 (2019)
- License: MIT (as stated on the figshare record)
- How it was cut: the second of the four weeks (days 7 to 13, Sunday to Saturday); scans of
  -70 dBm or stronger (roughly the same room); a pair is kept for an hour when it was close in
  at least 3 of that hour's 12 five-minute scans. Full data: about 700 people, 4 weeks, 5.5 million scan rows
- Dates: the study published seconds since its start (a Sunday at midnight, local time), not
  dates, so the week is placed on a stand-in Sunday, 2024-02-04. Weekdays and hours are real;
  the calendar dates are not

### graph-research.json

- Nodes: 549 authors (`name`); edges: 2,084, undirected, one per co-author pair per paper,
  with `published` (the paper's date) and `paper` (its title)
- Source: OpenAlex, every article in the Journal of Graph Algorithms and Applications (source
  S33451491), https://openalex.org; editorials and authors OpenAlex could not identify are left out
- How it was cut: only the largest connected group of co-authors (549 of 1,053 authors who wrote
  with someone); the other 151 groups are mostly one paper's authors each
- Citation: Priem, Piwowar and Orr, "OpenAlex: A fully-open index of scholarly works, authors,
  venues, institutions, and concepts" (2022), https://arxiv.org/abs/2205.01833
- License: CC0 1.0 (https://openalex.org/about)

### marvel-films.json

- Nodes: 38 films (`kind` "film") and 172 actors (`kind` "actor", `films` = how many MCU films
  list them); edges: 582, undirected, actor to film, with `released` (the film's earliest
  release date)
- Source: Wikidata, films in the Marvel Cinematic Universe film series (Q642878) and their cast
  members (P161), queried at https://query.wikidata.org/; the extended cut of Spider-Man: No Way
  Home is left out, and so are actors in only one film (most of each cast)
- License: CC0 1.0 (https://www.wikidata.org/wiki/Wikidata:Licensing)

## Provenance

Both files come from Mark Newman's network data collection at the URL above, which
distributes them for academic use. The counts recorded here are the corpus manifest's
`expectedNodes` and `expectedEdges`, and they are also the pre-computed counts in
`graphty/src/data/sampleManifest.ts`, so a Welcome row can draw its size string before
anything is loaded.
