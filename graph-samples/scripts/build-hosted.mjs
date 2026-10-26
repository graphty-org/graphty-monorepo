#!/usr/bin/env node
/**
 * Build the files graphty.app serves at https://graphty.app/data/graph-samples/v1/: every dataset,
 * loaded with fetchDataset(). The large ones (over about 5,000 nodes) are built here from their
 * upstream sources; the small ones are copied from graph-samples' own build (dist/data/v1/, written
 * by scripts/pack-datasets.mjs from the repository's data/), so build graph-samples first.
 *
 *     node scripts/build-hosted.mjs [--cache <dir>] [--reuse-published] [--from-original-hosts]
 *
 * With --reuse-published (the canary deploy), a large dataset whose file canary.graphty.app already
 * (or else graphty.app) publishes with the SHA-256 recorded in src/datasets/hosted.ts is taken from there and its sources are never
 * fetched, so a deploy does not depend on the third-party hosts; only a dataset whose recorded
 * checksum changed (or is not published yet) is built from its sources. Sources come from this
 * repository's GitHub release graph-samples-sources-v1 (scripts/hosted-sources.mjs), never from
 * their original hosts unless --from-original-hosts is given; the release is filled by the
 * graph-samples-sources.yml workflow, dispatched by hand. A source whose terms do not clearly allow
 * redistribution is not in the release: rebuild its dataset by hand with --from-original-hosts.
 *
 * For every dataset below it fetches the sources once into the cache directory (default:
 * <repo>/tmp/graph-samples-sources), refuses a source whose SHA-256 is not the one recorded here,
 * builds a graph-format snapshot with its node columns, and writes
 *
 *   public-data/v1/<name>.gsnp.gz   the snapshot's wire bytes (snapshot.toBytes()), gzipped (and a copy of
 *                                   each small dataset's file from dist/data/v1/)
 *   public-data/v1/<name>.webp      every picture in thumbnails/ (tools/render-sample-thumbnails.mjs): the
 *                                   datasets', named by their `thumbnail`, and the generators'
 *   public-data/v1/index.json       every dataset's metadata, URL, size and checksum, small ones first
 *   src/datasets/hosted.ts          the same metadata for the DATASETS catalogue (committed)
 *   src/datasets/hosted-names.ts    their names alone, in the same order, for DATASET_NAMES (committed)
 *
 * public-data/ is build output and is not committed; .github/workflows/deploy-pages.yml runs this
 * script and publishes public-data/v1/ as /data/graph-samples/v1/. Needs `unzip` on the PATH, a
 * built graph-format (graph-format/dist) and a built graph-samples (graph-samples/dist/data/v1/).
 * Running it twice writes identical files.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

import { datasetOf, edgeArraysOf, importSource } from "./graph-io-source.mjs";
import { fetchSource, publishedCopy, SOURCES } from "./hosted-sources.mjs";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheFlag = process.argv.indexOf("--cache");
const cacheDir =
    cacheFlag >= 0
        ? path.resolve(process.argv[cacheFlag + 1])
        : path.resolve(packageRoot, "../tmp/graph-samples-sources");
const outDir = path.join(packageRoot, "public-data/v1");
const BASE_URL = "https://graphty.app/data/graph-samples/v1/";
// Every green master build deploys to canary, and graphty.app moves only by promotion, so canary has the newest files
const REUSE_URL = "https://canary.graphty.app/data/graph-samples/v1/";
const reusePublished = process.argv.includes("--reuse-published");
const fromOriginalHosts = process.argv.includes("--from-original-hosts");

// graph-format from its tsc output, so the script runs without a workspace install. Not its bundle: the
// bundle stamps the commit it was built from into every file's manifest (`producer`), which would change
// each file's checksum with every commit; the tsc output writes "@graphty/graph-format@dev"
const { fromBytes, fromEdgeArrays } = await import(
    pathToFileURL(path.resolve(packageRoot, "../graph-format/dist/src/index.js")).href
);

/**
 * A dataset read by one of graph-io's importers (scripts/graph-io-source.mjs), as fromEdgeArrays input.
 * @param {string} file - the source file
 * @param {string} format - the graph-io format
 * @param {object} spec - the id column and the node columns to keep
 * @returns {Promise<object>} the fromEdgeArrays input
 */
async function readWithGraphIo(file, format, spec) {
    return edgeArraysOf(datasetOf(await importSource(file, format), spec).data);
}

// ------------------------------------------------------------------ fetching

/** A source file in the cache, fetched first if missing (scripts/hosted-sources.mjs), checksum verified. */
function source(key) {
    return fetchSource(SOURCES[key], cacheDir, { fromOriginalHost: fromOriginalHosts });
}

