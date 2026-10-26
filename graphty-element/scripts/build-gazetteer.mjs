#!/usr/bin/env node
/**
 * Build the gazetteer graphty.app serves at https://graphty.app/data/gazetteer/v1/, which the
 * location map layout reads place names with (src/layout/locationMap/gazetteer.ts):
 *
 *     node graphty-element/scripts/build-gazetteer.mjs [--cache <dir>] [--out <dir>]
 *
 * It fetches its sources once into the cache directory (default: <repo>/tmp/gazetteer-sources),
 * refuses a Natural Earth file whose SHA-256 is not the one recorded here, and writes one gzipped
 * JSON file per layer into the output directory (default: <repo>/graph-samples/public-data/gazetteer/v1,
 * build output beside graph-samples' hosted datasets, not committed):
 *
 *   countries.json.gz  Natural Earth 1:10m admin 0 countries (public domain): name, other names
 *                      and ISO codes, label point, population
 *   regions.json.gz    Natural Earth 1:10m admin 1 states and provinces (public domain): name, other
 *                      names, postal and ISO 3166-2 codes, label point
 *   cities.json.gz     GeoNames cities15000 (CC BY 4.0), trimmed: name, Latin-script other names,
 *                      country, first-level region, point, population
 *
 * Each file is { format: "graphty-gazetteer", version: 1, layer, attribution, source, license,
 * fields, places }, every place a row of `fields`: [name, alternates, country, region, latitude,
 * longitude, population]. `country` is the ISO 3166-1 alpha-2 code and `region` the GeoNames
 * first-level key ("US.TX"); a Natural Earth region carries it when GeoNames names that key the
 * same, and the cities file adds `regions`, GeoNames' names of each key its cities carry
 * ({ "US.TX": ["Texas"] }), so a city is narrowed by a region name. GeoNames publishes cities15000 again every day and keeps no old copies, so its
 * checksum is not pinned; the files record the date they were built from. Needs `unzip` on the PATH.
 * deploy-pages.yml runs it and tools/assemble-pages-site.sh publishes the output.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const flag = (name, fallback) => {
    const at = process.argv.indexOf(name);
    return at >= 0 ? path.resolve(process.argv[at + 1]) : fallback;
};
const cacheDir = flag("--cache", path.join(repoRoot, "tmp/gazetteer-sources"));
const outDir = flag("--out", path.join(repoRoot, "graph-samples/public-data/gazetteer/v1"));

const NATURAL_EARTH = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/v5.1.2/geojson/";
const SOURCES = {
    countries: {
        url: `${NATURAL_EARTH}ne_10m_admin_0_countries.geojson`,
        sha256: "239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255",
    },
    regions: {
        url: `${NATURAL_EARTH}ne_10m_admin_1_states_provinces.geojson`,
        sha256: "22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5",
    },
    cities: { url: "https://download.geonames.org/export/dump/cities15000.zip", sha256: null },
    admin1: { url: "https://download.geonames.org/export/dump/admin1CodesASCII.txt", sha256: null },
};
const FIELDS = ["name", "alternates", "country", "region", "latitude", "longitude", "population"];
/** Common names Natural Earth does not list, by ISO code. */
const COUNTRY_ALIASES = { GB: ["UK", "Britain", "Great Britain"], US: ["US", "America"] };
const NATURAL_EARTH_LICENSE = "Public domain (Natural Earth, https://www.naturalearthdata.com/about/terms-of-use/)";

/**
 * A source file, from the cache or fetched into it, checked against its recorded checksum.
 * @param source - The source.
 * @returns The bytes.
 */
async function sourceBytes(source) {
    const file = path.join(cacheDir, path.basename(new URL(source.url).pathname));
    if (!existsSync(file)) {
        mkdirSync(cacheDir, { recursive: true });
        const response = await fetch(source.url);
        if (!response.ok) {
            throw new Error(`${source.url}: HTTP ${response.status}`);
        }

        writeFileSync(file, Buffer.from(await response.arrayBuffer()));
    }

    const bytes = readFileSync(file);
    const sha = createHash("sha256").update(bytes).digest("hex");
    if (source.sha256 !== null && sha !== source.sha256) {
        throw new Error(`${file}: SHA-256 ${sha}, expected ${source.sha256}`);
    }

    return { bytes, file };
}

/**
 * A name as the layout matches it (mirrors normalizePlace in gazetteer.ts).
 * @param value - The name.
 * @returns The key.
 */
