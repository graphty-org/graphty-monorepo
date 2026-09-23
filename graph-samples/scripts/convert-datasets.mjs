#!/usr/bin/env node
/**
 * Convert the bundled sample datasets from their published sources into
 * src/datasets/<name>/data.ts.
 *
 *     node scripts/convert-datasets.mjs [--cache <dir>]
 *
 * Every source is fetched once into the cache directory (default: <repo>/tmp/graph-samples-sources)
 * and must match the SHA-256 recorded below before anything is converted; a source that changed
 * upstream stops the script instead of silently changing a dataset. Needs `unzip` on the PATH.
 * The output is deterministic: running the script twice writes identical files.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cacheFlag = process.argv.indexOf("--cache");
const cacheDir =
    cacheFlag >= 0
        ? path.resolve(process.argv[cacheFlag + 1])
        : path.resolve(packageRoot, "../tmp/graph-samples-sources");

/** Every source file, its URL and its checksum. */
const SOURCES = {
    networkx: {
        url: "https://raw.githubusercontent.com/networkx/networkx/networkx-3.1/networkx/generators/social.py",
        sha256: "82168365585cb949de6753d2ea690c111824f323c600e194f5f1c9832ee5016a",
        file: "networkx-3.1-social.py",
    },
    football: {
        url: "https://ndownloader.figshare.com/files/94935",
        sha256: "023323653640ce63dfdedd596a0082a3fe78f69819589e3bed5ba5352d360a61",
        file: "footballTSEweb.zip",
    },
    polbooks: {
        url: "https://web.archive.org/web/20240730210010id_/https://public.websites.umich.edu/~mejn/netdata/polbooks.zip",
        sha256: "b8e37351ae9ae8ee39f8b75ed52170d2435f290855605680c9b4f4c8b46b3c37",
        file: "polbooks.zip",
    },
    dolphins: {
        url: "https://web.archive.org/web/20231115052843id_/https://www-personal.umich.edu/~mejn/netdata/dolphins.zip",
        sha256: "42ad752c1711f2e9ab625aef0fb123463523a2590825b546b02ecac23735aa4c",
        file: "dolphins.zip",
    },
};

// ------------------------------------------------------------------ fetching

async function source(key) {
    const { url, sha256, file } = SOURCES[key];
    const target = path.join(cacheDir, file);
    if (!existsSync(target)) {
        mkdirSync(cacheDir, { recursive: true });
        console.log(`fetching ${url}`);
        // figshare's downloader answers an empty body to clients without a User-Agent
        const response = await fetch(url, { headers: { "User-Agent": "graphty-graph-samples-convert" } });
        if (!response.ok) {
            throw new Error(`${url}: HTTP ${response.status}`);
        }
        writeFileSync(target, Buffer.from(await response.arrayBuffer()));
    }
    const bytes = readFileSync(target);
    const actual = createHash("sha256").update(bytes).digest("hex");
    if (actual !== sha256) {
        throw new Error(
            `${file}: sha256 ${actual}, expected ${sha256} -- the source changed; review it before updating`,
        );
    }
    return target;
}

function unzipMember(zip, member) {
    return execFileSync("unzip", ["-p", zip, member], { encoding: "latin1" });
}

// ------------------------------------------------------------------ parsing

/** A GML document as nested [key, value] lists (value: number, string or nested list). */
function parseGml(text) {
    const tokens = text.match(/"[^"]*"|\[|\]|[^\s[\]"]+/g);
    let i = 0;
    const list = () => {
        const items = [];
        while (i < tokens.length && tokens[i] !== "]") {
            const key = tokens[i++];
            const value = tokens[i++];
            if (value === "[") {
                items.push([key, list()]);
                i++; // "]"
            } else if (value.startsWith('"')) {
                items.push([key, value.slice(1, -1)]);
            } else {
                items.push([key, Number(value)]);
            }
        }
        return items;
    };
    const graph = list().find(([key]) => key === "graph")[1];
    const get = (items, key) => items.find(([k]) => k === key)?.[1];
    const nodes = graph.filter(([k]) => k === "node").map(([, v]) => v);
    const edges = graph.filter(([k]) => k === "edge").map(([, v]) => [get(v, "source"), get(v, "target")]);
    nodes.forEach((node, index) => {
        if (get(node, "id") !== index) {
            throw new Error(`GML node ${index} has id ${get(node, "id")}; expected ids 0..n-1 in order`);
        }
    });
    return { nodes: nodes.map((node) => ({ label: get(node, "label"), value: get(node, "value") })), edges };
}

