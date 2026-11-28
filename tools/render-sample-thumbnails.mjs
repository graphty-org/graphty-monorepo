#!/usr/bin/env node
/**
 * Draw a small picture of every graph-samples dataset and every generator with the real
 * graphty-element, so a sample library can show what a graph looks like before anyone opens it:
 *
 *     node tools/render-sample-thumbnails.mjs [name ...]
 *
 * A name is a dataset's name or a generator's name; none draws them all. Writes, committed:
 *
 *   graph-samples/thumbnails/<dataset>.webp              every dataset, small and large
 *   graph-samples/thumbnails/generator-<generator>.webp  every generator in GENERATOR_CATALOG
 *   graph-samples/data/thumbnails.json                   the SHA-256 of the file each dataset's picture was drawn from
 *   graphty/public/samples/<sample>.webp                 the graphty app's own samples in APP_SAMPLES
 *   graphty/public/samples/network-<source>.webp         the start page's network samples in NETWORK_SAMPLES
 *   graphty/public/samples/programs/<id>.webp            the start page's sample files from other programs
 *
 * graph-samples' pack step copies them into dist/data/v1/ (and build-hosted.mjs into the files
 * graphty.app publishes at https://graphty.app/data/graph-samples/v1/), and each is named by the
 * dataset's `thumbnail` or the generator descriptor's `thumbnail` (`npm run datasets:pack` in
 * graph-samples after a rerun here).
 *
 * The same picture every run: a fixed size, the communities graphty-element's Louvain finds, gray
 * edges, drawn headless by Chromium on SwiftShader with a transparent background.
 *
 * - A small dataset: the whole graph, a seeded 2D force layout.
 * - A large dataset (too big to lay out for a 480 x 300 picture) is drawn from a sample of it, laid
 *   out the same way: road-ny is every intersection within a breadth-first ball around the
 *   intersection nearest the network's middle, drawn at its longitude and latitude (the "fixed"
 *   layout); every other one is a seeded snowball sample -- a breadth-first walk out from the
 *   highest-degree node that follows at most SNOWBALL_FANOUT random neighbors of each node -- with
 *   every edge among the sampled nodes. A large dataset's file is read from graph-samples/dist/data/v1/
 *   or public-data/v1/ when built, else downloaded from graphty.app into tmp/graph-samples-hosted/
 *   (not committed) and checked against the catalog's SHA-256.
 * - A generator: its default parameters (the random ones' default seed, 0), in the layout that shows
 *   its structure (GENERATOR_LAYOUTS below); a generator that emits x and y columns is drawn at them,
 *   and one not listed gets the force layout, which graphty-element's recommendLayout picks for a
 *   connected graph that carries no positions.
 * - A network sample: the source's own public example, read live from its server, so a rerun needs
 *   network access.
 * - A sample file from another program (graph-io/test/corpus/programs/samples.json, named `program-<id>`): the
 *   app's copy of the file, drawn as the app opens a sample, with its file's styles and layout "placed" (where the
 *   file put its nodes, else the layout it asks for), and with its own background when it names one.
 *
 * Needs a built graph-format, graph-samples (with dist/data/v1/) and graphty-element
 * (dist/graphty.bundle.js).
 */

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { gunzipSync } from "node:zlib";

import { chromium } from "playwright";

import { WAIT_GUARD_MS } from "./test-wait-guard.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "graph-samples/dist/data/v1");
const hostedDir = path.join(root, "graph-samples/public-data/v1");
const downloadDir = path.join(root, "tmp/graph-samples-hosted");
const outDir = path.join(root, "graph-samples/thumbnails");
const bundle = path.join(root, "graphty-element/dist/graphty.bundle.js");
const assetsDir = path.join(root, "graphty-element/dist/assets");
/** The optional Graphviz package graphty-element's Graphviz Worker loads, served at GRAPHVIZ_URL. */
const graphvizPackage = path.join(root, "graphty-element/node_modules/@hpcc-js/wasm-graphviz/dist/index.js");
const GRAPHVIZ_URL = "/hpcc-js-wasm-graphviz.js";
/** The graphty app's own samples that have no graph-samples dataset to take a picture from. */
const appSamplesDir = path.join(root, "graphty/public/samples");
const APP_SAMPLES = ["campus-contacts", "graph-research", "marvel-films", "paper-citations"];
/** The start page's network samples: a source id and that source's example. */
const NETWORK_SAMPLES = JSON.parse(
    readFileSync(path.join(root, "graphty/src/workspace/start/network-samples.json"), "utf8"),
);

