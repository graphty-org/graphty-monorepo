import { assert, describe, it } from "vitest";

import { countOf, elementSort, groupName, sortCaption, type TableColumnChoice } from "../columns";
import { registration } from "../commands";

const RANK: TableColumnChoice = {
    id: "r:pagerank",
    header: "PageRank",
    group: "result",
    numeric: true,
    run: "pagerank",
};
const NAME: TableColumnChoice = { id: "a:name", header: "name", group: "attribute", numeric: false, attribute: "name" };

describe("the table dock's words and sorts", () => {
    it("sorts a result column by its run and an attribute by its key", () => {
        assert.deepEqual(elementSort(RANK, true), { run: "pagerank", descending: true });
        assert.deepEqual(elementSort(NAME, false), { key: "name", descending: false });
        assert.deepEqual(elementSort({ id: "id", header: "Id", group: "key", numeric: false }, false), {
            key: "id",
            descending: false,
        });
    });

    it("words the caption after the sort", () => {
        assert.equal(sortCaption(undefined, false), "In the order loaded");
        assert.equal(sortCaption(RANK, true), "Sorted by PageRank, highest first");
        assert.equal(sortCaption(RANK, false), "Sorted by PageRank, lowest first");
        assert.equal(sortCaption(NAME, false), "Sorted by name, A to Z");
        assert.equal(
            sortCaption({ ...RANK, header: "Communities", grouping: true }, true),
            "Sorted by Communities, largest group first",
        );
    });

    it("counts with the right noun", () => {
        assert.equal(countOf(1, "node"), "1 node");
        assert.equal(countOf(1200, "edge"), "1,200 edges");
    });

    it("names a partition's group by its rank, and a category by its value", () => {
        assert.equal(groupName({ group: 3, size: 4, rank: 2 }), "Group 2");
        assert.equal(groupName({ group: "North", size: 4 }), "North");
    });

    it("registers Table on Shift+T, disabled with no project", () => {
        const [toggle] = registration.commands;
        assert.equal(toggle.id, "table.toggle");
        assert.deepEqual(toggle.keys, ["Shift+T"]);
        assert.isNotTrue(toggle.stub);
        const workspace = { get: () => ({ project: null }) } as never;
        assert.equal(toggle.disabled?.({ workspace, session: null, element: null }), "No project is open");
    });
});