/** The body of one function of networkx's social.py. */
function pythonFunction(text, name) {
    const start = text.indexOf(`def ${name}(`);
    const end = text.indexOf("\ndef ", start + 1);
    return text.slice(start, end < 0 ? undefined : end);
}

/** Node order = first appearance, as networkx's Graph.add_edge inserts them. */
function namedEdges(pairs) {
    const ids = [];
    const index = new Map();
    const at = (name) => {
        if (!index.has(name)) {
            index.set(name, ids.length);
            ids.push(name);
        }
        return index.get(name);
    };
    return { ids, edges: pairs.flatMap(([a, b]) => [at(a), at(b)]) };
}

function checkSimple(name, edges) {
    const seen = new Set();
    for (let e = 0; e < edges.length; e += 2) {
        const [a, b] = [Math.min(edges[e], edges[e + 1]), Math.max(edges[e], edges[e + 1])];
        if (a === b || seen.has(`${a},${b}`)) {
            throw new Error(`${name}: self-loop or repeated edge ${a}-${b}`);
        }
        seen.add(`${a},${b}`);
    }
}

// ------------------------------------------------------------------ datasets

const CONVERTERS = {
    karate(social) {
        const body = pythonFunction(social, "karate_club_graph");
        const club1 = new Set(
            body
                .match(/club1 = \{([^}]*)\}/)[1]
                .split(",")
                .map(Number),
        );
        const rows = body
            .match(/zacharydat = """\\\n([^"]*)"""/)[1]
            .trim()
            .split("\n")
            .map((line) => line.trim().split(/\s+/).map(Number));
        const edges = [];
        const weights = [];
        // The matrix is not symmetric (e.g. [0][12] = 2, [12][0] = 1). networkx adds an edge for
        // every non-zero entry, row by row, so the later row's entry wins: the weight of r < c is
        // the entry [c][r] when it is non-zero, else [r][c].
        rows.forEach((row, r) =>
            row.forEach((w, c) => {
                if (c > r && (w >= 1 || rows[c][r] >= 1)) {
                    edges.push(r, c);
                    weights.push(rows[c][r] >= 1 ? rows[c][r] : w);
                }
            }),
        );
        return {
            directed: false,
            nodeCount: rows.length,
            ids: null,
            edges,
            weights,
            columns: {
                club: {
                    dtype: "dict",
                    categories: ["Mr. Hi", "Officer"],
                    codes: rows.map((_, i) => (club1.has(i) ? 0 : 1)),
                },
            },
        };
    },

    "florentine-families"(social) {
        const body = pythonFunction(social, "florentine_families_graph");
        const pairs = [...body.matchAll(/G\.add_edge\("([^"]+)", "([^"]+)"\)/g)].map((m) => [m[1], m[2]]);
        const { ids, edges } = namedEdges(pairs);
        return { directed: false, nodeCount: ids.length, ids, edges, weights: null, columns: {} };
    },

    "davis-southern-women"(social) {
        const body = pythonFunction(social, "davis_southern_women_graph");
        const list = (name) =>
            [...body.match(new RegExp(`${name} = \\[([^\\]]*)\\]`))[1].matchAll(/"([^"]+)"/g)].map((m) => m[1]);
        const women = list("women");
        const events = list("events");
        const ids = [...women, ...events];
        const index = new Map(ids.map((id, i) => [id, i]));
        const pairs = [...body.matchAll(/\("([^"]+)", "([^"]+)"\)/g)];
        const edges = pairs.flatMap((m) => [index.get(m[1]), index.get(m[2])]);
        return {
            directed: false,
            nodeCount: ids.length,
            ids,
            edges,
            weights: null,
            columns: { side: { dtype: "u8", values: ids.map((_, i) => (i < women.length ? 0 : 1)) } },
        };
    },

    "les-miserables"(social) {
        const body = pythonFunction(social, "les_miserables_graph");
        const matches = [...body.matchAll(/G\.add_edge\("([^"]+)", "([^"]+)", weight=(\d+)\)/g)];
        const { ids, edges } = namedEdges(matches.map((m) => [m[1], m[2]]));
        return {
            directed: false,
            nodeCount: ids.length,
            ids,
            edges,
            weights: matches.map((m) => Number(m[3])),
            columns: {},
        };
    },

    football(_social, files) {
        const gml = parseGml(unzipMember(files.football, "footballTSEinput.gml"));
        // the conference numbering of footballTSEReadMe.txt (0-10 conferences, 11-18 independents)
        const conferences = [
            "Atlantic Coast",
            "Big East",
            "Big Ten",
            "Big Twelve",
            "Conference USA",
            "Big West",
            "Mid-American",
            "Mountain West",
            "Pacific Ten",
            "Southeastern",
            "Western Athletic",
            "Independent: Notre Dame",
            "Independent: Navy",
            "Independent: Connecticut",
            "Independent: Central Florida",
            "Independent: Middle Tennessee State",
            "Independent: Louisiana Tech",
            "Independent: Louisiana Monroe",
            "Independent: Louisiana Lafayette",
        ];
        return {
            directed: false,
            nodeCount: gml.nodes.length,
            ids: null,
            edges: gml.edges.flat(),
            weights: null,
            columns: {
                label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) },
                conference: { dtype: "dict", categories: conferences, codes: gml.nodes.map((n) => n.value) },
            },
        };
    },

    "political-books"(_social, files) {
        const gml = parseGml(unzipMember(files.polbooks, "polbooks.gml"));
        const leans = { l: 0, c: 1, n: 2 };
        return {
            directed: false,
            nodeCount: gml.nodes.length,
            ids: null,
            edges: gml.edges.flat(),
            weights: null,
            columns: {
                label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) },
                lean: {
                    dtype: "dict",
                    categories: ["liberal", "conservative", "neutral"],
                    codes: gml.nodes.map((n) => leans[n.value]),
                },
            },
        };
    },

    dolphins(_social, files) {
        const gml = parseGml(unzipMember(files.dolphins, "dolphins.gml"));
        return {
            directed: false,
            nodeCount: gml.nodes.length,
            ids: null,
            edges: gml.edges.flat(),
            weights: null,
            columns: { label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) } },
        };
    },
};