function normalize(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replaceAll(/\p{M}/gu, "")
        .toLowerCase()
        .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

/**
 * The other names of a place: present, not the name itself, one per matching key.
 * @param name - The name.
 * @param others - The candidates.
 * @param keep - Which candidates to keep.
 * @returns The names.
 */
function alternates(name, others, keep = () => true) {
    const seen = new Set([normalize(name)]);
    const out = [];
    for (const other of others) {
        const text = typeof other === "string" ? other.trim() : "";
        const key = normalize(text);
        if (text !== "" && text !== "-99" && key !== "" && !seen.has(key) && keep(text, key)) {
            seen.add(key);
            out.push(text);
        }
    }

    return out;
}

const round = (x) => Math.round(x * 1e4) / 1e4;

/**
 * One layer's file.
 * @param layer - The layer.
 * @param source - Where it came from.
 * @param license - Its license.
 * @param attribution - The credit it owes, or null.
 * @param places - The rows.
 * @returns The file.
 */
function layerFile(layer, source, license, attribution, places) {
    /**
     * @param {string} x - One name.
     * @param {string} y - The other.
     * @returns {number} Their order by UTF-16 code units, the same on every machine.
     */
    const byCodeUnits = (x, y) => {
        if (x < y) {
            return -1;
        }
        return x > y ? 1 : 0;
    };
    places.sort((a, b) => b[6] - a[6] || byCodeUnits(a[0], b[0]));
    return { format: "graphty-gazetteer", version: 1, layer, attribution, source, license, fields: FIELDS, places };
}

/**
 * The countries.
 * @returns The file.
 */
async function countries() {
    const { bytes } = await sourceBytes(SOURCES.countries);
    const places = [];
    for (const { properties: p } of JSON.parse(bytes.toString("utf8")).features) {
        const iso2 = p.ISO_A2_EH !== "-99" ? p.ISO_A2_EH : p.ISO_A2;
        if (typeof iso2 !== "string" || !/^[A-Z]{2}$/.test(iso2)) {
            continue;
        }

        const iso3 = p.ISO_A3_EH !== "-99" ? p.ISO_A3_EH : p.ISO_A3;
        const names = Object.entries(p).flatMap(([k, v]) => (/^NAME_[A-Z]{2,3}$/.test(k) ? [v] : []));
        const others = alternates(
            p.NAME,
            [
                p.NAME_EN,
                p.ADMIN,
                p.NAME_LONG,
                p.BRK_NAME,
                p.NAME_SORT,
                p.NAME_ALT,
                p.FORMAL_EN,
                p.GEOUNIT,
                iso3,
                ...(COUNTRY_ALIASES[iso2] ?? []),
                ...names,
            ],
            (_, key) => /^[a-z0-9 ]+$/.test(key),
        );
        places.push([p.NAME, others, iso2, null, round(p.LABEL_Y), round(p.LABEL_X), Math.max(0, p.POP_EST ?? 0)]);
    }

    return layerFile("country", SOURCES.countries.url, NATURAL_EARTH_LICENSE, null, places);
}

/**
 * GeoNames' first-level regions: their names by key ("US.TX": ["Texas"]), the keys its cities carry.
 * @returns The names, the GeoNames name first.
 */
async function admin1Names() {
    const { bytes } = await sourceBytes(SOURCES.admin1);
    const names = new Map();
    for (const line of bytes.toString("utf8").split("\n")) {
        const [code, name, ascii] = line.split("\t");
        if (code && name) {
            names.set(code, [...new Set([name, ascii].filter(Boolean))]);
        }
    }

    return names;
}

/**
 * The regions (first-level divisions). A region keeps the GeoNames key Natural Earth gives it only
 * when GeoNames names that key the same (Natural Earth's French regions are departments under
 * GeoNames' old codes), so a city is never narrowed by the wrong region.
 * @returns The file.
 */
async function regions() {
    const { bytes } = await sourceBytes(SOURCES.regions);
    const geonames = await admin1Names();
    const places = [];
    for (const { properties: p } of JSON.parse(bytes.toString("utf8")).features) {
        if (typeof p.name !== "string" || typeof p.iso_a2 !== "string" || !/^[A-Z]{2}$/.test(p.iso_a2)) {
            continue;
        }

        const named = new Set((geonames.get(p.gn_a1_code) ?? []).map(normalize));
        const same = [p.name, p.name_en, p.gn_name, p.woe_name].some((n) => named.has(normalize(n)));
        const others = alternates(
            p.name,
            [p.name_en, p.gn_name, p.woe_name, ...(p.name_alt ?? "").split("|"), p.postal, p.iso_3166_2],
            (_, k) => /^[a-z0-9 ]+$/.test(k),
        );
        places.push([p.name, others, p.iso_a2, same ? p.gn_a1_code : null, round(p.latitude), round(p.longitude), 0]);
    }

    return layerFile("region", SOURCES.regions.url, NATURAL_EARTH_LICENSE, null, places);
}

/**
 * The cities of 15,000 people or more.
 * @returns The file.
 */
async function cities() {
    const { file } = await sourceBytes(SOURCES.cities);
    const text = execFileSync("unzip", ["-p", file, "cities15000.txt"], { maxBuffer: 1 << 30 }).toString("utf8");
    const places = [];
    for (const line of text.split("\n")) {
        const f = line.split("\t");
        if (f.length < 15) {
            continue;
        }

        const [, name, ascii, others, lat, lon, , , country, , admin1] = f;
        // Latin-script names only, and no codes (IATA "PAR", "NYC"): the names a table holds.
        const kept = alternates(name, [ascii, ...others.split(",")], (raw, key) => {
            return /^[a-z ]+$/.test(key) && raw !== raw.toUpperCase();
        });
        places.push([
            name,
            kept,
            country,
            admin1 === "" ? null : `${country}.${admin1}`,
            round(Number(lat)),
            round(Number(lon)),
            Number(f[14]) || 0,
        ]);
    }

    const layer = layerFile(
        "city",
        `${SOURCES.cities.url}, ${SOURCES.admin1.url} (${new Date().toISOString().slice(0, 10)})`,
        "CC BY 4.0 (GeoNames, https://www.geonames.org/)",
        { text: "GeoNames", url: "https://www.geonames.org/" },
        places,
    );
    // The names of the regions the cities are in, so "within" a region name narrows them.
    const used = new Set(places.map((p) => p[3]));
    const names = await admin1Names();
    layer.regions = Object.fromEntries([...names].filter(([code]) => used.has(code)).sort());
    return layer;
}

mkdirSync(outDir, { recursive: true });
for (const [name, build] of [
    ["countries", countries],
    ["regions", regions],
    ["cities", cities],
]) {
    const file = await build();
    const gz = gzipSync(Buffer.from(JSON.stringify(file)), { level: 9 });
    writeFileSync(path.join(outDir, `${name}.json.gz`), gz);
    console.log(`${name}.json.gz: ${file.places.length} places, ${gz.length} bytes`);
}
