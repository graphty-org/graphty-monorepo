/**
 * The Data page's choices as edits over graphty-element's own reading of a draft, checked against
 * real drafts from a headless session: every count asserted is the element's report.
 */
import {
    createGraphSession,
    type GraphSession,
    isGraphtyError,
    type LoadDraft,
} from "@graphty/graphty-element/session";
import { afterEach, assert, describe, it } from "vitest";

import { INITIAL_CHOICES, loadChoices, roleOf, setRole, setRowsAre } from "../choices";

const PEOPLE = "id,name,team\na,Ann,red\nb,Bo,blue\nc,Cy,red\n";
const TIES = "source,target,weight\na,b,2\nb,c,5\nc,z,1\n";
/** Trips between stations, under endpoint columns the element does not recognize. */
const TRIPS = "from_station,to_station,trips\nx,y,10\ny,z,3\nz,x,7\n";

let session: GraphSession | null = null;

afterEach(() => {
    session?.dispose();
    session = null;
});

/**
 * A draft of CSV text.
 * @param config - the source's config.
 * @returns the draft.
 */
async function prepare(config: Record<string, unknown>): Promise<LoadDraft> {
    session = createGraphSession();
    return session.data.prepare({ type: "csv", config });
}

/**
 * The code a promise rejects with.
 * @param promise - the promise.
 * @returns the code, or null when it settles.
 */
async function refusal(promise: Promise<unknown>): Promise<string | null> {
    try {
        await promise;
        return null;
    } catch (error: unknown) {
        return isGraphtyError(error) ? error.code : "not a GraphtyError";
    }
}

describe("the Data page's choices", () => {
    it("sends no mapping until the reader changes a role", async () => {
        const draft = await prepare({
            nodeFile: new File([PEOPLE], "people.csv"),
            edgeFile: new File([TIES], "ties.csv"),
        });

        const choices = loadChoices(draft, INITIAL_CHOICES, "replace");
        assert.deepEqual(choices, { mode: "replace", unmatched: "leave-out", directed: "auto" });
        const report = await draft.report(choices);
        assert.deepEqual(report.unmatched, { rows: 1, values: 1 });
    });

    it("moves a role to the chosen column and gives the old holder no role", async () => {
        const draft = await prepare({
            nodeFile: new File([PEOPLE], "people.csv"),
            edgeFile: new File([TIES], "ties.csv"),
        });
        const [nodes] = draft.tables;

        const next = setRole(draft, nodes, "name", "key", INITIAL_CHOICES);
        assert.equal(roleOf(draft, nodes, "name", next), "key");
        assert.equal(roleOf(draft, nodes, "id", next), "attribute");
        assert.deepEqual(loadChoices(draft, next, "replace").mapping, { tables: { nodes: { key: "name" } } });

        const reset = setRole(draft, nodes, "name", undefined, next);
        assert.equal(roleOf(draft, nodes, "name", reset), "attribute");
    });

    it("writes null for a role the reader took from the element's column", async () => {
        const draft = await prepare({
            nodeFile: new File([PEOPLE], "people.csv"),
            edgeFile: new File([TIES], "ties.csv"),
        });
        const edges = draft.tables[1];

        const next = setRole(draft, edges, "weight", "attribute", INITIAL_CHOICES);
        const choices = loadChoices(draft, next, "merge");
        assert.equal(choices.mode, "merge");
        const mapping = choices.mapping as { tables: Record<string, Record<string, unknown>> };
        assert.isNull(mapping.tables.edges.weight);
        const report = await draft.report(choices);
        assert.equal(report.weights.resolvedFrom, "none");
    });

    it("loads an edge list whose linking columns the reader names", async () => {
        const draft = await prepare({ data: TRIPS });
        const [rows] = draft.tables;
        assert.equal(draft.mapping.tables.rows.rowsAre, "edges");
        assert.equal(
            await refusal(draft.report(loadChoices(draft, INITIAL_CHOICES, "replace"))),
            "E_EDGE_ENDPOINTS_UNRESOLVED",
        );

        let choices = setRole(draft, rows, "from_station", "source", INITIAL_CHOICES);
        choices = setRole(draft, rows, "to_station", "target", choices);
        const report = await draft.report(loadChoices(draft, choices, "replace"));
        assert.equal(report.counts.edges, 3);
        assert.equal(report.counts.nodes, 3);
    });

    it("leaves the roles to the element when the reader changes what the rows are", async () => {
        const draft = await prepare({ data: TRIPS });
        const [rows] = draft.tables;

        const choices = setRowsAre(draft, rows, "nodes", INITIAL_CHOICES);
        assert.isUndefined(roleOf(draft, rows, "from_station", choices));
        assert.deepEqual(loadChoices(draft, choices, "replace").mapping, { tables: { rows: { rowsAre: "nodes" } } });
        const report = await draft.report(loadChoices(draft, choices, "replace"));
        assert.equal(report.counts.edges, 0);
        assert.deepEqual(setRowsAre(draft, rows, "edges", choices).tables.rows, { roles: {} });
    });
});
