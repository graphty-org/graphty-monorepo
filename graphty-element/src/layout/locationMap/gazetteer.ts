/**
 * @file Place names to coordinates: the gazetteer the location map layout reads a column of
 * countries, regions or cities with. Three layers, one gzipped JSON file each, hosted at
 * {@link GAZETTEER_URL} (built by `scripts/build-gazetteer.mjs`), fetched on first use and kept for
 * the page. Matching is offline once a layer is here.
 *
 * Babylon-free and DOM-free: the session's planning and issues read it.
 */

import { GraphtyError } from "../../errors/GraphtyError";

/** Where graphty.app hosts the gazetteer; the location map layout's `gazetteer` option default. */
export const GAZETTEER_URL = "https://graphty.app/data/gazetteer/v1/";

/** What kind of place a column names. */
export type PlaceRole = "country" | "region" | "city";

/** The roles, coarsest first: the order ties are broken in. */
export const PLACE_ROLES: readonly PlaceRole[] = ["country", "region", "city"];

/** Each layer's file under the gazetteer's address. */
export const PLACE_FILES: Readonly<Record<PlaceRole, string>> = {
    country: "countries.json.gz",
    region: "regions.json.gz",
    city: "cities.json.gz",
};

/** A credit a map shows while a layer's places are drawn. */
export interface PlaceCredit {
    readonly text: string;
    readonly url: string;
}

/**
 * One layer's file, as `scripts/build-gazetteer.mjs` writes it: `places` rows hold `fields` in
 * order, `[name, alternates, country, region, latitude, longitude, population]`. `country` is the
 * ISO 3166-1 alpha-2 code; `region` is the first-level region key (`"US.TX"`), null for a country
 * or a region with no key. The city layer also names the regions its cities are in, by key.
 */
export interface GazetteerFile {
    readonly format: "graphty-gazetteer";
    readonly version: 1;
    readonly layer: PlaceRole;
    /** The credit a map shows while this layer's places are drawn, or null when none is owed. */
    readonly attribution: PlaceCredit | null;
    readonly places: readonly (readonly [string, readonly string[], string, string | null, number, number, number])[];
    /** The names of each region key the places carry (`{ "US.TX": ["Texas"] }`); the city layer's. */
    readonly regions?: Readonly<Record<string, readonly string[]>>;
}

/** One place. */
export interface Place {
    readonly name: string;
    readonly country: string;
    readonly region: string | null;
    readonly lat: number;
    readonly lon: number;
    readonly population: number;
}

/** One layer, indexed by normalized name. */
export interface GazetteerLayer {
    readonly role: PlaceRole;
    readonly attribution: PlaceCredit | null;
    readonly byName: ReadonlyMap<string, readonly Place[]>;
    /** The region keys by normalized region name, from the file's `regions`. */
    readonly regionKeys: ReadonlyMap<string, readonly string[]>;
}

/** The layers at hand. */
export type Gazetteer = Partial<Record<PlaceRole, GazetteerLayer>>;

/**
 * A place name as it is matched: accents stripped, lowercase, punctuation and runs of spaces as
 * one space. "Sao Paulo", "SAO PAULO" and the accented spelling are one name.
 * @param value - The cell.
 * @returns The key, empty for a blank cell.
 */
export function normalizePlace(value: unknown): string {
    if (typeof value !== "string" && typeof value !== "number") {
        return "";
    }

    return String(value)
        .normalize("NFD")
        .replaceAll(/\p{M}/gu, "")
        .toLowerCase()
        .replaceAll(/[^\p{L}\p{N}]+/gu, " ")
        .trim();
}

/**
 * A layer from its file, indexed by every name it lists (and, for a country, its code).
 * @param file - The parsed file.
 * @returns The layer.
 * @throws A `GraphtyError` with code `E_FETCH_FAILED` when the file is not a gazetteer layer.
 */
export function layerFromFile(file: unknown): GazetteerLayer {
    const f = file as Partial<GazetteerFile> | null;
    if (f?.format !== "graphty-gazetteer" || f.version !== 1 || !Array.isArray(f.places) || f.layer === undefined) {
        throw new GraphtyError({
            code: "E_FETCH_FAILED",
            message: "not a graphty gazetteer layer (version 1)",
            source: "layout",
            details: { layout: "location-map" },
        });
    }

    const byName = new Map<string, Place[]>();
    for (const [name, alternates, country, region, lat, lon, population] of f.places) {
        const place: Place = { name, country, region, lat, lon, population };
        const keys = new Set([name, ...alternates, ...(f.layer === "country" ? [country] : [])].map(normalizePlace));
        for (const key of keys) {
            if (key !== "") {
                const list = byName.get(key);
                if (list === undefined) {
                    byName.set(key, [place]);
                } else {
                    list.push(place);
                }
            }
        }
    }

    const regionKeys = new Map<string, string[]>();
    for (const [key, names] of Object.entries(f.regions ?? {})) {
        for (const name of new Set(names.map(normalizePlace))) {
            regionKeys.set(name, [...(regionKeys.get(name) ?? []), key]);
        }
    }

    return { role: f.layer, attribution: f.attribution ?? null, byName, regionKeys };
}

