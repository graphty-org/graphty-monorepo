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
    celegans: {
        url: "https://web.archive.org/web/20231227004245id_/https://public.websites.umich.edu/~mejn/netdata/celegansneural.zip",
        sha256: "4322642c25e38c6c9866d24f582af6ebd983f1ed5faef27a63ceda40da9c0646",
        file: "celegansneural.zip",
    },
    polblogs: {
        url: "https://web.archive.org/web/20240730122800id_/https://public.websites.umich.edu/~mejn/netdata/polblogs.zip",
        sha256: "e047df21736fef9037f0450f7d3756ecb16a8e347417723181c0f7e493021ddb",
        file: "polblogs.zip",
    },
    miles: {
        url: "https://mirrors.ctan.org/support/graphbase/miles.dat",
        sha256: "071a4a08ec88ec4ea6270de4888a5a9eb4ea1a258cbc9443695f7a7b0edfc453",
        file: "miles.dat",
    },
    countyAdjacency: {
        url: "https://www2.census.gov/geo/docs/reference/county_adjacency/county_adjacency2024.txt",
        sha256: "912ca408163016864fe64aaf667b53ad03a19ce4acbc586d3ac508395bdac980",
        file: "county_adjacency2024.txt",
    },
    centersOfPopulation: {
        url: "https://www2.census.gov/geo/docs/reference/cenpop2020/CenPop2020_Mean_ST.txt",
        sha256: "af37e0d68c617f417ef805a94c07cbb0f788863e3cc4db21a3b35f28766f2f06",
        file: "CenPop2020_Mean_ST.txt",
    },
    airports: {
        url: "https://raw.githubusercontent.com/jpatokal/openflights/e3bc6dedbcceb8b7b74248a00dcd6207254da6bd/data/airports.dat",
        sha256: "9387cdb38df5bd664da823f8ccb69fdd9b33a1888f5b7cca09c34a3cd9ff59f9",
        file: "openflights-airports.dat",
    },
    routes: {
        url: "https://raw.githubusercontent.com/jpatokal/openflights/e3bc6dedbcceb8b7b74248a00dcd6207254da6bd/data/routes.dat",
        sha256: "bd373706238134f619c624c606dccc74c05c2582a977c489c81de501735f2390",
        file: "openflights-routes.dat",
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

/**
 * A GML document: its nodes (every scalar key of each node) and its edges as
 * [source index, target index, value]. Node ids may be any distinct numbers; a node's index is its
 * position in the file.
 */
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
    const nodes = graph
        .filter(([k]) => k === "node")
        .map(([, v]) => Object.fromEntries(v.filter(([, value]) => !Array.isArray(value))));
    const index = new Map(nodes.map((node, n) => [node.id, n]));
    if (index.size !== nodes.length) {
        throw new Error("GML node ids are not distinct");
    }
    const edges = graph
        .filter(([k]) => k === "edge")
        .map(([, v]) => [index.get(get(v, "source")), index.get(get(v, "target")), get(v, "value")]);
    return { nodes, edges };
}

/** The endpoints of parsed GML edges as a flat list. */
function endpoints(edges) {
    return edges.flatMap(([s, t]) => [s, t]);
}

/** A comma-separated line with optional double-quoted fields ("" escapes a quote). */
function csvFields(line) {
    const fields = [];
    const re = /("(?:[^"]|"")*"|[^,]*)(,|$)/g;
    for (const match of line.matchAll(re)) {
        const field = match[1];
        fields.push(field.startsWith('"') ? field.slice(1, -1).replaceAll('""', '"') : field);
        if (match[2] === "") {
            break;
        }
    }
    return fields;
}

