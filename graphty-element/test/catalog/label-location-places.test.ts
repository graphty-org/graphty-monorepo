import { assert, describe, it } from "vitest";

import { LABEL_LOCATION_PLACES, LABEL_STYLE_DESCRIPTORS } from "../../src/catalog";

describe("LABEL_LOCATION_PLACES", () => {
    it("places every label location once", () => {
        const values = LABEL_STYLE_DESCRIPTORS.find((d) => d.field === "location")?.values ?? [];
        assert.isNotEmpty(values);
        assert.sameMembers(
            LABEL_LOCATION_PLACES.map((place) => place.id),
            [...values],
        );
        assert.strictEqual(new Set(LABEL_LOCATION_PLACES.map((place) => place.id)).size, LABEL_LOCATION_PLACES.length);
    });

    it("gives each cell of the outside grid and of the inside grid one location", () => {
        for (const grid of ["outside", "inside"] as const) {
            const cells = LABEL_LOCATION_PLACES.filter((place) => place.places.includes(grid)).map(
                (place) => `${String(place.row)}-${String(place.column)}`,
            );
            assert.strictEqual(cells.length, 9, grid);
            assert.strictEqual(new Set(cells).size, 9, grid);
        }
    });

    it("gives automatic no cell", () => {
        const auto = LABEL_LOCATION_PLACES.find((place) => place.id === "automatic");
        assert.isDefined(auto);
        assert.isUndefined(auto.row);
        assert.isEmpty(auto.places);
    });
});
