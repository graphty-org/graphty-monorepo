import { assert, describe, it } from "vitest";

import { RowMap } from "../../src/data/RowMap";

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