/** The layers fetched or being fetched, by address. A failed fetch is forgotten. */
const loading = new Map<string, Promise<GazetteerLayer>>();
/** The layers here, by address. */
const loaded = new Map<string, GazetteerLayer>();
/** The address of the gazetteer loaded last, which the data issues read. */
let lastBase: string | null = null;
/** Counts the layers loaded, so a reader that keeps answers knows when to read again. */
let generation = 0;

/**
 * How many layers have been loaded in this page: it changes when a new one arrives.
 * @returns The count.
 */
export function gazetteerGeneration(): number {
    return generation;
}

/**
 * A file's bytes as text, gunzipped when they are gzip (a server that sent them with
 * `Content-Encoding: gzip` already did).
 * @param response - The response.
 * @returns The text.
 */
async function gunzipText(response: Response): Promise<string> {
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
        return new TextDecoder().decode(bytes);
    }

    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).text();
}

/**
 * The layers a role needs: a city or region is narrowed by countries, a city by regions too.
 * @param role - The role, or auto for all.
 * @returns The roles to load.
 */
export function layersFor(role: PlaceRole | "auto"): readonly PlaceRole[] {
    if (role === "country") {
        return ["country"];
    }

    return role === "region" ? ["country", "region"] : PLACE_ROLES;
}

/**
 * Fetch the layers a role needs from a gazetteer address, once per page.
 * @param base - The address, ending in `/`.
 * @param role - The role.
 * @returns The layers.
 * @throws A `GraphtyError` with code `E_FETCH_FAILED` when a layer could not be fetched or read.
 */
export async function loadGazetteer(base: string, role: PlaceRole | "auto"): Promise<Gazetteer> {
    const roles = layersFor(role);
    lastBase = base;
    const layers = await Promise.all(
        roles.map((each) => {
            const url = new URL(PLACE_FILES[each], base).href;
            let pending = loading.get(url);
            if (pending === undefined) {
                pending = (async () => {
                    const response = await fetch(url);
                    if (!response.ok) {
                        throw new Error(`HTTP ${String(response.status)}`);
                    }

                    const layer = layerFromFile(JSON.parse(await gunzipText(response)));
                    loaded.set(url, layer);
                    generation++;
                    return layer;
                })().catch((error: unknown) => {
                    loading.delete(url);
                    throw GraphtyError.wrap(error, {
                        code: "E_FETCH_FAILED",
                        source: "layout",
                        details: { layout: "location-map", url },
                    });
                });
                loading.set(url, pending);
            }

            return pending;
        }),
    );
    return Object.fromEntries(roles.map((each, i) => [each, layers[i]]));
}

/**
 * The layers of a gazetteer already here, without fetching.
 * @param base - The address; the one loaded last when absent.
 * @returns The layers here, possibly none.
 */
export function cachedGazetteer(base: string | null = lastBase): Gazetteer {
    const out: Gazetteer = {};
    if (base === null) {
        return out;
    }

    for (const role of PLACE_ROLES) {
        const layer = loaded.get(new URL(PLACE_FILES[role], base).href);
        if (layer !== undefined) {
            out[role] = layer;
        }
    }

    return out;
}

/**
 * Whether a gazetteer holds every layer a role needs.
 * @param gazetteer - The layers.
 * @param role - The role.
 * @returns True when all are here.
 */
export function hasLayers(gazetteer: Gazetteer, role: PlaceRole | "auto"): boolean {
    return layersFor(role).every((each) => gazetteer[each] !== undefined);
}

/**
 * The share of a column's non-blank values a layer knows by name.
 * @param values - The values.
 * @param layer - The layer.
 * @returns 0 to 1; 0 for a column with no values.
 */
export function placeShare(values: readonly unknown[], layer: GazetteerLayer): number {
    let filled = 0;
    let known = 0;
    for (const value of values) {
        const key = normalizePlace(value);
        if (key !== "") {
            filled++;
            if (layer.byName.has(key)) {
                known++;
            }
        }
    }

    return filled === 0 ? 0 : known / filled;
}

/**
 * The role a column of place names reads best in, among the layers here: the one that knows the
 * most of its values, the coarser on a tie. A "Lyon, FR" value counts for its city.
 * @param values - The values.
 * @param gazetteer - The layers.
 * @returns The role, or null when no layer knows any value.
 */
export function bestRole(values: readonly unknown[], gazetteer: Gazetteer): PlaceRole | null {
    let best: PlaceRole | null = null;
    let bestShare = 0;
    for (const role of PLACE_ROLES) {
        const layer = gazetteer[role];
        if (layer !== undefined) {
            const share = placeShare(
                values.map((v) => (role === "city" ? splitAtComma(v)[0] : v)),
                layer,
            );
            if (share > bestShare) {
                best = role;
                bestShare = share;
            }
        }
    }

    return best;
}