function lines(file) {
    return readFileSync(file, "utf8")
        .replace(/^\uFEFF/, "")
        .split(/\r?\n/)
        .filter((line) => line.length > 0);
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

function checkSimple(name, directed, edges) {
    const seen = new Set();
    for (let e = 0; e < edges.length; e += 2) {
        const [a, b] = directed
            ? [edges[e], edges[e + 1]]
            : [Math.min(edges[e], edges[e + 1]), Math.max(edges[e], edges[e + 1])];
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
            edges: endpoints(gml.edges),
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
            edges: endpoints(gml.edges),
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
            edges: endpoints(gml.edges),
            weights: null,
            columns: { label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) } },
        };
    },

    "contiguous-usa"(_social, files) {
        // The Census county adjacency file lists every pair of counties that touch, including across
        // water and at a single point; two states are adjacent when two of their counties are.
        // These pairs are not land borders: the Four Corners meet at a point, and the other three
        // face each other across Lake Michigan, Lake Superior and Long Island Sound.
        const notBorders = new Set(["AZ-CO", "NM-UT", "IL-MI", "MI-MN", "NY-RI"]);
        const outside = new Set(["AK", "HI", "PR", "VI", "GU", "AS", "MP"]);
        const codeOfFips = new Map();
        const pairs = new Set();
        for (const line of lines(files.countyAdjacency).slice(1)) {
            const [county, geoid, neighbour] = line.split("|");
            const a = county.slice(county.lastIndexOf(", ") + 2);
            const b = neighbour.slice(neighbour.lastIndexOf(", ") + 2);
            codeOfFips.set(geoid.slice(0, 2), a);
            const key = [a, b].sort().join("-");
            if (a !== b && !outside.has(a) && !outside.has(b) && !notBorders.has(key)) {
                pairs.add(key);
            }
        }
        const centres = lines(files.centersOfPopulation)
            .slice(1)
            .map(csvFields)
            .map(([fips, name, population, latitude, longitude]) => ({
                code: codeOfFips.get(fips),
                name,
                population: Number(population),
                latitude: Number(latitude),
                longitude: Number(longitude),
            }))
            .filter((state) => !outside.has(state.code))
            .sort((a, b) => (a.code < b.code ? -1 : 1));
        const ids = centres.map((state) => state.code);
        const index = new Map(ids.map((id, i) => [id, i]));
        const edges = [...pairs].sort().flatMap((key) => key.split("-").map((code) => index.get(code)));
        if (ids.length !== 49 || edges.length !== 2 * 107 || edges.some((i) => i === undefined)) {
            throw new Error(`contiguous-usa: ${ids.length} states, ${edges.length / 2} borders; expected 49 and 107`);
        }
        return {
            directed: false,
            nodeCount: ids.length,
            ids,
            edges,
            weights: null,
            columns: {
                label: { dtype: "string", role: "label", values: centres.map((state) => state.name) },
                latitude: { dtype: "f64", values: centres.map((state) => state.latitude) },
                longitude: { dtype: "f64", values: centres.map((state) => state.longitude) },
                population: { dtype: "u32", values: centres.map((state) => state.population) },
            },
        };
    },

    "knuth-miles"(_social, files) {
        // miles.dat: "City, ST[lat,lon]population" (hundredths of a degree, longitude positive west),
        // then the road mileage to every city listed before it, nearest-listed first.
        const cities = [];
        for (const line of lines(files.miles)) {
            if (line.startsWith("*")) {
                continue;
            }
            const city = line.match(/^([^[]+)\[(\d+),(\d+)\](\d+)$/);
            if (city) {
                cities.push({
                    name: city[1],
                    latitude: Number(city[2]) / 100,
                    longitude: -Number(city[3]) / 100,
                    population: Number(city[4]),
                    miles: [],
                });
            } else {
                cities.at(-1).miles.push(...line.trim().split(/\s+/).map(Number));
            }
        }
        const edges = [];
        const weights = [];
        cities.forEach((city, i) => {
            if (city.miles.length !== i) {
                throw new Error(`knuth-miles: ${city.name} lists ${city.miles.length} distances, expected ${i}`);
            }
            for (let j = 0; j < i; j++) {
                edges.push(j, i);
                weights.push(city.miles[i - 1 - j]);
            }
        });
        return {
            directed: false,
            nodeCount: cities.length,
            ids: cities.map((city) => city.name),
            edges,
            weights,
            columns: {
                latitude: { dtype: "f64", values: cities.map((city) => city.latitude) },
                longitude: { dtype: "f64", values: cities.map((city) => city.longitude) },
                population: { dtype: "u32", values: cities.map((city) => city.population) },
            },
        };
    },

    "celegans-neural"(_social, files) {
        const gml = parseGml(unzipMember(files.celegans, "celegansneural.gml"));
        // 14 arcs are listed twice; merge each pair into one arc carrying the summed weight, as the
        // SuiteSparse copy does, so the total synapse weight is unchanged.
        const arcs = new Map();
        for (const [s, t, w] of gml.edges) {
            const key = `${s},${t}`;
            arcs.set(key, (arcs.get(key) ?? 0) + w);
        }
        return {
            directed: true,
            nodeCount: gml.nodes.length,
            ids: null,
            edges: [...arcs.keys()].flatMap((key) => key.split(",").map(Number)),
            weights: [...arcs.values()],
            columns: { label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) } },
        };
    },

    "political-blogs"(_social, files) {
        const gml = parseGml(unzipMember(files.polblogs, "polblogs.gml"));
        // The crawl recorded 65 links twice and 3 blogs linking to themselves; keep each link once.
        const seen = new Set();
        const edges = [];
        for (const [s, t] of gml.edges) {
            if (s !== t && !seen.has(`${s},${t}`)) {
                seen.add(`${s},${t}`);
                edges.push(s, t);
            }
        }
        return {
            directed: true,
            nodeCount: gml.nodes.length,
            ids: null,
            edges,
            weights: null,
            columns: {
                label: { dtype: "string", role: "label", values: gml.nodes.map((n) => n.label) },
                lean: { dtype: "dict", categories: ["liberal", "conservative"], codes: gml.nodes.map((n) => n.value) },
                directory: { dtype: "string", values: gml.nodes.map((n) => n.source) },
            },
        };
    },

    openflights(_social, files) {
        // airports.dat: id, name, city, country, IATA, ICAO, latitude, longitude, ...
        // routes.dat: airline, airline id, source code, source id, destination code, destination id, ...
        const airports = new Map(lines(files.airports).map((line) => [csvFields(line)[0], csvFields(line)]));
        const pairs = new Map();
        for (const line of lines(files.routes)) {
            const [, , , from, , to] = csvFields(line);
            if (airports.has(from) && airports.has(to) && from !== to) {
                const key = `${from},${to}`;
                pairs.set(key, (pairs.get(key) ?? 0) + 1);
            }
        }
        const used = [...new Set([...pairs.keys()].flatMap((key) => key.split(",")))].sort((a, b) => a - b);
        const rows = used.map((id) => airports.get(id));
        const index = new Map(used.map((id, i) => [id, i]));
        const code = (value) => (value === "\\N" || value === "" ? null : value);
        const ids = rows.map(([id, , , , iata, icao]) => code(iata) ?? code(icao) ?? `openflights-${id}`);
        if (new Set(ids).size !== ids.length) {
            throw new Error("openflights: airport codes are not unique");
        }
        const countries = [...new Set(rows.map((row) => row[3]))].sort();
        return {
            directed: true,
            nodeCount: ids.length,
            ids,
            edges: [...pairs.keys()].flatMap((key) => key.split(",").map((id) => index.get(id))),
            weights: [...pairs.values()],
            columns: {
                label: { dtype: "string", role: "label", values: rows.map((row) => row[1]) },
                city: { dtype: "string", values: rows.map((row) => row[2]) },
                country: { dtype: "dict", categories: countries, codes: rows.map((row) => countries.indexOf(row[3])) },
                // rounded to 6 decimals (about 0.1 m): many source values are float32 noise such as
                // 67.40750122070312
                latitude: { dtype: "f64", values: rows.map((row) => Math.round(Number(row[6]) * 1e6) / 1e6) },
                longitude: { dtype: "f64", values: rows.map((row) => Math.round(Number(row[7]) * 1e6) / 1e6) },
            },
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
    "contiguous-usa": ["countyAdjacency", "centersOfPopulation"],
    "knuth-miles": "miles",
    "celegans-neural": "celegans",
    "political-blogs": "polblogs",
    openflights: ["airports", "routes"],
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
        checkSimple(name, data.directed, data.edges);
        const provenance = [SOURCE_OF[name]]
            .flat()
            .flatMap((key) => [`// Source: ${SOURCES[key].url}`, `// sha256: ${SOURCES[key].sha256}`]);
        const out = path.join(packageRoot, "src/datasets", name, "data.ts");
        mkdirSync(path.dirname(out), { recursive: true });
        writeFileSync(
            out,
            [
                "// THIS FILE IS AUTO GENERATED: DO NOT EDIT THIS FILE. INSTEAD EDIT graph-samples/scripts/convert-datasets.mjs",
                ...provenance,
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