/** The lines of a text file, gunzipped when it ends in .gz. */
function textLines(file) {
    const bytes = readFileSync(file);
    return (file.endsWith(".gz") ? gunzipSync(bytes) : bytes).toString("utf8").split("\n");
}

/** The lines of a gzipped member of a zip archive. */
function zipGzLines(zip, member) {
    const bytes = execFileSync("unzip", ["-p", zip, member], { maxBuffer: 1 << 30 });
    return gunzipSync(bytes).toString("utf8").trim().split("\n");
}

// ------------------------------------------------------------------ datasets

/**
 * Each dataset: its DatasetMeta prose (the counts, direction, weights, size and checksum are
 * filled in from the built snapshot), and a build function returning fromEdgeArrays input.
 */
const DATASETS = [
    {
        meta: {
            name: "road-ny",
            title: "New York City road network (DIMACS)",
            description:
                "Road intersections of the New York City area and the road segments between them, from the US Census TIGER/Line files as prepared for the 9th DIMACS shortest-path challenge. Every road is two opposite arcs, weighted by its length in the challenge's integer distance units; each intersection carries its longitude and latitude.",
            citation:
                "C. Demetrescu, A. V. Goldberg and D. S. Johnson (eds.), The Shortest Path Problem: Ninth DIMACS Implementation Challenge, DIMACS Series in Discrete Mathematics and Theoretical Computer Science 74, AMS (2009). Data: US Census Bureau TIGER/Line.",
            source: SOURCES.roadNyArcs.url,
            license:
                "Public domain: derived from the US Census Bureau TIGER/Line files, a work of the US federal government; the challenge page states no further terms.",
            attributes: {
                longitude: "f64: degrees east (negative: west)",
                latitude: "f64: degrees north",
            },
            groundTruth: null,
            showcases: [
                "Dijkstra, bidirectional search and A* with a geographic heuristic",
                "geographic layout of a quarter of a million nodes",
                "minimum spanning trees and connectivity at scale",
            ],
        },
        sources: ["roadNyArcs", "roadNyCoordinates"],
        build(files) {
            // "p sp <n> <m>", then "a <u> <v> <length>" with 1-based ids
            const arcs = textLines(files.roadNyArcs);
            const [n, m] = arcs
                .find((line) => line.startsWith("p "))
                .split(" ")
                .slice(2)
                .map(Number);
            const src = new Uint32Array(m);
            const dst = new Uint32Array(m);
            const weights = new Float32Array(m);
            let e = 0;
            for (const line of arcs) {
                if (line.startsWith("a ")) {
                    const [, u, v, w] = line.split(" ");
                    src[e] = Number(u) - 1;
                    dst[e] = Number(v) - 1;
                    weights[e++] = Number(w);
                }
            }
            // "v <id> <x> <y>": longitude and latitude in millionths of a degree
            const longitude = new Float64Array(n);
            const latitude = new Float64Array(n);
            let seen = 0;
            for (const line of textLines(files.roadNyCoordinates)) {
                if (line.startsWith("v ")) {
                    const [, id, x, y] = line.split(" ");
                    longitude[Number(id) - 1] = Number(x) / 1e6;
                    latitude[Number(id) - 1] = Number(y) / 1e6;
                    seen++;
                }
            }
            if (e !== m || seen !== n) {
                throw new Error(`road-ny: ${e} of ${m} arcs, ${seen} of ${n} coordinates`);
            }
            return { directed: true, nodeCount: n, src, dst, weights, nodeColumns: { longitude, latitude } };
        },
    },
    {
        meta: {
            name: "ogbn-arxiv",
            title: "arXiv computer-science citations (ogbn-arxiv)",
            description:
                "Citations among the computer-science arXiv papers indexed by the Microsoft Academic Graph, from the Open Graph Benchmark. An arc runs from the citing paper to the cited one. Each paper carries its publication year and its arXiv subject area, one of 40 (the ground truth); the benchmark's 128-dimensional text features are not included.",
            citation:
                "W. Hu, M. Fey, M. Zitnik, Y. Dong, H. Ren, B. Liu, M. Catasta and J. Leskovec, Open Graph Benchmark: Datasets for Machine Learning on Graphs, NeurIPS 2020. arXiv:2005.00687; K. Wang, Z. Shen, C. Huang, C.-H. Wu, Y. Dong and A. Kanakia, Microsoft Academic Graph: When experts are not enough, Quantitative Science Studies 1(1), 396-413 (2020). doi:10.1162/qss_a_00021",
            source: SOURCES.arxiv.url,
            license: "ODC-BY 1.0 (Open Data Commons Attribution License), as stated by the Open Graph Benchmark.",
            attributes: {
                year: "u32: the publication year",
                subject: 'dict: the arXiv subject area, e.g. "cs.LG" (ground truth)',
            },
            groundTruth: "subject",
            showcases: [
                "PageRank and citation counts at 170k nodes",
                "community detection against 40 subject areas",
                "near-DAG structure: strongly connected components, topological order by year",
            ],
        },
        sources: ["arxiv"],
        build(files) {
            const edgeLines = zipGzLines(files.arxiv, "arxiv/raw/edge.csv.gz");
            const src = new Uint32Array(edgeLines.length);
            const dst = new Uint32Array(edgeLines.length);
            edgeLines.forEach((line, e) => {
                const [u, v] = line.split(",");
                src[e] = Number(u);
                dst[e] = Number(v);
            });
            const year = Uint32Array.from(zipGzLines(files.arxiv, "arxiv/raw/node_year.csv.gz"), Number);
            // "arxiv cs na" -> "cs.NA"
            const subjects = zipGzLines(files.arxiv, "arxiv/mapping/labelidx2arxivcategeory.csv.gz")
                .slice(1)
                .map((line) => {
                    const [, , archive, area] = line.split(/[, ]/);
                    return `${archive}.${area.toUpperCase()}`;
                });
            const labels = zipGzLines(files.arxiv, "arxiv/raw/node-label.csv.gz").map((line) => subjects[Number(line)]);
            if (labels.length !== year.length || labels.includes(undefined)) {
                throw new Error("ogbn-arxiv: the label and year files disagree");
            }
            return {
                directed: true,
                nodeCount: year.length,
                src,
                dst,
                nodeColumns: {
                    year,
                    subject: { data: labels, decl: { dtype: "dict", options: [...subjects].sort() } },
                },
            };
        },
    },
    {
        meta: {
            name: "go-basic",
            title: "Gene Ontology (go-basic)",
            description:
                "The Gene Ontology's basic edition: every GO term of the three namespaces (biological process, molecular function, cellular component) and the relations among them that never cross namespaces. An arc runs from a term to its parent (is_a, part_of, regulates, ...); a term related to one parent in two ways keeps one arc. Obsolete terms are kept, with no arcs, and marked. Read by graph-io's OBO importer from the release of 2026-07-26.",
            citation:
                "The Gene Ontology Consortium, The Gene Ontology knowledgebase in 2023, Genetics 224(1), iyad031 (2023). doi:10.1093/genetics/iyad031; GO release 2026-07-26 (release.geneontology.org/2026-08-05)",
            source: SOURCES.goBasic.url,
            license: "CC BY 4.0 (Gene Ontology Consortium; https://geneontology.org/docs/go-citation-policy/).",
            attributes: {
                label: "string: the term's name",
                namespace: "dict: biological_process, molecular_function or cellular_component (ground truth)",
                obsolete: "u8: 1 for an obsolete term (the OBO is_obsolete tag)",
            },
            groundTruth: "namespace",
            showcases: [
                "hierarchical layouts of a 48,000-term DAG",
                "ancestors, descendants and topological order",
                "coloring terms by namespace; hiding obsolete terms",
            ],
        },
        sources: ["goBasic"],
        build(files) {
            return readWithGraphIo(files.goBasic, "obo", {
                columns: {
                    label: { from: "name", dtype: "string", role: "label" },
                    namespace: { from: "namespace", dtype: "dict", missing: "none" },
                    obsolete: { from: "is_obsolete", dtype: "u8" },
                },
            });
        },
    },
    {
        meta: {
            name: "disease-ontology",
            title: "Human Disease Ontology (DOID)",
            description:
                "The Human Disease Ontology: human diseases and the is_a hierarchy that classifies them, a second large ontology and a public-domain one. An arc runs from a disease to its parent. Obsolete terms are kept, with no arcs, and marked. Read by graph-io's OBO importer from release v2026-09-30.",
            citation:
                "L. M. Schriml et al., The Human Disease Ontology 2022 update, Nucleic Acids Research 50(D1), D1255-D1261 (2022). doi:10.1093/nar/gkab1063",
            source: SOURCES.doid.url,
            license: "CC0 1.0 (the ontology's own terms:license).",
            attributes: {
                label: "string: the disease's name",
                obsolete: "u8: 1 for an obsolete term (the OBO is_obsolete tag)",
            },
            groundTruth: null,
            showcases: [
                "tree and hierarchical layouts of a 15,000-term ontology",
                "depth and ancestor queries",
                "search by label",
            ],
        },
        sources: ["doid"],
        build(files) {
            return readWithGraphIo(files.doid, "obo", {
                columns: {
                    label: { from: "name", dtype: "string", role: "label" },
                    obsolete: { from: "is_obsolete", dtype: "u8" },
                },
            });
        },
    },
    {
        meta: {
            name: "bioplex3-hct116",
            title: "BioPlex 3.0 protein interactions in HCT116 cells",
            description:
                "Human protein-protein interactions found by affinity purification and mass spectrometry in HCT116 cells (BioPlex 3.0), as published on NDEx in CX2 with a full saved layout. Each protein carries its gene symbol as the label and its saved position (x, y, y growing upward). Directed as CX2 stores every edge, though an interaction itself has no direction. Read by graph-io's CX2 importer.",
            citation:
                "E. L. Huttlin et al., Dual proteome-scale networks reveal cell-specific remodeling of the human interactome, Cell 184(11), 3022-3040 (2021). doi:10.1016/j.cell.2021.04.011; NDEx network e96d063d-237a-11ea-bb65-0ac135e8bacf",
            source: SOURCES.bioplex.url,
            license: "CC0 1.0 (the network's rights: Waiver-No rights reserved (CC0), holder Harvard Medical School).",
            attributes: {
                label: "string: the gene symbol",
                x: "f64: the saved x",
                y: "f64: the saved y, growing upward",
            },
            groundTruth: null,
            showcases: [
                "a 10,000-node network drawn from its saved layout",
                "force layouts and community detection at scale",
                "degree and betweenness of interaction hubs",
            ],
        },
        sources: ["bioplex"],
        build(files) {
            return readWithGraphIo(files.bioplex, "cx2", {
                columns: {
                    label: { from: "name", dtype: "string", role: "label" },
                    x: { position: 0, dtype: "f64" },
                    y: { position: 1, dtype: "f64" },
                },
            });
        },
    },
    {
        meta: {
            name: "com-dblp",
            title: "DBLP co-authorship (SNAP com-DBLP)",
            description:
                "Co-authorship among computer scientists in the DBLP bibliography, as prepared by SNAP: two authors are joined when they published at least one paper together. Node ids are SNAP's author numbers. SNAP's ground-truth venue communities overlap, so they are not included as a column.",
            citation:
                "J. Yang and J. Leskovec, Defining and evaluating network communities based on ground-truth, IEEE ICDM 2012, 745-754. doi:10.1109/ICDM.2012.138; dblp computer science bibliography, https://dblp.org",
            source: SOURCES.dblp.url,
            license:
                "unclear: SNAP states no license for its files; the underlying dblp data is CC0 1.0 (https://dblp.org/db/about/copyright.html).",
            attributes: {},
            groundTruth: null,
            showcases: [
                "community detection (Louvain, Leiden, label propagation) at 300k nodes",
                "k-core decomposition and clustering coefficients",
                "degree distributions of a real collaboration network",
            ],
        },
        sources: ["dblp"],
        build(files) {
            // "#" comments, then "<a>\t<b>" per undirected edge; ids are sparse integers
            const pairs = textLines(files.dblp).filter((line) => line.length > 0 && !line.startsWith("#"));
            const raw = new Float64Array(pairs.length * 2);
            pairs.forEach((line, e) => {
                const [a, b] = line.split("\t");
                raw[2 * e] = Number(a);
                raw[2 * e + 1] = Number(b);
            });
            const ids = Float64Array.from(new Set(raw)).sort();
            const index = new Map(Array.from(ids, (id, i) => [id, i]));
            const src = new Uint32Array(pairs.length);
            const dst = new Uint32Array(pairs.length);
            for (let e = 0; e < pairs.length; e++) {
                src[e] = index.get(raw[2 * e]);
                dst[e] = index.get(raw[2 * e + 1]);
            }
            return { directed: false, nodeCount: ids.length, ids, src, dst };
        },
    },
];

