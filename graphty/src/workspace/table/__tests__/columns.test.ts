import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { DataIssue } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    countOf,
    elementSort,
    fixLabel,
    groupName,
    headerIconsLabel,
    issueLabel,
    issuePlace,
    keyColumnOf,
    rolePill,
    sortCaption,
    type TableColumnChoice,
    valueTypeOf,
} from "../columns";
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
    it("names a header's icons for a screen reader: type, role, origin", () => {
        assert.equal(headerIconsLabel(RANK), "number, computed");
        assert.equal(headerIconsLabel({ id: "id", header: "Id", group: "key", numeric: false }), "Key");
        assert.equal(
            headerIconsLabel({
                ...NAME,
                role: "label",
                // Only the fields the words read.
                descriptor: { type: "string", origin: "joined" } as unknown as AttributeDescriptor,
            }),
            "text, label, joined",
        );
    });

    it("shows a role pill only off the key and only when its word is not the column's name", () => {
        const id: TableColumnChoice = { ...NAME, id: "a:id", header: "id", group: "key", role: "key" };
        assert.isUndefined(rolePill(id), "a key column's glyph says it");
        assert.equal(headerIconsLabel(id), "Key");
        assert.isUndefined(rolePill({ ...NAME, header: "Weight", role: "weight" }), "the name says it");
        assert.equal(rolePill({ ...NAME, role: "label" }), "Label");
        assert.equal(rolePill({ ...NAME, header: "from", role: "source" }), "Source");
    });

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

    it("words an issue with its count, and a fix as its button", () => {
        const issue = (code: string, count: number, params = {}): DataIssue =>
            ({ id: code, code, count, params, fixes: [], ignored: false, status: "open" }) as DataIssue;
        assert.equal(issueLabel(issue("not-a-number", 1)), "1 not a number");
        assert.equal(issueLabel(issue("decimal-comma", 3)), "3 decimal commas");
        assert.equal(issueLabel(issue("refused-row", 1, { lines: [412] })), "row 412 refused");
        assert.equal(issueLabel(issue("refused-row", 2, { lines: [4, 9] })), "2 rows refused");
        assert.equal(issueLabel(issue("something-new", 2)), "2 something-new");
        assert.equal(issueLabel(issue("repeated-edge", 5)), "5 repeated edges");
        assert.equal(fixLabel("read-decimal-comma"), "Read as decimals");
    });

    it("puts a column issue in its column and a row issue in the key of its rows", () => {
        const session = { data: { sources: () => [{ key: "s1", counts: { nodes: 3, edges: 2 } }] } } as never;
        const base = { count: 1, params: {}, fixes: [], ignored: false, status: "open" as const };
        assert.deepEqual(
            issuePlace({ ...base, id: "a", code: "decimal-comma", column: { kind: "edge", name: "amount" } }, session),
            { kind: "edge", column: "a:amount", name: "amount" },
        );
        assert.equal(issuePlace({ ...base, id: "b", code: "repeated-id" }, session).column, "id");
        assert.equal(issuePlace({ ...base, id: "c", code: "refused-row", source: "s1" }, session).kind, "edge");
        assert.equal(
            issuePlace({ ...base, id: "d", code: "blank-id", params: { rowsAre: "nodes" } }, session).kind,
            "node",
        );
    });

    it("reads a column's type as the Type menu names it", () => {
        assert.equal(valueTypeOf({ type: "integer" } as never), "number");
        assert.equal(valueTypeOf({ type: "time" } as never), "date");
        assert.isUndefined(valueTypeOf({ type: "mixed" } as never));
    });

    it("puts a key column's issue on the loaded column that holds the keys", () => {
        const account: TableColumnChoice = { ...NAME, id: "a:account", header: "account", role: "key" };
        const from: TableColumnChoice = { ...NAME, id: "a:from", header: "from", role: "source" };
        assert.equal(keyColumnOf("id", [account, NAME]), "a:account");
        assert.equal(keyColumnOf("source", [from, NAME]), "a:from");
        assert.equal(keyColumnOf("id", [{ id: "id", header: "Id", group: "key", numeric: false }, account]), "id");
    });
});
