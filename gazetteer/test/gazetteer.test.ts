import { assert, describe, it } from "vitest";

import { type GazetteerLayerFile, type GazetteerPlace, loadLayer, type PlaceRole } from "../src/index";

/**
 * The places of a layer with a name or other name, compared without case.
 * @param layer - The layer.
 * @param name - The name.
 * @returns The places.
 */
function named(layer: GazetteerLayerFile, name: string): GazetteerPlace[] {
    const key = name.toLowerCase();
    return layer.places.filter(([n, others]) => n.toLowerCase() === key || others.some((o) => o.toLowerCase() === key));
}

describe("@graphty/gazetteer", () => {
    it.each<[PlaceRole, string]>([
        ["country", "Public domain"],
        ["region", "Public domain"],
        ["city", "CC BY 4.0"],
    ])("loads the %s layer with its license", async (role, license) => {
        const layer = await loadLayer(role);
        assert.strictEqual(layer.format, "graphty-gazetteer");
        assert.strictEqual(layer.version, 1);
        assert.strictEqual(layer.layer, role);
        assert.include(layer.license, license);
        assert.deepEqual(layer.fields, [
            "name",
            "alternates",
            "country",
            "region",
            "latitude",
            "longitude",
            "population",
        ]);
        assert.isAbove(layer.places.length, 200);
    });

    it("looks up a country by name and by ISO code", async () => {
        const countries = await loadLayer("country");
        const [france] = named(countries, "France");
        assert.strictEqual(france[2], "FR");
        assert.closeTo(france[4], 46.7, 1);
        assert.closeTo(france[5], 2.4, 1);
        assert.include(named(countries, "FRA"), france);
        assert.isNull(countries.attribution);
    });

    it("looks up a region, with its GeoNames key", async () => {
        const regions = await loadLayer("region");
        const texas = named(regions, "Texas").find((p) => p[2] === "US");
        assert.strictEqual(texas?.[3], "US.TX");
        assert.closeTo(texas?.[4] ?? 0, 31.5, 1);
    });

    it("looks up a city, credits GeoNames and names the regions its cities are in", async () => {
        const cities = await loadLayer("city");
        const paris = named(cities, "Paris");
        assert.isAbove(paris.length, 1, "Paris, France and Paris, Texas");
        const [first] = paris;
        assert.strictEqual(first[2], "FR", "the most populous first");
        assert.closeTo(first[4], 48.85, 0.01);
        assert.closeTo(first[5], 2.35, 0.01);
        assert.isTrue(paris.some((p) => p[3] === "US.TX"));
        assert.deepEqual(cities.attribution, { text: "GeoNames", url: "https://www.geonames.org/" });
        assert.deepEqual(cities.regions?.["US.TX"], ["Texas"]);
    });

    it("refuses a layer it does not have", async () => {
        const error = await loadLayer("planet" as PlaceRole).catch((e: unknown) => e);
        assert.instanceOf(error, TypeError);
    });
});