const SOURCE_OF = {
    karate: "networkx",
    "florentine-families": "networkx",
    "davis-southern-women": "networkx",
    "les-miserables": "networkx",
    football: "football",
    "political-books": "polbooks",
    dolphins: "dolphins",
};

// ------------------------------------------------------------------ output

/** JSON with every non-ASCII character escaped, so the TS source stays plain ASCII. */
function asciiJson(value) {
    return JSON.stringify(value).replace(/[^\x00-\x7f]/g, (c) => `\\u${c.charCodeAt(0).toString(16).padStart(4, "0")}`);
}

async function main() {
    const files = {};
    for (const key of Object.keys(SOURCES)) {
        files[key] = await source(key);
    }
    const social = readFileSync(files.networkx, "utf8");
    const written = [];
    for (const [name, convert] of Object.entries(CONVERTERS)) {
        const data = convert(social, files);
        checkSimple(name, data.edges);
        const { url, sha256 } = SOURCES[SOURCE_OF[name]];
        const out = path.join(packageRoot, "src/datasets", name, "data.ts");
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(
            out,
            [
                "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-samples/scripts/convert-datasets.mjs",
                `// Source: ${url}`,
                `// sha256: ${sha256}`,
                "",
                'import { type DatasetData } from "../build.js";',
                "",
                `export const DATA: DatasetData = ${asciiJson(data)};`,
                "",
            ].join("\n"),
        );
        written.push(out);
        console.log(`${name}: ${data.nodeCount} nodes, ${data.edges.length / 2} edges`);
    }
    execFileSync("npx", ["prettier", "--write", ...written], { cwd: packageRoot, stdio: "ignore" });
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