/** The start page's sample files from other programs, served from the app's copies. */
const programsDir = path.join(appSamplesDir, "programs");
const PROGRAM_SAMPLES = JSON.parse(readFileSync(path.join(root, "graph-io/test/corpus/programs/samples.json"), "utf8"));

/** The layout and sampling seed, so every run draws the same picture. */
const SEED = 7;
/** How many nodes a large dataset's sample holds. */
const SAMPLE_NODES = 1000;
/** How many intersections road-ny's picture holds. */
const ROAD_NODES = 2500;
/** How many neighbors of each node the snowball sample follows. */
const SNOWBALL_FANOUT = 6;
/** How far apart positions from the data are drawn: the side of the square they fill, per node's square root. */
const SPREAD = 6;
/**
 * Darker, more solid lines and larger nodes for a dense picture whose default marks are too faint
 * to read on a light card (venice-transit: 1,874 stops drawn at 480 x 300).
 */
const EMPHASIS = {
    "venice-transit": {
        edge: { "edge.color": "#3c4252", "edge.opacity": 0.9 },
        node: { "node.size": 2.5, "node.outline": "#2b2f3a" },
    },
};

const { fromBytes } = await import(pathToFileURL(path.join(root, "graph-format/dist/src/index.js")).href);
const { DATASETS, DEFAULT_DATASET_BASE_URL, GENERATOR_CATALOG, THUMBNAIL_SIZE, toElementData } = await import(
    pathToFileURL(path.join(root, "graph-samples/dist/src/index.js")).href
);
/** The picture's size in pixels (480 x 300: twice a 240 x 150 tile, for sharp screens). */
const { width: WIDTH, height: HEIGHT } = THUMBNAIL_SIZE;
/** Each dataset's picture: the SHA-256 of the file it was drawn from, which graph-samples' tests compare with the catalog. */
const drawnFromFile = path.join(root, "graph-samples/data/thumbnails.json");
const drawnFrom = existsSync(drawnFromFile) ? JSON.parse(readFileSync(drawnFromFile, "utf8")) : {};
const { generateGraph } = await import(
    pathToFileURL(path.join(root, "graph-samples/dist/src/generators/index.js")).href
);

/**
 * The layout each generator is drawn in, where the force layout would hide its structure. A
 * function of the generated graph's records, for the layouts that need to be told a start node or
 * the groups.
 */
const GENERATOR_LAYOUTS = {
    "balanced-tree": () => tree(0),
    grid: () => ({ id: "grid", options: { columns: 15, scalingFactor: 22 } }),
    "grid-3d": () => kamadaKawai(),
    "hexagonal-lattice": () => kamadaKawai(),
    "triangular-lattice": () => ({ id: "grid", options: { columns: 10, scalingFactor: 16 } }),
    hypercube: () => kamadaKawai(),
    ladder: () => kamadaKawai(),
    path: () => kamadaKawai(),
    petersen: () => kamadaKawai(),
    named: () => kamadaKawai(),
    "circular-ladder": () => kamadaKawai(),
    cycle: () => ({ id: "circular", options: {} }),
    wheel: () => ({ id: "radial", options: { root: 0 } }),
    "mobius-ladder": () => ({ id: "circular", options: {} }),
    complete: () => ({ id: "circular", options: {} }),
    empty: () => ({ id: "circular", options: {} }),
    star: () => ({ id: "radial", options: { root: 0 } }),
    "random-apollonian": () => kamadaKawai(),
    "complete-bipartite": (records) => twoColumns(records, "side"),
    "random-bipartite": (records) => twoColumns(records, "side"),
    "bipartite-configuration-model": (records) => twoColumns(records, "side"),
    "complete-multipartite": (records) => columns(records, "part"),
    "random-dag": (records) => columns(records, "layer"),
    "layered-flow-network": (records) => columns(records, "layer"),
};

/**
 * A tree drawn out from its root in rings, one ring per depth.
 * @param root - the root's id
 * @returns the layout
 */
function tree(root) {
    return { id: "radial", options: { root } };
}

/**
 * The force layout drawn by Kamada-Kawai, which lays a lattice out evenly.
 * @returns the layout
 */
