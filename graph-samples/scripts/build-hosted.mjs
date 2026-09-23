#!/usr/bin/env node
/**
 * Build the hosted datasets: the graphs too large to bundle (over about 5,000 nodes), published
 * at https://graphty.app/data/graph-samples/v1/<name>.gsnp.gz and loaded with fetchDataset().
 *
 *     node scripts/build-hosted.mjs [--cache <dir>]
 *
 * For every dataset below it fetches the sources once into the cache directory (default:
 * <repo>/tmp/graph-samples-sources), refuses a source whose SHA-256 is not the one recorded here,
 * builds a graph-format snapshot with its node columns, and writes
 *
 *   public-data/v1/<name>.gsnp.gz   the snapshot's wire bytes (snapshot.toBytes()), gzipped
 *   public-data/v1/index.json       every hosted dataset's metadata, URL, size and checksum
 *   src/datasets/hosted.ts          the same metadata for the DATASETS catalogue (committed)
 *
 * public-data/ is build output and is not committed; .github/workflows/deploy-pages.yml runs this
 * script and publishes public-data/v1/ as /data/graph-samples/v1/. Needs `unzip` on the PATH and a
 * built graph-format (graph-format/dist). Running it twice writes identical files.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync, gzipSync } from "node:zlib";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheFlag = process.argv.indexOf("--cache");
const cacheDir =
    cacheFlag >= 0
        ? path.resolve(process.argv[cacheFlag + 1])
        : path.resolve(packageRoot, "../tmp/graph-samples-sources");
const outDir = path.join(packageRoot, "public-data/v1");
const BASE_URL = "https://graphty.app/data/graph-samples/v1/";

// graph-format from its build output, so the script runs without a workspace install
const { fromEdgeArrays } = await import(
    pathToFileURL(path.resolve(packageRoot, "../graph-format/dist/graph-format.js")).href
);

/** Every source file, its URL and its checksum. */
const SOURCES = {
    roadNyArcs: {
        url: "http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.gr.gz",
        sha256: "7b2446c7ffe6179efbc42af6812448e8cb782f12968ca2bb1d50d979343056d4",
        file: "USA-road-d.NY.gr.gz",
    },
    roadNyCoordinates: {
        url: "http://www.diag.uniroma1.it/challenge9/data/USA-road-d/USA-road-d.NY.co.gz",
        sha256: "02547a628742164e02bd73f59e33a65d23dfac8fc54c09275c8b9169c38eafdf",
        file: "USA-road-d.NY.co.gz",
    },
    arxiv: {
        url: "http://snap.stanford.edu/ogb/data/nodeproppred/arxiv.zip",
        sha256: "49f85c801589ecdcc52cfaca99693aaea7b8af16a9ac3f41dd85a5f3193fe276",
        file: "ogbn-arxiv.zip",
    },
    dblp: {
        url: "https://snap.stanford.edu/data/bigdata/communities/com-dblp.ungraph.txt.gz",
        sha256: "9eb0bd30312ddd04e2624f7c36c0983a2e99b116f0385be5a7fce6d6170f4cb3",
        file: "com-dblp.ungraph.txt.gz",
    },
};

// ------------------------------------------------------------------ fetching

async function source(key) {
    const { url, sha256, file } = SOURCES[key];
    const target = path.join(cacheDir, file);
    if (!existsSync(target)) {
        mkdirSync(cacheDir, { recursive: true });
        console.log(`fetching ${url}`);
        const response = await fetch(url, { headers: { "User-Agent": "graphty-graph-samples-build-hosted" } });
        if (!response.ok) {
            throw new Error(`${url}: HTTP ${response.status}`);
        }
        writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
    const actual = createHash("sha256").update(readFileSync(target)).digest("hex");
    if (actual !== sha256) {
        throw new Error(
            `${file}: sha256 ${actual}, expected ${sha256} -- the source changed; review it before updating`,
        );
    }
    return target;
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
        /[^\x00-\x7f]/g,
        (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`,
    );
}

async function main() {
    mkdirSync(outDir, { recursive: true });
    const metas = [];
    for (const dataset of DATASETS) {
        const files = {};
        for (const key of dataset.sources) {
            files[key] = await source(key);
        }
        const snapshot = fromEdgeArrays(dataset.build(files));
        const gz = gzipSync(snapshot.toBytes(), { level: 9 });
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
        });
        console.log(`${name}: ${snapshot.nodeCount} nodes, ${snapshot.edgeCount} edges, ${gz.length} bytes`);
    }
    writeFileSync(
        path.join(outDir, "index.json"),
        `${asciiJson(
            metas.map((meta) => ({ ...meta, url: `${BASE_URL}${meta.name}.gsnp.gz` })),
            2,
        )}\n`,
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
            " * The metadata of every hosted dataset: too large to bundle, loaded with `fetchDataset(name)` from",
            " * https://graphty.app/data/graph-samples/v1/. `sha256` and `bytes` describe the published .gsnp.gz file.",
            " */",
            `export const HOSTED_DATASETS: readonly DatasetMeta[] = ${asciiJson(metas, 4)};`,
            "",
        ].join("\n"),
    );
    // format like the rest of the source when the workspace is installed (deploy-pages is not)
    const prettier = path.resolve(packageRoot, "../node_modules/.bin/prettier");
    if (existsSync(prettier)) {
        execFileSync(prettier, ["--write", hosted], { cwd: packageRoot, stdio: "ignore" });
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
