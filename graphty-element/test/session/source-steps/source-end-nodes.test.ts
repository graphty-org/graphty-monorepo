/**
 * @file A source's node count beside the nodes only its edges' ends made (#10490): door entries
 * joined to buildings and to people, where a join's Missing end adds the building or person a row
 * names that no file holds. The entries supply those nodes (design 3.1), so `counts.nodes` counts
 * them; `endNodes` says how many of them its rows do not hold.
 */

import { assert, describe, it } from "vitest";

import { createGraphSession, type GraphSession } from "../../../src/session";
import type { SourceDraft, SourceJoinMatch } from "../../../src/session/types";

const csv = (name: string, ...data: string[]): { type: string; config: { data: string }; name: string } => ({
    type: "csv",
    config: { data: data.join("\n") },
    name,
});

const PEOPLE = csv("people.csv", "person_id,name", "P1,Ann", "P2,Bo");
const BUILDINGS = csv("buildings.csv", "id,name", "B1,North", "B2,South");
// Four rows: B9 and P9 are in no file.
const ENTRIES = csv("door_entries.csv", "person_id,building_id,time", "P1,B1,1", "P2,B2,2", "P1,B9,3", "P9,B1,4");

/**
 * Join the entries to one file's rows by one field, as an edge from each entry to the node it names.
 * @param draft - The draft.
 * @param match - The match.
 * @param unmatched - What a row naming no node does: skip its edge, or add the node.
 */
function joinAsEdges(draft: SourceDraft, match: SourceJoinMatch, unmatched: "skip" | "add"): void {
    const link = draft.joinOutcomes({ matches: [match] }).outcomes.find((each) => each.code === "link");
    const act = link?.acts[0];
    assert.strictEqual(act?.act, "connect");
    if (act?.act === "connect") {
        draft.connect({ ...act.options, unmatched });
    }
}

/**
 * The entries' listing.
 * @param session - The session.
 * @returns Its node count and the nodes only its edges' ends made.
 */
function entries(session: GraphSession): [number, number | undefined] {
    const listed = session.data.sources().find((each) => each.name === "door_entries.csv");
    return [listed?.counts.nodes ?? NaN, listed?.endNodes];
}

describe("source-steps: the nodes a source's edges' ends made (#10490)", () => {
    it("counts a join's added end under the entries, and says how many its rows do not hold", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const people = await session.data.stage(PEOPLE, { key: "person_id" });
        await session.data.add(people);
        const buildings = await session.data.stage(BUILDINGS, { key: "id" });
        await session.data.add(buildings);
        const doors = await session.data.stage(ENTRIES);

        const first = session.data.draft();
        joinAsEdges(
            first,
            { a: { source: doors, field: "building_id" }, b: { source: buildings, field: "id" } },
            "add",
        );
        await first.commit();
        assert.deepStrictEqual(entries(session), [5, 1], "four entries, and B9, which an entry's end made");

        const second = session.data.draft();
        joinAsEdges(
            second,
            { a: { source: doors, field: "person_id" }, b: { source: people, field: "person_id" } },
            "add",
        );
        await second.commit();
        assert.deepStrictEqual(entries(session), [6, 2], "and P9 too");
        assert.isDefined(session.data.node("P9"));
        // Every node is counted under some file, so the counts still add up to the graph.
        const counted = session.data.sources().reduce((sum, each) => sum + each.counts.nodes, 0);
        assert.strictEqual(counted, session.data.nodes().length);
        // Nothing an end made is counted under the files whose rows hold the node.
        assert.deepStrictEqual(
            session.data.sources().map((each) => [each.name, each.endNodes]),
            [
                ["people.csv", 0],
                ["buildings.csv", 0],
                ["door_entries.csv", 2],
            ],
        );
        session.dispose();
    });

    it("counts no end its rows only name", async () => {
        const session = createGraphSession({ features: ["source-steps"] });
        const buildings = await session.data.stage(BUILDINGS, { key: "id" });
        await session.data.add(buildings);
        const doors = await session.data.stage(ENTRIES);
        const draft = session.data.draft();
        joinAsEdges(
            draft,
            { a: { source: doors, field: "building_id" }, b: { source: buildings, field: "id" } },
            "skip",
        );
        await draft.commit();
        assert.deepStrictEqual(entries(session), [4, 0]);
        session.dispose();
    });
});