function kamadaKawai() {
    return { id: "force", engine: "kamada-kawai", options: { dim: 2 } };
}

/**
 * Two columns, one per value of a 0/1 node column.
 * @param records - the graph's records
 * @param key - the column
 * @returns the layout
 */
function twoColumns(records, key) {
    return {
        id: "bipartite",
        options: { nodes: records.nodes.filter((node) => node[key] === 0).map((node) => node.id) },
    };
}

/**
 * A column per value of a node column, in the value's order.
 * @param records - the graph's records
 * @param key - the column
 * @returns the layout
 */
function columns(records, key) {
    const subsetKey = {};
    for (const node of records.nodes) {
        const value = String(node[key]);
        subsetKey[value] ??= [];
        subsetKey[value].push(node.id);
    }
    return { id: "layers", options: { subsetKey } };
}

/**
 * A seeded random number generator (mulberry32), for the samples.
 * @param seed - the seed
 * @returns a function giving numbers in [0, 1)
 */
function random(seed) {
    let state = seed >>> 0;
    return () => {
        state = (state + 0x6d2b79f5) >>> 0;
        let t = state;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Every node's neighbors, ignoring direction.
 * @param snapshot - the graph
 * @returns one array of neighbor indices per node
 */
function neighborsOf(snapshot) {
    const neighbors = Array.from({ length: snapshot.nodeCount }, () => []);
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const u = snapshot.edgeSource(e);
        const v = snapshot.edgeTarget(e);
        if (u !== v) {
            neighbors[u].push(v);
            neighbors[v].push(u);
        }
    }
    return neighbors;
}

/**
 * A breadth-first sample: out from `start`, following at most `fanout` random neighbors of each node.
 * @param neighbors - every node's neighbors
 * @param start - the first node
 * @param fanout - how many neighbors of a node to follow, or Infinity for all of them
 * @returns the sampled node indices
 */
function breadthFirstSample(neighbors, start, fanout) {
    const next = random(SEED);
    const picked = new Set([start]);
    const queue = [start];
    while (queue.length > 0 && picked.size < SAMPLE_NODES) {
        const u = queue.shift();
        const options = [...new Set(neighbors[u])].filter((v) => !picked.has(v));
        for (let i = options.length - 1; i > 0; i--) {
            const j = Math.floor(next() * (i + 1));
            [options[i], options[j]] = [options[j], options[i]];
        }
        for (const v of options.slice(0, fanout)) {
            if (picked.size < SAMPLE_NODES) {
                picked.add(v);
                queue.push(v);
            }
        }
    }
    return picked;
}

/**
 * The records of the sampled nodes and every edge among them, once per pair.
 * @param snapshot - the graph
 * @param picked - the sampled node indices
 * @param position - a node's position from the data, or undefined
 * @returns the records
 */
function sampleRecords(snapshot, picked, position) {
    const nodes = [...picked].map((i) => ({ id: i, ...position?.(i) }));
    const seen = new Set();
    const edges = [];
    for (let e = 0; e < snapshot.edgeCount; e++) {
        const u = snapshot.edgeSource(e);
        const v = snapshot.edgeTarget(e);
        const key = u < v ? `${u} ${v}` : `${v} ${u}`;
        if (u !== v && picked.has(u) && picked.has(v) && !seen.has(key)) {
            seen.add(key);
            edges.push({ source: u, target: v });
        }
    }
    return { nodes, edges };
}

/**
 * Data positions spread to the size a force layout draws a graph of this many nodes.
 * @param xs - every node's x
 * @param ys - every node's y
 * @returns the position of node i
 */
function spread(xs, ys) {
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) || 1;
    const scale = (SPREAD * Math.sqrt(xs.length)) / span;
    const mx = Math.min(...xs);
    const my = Math.min(...ys);
    return (i) => ({ position: { x: (xs[i] - mx) * scale, y: (ys[i] - my) * scale, z: 0 } });
}

/**
 * A large dataset's file: built here, or downloaded from graphty.app and checked.
 * @param meta - the dataset's metadata
 * @returns the snapshot
 */
