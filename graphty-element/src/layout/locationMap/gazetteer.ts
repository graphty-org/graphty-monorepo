/**
 * @file Place names to coordinates: the gazetteer the location map layout reads a column of
 * countries, regions or cities with. Three layers (countries, regions, cities), each loaded on first
 * use from the optional package `@graphty/gazetteer`, or from the consumer's own source (the layout's
 * `gazetteer` option), and kept for the page. Nothing is fetched from the network by this module.
 *
 * Babylon-free and DOM-free: the session's planning and issues read it.
 */

import { missingPackage } from "../../ai/missingPackage";
import { GraphtyError } from "../../errors/GraphtyError";

/** What kind of place a column names. */
export type PlaceRole = "country" | "region" | "city";

/** The roles, coarsest first: the order ties are broken in. */
export const PLACE_ROLES: readonly PlaceRole[] = ["country", "region", "city"];

/** A credit a map shows while a layer's places are drawn. */
interface PlaceCredit {
    readonly text: string;
    readonly url: string;
}

/**
 * One layer's file, as `@graphty/gazetteer` holds it (built by its `scripts/build-gazetteer.mjs`):
 * `places` rows hold `fields` in order, `[name, alternates, country, region, latitude, longitude, population]`. `country` is the
 * ISO 3166-1 alpha-2 code; `region` is the first-level region key (`"US.TX"`), null for a country
 * or a region with no key. The city layer also names the regions its cities are in, by key.
 */
interface GazetteerFile {
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
interface Place {
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
 * The keys a place is found by: its name, its alternates, and a country's code. A one-character
 * alternate is a postal code (Natural Earth gives the Maldives' Baa atoll "B"), never a name a table
 * holds; indexed, it would make a column of labels "A", "B" read as regions, so it is left out.
 * @param name - The place's name.
 * @param alternates - Its other names and codes.
 * @param code - A country's ISO code, or null.
 * @returns The keys, none blank.
 */
function placeKeys(name: string, alternates: readonly string[], code: string | null): Set<string> {
    const keys = new Set([name, ...(code === null ? [] : [code])].map(normalizePlace));
    for (const alternate of alternates) {
        const key = normalizePlace(alternate);
        if (key.length > 1) {
            keys.add(key);
        }
    }

    keys.delete("");
    return keys;
}

/**
 * A layer from its file, indexed by every name it lists (and, for a country, its code).
 * @param file - The parsed file.
 * @returns The layer.
 * @throws A `GraphtyError` with code `E_FETCH_FAILED` when the file is not a gazetteer layer.
 */
function layerFromFile(file: unknown): GazetteerLayer {
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
        for (const key of placeKeys(name, alternates, f.layer === "country" ? country : null)) {
            const list = byName.get(key);
            if (list === undefined) {
                byName.set(key, [place]);
            } else {
                list.push(place);
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

/**
 * Where the gazetteer's layers come from (the location map layout's `gazetteer` option): `true` for
 * the optional package `@graphty/gazetteer`, loaded on first use; a function that returns a layer
 * file (or a promise of one) for a role; or the layer files themselves, by role. A layer file is what
 * `@graphty/gazetteer` holds: `{ format: "graphty-gazetteer", version: 1, layer, attribution, places }`.
 */
export type GazetteerSource = true | ((role: PlaceRole) => unknown) | Readonly<Partial<Record<PlaceRole, unknown>>>;

/**
 * Whether a value is a gazetteer source: `true`, a function, or an object of layer files.
 * @param value - The value.
 * @returns True for a source.
 */
export function isGazetteerSource(value: unknown): value is GazetteerSource {
    return (
        value === true ||
        typeof value === "function" ||
        (typeof value === "object" && value !== null && !Array.isArray(value))
    );
}

/** The package the default source loads. */
const GAZETTEER_PACKAGE = "@graphty/gazetteer";

/**
 * One layer from `@graphty/gazetteer`, loaded on first use: it is an optional peer, so it is never
 * imported statically (src/ai/missingPackage.ts says why).
 * @param role - The layer.
 * @returns The layer's file.
 * @throws A `GraphtyError` with code `E_MISSING_PACKAGE` (`details.package` `@graphty/gazetteer`)
 *     when the package is not installed.
 */
async function packageLayer(role: PlaceRole): Promise<unknown> {
    let gazetteer: { loadLayer: (role: PlaceRole) => Promise<unknown> };
    try {
        gazetteer = await import("@graphty/gazetteer");
    } catch (error) {
        throw missingPackage(GAZETTEER_PACKAGE, "location-map-place-names", error);
    }

    return gazetteer.loadLayer(role);
}

/**
 * The object a source's layers are kept under: the package's loader stands for `true`.
 * @param source - The source.
 * @returns The key.
 */
function keyOf(source: GazetteerSource): object {
    return source === true ? packageLayer : source;
}

/** The layers loaded or being loaded, by source. A failed load is forgotten. */
const loading = new WeakMap<object, Map<PlaceRole, Promise<GazetteerLayer>>>();
/** The layers here, by source. */
const loaded = new WeakMap<object, Gazetteer>();
/** The source loaded last, which the data issues read. */
let lastSource: GazetteerSource | null = null;
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
 * The layers a role needs: a city or region is narrowed by countries, a city by regions too.
 * @param role - The role, or auto for all.
 * @returns The roles to load.
 */
function layersFor(role: PlaceRole | "auto"): readonly PlaceRole[] {
    if (role === "country") {
        return ["country"];
    }

    return role === "region" ? ["country", "region"] : PLACE_ROLES;
}

/**
 * One layer's file from a source.
 * @param source - The source.
 * @param role - The layer.
 * @returns The file, unchecked.
 */
async function layerFileOf(source: GazetteerSource, role: PlaceRole): Promise<unknown> {
    if (source === true) {
        return packageLayer(role);
    }

    return typeof source === "function" ? source(role) : source[role];
}

/**
 * Load the layers a role needs from a source, once per page.
 * @param source - The source.
 * @param role - The role.
 * @returns The layers.
 * @throws A `GraphtyError` with code `E_MISSING_PACKAGE` when the source is `@graphty/gazetteer`
 *     and it is not installed, or `E_FETCH_FAILED` when a layer could not be loaded or read.
 */
export async function loadGazetteer(source: GazetteerSource, role: PlaceRole | "auto"): Promise<Gazetteer> {
    const roles = layersFor(role);
    const key = keyOf(source);
    lastSource = source;
    let pendings = loading.get(key);
    if (pendings === undefined) {
        pendings = new Map();
        loading.set(key, pendings);
    }

    const pendingOf = pendings;
    const layers = await Promise.all(
        roles.map((each) => {
            let pending = pendingOf.get(each);
            if (pending === undefined) {
                pending = (async () => {
                    const layer = layerFromFile(await layerFileOf(source, each));
                    loaded.set(key, { ...loaded.get(key), [each]: layer });
                    generation++;
                    return layer;
                })().catch((error: unknown) => {
                    pendingOf.delete(each);
                    throw GraphtyError.wrap(error, {
                        code: "E_FETCH_FAILED",
                        source: "layout",
                        details: { layout: "location-map", layer: each },
                    });
                });
                pendingOf.set(each, pending);
            }

            return pending;
        }),
    );
    return Object.fromEntries(roles.map((each, i) => [each, layers[i]]));
}

/**
 * The layers of a gazetteer already here, without loading.
 * @param source - The source; the one loaded last when absent.
 * @returns The layers here, possibly none.
 */
export function cachedGazetteer(source: GazetteerSource | null = lastSource): Gazetteer {
    return source === null ? {} : { ...loaded.get(keyOf(source)) };
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
