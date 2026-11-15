import { assert, describe, it } from "vitest";

import { edgeIdOf, EdgeIdRows } from "../../src/data/edgeIdentity";
import { RowIdRecords, RowMap } from "../../src/data/RowMap";

describe("RowMap", () => {
    it("keeps each value by its row, set out of order, far apart, replaced and deleted", () => {
        const map = new RowMap<string>();
        map.set(5000, "far");
        map.set(3, "near");
        map.set(3, "near again");
        assert.equal(map.size, 2, "replacing a row does not count it twice");
        assert.equal(map.get(3), "near again");
        assert.isUndefined(map.get(4));
        assert.isFalse(map.delete(42), "deleting a row never set");
        assert.deepEqual(
            [...map],
            [
                [3, "near again"],
                [5000, "far"],
            ],
        );
        assert.deepEqual([...map.keys()], [3, 5000], "row order, not the order rows were set");
        assert.deepEqual([...map.values()], ["near again", "far"]);
        assert.isTrue(map.delete(5000));
        assert.equal(map.size, 1);
        map.clear();
        assert.equal(map.size, 0);
        assert.deepEqual([...map], []);
    });
});

describe("RowIdRecords", () => {
    it("keeps an id and a record by row, in row order, and forgets them", () => {
        const rows = new RowIdRecords<string, { n: number }>();
        rows.set(7, { id: "b", record: { n: 2 } });
        rows.set(2, { id: "a", record: { n: 1 } });
        assert.equal(rows.size, 2);
        assert.deepEqual(rows.get(7), { id: "b", record: { n: 2 } });
        assert.isUndefined(rows.get(3));
        assert.deepEqual([...rows.keys()], [2, 7]);
        assert.deepEqual(
            [...rows.values()].map((row) => row.id),
            ["a", "b"],
        );
        assert.isTrue(rows.delete(2));
        assert.isFalse(rows.delete(2));
        assert.deepEqual([...rows], [[7, { id: "b", record: { n: 2 } }]]);
        rows.clear();
        assert.equal(rows.size, 0);
    });
});

describe("EdgeIdRows", () => {
    it("keeps a row by edge id, held by the id's counter, and holds no id it never assigned", () => {
        const rows = new EdgeIdRows();
        rows.set(12, 0);
        rows.set(3, 1);
        assert.equal(rows.size, 2);
        assert.equal(rows.get(edgeIdOf(12)), 0);
        assert.equal(rows.at(3), 1);
        assert.isTrue(rows.has("3"));
        assert.isFalse(rows.has("03"), "not an id this element prints");
        assert.isFalse(rows.has("x"));
        assert.deepEqual([...rows.keys()], ["3", "12"]);
        rows.delete(3);
        assert.isFalse(rows.has("3"));
        rows.clear();
        assert.equal(rows.size, 0);
    });
});