async function largeSnapshot(meta) {
    const file = `${meta.name}.gsnp.gz`;
    const local = [path.join(dataDir, file), path.join(hostedDir, file), path.join(downloadDir, file)].find((p) =>
        existsSync(p),
    );
    let bytes;
    if (local === undefined) {
        const response = await fetch(DEFAULT_DATASET_BASE_URL + file);
        if (!response.ok) {
            throw new Error(`${file}: HTTP ${response.status}`);
        }
        bytes = Buffer.from(await response.arrayBuffer());
        mkdirSync(downloadDir, { recursive: true });
        writeFileSync(path.join(downloadDir, file), bytes);
    } else {
        bytes = readFileSync(local);
    }
    const sha256 = createHash("sha256").update(bytes).digest("hex");
    if (meta.sha256 !== undefined && sha256 !== meta.sha256) {
        throw new Error(`${file}: SHA-256 ${sha256}, the catalogue says ${meta.sha256}`);
    }
    return fromBytes(new Uint8Array(gunzipSync(bytes)));
}

/**
 * What to draw for a large dataset: a sample of it.
 * @param meta - the dataset's metadata
 * @returns the job
 */
async function largeJob(meta) {
    const snapshot = await largeSnapshot(meta);
    const neighbors = neighborsOf(snapshot);
    if (meta.name === "road-ny") {
        const lon = snapshot.nodes.get("longitude").data;
        const lat = snapshot.nodes.get("latitude").data;
        const middle = (values) => [...values].sort((a, b) => a - b)[values.length >> 1];
        const [mx, my] = [middle(lon), middle(lat)];
        const distance = (i) => (lon[i] - mx) ** 2 + (lat[i] - my) ** 2;
        const picked = Array.from({ length: snapshot.nodeCount }, (_, i) => i)
            .sort((a, b) => distance(a) - distance(b))
            .slice(0, ROAD_NODES);
        // east-west degrees shrink with latitude; y grows up the picture, north
        const xs = picked.map((i) => lon[i] * Math.cos((my * Math.PI) / 180));
        const ys = picked.map((i) => lat[i]);
        const at = spread(xs, ys);
        const row = new Map(picked.map((i, k) => [i, k]));
        return {
            records: sampleRecords(snapshot, new Set(picked), (i) => at(row.get(i))),
            layout: { id: "fixed", options: {} },
        };
    }
    let hub = 0;
    for (let i = 1; i < snapshot.nodeCount; i++) {
        if (neighbors[i].length > neighbors[hub].length) {
            hub = i;
        }
    }
    return {
        records: sampleRecords(snapshot, breadthFirstSample(neighbors, hub, SNOWBALL_FANOUT)),
        layout: { id: "force", options: { seed: SEED } },
    };
}

/**
 * Every picture to draw.
 * @param wanted - the names asked for, or none for all
 * @returns the jobs, each with its file name, records and layout
 */
async function jobs(wanted) {
    const want = (name) => wanted.length === 0 || wanted.includes(name);
    const list = [];
    for (const name of APP_SAMPLES.filter(want)) {
        const graph = JSON.parse(readFileSync(path.join(appSamplesDir, `${name}.json`), "utf8"));
        list.push({
            file: path.join(appSamplesDir, `${name}.webp`),
            name,
            directed: graph.directed,
            records: { nodes: graph.nodes, edges: graph.links },
            layout: { id: "force", options: { seed: SEED } },
        });
    }
    for (const { source, example } of NETWORK_SAMPLES.filter(({ source }) => want(`network-${source}`))) {
        list.push({
            file: path.join(appSamplesDir, `network-${source}.webp`),
            name: `network-${source}`,
            source,
            example,
            layout: { id: "force", options: { seed: SEED } },
        });
    }
    for (const sample of PROGRAM_SAMPLES.filter(({ id }) => want(`program-${id}`))) {
        list.push({
            file: path.join(programsDir, `${sample.id}.webp`),
            name: `program-${sample.id}`,
            program: {
                type: sample.type ?? sample.format,
                url: `/programs/${sample.app}`,
                options:
                    sample.columns === undefined
                        ? {}
                        : { edgeSource: sample.columns.source, edgeTarget: sample.columns.target },
            },
            layout: { id: "placed" },
        });
    }
    for (const meta of DATASETS.filter((each) => want(each.name))) {
        const small = existsSync(path.join(dataDir, `${meta.name}.gsnp.gz`)) && meta.nodes <= 5000;
        const job = small
            ? {
                  records: toElementData(
                      fromBytes(new Uint8Array(gunzipSync(readFileSync(path.join(dataDir, `${meta.name}.gsnp.gz`))))),
                  ),
                  layout: { id: "force", options: { seed: SEED } },
              }
            : await largeJob(meta);
        list.push({ file: `${meta.name}.webp`, name: meta.name, directed: meta.directed, sha256: meta.sha256, ...job });
    }
    for (const generator of GENERATOR_CATALOG.filter((each) => want(each.name))) {
        const params = Object.fromEntries(generator.params.map((param) => [param.name, param.default]));
        const graph = generateGraph(generator.name, params);
        const records = toElementData(graph);
        const x = graph.nodeColumns?.x;
        const y = graph.nodeColumns?.y;
        let layout = GENERATOR_LAYOUTS[generator.name]?.(records) ?? { id: "force", options: { seed: SEED } };
        if (x !== undefined && y !== undefined) {
            const at = spread([...x], [...y]);
            records.nodes.forEach((node, i) => Object.assign(node, at(i)));
            layout = { id: "fixed", options: {} };
        } else if (layout.options.seed === undefined && layout.options.scalingFactor === undefined) {
            // the layouts that place nodes in a unit shape: drawn as wide as data positions are
            layout.options.scalingFactor = (SPREAD * Math.sqrt(graph.nodeCount)) / 2;
        }
        list.push({
            file: `generator-${generator.name}.webp`,
            name: generator.name,
            directed: graph.directed,
            records,
            layout,
        });
    }
    return list;
}

