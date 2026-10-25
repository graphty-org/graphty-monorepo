import type { AttributeDescriptor } from "@graphty/graphty-element/catalog";
import type { LoadedSource } from "@graphty/graphty-element/session";
import { assert, describe, it } from "vitest";

import {
    columnChoices,
    FIELD_ENTRIES,
    FIELD_ROWS,
    joinMatch,
    kindChoices,
    loadValue,
    roleHolder,
    serverCount,
    sourceName,
    tableRoles,
} from "../words";

/**
 * A column as `data.attributes()` describes it, cut to what the words read.
 * @param kind - node or edge.
 * @param name - its name.
 * @param extra - anything else.
 * @returns the descriptor.
 */
const column = (kind: "node" | "edge", name: string, extra: Partial<AttributeDescriptor> = {}): AttributeDescriptor =>
    ({ kind, name, path: `data.${name}`, ...extra }) as AttributeDescriptor;

/** An auth log read as edges from user to host, with the kind of each end. */
const LOG: LoadedSource = {
    key: "s1",
    kind: "file",
    name: "auth-log.csv",
    counts: { nodes: 5, edges: 4 },
    added: { nodes: 5, edges: 4 },
    tables: ["auth-log.csv"],
    reloadable: true,
    mapping: {
        tables: {
            rows: {
                rowsAre: "edges",
                source: { column: "user" },
                target: { column: "host" },
                sourceKind: "user",
                targetKind: null,
            },
        },
    },
};

describe("the Data place's words", () => {
    it("counts a server load against what the source holds, when it says", () => {
        assert.equal(serverCount(500, 40_000), "500 of 40,000");
        assert.equal(serverCount(12, undefined), "12");
    });

    it("words a joined table's match as matched of rows, and nothing for another load", () => {
        const joined = { ...LOG, kind: "join", join: { matched: 52, rows: 70 } } as unknown as LoadedSource;
        assert.equal(joinMatch(joined), "52/70");
        assert.isNull(joinMatch(LOG));
    });

    it("names a load the reader's way, never by its internal key", () => {
        assert.equal(sourceName(LOG), "auth-log.csv");
        const { name: _name, ...unnamed } = LOG;
        assert.equal(sourceName(unnamed), "File");
        assert.equal(sourceName({ ...unnamed, kind: "server", type: "source:no-such-source" }), "Server");
    });

    it("keeps the rows that always hold a value fixed, and offers the rest from each side's +", () => {
        assert.deepEqual(
            FIELD_ROWS.map((row) => `${row.side}:${row.label}`),
            ["nodes:Id", "edges:Source", "edges:Target"],
        );
        assert.deepEqual(
            FIELD_ENTRIES.nodes.map((entry) => entry.name),
            ["Label", "Kind", "Weight", "Time", "Latitude", "Longitude", "Coordinates", "Country", "Region", "City"],
        );
        assert.deepEqual(
            FIELD_ENTRIES.edges.map((entry) => entry.name),
            ["Weight", "Time", "Kind", "Id", "Kind of source", "Kind of target"],
        );
    });

    it("reads a load-time role from the table the load read", () => {
        const roles = tableRoles(LOG, "edges");
        assert.equal(loadValue(roles, "source"), "user");
        assert.equal(loadValue(roles, "sourceKind"), "user");
        assert.isNull(loadValue(roles, "targetKind"));
        assert.isUndefined(tableRoles(LOG, "nodes"));
    });

    it("offers the endpoint columns' names as kinds", () => {
        assert.deepEqual(kindChoices(tableRoles(LOG, "edges"), null), ["user", "host"]);
        assert.deepEqual(kindChoices(tableRoles(LOG, "edges"), "account"), ["user", "host", "account"]);
    });

    it("names the column holding a role, and offers the load's columns, hidden ones left out", () => {
        const attributes = [
            column("edge", "ip", { sources: ["s1"] }),
            column("edge", "result", { sources: ["s1"], hidden: true }),
            column("edge", "amount", { sources: ["s2"], roles: ["weight"] }),
            column("node", "name"),
        ];
        assert.equal(roleHolder(attributes, "edges", "weight"), "amount");
        assert.isNull(roleHolder(attributes, "nodes", "label"));
        assert.deepEqual(columnChoices(attributes, LOG, "edges", null), ["ip"]);
        // The column holding the row now is offered even when the load does not keep it.
        assert.deepEqual(columnChoices(attributes, LOG, "edges", "user"), ["user", "ip"]);
        assert.deepEqual(columnChoices(attributes, undefined, "edges", null), ["ip", "amount"]);
    });
});
