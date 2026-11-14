/** What kind of place a layer holds. */
export type PlaceRole = "country" | "region" | "city";

/** A credit owed while a layer's places are shown. */
export interface PlaceCredit {
    readonly text: string;
    readonly url: string;
}

/**
 * One place: `[name, alternates, country, region, latitude, longitude, population]`. `country` is
 * the ISO 3166-1 alpha-2 code; `region` the GeoNames first-level key (`"US.TX"`), null for a country
 * or a region with no key; `population` is 0 where the source gives none.
 */
export type GazetteerPlace = readonly [
    name: string,
    alternates: readonly string[],
    country: string,
    region: string | null,
    latitude: number,
    longitude: number,
    population: number,
];

/** One layer, with where its places came from and the license they are under. */
export interface GazetteerLayerFile {
    readonly format: "graphty-gazetteer";
    readonly version: 1;
    readonly layer: PlaceRole;
    /** The credit owed while this layer's places are shown, or null when none is owed. */
    readonly attribution: PlaceCredit | null;
    /** The source files (and, for cities, the date they were read). */
    readonly source: string;
    readonly license: string;
    /** The names of a place's fields, in order. */
    readonly fields: readonly string[];
    /** The places, the most populous first. */
    readonly places: readonly GazetteerPlace[];
    /** The city layer only: the names of each region key its cities carry (`{ "US.TX": ["Texas"] }`). */
    readonly regions?: Readonly<Record<string, readonly string[]>>;
}