const PAGE = `<!doctype html><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style>
<script type="module" src="/graphty.bundle.js"></script>
<graphty-element style="display:block;width:${WIDTH}px;height:${HEIGHT}px"></graphty-element>`;

const server = createServer((request, response) => {
    if (request.url === "/graphty.bundle.js") {
        response.setHeader("Content-Type", "text/javascript");
        response.end(readFileSync(bundle));
        return;
    }
    // graphty-element's Workers; its Graphviz Worker imports the optional Graphviz package by name, which a page
    // with no bundler cannot resolve, so it is pointed at the installed copy and a DOT file gets its Graphviz layout
    if (request.url === GRAPHVIZ_URL) {
        response.setHeader("Content-Type", "text/javascript");
        response.end(readFileSync(graphvizPackage));
        return;
    }
    const asset = /^\/assets\/([\w.-]+\.js)$/.exec(request.url ?? "");
    if (asset !== null && existsSync(path.join(assetsDir, asset[1]))) {
        response.setHeader("Content-Type", "text/javascript");
        response.end(
            readFileSync(path.join(assetsDir, asset[1]), "utf8").replaceAll(
                "`@hpcc-js/wasm-graphviz`",
                `\`${GRAPHVIZ_URL}\``,
            ),
        );
        return;
    }
    const program = PROGRAM_SAMPLES.find(({ app }) => request.url === `/programs/${app}`);
    if (program !== undefined) {
        response.end(readFileSync(path.join(programsDir, program.app)));
        return;
    }
    response.setHeader("Content-Type", "text/html");
    response.end(PAGE);
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await chromium.launch({
    args: [
        "--use-gl=angle",
        "--use-angle=swiftshader",
        "--enable-unsafe-swiftshader",
        "--disable-gpu-rasterization",
        "--force-color-profile=srgb",
    ],
    env: { ...process.env, FC_FONTATIONS: "1" },
});
mkdirSync(outDir, { recursive: true });
let failed = 0;
try {
    for (const job of await jobs(process.argv.slice(2))) {
        const context = await browser.newContext({ viewport: { width: WIDTH, height: HEIGHT }, deviceScaleFactor: 1 });
        const page = await context.newPage();
        page.on("pageerror", (error) => {
            console.error(`${job.name}: ${error.message}`);
        });
        try {
            await page.goto(base);
            const picture = await page.evaluate(draw, {
                name: job.name,
                data: job.records === undefined ? null : JSON.stringify({ directed: job.directed, ...job.records }),
                source: job.source ?? null,
                example: job.example ?? null,
                program: job.program ?? null,
                emphasis: EMPHASIS[job.name] ?? null,
                layout: job.layout,
                width: WIDTH,
                height: HEIGHT,
                waitGuardMs: WAIT_GUARD_MS,
            });
            writeFileSync(path.resolve(outDir, job.file), Buffer.from(picture, "base64"));
            if (job.sha256 !== undefined) {
                drawnFrom[job.name] = job.sha256;
            }
            const drawn = job.records === undefined ? (job.example ?? job.name) : `${job.records.nodes.length} nodes`;
            console.log(`${job.file} (${job.layout.engine ?? job.layout.id}, ${drawn})`);
        } catch (error) {
            failed += 1;
            console.error(`${job.name}: ${error instanceof Error ? error.message : String(error)}`);
        } finally {
            await context.close();
        }
    }
} finally {
    await browser.close();
    server.close();
}
const sorted = Object.fromEntries(Object.entries(drawnFrom).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(drawnFromFile, `${JSON.stringify(sorted, null, 4)}\n`);
process.exit(failed === 0 ? 0 : 1);

/**
 * Runs in the page: draws one graph and returns its picture.
 * @param job - what to draw
 * @param job.name - the graph's name
 * @param job.data - its records, as graphty-element's JSON, or null for a network sample
 * @param job.source - a network sample's source id, or null
 * @param job.example - a network sample's example id, or null
 * @param job.program - a sample file from another program: its type, address and reader options, or null
 * @param job.layout - the layout: its catalog id, the engine when not the default, and options
 * @param job.width - the picture's width in pixels
 * @param job.height - the picture's height in pixels
 * @param job.emphasis - darker lines and larger nodes for a dense picture, or null
 * @param job.waitGuardMs - the monorepo's one hang guard, which ends a stable-frame wait that hangs
 * @returns the WebP picture, base64
 */
async function draw({ name, data, source, example, program, layout, width, height, emphasis, waitGuardMs }) {
    globalThis.__GRAPHTY_WAIT_GUARD_MS__ = waitGuardMs;
    await globalThis.customElements.whenDefined("graphty-element");
    let element = globalThis.document.querySelector("graphty-element");
    if (program !== null) {
        // the file styles experiment is read when the element comes up, so a program sample gets an element of its own
        const styled = globalThis.document.createElement("graphty-element");
        styled.style.cssText = element.style.cssText;
        styled.features = ["file-styles"];
        element.replaceWith(styled);
        element = styled;
    }
    const { session } = element;
    // a picture's bytes, base64, to hand back out of the page
    const base64Of = async (blob) => {
        let text = "";
        for (const byte of new Uint8Array(await blob.arrayBuffer())) {
            text += String.fromCodePoint(byte);
        }
        return btoa(text);
    };
    if (program !== null) {
        // drawn as the graphty app opens a sample: with the file's own styles, where the file placed its nodes or
        // with the layout the file asks for (a DOT file's Graphviz program)
        await session.layout.setDimension("2d");
        await session.data.import(
            { type: program.type, name, config: { ...program.options, url: program.url } },
            { styles: "file", layout: "placed", styleOptions: { framing: "file", lengths: "spacing" } },
        );
        await element.waitForStableFrame();
        const drawn = await element.captureScreenshot({ format: "webp", quality: 0.85, width, height });
        return base64Of(drawn.blob);
    }
    await session.styles.add({
        name: "Thin gray lines",
        target: "edge",
        selector: { match: "everything" },
        set: { "edge.color": "#8a90a0", "edge.opacity": 0.55, "edge.arrowHead": "none", ...emphasis?.edge },
    });
    if (emphasis?.node !== undefined) {
        await session.styles.add({
            name: "Larger outlined nodes",
            target: "node",
            selector: { match: "everything" },
            set: emphasis.node,
        });
    }
    await session.layout.setDimension("2d");
    await session.layout.set(layout.id, {
        ...(layout.engine === undefined ? {} : { engine: layout.engine }),
        options: layout.options,
    });
    if (example === null) {
        await session.data.import({ type: "json", name, config: { data } });
    } else {
        await session.data.loadExample(source, example, { history: "start" });
    }
    await session.runs.start("louvain");
    await element.waitForStableFrame();
    const shot = await element.captureScreenshot({
        format: "webp",
        quality: 0.85,
        width,
        height,
        transparentBackground: true,
    });
    // A picture for a tile in either color scheme: fail loudly when the background was drawn.
    const corner = new globalThis.OffscreenCanvas(1, 1).getContext("2d");
    corner.drawImage(await globalThis.createImageBitmap(shot.blob), 0, 0);
    if (corner.getImageData(0, 0, 1, 1).data[3] !== 0) {
        throw new Error("graphty-element drew the background into a transparent screenshot; run it again");
    }
    return base64Of(shot.blob);
}