/**
 * A "Lyon, FR" value as its name and the part after its last comma.
 * @param value - The cell.
 * @returns The name and the narrowing part, or the value and null without a comma.
 */
function splitAtComma(value: unknown): [unknown, string | null] {
    if (typeof value !== "string") {
        return [value, null];
    }

    const at = value.lastIndexOf(",");
    return at < 0 ? [value, null] : [value.slice(0, at), value.slice(at + 1)];
}

/** What narrows a place name: a column of values by row, a fixed value, or nothing. */
export type PlaceWithin = readonly unknown[] | string | null;

/** A column of place names read through the gazetteer. */
export interface PlaceReading {
    /** The role read in: the one asked for, or the best one under auto; null when nothing matched. */
    readonly role: PlaceRole | null;
    readonly lat: readonly (number | null)[];
    readonly lon: readonly (number | null)[];
    /** The rows with a name no place matches. */
    readonly unmatched: readonly number[];
    /** The rows whose name more than one place matches; the most populous was taken. */
    readonly ambiguous: readonly number[];
    /** The credits owed for the layers whose places were taken. */
    readonly attribution: readonly PlaceCredit[];
}

/** The places a "within" value names: countries by code, regions by key. */
interface Narrowing {
    readonly countries: ReadonlySet<string>;
    readonly regions: ReadonlySet<string>;
}

/**
 * The countries and regions a narrowing value names.
 * @param value - The value: a country's name or code, or a region's name or code.
 * @param gazetteer - The layers.
 * @param memo - Narrowings already worked out, by key.
 * @returns The narrowing, or null for a blank value.
 */
function narrowing(value: unknown, gazetteer: Gazetteer, memo: Map<string, Narrowing>): Narrowing | null {
    const key = normalizePlace(value);
    if (key === "") {
        return null;
    }

    let found = memo.get(key);
    if (found === undefined) {
        const countries = new Set((gazetteer.country?.byName.get(key) ?? []).map((p) => p.country));
        if (/^[a-z]{2}$/.test(key)) {
            countries.add(key.toUpperCase());
        }

        const regions = new Set([
            ...(gazetteer.region?.byName.get(key) ?? []).flatMap((p) => (p.region === null ? [] : [p.region])),
            ...(gazetteer.city?.regionKeys.get(key) ?? []),
        ]);
        found = { countries, regions };
        memo.set(key, found);
    }

    return found;
}

/**
 * Read a column of place names: each name matched after normalizing, narrowed by its "within"
 * value when there is one, the most populous place taken when several still match. Under `auto`
 * the column reads in its {@link bestRole}, and a "Lyon, FR" value no place matches whole is
 * split at its last comma into a name and its narrowing.
 * @param values - The names, by row.
 * @param role - The role, or auto.
 * @param within - What narrows each name.
 * @param gazetteer - The layers.
 * @returns The reading.
 */
export function readPlaces(
    values: readonly unknown[],
    role: PlaceRole | "auto",
    within: PlaceWithin,
    gazetteer: Gazetteer,
): PlaceReading {
    const used = role === "auto" ? bestRole(values, gazetteer) : role;
    const layer = used === null ? undefined : gazetteer[used];
    const lat: (number | null)[] = [];
    const lon: (number | null)[] = [];
    const unmatched: number[] = [];
    const ambiguous: number[] = [];
    const memo = new Map<string, Narrowing>();
    values.forEach((value, row) => {
        lat.push(null);
        lon.push(null);
        if (normalizePlace(value) === "") {
            return;
        }

        let name: unknown = value;
        let narrow: unknown = typeof within === "string" ? within : (within?.[row] ?? null);
        let candidates = layer?.byName.get(normalizePlace(name)) ?? [];
        if (candidates.length === 0 && role === "auto") {
            [name, narrow] = splitAtComma(value);
            narrow ??= typeof within === "string" ? within : (within?.[row] ?? null);
            candidates = layer?.byName.get(normalizePlace(name)) ?? [];
        }

        const by = narrowing(narrow, gazetteer, memo);
        if (by !== null && used !== "country") {
            candidates = candidates.filter(
                (p) => by.countries.has(p.country) || (p.region !== null && by.regions.has(p.region)),
            );
        }

        if (candidates.length === 0) {
            unmatched.push(row);
            return;
        }

        const best = candidates.reduce((a, b) => (b.population > a.population ? b : a));
        if (candidates.length > 1) {
            ambiguous.push(row);
        }

        lat[row] = best.lat;
        lon[row] = best.lon;
    });

    const placed = unmatched.length + values.filter((v) => normalizePlace(v) === "").length < values.length;
    const attribution = placed && layer !== undefined && layer.attribution !== null ? [layer.attribution] : [];
    return { role: used, lat, lon, unmatched, ambiguous, attribution };
}
