# Datasets

No dataset's data is in the package: every dataset is published at
`https://graphty.app/data/graph-samples/v1/<name>.gsnp.gz` as a gzipped graph-format file and
downloaded when you ask for it. `fetchDataset(name)` loads any of them as a snapshot, with its
node columns:

```ts
import { fetchDataset } from "@graphty/graph-samples";

const club = await fetchDataset("karate"); // 34 nodes, 78 weighted edges, node column `club`
const roads = await fetchDataset("road-ny");
const mine = await fetchDataset("road-ny", { baseUrl: "https://my.cdn/graphs/" }); // a mirror of your own
```

`fetchDataset(name, { baseUrl, fetch, signal })` takes a base URL (a mirror, or a copy of the
files on your own server), a `fetch` implementation and an abort signal. A failed download rejects
with `fetching <url> failed: HTTP <status>`. `https://graphty.app/data/graph-samples/v1/index.json`
lists every dataset's metadata with its file's URL, which is what a mirror needs to copy.

## Small datasets

Each small dataset also has an entry point of its own, with its metadata and a loader that makes
the same call:

```ts
import { karate, karateMeta } from "@graphty/graph-samples/datasets/karate";

const club = await karate(); // fetchDataset("karate"); karate({ baseUrl }) for a mirror
karateMeta.citation; // what to cite
```

| Subpath                                      | Graph                                                     | Nodes / edges  | Ground truth |
| -------------------------------------------- | --------------------------------------------------------- | -------------- | ------------ |
| `datasets/karate`                            | Zachary's karate club (weighted)                          | 34 / 78        | `club`       |
| `datasets/florentine-families`               | Florentine marriages                                      | 15 / 20        |              |
| `datasets/davis-southern-women`              | Davis Southern Women (bipartite)                          | 32 / 89        | `side`       |
| `datasets/les-miserables`                    | Les Miserables co-appearances (weighted)                  | 77 / 254       |              |
| `datasets/football`                          | US college football 2000, Evans' corrected version        | 115 / 613      | `conference` |
| `datasets/political-books`                   | Books about US politics                                   | 105 / 441      | `lean`       |
| `datasets/dolphins`                          | Doubtful Sound dolphins                                   | 62 / 159       |              |
| `datasets/contiguous-usa`                    | Contiguous US states and DC, land borders                 | 49 / 107       |              |
| `datasets/knuth-miles`                       | Knuth's 128 cities, 1949 road miles (complete)            | 128 / 8,128    |              |
| `datasets/celegans-neural`                   | C. elegans neurons (directed, weighted)                   | 297 / 2,345    |              |
| `datasets/political-blogs`                   | US political blogs, 2004 (directed)                       | 1,490 / 19,022 | `lean`       |
| `datasets/openflights`                       | OpenFlights airports and routes (directed)                | 3,214 / 36,906 |              |
| `datasets/venice-transit`                    | Venice bus, tram and waterbus stops (directed, weighted)  | 1,874 / 2,702  |              |
| `datasets/yeast-perturbation`                | Yeast galactose network, Cytoscape's demo (directed, x/y) | 331 / 361      |              |
| `datasets/stelzl-interactome`                | Human protein interactions, Stelzl 2005 (directed, x/y)   | 1,691 / 3,128  |              |
| `datasets/wikipathways-senescence-autophagy` | WikiPathways WP615 pathway drawing (directed, x/y)        | 161 / 118      |              |
| `datasets/go-slim-generic`                   | Generic GO slim, term to parent (directed)                | 140 / 62       | `namespace`  |

"Ground truth" is a known grouping stored as a node column, for checking what a community or
clustering algorithm finds.

## Large datasets

The large datasets have no subpath; load them with `fetchDataset(name)`. Every dataset, small or
large, is in `DATASETS` with `hosting: "remote"`, the file size (`bytes`) and its SHA-256:

| Name               | Graph                                                    | Nodes / edges       | Download | Ground truth |
| ------------------ | -------------------------------------------------------- | ------------------- | -------- | ------------ |
| `road-ny`          | New York City roads, DIMACS (directed, lengths, lon/lat) | 264,346 / 733,846   | 9.4 MB   |              |
| `ogbn-arxiv`       | arXiv CS citations, OGB (directed, `year`)               | 169,343 / 1,166,243 | 10.6 MB  | `subject`    |
| `com-dblp`         | DBLP co-authorship, SNAP                                 | 317,080 / 1,049,866 | 15.6 MB  |              |
| `go-basic`         | Gene Ontology, term to parent (directed, `obsolete`)     | 48,340 / 71,496     | 1.4 MB   | `namespace`  |
| `disease-ontology` | Human Disease Ontology, disease to parent (directed)     | 14,854 / 17,479     | 0.3 MB   |              |
| `bioplex3-hct116`  | BioPlex 3.0 HCT116 protein interactions (directed, x/y)  | 10,251 / 75,346     | 0.7 MB   |              |

`https://graphty.app/data/graph-samples/v1/index.json` lists every dataset's metadata with its
file's URL.

## Metadata and pictures

The root entry exports `DATASETS`, the metadata of every dataset (title, description, citation,
source, license, counts, columns, what it showcases) without any of the graph data, and
`DATASET_NAMES`, only their names, for checking a name without bundling the metadata. The
geographic datasets carry `latitude` and `longitude` node columns in degrees. The Cytoscape and
ontology datasets are read from their published files (a Cytoscape session, a CX2 network, an OBO
ontology) by `@graphty/graph-io`'s own importers; the drawn ones carry the saved `x` and `y`, with
y growing upward.

Each dataset also has a picture of itself, for a gallery or a menu: its metadata's `thumbnail`
names a 480 x 300 WebP with a transparent background, published beside its file. A large dataset's
picture is drawn from a sample of it, since the whole graph is too big to lay out in so small a
picture:

```ts
import { DATASETS, DEFAULT_DATASET_BASE_URL } from "@graphty/graph-samples";

const karate = DATASETS.find((meta) => meta.name === "karate");
const picture = karate?.thumbnail === undefined ? undefined : new URL(karate.thumbnail, DEFAULT_DATASET_BASE_URL);
```

## Licenses

The code is MIT. The datasets are the work of their authors: the package's `NOTICE` file lists each one's source,
citation and license as known. Some are marked "unclear" -- their publishers state no license.
If you are a rights holder and want a dataset removed, open an issue.