// ------------------------------------------------------------------ output

/** JSON with every non-ASCII character escaped, so the TS source stays plain ASCII. */
function asciiJson(value, indent) {
    return JSON.stringify(value, null, indent).replace(
        /[\u0080-\uffff]/g,
        (c) => String.raw`\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
}

/**
 * Copy the small datasets' files from graph-samples' build into the output.
 * @returns {object[]} their index.json entries
 */
function copySmallDatasets() {
    const packed = path.join(packageRoot, "dist/data/v1");
    if (!existsSync(path.join(packed, "index.json"))) {
        throw new Error(`${packed}/index.json is missing: build graph-samples first (npm run build:all)`);
    }
    const index = JSON.parse(readFileSync(path.join(packed, "index.json"), "utf8"));
    for (const { name, thumbnail } of index) {
        copyFileSync(path.join(packed, `${name}.gsnp.gz`), path.join(outDir, `${name}.gsnp.gz`));
        if (thumbnail !== undefined) {
            copyFileSync(path.join(packed, thumbnail), path.join(outDir, thumbnail));
        }
    }
    console.log(`copied ${index.length} small datasets from dist/data/v1/`);
    return index;
}

async function main() {
    mkdirSync(outDir, { recursive: true });
    const small = copySmallDatasets();
    const pictures = path.join(packageRoot, "thumbnails");
    for (const file of readdirSync(pictures)) {
        copyFileSync(path.join(pictures, file), path.join(outDir, file));
    }
    // the checksums this commit records (graph-samples' tsc output of src/datasets/hosted.ts)
    const recorded = reusePublished
        ? (await import(pathToFileURL(path.join(packageRoot, "dist/src/datasets/hosted.js")).href)).HOSTED_DATASETS
        : [];
    const metas = [];
    for (const dataset of DATASETS) {
        const recordedSha = recorded.find((meta) => meta.name === dataset.meta.name)?.sha256;
        // canary first, then graphty.app (before canary serves the data, or while it cannot be read); both are
        // checked against the recorded SHA-256
        let gz =
            (await publishedCopy(`${REUSE_URL}${dataset.meta.name}.gsnp.gz`, recordedSha)) ??
            (await publishedCopy(`${BASE_URL}${dataset.meta.name}.gsnp.gz`, recordedSha));
        let snapshot;
        if (gz === null) {
            const files = {};
            for (const key of dataset.sources) {
                files[key] = await source(key);
            }
            snapshot = fromEdgeArrays(await dataset.build(files));
            gz = gzipSync(snapshot.toBytes(), { level: 9 });
        } else {
            console.log(`${dataset.meta.name}: reusing the published file (sha256 ${recordedSha})`);
            snapshot = fromBytes(gunzipSync(gz));
        }
        writeFileSync(path.join(outDir, `${dataset.meta.name}.gsnp.gz`), gz);
        const {
            name,
            title,
            description,
            citation,
            source: url,
            license,
            attributes,
            groundTruth,
            showcases,
        } = dataset.meta;
        metas.push({
            name,
            title,
            description,
            citation,
            source: url,
            license,
            nodes: snapshot.nodeCount,
            edges: snapshot.edgeCount,
            directed: snapshot.directed,
            weighted: snapshot.weights !== null,
            attributes,
            groundTruth,
            showcases,
            hosting: "remote",
            bytes: gz.length,
            sha256: createHash("sha256").update(gz).digest("hex"),
            ...(existsSync(path.join(pictures, `${name}.webp`)) ? { thumbnail: `${name}.webp` } : {}),
        });
        console.log(`${name}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, ${gz.length} bytes`);
    }
    writeFileSync(
        path.join(outDir, "index.json"),
        asciiJson([...small, ...metas.map((meta) => ({ ...meta, url: BASE_URL + meta.name + ".gsnp.gz" }))], 2) + "\n",
    );
    const hosted = path.join(packageRoot, "src/datasets/hosted.ts");
    writeFileSync(
        hosted,
        [
            "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-samples/scripts/build-hosted.mjs",
            "",
            'import { type DatasetMeta } from "./build.js";',
            "",
            "/**",
            " * The metadata of every large dataset (over about 5,000 nodes), loaded with `fetchDataset(name)` from",
            " * https://graphty.app/data/graph-samples/v1/. `sha256` and `bytes` describe the published .gsnp.gz file.",
            " */",
            `export const HOSTED_DATASETS: readonly DatasetMeta[] = ${asciiJson(metas, 4)};`,
            "",
        ].join("\n"),
    );
    const hostedNames = path.join(packageRoot, "src/datasets/hosted-names.ts");
    writeFileSync(
        hostedNames,
        [
            "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-samples/scripts/build-hosted.mjs",
            "",
            "/** The name of every hosted dataset, in the order of `HOSTED_DATASETS`, without the metadata. */",
            `export const HOSTED_DATASET_NAMES: readonly string[] = ${asciiJson(
                metas.map((meta) => meta.name),
                4,
            )};`,
            "",
        ].join("\n"),
    );
    // format like the rest of the source when the workspace is installed (deploy-pages is not)
    const prettier = path.resolve(packageRoot, "../node_modules/.bin/prettier");
    if (existsSync(prettier)) {
        execFileSync(prettier, ["--write", hosted, hostedNames], { cwd: packageRoot, stdio: "ignore" });
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
